import { DEFAULT_SETTINGS } from "@/shared/types";
import { analyzeWithGemini } from "@/shared/gemini";
import { analyzeTaskWithGemini } from "@/shared/taskAssistant";
import { callGemini } from "@/shared/geminiClient";
import { createAbortSignal } from "@/shared/requestManager";
import { loadAiSettings, loadSettings, saveAiSettings, saveSettings } from "@/shared/storage";
import type { AiAnalysisMessage, NeuroAdaptMessage, TaskAssistantMessage } from "@/shared/messaging";
import type { AiAnalysisResult, TaskAssistantResult } from "@/shared/types";

const CACHE_MAX_SIZE = 50;

const analysisCache = new Map<string, AiAnalysisResult>();
const taskAssistantCache = new Map<string, TaskAssistantResult>();
let lastGeminiRequestAt = 0;

function trimCache(cache: Map<string, unknown>, maxSize: number): void {
  while (cache.size > maxSize) {
    const key = cache.keys().next().value;
    if (key !== undefined) cache.delete(key);
  }
}

// PLACE YOUR GEMINI API KEY HERE
// Get a valid key from https://aistudio.google.com/apikey
// Format: AIzaSy... (starts with AIza)
const BACKEND_GEMINI_API_KEY: string = "";

function cacheKey(message: Extract<NeuroAdaptMessage, { type: "NA_RUN_GEMINI_ANALYSIS" }>): string {
  const { summary, preferredPersona, question } = message.payload;
  return JSON.stringify({
    url: summary.url,
    title: summary.title,
    preferredPersona,
    question: question ?? "",
    stats: summary.stats,
    headings: summary.headings.slice(0, 10)
  });
}

