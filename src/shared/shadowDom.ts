/**
 * Shadow DOM aware traversal helpers.
 *
 * Native querySelector/querySelectorAll never pierce open shadow roots, so any
 * page analysis built only on those APIs is blind to web-component-heavy pages
 * (React/Angular/Vue apps that use custom elements, design systems, etc).
 *
 * These helpers walk the *composed* tree: the light DOM plus every reachable
 * open shadow root. Closed shadow roots are not accessible from the outside by
 * design (the platform intentionally hides them) - we detect that case and
 * simply skip it rather than throwing.
 */

export type SearchRoot = Document | ShadowRoot;

/** Hard ceiling on shadow nesting depth so a pathological/cyclical structure can never hang the page. */
export const MAX_SHADOW_TRAVERSAL_DEPTH = 12;

/** Hard ceiling on number of shadow roots collected in one pass, as a defensive backstop. */
const MAX_COLLECTED_ROOTS = 500;

function getShadowRootSafe(element: Element): ShadowRoot | null {
  try {
    const shadow = (element as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot;
    if (!shadow) return null;
    // A closed shadow root is not exposed via `.shadowRoot` from the outside at all
    // (the property itself returns null), so reaching this point means it's open.
    // Some custom-element polyfills may still expose a `mode` field - respect it if present.
    if ("mode" in shadow && (shadow as ShadowRoot).mode === "closed") return null;
    return shadow;
  } catch {
    // Some exotic/broken custom elements throw on property access. Fail gracefully.
    return null;
  }
}

function safeQueryAllElements(root: SearchRoot): Element[] {
  try {
    return Array.from(root.querySelectorAll("*"));
  } catch {
    return [];
  }
}

/**
 * Breadth-first discovery of every open shadow root reachable from `root`,
 * including `root` itself. A visited set guarantees each shadow root is only
 * ever traversed once, and the depth/count ceilings guarantee termination
 * even on adversarial or accidentally-cyclical component trees.
 */
export function collectSearchRoots(
  root: SearchRoot = document,
  maxDepth: number = MAX_SHADOW_TRAVERSAL_DEPTH
): SearchRoot[] {
  const roots: SearchRoot[] = [root];
  const visited = new Set<SearchRoot>([root]);
  let frontier: SearchRoot[] = [root];
  let depth = 0;

  while (frontier.length > 0 && depth < maxDepth && roots.length < MAX_COLLECTED_ROOTS) {
    const next: SearchRoot[] = [];

    for (const current of frontier) {
      for (const el of safeQueryAllElements(current)) {
        const shadow = getShadowRootSafe(el);
        if (shadow && !visited.has(shadow)) {
          visited.add(shadow);
          roots.push(shadow);
          next.push(shadow);
          if (roots.length >= MAX_COLLECTED_ROOTS) break;
        }
      }
      if (roots.length >= MAX_COLLECTED_ROOTS) break;
    }

    frontier = next;
    depth += 1;
  }

  return roots;
}

/** querySelectorAll across the light DOM and every reachable open shadow root. */
export function queryDeepAll<E extends Element = Element>(
  selector: string,
  root: SearchRoot = document,
  maxDepth?: number
): E[] {
  const roots = collectSearchRoots(root, maxDepth);
  const results: E[] = [];
  for (const r of roots) {
    try {
      results.push(...Array.from(r.querySelectorAll<E>(selector)));
    } catch {
      // Invalid selector for this root or root became inaccessible - skip it.
    }
  }
  return results;
}

/** querySelector across the light DOM and every reachable open shadow root (first match wins). */
export function queryDeepFirst<E extends Element = Element>(
  selector: string,
  root: SearchRoot = document,
  maxDepth?: number
): E | null {
  const roots = collectSearchRoots(root, maxDepth);
  for (const r of roots) {
    try {
      const found = r.querySelector<E>(selector);
      if (found) return found;
    } catch {
      // ignore and keep searching other roots
    }
  }
  return null;
}

/** The Document or ShadowRoot a node actually lives in (correctly resolves nodes inside shadow trees). */
export function getElementSearchRoot(node: Node): SearchRoot {
  try {
    const root = node.getRootNode();
    if (root instanceof ShadowRoot) return root;
    return node.ownerDocument ?? document;
  } catch {
    return document;
  }
}

/**
 * Correctly determines whether a node is actually part of the live document,
 * including nodes that live inside an attached shadow tree.
 *
 * `Document.prototype.contains()` is NOT shadow-aware: a node inside an open
 * shadow root that is itself attached to the document will still report as
 * "not contained" by `document.contains()`, because shadow trees are not part
 * of the regular document tree. `Node.isConnected` is defined in terms of the
 * composed tree and gives the correct answer in both light and shadow DOM.
 */
export function isElementConnected(node: Node | null | undefined): boolean {
  if (!node) return false;
  try {
    return node.isConnected;
  } catch {
    return false;
  }
}
