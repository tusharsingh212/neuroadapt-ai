export const config = {
  geminiApiKey: (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? "",
  geminiModel: "gemini-2.0-flash",
  geminiModelFallback: "gemini-1.5-flash-8b",
  isDev: import.meta.env.DEV === true,

  // Cache
  cacheMaxSize: 50,
  analysisCacheTtlMs: 5 * 60 * 1000,
  taskCacheTtlMs: 2 * 60 * 1000,

  // Throttling & debouncing
  geminiThrottleMs: 1_200,
  mutationDebounceMs: 400,
  autoScanDelayMs: 1_400,
} as const;

export type Config = typeof config;
