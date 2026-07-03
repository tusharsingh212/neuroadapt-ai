import type { OverlayMode, OverlaySettings } from "@/shared/types";
<<<<<<< HEAD
import { removeSimplifiedHelpers, detectConfusingLabels, injectSimplifiedHelper, detectJargonInBody } from "@/shared/labelSimplifier";
=======
import { removeSimplifiedHelpers, detectConfusingLabels, injectSimplifiedHelper } from "@/shared/labelSimplifier";
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
import { injectStylesSafely, removeInjectedStyles } from "@/shared/cspSafeStyles";

const STORAGE_KEY = "na-overlay-settings";
const OVERLAY_STYLE_ID = "na-overlay-styles";

const OVERLAY_CSS: Record<OverlayMode, string> = {
  focusMode: `
<<<<<<< HEAD
    html.na-overlay-focusMode body > *:not(#neuroadapt-host):not(#neuroadapt-action-bar) { opacity: 0.12 !important; pointer-events: none !important; transition: opacity 0.2s !important; }
    html.na-overlay-focusMode main, html.na-overlay-focusMode [role="main"], html.na-overlay-focusMode article, html.na-overlay-focusMode form { opacity: 1 !important; pointer-events: auto !important; }
    html.na-overlay-focusMode [data-neuroadapt-guided] { opacity: 1 !important; pointer-events: auto !important; }
  `,

  readingMode: `
    /* Hide everything that isn't main content */
    html.na-overlay-readingMode header,
    html.na-overlay-readingMode footer,
    html.na-overlay-readingMode nav,
    html.na-overlay-readingMode aside,
    html.na-overlay-readingMode [role="navigation"],
    html.na-overlay-readingMode [role="banner"],
    html.na-overlay-readingMode [role="contentinfo"],
    html.na-overlay-readingMode [role="complementary"],
    html.na-overlay-readingMode [class*="sidebar"],
    html.na-overlay-readingMode [class*="side-bar"],
    html.na-overlay-readingMode [class*="widget"],
    html.na-overlay-readingMode [class*="related"],
    html.na-overlay-readingMode [class*="recommend"],
    html.na-overlay-readingMode [class*="social"],
    html.na-overlay-readingMode [class*="share"],
    html.na-overlay-readingMode [class*="comment"],
    html.na-overlay-readingMode [class*="newsletter"],
    html.na-overlay-readingMode [class*="subscribe"],
    html.na-overlay-readingMode [class*="ad-"],
    html.na-overlay-readingMode [class*="-ad-"],
    html.na-overlay-readingMode [id*="sidebar"],
    html.na-overlay-readingMode [id*="widget"],
    html.na-overlay-readingMode [id*="related"],
    html.na-overlay-readingMode [id*="ad-"],
    html.na-overlay-readingMode iframe,
    html.na-overlay-readingMode [class*="popup"],
    html.na-overlay-readingMode [class*="banner"]:not([role="alert"]),
    html.na-overlay-readingMode [class*="promo"] {
      display: none !important;
    }
    /* Clean reading canvas */
    html.na-overlay-readingMode,
    html.na-overlay-readingMode body {
      background: #faf9f7 !important;
      max-width: none !important;
    }
    /* Elevate main content */
    html.na-overlay-readingMode main,
    html.na-overlay-readingMode [role="main"],
    html.na-overlay-readingMode article,
    html.na-overlay-readingMode #main,
    html.na-overlay-readingMode #content,
    html.na-overlay-readingMode .main-content,
    html.na-overlay-readingMode .post-content,
    html.na-overlay-readingMode .article-body,
    html.na-overlay-readingMode .entry-content {
      display: block !important;
      max-width: 680px !important;
      width: 100% !important;
      margin: 32px auto !important;
      padding: 36px 40px !important;
      background: #ffffff !important;
      border-radius: 16px !important;
      box-shadow: 0 2px 20px rgba(0,0,0,0.07) !important;
      font-size: 19px !important;
      line-height: 1.85 !important;
      color: #1a1814 !important;
      float: none !important;
    }
    html.na-overlay-readingMode p { margin-bottom: 1.2em !important; font-size: 19px !important; line-height: 1.85 !important; }
    html.na-overlay-readingMode h1,
    html.na-overlay-readingMode h2,
    html.na-overlay-readingMode h3 { margin-top: 1.4em !important; margin-bottom: 0.6em !important; color: #0f172a !important; }
    html.na-overlay-readingMode img { max-width: 100% !important; border-radius: 8px !important; margin: 16px 0 !important; }
  `,

  reducedClutter: `
    html.na-overlay-reducedClutter aside,
    html.na-overlay-reducedClutter [role="complementary"],
    html.na-overlay-reducedClutter [class*="sidebar"],
    html.na-overlay-reducedClutter [class*="side-bar"],
    html.na-overlay-reducedClutter [class*="widget"],
    html.na-overlay-reducedClutter [class*="related"],
    html.na-overlay-reducedClutter [class*="social"],
    html.na-overlay-reducedClutter [class*="share-bar"],
    html.na-overlay-reducedClutter [class*="newsletter"],
    html.na-overlay-reducedClutter [class*="subscribe"],
    html.na-overlay-reducedClutter [class*="ad-"],
    html.na-overlay-reducedClutter [id*="ad-"],
    html.na-overlay-reducedClutter iframe:not([class*="video"]):not([class*="youtube"]),
    html.na-overlay-reducedClutter [data-neuroadapt-secondary="true"] { display: none !important; }
    html.na-overlay-reducedClutter main,
    html.na-overlay-reducedClutter [role="main"],
    html.na-overlay-reducedClutter article { max-width: 800px !important; margin-left: auto !important; margin-right: auto !important; }
  `,

  largeTargets: `
    html.na-overlay-largeTargets button,
    html.na-overlay-largeTargets a[href],
    html.na-overlay-largeTargets input,
    html.na-overlay-largeTargets select,
    html.na-overlay-largeTargets textarea,
    html.na-overlay-largeTargets [role="button"] {
      min-height: 52px !important; padding: 12px 18px !important; font-size: 1rem !important;
    }
  `,

  highContrast: `
    html.na-overlay-highContrast,
    html.na-overlay-highContrast body { background: #0a0a0a !important; color: #f5f5f5 !important; }
    html.na-overlay-highContrast p, html.na-overlay-highContrast li, html.na-overlay-highContrast td { color: #f5f5f5 !important; }
    html.na-overlay-highContrast a { color: #60c4fa !important; text-decoration: underline !important; }
    html.na-overlay-highContrast button, html.na-overlay-highContrast [role="button"] { background: #1a1a1a !important; color: #fff !important; border: 2px solid #666 !important; }
    html.na-overlay-highContrast input, html.na-overlay-highContrast select, html.na-overlay-highContrast textarea { background: #111 !important; color: #fff !important; border: 2px solid #888 !important; }
    html.na-overlay-highContrast img { filter: brightness(0.85) contrast(1.2) !important; }
    html.na-overlay-highContrast [class*="card"],[class*="panel"] { background: #1a1a1a !important; border-color: #444 !important; }
  `,

  dyslexiaSpacing: `
    html.na-overlay-dyslexiaSpacing body { line-height: 1.9 !important; letter-spacing: 0.06em !important; word-spacing: 0.14em !important; }
    html.na-overlay-dyslexiaSpacing p, html.na-overlay-dyslexiaSpacing li { font-size: 1.1rem !important; line-height: 1.9 !important; margin-bottom: 1em !important; }
    html.na-overlay-dyslexiaSpacing h1, html.na-overlay-dyslexiaSpacing h2, html.na-overlay-dyslexiaSpacing h3 { letter-spacing: 0.02em !important; line-height: 1.4 !important; }
  `,

  simplifiedLabels: `/* handled by labelSimplifier.ts */`
=======
    html.na-overlay-focusMode body > :not(main, article, form, [role="main"]) { opacity: 0.15 !important; pointer-events: none !important; }
    html.na-overlay-focusMode [data-neuroadapt-guided] { opacity: 1 !important; pointer-events: auto !important; }
  `,
  readingMode: `
    html.na-overlay-readingMode body { max-width: 720px !important; margin: 0 auto !important; }
    html.na-overlay-readingMode aside, html.na-overlay-readingMode nav, html.na-overlay-readingMode iframe,
    html.na-overlay-readingMode .ad, html.na-overlay-readingMode [class*="ad-"], html.na-overlay-readingMode [id*="ad-"] { display: none !important; }
  `,
  reducedClutter: `
    html.na-overlay-reducedClutter aside, html.na-overlay-reducedClutter [role="complementary"],
    html.na-overlay-reducedClutter .sidebar, html.na-overlay-reducedClutter iframe,
    html.na-overlay-reducedClutter [data-neuroadapt-secondary="true"] { display: none !important; }
  `,
  largeTargets: `
    html.na-overlay-largeTargets button, html.na-overlay-largeTargets a[href],
    html.na-overlay-largeTargets input, html.na-overlay-largeTargets select,
    html.na-overlay-largeTargets textarea, html.na-overlay-largeTargets [role="button"] {
      min-height: 56px !important; min-width: 56px !important; padding: 14px 18px !important; font-size: 1.05rem !important;
    }
  `,
  highContrast: `
    html.na-overlay-highContrast, html.na-overlay-highContrast body {
      background: #000 !important; color: #fff !important;
    }
    html.na-overlay-highContrast a { color: #60a5fa !important; }
    html.na-overlay-highContrast button, html.na-overlay-highContrast input, html.na-overlay-highContrast select { background: #111 !important; color: #fff !important; border-color: #444 !important; }
    html.na-overlay-highContrast img, html.na-overlay-highContrast video { filter: grayscale(100%) contrast(1.3) !important; }
  `,
  dyslexiaSpacing: `
    html.na-overlay-dyslexiaSpacing body {
      line-height: 1.8 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important;
    }
    html.na-overlay-dyslexiaSpacing p, html.na-overlay-dyslexiaSpacing li, html.na-overlay-dyslexiaSpacing label { font-size: 1.15rem !important; }
  `,
  simplifiedLabels: `/* handled by labelSimplifier.ts injection */`
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
};

/** Origin/hostname namespace for a document, so overlay settings never leak across sites. */
function getNamespace(doc: Document): string {
  try {
    return doc.defaultView?.location?.origin || doc.location?.origin || "unknown-origin";
  } catch {
    return "unknown-origin";
  }
}

function storageKeyFor(doc: Document): string {
  return `${STORAGE_KEY}:${getNamespace(doc)}`;
}

/**
 * One-time migration: if a legacy global settings blob exists and this origin doesn't
 * yet have namespaced settings, copy it forward then clear the legacy key so it can't
 * leak into a different origin later.
 */
function migrateLegacySettings(doc: Document): void {
  try {
    const namespacedKey = storageKeyFor(doc);
    if (localStorage.getItem(namespacedKey)) return;
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (!legacy) return;
    localStorage.setItem(namespacedKey, legacy);
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function defaultOverlaySettings(): OverlaySettings {
  return {
    focusMode: false, readingMode: false, reducedClutter: false,
    largeTargets: false, highContrast: false, dyslexiaSpacing: false, simplifiedLabels: false
  };
}

export function loadOverlaySettings(doc: Document = document): OverlaySettings {
  migrateLegacySettings(doc);
  try {
    const raw = localStorage.getItem(storageKeyFor(doc));
    if (raw) return JSON.parse(raw) as OverlaySettings;
  } catch { }
  return defaultOverlaySettings();
}

export function saveOverlaySettings(settings: OverlaySettings, doc: Document = document): void {
  try { localStorage.setItem(storageKeyFor(doc), JSON.stringify(settings)); } catch { }
}

function updateOverlayCSS(doc: Document, settings: OverlaySettings): void {
  const active = (Object.keys(OVERLAY_CSS) as OverlayMode[]).filter((mode) => settings[mode]);
  const cssText = active.map((mode) => OVERLAY_CSS[mode]).join("\n");
  injectStylesSafely(doc, OVERLAY_STYLE_ID, cssText);
}

function updateBodyClasses(doc: Document, settings: OverlaySettings): void {
  const root = doc.documentElement;
  (Object.keys(OVERLAY_CSS) as OverlayMode[]).forEach((mode) => {
    root.classList.toggle(`na-overlay-${mode}`, settings[mode]);
  });

  if (settings.simplifiedLabels) {
    const labels = detectConfusingLabels(doc);
    labels.forEach((l) => injectSimplifiedHelper(doc, l));
<<<<<<< HEAD
    detectJargonInBody(doc);
=======
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
  } else {
    removeSimplifiedHelpers(doc);
  }
}

export function applyOverlaySettings(doc: Document, settings: OverlaySettings): void {
  updateOverlayCSS(doc, settings);
  updateBodyClasses(doc, settings);
}

export function toggleOverlayMode(doc: Document, mode: OverlayMode, enabled: boolean): OverlaySettings {
  const settings = loadOverlaySettings(doc);
  settings[mode] = enabled;
  saveOverlaySettings(settings, doc);
  applyOverlaySettings(doc, settings);
  return settings;
}

export function removeAllOverlays(doc: Document): void {
  const root = doc.documentElement;
  (Object.keys(OVERLAY_CSS) as OverlayMode[]).forEach((mode) => {
    root.classList.remove(`na-overlay-${mode}`);
  });
  removeInjectedStyles(doc, OVERLAY_STYLE_ID);
  removeSimplifiedHelpers(doc);
  try { localStorage.removeItem(storageKeyFor(doc)); } catch { }
}
