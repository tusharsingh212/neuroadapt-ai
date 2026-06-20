import { getSession, advanceChecklist } from "@/shared/goalSession";

type ChangeCallback = (event: { type: "click" | "navigation" | "dom" | "formChange"; fingerprint: string; target?: HTMLElement }) => void;

export class PageObserver {
  private clickCb: ((e: MouseEvent) => void) | null = null;
  private changeCb: ((e: Event) => void) | null = null;
  private inputCb: ((e: Event) => void) | null = null;
  private observer: MutationObserver | null = null;
  private debounceTimers: Map<string, number> = new Map();
  private lastFingerprint = "";
  private lastUrl = "";
  private callbacks: Set<ChangeCallback> = new Set();
  private running = false;
  private popStateHandler: (() => void) | null = null;
  private originalPushState: typeof history.pushState | null = null;
  private originalReplaceState: typeof history.replaceState | null = null;

  onChange(cb: ChangeCallback): () => void {
    this.callbacks.add(cb);
    return () => { this.callbacks.delete(cb); };
  }

  start(root: Document = document): void {
    if (this.running) return;
    this.running = true;
    this.lastFingerprint = this.computeFingerprint(root);
    this.lastUrl = root.location?.href ?? "";

    this.clickCb = (event: MouseEvent) => {
      this.debounce("click", () => {
        if (!getSession()) return;
        const target = event.target as HTMLElement;
        this.fire({ type: "click", fingerprint: this.computeFingerprint(root), target });
      }, 600);
    };

    this.changeCb = () => {
      this.debounce("formChange", () => {
        this.fire({ type: "formChange", fingerprint: this.computeFingerprint(root) });
      }, 800);
    };

    this.inputCb = () => {
      this.debounce("formChange", () => {
        this.fire({ type: "formChange", fingerprint: this.computeFingerprint(root) });
      }, 1200);
    };

    root.addEventListener("click", this.clickCb, true);
    root.addEventListener("change", this.changeCb, true);
    root.addEventListener("input", this.inputCb, true);

    this.observer = new MutationObserver(() => {
      this.debounce("dom", () => {
        const fp = this.computeFingerprint(root);
        if (fp !== this.lastFingerprint) {
          this.lastFingerprint = fp;
          this.fire({ type: "dom", fingerprint: fp });
        }
      }, 1000);
    });

    this.observer.observe(root.documentElement, { subtree: true, childList: true, attributes: true });

    // Detect SPA navigation via pushState/replaceState
    this.originalPushState = history.pushState.bind(history);
    this.originalReplaceState = history.replaceState.bind(history);
    history.pushState = (...args) => {
      this.originalPushState?.(...args);
      this.handleUrlChange(root);
    };
    history.replaceState = (...args) => {
      this.originalReplaceState?.(...args);
      this.handleUrlChange(root);
    };

    // Detect browser back/forward
    this.popStateHandler = () => this.handleUrlChange(root);
    window.addEventListener("popstate", this.popStateHandler);
  }

  private handleUrlChange(root: Document): void {
    const newUrl = root.location?.href ?? "";
    if (newUrl !== this.lastUrl) {
      this.lastUrl = newUrl;
      // Reset fingerprint to force re-analysis on new page
      this.lastFingerprint = this.computeFingerprint(root);
      this.fire({ type: "navigation", fingerprint: this.lastFingerprint });
    }
  }

  stop(): void {
    this.running = false;
    if (this.clickCb) { document.removeEventListener("click", this.clickCb, true); this.clickCb = null; }
    if (this.changeCb) { document.removeEventListener("change", this.changeCb, true); this.changeCb = null; }
    if (this.inputCb) { document.removeEventListener("input", this.inputCb, true); this.inputCb = null; }
    if (this.observer) { this.observer.disconnect(); this.observer = null; }
    this.debounceTimers.forEach((t) => window.clearTimeout(t));
    this.debounceTimers.clear();
    if (this.popStateHandler) { window.removeEventListener("popstate", this.popStateHandler); this.popStateHandler = null; }
    if (this.originalPushState) { history.pushState = this.originalPushState; this.originalPushState = null; }
    if (this.originalReplaceState) { history.replaceState = this.originalReplaceState; this.originalReplaceState = null; }
  }

  private computeFingerprint(root: Document): string {
    const title = root.title;
    const visibleButtons = Array.from(root.querySelectorAll("button, a[href], [role='button']"))
      .filter((el) => el instanceof HTMLElement && el.offsetParent !== null)
      .slice(0, 20).map((el) => (el.textContent || "").trim()).join(",");
    const formCount = root.querySelectorAll("form").length;
    const headingCount = root.querySelectorAll("h1, h2, h3").length;
    const interactiveCount = root.querySelectorAll("button, a[href], input, select, textarea, [role='button'], [role='link']").length;
    return `${title}|${visibleButtons}|${formCount}|${headingCount}|${interactiveCount}`;
  }

  private debounce(key: string, fn: () => void, ms: number): void {
    const existing = this.debounceTimers.get(key);
    if (existing) window.clearTimeout(existing);
    this.debounceTimers.set(key, window.setTimeout(() => {
      this.debounceTimers.delete(key);
      fn();
    }, ms));
  }

  private fire(event: ChangeCallback extends (e: infer E) => void ? E : never): void {
    this.callbacks.forEach((cb) => cb(event));
  }
}
