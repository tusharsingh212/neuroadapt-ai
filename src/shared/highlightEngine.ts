import type { HighlightCandidate } from "@/shared/types";
import { injectStylesForNode } from "@/shared/cspSafeStyles";
import { isElementConnected, queryDeepFirst } from "@/shared/shadowDom";

interface MarkerInfo {
  el: HTMLElement;
  anchor: HTMLElement;
}

let activeHighlight: HTMLElement | null = null;
let activeVisualTarget: HTMLElement | null = null;
let tooltipEl: HTMLElement | null = null;
let svgBoxEl: HTMLElement | null = null;
let markers: MarkerInfo[] = [];

const HIGHLIGHT_CLASS = "na-highlight-spotlight";
const HIGHLIGHT_STYLE_ID = "na-highlight-styles";

const HIGHLIGHT_CSS = `
  .${HIGHLIGHT_CLASS} {
    outline: 3px solid #3b82f6 !important;
    outline-offset: 3px !important;
    border-radius: 4px !important;
    box-shadow: 0 0 0 4px rgba(59,130,246,0.25), 0 0 12px rgba(59,130,246,0.4) !important;
    transition: outline 0.2s ease, box-shadow 0.2s ease !important;
    scroll-margin-top: 80px;
  }
  .na-highlight-tooltip {
    position: fixed;
    z-index: 2147483646;
    background: #1e293b;
    color: #f8fafc;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1.4;
    max-width: 280px;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid #334155;
  }
  .na-candidate-marker {
    position: fixed;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #64748b;
    background: #f8fafc;
    border: 1px dashed #64748b;
    border-radius: 4px;
    padding: 1px 6px;
    z-index: 2147483645;
    cursor: default;
    pointer-events: none;
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .na-highlight-svg-box {
    position: fixed;
    z-index: 2147483645;
    border: 3px solid #3b82f6;
    border-radius: 4px;
    box-shadow: 0 0 0 4px rgba(59,130,246,0.25), 0 0 12px rgba(59,130,246,0.4);
    pointer-events: none;
  }
`;

/** Adopts the highlight stylesheet into both the main document and (if relevant) the
 * shadow root the target element lives in, so highlighting works regardless of which
 * side of a shadow boundary the element is on. */
function ensureHighlightStyles(target?: Node): void {
  if (target) {
    injectStylesForNode(target, HIGHLIGHT_STYLE_ID, HIGHLIGHT_CSS);
  } else {
    injectStylesForNode(document, HIGHLIGHT_STYLE_ID, HIGHLIGHT_CSS);
  }
}

/** Walks past `display: contents` elements (which generate no box of their own) to find
 * a real-box descendant suitable for outlining/positioning. Falls back to the original
 * element if no suitable descendant is found. */
export function resolveVisualTarget(element: HTMLElement): HTMLElement {
  try {
    let current: HTMLElement = element;
    let hops = 0;
    while (hops < 20) {
      let style: CSSStyleDeclaration | null = null;
      try {
        style = getComputedStyle(current);
      } catch {
        break;
      }
      if (!style || style.display !== "contents") break;
      const child = Array.from(current.children).find((c): c is HTMLElement => c instanceof HTMLElement);
      if (!child) break;
      current = child;
      hops += 1;
    }
    return current;
  } catch {
    return element;
  }
}

function isSvgElement(element: Element): boolean {
  try {
    return typeof SVGElement !== "undefined" && element instanceof SVGElement;
  } catch {
    return false;
  }
}

interface VisibleRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** Computes the portion of `element`'s bounding box that is actually visible, taking
 * into account clipping by scrollable/overflow-hidden ancestors and the viewport
 * (preferring `visualViewport` for pinch-zoom accuracy). Returns null if the element is
 * fully clipped/off-screen, so callers can hide UI rather than mis-position it. */
function computeVisibleRect(element: Element): VisibleRect | null {
  let rect: DOMRect;
  try {
    rect = element.getBoundingClientRect();
  } catch {
    return null;
  }
  if (rect.width === 0 && rect.height === 0) return null;

  let top = rect.top;
  let left = rect.left;
  let right = rect.right;
  let bottom = rect.bottom;

  let node: HTMLElement | null = element instanceof HTMLElement ? element.parentElement : null;
  let hops = 0;
  while (node && hops < 50) {
    hops += 1;
    try {
      const style = getComputedStyle(node);
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX + style.overflowY)) {
        const r = node.getBoundingClientRect();
        top = Math.max(top, r.top);
        left = Math.max(left, r.left);
        right = Math.min(right, r.right);
        bottom = Math.min(bottom, r.bottom);
        if (right <= left || bottom <= top) return null;
      }
    } catch {
      break;
    }
    // Cross shadow-root boundaries by jumping to the host element.
    if (node.parentElement) {
      node = node.parentElement;
    } else {
      try {
        const root = node.getRootNode();
        node = root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
      } catch {
        node = null;
      }
    }
  }

  const vw = window.visualViewport?.width ?? window.innerWidth;
  const vh = window.visualViewport?.height ?? window.innerHeight;
  top = Math.max(top, 0);
  left = Math.max(left, 0);
  right = Math.min(right, vw);
  bottom = Math.min(bottom, vh);
  if (right <= left || bottom <= top) return null;

  return { top, left, right, bottom, width: right - left, height: bottom - top };
}

