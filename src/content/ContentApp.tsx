import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Mic,
  RefreshCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { applyAdaptation, resetAdaptation } from "@/shared/adaptation";
import { sendRuntimeMessage } from "@/shared/chrome";
import { applyDomActions, resetDomActions } from "@/shared/elementGuide";
import { HeuristicObserver } from "@/shared/heuristics";
import { buildAnalysisReport, inspectPage } from "@/shared/pageInsights";
import { extractPageSummary } from "@/shared/pageSummary";
import { formatTaskTime, progressValue } from "@/shared/metrics";
import {
  DEFAULT_SETTINGS,
  PERSONA_LABELS,
  type AnalysisReport,
  type ExtensionSettings,
  type PageInsights,
  type RuntimeStatus
} from "@/shared/types";
import { loadSettings, saveSettings, subscribeToSettings } from "@/shared/storage";
import { cx, Pill, ProgressBar, SectionTitle } from "@/shared/ui";

import type { NeuroAdaptMessage, NeuroAdaptStateMessage } from "@/shared/messaging";
import type { AiAnalysisMessage } from "@/shared/messaging";

import { TaskAssistantPanel } from "@/content/TaskAssistantPanel";

function feedLines(report: AnalysisReport, insights: PageInsights): string[] {
  const persona = report.detectedPersona;
  const lines = [
    "Analyzing interface...",
    "Detecting navigation complexity...",
    "Preparing accessibility improvements...",
    "Adaptation complete."
  ];

  if (insights.healthcareSignals > 0) {
    lines.splice(1, 0, "Healthcare signals detected.");
  }

  if (persona === "patient") {
    lines.splice(2, 0, "Prioritizing care and appointment actions...");
  } else if (persona === "visuallyImpaired") {
    lines.splice(2, 0, "Boosting contrast and focus clarity...");
  } else if (persona === "firstTime") {
    lines.splice(2, 0, "Adding step-by-step guidance...");
  } else if (persona === "elderly") {
    lines.splice(2, 0, "Increasing target size and spacing...");
  }

  if (report.ai?.source === "gemini") {
    lines.splice(1, 0, report.ai.cached ? "Using cached Gemini accessibility reasoning." : "Gemini accessibility reasoning complete.");
    if (report.ai.summary) lines.splice(2, 0, report.ai.summary);
  }

  return lines;
}

function personaTitle(settings: ExtensionSettings, insights: PageInsights): string {
  if (settings.persona !== "auto") {
    return PERSONA_LABELS[settings.persona];
  }
  return `${PERSONA_LABELS.auto} -> ${PERSONA_LABELS[insights.detectedPersona]}`;
}

function complexityValue(label: AnalysisReport["before"]["navigationComplexity"]): number {
  if (label === "High") return 82;
  if (label === "Medium") return 54;
  return 28;
}

function settingsForReport(settings: ExtensionSettings, report: AnalysisReport): ExtensionSettings {
  if (settings.persona !== "auto") return settings;
  return { ...settings, persona: report.detectedPersona };
}

