# NeuroAdapt AI — Architecture Reference

## Component Diagram

```
┌─────────────────────────────────────────────────────┐
│                  Chrome MV3 Extension               │
│                                                     │
│  ┌──────────────┐     ┌──────────────────────────┐  │
│  │   Popup UI   │     │   Background Worker       │  │
│  │ PopupApp.tsx │────▶│   background/index.ts     │  │
│  └──────────────┘     │                          │  │
│         │             │  • Gemini API calls       │  │
│         │             │  • LRU analysis cache     │  │
│         │             │  • Task assistant cache   │  │
│         │             │  • Request throttling     │  │
│         │             └──────────────────────────┘  │
│         │                          │                 │
│         ▼                          ▼                 │
│  ┌──────────────────────────────────────────────┐   │
│  │           Content Script (Shadow DOM)         │   │
│  │                                              │   │
│  │  ContentApp.tsx                              │   │
│  │  ├── TaskAssistantPanel.tsx (chat)           │   │
│  │  ├── OverlayPanel.tsx (display options)      │   │
│  │  └── TaskSidebar.tsx (goal session)          │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Rendering Pipeline

There are two rendering systems with distinct responsibilities and no overlap:

### 1. `simplifyPage.ts` — Dramatic Visual Transformation
- Triggered: explicitly when user clicks "Simplify this page" or popup sends `NA_ADAPT_PAGE`
- What it does:
  - Injects persona CSS variables (Bootstrap/Tailwind/MUI framework overrides) via `personaCss.ts`
  - Scans and scores all buttons → highlights primary CTA, dims clutter
  - Overrides nav, footer, cards, inputs, links with inline `!important` styles
  - Inserts a fixed action bar at the top of the page
  - Returns a cleanup function stored in `simplifyCleanupRef`
- Reversibility: 100% — every inline style is tracked with its prior value; cleanup reverts all

### 2. `adaptation.ts` — Semantic Accessibility Layer
- Triggered: when extension is enabled, when persona changes
- What it does:
  - Adds CSS classes to `<html>` (`na-mode-elderly`, `na-mode-firstTime`, `na-enabled`)
  - Adds data attributes to interactive elements (`data-neuroadapt-primary`, `data-neuroadapt-secondary`, etc.)
  - Injects a single global stylesheet (`GLOBAL_ADAPTATION_CSS`) via `<style id="neuroadapt-global-styles">`
  - **Does NOT write any inline styles** — visual changes are entirely driven by CSS + data attributes
- Reversibility: 100% — remove CSS classes + data attributes; new elements auto-inherit via CSS

### Why Two Systems?
- `simplifyPage` = immediate, dramatic, "wow" effect on first click (inline overrides win every specificity battle)
- `adaptation` = lightweight, re-runnable, CSS-driven (safe to call from MutationObserver without thrashing)
- They target different properties and cannot conflict

## Cleanup Lifecycle

All reset paths funnel through a single function:

```
restoreOriginalPage(doc, { simplifyCleanup })
  ├── window.speechSynthesis.cancel()
  ├── simplifyCleanup()              ← reverts inline style overrides + removes action bar
  ├── clearGuidanceHighlights(doc)   ← removes pulsing element highlight
  ├── resetDomActions(doc)           ← reverts Gemini DOM mutations
  ├── resetAdaptation(doc)           ← removes CSS classes + data attributes
  └── removeOverlayVisuals(doc)      ← removes overlay CSS classes (preserves localStorage prefs)
```

Reset entry points:
- In-panel "Restore original" button → `resetPage()` in ContentApp
- Popup "Undo changes" → `NA_RESET_PAGE` message → ContentApp listener
- Heuristic suggestion dismiss → `dismissHeuristicSuggestion()`

## Data Flow

```
User Action (Popup)
    │
    ▼
chrome.tabs.sendMessage(NA_ADAPT_PAGE)
    │
    ▼
ContentApp.tsx listener
    ├── simplifyPage(doc, persona)          ← instant (synchronous)
    └── runGeminiAnalysis(settings)
            │
            ▼
        chrome.runtime.sendMessage(NA_RUN_ANALYSIS)
            │
            ▼
        background/index.ts
            ├── check LRU cache
            ├── throttle (1200ms inter-request gap)
            └── analyzeWithGemini(...)
                    │
                    ▼
                Gemini REST API
                    │
                    ▼
                AiAnalysisResult
                    │
                    ▼
        ContentApp ← applyDomActions(domActions, customCss)
