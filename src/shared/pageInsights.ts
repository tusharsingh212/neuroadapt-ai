import {
  PERSONA_LABELS,
  type AnalysisReport,
  type AiAnalysisResult,
  type ExtensionSettings,
  type MetricsSnapshot,
  type NavigationComplexity,
  type PageInsights,
  type PersonaId
} from "@/shared/types";

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[role='link']",
  "[tabindex]:not([tabindex='-1'])",
  "[onclick]"
].join(",");

const HEALTHCARE_KEYWORDS = [
  "appointment",
  "doctor",
  "clinic",
  "health",
  "patient",
  "care",
  "medical",
  "hospital",
  "prescription",
  "pharmacy",
  "billing",
  "insurance"
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function timeLabel(seconds: number): string {
  const safe = Math.max(1, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

function complexityLabel(score: number): NavigationComplexity {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function elementVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
}

function measureAverageFontSize(nodes: HTMLElement[]): number {
  if (nodes.length === 0) return 16;
  const sample = nodes.slice(0, 30);
  const total = sample.reduce((sum, node) => {
    const size = Number.parseFloat(window.getComputedStyle(node).fontSize || "16");
    return sum + size;
  }, 0);
  return round(total / sample.length);
}

function collectTextBlocks(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll("p, li, td, label, article, section"))
    .filter((node): node is HTMLElement => node instanceof HTMLElement && elementVisible(node))
    .filter((node) => (node.textContent ?? "").trim().length > 40);
}

function countHealthcareSignals(text: string): number {
  const lower = text.toLowerCase();
  return HEALTHCARE_KEYWORDS.reduce((count, keyword) => count + (lower.includes(keyword) ? 1 : 0), 0);
}

function estimatePersona({
  healthcareSignals,
  averageFontSize,
  smallTargetCount,
  navCount,
  interactiveCount,
  textBlockCount
}: Omit<PageInsights, "title" | "url" | "complexityScore" | "detectedPersona" | "summary" | "formCount" | "bodyTextLength">): PersonaId {
  if (healthcareSignals >= 3) return "patient";
  if (averageFontSize < 15 && smallTargetCount >= 4) return "visuallyImpaired";
  if (navCount >= 3 && interactiveCount >= 18 && textBlockCount >= 6) return "firstTime";
  if (smallTargetCount >= 6 || averageFontSize < 15) return "elderly";
  return "auto";
}

export function inspectPage(root: Document = document): PageInsights {
  const title = root.title || "Untitled Page";
  const url = root.location?.href ?? "";
  const interactiveElements = Array.from(root.querySelectorAll(INTERACTIVE_SELECTOR)).filter((element) => elementVisible(element));
  const textBlocks = collectTextBlocks(root);
  const bodyText = (root.body?.innerText ?? root.body?.textContent ?? "").trim();
  const navCount = root.querySelectorAll("nav, header nav, aside nav").length;
  const formCount = root.querySelectorAll("form").length;
  const smallTargetCount = interactiveElements.filter((element) => {
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
  }).length;

  const averageFontSize = measureAverageFontSize(
    Array.from(root.querySelectorAll("p, li, label, span, a, button, td, th")).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && elementVisible(node)
    )
  );

  const healthcareSignals = countHealthcareSignals(bodyText);
  const textBlockCount = textBlocks.length;
  const interactiveCount = interactiveElements.length;
  const complexityScore = clamp(
    interactiveCount * 2.2 +
      navCount * 12 +
      formCount * 9 +
      textBlockCount * 1.5 +
      smallTargetCount * 3 +
      (bodyText.length > 4000 ? 12 : bodyText.length > 1800 ? 8 : 3),
    0,
    100
  );
  const detectedPersona = estimatePersona({
    interactiveCount,
    navCount,
    textBlockCount,
    averageFontSize,
    smallTargetCount,
    healthcareSignals
  });

  const summary = [
    `${interactiveCount} interactive elements`,
    `${smallTargetCount} small click targets`,
    `${navCount} navigation regions`,
    healthcareSignals > 0 ? "healthcare cues present" : "no healthcare cues"
  ].join(" | ");

  return {
    title,
    url,
    interactiveCount,
    smallTargetCount,
    navCount,
    formCount,
    textBlockCount,
    bodyTextLength: bodyText.length,
    averageFontSize,
    healthcareSignals,
    complexityScore: round(complexityScore),
    detectedPersona,
    summary
  };
}

export function buildMetrics(insights: PageInsights, settings: ExtensionSettings): {
  before: MetricsSnapshot;
  after: MetricsSnapshot;
} {
  const beforeReadability = clamp(64 - insights.complexityScore * 0.28 - insights.smallTargetCount * 0.7, 28, 72);
  const afterBoost = settings.persona === "auto" ? 43 : 45;
  const afterReadability = clamp(beforeReadability + afterBoost, 72, 97);
  const beforeTask = clamp(140 + insights.complexityScore * 2.05 + insights.interactiveCount * 1.1, 110, 420);
  const afterTask = clamp(beforeTask - (settings.persona === "patient" ? 145 : 125), 55, beforeTask - 25);

  return {
    before: {
      readability: Math.round(beforeReadability),
      navigationComplexity: complexityLabel(insights.complexityScore),
      estimatedTaskSeconds: Math.round(beforeTask)
    },
    after: {
      readability: Math.round(afterReadability),
      navigationComplexity: insights.complexityScore >= 70 ? "Medium" : "Low",
      estimatedTaskSeconds: Math.round(afterTask)
    }
  };
}

function challengeList(insights: PageInsights, persona: PersonaId): string[] {
  const items: string[] = [];

  if (insights.navCount >= 3) items.push("Dense navigation");
  if (insights.smallTargetCount >= 4) items.push("Small clickable targets");
  if (insights.averageFontSize < 15) items.push("Low readability");
  if (insights.textBlockCount >= 8) items.push("Long content blocks");
  if (insights.interactiveCount >= 20) items.push("Crowded controls");
  if (persona === "patient") items.push("Important care actions are buried");
  if (persona === "firstTime") items.push("Too many paths competing for attention");
  if (persona === "elderly") items.push("Controls feel tightly packed");
  if (persona === "visuallyImpaired") items.push("Insufficient contrast and focus clarity");

  return Array.from(new Set(items)).slice(0, 4);
}

function adaptationList(persona: PersonaId): string[] {
  switch (persona) {
    case "elderly":
      return ["Larger buttons", "Increased font sizes", "Expanded spacing", "Reduced clutter"];
    case "visuallyImpaired":
      return ["High contrast treatment", "Visible focus outlines", "Larger text", "Text-to-speech shortcut"];
    case "firstTime":
      return ["Step-by-step hints", "Contextual tooltips", "Primary action highlighting", "Simplified secondary actions"];
    case "patient":
      return ["Healthcare action prioritization", "Appointment highlighting", "Relevant content emphasis", "Less important content softened"];
    case "auto":
    default:
      return ["Heuristic simplification", "Layout de-cluttering", "Primary action emphasis", "Accessibility boosts"];
  }
}

export function buildAnalysisReport(settings: ExtensionSettings, insights: PageInsights, ai?: AiAnalysisResult): AnalysisReport {
  const persona = settings.persona === "auto" ? insights.detectedPersona : settings.persona;
  const metrics = buildMetrics(insights, settings);
  const aiPersona = ai?.persona && ai.persona !== "auto" ? ai.persona : persona;

  return {
    detectedPersona: aiPersona,
    detectedPersonaLabel: PERSONA_LABELS[aiPersona],
    observedChallenges: ai?.issues.map((item) => item.description).slice(0, 4) ?? challengeList(insights, persona),
    adaptationsApplied: ai?.recommendations.map((item) => item.description).slice(0, 4) ?? adaptationList(persona),
    before: metrics.before,
    after: metrics.after,
    ai
  };
}

export function describeMetricChange(before: MetricsSnapshot, after: MetricsSnapshot): string {
  return `Readability ${before.readability}% -> ${after.readability}%`;
}
