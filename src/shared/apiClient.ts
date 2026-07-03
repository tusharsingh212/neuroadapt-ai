// Phase 2: Backend API client — replace direct Gemini calls with server-side proxy.
// All functions here are stubs that throw until a real backend endpoint is wired up.

import type { AiAnalysisResult, PersonaId } from "@/shared/types";
import type { PageSummary } from "@/shared/types";

export interface AnalysisRequest {
  summary: PageSummary;
  preferredPersona: PersonaId;
  question?: string;
}

export interface AnalysisResponse {
  ok: boolean;
  analysis?: AiAnalysisResult;
  error?: string;
}

// Phase 2: set this to the deployed backend URL (e.g. https://api.neuroadapt.ai/v1)
export const BACKEND_URL = "";

export async function requestAnalysis(
  _request: AnalysisRequest,
): Promise<AnalysisResponse> {
  if (!BACKEND_URL) {
    return { ok: false, error: "Backend API not configured." };
  }

  const response = await fetch(`${BACKEND_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(_request),
  });

  if (!response.ok) {
    return { ok: false, error: `Backend error: ${response.status}` };
  }

  const data = (await response.json()) as AnalysisResponse;
  return data;
}