```

## Message Flow

| Message | Direction | Description |
|---|---|---|
| `NA_ADAPT_PAGE` | Popup → Content | Enable extension + run adaptation |
| `NA_RESET_PAGE` | Popup → Content | Disable + full restore |
| `NA_ANALYZE_PAGE` | Popup → Content | Preview analysis without enabling |
| `NA_GET_STATE` | Popup → Content | Sync popup UI with current state |
| `NA_SET_COMPARISON` | Popup → Content | Toggle original/adapted view |
| `NA_SHOW_STATUS` | Background → Content | Display a status message in the panel |
| `NA_UPDATE_SETTINGS` | Content → Background | Persist settings |
| `NA_RUN_ANALYSIS` | Content → Background | Request Gemini page analysis |
| `NA_RUN_TASK_ASSISTANT` | Content → Background | Request Gemini task guidance |
| `NA_GET_SETTINGS` | Any → Background | Read persisted settings |

## AI Pipeline

### With Gemini API Key (`VITE_GEMINI_API_KEY` set at build time)
```
User question
  → TaskAssistantPanel → NA_RUN_TASK_ASSISTANT
  → background/index.ts
      ├── cache hit? → return cached result
      ├── throttle (1200ms)
      └── analyzeTaskWithGemini(request)
              → callGemini(apiKey, model, systemPrompt + userPrompt)
              → parseTaskAssistantJson(text)
              → validateTaskAssistantResult(parsed)
              → TaskAssistantResult { reply, highlightElementRef, ... }
  → ContentApp → highlightElement(ref)
```

### Without API Key (Heuristic Fallback)
```
User question
  → background/index.ts (apiKey = "")
  → analyzeTaskWithGemini({ allowHeuristicFallback: true })
  → heuristicFallback(context, question)
      ├── official source detection (checkOfficialUrl)
      ├── intent classification (asksWhatToClick, informational, ...)
      └── TaskAssistantResult { reply, highlightElementRef, ... }
```

The heuristic path always works and produces meaningful responses. Gemini adds depth, multi-step reasoning, and structured DOM actions.

## Extension Lifecycle

```
chrome.runtime.onInstalled
  → loadSettings() → merge with DEFAULT_SETTINGS → saveSettings()
  → set badge text

Page load
  → contentScript.js → mount() → createRoot(<ContentApp />)
  → ContentApp mounts → loadSettings()
  → if enabled: applyAdaptation(doc, settings, insights)

User opens popup
  → PopupApp mounts → loadSettings() (read-only until user action)
  → "Help me" click → NA_ADAPT_PAGE → ContentApp
      → simplifyPage() [instant]
      → NA_RUN_ANALYSIS → background → Gemini [async]

User resets
  → NA_RESET_PAGE → ContentApp
  → restoreOriginalPage() [synchronous full revert]

SPA navigation (pushState)
  → MutationObserver fires (childList only, debounced 400ms)
  → inspectPage() → update insights/analysis state
  → CSS classes on <html> automatically apply to new content
```

## Configuration

All environment variables and tunable constants are centralized in `src/shared/config.ts`. No other module imports `import.meta.env` directly.

```ts
config.geminiApiKey       // VITE_GEMINI_API_KEY (baked at build time)
config.geminiModel        // "gemini-2.0-flash"
config.geminiModelFallback // "gemini-1.5-flash-8b"
config.cacheMaxSize       // 50 entries per cache
config.analysisCacheTtlMs // 5 minutes
config.taskCacheTtlMs     // 2 minutes
config.geminiThrottleMs   // 1200ms inter-request gap
config.mutationDebounceMs // 400ms observer debounce
config.autoScanDelayMs    // 1400ms auto-scan delay on panel open
```

## Performance Considerations

- **MutationObserver**: fires only on `childList` changes (not `attributes`), skips NeuroAdapt's own mutations, debounced 400ms
- **Adaptation re-runs**: CSS handles new elements automatically; `applyAdaptation` only runs on explicit user action or settings change — never in the observer loop
- **Gemini throttle**: 1200ms minimum between requests; LRU cache (5-min TTL for analysis, 2-min for tasks)
- **simplifyPage**: bounded — queries at most 60 buttons, 30 inputs, 20 cards, 5 nav elements per run
- **Shadow DOM**: NeuroAdapt UI is fully isolated; no style bleed in either direction
