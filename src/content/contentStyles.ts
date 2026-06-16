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
  }
`;
