import { injectStylesSafely } from "@/shared/cspSafeStyles";
import { queryDeepAll } from "@/shared/shadowDom";

export interface SimplifiedLabel {
  original: string;
  simplified: string;
  elementRef: string;
  element?: HTMLElement;
}

const LABEL_HELPER_STYLE_ID = "na-label-helper-styles";
const LABEL_HELPER_CLASS = "na-label-helper";
const WORD_TOOLTIP_CLASS = "na-word-tooltip";

const LABEL_HELPER_CSS = `
  .${LABEL_HELPER_CLASS} {
    display: block;
    font-size: 12px !important;
    color: #4b5563 !important;
    line-height: 1.4 !important;
    margin-top: 4px !important;
    font-style: italic !important;
    background: #f0fdf4 !important;
    border-left: 3px solid #059669 !important;
    padding: 4px 8px !important;
    border-radius: 0 6px 6px 0 !important;
    pointer-events: none !important;
  }

  .${WORD_TOOLTIP_CLASS} {
    position: relative !important;
    display: inline !important;
    border-bottom: 2px dotted #059669 !important;
    cursor: help !important;
  }

  .${WORD_TOOLTIP_CLASS}::after {
    content: attr(data-na-explain) !important;
    position: absolute !important;
    bottom: calc(100% + 6px) !important;
    left: 0 !important;
    min-width: 200px !important;
    max-width: 280px !important;
    background: #0f172a !important;
    color: #f1f5f9 !important;
    font-size: 12px !important;
    font-style: normal !important;
    font-weight: 500 !important;
    line-height: 1.5 !important;
    padding: 8px 12px !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.28) !important;
    z-index: 2147483000 !important;
    opacity: 0 !important;
    pointer-events: none !important;
    transition: opacity 0.18s ease !important;
    white-space: normal !important;
  }

  .${WORD_TOOLTIP_CLASS}:hover::after,
  .${WORD_TOOLTIP_CLASS}:focus::after {
    opacity: 1 !important;
  }
`;

const STATIC_SIMPLIFICATIONS: Record<string, string> = {
  "permanent residential address": "The address where you currently live",
  "correspondence address": "The address where you want to receive mail",
  "father's name": "Your father's full name",
  "mother's name": "Your mother's full name",
  "spouse's name": "Your husband's or wife's full name",
  "date of birth": "Your birthday (day/month/year)",
  "place of birth": "The city or town where you were born",
  "residential status": "Where you live (e.g. India / Abroad)",
  "marital status": "Are you married? (Single / Married / Divorced)",
  "annual income": "How much money you earn in one full year",
  "occupation": "What kind of work or job you do",
  "educational qualification": "Your highest level of school or college completed",
  "aadhaar number": "Your 12-digit Aadhaar ID number",
  "mobile number": "Your 10-digit mobile phone number",
  "email address": "Your email (e.g. name@example.com)",
  "confirm password": "Type the same password again to confirm",
  "security question": "A personal question only you know the answer to",
  "captcha": "Type the letters or numbers shown in the picture",
  "service tax": "A small extra tax added by the government",
  "terms and conditions": "The rules you must agree to before using this service",
  "privacy policy": "How this website uses and protects your personal information",
  "declaration": "A statement confirming that all information you provided is correct",
  "consent": "Your permission for this service to use your data",
  "nominee": "The person who will receive benefits if something happens to you",
  "relationship with nominee": "How you are related to that person (e.g. spouse, child)",
  "pan number": "Your 10-character Permanent Account Number (tax ID)",
  "gstin": "Your Goods and Services Tax Identification Number",
  "ifsc code": "A unique 11-character code that identifies your bank branch",
  "micr code": "A 9-digit number printed on cheques to identify your bank",
  "neft": "A way to transfer money online between banks",
  "rtgs": "A way to transfer large amounts of money instantly between banks",
  "kyc": "Know Your Customer — a process to verify your identity",
  "aadhar": "Your 12-digit Aadhaar ID number (government identity)",
  "demat account": "An electronic account that holds your share certificates",
  "beneficiary": "The person who will receive money or benefits",
  "guarantor": "A person who promises to repay if you cannot",
  "collateral": "Something valuable you offer as security for a loan",
  "interest rate": "The percentage of extra money charged on a loan or paid on savings",
  "emi": "Equal Monthly Installment — a fixed amount you pay each month for a loan",
  "tenure": "The length of time you have to repay a loan",
  "moratorium": "A temporary pause in loan repayments allowed by the bank",
  "disbursement": "When the bank pays out the loan money to you",
  "processing fee": "A one-time charge the bank takes to process your loan",
  "foreclosure": "Paying off your entire loan early before the due date"
};

