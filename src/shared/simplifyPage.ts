import { getPersonaTransformCss } from "@/shared/personaCss";
import { injectStylesSafely, removeInjectedStyles } from "@/shared/cspSafeStyles";
import type { PersonaId } from "@/shared/types";

export const PERSONA_STYLE_ID = "neuroadapt-persona-css";
const ACTION_BAR_ID = "neuroadapt-action-bar";

const PRIMARY_KEYWORDS = [
  "submit","sign up","signup","get started","book","buy","checkout",
  "continue","next","apply","register","create account","join",
  "log in","login","sign in","download","start free","try free",
  "order","add to cart","confirm","send","save","search","find",
  "proceed","pay","subscribe","enroll","enrol","schedule","request"
];
const CLUTTER_KEYWORDS = [
  "cookie","accept all","dismiss","close panel","skip","no thanks",
  "decline","reject","cancel","maybe later","not now","got it",
  "i agree","allow all","necessary only","close","×","✕"
];

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const s = getComputedStyle(el);
  if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function buttonText(el: Element): string {
  return (
    el.textContent ||
    el.getAttribute("aria-label") ||
    el.getAttribute("value") ||
    el.getAttribute("title") ||
    ""
  ).toLowerCase().trim();
}

function ctaScore(el: Element): number {
  const text = buttonText(el);
  if (!text || text.length > 60) return -10;
  if (CLUTTER_KEYWORDS.some((kw) => text === kw || text.startsWith(kw))) return -100;

  let score = 0;
  if (PRIMARY_KEYWORDS.some((kw) => text.includes(kw))) score += 20;
  if (el.matches('[type="submit"]')) score += 12;
  if (el.matches('[class*="primary"],[class*="cta"],[class*="main-btn"],[class*="hero"],[class*="featured"]')) score += 10;
  if (el.closest("form")) score += 8;
  if (el.closest('main,[role="main"],article,[class*="hero"],[class*="landing"],[class*="banner"]')) score += 6;
  if (el.closest('header,nav,[role="navigation"]')) score -= 5;
  const rect = el.getBoundingClientRect();
  if (rect.width > 120 && rect.height > 36) score += 4;
  return score;
}

function findPrimaryCta(doc: Document): HTMLElement | null {
  const candidates = Array.from(
    doc.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"],a[class*="btn"],a[class*="button"]')
  ).filter((el) => isVisible(el) && !el.closest(`#${ACTION_BAR_ID}`));
  if (!candidates.length) return null;
  const scored = candidates.map((el) => ({ el: el as HTMLElement, s: ctaScore(el) }));
  scored.sort((a, b) => b.s - a.s);
  return scored[0].s > 0 ? scored[0].el : null;
}

function accent(persona: PersonaId) {
  return persona === "elderly"
    ? { bg: "#1d4ed8", bgDark: "#1e40af", text: "#ffffff", nav: "#1e293b", page: "#f8f7f5", secondary: "#dcfce7", secondaryText: "#14532d", border: "#bfdbfe" }
    : { bg: "#059669", bgDark: "#047857", text: "#ffffff", nav: "#166534", page: "#f0fdf4", secondary: "#dcfce7", secondaryText: "#14532d", border: "#a7f3d0" };
}