export function clearHighlight(): void {
  if (activeHighlight) {
    try {
      activeHighlight.classList.remove(HIGHLIGHT_CLASS);
    } catch {
      // ignore - element may be detached/exotic
    }
    activeHighlight = null;
  }
  activeVisualTarget = null;
  if (tooltipEl) {
    tooltipEl.remove();
    tooltipEl = null;
  }
  if (svgBoxEl) {
    svgBoxEl.remove();
    svgBoxEl = null;
  }
  if (markers.length) {
    markers.forEach((m) => {
      try {
        m.el.remove();
      } catch {
        // ignore
      }
    });
    markers = [];
  }
}

export function highlightElement(
  element: HTMLElement,
  tooltip?: string,
  candidates?: HighlightCandidate[]
): boolean {
  try {
    clearHighlight();

    if (!element || !isElementConnected(element)) return false;

    ensureHighlightStyles(element);

    const visualTarget = resolveVisualTarget(element);

    try {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      // ignore - some detached/exotic elements may throw
    }

    activeHighlight = element;
    activeVisualTarget = visualTarget;

    if (isSvgElement(visualTarget)) {
      // SVG (non-root) elements have inconsistent outline/box-shadow support, so use a
      // floating overlay box positioned over the element instead of styling it directly.
      svgBoxEl = document.createElement("div");
      svgBoxEl.className = "na-highlight-svg-box";
      document.body.appendChild(svgBoxEl);
      positionSvgBox(visualTarget, svgBoxEl);
    } else {
      try {
        visualTarget.classList.add(HIGHLIGHT_CLASS);
      } catch {
        // ignore - exotic element without classList support
      }
    }

    if (tooltip) {
      tooltipEl = document.createElement("div");
      tooltipEl.className = "na-highlight-tooltip";
      tooltipEl.textContent = tooltip;
      document.body.appendChild(tooltipEl);
      positionTooltip(visualTarget, tooltipEl);
    }

    if (candidates?.length) {
      const nextMarkers: MarkerInfo[] = [];
      candidates.forEach((c) => {
        try {
          const el = queryDeepFirst<HTMLElement>(`[data-neuroadapt-ref="${c.ref}"]`, document);
          if (el && el !== element && isElementConnected(el)) {
            const anchor = resolveVisualTarget(el);
            const marker = document.createElement("span");
            marker.className = "na-candidate-marker";
            marker.textContent = `${c.label}: ${c.reason}`;
            document.body.appendChild(marker);
            positionMarker(anchor, marker);
            nextMarkers.push({ el: marker, anchor });
          }
        } catch {
          // Never let a single bad candidate take down the whole highlight call.
        }
      });
      markers = nextMarkers;
    }

    return true;
  } catch {
    return false;
  }
}

function positionTooltip(target: HTMLElement, tooltip: HTMLElement): void {
  const rect = computeVisibleRect(target);
  if (!rect) {
    tooltip.style.setProperty("display", "none", "important");
    return;
  }
  tooltip.style.removeProperty("display");

  const vw = window.visualViewport?.width ?? window.innerWidth;
  const vh = window.visualViewport?.height ?? window.innerHeight;
  const tw = tooltip.offsetWidth || 280;
  const th = tooltip.offsetHeight || 36;

  let top = rect.bottom + 8;
  let left = rect.left + rect.width / 2 - tw / 2;

  if (top + th > vh - 8) {
    top = rect.top - th - 8;
  }
  if (top < 8) top = 8;
  if (left < 8) left = 8;
  if (left + tw > vw - 8) left = Math.max(8, vw - tw - 8);

  tooltip.style.top = `${Math.round(top)}px`;
  tooltip.style.left = `${Math.round(left)}px`;
}

function positionSvgBox(target: Element, box: HTMLElement): void {
  const rect = computeVisibleRect(target);
  if (!rect) {
    box.style.setProperty("display", "none", "important");
    return;
  }
  box.style.removeProperty("display");
  box.style.top = `${Math.round(rect.top)}px`;
  box.style.left = `${Math.round(rect.left)}px`;
  box.style.width = `${Math.round(rect.width)}px`;
  box.style.height = `${Math.round(rect.height)}px`;
}

function positionMarker(anchor: HTMLElement, marker: HTMLElement): void {
  const rect = computeVisibleRect(anchor);
  if (!rect) {
    marker.style.setProperty("display", "none", "important");
    return;
  }
  marker.style.removeProperty("display");

  const vw = window.visualViewport?.width ?? window.innerWidth;
  const mw = marker.offsetWidth || 120;

  let top = rect.top - 2;
  let left = rect.right + 4;
  if (left + mw > vw - 4) {
    left = Math.max(4, rect.left - mw - 4);
  }

  marker.style.top = `${Math.round(top)}px`;
  marker.style.left = `${Math.round(left)}px`;
}

export function repositionTooltip(): void {
  if (activeVisualTarget && !isElementConnected(activeVisualTarget)) {
    clearHighlight();
    return;
  }
  if (activeVisualTarget && tooltipEl) {
    positionTooltip(activeVisualTarget, tooltipEl);
  }
  if (activeVisualTarget && svgBoxEl) {
    positionSvgBox(activeVisualTarget, svgBoxEl);
  }
  if (markers.length) {
    markers.forEach((m) => positionMarker(m.anchor, m.el));
  }
}

if (typeof window !== "undefined") {
  // Capture phase so scrolling inside *any* nested scroll container (which doesn't
  // bubble a `scroll` event to `window`) still triggers reposition/clipping checks.
  document.addEventListener("scroll", repositionTooltip, { passive: true, capture: true });
  window.addEventListener("resize", repositionTooltip, { passive: true });
  window.visualViewport?.addEventListener("resize", repositionTooltip);
  window.visualViewport?.addEventListener("scroll", repositionTooltip);
}
