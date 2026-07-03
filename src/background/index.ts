import { DEFAULT_SETTINGS } from "@/shared/types";
import { analyzeWithGemini } from "@/shared/gemini";
import { analyzeTaskWithGemini } from "@/shared/taskAssistant";
import { createAbortSignal } from "@/shared/requestManager";
import { loadSettings, saveSettings } from "@/shared/storage";
import { config } from "@/shared/config";
import { logger } from "@/shared/logger";
import type {
  AiAnalysisMessage,
  NeuroAdaptMessage,
  TaskAssistantMessage,
} from "@/shared/messaging";
import type { AiAnalysisResult, TaskAssistantResult } from "@/shared/types";

const CACHE_MAX_SIZE = config.cacheMaxSize;
const analysisCache = new Map<string, AiAnalysisResult>();
const taskAssistantCache = new Map<string, TaskAssistantResult>();
let lastGeminiRequestAt = 0;

type AnalysisMsg = Extract<NeuroAdaptMessage, { type: "NA_RUN_ANALYSIS" }>;
type TaskMsg = Extract<NeuroAdaptMessage, { type: "NA_RUN_TASK_ASSISTANT" }>;
type UpdateMsg = Extract<NeuroAdaptMessage, { type: "NA_UPDATE_SETTINGS" }>;

function trimCache(cache: Map<string, unknown>, maxSize: number): void {
  while (cache.size > maxSize) {
    const key = cache.keys().next().value;
    if (key !== undefined) cache.delete(key);
  }
}

function cacheKey(msg: AnalysisMsg): string {
  const { summary, preferredPersona, question } = msg.payload;
  return JSON.stringify({
    url: summary.url,
    title: summary.title,
    preferredPersona,
    question: question ?? "",
    stats: summary.stats,
    headings: summary.headings.slice(0, 10),
  });
}

function taskCacheKey(msg: TaskMsg): string | null {
  const { context, question, conversationHistory } = msg.payload;
  const historyLen = conversationHistory?.length ?? 0;
  if (historyLen > 2) return null;
  return JSON.stringify({
    url: context.summary.url,
    question,
    stats: context.summary.stats,
  });
}

async function throttleGemini(): Promise<void> {
  const now = Date.now();
  const waitMs = Math.max(0, config.geminiThrottleMs - (now - lastGeminiRequestAt));
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
  lastGeminiRequestAt = Date.now();
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await loadSettings();
  const nextSettings = { ...DEFAULT_SETTINGS, ...settings };
  await saveSettings(nextSettings);
  chrome.action.setBadgeText({ text: nextSettings.enabled ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#0f766e" });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  const nextValue = changes["neuroadapt.settings"]?.newValue as typeof DEFAULT_SETTINGS | undefined;
  if (!nextValue) return;
  chrome.action.setBadgeText({ text: nextValue.enabled ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#0f766e" });
});

chrome.runtime.onMessage.addListener(
  (rawMessage: unknown, _sender, sendResponse) => {
    if (!rawMessage || typeof rawMessage !== "object" || !("type" in rawMessage)) return false;

    const message = rawMessage as NeuroAdaptMessage;

    if (message.type === "NA_UPDATE_SETTINGS") {
      const msg = message as UpdateMsg;
      (async () => {
        const settings = await loadSettings();
        await saveSettings({ ...settings, ...msg.payload });
        sendResponse({ ok: true });
      })();
      return true;
    }

    if (message.type === "NA_RUN_ANALYSIS") {
      const msg = message as AnalysisMsg;
      (async () => {
        try {
          const key = cacheKey(msg);
          const cached = analysisCache.get(key);
          if (cached && Date.now() - cached.generatedAt < config.analysisCacheTtlMs) {
            sendResponse({ ok: true, analysis: { ...cached, cached: true } } satisfies AiAnalysisMessage);
            return;
          }

          if (!config.geminiApiKey.trim()) {
            sendResponse({
              ok: false,
              error: "AI analysis unavailable — VITE_GEMINI_API_KEY not set.",
            } satisfies AiAnalysisMessage);
            return;
          }

          await throttleGemini();
          let analysis: AiAnalysisResult;
          try {
            analysis = await analyzeWithGemini({
              apiKey: config.geminiApiKey,
              model: config.geminiModel,
              summary: msg.payload.summary,
              preferredPersona: msg.payload.preferredPersona,
              question: msg.payload.question,
            });
          } catch (primaryErr) {
            const isModelError =
              primaryErr instanceof Error &&
              (primaryErr.message.includes("404") ||
               primaryErr.message.includes("not found") ||
               primaryErr.message.toLowerCase().includes("model"));
            if (!isModelError) throw primaryErr;
            logger.warn("Primary model unavailable, falling back to", config.geminiModelFallback);
            analysis = await analyzeWithGemini({
              apiKey: config.geminiApiKey,
              model: config.geminiModelFallback,
              summary: msg.payload.summary,
              preferredPersona: msg.payload.preferredPersona,
              question: msg.payload.question,
            });
          }

          analysisCache.set(key, analysis);
          trimCache(analysisCache as Map<string, unknown>, CACHE_MAX_SIZE);
          sendResponse({ ok: true, analysis } satisfies AiAnalysisMessage);
        } catch (error) {
          const text = error instanceof Error ? error.message : "AI analysis failed.";
          logger.error("NA_RUN_ANALYSIS failed:", text);
          sendResponse({ ok: false, error: text } satisfies AiAnalysisMessage);
        }
      })();
      return true;
    }

    if (message.type === "NA_RUN_TASK_ASSISTANT") {
      const msg = message as TaskMsg;
      (async () => {
        try {
          const key = taskCacheKey(msg);
          if (key) {
            const cached = taskAssistantCache.get(key);
            if (cached && Date.now() - cached.generatedAt < config.taskCacheTtlMs) {
              sendResponse({ ok: true, result: { ...cached, cached: true } } satisfies TaskAssistantMessage);
              return;
            }
          }

          if (config.geminiApiKey.trim()) await throttleGemini();

          const signalKey = msg.payload.signalKey || `task-${msg.payload.context.summary.url}`;
          const { signal, cleanup } = createAbortSignal(signalKey);
          try {
            const result = await analyzeTaskWithGemini(
              {
                apiKey: config.geminiApiKey,
                model: config.geminiModel,
                context: msg.payload.context,
                question: msg.payload.question,
                conversationHistory: msg.payload.conversationHistory,
                goalSession: msg.payload.goalSession,
                checklist: msg.payload.checklist,
                confusionSignals: msg.payload.confusionSignals,
                signal,
              },
              { allowHeuristicFallback: true },
            );

            if (key) {
              taskAssistantCache.set(key, result);
              trimCache(taskAssistantCache as Map<string, unknown>, CACHE_MAX_SIZE);
            }
            sendResponse({ ok: true, result } satisfies TaskAssistantMessage);
          } finally {
            cleanup();
          }
        } catch (error) {
          const text = error instanceof Error ? error.message : "Task assistant failed.";
          logger.error("NA_RUN_TASK_ASSISTANT failed:", text);
          sendResponse({ ok: false, error: text } satisfies TaskAssistantMessage);
        }
      })();
      return true;
    }

    if (message.type === "NA_GET_SETTINGS") {
      (async () => { sendResponse(await loadSettings()); })();
      return true;
    }

    return false;
  },
);
