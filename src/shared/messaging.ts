import type {
  AnalysisReport,
  ExtensionSettings,
  PageInsights,
  PersonaId,
  RuntimeStatus
} from "@/shared/types";

export type NeuroAdaptMessage =
  | { type: "NA_GET_STATE" }
  | { type: "NA_GET_SETTINGS" }
  | { type: "NA_UPDATE_SETTINGS"; payload: Partial<ExtensionSettings> }
  | { type: "NA_ANALYZE_PAGE" }
  | { type: "NA_ADAPT_PAGE"; payload?: { persona?: PersonaId } }
  | { type: "NA_RESET_PAGE" }
  | { type: "NA_SET_COMPARISON"; payload: { mode: "original" | "adapted" } }
  | { type: "NA_SHOW_STATUS"; payload: { message: string; tone?: "info" | "success" | "warning" } };

export interface NeuroAdaptStateMessage {
  settings: ExtensionSettings;
  insights: PageInsights;
  analysis: AnalysisReport;
  runtime: RuntimeStatus;
}

export function isNeuroAdaptMessage(value: unknown): value is NeuroAdaptMessage {
  return Boolean(value && typeof value === "object" && "type" in value);
}
