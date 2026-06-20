const controllers = new Map<string, AbortController>();

export function createAbortSignal(key: string): { signal: AbortSignal; cleanup: () => void } {
  const existing = controllers.get(key);
  if (existing) existing.abort();
  const controller = new AbortController();
  controllers.set(key, controller);

  // Auto-cleanup on abort
  controller.signal.addEventListener("abort", () => {
    controllers.delete(key);
  }, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      controllers.delete(key);
    }
  };
}

export function cancelRequest(key: string): void {
  const controller = controllers.get(key);
  if (controller) {
    controller.abort();
    controllers.delete(key);
  }
}

export function cancelAll(): void {
  controllers.forEach((c) => c.abort());
  controllers.clear();
}

export function completeRequest(key: string): void {
  controllers.delete(key);
}

const summaryCache = new Map<string, { fingerprint: string; data: unknown; timestamp: number }>();
const CACHE_TTL = 5000;

export function cachedSummary<T>(key: string, fingerprint: string, build: () => T): T {
  const cached = summaryCache.get(key);
  if (cached && cached.fingerprint === fingerprint && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  const data = build();
  summaryCache.set(key, { fingerprint, data, timestamp: Date.now() });
  return data;
}

export function clearSummaryCache(): void {
  summaryCache.clear();
}
