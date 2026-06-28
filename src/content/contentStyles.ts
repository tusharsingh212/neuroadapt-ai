export const contentStyles = `
  :host {
    all: initial;
    font-family: Aptos, "Segoe UI Variable", "Segoe UI", Inter, system-ui, sans-serif;
  }

  .na-root {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 2147483647;
    font-family: inherit;
  }

  .na-shell {
    position: fixed;
    right: 18px;
    bottom: 18px;
    width: min(392px, calc(100vw - 24px));
    max-height: calc(100vh - 24px);
    display: flex;
    flex-direction: column;
    pointer-events: auto;
    color: #e2e8f0;
  }

  .na-shell.na-collapsed {
    width: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0;
  }

  .na-card {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 26px;
    background:
      linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.84)),
      radial-gradient(circle at top, rgba(45, 212, 191, 0.12), transparent 55%);
    box-shadow:
      0 24px 64px rgba(2, 6, 23, 0.5),
      0 0 0 1px rgba(125, 211, 252, 0.12);
    backdrop-filter: blur(24px);
    overflow: hidden;
  }

  .na-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(180deg, rgba(255,255,255,0.04), transparent);
  }

  .na-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .na-mark {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #67e8f9, #34d399 45%, #f59e0b);
    color: #020617;
    box-shadow: 0 16px 30px rgba(34, 211, 238, 0.2);
    flex: none;
  }

  .na-title {
    margin: 0;
    font-size: 14px;
    line-height: 1.2;
    font-weight: 700;
    color: #f8fafc;
  }

  .na-subtitle {
    margin: 2px 0 0;
    font-size: 11px;
    line-height: 1.5;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .na-body {
    display: grid;
    gap: 12px;
    padding: 14px;
    max-height: calc(100vh - 130px);
    overflow: auto;
  }

  .na-body::-webkit-scrollbar {
    width: 8px;
  }

  .na-body::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.24);
    border-radius: 999px;
  }

  .na-section {
    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(15, 23, 42, 0.48);
    padding: 14px;
  }

  .na-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }

  .na-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.9);
  }

  .na-text {
    margin: 0;
    color: #e2e8f0;
    font-size: 13px;
    line-height: 1.7;
  }

  .na-muted {
    color: rgba(148, 163, 184, 0.92);
  }

  .na-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .na-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    color: #e2e8f0;
    font-size: 12px;
    line-height: 1;
  }

  .na-button-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .na-button {
    appearance: none;
    border: 0;
    border-radius: 16px;
    min-height: 42px;
    padding: 11px 12px;
    font-size: 12px;
    font-weight: 700;
    color: #f8fafc;
    background: rgba(255, 255, 255, 0.06);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
    cursor: pointer;
    transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
  }

  .na-button:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.1);
  }

  .na-button:focus-visible {
    outline: 3px solid rgba(56, 189, 248, 0.9);
    outline-offset: 2px;
  }

  .na-button.na-primary {
    color: #020617;
    background: linear-gradient(135deg, #67e8f9, #34d399);
  }

  .na-button.na-warning {
    background: rgba(251, 191, 36, 0.14);
    box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.2);
  }

  .na-button.na-secondary {
    opacity: 0.92;
  }

  .na-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #f8fafc;
  }

  .na-progress {
    height: 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  .na-progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #67e8f9, #34d399);
  }

  .na-grid {
    display: grid;
    gap: 10px;
  }

  .na-metrics {
    display: grid;
    gap: 10px;
  }

  .na-metric-card {
    border-radius: 18px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .na-metric-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 12px;
    color: #cbd5e1;
  }

  .na-feed {
    display: grid;
    gap: 8px;
  }

  .na-feed-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border-radius: 18px;
    padding: 10px 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    font-size: 12px;
    line-height: 1.6;
    color: #e2e8f0;
  }

  .na-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    margin-top: 6px;
    flex: none;
    background: linear-gradient(135deg, #67e8f9, #34d399);
    box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.08);
  }

  .na-collapsed-launcher {
    pointer-events: auto;
    align-self: flex-end;
    margin-top: auto;
  }

  .na-launcher {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(2, 6, 23, 0.86);
    color: #f8fafc;
    box-shadow: 0 22px 44px rgba(2, 6, 23, 0.45);
    cursor: pointer;
    transition: transform 180ms ease, background 180ms ease;
  }

  .na-launcher:hover {
    transform: translateY(-1px);
    background: rgba(15, 23, 42, 0.96);
  }

  .na-launcher:focus-visible {
    outline: 3px solid rgba(56, 189, 248, 0.9);
    outline-offset: 3px;
  }

  .na-slider {
    width: 100%;
    accent-color: #67e8f9;
  }

  .na-compact {
    font-size: 11px;
    color: rgba(203, 213, 225, 0.9);
  }

  @media (max-width: 640px) {
    .na-shell {
      right: 12px;
      left: 12px;
      bottom: 12px;
      width: auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .na-button,
    .na-launcher {
      transition: none;
    }

    [data-neuroadapt-guided="true"] {
      animation: none !important;
    }

    .na-typing-dot {
      animation: none !important;
    }
  }

  .na-chat-section {
    padding-bottom: 12px;
  }

  .na-chat-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #a5f3fc;
  }

  .na-chat-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .na-guide-main-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 14px 16px;
    border-radius: 16px;
    border: 1px solid rgba(16, 185, 129, 0.35);
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(34, 211, 238, 0.08));
    color: #a7f3d0;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    appearance: none;
    transition: all 0.18s ease;
    margin-bottom: 10px;
  }

  .na-guide-main-btn span {
    flex: 1;
  }

  .na-guide-main-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(34, 211, 238, 0.16));
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.15);
  }

  .na-guide-main-btn:focus-visible {
    outline: 3px solid rgba(56, 189, 248, 0.9);
    outline-offset: 2px;
  }

  .na-guide-main-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .na-chat-body {
    overflow: hidden;
  }

  .na-walkthrough-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    padding: 8px 12px;
    border-radius: 14px;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.25);
    font-size: 11px;
    line-height: 1.5;
    color: #a7f3d0;
  }

  .na-chat-messages {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 220px;
    overflow-y: auto;
    margin-bottom: 10px;
    padding-right: 4px;
  }

  .na-chat-messages::-webkit-scrollbar {
    width: 6px;
  }

  .na-chat-messages::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.24);
    border-radius: 999px;
  }

  .na-chat-bubble {
    max-width: 92%;
    padding: 10px 12px;
    border-radius: 16px;
    font-size: 12px;
    line-height: 1.65;
    word-wrap: break-word;
  }

  .na-chat-user {
    align-self: flex-end;
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(16, 185, 129, 0.2));
    border: 1px solid rgba(56, 189, 248, 0.25);
    color: #f0fdfa;
  }

  .na-chat-assistant {
    align-self: flex-start;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #e2e8f0;
  }

  .na-typing {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 14px 16px;
    width: fit-content;
  }

  .na-typing-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #67e8f9;
    animation: na-typing-bounce 1.2s ease-in-out infinite;
  }

  .na-typing-dot:nth-child(2) {
    animation-delay: 0.15s;
  }

  .na-typing-dot:nth-child(3) {
    animation-delay: 0.3s;
  }

  @keyframes na-typing-bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
    30% { transform: translateY(-4px); opacity: 1; }
  }

  .na-chat-input-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  .na-chat-input {
    flex: 1;
    resize: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 10px 12px;
    background: rgba(2, 6, 23, 0.55);
    color: #f8fafc;
    font: inherit;
    font-size: 12px;
    line-height: 1.5;
    min-height: 44px;
    pointer-events: auto;
    user-select: text;
    -webkit-user-select: text;
    caret-color: #7dd3fc;
  }

  .na-chat-input:focus-visible {
    outline: 3px solid rgba(56, 189, 248, 0.7);
    outline-offset: 2px;
  }

  .na-chat-input::placeholder {
    color: rgba(148, 163, 184, 0.75);
  }

  .na-send-btn {
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    display: grid;
    place-items: center;
  }

  .na-checklist {
    margin-bottom: 10px;
    padding: 10px 12px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .na-checklist-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .na-checklist-items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  .na-checklist-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 11px;
    line-height: 1.5;
    color: rgba(148, 163, 184, 0.9);
  }

  .na-checklist-item.na-checklist-active {
    color: #ecfdf5;
    font-weight: 600;
  }

  .na-checklist-done {
    color: #34d399;
  }

  .na-checklist-completed span {
    text-decoration: line-through;
    opacity: 0.65;
  }

  .na-checklist-icon {
    flex: none;
    margin-top: 2px;
  }

  .na-form-hints {
    margin-top: 10px;
    display: grid;
    gap: 8px;
  }

  .na-form-hint {
    padding: 8px 10px;
    border-radius: 12px;
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.15);
    font-size: 11px;
    line-height: 1.55;
  }

  .na-form-hint strong {
    display: inline;
    margin-right: 6px;
  }

  .na-required {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 999px;
    background: rgba(251, 113, 133, 0.18);
    color: #fecdd3;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    vertical-align: middle;
  }

  .na-first-time-banner {
    border-color: rgba(16, 185, 129, 0.2);
    background: rgba(16, 185, 129, 0.06);
  }

  /* Suggestion that replaces the "Need a hand?" dialog */
  .na-suggestion-banner {
    border-color: rgba(16, 185, 129, 0.2);
    background: rgba(16, 185, 129, 0.06);
  }

  /* ── Bubble launcher ─────────────────────────────────────────── */
  .na-bubble {
    position: relative;
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.92));
    color: #a5f3fc;
    box-shadow:
      0 8px 32px rgba(2, 6, 23, 0.45),
      0 0 0 1px rgba(125, 211, 252, 0.12);
    cursor: pointer;
    transition: transform 180ms ease, box-shadow 180ms ease;
    align-self: flex-end;
  }

  .na-bubble:hover {
    transform: translateY(-2px);
    box-shadow:
      0 12px 36px rgba(2, 6, 23, 0.55),
      0 0 0 1px rgba(125, 211, 252, 0.2);
  }

  .na-bubble:focus-visible {
    outline: 3px solid rgba(56, 189, 248, 0.9);
    outline-offset: 3px;
  }

  /* Active indicator dot on bubble */
  .na-bubble-dot {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: #34d399;
    border: 2px solid rgba(2, 6, 23, 0.9);
  }

  /* ── Hint card (heuristic suggestion near bubble) ─────────────── */
  .na-hint-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 10px;
    padding: 14px 16px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background:
      linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.92)),
      radial-gradient(circle at top, rgba(45, 212, 191, 0.1), transparent 60%);
    box-shadow:
      0 16px 48px rgba(2, 6, 23, 0.5),
      0 0 0 1px rgba(125, 211, 252, 0.1);
    backdrop-filter: blur(20px);
    max-width: 260px;
  }

  .na-hint-text {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: #e2e8f0;
  }

  .na-hint-actions {
    display: flex;
    gap: 8px;
  }

  .na-hint-btn {
    flex: 1;
    border: 0;
    border-radius: 14px;
    padding: 9px 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 150ms ease, transform 150ms ease;
  }

  .na-hint-btn:hover {
    transform: translateY(-1px);
    opacity: 0.88;
  }

  .na-hint-yes {
    color: #020617;
    background: linear-gradient(135deg, #67e8f9, #34d399);
  }

  .na-hint-no {
    color: rgba(148, 163, 184, 0.9);
    background: rgba(255, 255, 255, 0.06);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  }

  /* ── Footer actions row (replaces Page Comfort Mode section) ──── */
  .na-footer-row {
    display: flex;
    gap: 8px;
    padding-top: 2px;
  }

  .na-icon-btn {
    flex: none;
    min-width: 42px;
    padding: 0;
    display: grid;
    place-items: center;
  }

  /* Primary walkthrough chip variant */
  .na-suggestion-primary {
    border-color: rgba(56, 189, 248, 0.3);
    background: rgba(56, 189, 248, 0.1);
    color: #bae6fd;
    display: inline-flex;
    align-items: center;
  }

  .na-suggestion-primary:hover:not(:disabled) {
    background: rgba(56, 189, 248, 0.18);
    border-color: rgba(56, 189, 248, 0.45);
  }

  .na-ai-badge {
    margin-left: 8px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .na-ai-badge-live {
    border: 1px solid rgba(16, 185, 129, 0.25);
    background: rgba(16, 185, 129, 0.12);
    color: #a7f3d0;
  }

  .na-ai-badge-offline {
    border: 1px solid rgba(251, 191, 36, 0.25);
    background: rgba(251, 191, 36, 0.1);
    color: #fde68a;
  }

  .na-api-banner {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(251, 191, 36, 0.25);
    background: rgba(251, 191, 36, 0.08);
    color: #fde68a;
    font-size: 12px;
    line-height: 1.45;
  }

  .na-suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }

  .na-suggestion-chip {
    border: 1px solid rgba(16, 185, 129, 0.25);
    background: rgba(16, 185, 129, 0.08);
    color: #d1fae5;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .na-suggestion-chip:hover:not(:disabled) {
    background: rgba(16, 185, 129, 0.16);
    border-color: rgba(16, 185, 129, 0.4);
  }

  .na-suggestion-chip:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .na-adapt-section {
    border-color: rgba(16, 185, 129, 0.15);
  }

  .na-adapt-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .na-adapt-btn {
    flex: 1;
    min-width: 0;
  }

  /* ---- Sidebar ---- */
  .na-sidebar {
    position: fixed;
    left: 18px;
    top: 50%;
    transform: translateY(-50%);
    width: min(280px, calc(100vw - 36px));
    max-height: 80vh;
    z-index: 2147483645;
    pointer-events: auto;
    font-family: inherit;
  }

  .na-sidebar-inner {
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(2, 6, 23, 0.88));
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    padding: 14px;
    box-shadow: 0 24px 64px rgba(2,6,23,0.5), 0 0 0 1px rgba(125,211,252,0.08);
    backdrop-filter: blur(24px);
  }

  .na-sidebar-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #a5f3fc;
  }

  .na-sidebar-close {
    margin-left: auto;
    background: none;
    border: 0;
    color: rgba(148,163,184,0.7);
    cursor: pointer;
    padding: 2px;
  }

  .na-sidebar-goal {
    font-size: 15px;
    font-weight: 700;
    color: #f8fafc;
    margin-bottom: 10px;
    line-height: 1.3;
  }

  .na-sidebar-complete {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(16,185,129,0.15);
    border: 1px solid rgba(16,185,129,0.3);
    color: #a7f3d0;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 10px;
  }

  .na-sidebar-stats {
    display: flex;
    gap: 10px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .na-sidebar-stat {
    font-size: 10px;
    color: rgba(148,163,184,0.85);
    background: rgba(255,255,255,0.04);
    border-radius: 999px;
    padding: 3px 8px;
  }

  .na-sidebar-progress {
    height: 6px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
    margin-bottom: 10px;
  }

  .na-sidebar-progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #67e8f9, #34d399);
    transition: width 0.3s ease;
  }

  .na-sidebar-list {
    list-style: none;
    margin: 0 0 10px;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  .na-sidebar-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 11px;
    line-height: 1.5;
    color: rgba(148,163,184,0.85);
  }

  .na-sidebar-item.na-sidebar-active {
    color: #ecfdf5;
    font-weight: 600;
  }

  .na-sidebar-item.na-sidebar-completed span {
    text-decoration: line-through;
    opacity: 0.55;
  }

  .na-sidebar-icon {
    flex: none;
    margin-top: 2px;
  }

  .na-sidebar-done { color: #34d399; }
  .na-sidebar-active { color: #67e8f9; }
  .na-sidebar-pending { color: rgba(148,163,184,0.4); }

  .na-sidebar-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .na-btn-icon {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 0;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 600;
    background: rgba(255,255,255,0.06);
    color: #e2e8f0;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .na-btn-icon:hover { background: rgba(255,255,255,0.1); }

  .na-btn-secondary { background: rgba(251,191,36,0.12); color: #fde68a; }
  .na-btn-danger { background: rgba(251,113,133,0.12); color: #fecdd3; }

  /* ---- Overlay Panel ---- */
  .na-overlay-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: 0;
    color: #a5f3fc;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    padding: 4px 0;
    width: 100%;
  }

  .na-overlay-grid {
    display: grid;
    gap: 6px;
    margin-top: 6px;
  }

  .na-overlay-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    cursor: pointer;
  }

  .na-overlay-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .na-overlay-name {
    font-size: 12px;
    font-weight: 600;
    color: #e2e8f0;
  }

  .na-overlay-desc {
    font-size: 10px;
    color: rgba(148,163,184,0.8);
  }

  .na-toggle-btn {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    color: rgba(148,163,184,0.7);
    cursor: pointer;
    transition: all 0.15s ease;
    flex: none;
  }

  .na-toggle-btn.na-toggle-on {
    background: rgba(16,185,129,0.18);
    border-color: rgba(16,185,129,0.35);
    color: #34d399;
  }

  @media (max-width: 640px) {
    .na-sidebar {
      left: 12px;
      right: 12px;
      width: auto;
      top: auto;
      bottom: 12px;
      transform: none;
      max-height: 50vh;
    }
  }
`;
