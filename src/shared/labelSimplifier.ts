import { injectStylesSafely } from "@/shared/cspSafeStyles";
import { queryDeepAll } from "@/shared/shadowDom";

export interface SimplifiedLabel {
  original: string;
  simplified: string;
  elementRef: string;
}

const LABEL_HELPER_STYLE_ID = "na-label-helper-styles";

const STATIC_SIMPLIFICATIONS: Record<string, string> = {
  "permanent residential address": "Enter the address where you currently live",
  "correspondence address": "Enter the address where you want to receive mail",
  "father's name": "Your father's full name",
  "mother's name": "Your mother's full name",
  "spouse's name": "Your spouse's full name",
  "date of birth": "Your birth date",
  "place of birth": "Where you were born",
  "residential status": "Where you live (Indian / NRI / etc.)",
  "marital status": "Are you married? (Single / Married / etc.)",
  "annual income": "How much money you earn in a year",
  "occupation": "What job you do",
  "educational qualification": "Your highest level of education",
  "aadhaar number": "Your 12-digit Aadhaar number",
  "mobile number": "Your 10-digit mobile phone number",
  "email address": "Your email (e.g., name@example.com)",
  "confirm password": "Type the same password again",
  "security question": "Choose a question only you know the answer to",
  "captcha": "Type the characters you see in the image",
  "service tax": "A small government tax added to the price",
  "terms and conditions": "The rules you agree to by using this service",
  "privacy policy": "How your information will be used and protected",
  "declaration": "A statement that the information you gave is correct",
  "consent": "Give permission for your data to be used",
  "nominee": "The person who will receive benefits if something happens to you",
  "relationship with nominee": "How you are related to the nominee (e.g., spouse, son)"
};

const COMPLEXITY_PATTERNS = [
  /\b[a-z]*[aeiouy][a-z]*[aeiouy][a-z]*\b.*\b[a-z]{8,}\b/i,  // long multi-syllable words
  /\b(?:pursuant|hereinafter|whereas|thereof|notwithstanding|aforesaid)\b/i
];

export function detectConfusingLabels(doc: Document): SimplifiedLabel[] {
  const results: SimplifiedLabel[] = [];
  const labels = queryDeepAll("label, legend, th, [aria-label], [title]", doc);

  labels.forEach((el) => {
    const text = (el.textContent || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim();
    if (!text || text.length < 5) return;
    const lower = text.toLowerCase();

    const staticMatch = STATIC_SIMPLIFICATIONS[lower] || STATIC_SIMPLIFICATIONS[lower.replace(/\s+/g, " ")];
    if (staticMatch) {
      const ref = el.getAttribute("data-neuroadapt-ref") || "";
      results.push({ original: text, simplified: staticMatch, elementRef: ref });
      return;
    }

    if (COMPLEXITY_PATTERNS.some((p) => p.test(text))) {
      const ref = el.getAttribute("data-neuroadapt-ref") || "";
      results.push({ original: text, simplified: `"${text}" — try to fill in your information here`, elementRef: ref });
    }
  });

  return results.slice(0, 10);
}

export function injectSimplifiedHelper(doc: Document, label: SimplifiedLabel): void {
  const LABEL_HELPER_CLASS = "na-label-helper";
  injectStylesSafely(
    doc,
    LABEL_HELPER_STYLE_ID,
    `
      .${LABEL_HELPER_CLASS} {
        display: block;
        font-size: 12px;
        color: #64748b;
        line-height: 1.4;
        margin-top: 2px;
        font-style: italic;
        pointer-events: none;
      }
    `
  );

  const elements = label.elementRef
    ? queryDeepAll<HTMLElement>(`[data-neuroadapt-ref="${label.elementRef}"]`, doc)
    : [];

  for (const el of elements) {
    try {
      if (el.closest(`.${LABEL_HELPER_CLASS}`)) continue;
      const helper = doc.createElement("small");
      helper.className = LABEL_HELPER_CLASS;
      helper.textContent = label.simplified;
      el.parentNode?.insertBefore(helper, el.nextSibling);
    } catch {
      // Unusual parent structures (e.g. inside SVG/template content) must never throw.
    }
  }
}

export function removeSimplifiedHelpers(doc: Document): void {
  queryDeepAll(".na-label-helper", doc).forEach((el) => {
    try {
      el.remove();
    } catch {
      // ignore
    }
  });
}
