import { resetAdaptation } from "@/shared/adaptation";
import { clearGuidanceHighlights, resetDomActions } from "@/shared/elementGuide";
import { removeOverlayVisuals } from "@/shared/overlayManager";

export interface CleanupOptions {
  simplifyCleanup?: (() => void) | null;
}

/**
 * Single entry point for restoring a page to its original state.
 * Every reset path (popup Undo, in-panel Restore, SPA navigation) must call this.
 *
 * Order matters:
 *   1. Stop speech synthesis (immediate auditory reset)
 *   2. Run simplifyPage revert (removes action bar + inline style overrides)
 *   3. Clear guidance highlights and element guide overlays
 *   4. Reset adaptation CSS classes and data attributes
 *   5. Remove overlay visual classes (focus mode, reading mode, etc.)
 */
export function restoreOriginalPage(doc: Document, opts: CleanupOptions = {}): void {
  // 1. Stop speech
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }

  // 2. Revert simplifyPage inline overrides + action bar
  try { opts.simplifyCleanup?.(); } catch { /* ignore */ }

  // 3. Remove guidance highlights and element guide DOM mutations
  clearGuidanceHighlights(doc);
  resetDomActions(doc);

  // 4. Remove semantic adaptation CSS classes and data attributes
  resetAdaptation(doc);

  // 5. Remove overlay visual classes (preserves user's saved settings in localStorage)
  removeOverlayVisuals(doc);
}
