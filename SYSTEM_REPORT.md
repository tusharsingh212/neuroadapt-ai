# NeuroAdapt AI — System Report

**Version:** 1.0.0 | **Platform:** Chrome Extension MV3 | **Model:** Gemini 2.0 Flash

---

## Overview

Accessibility assistant and web navigation copilot. User describes a goal in plain language; the system breaks it into steps, finds the right element on the page using a two-stage deterministic + LLM pipeline, highlights it non-intrusively, and guides the user through to completion.

---

## Quick Stats

| Metric | Value |
|---|---|
| Source files | 13 |
| Engine modules | 5 |
| Gemini API functions | 3 |
| Synonym clusters | 23 |
| Scoring dimensions | 7 |
| State machine states | 5 |
| Message types | 11 |

---

## Architecture — Request Flow

```
User Goal → generateSteps (Gemini) → State Machine → DOM Pruner → Ranker v2 (top-20) → identifyElement (Gemini) → Highlighter → getStepExplanation (Gemini)
```

---

## File Structure

```
neuroadapt-ai/
├── manifest.json           # MV3 config
├── background.js           # Service worker — state machine + message bus
├── config.js               # API key (backend only, never sent to UI)
├── content.js              # Content script orchestrator
├── popup.html / popup.js   # Extension popup UI
├── sidepanel.html / sidepanel.js  # Copilot side panel UI
├── engine/
│   ├── pruner.js           # DOM pruner
│   ├── observer.js         # MutationObserver wrapper
│   ├── ranker.js           # Target ranker v2
│   ├── highlighter.js      # Element highlighter
│   └── llm.js              # Gemini API abstraction
└── styles/
    ├── highlight.css        # Injected page styles
    ├── popup.css            # Popup styles
    └── sidepanel.css        # Side panel styles
```

---

## Engine Modules

### `engine/pruner.js` — DOM Pruner
- Queries **20 ARIA-aware selectors** across the live document
- **9-tier label resolution priority:** aria-label → innerText → placeholder → title → name → id → value → alt → data-*
- `serialise()` strips live element refs before crossing the message bus (prevents DataCloneError)

### `engine/observer.js` — MutationObserver
- Watches `childList + subtree` only — ignores attribute and characterData noise
- **300 ms debounce** collapses burst mutations into a single re-prune
- Notifies background via `NA_TREE_UPDATED` (fire-and-forget, safe on context invalidation)

### `engine/ranker.js` — TargetRanker v2
- Scores every pruned element against the target hint across 7 dimensions
- Returns up to **20 candidates** sorted by score for the LLM to pick from
- **23 synonym clusters** expand any token to all synonymous phrases before matching

**Synonym examples:**
- `login` = sign in, log in, signin, log into, enter, access account
- `submit` = send, save, confirm, done, complete, apply, finish
- `search` = find, look up, query
- `register` = sign up, create account, join, get started
- `buy` = purchase, order, add to cart, checkout

### `engine/highlighter.js` — Highlighter
- **Soft glow ring** (2px outline, breathing animation) — not a hard obstructive border
- **Small badge** (`▶ step label`) anchored to element's top-right corner — never over page content
- Badge **auto-fades after 4 s** once the user has noticed it
- `ResizeObserver` repositions the badge on layout shift
- `clear()` always called before new highlight — only one at a time