// ─── Action bar ────────────────────────────────────────────────────────────────
function buildActionBar(doc: Document, persona: PersonaId, ctaEl: HTMLElement | null): HTMLElement {
  doc.getElementById(ACTION_BAR_ID)?.remove();
  const c = accent(persona);
  const bar = doc.createElement("div");
  bar.id = ACTION_BAR_ID;
  bar.setAttribute("data-neuroadapt-ui", "1");
  bar.style.cssText = [
    "all:initial",
    "display:flex",
    "align-items:center",
    "gap:10px",
    "position:fixed",
    "top:0",
    "left:0",
    "right:0",
    "width:100%",
    "z-index:2147483646",
    `background:linear-gradient(135deg,${c.bgDark},${c.bg})`,
    `color:${c.text}`,
    "padding:10px 20px",
    "box-shadow:0 4px 24px rgba(0,0,0,0.3),0 1px 0 rgba(255,255,255,0.1)",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif",
    "box-sizing:border-box",
    "min-height:62px",
  ].join(";");

  const badge = doc.createElement("span");
  badge.style.cssText = `all:initial;display:inline-flex;align-items:center;gap:8px;font-family:inherit;font-size:13px;font-weight:700;color:#fff;white-space:nowrap;background:rgba(0,0,0,0.22);border-radius:24px;padding:6px 14px;letter-spacing:0.01em`;
  badge.innerHTML = `<span style="font-size:17px;all:initial;display:inline">${persona === "elderly" ? "♿" : "🧭"}</span><span style="all:initial;font-family:inherit;font-size:13px;font-weight:700;color:#fff">${persona === "elderly" ? "Accessibility Mode" : "Guided Mode"}</span>`;
  bar.appendChild(badge);

  const spacer = doc.createElement("div");
  spacer.style.cssText = "all:initial;flex:1;display:block";
  bar.appendChild(spacer);

  const hint = doc.createElement("span");
  hint.style.cssText = "all:initial;display:inline;font-family:inherit;font-size:12px;color:rgba(255,255,255,0.75);font-style:italic;margin-right:8px";
  hint.textContent = "Page has been redesigned for easier access";
  bar.appendChild(hint);

  if (ctaEl) {
    const rawText = (ctaEl.textContent || ctaEl.getAttribute("value") || "Main Action").trim().replace(/\s+/g, " ").slice(0, 28);
    const ctaBtn = doc.createElement("button");
    ctaBtn.style.cssText = [
      "all:initial",
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "gap:6px",
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif",
      "font-size:13px",
      "font-weight:800",
      `color:${c.bg}`,
      "background:#ffffff",
      "border:none",
      "border-radius:10px",
      "padding:9px 20px",
      "min-height:40px",
      "cursor:pointer",
      "white-space:nowrap",
      "box-shadow:0 2px 12px rgba(0,0,0,0.18)",
      "flex-shrink:0",
      "letter-spacing:0.01em",
    ].join(";");
    ctaBtn.innerHTML = `<span style="all:initial;display:inline;font-size:14px">↓</span><span style="all:initial;display:inline;font-family:inherit;font-size:13px;font-weight:800;color:${c.bg}"> ${rawText}</span>`;
    ctaBtn.addEventListener("click", () => {
      ctaEl.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => { try { ctaEl.focus(); } catch { /* ignore */ } }, 380);
    });
    bar.appendChild(ctaBtn);
  }

  const closeBtn = doc.createElement("button");
  closeBtn.style.cssText = "all:initial;display:flex;align-items:center;justify-content:center;width:30px;height:30px;background:rgba(255,255,255,0.16);border:none;border-radius:50%;cursor:pointer;color:#fff;font-size:17px;font-weight:700;flex-shrink:0;margin-left:2px";
  closeBtn.textContent = "×";
  closeBtn.title = "Dismiss";
  closeBtn.addEventListener("click", () => {
    bar.remove();
    doc.body.style.removeProperty("padding-top");
  });
  bar.appendChild(closeBtn);

  doc.body.insertBefore(bar, doc.body.firstChild);
  return bar;
}

type Revert = () => void;

