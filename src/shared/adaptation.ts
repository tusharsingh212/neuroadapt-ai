import { PERSONA_GUIDANCE, type ExtensionSettings, type PageInsights, type PersonaId } from "@/shared/types";

export const INTERACTIVE_SELECTOR = [
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

const TRACKED_ATTRS = [
  "data-neuroadapt-target",
  "data-neuroadapt-secondary",
  "data-neuroadapt-primary",
  "data-neuroadapt-hint",
  "data-neuroadapt-tooltip",
  "data-neuroadapt-mutated",
  "data-neuroadapt-inline-style"
];

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

const SECONDARY_KEYWORDS = [
  "settings",
  "advanced",
  "secondary",
  "developer",
  "experiments",
  "privacy policy",
  "terms",
  "feedback",
  "help center"
];

function toTitleCase(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

function highlightKeyword(keyword: string): RegExp {
  return new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
}

function getLabel(element: Element): string {
  if (!(element instanceof HTMLElement)) return "";
  return (
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    element.textContent ||
    element.getAttribute("alt") ||
    ""
  ).trim();
}

function isVisible(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
}

function rememberInlineStyle(element: HTMLElement): void {
  if (!element.hasAttribute("data-neuroadapt-inline-style")) {
    const original = element.getAttribute("style");
    element.setAttribute("data-neuroadapt-inline-style", original ?? "");
  }
}

function applyInlineStyles(element: HTMLElement, styles: Record<string, string>): void {
  rememberInlineStyle(element);
  for (const [property, value] of Object.entries(styles)) {
    element.style.setProperty(property, value, "important");
  }
}

function ensureStyleSheet(doc: Document): HTMLStyleElement {
  const existing = doc.getElementById("neuroadapt-global-styles");
  if (existing instanceof HTMLStyleElement) return existing;

  const style = doc.createElement("style");
  style.id = "neuroadapt-global-styles";
  style.textContent = `
    html.na-enabled {
      scroll-behavior: smooth !important;
    }

    html.na-enabled body {
      transition: filter 220ms ease, font-size 220ms ease, letter-spacing 220ms ease;
    }

    html.na-enabled body * {
      transition: box-shadow 220ms ease, transform 220ms ease, opacity 220ms ease, padding 220ms ease, margin 220ms ease, font-size 220ms ease, line-height 220ms ease;
    }

    html.na-enabled body :focus-visible {
      outline: 3px solid rgba(34, 211, 238, 0.95) !important;
      outline-offset: 3px !important;
    }

    html.na-mode-elderly body {
      font-size: 1.06em !important;
      line-height: 1.65 !important;
      letter-spacing: 0.01em !important;
    }

    html.na-mode-elderly :is(button, [role='button'], a[href], input, select, textarea) {
      min-height: 48px !important;
      padding: 0.9rem 1rem !important;
      border-radius: 16px !important;
      font-size: 1rem !important;
      outline: 2px solid rgba(125, 211, 252, 0.45) !important;
      outline-offset: 2px !important;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08) !important;
    }

    html.na-mode-elderly a[href] {
      text-decoration-thickness: 2px !important;
      text-underline-offset: 3px !important;
    }

    html.na-mode-elderly [data-neuroadapt-secondary='true'] {
      opacity: 0.68 !important;
    }

    html.na-mode-visuallyImpaired body {
      font-size: 1.12em !important;
      filter: contrast(1.08);
    }

    html.na-mode-visuallyImpaired :is(button, [role='button'], a[href], input, select, textarea) {
      min-height: 50px !important;
      min-width: 50px !important;
      border-width: 2px !important;
      box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.16) !important;
    }

    html.na-mode-visuallyImpaired [data-neuroadapt-secondary='true'] {
      opacity: 0.82 !important;
    }

    html.na-mode-firstTime [data-neuroadapt-secondary='true'] {
      opacity: 0.5 !important;
      filter: saturate(0.95);
    }

    html.na-mode-firstTime [data-neuroadapt-hint='true'] {
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.4), 0 16px 30px rgba(2, 6, 23, 0.18) !important;
    }

    html.na-mode-firstTime [data-neuroadapt-primary='true'] {
      outline: 3px solid rgba(16, 185, 129, 0.45) !important;
      outline-offset: 3px !important;
    }

    html.na-mode-patient [data-neuroadapt-primary='true'] {
      box-shadow: 0 0 0 2px rgba(251, 113, 133, 0.35), 0 20px 36px rgba(251, 113, 133, 0.14) !important;
    }

    html.na-mode-patient [data-neuroadapt-secondary='true'] {
      opacity: 0.72 !important;
    }

    html.na-preview-original body {
      filter: none !important;
      font-size: 1em !important;
      letter-spacing: normal !important;
      transform: none !important;
    }
  `;
  doc.head.appendChild(style);
  return style;
}

function cleanupAttrs(doc: Document): void {
  for (const element of Array.from(doc.querySelectorAll<HTMLElement>(TRACKED_ATTRS.map((attr) => `[${attr}]`).join(",")))) {
    const originalStyle = element.getAttribute("data-neuroadapt-inline-style");
    if (originalStyle !== null) {
      if (originalStyle) {
        element.setAttribute("style", originalStyle);
      } else {
        element.removeAttribute("style");
      }
    }

    for (const attr of TRACKED_ATTRS) {
      element.removeAttribute(attr);
    }
  }
}

function updateBodyClasses(doc: Document, settings: ExtensionSettings): void {
  const root = doc.documentElement;
  root.classList.toggle("na-enabled", settings.enabled && settings.comparisonMode === "adapted");
  root.classList.toggle("na-preview-original", settings.comparisonMode === "original");
  root.classList.toggle("na-mode-elderly", settings.enabled && settings.persona === "elderly" && settings.comparisonMode === "adapted");
  root.classList.toggle(
    "na-mode-visuallyImpaired",
    settings.enabled && settings.persona === "visuallyImpaired" && settings.comparisonMode === "adapted"
  );
  root.classList.toggle(
    "na-mode-firstTime",
    settings.enabled && settings.persona === "firstTime" && settings.comparisonMode === "adapted"
  );
  root.classList.toggle("na-mode-patient", settings.enabled && settings.persona === "patient" && settings.comparisonMode === "adapted");
}

function markInteractiveTargets(doc: Document, persona: PersonaId, insights: PageInsights): number {
  const interactive = Array.from(doc.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR)).filter(isVisible);
  const primaryHints = new Set<string>(
    persona === "patient"
      ? HEALTHCARE_KEYWORDS
      : persona === "firstTime"
        ? ["start", "continue", "next", "book", "schedule", "apply", "save", "submit"]
        : persona === "elderly"
          ? ["continue", "help", "support", "save", "submit", "view details"]
          : ["focus", "open", "read", "listen", "contrast", "summary"]
  );

  let count = 0;
  for (const element of interactive) {
    const label = toTitleCase(getLabel(element) || element.tagName.toLowerCase());
    const lower = label.toLowerCase();
    const isPrimary =
      Array.from(primaryHints).some((keyword) => highlightKeyword(keyword).test(lower)) ||
      (persona === "patient" && insights.healthcareSignals > 0 && HEALTHCARE_KEYWORDS.some((keyword) => lower.includes(keyword)));
    const isSecondary = SECONDARY_KEYWORDS.some((keyword) => lower.includes(keyword));
    const isHint = persona === "firstTime" && /next|continue|start|submit|book|save|schedule|apply/i.test(lower) && !isSecondary;

    element.setAttribute("data-neuroadapt-target", "true");
    element.setAttribute("data-neuroadapt-mutated", "true");
    if (isPrimary) element.setAttribute("data-neuroadapt-primary", "true");
    if (isSecondary) element.setAttribute("data-neuroadapt-secondary", "true");
    if (isHint) element.setAttribute("data-neuroadapt-hint", "true");
    if (!element.getAttribute("title") && label) {
      element.setAttribute("data-neuroadapt-tooltip", label);
      element.setAttribute("title", label);
    }

    if (persona === "elderly") {
      applyInlineStyles(element, {
        "min-height": "54px",
        "min-width": "54px",
        padding: "0.95rem 1.1rem",
        "font-size": "1.05rem",
        "line-height": "1.5",
        "border-radius": "18px",
        "font-weight": "700",
        outline: "2px solid rgba(125, 211, 252, 0.45)",
        "outline-offset": "2px",
        "box-shadow": "0 10px 22px rgba(15, 23, 42, 0.08)"
      });
    }

    if (persona === "visuallyImpaired") {
      applyInlineStyles(element, {
        "min-height": "56px",
        "min-width": "56px",
        padding: "1rem 1.15rem",
        "font-size": "1.08rem",
        "border-radius": "18px",
        "font-weight": "700",
        outline: "3px solid rgba(34, 211, 238, 0.3)",
        "outline-offset": "2px",
        "box-shadow": "0 0 0 3px rgba(34, 211, 238, 0.18)"
      });
    }

    if (isPrimary) {
      applyInlineStyles(element, {
        transform: "scale(1.02)"
      });
    }

    if (persona === "firstTime" && isPrimary) {
      applyInlineStyles(element, {
        "font-weight": "700",
        outline: "3px solid rgba(16, 185, 129, 0.5)",
        "outline-offset": "3px",
        "box-shadow": "0 16px 32px rgba(16, 185, 129, 0.16)"
      });
    }

    if (persona === "patient" && isPrimary) {
      applyInlineStyles(element, {
        "font-weight": "700",
        outline: "3px solid rgba(244, 63, 94, 0.35)",
        "outline-offset": "3px",
        "box-shadow": "0 18px 36px rgba(244, 63, 94, 0.16)"
      });
    }

    count += 1;
  }

  return count;
}

function enhanceReadableText(doc: Document, persona: PersonaId): void {
  const textNodes = Array.from(
    doc.querySelectorAll<HTMLElement>("p, li, label, span, td, th, small, strong, em, h1, h2, h3, h4")
  ).filter((element) => isVisible(element) && (element.textContent ?? "").trim().length > 0);

  for (const element of textNodes.slice(0, 220)) {
    if (persona === "elderly") {
      applyInlineStyles(element, {
        "font-size": element.matches("h1, h2, h3, h4") ? "1.2em" : "1.05rem",
        "line-height": "1.75",
        "font-weight": element.matches("h1, h2, h3, h4, strong") ? "800" : "600"
      });
    }

    if (persona === "visuallyImpaired") {
      applyInlineStyles(element, {
        "font-size": element.matches("h1, h2, h3, h4") ? "1.24em" : "1.08rem",
        "line-height": "1.78",
        "font-weight": element.matches("h1, h2, h3, h4, strong") ? "800" : "650"
      });
    }
  }
}

function emphasizePageSections(doc: Document, persona: PersonaId): void {
  const sections = Array.from(doc.querySelectorAll<HTMLElement>("header, nav, aside, main, section, article")).filter(
    isVisible
  );
  for (const section of sections) {
    const label = getLabel(section).toLowerCase();
    if (persona === "patient" && /appointment|patient|health|care|billing|records/.test(label)) {
      section.setAttribute("data-neuroadapt-primary", "true");
    }
    if (persona === "firstTime" && /sidebar|filters|advanced|secondary/.test(label)) {
      section.setAttribute("data-neuroadapt-secondary", "true");
    }

    if (persona === "elderly") {
      applyInlineStyles(section, {
        "border-radius": "20px",
        padding: "0.35rem"
      });
    }

    if (persona === "firstTime" && section.hasAttribute("data-neuroadapt-secondary")) {
      applyInlineStyles(section, {
        opacity: "0.58"
      });
    }
  }
}

export function applyAdaptation(doc: Document, settings: ExtensionSettings, insights: PageInsights): number {
  ensureStyleSheet(doc);
  cleanupAttrs(doc);
  updateBodyClasses(doc, settings);

  if (!settings.enabled || settings.comparisonMode === "original") {
    return 0;
  }

  const persona = settings.persona === "auto" ? insights.detectedPersona : settings.persona;
  const targetCount = markInteractiveTargets(doc, persona, insights);
  enhanceReadableText(doc, persona);
  emphasizePageSections(doc, persona);
  return targetCount;
}

export function resetAdaptation(doc: Document): void {
  cleanupAttrs(doc);
  const root = doc.documentElement;
  root.classList.remove(
    "na-enabled",
    "na-mode-elderly",
    "na-mode-visuallyImpaired",
    "na-mode-firstTime",
    "na-mode-patient",
    "na-preview-original"
  );
}

export function buildAdaptationSummary(settings: ExtensionSettings, insights: PageInsights): string[] {
  const persona = settings.persona === "auto" ? insights.detectedPersona : settings.persona;
  const resolvedPersona: Exclude<PersonaId, "auto"> = persona === "auto" ? "elderly" : persona;
  return PERSONA_GUIDANCE[resolvedPersona];
}
