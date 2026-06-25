import type { PageContext } from "@/shared/pageContext";

const OFFICIAL_TLDS = [
  ".gov.in", ".nic.in", ".gov.uk", ".gov.au", ".gov", ".nhs.uk", ".mil",
  ".edu.in", ".ac.in", ".gov.sg", ".gov.nz", ".gov.ie", ".gov.za"
];

const OFFICIAL_DOMAINS = new Set([
  "uidai.gov.in", "india.gov.in", "incometax.gov.in", "gst.gov.in", "npci.org.in",
  "digilocker.gov.in", "cowin.gov.in", "medicare.gov", "ssa.gov", "irs.gov",
  "usa.gov", "nhp.org.in", "nha.gov.in", "pfms.nic.in", "umang.gov.in",
  "mygov.in", "epfindia.gov.in", "passportindia.gov.in", "ayushman.gov.in",
  "serviceonline.gov.in", "irctc.co.in", "nric.gov.sg", "gov.sg",
  "nhs.uk", "gov.uk", "hmrc.gov.uk", "australia.gov.au", "ato.gov.au"
]);

const SEARCH_URL_PATTERNS = [
  /google\.[a-z.]+\/search/,
  /bing\.com\/search/,
  /duckduckgo\.com\/\?q=/,
  /search\.yahoo\.com\//,
  /yahoo\.com\/search/,
  /ecosia\.org\/search/,
  /startpage\.com\/search/,
  /yandex\.com\/search/,
  /baidu\.com\/s\b/
];

export interface OfficialResult {
  ref: string;
  label: string;
  href: string;
  domain: string;
}

export interface PageClassification {
  pageType: "search" | "form" | "article" | "landing" | "unknown";
  isSearchPage: boolean;
  searchQuery: string | null;
  hasSignificantForm: boolean;
  formFieldCount: number;
  primaryFormLabel: string;
  officialResults: OfficialResult[];
  bestOfficialResult: OfficialResult | null;
  welcomeMessage: string;
  autoScanQuestion: string;
  proactiveLabel: string | null;
  proactiveRef: string | null;
}

export function checkOfficialUrl(url: string): boolean {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    if (OFFICIAL_DOMAINS.has(hostname)) return true;
    return OFFICIAL_TLDS.some((tld) => hostname === tld.slice(1) || hostname.endsWith(tld));
  } catch { return false; }
}

function extractSearchQuery(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get("q") ?? u.searchParams.get("query") ?? u.searchParams.get("p") ?? null;
  } catch { return null; }
}

export function classifyPage(context: PageContext): PageClassification {
  const { summary, elements } = context;
  const url = summary.url ?? "";

  const isSearchPage = SEARCH_URL_PATTERNS.some((p) => p.test(url));
  const searchQuery = isSearchPage ? extractSearchQuery(url) : null;

  const officialResults: OfficialResult[] = [];
  if (isSearchPage) {
    for (const el of elements) {
      if (!el.href) continue;
      if (checkOfficialUrl(el.href)) {
        try {
          const { hostname } = new URL(el.href);
          officialResults.push({ ref: el.ref, label: el.label, href: el.href, domain: hostname });
        } catch { /* skip malformed href */ }
      }
    }
  }
  const bestOfficialResult = officialResults[0] ?? null;

  const hasSignificantForm = summary.forms.some((f) => f.fields.length >= 2);
  const formFieldCount = summary.forms.reduce((n, f) => n + f.fields.length, 0);
  const primaryFormLabel = summary.forms[0]?.label ?? "";

  let pageType: PageClassification["pageType"] = "unknown";
  if (isSearchPage) {
    pageType = "search";
  } else if (hasSignificantForm) {
    pageType = "form";
  } else if (summary.stats.bodyTextLength > 1500) {
    pageType = "article";
  } else if (summary.buttons.length > 3) {
    pageType = "landing";
  }

  let welcomeMessage: string;
  if (isSearchPage && searchQuery && bestOfficialResult) {
    welcomeMessage = `I can see this is a search for "${searchQuery}". I found an official source in the results — let me highlight it for you.`;
  } else if (isSearchPage && searchQuery) {
    welcomeMessage = `I can see this is a search for "${searchQuery}". Let me analyze the results and find the best option.`;
  } else if (isSearchPage) {
    welcomeMessage = `I can see a search results page. Tell me what you're looking for and I'll help you find the right link.`;
  } else if (hasSignificantForm && primaryFormLabel) {
    welcomeMessage = `I can see a form on this page: "${primaryFormLabel}". I can walk you through each field — just ask "Help me fill this form" or type your question below.`;
  } else if (hasSignificantForm) {
    welcomeMessage = `I can see a form on this page with ${formFieldCount} field${formFieldCount !== 1 ? "s" : ""}. I can help you fill it out — just ask.`;
  } else if (pageType === "article") {
    welcomeMessage = `I can see a content page: "${summary.title}". Ask me to summarize it or guide you to the important parts.`;
  } else if (context.persona === "firstTime") {
    welcomeMessage = `Hello! I'm here to help. Tell me what you'd like to do — for example, "Help me apply" or "What is this page for?"`;
  } else {
    welcomeMessage = `Hello! I'm here to help. What would you like to do on this page? You can ask me anything.`;
  }

  let autoScanQuestion: string;
  if (isSearchPage && searchQuery && bestOfficialResult) {
    autoScanQuestion = `This is a search page for "${searchQuery}". I found an official government result (${bestOfficialResult.domain}) in the elements. Confirm this is the safest link to click and explain why in one sentence.`;
  } else if (isSearchPage && searchQuery) {
    autoScanQuestion = `This is a search page for "${searchQuery}". In one sentence, identify the most relevant or trustworthy result and what it offers.`;
  } else if (isSearchPage) {
    autoScanQuestion = `This is a search results page. In one sentence, what are the top results about?`;
  } else if (hasSignificantForm) {
    autoScanQuestion = `This page has a form${primaryFormLabel ? ` named "${primaryFormLabel}"` : ""} with ${formFieldCount} fields. In one sentence, what is this form for and what information will I need to have ready?`;
  } else {
    autoScanQuestion = `In one sentence, what is this page for and what can I do here?`;
  }

  let proactiveLabel: string | null = null;
  let proactiveRef: string | null = null;
  if (bestOfficialResult) {
    proactiveLabel = `Official source found: ${bestOfficialResult.domain}`;
    proactiveRef = bestOfficialResult.ref;
  } else if (hasSignificantForm) {
    const firstField = summary.forms[0]?.fields[0];
    if (firstField) {
      const fieldEl = elements.find((el) =>
        el.tag === "input" || el.tag === "select" || el.tag === "textarea"
      );
      if (fieldEl) {
        proactiveLabel = `Fill out: ${primaryFormLabel || "the form"}`;
        proactiveRef = fieldEl.ref;
      }
    }
  }

  return {
    pageType,
    isSearchPage,
    searchQuery,
    hasSignificantForm,
    formFieldCount,
    primaryFormLabel,
    officialResults,
    bestOfficialResult,
    welcomeMessage,
    autoScanQuestion,
    proactiveLabel,
    proactiveRef
  };
}
