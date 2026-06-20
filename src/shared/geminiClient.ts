const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  error?: {
    message?: string;
    code?: number;
  };
}

function isRetryable(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503;
}

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

export async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
    timeout?: number;
    retries?: number;
    signal?: AbortSignal;
  }
): Promise<string> {
  if (!apiKey.trim()) {
    throw new GeminiError("Gemini API key is missing.", "NO_KEY");
  }

  const timeout = options?.timeout ?? REQUEST_TIMEOUT_MS;
  const maxRetries = options?.retries ?? MAX_RETRIES;
  const temperature = options?.temperature ?? 0.25;
  const maxOutputTokens = options?.maxOutputTokens ?? 2048;
  const externalSignal = options?.signal;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();

    const onExternalAbort = () => { controller.abort(); };
    if (externalSignal) {
      if (externalSignal.aborted) {
        throw new GeminiError("Request was cancelled.", "CANCELLED");
      }
      externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }

    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(
        `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            generationConfig: {
              temperature,
              topP: 0.85,
              maxOutputTokens,
              responseMimeType: "application/json"
            },
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }]
              }
            ]
          })
        }
      );

      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);
      const payload = (await response.json()) as GeminiGenerateResponse;

      if (!response.ok) {
        const msg = payload.error?.message || `Request failed with HTTP ${response.status}.`;
        if (isRetryable(response.status) && attempt < maxRetries) {
          lastError = new GeminiError(msg, "RETRYABLE", response.status);
          await delay(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        throw new GeminiError(msg, "API_ERROR", response.status);
      }

      const finishReason = payload.candidates?.[0]?.finishReason;
      const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n").trim();

      if (finishReason === "SAFETY") {
        throw new GeminiError("The AI response was blocked by safety filters. Try rephrasing your question.", "SAFETY");
      }

      if (!text) {
        throw new GeminiError("The AI returned an empty response.", "EMPTY_RESPONSE");
      }

      return text;
    } catch (error) {
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);

      if (externalSignal?.aborted) {
        throw new GeminiError("Request was cancelled.", "CANCELLED");
      }

      if (error instanceof GeminiError) {
        if (error.code === "RETRYABLE" && attempt < maxRetries) {
          await delay(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        if (externalSignal?.aborted) {
          throw new GeminiError("Request was cancelled.", "CANCELLED");
        }
        throw new GeminiError("Request timed out. Please check your connection and try again.", "TIMEOUT");
      }

      throw new GeminiError(
        error instanceof Error ? error.message : "Unable to contact the AI service.",
        "NETWORK"
      );
    }
  }

  throw lastError ?? new GeminiError("Unable to contact the AI service after multiple attempts.", "MAX_RETRIES");
}