export function ContentApp(): JSX.Element {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [insights, setInsights] = useState<PageInsights>(() => inspectPage(document));
  const [analysis, setAnalysis] = useState<AnalysisReport>(() => buildAnalysisReport(DEFAULT_SETTINGS, inspectPage(document)));
  const [runtime, setRuntime] = useState<RuntimeStatus>({
    state: "idle",
    messages: ["Adaptive assistant loaded.", "Awaiting page analysis."],
    lastUpdated: Date.now()
  });
  const [messages, setMessages] = useState<string[]>(runtime.messages);
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [comparison, setComparison] = useState<"original" | "adapted">(DEFAULT_SETTINGS.comparisonMode);
  const [busy, setBusy] = useState<"analyze" | "adapt" | "reset" | null>(null);

  const settingsRef = useRef(settings);
  const debounceRef = useRef<number | null>(null);

  const showAssistant = visible || settings.enabled;

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let mounted = true;
    loadSettings().then((next) => {
      if (!mounted) return;

      const nextInsights = inspectPage(document);
      const nextAnalysis = buildAnalysisReport(next, nextInsights);

      setSettings(next);
      setInsights(nextInsights);
      setAnalysis(nextAnalysis);
      setComparison(next.comparisonMode);
      setMessages(next.enabled ? feedLines(nextAnalysis, nextInsights) : ["Adaptive assistant loaded.", "Awaiting page analysis."]);
      setRuntime({
        state: next.enabled ? "done" : "idle",
        messages: next.enabled ? feedLines(nextAnalysis, nextInsights) : ["Adaptive assistant loaded.", "Awaiting page analysis."],
        lastUpdated: Date.now()
      });
      setVisible(next.enabled);

      if (next.enabled && next.comparisonMode === "adapted") {
        applyAdaptation(document, next, nextInsights);
      } else {
        resetAdaptation(document);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => subscribeToSettings((next) => {
    setSettings(next);
    setComparison(next.comparisonMode);
  }), []);

  useEffect(() => {
    if (!settings.enabled || comparison === "original") {
      resetAdaptation(document);
      return;
    }

    const nextPersona = settings.persona === "auto" ? insights.detectedPersona : settings.persona;
    applyAdaptation(document, { ...settings, persona: nextPersona, comparisonMode: comparison }, insights);
    setVisible(true);
  }, [settings, comparison, insights]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }

      debounceRef.current = window.setTimeout(() => {
        const nextInsights = inspectPage(document);
        const nextAnalysis = buildAnalysisReport(settingsRef.current, nextInsights);

        setInsights(nextInsights);
        setAnalysis(nextAnalysis);

        setMessages((current) => {
          const nextFeed = settingsRef.current.enabled ? feedLines(nextAnalysis, nextInsights) : current;
          setRuntime((currentStatus) => ({
            ...currentStatus,
            messages: nextFeed,
            lastUpdated: Date.now()
          }));
          return nextFeed;
        });

        if (settingsRef.current.enabled && settingsRef.current.comparisonMode === "adapted") {
          applyAdaptation(document, settingsRef.current, nextInsights);
        }
      }, 220);
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.runtime?.onMessage) return;

    const listener = (
      message: NeuroAdaptMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => {
      if (!message || typeof message !== "object" || !("type" in message)) return false;

      if (message.type === "NA_GET_STATE") {
        sendResponse({ settings, insights, analysis, runtime } satisfies NeuroAdaptStateMessage);
        return false;
      }

      if (message.type === "NA_ANALYZE_PAGE") {
        (async () => {
          const nextInsights = inspectPage(document);
          const nextAnalysis = await runGeminiAnalysis(settingsRef.current);
          const nextFeed = feedLines(nextAnalysis, nextInsights);
          const previewSettings: ExtensionSettings = {
            ...settingsRef.current,
            enabled: true,
            comparisonMode: "adapted"
          };
          const nextRuntime: RuntimeStatus = {
            state: "analyzing",
            messages: nextFeed,
            lastUpdated: Date.now()
          };

          setInsights(nextInsights);
          setAnalysis(nextAnalysis);
          setMessages(nextFeed);
          setRuntime(nextRuntime);
          setVisible(true);
          applyAdaptation(document, settingsForReport(previewSettings, nextAnalysis), nextInsights);
          sendResponse({ settings: settingsRef.current, insights: nextInsights, analysis: nextAnalysis, runtime: nextRuntime } satisfies NeuroAdaptStateMessage);
        })();
        return true;
      }

      if (message.type === "NA_ADAPT_PAGE") {
        (async () => {
          const nextSettings: ExtensionSettings = {
            ...settingsRef.current,
            enabled: true,
            persona: message.payload?.persona ?? settingsRef.current.persona,
            comparisonMode: "adapted",
            autoDetect: true
          };

          const nextInsights = inspectPage(document);
          const nextAnalysis = await runGeminiAnalysis(nextSettings);
          const nextFeed = feedLines(nextAnalysis, nextInsights);
          const nextRuntime: RuntimeStatus = {
            state: "done",
            messages: nextFeed,
            lastUpdated: Date.now()
          };

          settingsRef.current = nextSettings;
          setSettings(nextSettings);
          setComparison("adapted");
          setInsights(nextInsights);
          setAnalysis(nextAnalysis);
          setMessages(nextFeed);
          setRuntime(nextRuntime);
          setVisible(true);
          saveSettings(nextSettings).catch(() => undefined);
          applyAdaptation(document, settingsForReport(nextSettings, nextAnalysis), nextInsights);

          sendResponse({ settings: nextSettings, insights: nextInsights, analysis: nextAnalysis, runtime: nextRuntime } satisfies NeuroAdaptStateMessage);
        })();
        return true;
      }

      if (message.type === "NA_RESET_PAGE") {
        const nextSettings: ExtensionSettings = {
          ...settingsRef.current,
          enabled: false,
          comparisonMode: "original"
        };

        const nextInsights = inspectPage(document);
        const nextAnalysis = buildAnalysisReport(nextSettings, nextInsights);
        const nextRuntime: RuntimeStatus = {
          state: "idle",
          messages: ["Original interface restored."],
          lastUpdated: Date.now()
        };

        settingsRef.current = nextSettings;
        setSettings(nextSettings);
        setComparison("original");
        setInsights(nextInsights);
        setAnalysis(nextAnalysis);
        setMessages(nextRuntime.messages);
        setRuntime(nextRuntime);
        setVisible(false);
        saveSettings(nextSettings).catch(() => undefined);
        resetAdaptation(document);
        resetDomActions(document);

        sendResponse({ settings: nextSettings, insights: nextInsights, analysis: nextAnalysis, runtime: nextRuntime } satisfies NeuroAdaptStateMessage);
        return false;
      }

      if (message.type === "NA_SET_COMPARISON") {
        const nextMode = message.payload.mode;
        const nextSettings = { ...settingsRef.current, comparisonMode: nextMode };
        settingsRef.current = nextSettings;
        setSettings(nextSettings);
        setComparison(nextMode);
        saveSettings(nextSettings).catch(() => undefined);

        if (nextMode === "adapted") {
          applyAdaptation(document, nextSettings, insights);
          setVisible(true);
        } else {
          resetAdaptation(document);
        }

        sendResponse({ settings: nextSettings, insights, analysis, runtime } satisfies NeuroAdaptStateMessage);
        return false;
      }

      if (message.type === "NA_SHOW_STATUS") {
        setMessages((current) => [message.payload.message, ...current].slice(0, 5));
        sendResponse({ ok: true });
        return false;
      }

      return false;
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [analysis, insights, runtime, settings]);

  async function persistSettings(next: ExtensionSettings): Promise<void> {
    settingsRef.current = next;
    setSettings(next);
    setComparison(next.comparisonMode);
    await saveSettings(next);
  }

  async function runGeminiAnalysis(nextSettings: ExtensionSettings, question?: string): Promise<AnalysisReport> {
    const nextInsights = inspectPage(document);
    const heuristicReport = buildAnalysisReport(nextSettings, nextInsights);
    const response = await sendRuntimeMessage<AiAnalysisMessage>({
      type: "NA_RUN_GEMINI_ANALYSIS",
      payload: {
        summary: extractPageSummary(document),
        preferredPersona: nextSettings.persona,
        question
      }
    });

    if (!response?.ok || !response.analysis) {
      const message = response?.error ? `Gemini unavailable: ${response.error}` : "Gemini unavailable. Using local heuristic analysis.";
      setMessages((current) => [message, ...current].slice(0, 5));
      return heuristicReport;
    }

    // Apply Gemini-driven CSS and DOM restructuring
    if (response.analysis.customCss || response.analysis.domActions?.length) {
      applyDomActions(document, response.analysis.domActions ?? [], response.analysis.customCss);
    }

    return buildAnalysisReport(nextSettings, nextInsights, response.analysis);
  }

  async function analyzePage(): Promise<void> {
    setBusy("analyze");
    const nextInsights = inspectPage(document);
    const nextAnalysis = await runGeminiAnalysis(settingsRef.current);
    const nextFeed = feedLines(nextAnalysis, nextInsights);
    setInsights(nextInsights);
    setAnalysis(nextAnalysis);
    setMessages(nextFeed);
    setRuntime({
      state: "analyzing",
      messages: nextFeed,
      lastUpdated: Date.now()
    });
    setVisible(true);
    setBusy(null);
  }

  async function adaptPage(): Promise<void> {
    setBusy("adapt");
    const nextSettings: ExtensionSettings = {
      ...settingsRef.current,
      enabled: true,
      comparisonMode: "adapted"
    };
    await persistSettings(nextSettings);

    const nextInsights = inspectPage(document);
    const nextAnalysis = await runGeminiAnalysis(nextSettings);
    const nextFeed = feedLines(nextAnalysis, nextInsights);
    setInsights(nextInsights);
    setAnalysis(nextAnalysis);
    setMessages(nextFeed);
    setRuntime({
      state: "done",
      messages: nextFeed,
      lastUpdated: Date.now()
    });
    setVisible(true);
    applyAdaptation(document, settingsForReport(nextSettings, nextAnalysis), nextInsights);
    setBusy(null);
  }

  async function resetPage(): Promise<void> {
    setBusy("reset");
    const nextSettings: ExtensionSettings = {
      ...settingsRef.current,
      enabled: false,
      comparisonMode: "original"
    };
    await persistSettings(nextSettings);

    const nextInsights = inspectPage(document);
    const nextAnalysis = buildAnalysisReport(nextSettings, nextInsights);
    setInsights(nextInsights);
    setAnalysis(nextAnalysis);
    setMessages(["Original interface restored."]);
    setRuntime({
      state: "idle",
      messages: ["Original interface restored."],
      lastUpdated: Date.now()
    });
    setVisible(false);
    resetAdaptation(document);
    resetDomActions(document);
    setBusy(null);
  }

  async function toggleComparison(nextMode: "original" | "adapted"): Promise<void> {
    const nextSettings = { ...settingsRef.current, comparisonMode: nextMode };
    await persistSettings(nextSettings);

    if (nextMode === "adapted") {
      applyAdaptation(document, nextSettings, insights);
      setVisible(true);
    } else {
      resetAdaptation(document);
    }
  }

  function speakSummary(): void {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(
      analysis.observedChallenges.join(". ") || analysis.adaptationsApplied.join(". ")
    );
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setMessages((current) => ["Speaking page summary.", ...current].slice(0, 5));
  }

  function currentModeLabel(): string {
    if (settings.persona === "auto") {
      return `${PERSONA_LABELS.auto} -> ${PERSONA_LABELS[insights.detectedPersona]}`;
    }
    return PERSONA_LABELS[settings.persona];
  }

  useEffect(() => {
    const heuristics = new HeuristicObserver((signal) => {
      const nextSettings: ExtensionSettings = {
        ...settingsRef.current,
        enabled: true,
        persona: signal.suggestedPersona,
        comparisonMode: "adapted",
        autoDetect: true
      };
      const nextInsights = inspectPage(document);
      const nextAnalysis = buildAnalysisReport(nextSettings, nextInsights);
      const nextFeed = [signal.message, ...feedLines(nextAnalysis, nextInsights)].slice(0, 5);

      settingsRef.current = nextSettings;
      setSettings(nextSettings);
      setComparison("adapted");
      setInsights(nextInsights);
      setAnalysis(nextAnalysis);
      setMessages(nextFeed);
      setRuntime({
        state: "done",
        messages: nextFeed,
        lastUpdated: Date.now()
      });
      setVisible(true);
      saveSettings(nextSettings).catch(() => undefined);
      applyAdaptation(document, nextSettings, nextInsights);
    });

    heuristics.start(document);
    return () => heuristics.stop();
  }, []);

  const resolvedPersona = settings.persona === "auto" ? insights.detectedPersona : settings.persona;
  const isFirstTimeMode = resolvedPersona === "firstTime";

  const metricRows = [
    {
      label: "Readability",
      before: `${analysis.before.readability}%`,
      after: `${analysis.after.readability}%`,
      value: analysis.after.readability
    },
    {
      label: "Navigation complexity",
      before: analysis.before.navigationComplexity,
      after: analysis.after.navigationComplexity,
      value: complexityValue(analysis.after.navigationComplexity)
    },
    {
      label: "Estimated task time",
      before: formatTaskTime(analysis.before.estimatedTaskSeconds),
      after: formatTaskTime(analysis.after.estimatedTaskSeconds),
      value: Math.max(15, Math.min(92, Math.round((analysis.after.estimatedTaskSeconds / Math.max(analysis.before.estimatedTaskSeconds, 1)) * 100)))
    }
  ];

  return (
    <div className="na-root" aria-live="polite">
      <AnimatePresence initial={false}>
        {showAssistant && !collapsed ? (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.24 }}
            className="na-shell"
          >
            <div className="na-card">
              <div className="na-header">
                <div className="na-brand">
                  <div className="na-mark">
                    <Sparkles size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="na-title">NeuroAdapt AI</p>
                    <p className="na-subtitle">Technology that adapts to you</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="na-button na-secondary"
                  onClick={() => setCollapsed(true)}
                  aria-label="Collapse assistant"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              <div className="na-body">
                <TaskAssistantPanel
                  settings={settings}
                  persona={resolvedPersona}
                  onStatus={(message) => setMessages((current) => [message, ...current].slice(0, 5))}
                />

                {isFirstTimeMode ? (
                  <div className="na-section na-first-time-banner">
                    <div className="na-section-head">
                      <SectionTitle title="First-Time Guide Mode" subtitle="Step-by-step AI guidance is active for this page." />
                      <Pill className="text-[10px] border-emerald-400/20 bg-emerald-400/10 text-emerald-100">Live guide</Pill>
                    </div>
                    <p className="na-text na-muted">
                      Use the Task Assistant above to ask questions in plain language. I'll highlight what to click and walk you through forms.
                    </p>
                  </div>
                ) : null}

                <div className="na-section">
                  <div className="na-section-head">
                    <SectionTitle title="Floating AI Assistant" subtitle="Live messages from the adaptive engine." />
                    <Pill className="text-[10px] border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
                      {runtime.state}
                    </Pill>
                  </div>

                  <div className="na-feed">
                    {messages.map((message, index) => (
                      <div key={`${message}-${index}`} className="na-feed-item">
                        <span className="na-dot" />
                        <span>{message}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="na-section">
                  <div className="na-section-head">
                    <SectionTitle title="AI Explanation Panel" subtitle="Heuristic values are clearly marked as demo behavior." />
                    <button className="na-button na-secondary" type="button" onClick={speakSummary}>
                      <Mic size={14} />
                    </button>
                  </div>

                  <p className="na-text">
                    <strong>Detected Persona:</strong> {personaTitle(settings, insights)}
                  </p>
                  <p className="na-text na-muted" style={{ marginTop: 8 }}>
                    <strong>Page:</strong> {insights.title}
                  </p>
                  {analysis.ai ? (
                    <p className="na-text na-muted" style={{ marginTop: 8 }}>
                      <strong>Gemini score:</strong> {analysis.ai.score}/100
                    </p>
                  ) : null}

                  <div className="na-grid" style={{ marginTop: 12 }}>
                    <div>
                      <div className="na-label" style={{ marginBottom: 8 }}>
                        Observed Challenges
                      </div>
                      <div className="na-chip-row">
                        {analysis.observedChallenges.map((item) => (
                          <span key={item} className="na-chip">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="na-label" style={{ marginBottom: 8 }}>
                        Adaptations Applied
                      </div>
                      <div className="na-chip-row">
                        {analysis.adaptationsApplied.map((item) => (
                          <span key={item} className="na-chip">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {analysis.ai?.guidance.length ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="na-label" style={{ marginBottom: 8 }}>
                        AI Guidance
                      </div>
                      <div className="na-feed">
                        {analysis.ai.guidance.slice(0, 3).map((item) => (
                          <div key={item.title} className="na-feed-item">
                            <span className="na-dot" />
                            <span>
                              <strong>{item.title}:</strong> {item.body}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="na-section">
                  <div className="na-section-head">
                    <SectionTitle title="Before vs After" subtitle="Drag the slider to compare original and adapted states." />
                    <Pill className="text-[10px] border-white/10 bg-white/5">
                      {comparison === "original" ? "Original" : "Adapted"}
                    </Pill>
                  </div>

                  <input
                    className="na-slider"
                    type="range"
                    min={0}
                    max={100}
                    value={comparison === "adapted" ? 100 : 0}
                    onChange={(event) => toggleComparison(Number(event.currentTarget.value) > 50 ? "adapted" : "original")}
                    aria-label="Compare original and adapted interface"
                  />

                  <div className="na-chip-row" style={{ marginTop: 10 }}>
                    <span className="na-pill">Original page</span>
                    <span className="na-pill">Adapted page</span>
                  </div>
                </div>

                <div className="na-section">
                  <div className="na-section-head">
                    <SectionTitle title="Accessibility Metrics Dashboard" subtitle="Animated improvements based on the current page." />
                    <Pill className="text-[10px] border-emerald-400/20 bg-emerald-400/10 text-emerald-100">
                      Demo values
                    </Pill>
                  </div>

                  <div className="na-metrics">
                    {metricRows.map((row) => (
                      <div key={row.label} className="na-metric-card">
                        <div className="na-metric-head">
                          <span>{row.label}</span>
                          <span>
                            {row.before} {"->"} {row.after}
                          </span>
                        </div>
                        <ProgressBar value={row.value} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="na-section">
                  <div className="na-section-head">
                    <SectionTitle title="Quick actions" subtitle="Use the same controls from the popup." />
                    <Pill className="text-[10px] border-white/10 bg-white/5">Keyboard accessible</Pill>
                  </div>

                  <div className="na-button-row">
                    <button type="button" className="na-button na-primary" onClick={analyzePage}>
                      {busy === "analyze" ? <Loader2 size={14} className="inline animate-spin" /> : <ScanSearch size={14} />}
                      <span style={{ marginLeft: 8 }}>Analyze</span>
                    </button>
                    <button type="button" className="na-button na-primary" onClick={adaptPage}>
                      {busy === "adapt" ? <Loader2 size={14} className="inline animate-spin" /> : <ShieldCheck size={14} />}
                      <span style={{ marginLeft: 8 }}>Adapt</span>
                    </button>
                    <button type="button" className="na-button na-warning" onClick={resetPage}>
                      {busy === "reset" ? <Loader2 size={14} className="inline animate-spin" /> : <RefreshCcw size={14} />}
                      <span style={{ marginLeft: 8 }}>Reset</span>
                    </button>
                    <button type="button" className="na-button" onClick={speakSummary}>
                      <Eye size={14} />
                      <span style={{ marginLeft: 8 }}>Read out</span>
                    </button>
                  </div>
                </div>

                <div className="na-section">
                  <div className="na-section-head">
                    <SectionTitle title="Status" subtitle="Current page state and selection." />
                  </div>
                  <p className="na-text">
                    <strong>Persona:</strong> {PERSONA_LABELS[settings.persona]}
                  </p>
                  <p className="na-text na-muted" style={{ marginTop: 8 }}>
                    <strong>Readability:</strong> {analysis.before.readability}% before / {analysis.after.readability}% after
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {showAssistant && collapsed ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.94 }}
            transition={{ duration: 0.22 }}
            className="na-shell na-collapsed"
          >
            <button
              type="button"
              className="na-launcher na-collapsed-launcher"
              onClick={() => setCollapsed(false)}
              aria-label="Reopen assistant"
            >
              <div className="na-mark" style={{ width: 38, height: 38, borderRadius: 14 }}>
                <Bot size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>NeuroAdapt AI</div>
                <div className="na-compact">{settings.enabled ? "Adaptation active" : "Ready to adapt"}</div>
              </div>
              <ArrowRight size={14} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
