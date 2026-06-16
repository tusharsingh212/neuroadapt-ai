import type { PersonaId } from "@/shared/types";

export interface HeuristicSignal {
  message: string;
  suggestedPersona: PersonaId;
  triggeredBy: string;
}

interface InteractionSnapshot {
  repeatClicks: number;
  scrollBursts: number;
  failedInteractions: number;
  longPauses: number;
}

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[role='link']"
].join(",");

function selectorHint(target: EventTarget | null): string {
  if (!(target instanceof Element)) return "unknown";
  const text = (target.textContent ?? target.getAttribute("aria-label") ?? "").trim();
  if (text) return text.slice(0, 42);
  return target.tagName.toLowerCase();
}

export class HeuristicObserver {
  private repeatClicks = 0;
  private scrollBursts = 0;
  private failedInteractions = 0;
  private longPauses = 0;
  private lastClickKey = "";
  private lastClickAt = 0;
  private lastInteractionAt = Date.now();
  private lastScrollAt = 0;
  private lastScrollY = 0;
  private triggered = false;
  private cleanupFns: Array<() => void> = [];

  constructor(private readonly onTrigger: (signal: HeuristicSignal) => void) {}

  start(root: Document = document): void {
    this.stop();
    this.lastInteractionAt = Date.now();
    this.lastScrollY = root.defaultView?.scrollY ?? window.scrollY;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      const now = Date.now();
      const gap = now - this.lastInteractionAt;
      this.lastInteractionAt = now;

      if (gap > 8000) {
        this.longPauses += 1;
      }

      if (target instanceof HTMLElement) {
        const clickable = Boolean(target.closest(INTERACTIVE_SELECTOR));
        const key = selectorHint(target.closest(INTERACTIVE_SELECTOR) ?? target);
        const isDisabled =
          target.matches("[disabled], [aria-disabled='true']") ||
          Boolean(target.closest("[disabled], [aria-disabled='true']"));

        if (clickable && key === this.lastClickKey && now - this.lastClickAt < 1400) {
          this.repeatClicks += 1;
        } else {
          this.repeatClicks = 0;
        }

        if (clickable && isDisabled) {
          this.failedInteractions += 1;
        }

        this.lastClickKey = key;
        this.lastClickAt = now;
      }

      this.evaluate();
    };

    const onScroll = () => {
      const now = Date.now();
      const currentY = root.defaultView?.scrollY ?? window.scrollY;
      const delta = Math.abs(currentY - this.lastScrollY);

      if (now - this.lastScrollAt < 600 && delta > 160) {
        this.scrollBursts += 1;
      }

      this.lastScrollAt = now;
      this.lastScrollY = currentY;
      this.lastInteractionAt = now;
      this.evaluate();
    };

    const onKeyDown = () => {
      this.lastInteractionAt = Date.now();
    };

    root.addEventListener("click", onClick, true);
    root.addEventListener("scroll", onScroll, true);
    root.addEventListener("keydown", onKeyDown, true);

    this.cleanupFns.push(() => root.removeEventListener("click", onClick, true));
    this.cleanupFns.push(() => root.removeEventListener("scroll", onScroll, true));
    this.cleanupFns.push(() => root.removeEventListener("keydown", onKeyDown, true));
  }

  stop(): void {
    for (const cleanup of this.cleanupFns) cleanup();
    this.cleanupFns = [];
  }

  snapshot(): InteractionSnapshot {
    return {
      repeatClicks: this.repeatClicks,
      scrollBursts: this.scrollBursts,
      failedInteractions: this.failedInteractions,
      longPauses: this.longPauses
    };
  }

  private evaluate(): void {
    if (this.triggered) return;

    const score =
      this.repeatClicks * 2 +
      this.scrollBursts * 1.5 +
      this.failedInteractions * 3 +
      this.longPauses * 2;

    if (score < 5) return;

    this.triggered = true;
    this.onTrigger({
      message:
        "Potential usability challenges detected. Applying adaptive interface... (heuristic/demo mode)",
      suggestedPersona:
        this.failedInteractions >= 2 || this.repeatClicks >= 3
          ? "firstTime"
          : this.scrollBursts >= 3
            ? "visuallyImpaired"
            : "elderly",
      triggeredBy: `repeatClicks=${this.repeatClicks}, scrollBursts=${this.scrollBursts}, failedInteractions=${this.failedInteractions}, longPauses=${this.longPauses}`
    });
  }
}
