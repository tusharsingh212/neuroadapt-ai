import { buildMetrics } from "@/shared/pageInsights";
import type { ExtensionSettings, PageInsights } from "@/shared/types";

export function createMetricCards(insights: PageInsights, settings: ExtensionSettings) {
  return buildMetrics(insights, settings);
}

export function progressValue(value: number, max = 100): number {
  return Math.min(100, Math.max(0, (value / max) * 100));
}

export function formatTaskTime(totalSeconds: number): string {
  const safe = Math.max(1, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}
