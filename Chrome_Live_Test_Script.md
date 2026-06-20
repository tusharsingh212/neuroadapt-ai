# NeuroAdapt AI — Manual Chrome Validation Script

The Claude-in-Chrome browser connector currently requires macOS, so I can't drive Chrome directly on your Windows machine. This script lets you run the validation yourself; send me the results (pass/fail notes, console text, screenshots) and I'll compile the final bug report and go/no-go call.

## 0. Rebuild first
Run `npm run build` so `dist/` reflects today's two fixes (heuristic-fallback bypass, "Explain this form" field-aware reply).

## 1. Load the unpacked extension
- `chrome://extensions` → enable Developer mode → **Load unpacked** → select the `dist` folder.
- Confirm: no red error badge on the extension card. Note name/version shown.

## 2. Verify initialization
- Click the extension icon — popup should open with no blank screen or console error.
- On the extension card, click **service worker** → DevTools opens for the background worker → check Console for errors on load.
- Open any normal webpage → DevTools (F12) → Console → look for NeuroAdapt content-script logs/errors.

## 3. Test pages (pick one per category, any similar page works)
- **Form-heavy**: e.g. `https://httpbin.org/forms/post`, or any signup/application form.
- **Healthcare-style**: e.g. `https://www.nhs.uk`, `https://www.medicare.gov`.
- **Government-style**: e.g. `https://uidai.gov.in` (matches the app's built-in Aadhaar heuristics) or `https://www.usa.gov`.
- **React SPA**: e.g. new Reddit (`https://www.reddit.com`, client-rendered with in-app route changes) or any React app you have.

On each page, open the AI assistant and ask:
1. "Explain this form." (most meaningful on the form-heavy page)
2. "How do I apply for this?" / "Help me register here."
3. "What is this page about?"
4. An off-topic question, e.g. "What's the weather today?" (should decline gracefully, not error or hallucinate)

## 4. Confirm
- No stuck loading spinner — reply appears within a few seconds even with no API key set.
- No API key configured → still get a real reply (heuristic fallback), not an error.
- If you have a Gemini key: add it in settings, repeat the 4 prompts on 1–2 pages, confirm replies are more natural/specific, and check the Network tab for the Gemini request/response.
- Highlight outlines a real, visible element — never nothing, never the wrong/invisible one.
- On the form-heavy page, "Explain this form." names actual field labels from that page, not generic text.
- Switch persona mode (first-time vs elderly) and re-ask one prompt — tone/wording should visibly change.

## 5. Navigation & cleanup
- On the SPA, click 2–3 internal links that change the URL without a full reload. Confirm any prior highlight/overlay/tooltip disappears rather than lingering on a stale element.
- With the assistant/overlay open, disable the extension from `chrome://extensions` (or the popup toggle). Confirm all NeuroAdapt UI vanishes immediately.
- Re-enable it — confirm it reinitializes cleanly (note if a page reload is required).

## 6. Console check
Throughout, keep both consoles open (page + service worker) and copy the exact text of any red errors or yellow warnings.

## What to send back
For each section: pass/fail + anything unexpected, plus console text and/or screenshots for failures.
