import type { ConfusionSignal, PersonaId } from "@/shared/types";

export interface HeuristicSignal {
  message: string;
  suggestedPersona: PersonaId;
  triggeredBy: string;
  signals: ConfusionSignal[];
}

export interface HeuristicWeights {
  repeatClicks: number;
  scrollBursts: number;
  failedInteractions: number;
  longPauses: number;
  hoverHesitations: number;
  menuFlickers: number;
}

export interface HeuristicConfig {
  weights: HeuristicWeights;
  /** Weighted score that must be reached before a confusion signal fires. */
  triggerThreshold: number;
  /** Minimum time after a trigger before another one can fire, so a single rough patch
   * of browsing doesn't repeatedly interrupt the user. */
  cooldownMs: number;
}

export const DEFAULT_HEURISTIC_CONFIG: HeuristicConfig = {
  weights: {
    repeatClicks: 2,
    scrollBursts: 1.5,
    failedInteractions: 3,
    longPauses: 2,
    hoverHesitations: 1,
    menuFlickers: 2
  },
  triggerThreshold: 8,
  cooldownMs: 60_000
};

const INTERACTIVE_SELECTOR = [
  "button", "a[href]", "input", "select", "textarea",
  "[role='button']", "[role='link']"
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
  private hoverHesitations = 0;
  private menuFlickers = 0;
  private lastClickKey = "";
  private lastClickAt = 0;
  private lastInteractionAt = Date.now();
  private lastScrollAt = 0;
  private lastScrollY = 0;
  private lastScrollDirection = 0;
  private directionChanges = 0;
  private menuOpenAt = 0;
  private hoverTimeout: number | null = null;
  private lastHoverTarget: string | null = null;
  private lastHoverStart = 0;
  private cooldownUntil = 0;
  private cleanupFns: Array<() => void> = [];
  private readonly config: HeuristicConfig;

  constructor(
    private readonly onTrigger: (signal: HeuristicSignal) => void,
    config: Partial<HeuristicConfig> = {}
  ) {
    this.config = {
      triggerThreshold: config.triggerThreshold ?? DEFAULT_HEURISTIC_CONFIG.triggerThreshold,
      cooldownMs: config.cooldownMs ?? DEFAULT_HEURISTIC_CONFIG.cooldownMs,
      weights: { ...DEFAULT_HEURISTIC_CONFIG.weights, ...config.weights }
    };
  }

  start(root: Document = document): void {
    this.stop();
    this.lastInteractionAt = Date.now();
    this.lastScrollY = root.defaultView?.scrollY ?? window.scrollY;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      const now = Date.now();
      const gap = now - this.lastInteractionAt;
      this.lastInteractionAt = now;

      if (gap > 8000) { this.longPauses += 1; }

      if (target instanceof HTMLElement) {
        const clickable = Boolean(target.closest(INTERACTIVE_SELECTOR));
        const key = selectorHint(target.closest(INTERACTIVE_SELECTOR) ?? target);
        const isDisabled = target.matches("[disabled], [aria-disabled='true']") || Boolean(target.closest("[disabled], [aria-disabled='true']"));

        if (clickable && key === this.lastClickKey && now - this.lastClickAt < 1400) {
          this.repeatClicks += 1;
        } else {
          this.repeatClicks = 0;
        }

        if (clickable && isDisabled) { this.failedInteractions += 1; }
        this.lastClickKey = key;
        this.lastClickAt = now;
      }

      this.evaluate();
    };

    const onScroll = () => {
      const now = Date.now();
      const currentY = root.defaultView?.scrollY ?? window.scrollY;
      const delta = currentY - this.lastScrollY;

      if (now - this.lastScrollAt < 600 && Math.abs(delta) > 160) {
        this.scrollBursts += 1;
      }

      if (delta * this.lastScrollDirection < 0) {
        this.directionChanges += 1;
        if (this.directionChanges > 3) {
          this.scrollBursts += 1;
          this.directionChanges = 0;
        }
      }
      this.lastScrollDirection = delta > 0 ? 1 : delta < 0 ? -1 : this.lastScrollDirection;
      this.lastScrollAt = now;
      this.lastScrollY = currentY;
      this.lastInteractionAt = now;
      this.evaluate();
    };

    const onKeyDown = () => { this.lastInteractionAt = Date.now(); };

    const onMouseOver = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const interactive = target.closest(INTERACTIVE_SELECTOR);
      if (!interactive) return;
      const key = selectorHint(interactive);

      if (key !== this.lastHoverTarget) {
        if (this.hoverTimeout) { window.clearTimeout(this.hoverTimeout); }
        this.lastHoverTarget = key;
        this.lastHoverStart = Date.now();
        this.hoverTimeout = window.setTimeout(() => {
          if (this.lastHoverTarget === key) {
            this.hoverHesitations += 1;
            this.evaluate();
          }
        }, 2000);
      }
    };

    const onMouseOut = () => {
      if (this.hoverTimeout) { window.clearTimeout(this.hoverTimeout); this.hoverTimeout = null; }
      this.lastHoverTarget = null;
    };

    const onChange = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLSelectElement) {
        const now = Date.now();
        if (this.menuOpenAt > 0 && now - this.menuOpenAt < 3000) {
          this.menuFlickers += 1;
          this.evaluate();
        }
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLSelectElement || target instanceof HTMLInputElement) {
        this.menuOpenAt = Date.now();
      }
    };

    root.addEventListener("click", onClick, true);
    root.addEventListener("scroll", onScroll, true);
    root.addEventListener("keydown", onKeyDown, true);
    root.addEventListener("mouseover", onMouseOver, true);
    root.addEventListener("mouseout", onMouseOut, true);
    root.addEventListener("change", onChange, true);
    root.addEventListener("focusin", onFocusIn, true);

    this.cleanupFns.push(
      () => root.removeEventListener("click", onClick, true),
      () => root.removeEventListener("scroll", onScroll, true),
      () => root.removeEventListener("keydown", onKeyDown, true),
      () => root.removeEventListener("mouseover", onMouseOver, true),
      () => root.removeEventListener("mouseout", onMouseOut, true),
      () => root.removeEventListener("change", onChange, true),
      () => root.removeEventListener("focusin", onFocusIn, true)
    );
  }

  stop(): void {
    if (this.hoverTimeout) { window.clearTimeout(this.hoverTimeout); this.hoverTimeout = null; }
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
  }

  getSignals(): ConfusionSignal[] {
    const signals: ConfusionSignal[] = [];
    const now = Date.now();
    if (this.repeatClicks >= 2) signals.push({ type: "repeatClick", severity: "medium", suggestion: "It looks like you're trying the same button multiple times. Would you like help?", timestamp: now });
    if (this.scrollBursts >= 2) signals.push({ type: "scrollBurst", severity: "low", suggestion: "You're scrolling a lot. I can help you find what you need faster.", timestamp: now });
    if (this.failedInteractions >= 2) signals.push({ type: "failedInteraction", severity: "high", suggestion: "Some buttons don't seem to be working. Let me guide you.", timestamp: now });
    if (this.longPauses >= 2) signals.push({ type: "longPause", severity: "medium", suggestion: "Take your time. Would you like me to explain this page?", timestamp: now });
    if (this.hoverHesitations >= 2) signals.push({ type: "hoverHesitation", severity: "low", suggestion: "I notice you're hovering over items. I can tell you what each one does.", timestamp: now });
    if (this.menuFlickers >= 2) signals.push({ type: "menuFlicker", severity: "medium", suggestion: "Having trouble with the menus? I can guide you step by step.", timestamp: now });
    return signals;
  }

  private evaluate(): void {
    const now = Date.now();
    if (now < this.cooldownUntil) return;

    const { weights } = this.config;
    const score =
      this.repeatClicks * weights.repeatClicks + this.scrollBursts * weights.scrollBursts +
      this.failedInteractions * weights.failedInteractions + this.longPauses * weights.longPauses +
      this.hoverHesitations * weights.hoverHesitations + this.menuFlickers * weights.menuFlickers;

    if (score < this.config.triggerThreshold) return;

    this.cooldownUntil = now + this.config.cooldownMs;
    const signals = this.getSignals();
    this.onTrigger({
      message: "It looks like you might be having trouble. Would you like guided assistance?",
      suggestedPersona: this.failedInteractions >= 2 || this.repeatClicks >= 3 ? "firstTime" : "elderly",
      triggeredBy: `repeatClicks=${this.repeatClicks}, scrollBursts=${this.scrollBursts}, failed=${this.failedInteractions}, pauses=${this.longPauses}, hover=${this.hoverHesitations}, menu=${this.menuFlickers}`,
      signals
    });
    // Decay counters so the cooldown window starts clean rather than immediately
    // re-triggering the moment it elapses on stale, already-reported signals.
    this.decay();
  }

  private decay(): void {
    this.repeatClicks = 0; this.scrollBursts = 0; this.failedInteractions = 0;
    this.longPauses = 0; this.hoverHesitations = 0; this.menuFlickers = 0;
  }

  reset(): void {
    this.decay();
    this.cooldownUntil = 0;
  }
}
