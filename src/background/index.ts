<<<<<<< HEAD
=======
// Phase 2: All AI calls in this file will be replaced with requests to the
// NeuroAdapt backend API. See src/shared/apiClient.ts for the planned interface.
// Until then, set BACKEND_GEMINI_API_KEY below to enable AI features during development.
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191

import { DEFAULT_SETTINGS } from "@/shared/types";
import { analyzeWithGemini } from "@/shared/gemini";
import { analyzeTaskWithGemini } from "@/shared/taskAssistant";
import { createAbortSignal } from "@/shared/requestManager";
import { loadSettings, saveSettings } from "@/shared/storage";
import type {
  AiAnalysisMessage,
  NeuroAdaptMessage,
  TaskAssistantMessage,
} from "@/shared/messaging";
import type { AiAnalysisResult, TaskAssistantResult } from "@/shared/types";

// Phase 2: This constant will be removed once the backend API is live.
// To enable AI features during local development, paste a valid Gemini key here.
const BACKEND_GEMINI_API_KEY: string =
  import.meta.env.VITE_GEMINI_API_KEY || "";
<<<<<<< HEAD
const DEFAULT_MODEL = "gemini-2.0-flash";
=======
const DEFAULT_MODEL = "gemini-1.5-flash";
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191

const CACHE_MAX_SIZE = 50;
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

  // Don't cache multi-turn chat — page state and context change between turns.
  if (historyLen > 2) return null;

  return JSON.stringify({
    url: context.summary.url,
    question,
    stats: context.summary.stats,
  });
}

async function throttleGemini(): Promise<void> {
  const now = Date.now();
  const waitMs = Math.max(0, 1200 - (now - lastGeminiRequestAt));
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
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
  const nextValue = changes["neuroadapt.settings"]?.newValue as
    | typeof DEFAULT_SETTINGS
    | undefined;
  if (!nextValue) return;
  chrome.action.setBadgeText({ text: nextValue.enabled ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#0f766e" });
});

chrome.runtime.onMessage.addListener(
  (rawMessage: unknown, _sender, sendResponse) => {
    if (
      !rawMessage ||
      typeof rawMessage !== "object" ||
      !("type" in rawMessage)
    ) {
      return false;
    }

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
          if (cached && Date.now() - cached.generatedAt < 5 * 60 * 1000) {
            sendResponse({
              ok: true,
              analysis: { ...cached, cached: true },
            } satisfies AiAnalysisMessage);
            return;
          }

          if (!BACKEND_GEMINI_API_KEY?.trim()) {
            sendResponse({
              ok: false,
              error: "AI analysis unavailable. Backend API not yet configured.",
            } satisfies AiAnalysisMessage);
            return;
          }

          await throttleGemini();
<<<<<<< HEAD
          let analysis: AiAnalysisResult;
          try {
            analysis = await analyzeWithGemini({
              apiKey: BACKEND_GEMINI_API_KEY,
              model: DEFAULT_MODEL,
              summary: msg.payload.summary,
              preferredPersona: msg.payload.preferredPersona,
              question: msg.payload.question,
            });
          } catch (primaryErr) {
            // If the primary model isn't available, try the lite fallback
            const isModelError =
              primaryErr instanceof Error &&
              (primaryErr.message.includes("404") ||
               primaryErr.message.includes("not found") ||
               primaryErr.message.toLowerCase().includes("model"));
            if (!isModelError) throw primaryErr;
            analysis = await analyzeWithGemini({
              apiKey: BACKEND_GEMINI_API_KEY,
              model: "gemini-1.5-flash-8b",
              summary: msg.payload.summary,
              preferredPersona: msg.payload.preferredPersona,
              question: msg.payload.question,
            });
          }
=======
          const analysis = await analyzeWithGemini({
            apiKey: BACKEND_GEMINI_API_KEY,
            model: DEFAULT_MODEL,
            summary: msg.payload.summary,
            preferredPersona: msg.payload.preferredPersona,
            question: msg.payload.question,
          });
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191

          analysisCache.set(key, analysis);
          trimCache(analysisCache as Map<string, unknown>, CACHE_MAX_SIZE);
          sendResponse({ ok: true, analysis } satisfies AiAnalysisMessage);
        } catch (error) {
          const text =
            error instanceof Error ? error.message : "AI analysis failed.";
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
            if (cached && Date.now() - cached.generatedAt < 2 * 60 * 1000) {
              sendResponse({
                ok: true,
                result: { ...cached, cached: true },
              } satisfies TaskAssistantMessage);
              return;
            }
          }

          // Unlike NA_RUN_ANALYSIS, the task assistant always has a heuristic
          // fallback (see analyzeTaskWithGemini/heuristicFallback), so a missing
          // API key should not short-circuit here — let analyzeTaskWithGemini
          // degrade gracefully instead of returning a hard error. Only throttle
          // when we're actually about to make a Gemini network call.
          if (BACKEND_GEMINI_API_KEY?.trim()) {
            await throttleGemini();
          }
          const signalKey =
            msg.payload.signalKey || `task-${msg.payload.context.summary.url}`;
          const { signal, cleanup } = createAbortSignal(signalKey);
          try {
            const result = await analyzeTaskWithGemini(
              {
                apiKey: BACKEND_GEMINI_API_KEY,
                model: DEFAULT_MODEL,
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
              trimCache(
                taskAssistantCache as Map<string, unknown>,
                CACHE_MAX_SIZE,
              );
            }
            sendResponse({ ok: true, result } satisfies TaskAssistantMessage);
          } finally {
            cleanup();
          }
        } catch (error) {
          const text =
            error instanceof Error ? error.message : "Task assistant failed.";
          sendResponse({
            ok: false,
            error: text,
          } satisfies TaskAssistantMessage);
        }
      })();
      return true;
    }

    if (message.type === "NA_GET_SETTINGS") {
      (async () => {
        sendResponse(await loadSettings());
      })();
      return true;
    }

    return false;
  },
);
