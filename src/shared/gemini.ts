import { callGemini } from "@/shared/geminiClient";
import { parseGeminiJson, validateAiAnalysis } from "@/shared/aiSchema";
import type { AiAnalysisResult, PageSummary, PersonaId } from "@/shared/types";

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
    navigation: summary.navigation.map((el) => ({
      label: el.label, tag: el.tag, id: el.id, cssClass: el.cssClass
    })),
    forms: summary.forms,
    buttons: summary.buttons.map((el) => ({
      label: el.label, tag: el.tag, id: el.id, cssClass: el.cssClass,
      fontSize: el.fontSize, smallTarget: el.smallTarget, contrastRatio: el.contrastRatio
    })),
    links: summary.links.slice(0, 30).map((el) => ({
      label: el.label, tag: el.tag, id: el.id, cssClass: el.cssClass, href: el.href
    })),
    tables: summary.tables,
    textBlocks: summary.textBlocks.slice(0, 20).map((b) => ({
      text: b.text.slice(0, 100), fontSize: b.fontSize, contrastRatio: b.contrastRatio
    })),
    stats: summary.stats
  });
}

function systemPrompt(): string {
  return `You are NeuroAdapt AI. A base accessibility stylesheet is already applied (large fonts, big buttons, white main area). Your job: page-specific fixes only. Return STRICT JSON, no markdown.

Shape: {"persona":"elderly|firstTime|taskHelper","score":0,"issues":[],"recommendations":[],"guidance":[],"summary":"","customCss":"","domActions":[]}

issues (max 6): [{severity:"high|medium|low",category:string,description:string,evidence:string,cssSelector:string}]
- Report page-specific problems using actual id/class from page data for cssSelector.

customCss: Page-specific CSS only. Use #id or .class from page data with !important.
- Highlight the primary CTA with a glow/outline.
- Fix any low-contrast or buried elements by exact selector.
- Hide page-specific clutter (by exact class/id).

domActions (max 4): [{action:"hide|style|move",elementRef:"",cssSelector:string,targetSelector:string,position:"before|after|inside-start|inside-end",cssStyles:{},classes:[],text:""}]

recommendations (max 4): [{id:string,type:"font-scale|spacing|contrast|highlight-buttons|simplify-layout|guidance-markers|focus-indicators",priority:"high|medium|low",description:string,selectorHint:string}]

guidance (max 2): [{title:string,body:string,steps:string[]}]

score: 0-100 (lower = worse). persona: best fit. summary: 1 sentence on main problem.`;
}

function userPrompt(request: GeminiAnalyzeRequest): string {
  return [
    `Target persona: ${request.preferredPersona}`,
    request.question ? `User question: ${request.question}` : "",
    "",
    "Analyze this page's specific problems. Focus on page-specific issues — the generic ones are already fixed.",
    "Identify: the primary CTA (most important button to click), any page-specific clutter by exact class/id, layout issues, buried navigation.",
    "Use the id and cssClass fields from the page data to build precise CSS selectors.",
    "",
    "Page data:",
    compactSummary(request.summary)
  ].filter(Boolean).join("\n");
}

export async function analyzeWithGemini(request: GeminiAnalyzeRequest): Promise<AiAnalysisResult> {
  if (!request.apiKey.trim()) {
    throw new Error("Gemini API key is missing. Add it in the NeuroAdapt popup.");
  }

  const fullPrompt = `${systemPrompt()}\n\n${userPrompt(request)}`;
  const text = await callGemini(request.apiKey, request.model, fullPrompt, {
    temperature: 0.2,
    maxOutputTokens: 2000
  });

  return {
    ...validateAiAnalysis(parseGeminiJson(text)),
    source: "gemini",
    generatedAt: Date.now()
  };
}
