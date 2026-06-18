import type {
  AnalysisReport,
  AiAnalysisResult,
  AiSettings,
  ChatMessage,
  ExtensionSettings,
  PageInsights,
  PageSummary,
  PersonaId,
  RuntimeStatus,
  TaskAssistantResult
} from "@/shared/types";
import type { PageContext } from "@/shared/pageContext";

export type NeuroAdaptMessage =
  | { type: "NA_GET_STATE" }
  | { type: "NA_GET_SETTINGS" }
  | { type: "NA_GET_AI_SETTINGS" }
  | { type: "NA_UPDATE_SETTINGS"; payload: Partial<ExtensionSettings> }
  | { type: "NA_SAVE_AI_SETTINGS"; payload: AiSettings }
  | { type: "NA_RUN_GEMINI_ANALYSIS"; payload: { summary: PageSummary; preferredPersona: PersonaId; question?: string } }
  | {
      type: "NA_RUN_TASK_ASSISTANT";
      payload: {
        context: PageContext;
        question: string;
        conversationHistory?: ChatMessage[];
        walkthroughMode?: boolean;
        walkthroughStepIndex?: number;
      };
    }
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

export interface AiAnalysisMessage {
  ok: boolean;
  analysis?: AiAnalysisResult;
  error?: string;
}

export interface TaskAssistantMessage {
  ok: boolean;
  result?: TaskAssistantResult;
  error?: string;
}

export function isNeuroAdaptMessage(value: unknown): value is NeuroAdaptMessage {
  return Boolean(value && typeof value === "object" && "type" in value);
}
