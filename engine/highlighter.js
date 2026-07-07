/**
 * NeuroAdapt Engine — Element Highlighter (Phase 4.1)
 *
 * Exposes: window.NeuroAdaptEngine.Highlighter
 *
 * Draws attention to ONE element at a time:
 *  - Bold outline + animated pulse on the target element
 *  - Optional light dimming of the rest of the page
 *  - Subtle context ring on the nearest meaningful container
 *  - Floating action badge anchored just above the element
 *  - Smart scrolling: only scrolls if target is outside the visible viewport
 */

window.NeuroAdaptEngine = window.NeuroAdaptEngine || {};

(() => {

  const BADGE_ID   = 'na-step-badge';
  const DIM_ID     = 'na-dim-overlay';
  const HL_CLASS   = 'na-highlight';
  const PULSE_CLS  = 'na-highlight--pulse';
  const CTX_CLASS  = 'na-highlight--context';

  class Highlighter {
    constructor() {
      this._current   = null;
      this._contextEl = null;
      this._fadeTimer = null;
      this._resizeObs = null;
      console.log('[NeuroAdapt] Highlighter ready.');
    }

    /**
     * Highlight `element` with a glow, dim overlay, context ring, and badge.
     *
     * @param {HTMLElement} element
     * @param {object}  [opts]
     * @param {string}  [opts.tooltip]  Short action label for the badge
     * @param {boolean} [opts.scroll]   Scroll into view if needed (default: true)
     * @param {number}  [opts.score]    Internal score — NOT shown to user
     */
    highlight(element, opts = {}) {
      if (!(element instanceof Element)) {
        console.warn('[NeuroAdapt] Highlighter.highlight(): invalid element', element);
        return;
      }

      this.clear();

      const { tooltip, scroll = true } = opts;

      // Apply glow ring immediately so there's instant visual feedback
      element.classList.add(HL_CLASS, PULSE_CLS);
      this._current = element;

      // Context ring on nearest meaningful container
      const ctx = this._findContextContainer(element);
      if (ctx) {
        ctx.classList.add(CTX_CLASS);
        this._contextEl = ctx;
      }

      // Dim overlay (pointer-events: none so page stays fully interactive)
      this._showDim();

      if (scroll && !this._isInViewport(element)) {
        // Scroll first, then show badge once scroll settles
        this._scrollToElement(element, () => {
          if (tooltip && this._current === element) {
            this._showBadge(element, tooltip);
          }
        });
      } else {
        if (tooltip) this._showBadge(element, tooltip);
      }

      console.log(
        `[NeuroAdapt] Highlighted <${element.tagName.toLowerCase()}>` +
        ` "${(element.innerText?.trim() || element.getAttribute('aria-label') || '').slice(0, 60)}"`
      );
    }

    clear() {
      clearTimeout(this._fadeTimer);
      this._resizeObs?.disconnect();
      this._resizeObs = null;

      if (this._current) {
        this._current.classList.remove(HL_CLASS, PULSE_CLS);
        this._current = null;
      }

      if (this._contextEl) {
        this._contextEl.classList.remove(CTX_CLASS);
        this._contextEl = null;
      }

      this._hideDim();
      document.getElementById(BADGE_ID)?.remove();
    }

    // ── Private ───────────────────────────────────────────────────────────────

    /** True if element is comfortably inside the visible area (accounting for sticky headers). */
    _isInViewport(element) {
      const rect          = element.getBoundingClientRect();
      const stickyOffset  = 80; // conservative allowance for sticky nav bars
      return (
        rect.top    >= stickyOffset &&
        rect.bottom <= window.innerHeight - 20 &&
        rect.left   >= 0 &&
        rect.right  <= window.innerWidth
      );
    }

    /** Smooth-scroll to element and invoke callback once scrolling has settled. */
    _scrollToElement(element, onSettled) {
      // Use scrollIntoView with block:'center' — avoids sticky-header occlusion
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      // Wait for smooth scroll to complete (~400-600ms on most browsers), then
      // position the badge at the element's final location.
      setTimeout(() => {
        if (document.contains(element)) onSettled();
      }, 550);
    }

    /** Walk up the DOM to find the nearest semantic container worth highlighting. */
    _findContextContainer(element) {
      let el    = element.parentElement;
      let depth = 0;
      while (el && depth < 6) {
        if (el === document.body || el === document.documentElement) break;
        const tag  = el.tagName?.toLowerCase();
        const role = el.getAttribute?.('role') ?? '';
        const cls  = (el.className?.toString() ?? '');
        if (
          tag === 'form' || tag === 'section' || tag === 'article' || tag === 'aside' ||
          role === 'region' || role === 'main' || role === 'dialog' || role === 'form' ||
          /card|panel|box|container|wrapper|login|auth|modal/i.test(cls)
        ) {
          return el;
        }
        el = el.parentElement;
        depth++;
      }
      return null;
    }

    _showDim() {
      if (document.getElementById(DIM_ID)) return;
      const overlay   = document.createElement('div');
      overlay.id      = DIM_ID;
      document.body.appendChild(overlay);
    }

    _hideDim() {
      document.getElementById(DIM_ID)?.remove();
    }

    _showBadge(element, label) {
      document.getElementById(BADGE_ID)?.remove();

      const badge        = document.createElement('div');
      badge.id           = BADGE_ID;
      badge.textContent  = label;
      document.body.appendChild(badge);

      this._placeBadge(badge, element);

      // Reposition when the highlighted element's size changes
      this._resizeObs = new ResizeObserver(() => this._placeBadge(badge, element));
      this._resizeObs.observe(element);

      // Fade out after 5 s
      this._fadeTimer = setTimeout(() => {
        badge.classList.add('na-badge--fading');
        setTimeout(() => badge.remove(), 400);
      }, 5000);
    }

    _placeBadge(badge, element) {
      const rect    = element.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      const badgeW = badge.offsetWidth || 160;
      const GAP    = 6;

      // Prefer above-right; shift below if it would clip the top of the viewport
      let top  = rect.top  + scrollY - badge.offsetHeight - GAP;
      let left = rect.right + scrollX - badgeW;

      if (top - scrollY < 4) {
        top = rect.bottom + scrollY + GAP;
      }

      const maxLeft = scrollX + window.innerWidth - badgeW - 4;
      left = Math.max(scrollX + 4, Math.min(left, maxLeft));

      badge.style.top  = `${top}px`;
      badge.style.left = `${left}px`;
    }
  }

  window.NeuroAdaptEngine.Highlighter = Highlighter;
})();
