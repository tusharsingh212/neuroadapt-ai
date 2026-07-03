<<<<<<< HEAD
=======
// Phase 2 note: NA_RUN_ANALYSIS and NA_RUN_TASK_ASSISTANT will be routed through
// the backend API instead of calling Gemini directly. See src/shared/apiClient.ts.
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191

import type {
  AnalysisReport, AiAnalysisResult, ChatMessage, ChecklistItem, ExtensionSettings,
  GoalSession, PageInsights, PageSummary, PersonaId, RuntimeStatus,
  TaskAssistantResult, ConfusionSignal
} from "@/shared/types";
import type { PageContext } from "@/shared/pageContext";

export type NeuroAdaptMessage =
  | { type: "NA_GET_STATE" }
  | { type: "NA_GET_SETTINGS" }
  | { type: "NA_UPDATE_SETTINGS"; payload: Partial<ExtensionSettings> }
  | { type: "NA_RUN_ANALYSIS"; payload: { summary: PageSummary; preferredPersona: PersonaId; question?: string } }
  | {
      type: "NA_RUN_TASK_ASSISTANT";
      payload: {
        context: PageContext;
        question: string;
        conversationHistory?: ChatMessage[];
        goalSession?: GoalSession | null;
        checklist?: ChecklistItem[];
        confusionSignals?: ConfusionSignal[];
        signalKey?: string;
      };
    }
  | { type: "NA_ANALYZE_PAGE" }
  | { type: "NA_ADAPT_PAGE"; payload?: { persona?: PersonaId } }
  | { type: "NA_RESET_PAGE" }
  | { type: "NA_SET_COMPARISON"; payload: { mode: "original" | "adapted" } }
  | { type: "NA_SHOW_STATUS"; payload: { message: string; tone?: "info" | "success" | "warning" } }
  | { type: "NA_GOAL_INIT"; payload: { goal: string; steps: string[]; estimatedTime?: string; estimatedSteps?: number } }
  | { type: "NA_GOAL_START" }
  | { type: "NA_GOAL_PAUSE" }
  | { type: "NA_GOAL_RESUME" }
  | { type: "NA_GOAL_RESTART" }
  | { type: "NA_GOAL_CANCEL" }
  | { type: "NA_OVERLAY_TOGGLE"; payload: { mode: string; enabled: boolean } }
  | { type: "NA_OVERLAY_GET" }
  | { type: "NA_OVERLAY_RESET" };

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
