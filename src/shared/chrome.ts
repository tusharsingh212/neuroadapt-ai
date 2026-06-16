export const hasChromeRuntime =
  typeof chrome !== "undefined" && Boolean(chrome.runtime && chrome.storage);

export function isExtensionPage(): boolean {
  return hasChromeRuntime && Boolean(chrome.runtime?.id);
}

export function asErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

export async function queryActiveTab(): Promise<chrome.tabs.Tab | null> {
  if (!chrome?.tabs?.query) return null;

  return await new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0] ?? null);
    });
  });
}

export async function sendToActiveTab<TResponse = unknown>(
  message: unknown
): Promise<TResponse | null> {
  const tab = await queryActiveTab();
  if (!tab || !chrome?.tabs?.sendMessage) return null;
  const tabId = tab.id;
  if (typeof tabId !== "number") return null;

  return await new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response: TResponse) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }

      resolve(response ?? null);
    });
  });
}

export async function injectContentScriptIfNeeded(tabId?: number): Promise<boolean> {
  if (!chrome?.scripting?.executeScript || typeof tabId !== "number") return false;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["contentScript.js"]
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendRuntimeMessage<TResponse = unknown>(
  message: unknown
): Promise<TResponse | null> {
  if (!chrome?.runtime?.sendMessage) return null;

  return await new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: TResponse) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }

      resolve(response ?? null);
    });
  });
}
