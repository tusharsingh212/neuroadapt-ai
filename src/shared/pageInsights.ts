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
import { collectSearchRoots, queryDeepAll, type SearchRoot } from "@/shared/shadowDom";

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

function collectTextBlocks(root: Document): HTMLElement[] {
  return queryDeepAll<HTMLElement>("p, li, td, label, article, section", root)
    .filter((node): node is HTMLElement => node instanceof HTMLElement && elementVisible(node))
    .filter((node) => (node.textContent ?? "").trim().length > 40);
}

function estimatePersona({
  averageFontSize,
  smallTargetCount,
  navCount,
  interactiveCount,
  textBlockCount
}: Omit<PageInsights, "title" | "url" | "complexityScore" | "detectedPersona" | "summary" | "formCount" | "bodyTextLength" | "healthcareSignals" | "accessibilityDetail">): PersonaId {
  if (navCount >= 3 && interactiveCount >= 18 && textBlockCount >= 6) return "firstTime";
  return "elderly";
}

function computeNavDepth(root: Document): number {
  let maxDepth = 0;
  queryDeepAll("nav, [role='navigation']", root).forEach((nav) => {
    const items = nav.querySelectorAll("a, button, [role='link'], [role='button']");
    items.forEach((item) => {
      let depth = 0;
      let parent = item.parentElement;
      while (parent && parent !== nav) {
        if (parent.matches("li, ul, ol, div")) depth++;
        parent = parent.parentElement;
      }
      if (depth > maxDepth) maxDepth = depth;
    });
  });
  return maxDepth;
}

function countMissingLabels(root: Document): number {
  const inputs = queryDeepAll<HTMLElement>("input:not([type='hidden']):not([type='submit']):not([type='button']), select, textarea", root);
  let missing = 0;
  inputs.forEach((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      if (!el.labels?.length && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby")) {
        missing++;
      }
    }
  });
  return missing;
}

function countAmbiguousButtons(root: Document): number {
  const buttons = queryDeepAll<HTMLElement>("button, [role='button']", root);
  let ambiguous = 0;
  buttons.forEach((btn) => {
    const text = (btn.textContent ?? "").trim().toLowerCase();
    if (!text || text.length < 3 || /^[\s•*\-—–]+$/.test(text)) {
      ambiguous++;
    }
  });
  return ambiguous;
}

function isExcessiveScroll(root: Document): boolean {
  return root.body?.scrollHeight ? root.body.scrollHeight > window.innerHeight * 4 : false;
}

function computeDenseLayout(root: Document): number {
  const els = queryDeepAll<HTMLElement>("button, a, input, select, [role='button'], [role='link']", root);
  let crowded = 0;
  const visibleEls = Array.from(els).filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  for (let i = 0; i < visibleEls.length && i < 50; i++) {
    const r1 = visibleEls[i].getBoundingClientRect();
    for (let j = i + 1; j < visibleEls.length && j < 50; j++) {
      const r2 = visibleEls[j].getBoundingClientRect();
      const overlap = !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
      if (overlap) crowded++;
    }
  }
  return Math.round((crowded / Math.max(1, visibleEls.length)) * 10);
}

export function inspectPage(root: Document = document): PageInsights {
  // Discover shadow roots once and reuse the list across the several selector queries
  // below, rather than re-walking the composed tree for each one.
  const searchRoots: SearchRoot[] = collectSearchRoots(root);
  const queryAll = <E extends Element = Element>(selector: string): E[] => {
    const results: E[] = [];
    for (const r of searchRoots) {
      try {
        results.push(...Array.from(r.querySelectorAll<E>(selector)));
      } catch {
        // ignore inaccessible/invalid roots
      }
    }
    return results;
  };

  const title = root.title || "Untitled Page";
  const url = root.location?.href ?? "";
  const interactiveElements = queryAll(INTERACTIVE_SELECTOR).filter((element) => elementVisible(element));
  const textBlocks = collectTextBlocks(root);
  const bodyText = (root.body?.innerText ?? root.body?.textContent ?? "").trim();
  const navCount = queryAll("nav, header nav, aside nav").length;
  const formCount = queryAll("form").length;
  const smallTargetCount = interactiveElements.filter((element) => {
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
  }).length;

  const averageFontSize = measureAverageFontSize(
    queryAll<HTMLElement>("p, li, label, span, a, button, td, th").filter(
      (node): node is HTMLElement => node instanceof HTMLElement && elementVisible(node)
    )
  );

  const healthcareSignals = 0;
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
    smallTargetCount
  });

  const summary = [
    `${interactiveCount} interactive elements`,
    `${smallTargetCount} small click targets`,
    `${navCount} navigation regions`
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
    summary,
    accessibilityDetail: {
      tinyClickTargets: smallTargetCount,
      denseLayoutScore: computeDenseLayout(root),
      navTreeDepth: computeNavDepth(root),
      longForms: formCount,
      missingLabels: countMissingLabels(root),
      ambiguousButtons: countAmbiguousButtons(root),
      excessiveScroll: isExcessiveScroll(root),
      headingGaps: []
    }
  };
}

export function buildMetrics(insights: PageInsights, settings: ExtensionSettings): {
  before: MetricsSnapshot;
  after: MetricsSnapshot;
} {
  const beforeReadability = clamp(64 - insights.complexityScore * 0.28 - insights.smallTargetCount * 0.7, 28, 72);
  const afterBoost = 45;
  const afterReadability = clamp(beforeReadability + afterBoost, 72, 97);
  const beforeTask = clamp(140 + insights.complexityScore * 2.05 + insights.interactiveCount * 1.1, 110, 420);
  const afterTask = clamp(beforeTask - 125, 55, beforeTask - 25);

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
  if (persona === "firstTime") items.push("Too many paths competing for attention");
  if (persona === "elderly") items.push("Controls feel tightly packed");

  return Array.from(new Set(items)).slice(0, 4);
}

function adaptationList(persona: PersonaId): string[] {
  switch (persona) {
    case "elderly":
      return ["Larger buttons", "Increased font sizes", "Expanded spacing", "Reduced clutter"];
    case "firstTime":
      return ["Step-by-step hints", "Contextual tooltips", "Primary action highlighting", "Simplified secondary actions"];
  }
}

export function buildAnalysisReport(settings: ExtensionSettings, insights: PageInsights, ai?: AiAnalysisResult): AnalysisReport {
  const persona = settings.persona;
  const metrics = buildMetrics(insights, settings);
  const aiPersona = ai?.persona ?? persona;

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