### `engine/llm.js` — LLM Abstraction
- Three exported async functions calling Gemini 2.0 Flash
- **12 s abort timeout** on all calls via `AbortController`
- Markdown fence stripping before `JSON.parse` (model sometimes wraps output in ` ```json `)
- All failures return `null` or a rule-based fallback — LLM is never a hard dependency

---

## Gemini API Functions

### 1. `generateSteps(apiKey, goal)`
Breaks a free-form user goal into 2–5 concrete, element-findable steps.

- Each step uses an action verb and names a specific UI element
- Example output for "ask a question": `["Find the question input field", "Type your question", "Click the Submit button"]`
- **Fallback:** heuristic step generator (pattern-matched on common goal types)

| Parameter | Value |
|---|---|
| Temperature | 0.2 |
| Max tokens | 200 |
| Output | `string[]` |

### 2. `identifyElement(apiKey, hint, candidates)`
Picks the single best-matching element from the top-20 deterministic candidates.

- Prompt encodes synonym rules, element type bias (click→button, type→input), and viewport preference
- Returns `{ ref, confidence, reason }` where `ref` maps back to a live DOM element
- **Fallback:** deterministic ranker's top result

| Parameter | Value |
|---|---|
| Temperature | 0.1 (near-deterministic) |
| Max tokens | 120 |
| Output | `{ ref, confidence, reason }` |

### 3. `getStepExplanation(apiKey, goal, step)`
Generates a single friendly sentence (≤15 words) for the sidepanel explanation bubble.

- Fire-and-forget — does not delay highlighting
- **Fallback:** rule-based template matching on step keywords

| Parameter | Value |
|---|---|
| Temperature | 0.35 |
| Max tokens | 60 |
| Output | `string` |

---

## Scoring Dimensions (Ranker v2)

| Dimension | Description | Points |
|---|---|---|
| Label similarity | Synonym-aware phrase matching across label, aria-label, placeholder, id, name | 0 – 50 |
| ARIA label bonus | Extra points when aria-label specifically matches hint tokens | 0 – 8 |
| Tag / type semantics | Tag matches action type (click→button, type→input). Wrong type = penalty. | –10 to +20 |
| Context signals | In form +5, type=submit +6, autofocus +5, unique tag on page +4 | 0 – 15 |
| Viewport position | In viewport +10, near viewport (top < 2000px) +4 | 0 – 10 |
| Attribute match | id or name attribute matches hint tokens | 0 – 5 |
| Prominence | Width ≥300px +5, ≥150px +2 (main input vs icon button) | 0 – 5 |

**Max possible score: 100** | **HITL threshold: < 40**

---

## State Machine

```
idle
 └─[SET_GOAL]──→ navigating
                    ├─[STEP_FOUND]──→ navigating (loop)
                    ├─[ADVANCE_STEP]─→ navigating / complete
                    ├─[REQUIRE_HITL]─→ waiting_for_human
                    │                      └─[HITL_RESOLVED]──→ navigating
                    └─[ERROR]────────→ error

any state ──[CANCEL]──→ idle
```

| State | Description |
|---|---|
| `idle` | No active goal. Waiting for user input. |
| `navigating` | Executing steps — ranking, highlighting, advancing. |
| `waiting_for_human` | Score too low. HITL crosshair + click capture active. |
| `complete` | All steps finished successfully. |
| `error` | Unrecoverable failure. Requires manual reset. |

**State persistence:** `chrome.storage.session` — survives service worker restarts within a browser session.

---

## Message Protocol

### UI → Background
| Message | Payload | Description |
|---|---|---|
| `NA_SET_GOAL` | `{ goal, tabId }` | Start navigation — triggers LLM step generation |
| `NA_NEXT_STEP` | — | Manually advance to the next step |
| `NA_CANCEL` | — | Reset to idle, clear highlight |
| `NA_GET_STATE` | — | Return current state snapshot |

### Background → Content (all frames fan-out)
| Message | Payload | Description |
|---|---|---|
| `NA_RANK` | `{ targetHint, tooltip }` | Prune + rank + LLM identify + highlight |
| `NA_PRUNE` | — | Return serialised DOM tree |
| `NA_CLEAR_HIGHLIGHT` | — | Remove glow ring and badge |
| `NA_CAPTURE_CLICK` | — | HITL one-time click capture |
| `NA_PING` | — | Health check — returns frame URL |

### Content → Background
| Message | Payload | Description |
|---|---|---|
| `NA_LLM_IDENTIFY` | `{ hint, candidates }` | Ask background to call Gemini with top-20 candidates |
| `NA_TREE_UPDATED` | `{ frame }` | Notify of DOM mutation (fire-and-forget) |

### Background → UI (broadcast)
| Message | Payload | Description |
|---|---|---|
| `NA_STATE_UPDATE` | `{ state }` | Push new state to popup and sidepanel |

---

## iFrame Message Bus

`rankAcrossFrames()` fans out `NA_RANK` to **all frames** in the tab in parallel using `chrome.webNavigation.getAllFrames`. Results are merged by picking the frame with the highest `topScore`. Cross-origin / sandboxed iframes that block content scripts are caught per-frame and ignored.

---

## Human-in-the-Loop (HITL)

Triggered when the winning element scores **< 40 / 100**.

1. State transitions to `waiting_for_human`
2. `NA_CAPTURE_CLICK` sent to top frame — crosshair cursor applied via CSS
3. User clicks any element — XPath + tag + text captured
4. State transitions: `HITL_RESOLVED` → `ADVANCE_STEP` → next step executed automatically

---

## Permissions

```
activeTab         — read current tab URL and send messages
scripting         — inject content scripts programmatically
storage           — session state persistence
webNavigation     — getAllFrames, onCompleted listener
sidePanel         — open and control the side panel
host_permissions  — <all_urls> (inject into any page)
```

---

## API Key Security

- Stored in `config.js` (backend only — service worker scope)
- **Never sent to any UI page** — popup and sidepanel have no access to the key
- No `NA_GET_API_KEY` / `NA_SAVE_API_KEY` message handlers exist
- All Gemini calls originate from `background.js` only
