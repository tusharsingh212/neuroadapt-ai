import { Eye, EyeOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { OverlayMode, OverlaySettings } from "@/shared/types";
import { DEFAULT_OVERLAY_SETTINGS } from "@/shared/types";
import { loadOverlaySettings, applyOverlaySettings, saveOverlaySettings } from "@/shared/overlayManager";

const OVERLAY_LABELS: Record<OverlayMode, { label: string; desc: string }> = {
  focusMode: { label: "Focus on one thing", desc: "Dim the rest of the page so you can focus on what you're doing" },
  readingMode: { label: "Reading view", desc: "Show only the main text, hide everything else" },
  reducedClutter: { label: "Hide distractions", desc: "Remove sidebars, ads, and extra content" },
  largeTargets: { label: "Bigger buttons", desc: "Make all buttons and links easier to tap or click" },
  highContrast: { label: "High contrast", desc: "Dark background with bright text — easier on the eyes" },
  dyslexiaSpacing: { label: "Easier to read", desc: "More space between letters and lines" },
  simplifiedLabels: { label: "Explain unclear words", desc: "Replace confusing labels with plain, simple language" }
};

export function OverlayPanel({ expanded: initialExpanded }: { expanded?: boolean }): JSX.Element {
  const [settings, setSettings] = useState<OverlaySettings>(() => loadOverlaySettings());
  const [expanded, setExpanded] = useState(initialExpanded ?? false);

  useEffect(() => {
    applyOverlaySettings(document, settings);
  }, [settings]);

  const toggle = useCallback((mode: OverlayMode) => {
    setSettings((prev) => {
      const next = { ...prev, [mode]: !prev[mode] };
      saveOverlaySettings(next);
      return next;
    });
  }, []);

  const activeCount = Object.values(settings).filter(Boolean).length;

  return (
    <div className="na-section">
      <div className="na-section-head">
        <button
          type="button"
          className="na-overlay-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <Eye size={14} />
          <span>Reading &amp; display options {activeCount > 0 ? `(${activeCount} on)` : ""}</span>
        </button>
      </div>

      {expanded ? (
        <div className="na-overlay-grid">
          {(Object.keys(OVERLAY_LABELS) as OverlayMode[]).map((mode) => {
            const info = OVERLAY_LABELS[mode];
            const isOn = settings[mode];
            return (
              <label key={mode} className="na-overlay-item">
                <div className="na-overlay-info">
                  <span className="na-overlay-name">{info.label}</span>
                  <span className="na-overlay-desc">{info.desc}</span>
                </div>
                <button
                  type="button"
                  className={`na-toggle-btn ${isOn ? "na-toggle-on" : ""}`}
                  onClick={() => toggle(mode)}
                  aria-pressed={isOn}
                  aria-label={`${isOn ? "Disable" : "Enable"} ${info.label}`}
                >
                  {isOn ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