// Words/phrases in body text that should be explained
const JARGON_WORDS: Record<string, string> = {
  "pursuant": "according to",
  "hereinafter": "from this point on",
  "whereas": "given that / because",
  "thereof": "of that",
  "notwithstanding": "in spite of",
  "aforesaid": "mentioned earlier",
  "indemnify": "protect you from financial loss",
  "liability": "legal responsibility to pay",
  "arbitration": "resolving a dispute outside of court",
  "jurisdiction": "the area where a court has legal authority",
  "intellectual property": "creations like inventions, designs, or written work that are legally owned",
  "fiduciary": "someone who is trusted to act in your best interest",
  "amortization": "paying off a debt in small, regular payments over time",
  "depreciation": "gradual decrease in value over time",
  "equity": "the share of ownership in something (like a house or company)",
  "dividend": "a share of company profits paid to shareholders",
  "leverage": "using borrowed money to invest",
  "liquidity": "how easily something can be turned into cash",
  "solvency": "having enough money to pay all debts",
  "remittance": "sending money to someone, often in another country",
  "encumbrance": "a claim or restriction on a property",
  "lien": "a legal claim on an asset until a debt is paid",
  "hypothecation": "using an asset as loan security without giving up ownership",
  "subrogation": "when an insurer takes over your right to claim after paying you",
  "underwriting": "the process of evaluating risk before providing insurance or loans"
};

function injectStyles(doc: Document) {
  injectStylesSafely(doc, LABEL_HELPER_STYLE_ID, LABEL_HELPER_CSS);
}

export function detectConfusingLabels(doc: Document): SimplifiedLabel[] {
  const results: SimplifiedLabel[] = [];
  const seen = new Set<string>();

  // 1. Form labels and table headers
  const labelEls = queryDeepAll("label, legend, th, [aria-label], [placeholder]", doc) as HTMLElement[];
  for (const el of labelEls) {
    const text = (
      el.textContent ||
      el.getAttribute("aria-label") ||
      el.getAttribute("placeholder") ||
      ""
    ).trim();
    if (!text || text.length < 4 || seen.has(text.toLowerCase())) continue;

    const lower = text.toLowerCase();
    const staticMatch = STATIC_SIMPLIFICATIONS[lower] ?? STATIC_SIMPLIFICATIONS[lower.replace(/\s+/g, " ")];
    if (staticMatch) {
      seen.add(lower);
      results.push({ original: text, simplified: staticMatch, elementRef: "", element: el });
    } else if (text.length > 14 && /[A-Z]{2,}|[^a-z\s]/.test(text)) {
      // Likely an acronym or jargon label
      seen.add(lower);
      results.push({ original: text, simplified: `"${text}" — enter the information requested here`, elementRef: "", element: el });
    }
  }

  return results.slice(0, 12);
}

