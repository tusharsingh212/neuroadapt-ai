import type { AiAnalysisResult, AiGuidanceItem, AiIssue, AiRecommendation, DomAction, PersonaId } from "@/shared/types";

const DOM_ACTION_TYPES = ["move", "hide", "style", "addClass", "changeText"];
const DOM_POSITIONS = ["before", "after", "inside-start", "inside-end"];

const PERSONAS: PersonaId[] = ["elderly", "firstTime", "taskHelper", "auto"];
const RECOMMENDATION_TYPES: AiRecommendation["type"][] = [
  "font-scale",
  "spacing",
  "contrast",
  "highlight-buttons",
  "simplify-layout",
  "guidance-markers",
  "focus-indicators"
];

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function priority(value: unknown): "low" | "medium" | "high" {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function persona(value: unknown): PersonaId {
  return PERSONAS.includes(value as PersonaId) ? (value as PersonaId) : "auto";
}

function issue(value: unknown): AiIssue {
  const record = asRecord(value);
  return {
    severity: priority(record.severity),
    category: asString(record.category, "accessibility"),
    description: asString(record.description, "Accessibility issue detected."),
    evidence: asString(record.evidence) || undefined,
    cssSelector: asString(record.cssSelector) || undefined
  };
}

function recommendation(value: unknown, index: number): AiRecommendation {
  const record = asRecord(value);
  const type = RECOMMENDATION_TYPES.includes(record.type as AiRecommendation["type"])
    ? (record.type as AiRecommendation["type"])
    : "guidance-markers";

  return {
    id: asString(record.id, `rec-${index + 1}`).replace(/[^a-z0-9-_]/gi, "-").toLowerCase(),
    type,
    priority: priority(record.priority),
    description: asString(record.description, "Improve accessibility for the current page."),
    selectorHint: asString(record.selectorHint) || undefined
  };
}

function guidance(value: unknown): AiGuidanceItem {
  const record = asRecord(value);
  return {
    title: asString(record.title, "Page guidance"),
    body: asString(record.body, "Use the highlighted areas to continue."),
    steps: asArray(record.steps).map((step) => asString(step)).filter(Boolean).slice(0, 6)
  };
}

export function parseGeminiJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini did not return JSON.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function parseDomAction(value: unknown): DomAction | null {
  const record = asRecord(value);
  const action = asString(record.action);
  if (!action || !DOM_ACTION_TYPES.includes(action)) return null;
  const elementRef = asString(record.elementRef);
  const cssSelector = asString(record.cssSelector) || undefined;
  if (!elementRef && !cssSelector) return null;
  return {
    action: action as DomAction["action"],
    elementRef,
    cssSelector,
    targetRef: asString(record.targetRef) || undefined,
    targetSelector: asString(record.targetSelector) || undefined,
    position: DOM_POSITIONS.includes(record.position as string) ? (record.position as DomAction["position"]) : undefined,
    cssStyles: record.cssStyles ? (asRecord(record.cssStyles) as Record<string, string>) : undefined,
    classes: record.classes ? asArray(record.classes).map((c) => asString(c)).filter(Boolean) : undefined,
    text: asString(record.text) || undefined
  };
}

export function validateAiAnalysis(value: unknown): Omit<AiAnalysisResult, "source" | "generatedAt" | "cached"> {
  const record = asRecord(value);
  const score = Math.round(Math.min(100, Math.max(0, asNumber(record.score, 70))));
  const rawCss = asString(record.customCss);
  const domActions = asArray(record.domActions)
    .map(parseDomAction)
    .filter((item): item is DomAction => Boolean(item));

  return {
    persona: persona(record.persona),
    score,
    issues: asArray(record.issues).map(issue).filter((item) => item.description).slice(0, 8),
    recommendations: asArray(record.recommendations).map(recommendation).filter((item) => item.description).slice(0, 8),
    guidance: asArray(record.guidance).map(guidance).filter((item) => item.title || item.body).slice(0, 5),
    summary: asString(record.summary, "Accessibility analysis completed."),
    customCss: rawCss || undefined,
    domActions: domActions.length > 0 ? domActions : undefined
  };
}
