import { createRoot } from "react-dom/client";

import { ContentApp } from "@/content/ContentApp";
import { contentStyles } from "@/content/contentStyles";

function mount(): void {
  if (document.getElementById("neuroadapt-host")) return;

  const host = document.createElement("div");
  host.id = "neuroadapt-host";
  host.style.cssText = "all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;";

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = contentStyles;
  shadow.appendChild(style);

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