function taskCacheKey(message: Extract<NeuroAdaptMessage, { type: "NA_RUN_TASK_ASSISTANT" }>): string | null {
  const { context, question, conversationHistory } = message.payload;
  const historyLen = conversationHistory?.length ?? 0;

  // Don't cache multi-turn chat — page state and context change.
  if (historyLen > 2) {
    return null;
  }

  return JSON.stringify({
    url: context.summary.url,
    question,
    stats: context.summary.stats
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

async function seedAiSettingsFromEnv(): Promise<void> {
  if (!BACKEND_GEMINI_API_KEY.trim()) return;

  const aiSettings = await loadAiSettings();
  // Only overwrite if backend key is valid format (AIza...)
  if (BACKEND_GEMINI_API_KEY.startsWith("AIza")) {
    await saveAiSettings({
      ...aiSettings,
      geminiApiKey: BACKEND_GEMINI_API_KEY.trim()
    });
  }
}

void seedAiSettingsFromEnv();

async function smokeTestGemini(apiKey: string, model: string): Promise<void> {
  const text = await callGemini(apiKey, model, 'Return {"ok":true}.', {
    temperature: 0,
    maxOutputTokens: 32,
    timeout: 5000,
    retries: 0
  });

  const result = JSON.parse(text) as { ok?: boolean };
  if (!result.ok) {
    throw new Error("Gemini returned an unexpected response.");
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await loadSettings();
  const nextSettings = { ...DEFAULT_SETTINGS, ...settings };

  await saveSettings(nextSettings);
  await seedAiSettingsFromEnv();
  chrome.action.setBadgeText({ text: nextSettings.enabled ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#0f766e" });
});

chrome.runtime.onStartup.addListener(() => {
  seedAiSettingsFromEnv().catch(() => undefined);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  const nextValue = changes["neuroadapt.settings"]?.newValue as typeof DEFAULT_SETTINGS | undefined;
  if (!nextValue) return;

  chrome.action.setBadgeText({ text: nextValue.enabled ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#0f766e" });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return false;
  }

  if (message.type === "NA_UPDATE_SETTINGS") {
    (async () => {
      const settings = await loadSettings();
      await saveSettings({ ...settings, ...message.payload });
      await seedAiSettingsFromEnv();
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === "NA_SAVE_AI_SETTINGS") {
    (async () => {
      await saveAiSettings(message.payload);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === "NA_GET_AI_SETTINGS") {
    (async () => {
      const settings = await loadAiSettings();
      sendResponse({
        ...settings,
        geminiApiKey: settings.geminiApiKey ? "********" : ""
      });
    })();
    return true;
  }

  if (message.type === "NA_RUN_GEMINI_ANALYSIS") {
    (async () => {
      try {
        const key = cacheKey(message);
        const cached = analysisCache.get(key);
        if (cached && Date.now() - cached.generatedAt < 5 * 60 * 1000) {
          sendResponse({ ok: true, analysis: { ...cached, cached: true } } satisfies AiAnalysisMessage);
          return;
        }

        await throttleGemini();
        const aiSettings = await loadAiSettings();
        const apiKey = (BACKEND_GEMINI_API_KEY && BACKEND_GEMINI_API_KEY.startsWith("AIza")) ? BACKEND_GEMINI_API_KEY : aiSettings.geminiApiKey;
        if (!apiKey?.startsWith("AIza")) {
          sendResponse({ ok: false, error: "No valid Gemini API key configured." } satisfies AiAnalysisMessage);
          return;
        }
        const analysis = await analyzeWithGemini({
          apiKey,
          model: aiSettings.model,
          summary: message.payload.summary,
          preferredPersona: message.payload.preferredPersona,
          question: message.payload.question
        });

        analysisCache.set(key, analysis);
        trimCache(analysisCache as Map<string, unknown>, CACHE_MAX_SIZE);
        sendResponse({ ok: true, analysis } satisfies AiAnalysisMessage);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Gemini analysis failed.";
        sendResponse({ ok: false, error: messageText } satisfies AiAnalysisMessage);
      }
    })();
    return true;
  }

  if (message.type === "NA_RUN_TASK_ASSISTANT") {
    (async () => {
      try {
        const key = taskCacheKey(message);
        if (key) {
          const cached = taskAssistantCache.get(key);
          if (cached && Date.now() - cached.generatedAt < 2 * 60 * 1000) {
            sendResponse({ ok: true, result: { ...cached, cached: true } } satisfies TaskAssistantMessage);
            return;
          }
        }

        await throttleGemini();
        const aiSettings = await loadAiSettings();
        const apiKey = (BACKEND_GEMINI_API_KEY && BACKEND_GEMINI_API_KEY.startsWith("AIza")) ? BACKEND_GEMINI_API_KEY : aiSettings.geminiApiKey;
        if (!apiKey?.startsWith("AIza")) {
          sendResponse({ ok: false, error: "No valid Gemini API key configured." } satisfies TaskAssistantMessage);
          return;
        }
        const signalKey = message.payload.signalKey || `task-${message.payload.context.summary.url}`;
        const { signal, cleanup } = createAbortSignal(signalKey);
        try {
          const result = await analyzeTaskWithGemini({
            apiKey,
            model: aiSettings.model,
            context: message.payload.context,
            question: message.payload.question,
            conversationHistory: message.payload.conversationHistory,
            goalSession: message.payload.goalSession,
            checklist: message.payload.checklist,
            confusionSignals: message.payload.confusionSignals,
            signal
          }, { allowHeuristicFallback: true });

          if (key) {
            taskAssistantCache.set(key, result);
            trimCache(taskAssistantCache as Map<string, unknown>, CACHE_MAX_SIZE);
          }
          sendResponse({ ok: true, result } satisfies TaskAssistantMessage);
        } finally {
          cleanup();
        }
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Task assistant failed.";
        sendResponse({ ok: false, error: messageText } satisfies TaskAssistantMessage);
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

  if (message.type === "NA_VERIFY_BACKEND_KEY") {
    (async () => {
      const aiSettings = await loadAiSettings();
      const apiKeyToUse = (BACKEND_GEMINI_API_KEY && BACKEND_GEMINI_API_KEY.startsWith("AIza")) ? BACKEND_GEMINI_API_KEY : aiSettings.geminiApiKey;
      if (!apiKeyToUse || !apiKeyToUse.trim() || !apiKeyToUse.startsWith("AIza")) {
        sendResponse({ ok: false, error: "No valid Gemini API key configured. Get a key from https://aistudio.google.com/apikey (format: AIza...)." });
        return;
      }
      try {
        await smokeTestGemini(apiKeyToUse, aiSettings.model);
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : "Network error during verification."
        });
      }
    })();
    return true;
  }

  return false;
});
