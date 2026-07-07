/**
 * NeuroAdapt AI — Content Script Orchestrator (v3 — accuracy pass)
 *
 * Loaded into every frame (top-level + iframes) after document_idle.
 * Engine modules declared before this file in the manifest expose themselves
 * on window.NeuroAdaptEngine: { Pruner, Observer, TargetRanker, Highlighter }
 *
 * Accuracy overhaul (v3):
 *  - NA_RANK: multi-hint expansion — ranks against targetHint + alternatives
 *    and merges by best score per element, catching synonym/paraphrase misses.
 *  - NA_RANK: serialised candidates now include htmlSnippet, zone, dataAttrs
 *    so Gemini sees actual HTML markup rather than fragmented key-value pairs.
 *  - NA_RANK: accepts elementType and preferredZone from step metadata and
 *    forwards them to the ranker for zone-preference scoring.
 *  - NA_LLM_IDENTIFY: forwards stepMeta (elementType, zone, alternatives) to
 *    background so the LLM prompt can use expected-type context.
 *
 * Changes from v1:
 *  - NA_RANK: stale DOM ref fix after LLM call.
 *  - NA_RANK: click-detection for auto step advance.
 *  - Debug logging: set window.NA_DEBUG = true in DevTools to enable.
 */

console.log('[NeuroAdapt] Content script v3 loaded in frame:', window.location.href);

// ── Internal benchmark metrics ─────────────────────────────────────────────
// Each entry is one rank() call. Read from DevTools: window.__naMetrics
window.__naMetrics = window.__naMetrics || [];

if (window.__naInitialised) {
  console.log('[NeuroAdapt] Already initialised in this frame — skipping.');
} else {
  window.__naInitialised = true;
  initNeuroAdapt();
}

// ── Debug helper ──────────────────────────────────────────────────────────────

function dbg(stage, data) {
  if (!window.NA_DEBUG) return;
  console.group(`%c[NeuroAdapt:${stage}]`, 'color:#34d399;font-weight:700');
  if (typeof data === 'object' && data !== null) {
    try { console.table(data); } catch { console.log(data); }
  } else {
    console.log(data);
  }
  console.groupEnd();
}

