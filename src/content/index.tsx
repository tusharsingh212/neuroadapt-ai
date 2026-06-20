import { createRoot } from "react-dom/client";

import { ContentApp } from "@/content/ContentApp";
import { contentStyles } from "@/content/contentStyles";
import { injectStylesSafely } from "@/shared/cspSafeStyles";

function mount(): void {
  if (document.getElementById("neuroadapt-host")) return;

  const host = document.createElement("div");
  host.id = "neuroadapt-host";
  // Per-property CSSOM mutation instead of `.style.cssText =`, which CSP's `style-src`
  // treats as an inline style and can block on strict host pages.
  host.style.setProperty("all", "initial", "important");
  host.style.setProperty("position", "fixed", "important");
  host.style.setProperty("inset", "0", "important");
  host.style.setProperty("pointer-events", "none", "important");
  host.style.setProperty("z-index", "2147483647", "important");

  const shadow = host.attachShadow({ mode: "open" });
  injectStylesSafely(shadow, "neuroadapt-host-styles", contentStyles);

  const container = document.createElement("div");
  shadow.appendChild(container);

  const root = createRoot(container);
  root.render(<ContentApp />);

  document.documentElement.appendChild(host);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}
