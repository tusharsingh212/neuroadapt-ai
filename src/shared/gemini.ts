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
<<<<<<< HEAD
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
=======
  return [
    "You are NeuroAdapt AI, an accessibility copilot for webpages.",
    "Analyze only the provided structured page summary. Do not ask for raw HTML.",
    "Return strict JSON only. No markdown, no commentary.",
    "The JSON shape must be:",
    '{"persona":"elderly|firstTime|taskHelper","score":0,"issues":[],"recommendations":[],"guidance":[],"summary":"","customCss":"","domActions":[{"action":"move|hide|style|addClass|changeText","elementRef":"","targetRef":"","position":"before|after|inside-start|inside-end","cssStyles":{},"classes":[],"text":""}]}',
    "issues items: {severity:'low|medium|high', category:string, description:string, evidence?:string}.",
    "recommendations items: {id:string, type:'font-scale|spacing|contrast|highlight-buttons|simplify-layout|guidance-markers|focus-indicators', priority:'low|medium|high', description:string, selectorHint?:string}.",
    "guidance items: {title:string, body:string, steps?:string[]}.",
    "Score is an accessibility suitability score from 0 to 100 where higher is better.",
    "customCss: raw CSS string to dynamically adapt the page.",
    "domActions: reversible DOM manipulation actions to restructure the page for the persona.",
    "Prefer actionable, reversible recommendations that can be applied by a Chrome extension."
  ].join("\n");
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
}

function userPrompt(request: GeminiAnalyzeRequest): string {
  return [
<<<<<<< HEAD
    `Target persona: ${request.preferredPersona}`,
    request.question ? `User question: ${request.question}` : "",
    "",
    "Analyze this page's specific problems. Focus on page-specific issues — the generic ones are already fixed.",
    "Identify: the primary CTA (most important button to click), any page-specific clutter by exact class/id, layout issues, buried navigation.",
    "Use the id and cssClass fields from the page data to build precise CSS selectors.",
    "",
    "Page data:",
=======
    `Preferred persona: ${request.preferredPersona}`,
    request.question ? `User question: ${request.question}` : "User question: Explain and adapt this page.",
    "Tasks:",
    "1. Identify accessibility barriers, readability issues, navigation complexity, and cognitive load.",
    "2. Detect the best persona fit between elderly, firstTime, or taskHelper.",
    "3. Generate contextual guidance for using the current page.",
    "4. Recommend reversible DOM adaptations.",
    "Structured page summary:",
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
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
<<<<<<< HEAD
    maxOutputTokens: 2000
=======
    maxOutputTokens: 1600
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
  });

  return {
    ...validateAiAnalysis(parseGeminiJson(text)),
    source: "gemini",
    generatedAt: Date.now()
  };
}
