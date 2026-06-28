import type { ExtractedElement, PageSummary } from "@/shared/types";
import { collectSearchRoots, type SearchRoot } from "@/shared/shadowDom";

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
  const meaningfulClasses = Array.from(element.classList)
    .filter((c) => c.length > 2 && !/^[a-z]{1,2}\d+$/.test(c))
    .slice(0, 3)
    .join(" ");
  return {
    label: labelFor(element),
    role: element.getAttribute("role") || element.tagName.toLowerCase(),
    tag: element.tagName.toLowerCase(),
    href: element instanceof HTMLAnchorElement ? element.href.slice(0, 180) : undefined,
    type: element instanceof HTMLInputElement ? element.type : undefined,
    fontSize: style ? Math.round(Number.parseFloat(style.fontSize || "16") * 10) / 10 : undefined,
    contrastRatio: htmlElement ? contrastRatio(htmlElement) : undefined,
    smallTarget: rect ? rect.width < 44 || rect.height < 44 : undefined,
    id: element.id || undefined,
    cssClass: meaningfulClasses || undefined
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 16;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

type QueryAll = <E extends Element = Element>(selector: string) => E[];

function buildQueryAll(searchRoots: SearchRoot[]): QueryAll {
  return <E extends Element = Element>(selector: string): E[] => {
    const results: E[] = [];
    for (const r of searchRoots) {
      try {
        results.push(...Array.from(r.querySelectorAll<E>(selector)));
      } catch {
        // Invalid selector for this root, or root became inaccessible - skip it.
      }
    }
    return results;
  };
}

function meta(queryAll: QueryAll): Record<string, string> {
  const entries = queryAll<HTMLMetaElement>("meta[name], meta[property]")
    .map((node) => [node.name || node.getAttribute("property") || "", clampText(node.content, 220)] as const)
    .filter(([name, content]) => name && content)
    .slice(0, 16);
  return Object.fromEntries(entries);
}

function computeNavDepth(queryAll: QueryAll): number {
  let maxDepth = 0;
  const navs = queryAll("nav, [role='navigation']");
  navs.forEach((nav) => {
    const items = nav.querySelectorAll("a, button, [role='link'], [role='button']");
    items.forEach((item) => {
      let depth = 0;
      let parent = item.parentElement;
      while (parent && parent !== nav) {
        if (parent.matches("li, ul, ol, div")) depth++;
        parent = parent.parentElement;
      }
      if (depth > maxDepth) maxDepth = depth;
    });
  });
  return maxDepth;
}

function computeHeadingGaps(hs: Array<{ level: number; text: string }>): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < hs.length; i++) {
    const diff = hs[i].level - hs[i - 1].level;
    if (diff > 1) gaps.push(hs[i - 1].level);
  }
  return [...new Set(gaps)];
}

export function extractPageSummary(root: Document = document): PageSummary {
  // Discover every reachable open shadow root once and reuse it across all the selector
  // queries below, instead of re-walking the composed tree ~10 times per call.
  const searchRoots = collectSearchRoots(root);
  const queryAll = buildQueryAll(searchRoots);
  const queryFirst = <E extends Element = Element>(selector: string): E | null => {
    for (const r of searchRoots) {
      try {
        const found = r.querySelector<E>(selector);
        if (found) return found;
      } catch {
        // ignore and keep searching other roots
      }
    }
    return null;
  };

  const headings = queryAll("h1, h2, h3, h4, h5, h6")
    .filter(visible)
    .map((heading) => ({
      level: Number(heading.tagName.slice(1)),
      text: labelFor(heading)
    }))
    .filter((heading) => heading.text)
    .slice(0, 40);

  const interactiveElements = queryAll(INTERACTIVE_SELECTOR).filter(visible).slice(0, 160);
  const extractedInteractive = interactiveElements.map(extractElement);
  const textBlocks = queryAll<HTMLElement>("p, li, td, th, label, article, section")
    .filter(visible)
    .map((node) => ({
      text: clampText(node.textContent ?? "", 240),
      fontSize: Math.round(Number.parseFloat(window.getComputedStyle(node).fontSize || "16") * 10) / 10,
      contrastRatio: contrastRatio(node)
    }))
    .filter((block) => block.text.length > 35)
    .slice(0, 60);

  const forms = queryAll("form")
    .filter(visible)
    .slice(0, 20)
    .map((form) => ({
      label: labelFor(form),
      fields: Array.from(form.querySelectorAll("input, select, textarea")).filter(visible).slice(0, 25).map(extractElement),
      buttons: Array.from(form.querySelectorAll("button, input[type='submit'], [role='button']")).filter(visible).slice(0, 12).map(extractElement)
    }));

  const tables = queryAll("table")
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

  const headingGaps = computeHeadingGaps(headings);
  const navDepth = computeNavDepth(queryAll);

  return {
    title: root.title || "Untitled Page",
    url: root.location?.href ?? "",
    language: root.documentElement.lang || "unknown",
    description: queryFirst<HTMLMetaElement>("meta[name='description']")?.content ?? "",
    metadata: meta(queryAll),
    headings,
    navigation: queryAll("nav a[href], header a[href], aside a[href]").filter(visible).slice(0, 50).map(extractElement),
    links: queryAll("a[href]").filter(visible).slice(0, 80).map(extractElement),
    buttons: queryAll("button, [role='button'], input[type='button'], input[type='submit']").filter(visible).slice(0, 80).map(extractElement),
    forms,
    tables,
    textBlocks,
    interactiveElements: extractedInteractive,
    stats: {
      interactiveCount: interactiveElements.length,
      smallTargetCount: extractedInteractive.filter((item) => item.smallTarget).length,
      navCount: queryAll("nav, header nav, aside nav").length,
      formCount: forms.length,
      textBlockCount: textBlocks.length,
      averageFontSize: average(fontSizes),
      lowContrastCount,
      bodyTextLength: (root.body?.innerText ?? root.body?.textContent ?? "").trim().length
    }
  };
}
