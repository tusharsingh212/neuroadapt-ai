import { DEFAULT_SETTINGS } from "@/shared/types";
import { analyzeWithGemini } from "@/shared/gemini";
import { loadAiSettings, loadSettings, saveAiSettings, saveSettings } from "@/shared/storage";
import type { AiAnalysisMessage, NeuroAdaptMessage } from "@/shared/messaging";
import type { AiAnalysisResult } from "@/shared/types";

const analysisCache = new Map<string, AiAnalysisResult>();
let lastGeminiRequestAt = 0;

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
        const analysis = await analyzeWithGemini({
          apiKey: aiSettings.geminiApiKey,
          model: aiSettings.model,
          summary: message.payload.summary,
          preferredPersona: message.payload.preferredPersona,
          question: message.payload.question
        });

        analysisCache.set(key, analysis);
        sendResponse({ ok: true, analysis } satisfies AiAnalysisMessage);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Gemini analysis failed.";
        sendResponse({ ok: false, error: messageText } satisfies AiAnalysisMessage);
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
});
