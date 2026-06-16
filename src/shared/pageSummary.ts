import type { ExtractedElement, PageSummary } from "@/shared/types";

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[role='link']",
  "[tabindex]:not([tabindex='-1'])",
  "[onclick]"
].join(",");

function clampText(value: string, max = 180): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function visible(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
}

function luminance(rgb: number[]): number {
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function parseRgb(value: string): number[] | null {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function contrastRatio(element: HTMLElement): number | undefined {
  const style = window.getComputedStyle(element);
  const foreground = parseRgb(style.color);
  let current: HTMLElement | null = element;
  let background: number[] | null = null;

  while (current && !background) {
    const bg = window.getComputedStyle(current).backgroundColor;
    const parsed = parseRgb(bg);
    if (parsed && !/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)/i.test(bg)) {
      background = parsed;
    }
    current = current.parentElement;
  }

  if (!foreground || !background) return undefined;
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 10) / 10;
}

function labelFor(element: Element): string {
  if (!(element instanceof HTMLElement)) return "";
  const labelledBy = element.getAttribute("aria-labelledby");
  const labelledByText = labelledBy
    ?.split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");

  return clampText(
    labelledByText ||
      element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      element.getAttribute("placeholder") ||
      element.textContent ||
      element.getAttribute("alt") ||
      element.getAttribute("name") ||
      element.tagName.toLowerCase()
  );
}

function extractElement(element: Element): ExtractedElement {
  const htmlElement = element instanceof HTMLElement ? element : null;
  const rect = htmlElement?.getBoundingClientRect();
  const style = htmlElement ? window.getComputedStyle(htmlElement) : null;
  return {
    label: labelFor(element),
    role: element.getAttribute("role") || element.tagName.toLowerCase(),
    tag: element.tagName.toLowerCase(),
    href: element instanceof HTMLAnchorElement ? element.href.slice(0, 180) : undefined,
    type: element instanceof HTMLInputElement ? element.type : undefined,
    fontSize: style ? Math.round(Number.parseFloat(style.fontSize || "16") * 10) / 10 : undefined,
    contrastRatio: htmlElement ? contrastRatio(htmlElement) : undefined,
    smallTarget: rect ? rect.width < 44 || rect.height < 44 : undefined
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 16;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function meta(root: Document): Record<string, string> {
  const entries = Array.from(root.querySelectorAll<HTMLMetaElement>("meta[name], meta[property]"))
    .map((node) => [node.name || node.getAttribute("property") || "", clampText(node.content, 220)] as const)
    .filter(([name, content]) => name && content)
    .slice(0, 16);
  return Object.fromEntries(entries);
}

export function extractPageSummary(root: Document = document): PageSummary {
  const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    .filter(visible)
    .map((heading) => ({
      level: Number(heading.tagName.slice(1)),
      text: labelFor(heading)
    }))
    .filter((heading) => heading.text)
    .slice(0, 40);

  const interactiveElements = Array.from(root.querySelectorAll(INTERACTIVE_SELECTOR)).filter(visible).slice(0, 160);
  const extractedInteractive = interactiveElements.map(extractElement);
  const textBlocks = Array.from(root.querySelectorAll<HTMLElement>("p, li, td, th, label, article, section"))
    .filter(visible)
    .map((node) => ({
      text: clampText(node.textContent ?? "", 240),
      fontSize: Math.round(Number.parseFloat(window.getComputedStyle(node).fontSize || "16") * 10) / 10,
      contrastRatio: contrastRatio(node)
    }))
    .filter((block) => block.text.length > 35)
    .slice(0, 60);

  const forms = Array.from(root.querySelectorAll("form"))
    .filter(visible)
    .slice(0, 20)
    .map((form) => ({
      label: labelFor(form),
      fields: Array.from(form.querySelectorAll("input, select, textarea")).filter(visible).slice(0, 25).map(extractElement),
      buttons: Array.from(form.querySelectorAll("button, input[type='submit'], [role='button']")).filter(visible).slice(0, 12).map(extractElement)
    }));

  const tables = Array.from(root.querySelectorAll("table"))
    .filter(visible)
    .slice(0, 20)
    .map((table) => ({
      caption: clampText(table.querySelector("caption")?.textContent ?? ""),
      columns: Array.from(table.querySelectorAll("th")).slice(0, 12).map((node) => clampText(node.textContent ?? "", 80)),
      rows: table.querySelectorAll("tbody tr, tr").length
    }));

  const fontSizes = [...extractedInteractive.map((item) => item.fontSize ?? 16), ...textBlocks.map((block) => block.fontSize)];
  const lowContrastCount = [...extractedInteractive.map((item) => item.contrastRatio), ...textBlocks.map((block) => block.contrastRatio)]
    .filter((ratio): ratio is number => typeof ratio === "number")
    .filter((ratio) => ratio < 4.5).length;

  return {
    title: root.title || "Untitled Page",
    url: root.location?.href ?? "",
    language: root.documentElement.lang || "unknown",
    description: root.querySelector<HTMLMetaElement>("meta[name='description']")?.content ?? "",
    metadata: meta(root),
    headings,
    navigation: Array.from(root.querySelectorAll("nav a[href], header a[href], aside a[href]")).filter(visible).slice(0, 50).map(extractElement),
    links: Array.from(root.querySelectorAll("a[href]")).filter(visible).slice(0, 80).map(extractElement),
    buttons: Array.from(root.querySelectorAll("button, [role='button'], input[type='button'], input[type='submit']")).filter(visible).slice(0, 80).map(extractElement),
    forms,
    tables,
    textBlocks,
    interactiveElements: extractedInteractive,
    stats: {
      interactiveCount: interactiveElements.length,
      smallTargetCount: extractedInteractive.filter((item) => item.smallTarget).length,
      navCount: root.querySelectorAll("nav, header nav, aside nav").length,
      formCount: forms.length,
      textBlockCount: textBlocks.length,
      averageFontSize: average(fontSizes),
      lowContrastCount,
      bodyTextLength: (root.body?.innerText ?? root.body?.textContent ?? "").trim().length
    }
  };
}
