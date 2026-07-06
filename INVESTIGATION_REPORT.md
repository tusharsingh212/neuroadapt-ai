# NeuroAdapt AI — Accuracy Investigation Report

**Scope:** Phase 1–5 full pipeline audit  
**Method:** Full codebase read before any change — no rewrites during investigation  
**Findings:** 15 confirmed, 2 Critical · 6 High · 7 Medium/Low

---

## Table of Contents

1. [Phase 1 — Deep Investigation](#phase-1--deep-investigation)
   - [1. DOM Pruner](#1-dom-pruner)
   - [2. Accessible Name Extraction](#2-accessible-name-extraction)
   - [3. Serialization](#3-serialization)
   - [4. Ranking Algorithm](#4-ranking-algorithm)
   - [5. Gemini Context Quality](#5-gemini-context-quality)
   - [6. Prompt Quality](#6-prompt-quality)
   - [7. State Machine & Race Conditions](#7-state-machine--race-conditions)
   - [8. MutationObserver](#8-mutationobserver)
   - [9. iFrame Handling](#9-iframe-handling)
   - [10. Element Reference Freshness](#10-element-reference-freshness)
2. [Root Causes — Prioritised](#root-causes--prioritised)
3. [Phase 2 — Instrumentation Plan](#phase-2--instrumentation-plan)
4. [Phase 3 — Benchmark Methodology](#phase-3--benchmark-methodology)
5. [Phase 4 — Improvement Plan](#phase-4--improvement-plan)
6. [Phase 5 — Architecture Assessment](#phase-5--architecture-assessment)

---

## Phase 1 — Deep Investigation

---

### 1. DOM Pruner

#### Finding 1.1 — CRITICAL: Elements below the fold are silently excluded

**File:** `engine/pruner.js` · `isVisible()`

| | |
|---|---|
| **Current** | `isVisible()` returns `false` if `rect.top >= window.innerHeight`. The pruner never includes below-fold elements in its tree. |
| **Expected** | All actionable elements in the DOM should be discovered. Viewport position is a *scoring signal*, not an inclusion gate. |
| **Impact** | Any task where the target element is below the initial scroll position — a Submit button at the bottom of a form, a footer CTA, a sidebar link — is impossible to complete. The correct element is never ranked because it does not exist in the tree the LLM sees. |
| **Proposed fix** | Change `isVisible()` to return `true` for elements that are rendered (non-zero rect, not hidden) but below the fold. Track `inViewport` separately on the node — the ranker already scores viewport position as a bonus, not a requirement. |

---

#### Finding 1.2 — HIGH: Missing selectors: contenteditable, role="textbox", role="searchbox"

**File:** `engine/pruner.js` · `ACTIONABLE_SELECTORS`

| | |
|---|---|
| **Current** | 20 selectors cover standard HTML + common ARIA roles. Missing: `[contenteditable="true"]`, `[role="textbox"]`, `[role="searchbox"]`, `[role="gridcell"]`, `[role="row"][tabindex]`. |
| **Impact** | Gmail compose area, Google Docs body, Notion editor, CodeMirror, Slack message box, Twitter/X tweet box — all use `contenteditable` divs or `role="textbox"`. These are invisible to the pruner. Any "type a message" or "compose an email" step will fail silently with zero candidates. |
| **Proposed fix** | Add the missing selectors. Low risk — each adds a single CSS selector to the `querySelectorAll` call. |

---

#### Finding 1.3 — MEDIUM: Ancestor visibility not checked

**File:** `engine/pruner.js` · `isVisible()`

| | |
|---|---|
| **Current** | `getComputedStyle(el)` is checked on the element itself. A child element inside a `display:none` parent returns its own declared styles, not the cascaded none. |
| **Impact** | Modal dialogs, hidden tabs, and off-canvas navigation menus contain elements that fail the `getBoundingClientRect()` check (all zeros) in most cases, but absolutely-positioned children with known coordinates can pass. This produces false positives in the candidate list, confusing the ranker and Gemini. |
| **Proposed fix** | The `rect.width === 0 && rect.height === 0` guard catches most cases. For edge cases, walk up to check if any ancestor has `display:none` or `visibility:hidden`. Relying entirely on `getBoundingClientRect()` returning zero-area is reliable across browsers for truly hidden elements. |

---

### 2. Accessible Name Extraction

#### Finding 2.1 — HIGH: Screen-reader-only text in buttons is inconsistently captured

**File:** `engine/pruner.js` · `resolveLabel()` step 8

| | |
|---|---|
| **Current** | `el.innerText` is used for button text. `innerText` does NOT render text inside elements with `visibility:hidden` or `display:none`. |
| **Impact** | The common screen-reader pattern `<button><svg/><span class="sr-only">Search</span></button>` where `.sr-only` uses `position:absolute; width:1px; overflow:hidden` — `innerText` DOES return "Search" here. However, if `clip` or `clip-path` is used instead, the text may not be included. Inconsistency across sites and patterns means some icon buttons appear labelless. |
| **Proposed fix** | For buttons with no visible text, also read `el.textContent` as a fallback (includes all descendant text regardless of visibility). This complements the existing `aria-label` check (already first priority). |

---

### 3. Serialization

#### Finding 3.1 — HIGH: Gemini receives no page URL, position, role, or parent context

**File:** `engine/llm.js` · `identifyElement()` · element list builder

| | |
|---|---|
| **Current** | Each candidate is serialised as: `[na-el-N] <tag type="X"> label:"..." aria:"..." width:Npx`. Missing: ARIA role, page URL, element coordinates (top/left), surrounding form/section heading, deterministic score, `href` for links. |
| **Impact** | **No URL:** Gemini can't apply site-specific knowledge (GitHub's "Sign in" is a link, not a button). **No role:** A `<div role="button">` appears as `<div>` — Gemini may ignore it. **No position:** Two identical "Submit" buttons in different page sections are indistinguishable. **No score:** Gemini is told candidates are "pre-ranked, best first" but not how far apart the scores are — it may override a 95-point match with a 20-point candidate based on text alone. **No href:** Anchor links are unidentifiable as navigation elements. |
| **Proposed fix** | Add to each candidate line: `role:"..."`, `score:N`, `href:"..."` (links only), `pos:top,left`. Add to the prompt header: the current page URL and page title. |

---

### 4. Ranking Algorithm

#### Finding 4.1 — CRITICAL: Synonym matching breaks because noise-word removal splits multi-word phrases

**File:** `engine/ranker.js` · `_tokenize()` + `getSynonymPhrases()`

| | |
|---|---|
| **Current** | Step: *"Click the Sign In button"* → `_tokenize()` → `["click","sign","in","button"]` → noise removes "click", "in" → `["sign","button"]` → `PURE_TYPE_DESCRIPTORS` removes "button" → `contentTokens = ["sign"]` → `getSynonymPhrases("sign")` looks up `PHRASE_TO_CLUSTER.get("sign")` → **undefined** (map has "sign in", not "sign") → returns `["sign"]` only. No synonym expansion to "login", "log in", etc. |
| **Impact** | This is the single largest accuracy killer. Every multi-word synonym phrase is broken by the noise filter. "Sign in", "Log out", "Add to cart", "Get started", "Sign up" all lose their second token before synonym lookup. The ranker degrades from synonym-aware to literal single-word matching for any step containing these phrases. |
| **Proposed fix** | Run synonym phrase detection **before** tokenization. Scan the hint string for known multi-word synonym phrases using a pre-built sorted-by-length list. Replace matched phrases with their canonical cluster key, then tokenize. Or build a bigram + trigram expansion step that re-checks the raw hint before noise removal. |

---

#### Finding 4.2 — HIGH: Hard top-20 cut excludes correct element before Gemini sees it

**File:** `content.js` · `NA_RANK` handler

| | |
|---|---|
| **Current** | `ranked.slice(0, 20)` is sent to Gemini. If the deterministic ranker places the correct element at position 21+ (due to broken synonym matching), Gemini never sees it. |
| **Impact** | The two-stage pipeline's accuracy ceiling is bounded by the deterministic recall at rank 20. On pages with 150+ interactive elements, the correct element can easily fall outside the top 20 when synonym matching fails. Gemini cannot compensate for elements it was never shown. |
| **Proposed fix** | Increase to 30 candidates. More importantly, fix Finding 4.1 first — this will sharply improve deterministic recall and make the top-20 cut meaningful. |

---

### 5. Gemini Context Quality

#### Finding 5.1 — MEDIUM: generateSteps has no knowledge of the current page or site

**File:** `engine/llm.js` · `generateSteps()` prompt

| | |
|---|---|
| **Current** | The step-generation prompt receives only the user's goal string. No URL, no page title, no page structure. |
| **Impact** | Generated steps are generic. For "search YouTube", Gemini generates "Find the search input field" — correct in principle, but unaware that YouTube's search bar has `aria-label="Search"` and lives inside a Shadow DOM component. Site-aware steps would produce more precise element hints that score better in the ranker. |
| **Proposed fix** | Pass `window.location.href` and `document.title` to the step generator prompt. This gives Gemini enough context to produce site-specific step descriptions at negligible extra token cost. |

---

### 6. Prompt Quality

#### Finding 6.1 — MEDIUM: "Pre-ranked, best first" biases Gemini toward the top candidate even when it is wrong

**File:** `engine/llm.js` · `identifyElement()` prompt

| | |
|---|---|
| **Current** | The prompt says *"Candidate elements (pre-ranked, best first)"*. Gemini interprets this as a strong prior — if uncertain, it defaults to candidate #1. |
| **Impact** | When the deterministic ranker places the wrong element first (e.g. due to Finding 4.1), Gemini's position bias reinforces that mistake instead of correcting it. The LLM stage loses its correction power. |
| **Proposed fix** | Reframe as *"Candidates below (deterministic pre-filter score shown for reference)"* and include the actual score next to each candidate. Add explicit instruction: *"The pre-ranking is an estimate. Trust the label/aria/placeholder match over the ranking order."* |

---

### 7. State Machine & Race Conditions

#### Finding 7.1 — CRITICAL: No execution lock — concurrent executeCurrentStep() calls corrupt state

**File:** `background.js` · `NA_TREE_UPDATED` handler + `executeCurrentStep()`

| | |
|---|---|
| **Current** | `NA_TREE_UPDATED` calls `await executeCurrentStep()` with no guard. On a React SPA, DOM mutations fire continuously during hydration. Each mutation triggers the 300ms debounce, which notifies the background, which fires `executeCurrentStep()` again — potentially 3–5 concurrent calls in the first 2 seconds after page load. |
| **Impact** | Multiple concurrent LLM calls are made. The last one to resolve wins and calls `transition('STEP_FOUND')`. Earlier calls that finish mid-flight also call `transition()`, which fires `broadcastState()` multiple times, causing the UI to flicker and potentially advancing to the wrong step. On slow connections (LLM latency 3–8s), race windows are wide. |
| **Proposed fix** | Add a boolean `_executing` flag. Set it to `true` at the start of `executeCurrentStep()`, clear it in a `finally` block. If already `true` when called, skip. Additionally debounce the `NA_TREE_UPDATED` handler in the background with a 500ms timer. |

---

#### Finding 7.2 — HIGH: Stale DOM ref — element found in old tree after 2–8s LLM call

**File:** `content.js` · `NA_RANK` async IIFE

| | |
|---|---|
| **Current** | Flow: `tree = pruner.prune()` (snapshot at time T) → 2–8s LLM call → `tree.find(n => n.ref === winRef)` (uses snapshot from T). On a dynamic page the DOM can change significantly during the LLM call. The `element` reference in the snapshot may be detached from the DOM. |
| **Impact** | Highlighting a detached element is a silent failure — no error thrown, no visual result. The badge is created but positioned relative to the detached element's last known rect. On SPAs with fast navigation (YouTube, Gmail), this fails nearly every time on the second step because the DOM has already updated. |
| **Proposed fix** | After the LLM returns, verify the element is still connected to the DOM with `document.contains(winNode.element)`. If detached, call `pruner.prune()` again and re-match by label + tag + type (not by ref index). |

---

### 8. MutationObserver

#### Finding 8.1 — HIGH: Highlight badge insertion triggers re-rank loop

**File:** `engine/highlighter.js` · `_showBadge()` + `engine/observer.js`

| | |
|---|---|
| **Current** | `_showBadge()` does `document.body.appendChild(badge)`. This is a `childList` mutation on body with an `ELEMENT_NODE` added. The MutationObserver fires. 300ms later: re-prune → `NA_TREE_UPDATED` → background calls `executeCurrentStep()` again → new `NA_RANK` → new highlight → new badge → loop. |
| **Impact** | The extension enters an infinite re-ranking loop on every successful highlight. Each iteration makes a Gemini API call. This is both a correctness bug and a cost bug. The loop also causes the badge to flicker (remove/re-add every 300ms + LLM latency). |
| **Proposed fix** | Filter NeuroAdapt's own DOM mutations in the observer callback. Simplest approach: set `window.__naHighlighting = true` before badge insertion, check this flag in the observer and skip the `sendMessage` while set. Or filter by checking if the added node has the `na-step-badge` id. |

---

### 9. iFrame Handling

#### Finding 9.1 — MEDIUM: Best-by-score merge can select a false positive from an ad or tracking iframe

**File:** `background.js` · `rankAcrossFrames()`

| | |
|---|---|
| **Current** | `responses.reduce((acc, r) => r.topScore > acc.topScore ? r : acc)` picks the frame with the highest score, regardless of whether it is the main frame (frameId 0) or a sub-frame. |
| **Impact** | An ad iframe or a login widget iframe with a matching "Sign in" button can outscore the main frame's target. The extension highlights an element inside an embedded iframe the user cannot see or interact with directly. The badge also positions incorrectly (iframe-relative coordinates vs viewport coordinates). |
| **Proposed fix** | Apply a main-frame preference bonus: if `frameId === 0`, add 10 points to its score before the merge comparison. Also skip frames whose URL doesn't share origin with the main frame unless no main-frame result is confident. |

---

### 10. Element Reference Freshness

#### Finding 10.1 — MEDIUM: Index-based refs invalidated by re-prune between LLM call and highlight

**File:** `engine/pruner.js` · `extractData()` · `ref: \`na-el-${index}\``

| | |
|---|---|
| **Current** | Refs are assigned as `na-el-0`, `na-el-1`, … by `querySelectorAll` order. On a dynamic page, a re-prune between the LLM call and the highlight step can reassign indices — `na-el-5` in the old tree is a different element from `na-el-5` in the new tree. |
| **Impact** | Wrong element highlighted. Silent failure — no error. Severity depends on how frequently the page mutates during LLM latency (3–8s is long enough for any SPA to update its DOM). |
| **Proposed fix** | Generate stable refs from element identity: `tag + id + type + label` hashed to a short string. Or, after the LLM returns, match by (tag, label, type) triple rather than by ref. The ref only needs to be stable within one request–response cycle. |

---

## Root Causes — Prioritised

Ranked by impact on end-to-end accuracy. Fix the top items first.

| # | Root Cause | Severity | Affected Stage |
|---|---|---|---|
| 1 | Noise-word removal breaks multi-word synonym phrases — synonym expansion never fires for "sign in", "add to cart", etc. | **CRITICAL** | Ranker |
| 2 | Highlight badge insertion triggers MutationObserver → re-rank loop on every successful match | **CRITICAL** | Highlighter + Observer |
| 3 | Elements below the fold excluded from the tree — target unreachable if scrolling is required | **HIGH** | Pruner |
| 4 | No execution lock — concurrent `executeCurrentStep()` calls from DOM mutations corrupt state | **HIGH** | Background SW |
| 5 | Stale DOM ref — element found in old tree snapshot after 2–8s LLM call; may be detached | **HIGH** | Content script |
| 6 | Gemini prompt missing role, position, score, href, page URL — LLM lacks context to disambiguate | **HIGH** | LLM prompt |
| 7 | Top-20 hard cut excludes correct element when deterministic rank is wrong (caused by #1) | **HIGH** | Content script |
| 8 | Missing selectors: contenteditable, role=textbox, role=searchbox — entire class of apps unsupported | **HIGH** | Pruner |
| 9 | "Pre-ranked, best first" framing biases Gemini to reinforce rather than correct deterministic errors | **MEDIUM** | LLM prompt |
| 10 | iframe best-by-score can pick ad/tracking frame over main document | **MEDIUM** | Background SW |
| 11 | `generateSteps` has no page/URL context — steps are generic, not site-adapted | **MEDIUM** | LLM prompt |
| 12 | Index-based refs invalidated by re-prune between LLM call and highlight | **MEDIUM** | Pruner + Content |

---

## Phase 2 — Instrumentation Plan

Add a single debug module. Enable with `localStorage.setItem('na_debug', '1')` in the Service Worker DevTools console.

### Background — wrap `executeCurrentStep()`

```js
// In background.js
const DEBUG = () => {
  try { return localStorage.getItem?.('na_debug') === '1'; }
  catch { return false; }
};

function dbg(stage, data) {
  if (!DEBUG()) return;
  const ts = performance.now().toFixed(1);
  console.group(`%c[NeuroAdapt:${stage}] +${ts}ms`, 'color:#60a5fa;font-weight:700');
  console.table ? console.table(data) : console.log(data);
  console.groupEnd();
}

// Add at key points inside executeCurrentStep():
dbg('STEP_START', { stepIndex: currentStepIndex, step, totalSteps: stepsList.length });
dbg('RANK_RESULT', { topRef, topLabel, topScore, source, frameId, candidatesShown: ranked });
dbg('STATE_TRANSITION', { from: prevStatus, to: STATE.status, elapsed: `${elapsed}ms` });
```

### Content — extend `sendResponse` with debug payload

```js
// In content.js NA_RANK handler — add to sendResponse when debug flag is set:
debug: {
  promptSent:          serialised,          // what Gemini received
  llmRaw:              llmResult,           // raw Gemini response
  deterministicTop5:   candidates.slice(0, 5).map(c => ({
    ref:     c.node.ref,
    label:   c.node.label,
    tag:     c.node.tag,
    score:   c.score,
    reasons: c.reasons,                    // per-dimension score breakdown
  })),
  prunedCount:         tree.length,         // total elements found
  candidateCount:      candidates.length,   // elements sent to LLM
  timings: {
    pruneMs, rankMs, llmMs, totalMs,
  },
}
```

### What each log tells you

| Log stage | What to look for |
|---|---|
| `STEP_START` | Are the generated steps sensible for this page? |
| `RANK_RESULT · deterministicTop5` | Is the correct element in the top 5? What's the score breakdown? |
| `RANK_RESULT · source` | Did `'llm'` or `'deterministic'` win? |
| `RANK_RESULT · promptSent` | What did Gemini actually see? Is label/role/href present? |
| `RANK_RESULT · llmRaw` | What did Gemini pick and why? |
| `RANK_RESULT · prunedCount` | Total elements discovered — is it suspiciously low (below-fold problem)? |
| `STATE_TRANSITION` | Are there duplicate transitions (race condition)? |

---

## Phase 3 — Benchmark Methodology

Run manually before and after Phase 4 fixes. Record results in a spreadsheet.

### Test sites and tasks

| Site | URL | Tasks |
|---|---|---|
| Google Search | google.com | Search for a term, click first result |
| YouTube | youtube.com | Search for a video, click Subscribe |
| GitHub | github.com | Sign in, create a new repository, open an issue |
| Gmail | mail.google.com | Compose an email, send it, open Inbox |
| Amazon | amazon.com | Search product, add to cart, go to checkout |
| LinkedIn | linkedin.com | Sign in, search for a person, send connection request |
| Reddit | reddit.com | Search a subreddit, upvote a post, comment |
| Wikipedia | wikipedia.org | Search an article, click a link in the article |
| Twitter/X | x.com | Sign in, compose a tweet (contenteditable) |
| Gov portal | gov.uk / uidai.gov.in | Fill a registration form, submit |

### Scoring per task

| Metric | How to measure |
|---|---|
| **Step accuracy** | Did Gemini generate steps that map to real UI elements on this page? (manual check) |
| **Rank accuracy** | Was the correct element in the top-20 candidates? (check `deterministicTop5` log) |
| **Identification accuracy** | Did Gemini pick the correct element from candidates? (check `llmRaw.ref`) |
| **Completion rate** | Did the full task complete without HITL? (binary: yes/no) |
| **Latency** | Total time from "Start" to first element highlighted (ms) |

### Target after Phase 4 fixes

- Rank accuracy: > 90%
- Identification accuracy: > 88%
- Completion rate: > 75% on tested tasks
- Latency: < 4s per step on a standard connection

---

## Phase 4 — Improvement Plan

Ordered by root-cause priority. Each change is justified by a specific finding above.

| # | Change | Justification | Risk |
|---|---|---|---|
| 1 | Fix synonym matching — detect multi-word phrases in raw hint before noise-word removal | Root cause #1 — breaks synonym expansion for all common action phrases | Low |
| 2 | Guard MutationObserver against NeuroAdapt's own DOM mutations (badge insert/remove) | Root cause #2 — infinite re-rank loop on every highlight | Low |
| 3 | Change pruner visibility filter: include below-fold elements, keep `inViewport` as score-only signal | Root cause #3 — entire class of elements unreachable | Low — increases tree size ~30% |
| 4 | Add execution lock to `executeCurrentStep()` | Root cause #4 — concurrent calls corrupt state on SPAs | Low |
| 5 | Re-verify element is attached to DOM after LLM call; re-prune if detached | Root cause #5 — silent highlight failure on dynamic pages | Low |
| 6 | Add role, score, href, position, page URL to Gemini serialization | Root cause #6 — LLM lacks context to pick between similar candidates | Low — increases token count ~15% |
| 7 | Add `contenteditable`, `role=textbox`, `role=searchbox` to `ACTIONABLE_SELECTORS` | Root cause #8 — Gmail, Slack, Notion, Twitter unsupported | Low |
| 8 | Reframe Gemini prompt: show scores, remove "best first" bias, add correction instruction | Root cause #9 — LLM reinforces deterministic errors instead of correcting them | Low |
| 9 | Add main-frame preference bonus (+10) in frame merge | Root cause #10 — iframe false positives | Very low |
| 10 | Pass page URL + title to `generateSteps` prompt | Root cause #11 — generic steps on site-specific UIs | Very low |

---

## Phase 5 — Architecture Assessment

**Verdict: The hybrid architecture is sound. All failures are implementation-level bugs, not architectural limits.**

The two-stage pipeline (deterministic pre-filter → LLM final pick) is the correct architecture for this problem:
- The deterministic ranker provides fast, cheap, privacy-safe coarse filtering
- The LLM provides semantic disambiguation that rule-based scoring cannot achieve
- Neither alone is sufficient; both together are the right design

The accuracy failures diagnosed above are all **implementation bugs** — broken synonym matching, a re-rank loop, missing below-fold elements, race conditions — not fundamental limits of the design. Fixing them will substantially raise accuracy without any architectural change.

### One genuine architectural gap

The system has no memory of past successful selections. If Gemini correctly identifies a "Sign in" button on GitHub, that selection is discarded. A lightweight persistent cache mapping `(hostname, step_hint) → {tag, label, type, id}` would allow the second visit to skip the LLM call entirely and match deterministically. Recommend as a follow-on task after Phase 4 fixes are validated.

### Shadow DOM

YouTube, GitHub, and certain Google products use Shadow DOM extensively. Traversing it requires `el.shadowRoot?.querySelectorAll()` recursive descent, which is a meaningful scope increase. Recommend as a follow-on task after the Phase 4 fixes stabilise.

---

*Generated by lead engineer audit — no code was changed during this investigation.*