// ─── Main structural override with inline !important on all buttons ─────────
function applyDramaticOverrides(doc: Document, persona: PersonaId, ctaEl: HTMLElement | null): Revert[] {
  const reverts: Revert[] = [];
  const c = accent(persona);

  function set(el: HTMLElement, prop: string, val: string) {
    const prev = el.style.getPropertyValue(prop);
    const prevPri = el.style.getPropertyPriority(prop);
    el.style.setProperty(prop, val, "important");
    reverts.push(() => {
      if (prev) el.style.setProperty(prop, prev, prevPri as "important" | "");
      else el.style.removeProperty(prop);
    });
  }

  // ─── html + body ──────────────────────────────────────────────────────────
  set(doc.documentElement, "background-color", c.page);
  set(doc.body, "background-color", c.page);
  set(doc.body, "color", "#1a1814");
  set(doc.body, "font-family", "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif");

  // ─── Common framework root containers: #root #app #__next etc. ────────────
  for (const sel of ["#root","#app","#__next","#main-content","#wrapper","#page","#container"]) {
    const el = doc.querySelector(sel) as HTMLElement | null;
    if (el && el !== doc.body) {
      set(el, "background-color", c.page);
      set(el, "color", "#1a1814");
    }
  }

  // ─── Nav / Header ─────────────────────────────────────────────────────────
  const navEls = Array.from(doc.querySelectorAll("nav,header,[role='navigation'],[class*='navbar'],[class*='topbar'],[class*='top-bar'],[class*='site-header']")).slice(0, 5) as HTMLElement[];
  for (const el of navEls) {
    set(el, "background-color", c.nav);
    set(el, "background-image", `linear-gradient(135deg,${c.nav},${c.bgDark})`);
    set(el, "box-shadow", "0 4px 20px rgba(0,0,0,0.25)");
    // Links inside nav → light text
    for (const a of Array.from(el.querySelectorAll("a,span,[role='menuitem']")).slice(0, 30) as HTMLElement[]) {
      set(a, "color", "rgba(255,255,255,0.9)");
      set(a, "text-decoration", "none");
    }
  }

  // ─── Footer ───────────────────────────────────────────────────────────────
  const footer = doc.querySelector("footer,[role='contentinfo'],[class*='footer']") as HTMLElement | null;
  if (footer) {
    set(footer, "background-color", c.nav);
    set(footer, "color", "rgba(255,255,255,0.85)");
    for (const a of Array.from(footer.querySelectorAll("a")).slice(0, 20) as HTMLElement[]) {
      set(a, "color", "rgba(255,255,255,0.8)");
    }
  }

  // ─── Main content card ────────────────────────────────────────────────────
  const mainEl = doc.querySelector("main,[role='main'],#main,#content,.main-content,[class*='content-wrapper'],[class*='page-content'],[class*='main-wrapper']") as HTMLElement | null;
  if (mainEl) {
    set(mainEl, "background-color", "#ffffff");
    set(mainEl, "border-radius", "16px");
    set(mainEl, "box-shadow", "0 4px 24px rgba(0,0,0,0.08)");
    set(mainEl, "padding", "28px");
    set(mainEl, "margin", "16px auto");
  }

  // ─── Cards / panels ───────────────────────────────────────────────────────
  for (const card of Array.from(doc.querySelectorAll("[class*='card'],[class*='panel'],[class*='tile'],article,section")).slice(0, 20) as HTMLElement[]) {
    if (!card.closest("nav") && !card.closest("header") && !card.closest("footer")) {
      set(card, "background-color", "#ffffff");
      set(card, "border", `1.5px solid ${c.border}`);
      set(card, "border-radius", "12px");
      set(card, "box-shadow", "0 2px 12px rgba(0,0,0,0.06)");
    }
  }

  // ─── Headings: stronger contrast and typography ────────────────────────────
  for (const h of Array.from(doc.querySelectorAll("h1,h2,h3,h4")).slice(0, 30) as HTMLElement[]) {
    if (!h.closest("nav") && !h.closest("header")) {
      set(h, "color", "#0f172a");
      set(h, "letter-spacing", "-0.01em");
    }
  }

  // ─── All visible buttons: proper redesigned styling ───────────────────────
  const allBtns = Array.from(
    doc.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"],a[class*="btn"],a[class*="button"]')
  ).filter((el) => isVisible(el) && !el.closest(`#${ACTION_BAR_ID}`) && !el.closest("[data-neuroadapt-ui]")).slice(0, 60) as HTMLElement[];

  for (const btn of allBtns) {
    if (btn === ctaEl) {
      // Primary CTA — biggest and most visible
      set(btn, "background-color", c.bg);
      set(btn, "background-image", `linear-gradient(135deg,${c.bg},${c.bgDark})`);
      set(btn, "color", "#ffffff");
      set(btn, "border", `2px solid ${c.bgDark}`);
      set(btn, "font-weight", "800");
      set(btn, "font-size", "17px");
      set(btn, "min-height", "58px");
      set(btn, "padding", "14px 36px");
      set(btn, "border-radius", "12px");
      set(btn, "box-shadow", `0 6px 24px ${c.bg}55`);
      set(btn, "cursor", "pointer");
      set(btn, "letter-spacing", "0.01em");
    } else {
      const txt = buttonText(btn);
      const isClutter = CLUTTER_KEYWORDS.some((kw) => txt === kw || txt.startsWith(kw));
      const isDestructive = /delete|remove|cancel|close|reject|decline/.test(txt);

      if (isClutter) {
        // Visually de-emphasize clutter buttons
        set(btn, "opacity", "0.45");
        set(btn, "font-size", "13px");
        set(btn, "min-height", "32px");
        set(btn, "padding", "6px 12px");
      } else if (isDestructive) {
        // Red-ish for destructive actions
        set(btn, "background-color", "#fef2f2");
        set(btn, "color", "#991b1b");
        set(btn, "border", "1.5px solid #fca5a5");
        set(btn, "font-weight", "600");
        set(btn, "min-height", "44px");
        set(btn, "padding", "10px 20px");
        set(btn, "border-radius", "10px");
        set(btn, "cursor", "pointer");
      } else {
        // Standard secondary button
        set(btn, "background-color", c.secondary);
        set(btn, "color", c.secondaryText);
        set(btn, "border", `1.5px solid ${c.border}`);
        set(btn, "font-weight", "600");
        set(btn, "min-height", "48px");
        set(btn, "padding", "11px 22px");
        set(btn, "border-radius", "10px");
        set(btn, "cursor", "pointer");
        set(btn, "font-size", "15px");
      }
    }
  }

  // ─── Form inputs ──────────────────────────────────────────────────────────
  const inputs = Array.from(
    doc.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]),textarea,select')
  ).filter(isVisible).slice(0, 30) as HTMLElement[];
  for (const inp of inputs) {
    set(inp, "min-height", "50px");
    set(inp, "padding", "12px 16px");
    set(inp, "border", `2px solid ${c.border}`);
    set(inp, "border-radius", "10px");
    set(inp, "background-color", "#ffffff");
    set(inp, "font-size", "16px");
    set(inp, "color", "#0f172a");
  }

  // ─── Links in body ────────────────────────────────────────────────────────
  for (const a of Array.from(doc.querySelectorAll("main a,article a,section a,p a")).slice(0, 50) as HTMLElement[]) {
    if (!a.closest("nav") && !a.closest("header")) {
      set(a, "color", c.bg);
      set(a, "text-decoration", "underline");
      set(a, "text-underline-offset", "3px");
    }
  }

  return reverts;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function simplifyPage(doc: Document, persona: PersonaId): () => void {
  // 1. Inject persona CSS (O(1)) — catches framework CSS variables
  const css = getPersonaTransformCss(persona);
  if (css) injectStylesSafely(doc, PERSONA_STYLE_ID, css);

  // 2. Find primary CTA
  const ctaEl = findPrimaryCta(doc);

  // 3. Apply inline overrides on structural + all buttons (fast, bounded)
  const reverts = applyDramaticOverrides(doc, persona, ctaEl);

  // 4. Action bar
  const bar = buildActionBar(doc, persona, ctaEl);
  const barH = bar.getBoundingClientRect().height || 62;
  const prevPT = doc.body.style.paddingTop;
  doc.body.style.setProperty("padding-top", `${barH + 8}px`, "important");

  return () => {
    removeInjectedStyles(doc, PERSONA_STYLE_ID);
    bar.remove();
    doc.body.style.paddingTop = prevPT;
    for (const fn of reverts) fn();
  };
}
