import { DEFAULT_AI_SETTINGS, DEFAULT_SETTINGS, type AiSettings, type ExtensionSettings } from "@/shared/types";

const STORAGE_KEY = "neuroadapt.settings";
const AI_STORAGE_KEY = "neuroadapt.aiSettings";

function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

function readFallback(): ExtensionSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<ExtensionSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function readAiFallback(): AiSettings {
  if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;

  const raw = window.localStorage.getItem(AI_STORAGE_KEY);
  if (!raw) return DEFAULT_AI_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return { ...DEFAULT_AI_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export async function loadSettings(): Promise<ExtensionSettings> {
  if (!hasChromeStorage()) return readFallback();

  return await new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const value = result[STORAGE_KEY] as Partial<ExtensionSettings> | undefined;
      resolve({ ...DEFAULT_SETTINGS, ...(value ?? {}) });
    });
  });
}

export async function loadAiSettings(): Promise<AiSettings> {
  if (!hasChromeStorage()) return readAiFallback();

  return await new Promise((resolve) => {
    chrome.storage.local.get([AI_STORAGE_KEY], (result) => {
      const value = result[AI_STORAGE_KEY] as Partial<AiSettings> | undefined;
      resolve({ ...DEFAULT_AI_SETTINGS, ...(value ?? {}) });
    });
  });
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  if (!hasChromeStorage()) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
    return;
  }

  await new Promise<void>((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: settings }, () => resolve());
  });
}

export async function saveAiSettings(settings: AiSettings): Promise<void> {
  const safeSettings = {
    ...DEFAULT_AI_SETTINGS,
    ...settings,
    geminiApiKey: settings.geminiApiKey.trim()
  };

  if (!hasChromeStorage()) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(safeSettings));
    }
    return;
  }

  await new Promise<void>((resolve) => {
    chrome.storage.local.set({ [AI_STORAGE_KEY]: safeSettings }, () => resolve());
  });
}

export function subscribeToSettings(
  callback: (settings: ExtensionSettings) => void
): () => void {
  if (hasChromeStorage()) {
    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      areaName
    ) => {
      if (areaName !== "local" || !changes[STORAGE_KEY]) return;
      const next = changes[STORAGE_KEY].newValue as ExtensionSettings | undefined;
      if (next) callback({ ...DEFAULT_SETTINGS, ...next });
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  if (typeof window !== "undefined") {
    const listener = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as Partial<ExtensionSettings>;
        callback({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        callback(DEFAULT_SETTINGS);
      }
    };

    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }

  return () => undefined;
}
