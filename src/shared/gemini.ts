import { parseGeminiJson, validateAiAnalysis } from "@/shared/aiSchema";
import type { AiAnalysisResult, PageSummary, PersonaId } from "@/shared/types";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

export interface GeminiAnalyzeRequest {
  apiKey: string;
  model: string;
  summary: PageSummary;
  preferredPersona: PersonaId;
  question?: string;
}

function compactSummary(summary: PageSummary): string {
  return JSON.stringify({
    title: summary.title,
    url: summary.url,
    language: summary.language,
    description: summary.description,
    headings: summary.headings,
    navigation: summary.navigation,
    forms: summary.forms,
    buttons: summary.buttons,
    links: summary.links.slice(0, 40),
    tables: summary.tables,
    textBlocks: summary.textBlocks.slice(0, 36),
    stats: summary.stats
  });
}

function systemPrompt(): string {
  return [
    "You are NeuroAdapt AI, an accessibility copilot for webpages.",
    "Analyze only the provided structured page summary. Do not ask for raw HTML.",
    "Return strict JSON only. No markdown, no commentary.",
    "The JSON shape must be:",
    '{"persona":"elderly|firstTime","score":0,"issues":[],"recommendations":[],"guidance":[],"summary":"","customCss":"","domActions":[{"action":"move|hide|style|addClass|changeText","elementRef":"","targetRef":"","position":"before|after|inside-start|inside-end","cssStyles":{},"classes":[],"text":""}]}',
    "issues items: {severity:'low|medium|high', category:string, description:string, evidence?:string}.",
    "recommendations items: {id:string, type:'font-scale|spacing|contrast|highlight-buttons|simplify-layout|guidance-markers|focus-indicators', priority:'low|medium|high', description:string, selectorHint?:string}.",
    "guidance items: {title:string, body:string, steps?:string[]}.",
    "Score is an accessibility suitability score from 0 to 100 where higher is better.",
    "customCss: raw CSS string to dynamically adapt the page.",
    "domActions: reversible DOM manipulation actions to restructure the page for the persona.",
    "Prefer actionable, reversible recommendations that can be applied by a Chrome extension."
  ].join("\n");
}

function userPrompt(request: GeminiAnalyzeRequest): string {
  return [
    `Preferred persona: ${request.preferredPersona}`,
    request.question ? `User question: ${request.question}` : "User question: Explain and adapt this page.",
    "Tasks:",
    "1. Identify accessibility barriers, readability issues, navigation complexity, and cognitive load.",
    "2. Detect the best persona fit between elderly or firstTime.",
    "3. Generate contextual guidance for using the current page.",
    "4. Recommend reversible DOM adaptations.",
    "Structured page summary:",
    compactSummary(request.summary)
  ].join("\n");
}

export async function analyzeWithGemini(request: GeminiAnalyzeRequest): Promise<AiAnalysisResult> {
  if (!request.apiKey.trim()) {
    throw new Error("Gemini API key is missing. Add it in the NeuroAdapt popup.");
  }

  const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(request.model)}:generateContent?key=${encodeURIComponent(request.apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 1600,
        responseMimeType: "application/json"
      },
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt()}\n\n${userPrompt(request)}` }]
        }
      ]
    })
  });

  const payload = (await response.json()) as GeminiGenerateResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `Gemini request failed with ${response.status}.`);
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return {
    ...validateAiAnalysis(parseGeminiJson(text)),
    source: "gemini",
    generatedAt: Date.now()
  };
}