export function detectJargonInBody(doc: Document): void {
  injectStyles(doc);

  // Only scan within main content areas — not nav, header, footer, sidebar
  const contentRoot =
    doc.querySelector("main,[role='main'],article,#main,#content,.main-content,.article-body,.post-content") as HTMLElement
    ?? doc.body;

  const SKIP_TAGS = new Set(["script","style","input","textarea","select","code","pre","nav","header","footer","aside"]);
  const textNodes: Text[] = [];
  const walker = doc.createTreeWalker(
    contentRoot,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(parent.tagName.toLowerCase())) return NodeFilter.FILTER_REJECT;
        if (parent.closest("nav,header,footer,aside,[data-neuroadapt-ui]")) return NodeFilter.FILTER_REJECT;
        if ((node.textContent?.trim().length ?? 0) < 4) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
    if (textNodes.length > 100) break; // tight bound — main content only
  }

  const jargonPattern = new RegExp(
    `\\b(${Object.keys(JARGON_WORDS).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
    "gi"
  );

  const highlighted = new Set<string>(); // only first occurrence of each word
  let totalHighlights = 0;
  const MAX_HIGHLIGHTS = 8;

  for (const node of textNodes) {
    if (totalHighlights >= MAX_HIGHLIGHTS) break;
    const text = node.textContent || "";
    if (!jargonPattern.test(text)) continue;

    jargonPattern.lastIndex = 0;
    const parent = node.parentElement;
    if (!parent || parent.classList.contains(WORD_TOOLTIP_CLASS)) continue;

    const fragment = doc.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let nodeModified = false;
    jargonPattern.lastIndex = 0;

    while ((match = jargonPattern.exec(text)) !== null) {
      if (totalHighlights >= MAX_HIGHLIGHTS) {
        fragment.appendChild(doc.createTextNode(text.slice(lastIndex)));
        lastIndex = text.length;
        break;
      }
      const wordKey = match[0].toLowerCase();
      if (highlighted.has(wordKey)) {
        // Skip repeated occurrences
        if (match.index > lastIndex) {
          fragment.appendChild(doc.createTextNode(text.slice(lastIndex, match.index + match[0].length)));
        }
        lastIndex = match.index + match[0].length;
        continue;
      }

      if (match.index > lastIndex) {
        fragment.appendChild(doc.createTextNode(text.slice(lastIndex, match.index)));
      }
      const word = match[0];
      const explanation = JARGON_WORDS[wordKey];
      const span = doc.createElement("span");
      span.className = WORD_TOOLTIP_CLASS;
      span.setAttribute("data-na-explain", `💡 ${explanation}`);
      span.setAttribute("tabindex", "0");
      span.textContent = word;
      fragment.appendChild(span);
      highlighted.add(wordKey);
      totalHighlights++;
      lastIndex = match.index + word.length;
      nodeModified = true;
    }

    if (nodeModified) {
      if (lastIndex < text.length) {
        fragment.appendChild(doc.createTextNode(text.slice(lastIndex)));
      }
      try {
        parent.replaceChild(fragment, node);
      } catch {
        // ignore
      }
    }
  }
}

export function injectSimplifiedHelper(doc: Document, label: SimplifiedLabel): void {
  injectStyles(doc);

  // Resolve element: use stored reference first, then fall back to ref attribute, then text match
  let elements: HTMLElement[] = [];

  if (label.element) {
    elements = [label.element];
  } else if (label.elementRef) {
    elements = queryDeepAll<HTMLElement>(`[data-neuroadapt-ref="${label.elementRef}"]`, doc) as HTMLElement[];
  }

  // Last resort: find by matching text content
  if (!elements.length) {
    elements = (queryDeepAll("label,legend,th,[aria-label],[placeholder]", doc) as HTMLElement[]).filter((el) => {
      const text = (el.textContent || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").trim();
      return text.toLowerCase() === label.original.toLowerCase();
    });
  }

  for (const el of elements) {
    try {
      if (el.closest(`.${LABEL_HELPER_CLASS}`)) continue;
      // Don't inject twice
      if (el.nextElementSibling?.classList.contains(LABEL_HELPER_CLASS)) continue;
      const helper = doc.createElement("small");
      helper.className = LABEL_HELPER_CLASS;
      helper.textContent = `💡 ${label.simplified}`;
      el.parentNode?.insertBefore(helper, el.nextSibling);
    } catch {
      // ignore
    }
  }
}

export function removeSimplifiedHelpers(doc: Document): void {
  queryDeepAll(`.${LABEL_HELPER_CLASS}`, doc).forEach((el) => { try { el.remove(); } catch { /* ignore */ } });
  // Unwrap jargon tooltip spans
  for (const span of Array.from(doc.querySelectorAll(`.${WORD_TOOLTIP_CLASS}`))) {
    const parent = span.parentNode;
    if (parent) {
      parent.replaceChild(doc.createTextNode(span.textContent || ""), span);
      parent.normalize();
    }
  }
}
