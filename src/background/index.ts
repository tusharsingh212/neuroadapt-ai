import { DEFAULT_SETTINGS } from "@/shared/types";
import { loadSettings, saveSettings } from "@/shared/storage";

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

  if (message.type === "NA_GET_SETTINGS") {
    (async () => {
      sendResponse(await loadSettings());
    })();
    return true;
  }

  return false;
});
