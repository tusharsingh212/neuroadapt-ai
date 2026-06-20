import { getElementSearchRoot } from "@/shared/shadowDom";

export interface StyleInjectionResult {
  success: boolean;
  method: "constructable" | "style-element" | "failed";
  error?: string;
}

export type StyleRoot = Document | ShadowRoot;

interface SheetEntry {
  sheet: CSSStyleSheet;
  cssText: string;
}

// One CSSStyleSheet per styleId, shared and adopted across every Document/ShadowRoot
// that needs it. Constructable stylesheets support being adopted into multiple roots,
// so this both avoids duplicate parsing work and guarantees a single source of truth.
const SHEET_REGISTRY = new Map<string, SheetEntry>();

// Tracks which styleIds have been adopted into which root, so re-calling
// injectStylesSafely with the same id/root is a cheap no-op instead of re-adopting.
const ADOPTED_ROOTS = new WeakMap<StyleRoot, Set<string>>();

let constructableSupportCache: boolean | null = null;

function supportsConstructableStylesheets(): boolean {
  if (constructableSupportCache !== null) return constructableSupportCache;
  try {
    constructableSupportCache =
      typeof CSSStyleSheet !== "undefined" &&
      typeof CSSStyleSheet.prototype.replaceSync === "function" &&
      // adoptedStyleSheets must exist on Document for the feature to be usable end-to-end
      typeof document !== "undefined" &&
      "adoptedStyleSheets" in document;
  } catch {
    constructableSupportCache = false;
  }
  return constructableSupportCache;
}

function getOwnerDocument(root: StyleRoot): Document | null {
  if (root instanceof Document) return root;
  try {
    return root.ownerDocument ?? null;
  } catch {
    return null;
  }
}

function findLegacyStyleElement(root: StyleRoot, styleId: string): HTMLStyleElement | null {
  try {
    if (root instanceof Document) {
      const byId = root.getElementById(styleId);
      if (byId instanceof HTMLStyleElement) return byId;
    }
    const el = root.querySelector(`style[data-neuroadapt-style-id="${styleId}"]`);
    return el instanceof HTMLStyleElement ? el : null;
  } catch {
    return null;
  }
}

function removeLegacyStyleElement(root: StyleRoot, styleId: string): void {
  const el = findLegacyStyleElement(root, styleId);
  if (el) {
    try {
      el.remove();
    } catch {
      // ignore
    }
  }
}

function getAppendTarget(root: StyleRoot): ParentNode | null {
  if (root instanceof Document) {
    return root.head ?? root.documentElement;
  }
  return root;
}

/**
 * Injects CSS into `root` (a Document or an open ShadowRoot) as safely as possible.
 *
 * Preference order:
 *  1. Constructable Stylesheets (`adoptedStyleSheets`) - immune to `style-src` CSP
 *     restrictions because the CSS is never parsed from markup/text-content, and the
 *     same CSSStyleSheet instance can be shared across many roots cheaply.
 *  2. A plain `<style>` element - works almost everywhere, but can be blocked by a
 *     strict `style-src` CSP that lacks `'unsafe-inline'`.
 *
 * Calling this repeatedly with the same `styleId` updates the existing sheet/element
 * in place rather than creating duplicates.
 */
export function injectStylesSafely(root: StyleRoot, styleId: string, cssText: string): StyleInjectionResult {
  if (!root) return { success: false, method: "failed", error: "No style root provided" };

  if (supportsConstructableStylesheets()) {
    try {
      let entry = SHEET_REGISTRY.get(styleId);
      if (!entry) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
        entry = { sheet, cssText };
        SHEET_REGISTRY.set(styleId, entry);
      } else if (entry.cssText !== cssText) {
        entry.sheet.replaceSync(cssText);
        entry.cssText = cssText;
      }

      const current = root.adoptedStyleSheets;
      if (!current.includes(entry.sheet)) {
        root.adoptedStyleSheets = [...current, entry.sheet];
      }

      let adopted = ADOPTED_ROOTS.get(root);
      if (!adopted) {
        adopted = new Set();
        ADOPTED_ROOTS.set(root, adopted);
      }
      if (!adopted.has(styleId)) {
        adopted.add(styleId);
        // Clean up any pre-existing fallback <style> element for this id so we never
        // end up with both a style element AND an adopted sheet applying the same rules.
        removeLegacyStyleElement(root, styleId);
      }

      return { success: true, method: "constructable" };
    } catch (e) {
      // Fall through to the <style> element fallback below.
    }
  }

  try {
    const existing = findLegacyStyleElement(root, styleId);
    let styleEl = existing;

    if (!styleEl) {
      const doc = getOwnerDocument(root);
      if (!doc) throw new Error("No owner document available for style injection");
      const parent = getAppendTarget(root);
      if (!parent) throw new Error("No valid append target for style injection");

      styleEl = doc.createElement("style");
      styleEl.setAttribute("data-neuroadapt-style-id", styleId);
      if (root instanceof Document) {
        styleEl.id = styleId;
      }
      parent.appendChild(styleEl);
    }

    if (styleEl.textContent !== cssText) {
      styleEl.textContent = cssText;
    }

    return { success: true, method: "style-element" };
  } catch (e) {
    return { success: false, method: "failed", error: String(e) };
  }
}

/** Convenience wrapper: injects the same CSS into a node's own document AND its shadow root (if any), so styling reaches elements no matter which side of a shadow boundary they live on. */
export function injectStylesForNode(node: Node, styleId: string, cssText: string): StyleInjectionResult {
  const ownRoot = getElementSearchRoot(node);
  const result = injectStylesSafely(ownRoot, styleId, cssText);
  if (!(ownRoot instanceof Document)) {
    // Always also make sure the main document has the rules, since floating UI
    // (tooltips, markers) created by these modules lives in the main document.
    injectStylesSafely(document, styleId, cssText);
  }
  return result;
}

export function removeInjectedStyles(root: StyleRoot, styleId: string): void {
  if (!root) return;
  const entry = SHEET_REGISTRY.get(styleId);
  if (entry) {
    try {
      if (root.adoptedStyleSheets.includes(entry.sheet)) {
        root.adoptedStyleSheets = root.adoptedStyleSheets.filter((s) => s !== entry.sheet);
      }
    } catch {
      // ignore
    }
  }
  ADOPTED_ROOTS.get(root)?.delete(styleId);
  removeLegacyStyleElement(root, styleId);
}

export function applyInlineStylesFallback(element: HTMLElement, styles: Record<string, string>): void {
  for (const [prop, value] of Object.entries(styles)) {
    try {
      // NOTE: `element.style.setProperty()` (CSSOM) is intentionally used instead of
      // `.style.cssText =` or `setAttribute('style', ...)`. CSP's `style-src` directive
      // blocks the latter two (they're treated as "inline styles"), but per-property
      // CSSOM mutation is not subject to that restriction in any current browser.
      element.style.setProperty(prop, value, "important");
    } catch {
      // Ignore CSP/SecurityError edge cases on individual elements.
    }
  }
}

export function detectCSPStyleBlocking(doc: Document = document): boolean {
  const testId = "neuroadapt-csp-test";
  const result = injectStylesSafely(doc, testId, ".neuroadapt-csp-test{display:none}");
  removeInjectedStyles(doc, testId);
  return result.method === "failed";
}
