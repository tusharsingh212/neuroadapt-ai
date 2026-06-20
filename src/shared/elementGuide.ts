import { findElementByRef } from "@/shared/pageContext";
import type { ChecklistItem, FormFieldGuide, DomAction, HighlightCandidate } from "@/shared/types";
import { highlightElement as engineHighlight, clearHighlight as engineClear, resolveVisualTarget } from "@/shared/highlightEngine";
import { injectStylesSafely, injectStylesForNode, removeInjectedStyles } from "@/shared/cspSafeStyles";
import { queryDeepAll } from "@/shared/shadowDom";

const GUIDE_ATTRS = [
  "data-neuroadapt-guided",
  "data-neuroadapt-guide-tooltip",
  "data-neuroadapt-guide-label"
];

const GUIDE_STYLE_ID = "neuroadapt-guide-styles";
const DYNAMIC_CSS_STYLE_ID = "neuroadapt-dynamic-css";

const GUIDE_CSS = `
    @keyframes na-guide-pulse {
      0%, 100% { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.45), 0 0 24px rgba(16, 185, 129, 0.35); }
      50% { box-shadow: 0 0 0 8px rgba(56, 189, 248, 0.35), 0 0 32px rgba(56, 189, 248, 0.4); }
    }

    [data-neuroadapt-guided="true"] {
      position: relative !important;
      z-index: 2147483645 !important;
      outline: 3px solid rgba(16, 185, 129, 0.85) !important;
      outline-offset: 4px !important;
      animation: na-guide-pulse 2s ease-in-out infinite !important;
      scroll-margin: 80px !important;
    }

    [data-neuroadapt-guided="true"]::before {
      content: attr(data-neuroadapt-guide-tooltip);
      position: absolute !important;
      z-index: 2147483646 !important;
      left: 50% !important;
      bottom: calc(100% + 12px) !important;
      transform: translateX(-50%) !important;
      max-width: min(300px, 85vw) !important;
      padding: 10px 14px !important;
      border-radius: 14px !important;
      background: linear-gradient(135deg, #064e3b, #0e7490) !important;
      color: #ecfdf5 !important;
      font: 700 13px/1.4 Arial, sans-serif !important;
      box-shadow: 0 16px 40px rgba(2, 6, 23, 0.35) !important;
      pointer-events: none !important;
      white-space: normal !important;
      text-align: center !important;
    }

    [data-neuroadapt-field-guided="true"] {
      outline: 2px solid rgba(56, 189, 248, 0.7) !important;
      outline-offset: 2px !important;
      background-color: rgba(236, 253, 245, 0.15) !important;
    }
  `;

function ensureGuideStyles(doc: Document): void {
  injectStylesSafely(doc, GUIDE_STYLE_ID, GUIDE_CSS);
}

/** Also adopts the guide stylesheet into the element's own shadow root (if any), so the
 * attribute-selector rules above apply even when the guided element lives inside a
 * shadow tree (shadow roots don't inherit a document's adopted/`<style>` rules). */
function ensureGuideStylesForNode(node: Node): void {
  injectStylesForNode(node, GUIDE_STYLE_ID, GUIDE_CSS);
}

export function clearGuidanceHighlights(doc: Document = document): void {
  for (const element of queryDeepAll<HTMLElement>("[data-neuroadapt-guided], [data-neuroadapt-field-guided]", doc)) {
    for (const attr of GUIDE_ATTRS) {
      element.removeAttribute(attr);
    }
    element.removeAttribute("data-neuroadapt-field-guided");
  }
}

