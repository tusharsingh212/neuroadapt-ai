import type { OverlayMode, OverlaySettings } from "@/shared/types";
import { removeSimplifiedHelpers, detectConfusingLabels, injectSimplifiedHelper } from "@/shared/labelSimplifier";
import { injectStylesSafely, removeInjectedStyles } from "@/shared/cspSafeStyles";

const STORAGE_KEY = "na-overlay-settings";
const OVERLAY_STYLE_ID = "na-overlay-styles";

const OVERLAY_CSS: Record<OverlayMode, string> = {
  focusMode: `
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