function initNeuroAdapt() {
  const E = window.NeuroAdaptEngine;

  const pruner      = new E.Pruner();
  const highlighter = new E.Highlighter();
  const ranker      = new E.TargetRanker();

  // Initial prune — tree is ready before any message arrives
  let tree = pruner.prune();

  // ── MutationObserver — keep tree fresh ───────────────────────────────────
  const observer = new E.Observer((_mutations) => {
    tree = pruner.prune();
    console.log('[NeuroAdapt] Tree refreshed after DOM mutation:', tree.length, 'elements');
    try {
      chrome.runtime.sendMessage({ type: 'NA_TREE_UPDATED', frame: window.location.href })
        .catch(() => {});
    } catch (_) { /* extension context invalidated */ }
  });

  observer.observe(document.body);

  // ── Message listener ───────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('[NeuroAdapt] Message received:', message.type);

    switch (message.type) {

      // ── Health check ────────────────────────────────────────────────────
      case 'NA_PING':
        sendResponse({ ok: true, frame: window.location.href });
        break;

      // ── Return the current pruned tree ──────────────────────────────────
      case 'NA_PRUNE': {
        tree = pruner.prune();
        sendResponse({
          ok:    true,
          frame: window.location.href,
          tree:  pruner.serialise(),
          count: tree.length,
        });
        break;
      }

      // ── Rank elements against a target hint + highlight the winner ──────
      case 'NA_RANK': {
        const {
          targetHint,
          tooltip,
          minScore      = 40,
          alternatives  = [],   // additional hint phrasings for multi-hint expansion
          elementType   = null, // expected HTML element type from step metadata
          detectModal   = false, // if true, auto-override zone when a modal is open
        } = message;

        // Modal/dialog detection: if an open dialog is present on the page,
        // override preferredZone to 'modal' so the ranker weights modal elements
        // higher. This prevents background-page elements from winning when the
        // user needs to interact with a dialog.
        let preferredZone = message.preferredZone ?? null;
        if (detectModal && !preferredZone) {
          const openModal = document.querySelector(
            '[role="dialog"]:not([aria-hidden="true"]),' +
            '[role="alertdialog"]:not([aria-hidden="true"])'
          );
          if (!openModal) {
            // Class-based modal detection as fallback
            const classModal = document.querySelector(
              '.modal.show,.modal.active,.modal[open],' +
              '.dialog.active,.drawer.active,.sheet.active'
            );
            if (classModal) preferredZone = 'modal';
          } else {
            preferredZone = 'modal';
          }
          if (preferredZone === 'modal') {
            console.log('[NeuroAdapt] Modal detected — overriding preferredZone to modal.');
          }
        }

        if (!targetHint) {
          sendResponse({ ok: false, error: 'targetHint is required' });
          return false;
        }

        (async () => {
          const t0 = performance.now();

          // Fresh prune before ranking
          tree = pruner.prune();
          const tPrune = performance.now() - t0;

          // ── Stage 1: multi-hint expansion ──────────────────────────────
          // Rank against all hint phrasings (main + alternatives) and merge
          // by best score per element. This handles synonym/paraphrase misses
          // that a single-hint ranking would miss entirely.
          const allHints    = [targetHint, ...alternatives.slice(0, 3)];
          const stepMeta    = { preferredZone, elementType };
          const mergedScores = new Map(); // ref → { node, score, reasons }

          for (const h of allHints) {
            for (const { node, score, reasons } of ranker.rank(tree, h, stepMeta)) {
              const cur = mergedScores.get(node.ref);
              if (!cur || score > cur.score) {
                mergedScores.set(node.ref, { node, score, reasons });
              }
            }
          }

          let candidates = [...mergedScores.values()]
            .sort((a, b) => b.score - a.score)
            .slice(0, 30);

          const tRank = performance.now() - t0 - tPrune;

          // ── Early exit if page is empty ─────────────────────────────────────
          if (tree.length === 0) {
            highlighter.clear();
            sendResponse({
              ok: true, frame: window.location.href,
              topRef: null, topScore: 0, confident: false, source: 'none',
            });
            return;
          }

          // ── Universal viewport supplement ───────────────────────────────────
          // ALWAYS include every in-viewport interactive element in the LLM pool,
          // regardless of keyword score. The LLM understands any language,
          // custom terminology, or icon-only button through HTML snippets alone.
          // Keyword matching only helps rank — it must never be the reason the
          // correct element is excluded from the LLM's view.
          {
            const seenRefs = new Set(candidates.map((c) => c.node.ref));
            const viewportSupp = tree
              .filter((n) => n.inViewport && !seenRefs.has(n.ref))
              .sort((a, b) => (a.rect?.top ?? 0) - (b.rect?.top ?? 0))
              .slice(0, 25); // cap: 30 scored + 25 supplement = ≤55 total for LLM

            if (viewportSupp.length) {
              candidates = [
                ...candidates,
                ...viewportSupp.map((n) => ({ node: n, score: 0, reasons: ['in-viewport'] })),
              ];
              console.log(
                `[NeuroAdapt] Viewport supplement: +${viewportSupp.length} elements ` +
                `(${candidates.length} total candidates)`
              );
            }
          }

          // ── Absolute fallback ───────────────────────────────────────────────
          // If nothing is in-viewport (initial scroll position, hidden panel),
          // fall back to the top visible elements sorted by interactivity.
          if (!candidates.length) {
            const INTERACTIVE = new Set(['button','a','input','select','textarea']);
            const fallback = [...tree]
              .sort((a, b) => {
                const aVp = a.inViewport ? 1 : 0;
                const bVp = b.inViewport ? 1 : 0;
                if (aVp !== bVp) return bVp - aVp;
                const aI = INTERACTIVE.has(a.tag) ? 1 : 0;
                const bI = INTERACTIVE.has(b.tag) ? 1 : 0;
                if (aI !== bI) return bI - aI;
                return (a.rect?.top ?? 0) - (b.rect?.top ?? 0);
              })
              .slice(0, 20);
            candidates = fallback.map((n) => ({ node: n, score: 0, reasons: ['fallback-pool'] }));
            console.log(`[NeuroAdapt] No viewport elements — fallback pool: ${candidates.length}`);
          }

          // ── Stage 2: LLM identification ─────────────────────────────────
          // Candidates now include htmlSnippet, zone, and dataAttrs so the
          // LLM can reason about actual HTML markup rather than fragmented
          // key-value pairs.
          const serialised = candidates.map(({ node, score }) => ({
            ref:           node.ref,
            tag:           node.tag,
            type:          node.type,
            role:          node.role,
            label:         node.label,
            ariaLabel:     node.ariaLabel,
            placeholder:   node.placeholder,
            name:          node.name,
            id:            node.id,
            href:          node.href,
            parentHeading: node.parentHeading,
            htmlSnippet:   node.htmlSnippet   ?? null,  // NEW: compact HTML for LLM
            zone:          node.zone          ?? null,  // NEW: page zone
            dataAttrs:     node.dataAttrs     ?? null,  // NEW: data-testid, data-cy, etc.
            rect:          node.rect,
            inViewport:    node.inViewport,
            score,
          }));

          dbg('RANK_CANDIDATES', {
            hint:           targetHint,
            alternatives,
            candidateCount: candidates.length,
            prunedTotal:    tree.length,
            pruneMs:        tPrune.toFixed(1),
            rankMs:         tRank.toFixed(1),
            top5:           candidates.slice(0, 5).map((c) => ({
              ref:   c.node.ref, label: c.node.label,
              tag:   c.node.tag, score: c.score, zone: c.node.zone,
            })),
          });

          const llmResult = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
              {
                type:       'NA_LLM_IDENTIFY',
                // Use full step description as "user intent" so the LLM has context
                // (e.g. "Click the Sign in button") while targetLabel in stepMeta
                // gives the exact label to match ("Sign in").
                hint:       tooltip || targetHint,
                candidates: serialised,
                pageUrl:    window.location.href,
                pageTitle:  document.title,
                stepMeta:   { targetLabel: targetHint, elementType, zone: preferredZone, alternatives },
              },
              (r) => resolve(chrome.runtime.lastError ? null : r)
            );
          });

          const tLlm = performance.now() - t0 - tPrune - tRank;

          // ── Pick winner ─────────────────────────────────────────────────
          let winRef, winScore, winLabel, winSource;

          if (llmResult?.ref) {
            winRef    = llmResult.ref;
            winScore  = llmResult.confidence ?? 80;
            winLabel  = candidates.find((c) => c.node.ref === winRef)?.node?.label ?? winRef;
            winSource = 'llm';
            console.log(`[NeuroAdapt] LLM winner: "${winLabel}" (${winScore}%) — ${llmResult.reason}`);
          } else {
            // LLM unavailable or returned null — use top-ranked deterministic candidate.
            // This is the normal path when no API key is configured.
            const top = candidates[0];
            winRef    = top.node.ref;
            winScore  = top.score;
            winLabel  = top.node.label;
            winSource = 'deterministic';
            console.log(
              `[NeuroAdapt] Deterministic winner: "${winLabel}" <${top.node.tag}> ` +
              `score=${winScore} zone=${top.node.zone ?? 'n/a'}`
            );
          }

          dbg('LLM_RESULT', {
            source: winSource, ref: winRef, label: winLabel, score: winScore,
            llmReason: llmResult?.reason ?? '(deterministic fallback)',
            llmMs: tLlm.toFixed(1),
            totalMs: (performance.now() - t0).toFixed(1),
          });

          const confident = winScore >= minScore;

          if (confident) {
            // ── Stale ref fix ─────────────────────────────────────────────
            // The LLM call took 2–8s. The DOM may have changed.
            // Re-verify the element is still connected before highlighting.
            // If detached, re-prune and match by (tag, label, type) identity.

            const freshTree = pruner.prune();
            tree = freshTree;

            let winNode = freshTree.find((n) => n.ref === winRef);

            if (!winNode || !document.contains(winNode.element)) {
              const winCand = candidates.find((c) => c.node.ref === winRef);
              if (winCand) {
                const { tag, label, type, id } = winCand.node;
                winNode =
                  (id && freshTree.find((n) => n.id === id && n.tag === tag)) ||
                  (label && freshTree.find((n) => n.tag === tag && n.label === label && (type == null || n.type === type))) ||
                  freshTree.find((n) => n.tag === tag && (type == null || n.type === type));
                if (winNode) {
                  console.log('[NeuroAdapt] Stale ref — re-matched by identity:', winNode.ref);
                }
              }
            }

            // ── Post-selection validation ──────────────────────────────────
            // Verify the element is still visible and enabled. If it fails,
            // attempt recovery: find the next valid candidate from the pool.
            let validationStatus = validateElement(winNode?.element);

            if (validationStatus !== 'ok') {
              console.warn(
                `[NeuroAdapt] Validation failed (${validationStatus}) for "${winLabel}" — ` +
                'attempting recovery from candidate pool.'
              );

              // Recovery: walk down the candidate list and pick the first valid one
              let recovered = false;
              for (const cand of candidates.slice(1)) {
                const freshNode = freshTree.find((n) => n.ref === cand.node.ref);
                if (!freshNode) continue;
                const vs = validateElement(freshNode.element);
                if (vs === 'ok') {
                  const prevStatus = validationStatus;
                  winNode   = freshNode;
                  winRef    = freshNode.ref;
                  winLabel  = freshNode.label;
                  winScore  = Math.max(0, cand.score - 10); // penalty for recovery
                  validationStatus = 'ok';
                  recovered = true;
                  console.log(
                    `[NeuroAdapt] Recovery: using "${winLabel}" <${winNode.tag}> ` +
                    `score=${winScore} (recovered from ${prevStatus} winner)`
                  );
                  break;
                }
              }

              if (!recovered) {
                console.warn('[NeuroAdapt] Recovery failed — no valid candidate. Falling back to HITL.');
                highlighter.clear();
                sendResponse({
                  ok: true, frame: window.location.href,
                  topRef: null, topScore: 0, confident: false, source: 'validation-failed',
                  validationStatus,
                });
                return;
              }
            }

            if (winNode?.element && document.contains(winNode.element)) {
              observer.pauseAround(() => {
                highlighter.highlight(winNode.element, {
                  tooltip: tooltip ?? targetHint,
                  score:   winScore,
                  scroll:  true,
                });
              });

              winNode.element.addEventListener('click', () => {
                try {
                  chrome.runtime.sendMessage({ type: 'NA_ELEMENT_CLICKED' }).catch(() => {});
                } catch (_) { /* extension context invalidated */ }
              }, { once: true, passive: true });

            } else {
              highlighter.clear();
              console.warn('[NeuroAdapt] Winner element is no longer in DOM — clearing highlight.');
            }

          } else {
            highlighter.clear();
            console.log(`[NeuroAdapt] Low confidence (${winScore}) — HITL fallback needed.`);
          }

          const totalMs = (performance.now() - t0).toFixed(1);

          // Record benchmark entry for this step
          window.__naMetrics.push({
            ts:             Date.now(),
            hint:           targetHint,
            prunedTotal:    tree.length,
            candidateCount: candidates.length,
            pruneMs:        +tPrune.toFixed(1),
            rankMs:         +tRank.toFixed(1),
            llmMs:          +tLlm.toFixed(1),
            totalMs:        +totalMs,
            topScore:       winScore,
            topLabel:       winLabel,
            source:         winSource,
            confident,
          });

          sendResponse({
            ok:       true,
            frame:    window.location.href,
            topRef:   winRef,
            topScore: winScore,
            topLabel: winLabel,
            confident,
            source:   winSource,
            ranked:   candidates.slice(0, 5).map(({ node: n, score: s, reasons: r }) =>
              ({ ref: n.ref, label: n.label, tag: n.tag, score: s, reasons: r })
            ),
            metrics: {
              prunedTotal:    tree.length,
              candidateCount: candidates.length,
              pruneMs:        tPrune.toFixed(1),
              rankMs:         tRank.toFixed(1),
              llmMs:          tLlm.toFixed(1),
              totalMs,
            },
          });
        })();

        return true; // keep channel open for async sendResponse
      }

      // ── Page context snapshot (for generateSteps) ───────────────────────
      // Returns actual UI element labels from the live page so the LLM can
      // generate steps that reference exact button text / input placeholders.
      // Uses the pruner tree (single querySelectorAll) instead of 5 separate
      // DOM walks — eliminates duplicate label resolution logic.
      case 'NA_GET_PAGE_CONTEXT': {
        const freshTree = pruner.prune();
        tree = freshTree;

        const uniq = (arr) => [...new Set(arr.filter(Boolean))];

        // Headings still need a separate query (not in the interactive tree)
        const headings = uniq(
          [...document.querySelectorAll('h1,h2,h3,[role="heading"]')]
            .map((el) => el.innerText?.trim().slice(0, 60))
        ).slice(0, 8);

        // Buttons and links — from pruner tree (already resolved labels)
        const buttons = uniq(
          freshTree
            .filter((n) =>
              n.role === 'button' || n.role === 'link' ||
              n.tag === 'a' ||
              (n.tag === 'input' && ['submit', 'button', 'image'].includes(n.type))
            )
            .map((n) => n.label)
            .filter((t) => t && t.length > 0 && t.length < 50)
        ).slice(0, 25);

        // Inputs — from pruner tree
        const inputs = uniq(
          freshTree
            .filter((n) =>
              ['textbox', 'searchbox', 'combobox', 'spinbutton', 'slider'].includes(n.role) ||
              ['input', 'textarea', 'select'].includes(n.tag)
            )
            .map((n) => n.label)
            .filter(Boolean)
        ).slice(0, 15);

        // Tabs / menu items — from pruner tree
        const tabs = uniq(
          freshTree
            .filter((n) => ['tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio'].includes(n.role))
            .map((n) => n.label)
            .filter((t) => t && t.length > 0 && t.length < 50)
        ).slice(0, 10);

        // Links with text — still a separate query to catch non-interactive <a> tags
        const links = uniq(
          [...document.querySelectorAll('a[href]')]
            .filter((el) => {
              try {
                const s = window.getComputedStyle(el);
                return s.display !== 'none' && el.innerText?.trim().length > 0;
              } catch { return true; }
            })
            .map((el) => el.innerText.trim().replace(/\s+/g, ' ').slice(0, 50))
            .filter((t) => t.length > 1 && t.length < 50)
        ).slice(0, 20);

        sendResponse({
          ok: true,
          frame: window.location.href,
          pageUrl: window.location.href,
          pageTitle: document.title,
          headings,
          buttons,
          links,
          inputs,
          tabs,
        });
        break;
      }

      // ── Remove highlight ────────────────────────────────────────────────
      case 'NA_CLEAR_HIGHLIGHT':
        highlighter.clear();
        sendResponse({ ok: true });
        break;

      // ── HITL: one-time click capture ────────────────────────────────────
      case 'NA_CAPTURE_CLICK': {
        attachClickCapture(sendResponse);
        return true;
      }

      default:
        sendResponse({ ok: false, error: `Unknown message type: ${message.type}` });
    }

    return true;
  });

  console.log('[NeuroAdapt] Engine v3 initialised. Tree size:', tree.length);
}

