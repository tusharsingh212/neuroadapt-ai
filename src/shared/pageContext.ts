import { extractPageSummary } from "@/shared/pageSummary";
import type { ExtractedElement, PageSummary, PersonaId } from "@/shared/types";
import { queryDeepAll, queryDeepFirst } from "@/shared/shadowDom";

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

const SENSITIVE_INPUT_TYPES = new Set(["password", "hidden"]);
const SENSITIVE_NAME_PATTERN = /password|passwd|ssn|social.?security|aadhaar|pan.?card|credit.?card|cvv|otp|pin|secret|token/i;

export interface ContextElement extends ExtractedElement {
  ref: string;
  required?: boolean;
  ariaDescribedBy?: string;
  nearbyText?: string;
  sanitized?: boolean;
}

export interface PageContext {
  summary: PageSummary;
  elements: ContextElement[];
  persona: PersonaId;
}

function clampText(value: string, max = 180): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function visible(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
}

function labelFor(element: Element, root: Document): string {
  if (!(element instanceof HTMLElement)) return "";
  const labelledBy = element.getAttribute("aria-labelledby");
  const labelledByText = labelledBy
    ?.split(/\s+/)
    .map((id) => root.getElementById(id)?.textContent ?? "")
    .join(" ");

  const forLabel =
    element.id &&
    (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)
      ? queryDeepFirst<HTMLLabelElement>(`label[for="${element.id}"]`, root)?.textContent
      : null;

  return clampText(
    labelledByText ||
      element.getAttribute("aria-label") ||
      forLabel ||
      element.getAttribute("title") ||
      element.getAttribute("placeholder") ||
      element.textContent ||
      element.getAttribute("alt") ||
      element.getAttribute("name") ||
      element.tagName.toLowerCase()
  );
}

function nearbyText(element: HTMLElement, root: Document): string {
  const parent = element.closest("fieldset, section, form, div, li, td");
  if (!parent) return "";
  const clone = parent.cloneNode(true) as HTMLElement;
  for (const node of clone.querySelectorAll("script, style, input, select, textarea, button")) {
    node.remove();
  }
  return clampText(clone.textContent ?? "", 220);
}

function isSensitiveField(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement) {
    if (SENSITIVE_INPUT_TYPES.has(element.type)) return true;
    const name = `${element.name} ${element.id} ${element.getAttribute("aria-label") ?? ""} ${element.placeholder}`;
    if (SENSITIVE_NAME_PATTERN.test(name)) return true;
  }
  return false;
}

function isRequired(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
    return element.required || element.getAttribute("aria-required") === "true";
  }
  return element.getAttribute("aria-required") === "true";
}

function extractContextElement(element: HTMLElement, index: number, root: Document): ContextElement {
  const ref = `na-el-${index}`;
  element.setAttribute("data-neuroadapt-ref", ref);

  const sensitive = isSensitiveField(element);
  const describedBy = element.getAttribute("aria-describedby");
  const ariaDescribedBy = describedBy
    ?.split(/\s+/)
    .map((id) => root.getElementById(id)?.textContent ?? "")
    .join(" ");

  return {
    ref,
    label: sensitive ? "[Protected field — do not read value]" : labelFor(element, root),
    role: element.getAttribute("role") || element.tagName.toLowerCase(),
    tag: element.tagName.toLowerCase(),
    href: element instanceof HTMLAnchorElement && !sensitive ? element.href.slice(0, 180) : undefined,
    type: element instanceof HTMLInputElement ? element.type : undefined,
    required: isRequired(element),
    ariaDescribedBy: ariaDescribedBy ? clampText(ariaDescribedBy, 160) : undefined,
    nearbyText: sensitive ? undefined : nearbyText(element, root),
    sanitized: sensitive
  };
}

export function getActiveContextElement(root: Document = document): ContextElement | null {
  const active = root.activeElement;
  if (!active || !(active instanceof HTMLElement)) return null;
  const existingRef = active.getAttribute("data-neuroadapt-ref");
  if (existingRef) {
    return {
      ...extractContextElement(active, -1, root),
      ref: existingRef
    };
  }
  return extractContextElement(active, 0, root);
}

export function extractPageContext(root: Document = document, persona: PersonaId = "auto"): PageContext {
  const summary = extractPageSummary(root);

  const interactive = queryDeepAll<HTMLElement>(INTERACTIVE_SELECTOR, root).filter(visible).slice(0, 120);
  const elements = interactive.map((element, index) => extractContextElement(element, index, root));

  return { summary, elements, persona };
}

export function compactPageContext(context: PageContext): string {
  return JSON.stringify({
    title: context.summary.title,
    url: context.summary.url,
    language: context.summary.language,
    description: context.summary.description,
    persona: context.persona,
    headings: context.summary.headings,
    navigation: context.summary.navigation.slice(0, 30),
    buttons: context.summary.buttons.slice(0, 40),
    forms: context.summary.forms.map((form) => ({
      label: form.label,
      fields: form.fields.map((field) => ({
        label: field.label,
        type: field.type,
        role: field.role
      })),
      buttons: form.buttons.map((btn) => btn.label)
    })),
    elements: context.elements.map((el) => ({
      ref: el.ref,
      label: el.label,
      role: el.role,
      tag: el.tag,
      type: el.type,
      required: el.required,
      ariaDescribedBy: el.ariaDescribedBy,
      nearbyText: el.nearbyText
    })),
    stats: context.summary.stats
  });
}

export function findElementByRef(root: Document, ref: string): HTMLElement | null {
  const element = queryDeepFirst<HTMLElement>(`[data-neuroadapt-ref="${ref}"]`, root);
  return element && visible(element) ? element : null;
}