export function highlightElement(
  doc: Document,
  ref: string | undefined,
  tooltip = "Click here to continue.",
  candidates?: HighlightCandidate[]
): HTMLElement | null {
  clearGuidanceHighlights(doc);
  engineClear();
  if (!ref) return null;

  ensureGuideStyles(doc);
  const element = findElementByRef(doc, ref);
  if (!element) return null;

  engineHighlight(element, tooltip, candidates);
  ensureGuideStylesForNode(element);
  const visualTarget = resolveVisualTarget(element);
  try {
    visualTarget.setAttribute("data-neuroadapt-guided", "true");
    visualTarget.setAttribute("data-neuroadapt-guide-tooltip", tooltip);
  } catch {
    // ignore - exotic element without attribute support
  }
  try {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch {
    // ignore
  }
  return element;
}

export function highlightFormFields(doc: Document, fields: FormFieldGuide[]): void {
  ensureGuideStyles(doc);
  for (const field of fields) {
    if (!field.elementRef) continue;
    const element = findElementByRef(doc, field.elementRef);
    if (!element) continue;
    ensureGuideStylesForNode(element);
    const visualTarget = resolveVisualTarget(element);
    visualTarget.setAttribute("data-neuroadapt-field-guided", "true");
    if (!element.getAttribute("title")) {
      const hint = field.required
        ? `${field.label} (required): ${field.explanation}`
        : `${field.label}: ${field.explanation}`;
      element.setAttribute("title", hint.slice(0, 200));
    }
  }
}

export function applyGuidanceFromResponse(
  doc: Document,
  highlightRef?: string,
  tooltip?: string,
  formFields?: FormFieldGuide[],
  customCss?: string,
  domActions?: DomAction[],
  candidates?: HighlightCandidate[]
): void {
  engineClear();
  highlightElement(doc, highlightRef, tooltip ?? "Click here to continue.", candidates);
  if (formFields?.length) {
    highlightFormFields(doc, formFields);
  }
  if (customCss || domActions?.length) {
    applyDomActions(doc, domActions ?? [], customCss);
  }
}

export function resetDomActions(doc: Document): void {
  removeInjectedStyles(doc, DYNAMIC_CSS_STYLE_ID);

  const mutated = queryDeepAll<HTMLElement>("[data-na-original-parent]", doc);
  mutated.forEach(el => {
    // Basic restore (not fully comprehensive, but good enough for demo)
    const display = el.getAttribute("data-na-original-display");
    if (display) {
      el.style.display = display === "null" ? "" : display;
    }
  });
}

export function applyDomActions(doc: Document, actions: DomAction[], customCss?: string): void {
  resetDomActions(doc);

  if (customCss) {
    injectStylesSafely(doc, DYNAMIC_CSS_STYLE_ID, customCss);
  }

  for (const action of actions) {
    try {
    const el = findElementByRef(doc, action.elementRef);
    if (!el) continue;

    switch (action.action) {
      case "hide":
        el.setAttribute("data-na-original-display", el.style.display || "null");
        el.style.display = "none";
        break;
      case "style":
        if (action.cssStyles) {
          for (const [prop, val] of Object.entries(action.cssStyles)) {
            el.style.setProperty(prop, val, "important");
          }
        }
        break;
      case "addClass":
        if (action.classes) {
          el.classList.add(...action.classes);
        }
        break;
      case "changeText":
        if (action.text) {
          el.textContent = action.text;
        }
        break;
      case "move":
        if (action.targetRef) {
          const target = findElementByRef(doc, action.targetRef);
          if (target && target.parentNode) {
            el.setAttribute("data-na-original-parent", "true");
            if (action.position === "before") target.parentNode.insertBefore(el, target);
            else if (action.position === "after") target.parentNode.insertBefore(el, target.nextSibling);
            else if (action.position === "inside-start") target.prepend(el);
            else target.appendChild(el);
          }
        }
        break;
    }
    } catch {
      // A single malformed/AI-provided action must never abort the rest of the batch.
    }
  }
}

export function mergeChecklistProgress(
  previous: ChecklistItem[],
  next: ChecklistItem[]
): ChecklistItem[] {
  if (next.length === 0) return previous;
  if (previous.length === 0) return next;

  const completedIds = new Set(previous.filter((item) => item.status === "completed").map((item) => item.id));
  return next.map((item, index) => {
    if (completedIds.has(item.id)) {
      return { ...item, status: "completed" as const };
    }
    const prev = previous.find((p) => p.id === item.id);
    if (prev?.status === "completed") {
      return { ...item, status: "completed" };
    }
    const activeIndex = next.findIndex((i) => i.status === "active");
    if (activeIndex === -1 && index === 0 && item.status === "pending") {
      return { ...item, status: "active" as const };
    }
    return item;
  });
}

export function advanceChecklistOnInteraction(checklist: ChecklistItem[]): ChecklistItem[] {
  const activeIndex = checklist.findIndex((item) => item.status === "active");
  if (activeIndex === -1) {
    const firstPending = checklist.findIndex((item) => item.status === "pending");
    if (firstPending === -1) return checklist;
    return checklist.map((item, index) => ({
      ...item,
      status: index < firstPending ? "completed" : index === firstPending ? "active" : "pending"
    }));
  }

  return checklist.map((item, index) => {
    if (index < activeIndex) return { ...item, status: "completed" as const };
    if (index === activeIndex) return { ...item, status: "completed" as const };
    if (index === activeIndex + 1) return { ...item, status: "active" as const };
    return item;
  });
}
