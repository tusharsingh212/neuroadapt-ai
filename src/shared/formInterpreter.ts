import type { FormFieldGuide } from "@/shared/types";
import { getElementSearchRoot, queryDeepAll, queryDeepFirst } from "@/shared/shadowDom";

const COMMON_MISTAKES: Record<string, string> = {
  email: "Make sure you include @ and a domain like .com or .in",
  tel: "Include your area code and local number, digits only",
  date: "Use DD/MM/YYYY format unless it says otherwise",
  password: "Use at least 8 characters with a mix of letters, numbers, and symbols",
  number: "Enter digits only — no commas or spaces"
};

const PLAIN_LABEL_MAP: Record<string, string> = {
  "permanent residential address": "Enter the address where you currently live",
  "correspondence address": "Enter the address where you want to receive mail",
  "father's name": "Enter your father's full name",
  "mother's name": "Enter your mother's full name",
  "date of birth": "Enter your birth date",
  "aadhaar number": "Your 12-digit Aadhaar number",
  "mobile number": "Your 10-digit mobile phone number",
  "confirm password": "Type the same password again to confirm",
  "security code": "The 3-digit code on the back of your card",
  "account number": "Your bank account number — usually 9-18 digits",
  "ifsc code": "An 11-character bank branch code",
  "pan number": "Your 10-character PAN card number (e.g., ABCDE1234F)"
};

const REQUIRED_HINTS = ["*", "required", "mandatory", "must"];

export interface FormAnalysis {
  purpose: string;
  fields: FormFieldExplanation[];
}

export interface FormFieldExplanation extends FormFieldGuide {
  commonMistake?: string;
  plainLabel: string;
}

export function analyzeForm(form: HTMLFormElement): FormAnalysis {
  const action = form.action || "";
  const heading = form.querySelector("h1, h2, h3, legend")?.textContent?.trim() || "";
  const purpose = heading || guessPurpose(action, form);

  const inputs = form.querySelectorAll<HTMLElement>("input:not([type='hidden']), select, textarea");
  const fields: FormFieldExplanation[] = [];

  inputs.forEach((el, i) => {
    const label = getLabelFor(el, i);
    const lower = label.toLowerCase();
    const type = el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase();
    const required = isRequired(el);

    fields.push({
      elementRef: el.getAttribute("data-neuroadapt-ref") || `field-${i}`,
      label,
      explanation: PLAIN_LABEL_MAP[lower] || `Enter your ${lower}`,
      required,
      expectedFormat: type === "email" ? "example@email.com" : type === "tel" ? "+91 1234567890" : undefined,
      commonMistake: COMMON_MISTAKES[type] || undefined,
      plainLabel: PLAIN_LABEL_MAP[lower] || label
    });
  });

  return { purpose, fields };
}

export function explainFormFields(doc: Document): FormAnalysis[] {
  // Forms can live entirely inside an open shadow root (e.g. web-component checkout
  // flows), so discovery needs to traverse the composed tree, not just light DOM.
  const forms = queryDeepAll<HTMLFormElement>("form", doc);
  return forms.slice(0, 5).map(analyzeForm);
}

function getLabelFor(el: HTMLElement, index: number): string {
  const root = getElementSearchRoot(el);
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const label = root.getElementById(labelledBy)?.textContent?.trim();
    if (label) return label;
  }
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    // A label[for] must live in the same root as the element it labels, so scope the
    // lookup to that root rather than the top-level document.
    const forLabel = el.id ? queryDeepFirst<HTMLLabelElement>(`label[for="${el.id}"]`, root) : null;
    if (forLabel?.textContent?.trim()) return forLabel.textContent.trim();
  }
  const parentLabel = el.closest("label");
  if (parentLabel?.textContent?.trim()) return parentLabel.textContent.trim();
  const placeholder = el.getAttribute("placeholder");
  if (placeholder) return placeholder;
  return `Field ${index + 1}`;
}

function isRequired(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    if (el.required) return true;
  }
  if (el.getAttribute("aria-required") === "true") return true;
  const parentText = el.closest("div, fieldset, section, form")?.textContent?.toLowerCase() || "";
  return REQUIRED_HINTS.some((h) => parentText.includes(h));
}

function guessPurpose(action: string, form: HTMLFormElement): string {
  const text = (document.title + " " + (form.querySelector("legend")?.textContent || "")).toLowerCase();
  if (/register|sign.?up|create.?account/i.test(text)) return "Create a new account";
  if (/login|sign.?in/i.test(text)) return "Log in to your account";
  if (/apply|enrol/i.test(text)) return "Submit an application";
  if (/book|schedule|appointment/i.test(text)) return "Book an appointment";
  if (/search/i.test(text)) return "Search the site";
  if (/feedback|contact/i.test(text)) return "Send a message";
  if (/payment|pay|checkout/i.test(text)) return "Make a payment";
  return "Fill in the form";
}