// ── Post-selection validation ─────────────────────────────────────────────────

/**
 * Verify the selected element is still actionable before highlighting it.
 * Returns one of: 'ok' | 'disabled' | 'hidden' | 'detached'
 */
function validateElement(el) {
  if (!el || !document.contains(el)) return 'detached';
  try {
    const style = window.getComputedStyle(el);
    if (style.display    === 'none')           return 'hidden';
    if (style.visibility === 'hidden')         return 'hidden';
    if (parseFloat(style.opacity) === 0)       return 'hidden';
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return 'hidden';
    if (el.disabled)                           return 'disabled';
    if (el.getAttribute('aria-disabled') === 'true') return 'disabled';
  } catch { return 'detached'; }
  return 'ok';
}

// ── HITL click capture ────────────────────────────────────────────────────────

let _clickCaptureActive = false;

function attachClickCapture(sendResponse) {
  if (_clickCaptureActive) {
    sendResponse({ ok: false, error: 'Click capture already active.' });
    return;
  }
  _clickCaptureActive = true;
  document.body.classList.add('na-hitl-cursor');
  console.log('[NeuroAdapt] HITL: waiting for user click…');

  function onCapture(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    document.body.classList.remove('na-hitl-cursor');
    _clickCaptureActive = false;

    const el     = evt.target;
    const rect   = el.getBoundingClientRect();
    const result = {
      ok:        true,
      frame:     window.location.href,
      tag:       el.tagName.toLowerCase(),
      id:        el.id || null,
      text:      el.innerText?.trim().slice(0, 80) || null,
      ariaLabel: el.getAttribute('aria-label') || null,
      rect: {
        top:    Math.round(rect.top),
        left:   Math.round(rect.left),
        width:  Math.round(rect.width),
        height: Math.round(rect.height),
      },
      xpath: getXPath(el),
    };

    console.log('[NeuroAdapt] HITL: user clicked', result.tag, result.text ?? result.id ?? '');
    sendResponse(result);
  }

  document.addEventListener('click', onCapture, { once: true, capture: true });
}

function getXPath(el) {
  const parts = [];
  let node = el;
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sib   = node.previousSibling;
    while (sib) {
      if (sib.nodeType === Node.ELEMENT_NODE && sib.tagName === node.tagName) index++;
      sib = sib.previousSibling;
    }
    parts.unshift(`${node.tagName.toLowerCase()}[${index}]`);
    node = node.parentNode;
  }
  return '/' + parts.join('/');
}
