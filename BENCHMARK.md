# NeuroAdapt AI — Benchmark Suite

Run manually before and after code changes. Record every result in the table at the bottom.

---

## How to enable debug logging

**Content script** (any page DevTools console):
```js
window.NA_DEBUG = true
```

**Background service worker** (chrome://extensions → Inspect service worker):
```js
self.__naDebug = true
```

Debug output includes: goal → steps generated → elements discovered → candidates ranked (with score breakdown) → prompt sent to Gemini → Gemini response → selected element → total latency per stage.

---

## Test sites and tasks

| # | Site | URL | Tasks |
|---|---|---|---|
| 1 | Google Search | google.com | Search for "weather today", click first result |
| 2 | YouTube | youtube.com | Search for "lofi music", click Subscribe on a video |
| 3 | GitHub | github.com | Sign in, create a new public repository |
| 4 | Gmail | mail.google.com | Compose a new email, send it |
| 5 | Amazon | amazon.com | Search "wireless headphones", add first result to cart |
| 6 | LinkedIn | linkedin.com | Sign in, search for a person by name |
| 7 | Reddit | reddit.com | Search "programming" subreddit, upvote the first post |
| 8 | Wikipedia | wikipedia.org | Search "Alan Turing", click the first link in the article |
| 9 | Twitter/X | x.com | Sign in, compose a tweet (contenteditable test) |
| 10 | Gov portal | gov.uk | Find a service, fill a form, submit |

---

## Scoring per task

For each task, record:

| Metric | How to measure | Pass threshold |
|---|---|---|
| **Step accuracy** | Were generated steps actionable for this specific page? | ≥ 80% of steps map to real elements |
| **Candidate recall** | Was the correct element in the top-30 candidates? (check debug log `top5`) | > 90% |
| **Top-1 accuracy** | Did Gemini pick the correct element? | > 88% |
| **Completion rate** | Did the full task complete without HITL? | > 75% |
| **Avg latency** | Time from "Start" to first element highlighted (ms) | < 4000ms |
| **Gemini token use** | Approximate tokens per step (rough from prompt length) | < 600 tokens |

---

## Result table

Fill in after each test run. Use `✓` for pass, `✗` for fail, `~` for partial.

### Before fixes (baseline)

| Site | Step acc. | Recall | Top-1 | Complete | Latency | Notes |
|---|---|---|---|---|---|---|
| Google | | | | | | |
| YouTube | | | | | | |
| GitHub | | | | | | |
| Gmail | | | | | | |
| Amazon | | | | | | |
| LinkedIn | | | | | | |
| Reddit | | | | | | |
| Wikipedia | | | | | | |
| Twitter/X | | | | | | |
| Gov portal | | | | | | |
| **Overall** | | | | | | |

### After fixes (v2)

| Site | Step acc. | Recall | Top-1 | Complete | Latency | Notes |
|---|---|---|---|---|---|---|
| Google | | | | | | |
| YouTube | | | | | | |
| GitHub | | | | | | |
| Gmail | | | | | | contenteditable now supported |
| Amazon | | | | | | |
| LinkedIn | | | | | | |
| Reddit | | | | | | |
| Wikipedia | | | | | | |
| Twitter/X | | | | | | contenteditable now supported |
| Gov portal | | | | | | below-fold elements now included |
| **Overall** | | | | | | |

---

## What the debug log tells you per failure

| Log field | What a failure means |
|---|---|
| `prunedTotal` < 5 | Page not loading / wrong selectors / Shadow DOM |
| `top5[0].score` < 30 | Synonym matching failed — check hint vs label |
| `source: 'deterministic'` | Gemini failed or returned null — check API key / timeout |
| `source: 'llm'` but wrong element | Prompt context insufficient — check role/href/section in candidates |
| Infinite re-rank in console | Observer loop not fixed — check na-step-badge id filter |
| HITL on every step | Scores too low — synonym matching still broken |
| `confident: false` | Score < 40 — check candidate scores in debug |

---

## Known remaining limitations

| Area | Limitation | Workaround |
|---|---|---|
| Shadow DOM | Elements inside Shadow DOM trees not discovered | Test on YouTube: search bar may not be found |
| iFrames cross-origin | Cross-origin iframes silently skip (by design) | User clicks HITL for those |
| Very dynamic SPAs | React/Vue pages with >500ms hydration may need longer `POST_NAV_DELAY_MS` | Increase in background.js |
| Gemini quota | Rate limits on free tier cause LLM fallback | Extension still works deterministically |
| Long pages (1000+ elements) | Pruner may take >100ms; consider Web Worker | Not blocking for current usage |

---

## Accuracy improvement targets

| Metric | Baseline (est.) | Target (v2) | Reasoning |
|---|---|---|---|
| Candidate recall | ~60% | >90% | Below-fold fix + synonym fix |
| Top-1 accuracy | ~55% | >88% | Richer LLM context |
| Completion (no HITL) | ~40% | >75% | All of the above |
| Latency | ~5s | <4s | No more re-rank loops |
