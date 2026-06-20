import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  ChevronDown,
  Loader2,
  Mic,
  RefreshCcw,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { applyAdaptation, resetAdaptation } from "@/shared/adaptation";
import { sendRuntimeMessage } from "@/shared/chrome";
import { applyDomActions, resetDomActions } from "@/shared/elementGuide";
import { HeuristicObserver, type HeuristicSignal } from "@/shared/heuristics";
import { buildAnalysisReport, inspectPage } from "@/shared/pageInsights";
import { extractPageSummary } from "@/shared/pageSummary";
import {
  DEFAULT_SETTINGS,
  type AnalysisReport,
  type ExtensionSettings,
  type PageInsights,
  type RuntimeStatus
} from "@/shared/types";
import { loadSettings, saveSettings, subscribeToSettings } from "@/shared/storage";
import { Pill, SectionTitle } from "@/shared/ui";

import type { NeuroAdaptMessage, NeuroAdaptStateMessage } from "@/shared/messaging";
import type { AiAnalysisMessage } from "@/shared/messaging";

import { TaskAssistantPanel } from "@/content/TaskAssistantPanel";
import { TaskSidebar } from "@/content/TaskSidebar";
import { OverlayPanel } from "@/content/OverlayPanel";
import type { ConfusionSignal } from "@/shared/types";
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

  if (persona === "firstTime") {
    lines.splice(2, 0, "Adding step-by-step guidance...");
  } else {
    lines.splice(2, 0, "Increasing target size and spacing...");
  }

  if (report.ai?.source === "gemini") {
    lines.splice(1, 0, report.ai.cached ? "Using cached AI accessibility reasoning." : "AI accessibility reasoning complete.");
    if (report.ai.summary) lines.splice(2, 0, report.ai.summary);
  }

  return lines;
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
  const [, setMessages] = useState<string[]>(runtime.messages);
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [comparison, setComparison] = useState<"original" | "adapted">(DEFAULT_SETTINGS.comparisonMode);
  const [busy, setBusy] = useState<"analyze" | "adapt" | "reset" | null>(null);

  const [, setConfusionSignals] = useState<ConfusionSignal[]>([]);
  const [pendingSuggestion, setPendingSuggestion] = useState<HeuristicSignal | null>(null);
  const [, setSidebarVisible] = useState(false);
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

    applyAdaptation(document, { ...settings, comparisonMode: comparison }, insights);
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

    return () => {
      observer.disconnect();
      // The debounced re-analysis timeout can otherwise fire after unmount
      // (e.g. on SPA teardown/remount) and call setState on a dead component.
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
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
          applyAdaptation(document, previewSettings, nextInsights);
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
            comparisonMode: "adapted"
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
          applyAdaptation(document, nextSettings, nextInsights);

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
      type: "NA_RUN_ANALYSIS",
      payload: {
        summary: extractPageSummary(document),
        preferredPersona: nextSettings.persona,
        question
      }
    });

    if (!response?.ok || !response.analysis) {
      const message = response?.error ? `AI unavailable: ${response.error}` : "AI unavailable. Using local heuristic analysis.";
      setMessages((current) => [message, ...current].slice(0, 5));
      return heuristicReport;
    }

    // Apply Gemini-driven CSS and DOM restructuring
    if (response.analysis.customCss || response.analysis.domActions?.length) {
      applyDomActions(document, response.analysis.domActions ?? [], response.analysis.customCss);
    }

    return buildAnalysisReport(nextSettings, nextInsights, response.analysis);
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
    applyAdaptation(document, nextSettings, nextInsights);
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

  function speakSummary(): void {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(
      analysis.observedChallenges.join(". ") || analysis.adaptationsApplied.join(". ")
    );
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setMessages((current) => ["Speaking page summary.", ...current].slice(0, 5));
  }

  useEffect(() => {
    const heuristics = new HeuristicObserver((signal) => {
      setConfusionSignals(signal.signals);

      // Only surface a suggestion on strong signals - and always ask before mutating
      // the page, rather than silently auto-adapting out from under the user.
      if (signal.signals.some((s) => s.severity === "high")) {
        setPendingSuggestion(signal);
        setVisible(true);
        setCollapsed(false);
      }
    });

    heuristics.start(document);
    return () => heuristics.stop();
  }, []);

  function acceptHeuristicSuggestion(): void {
    if (!pendingSuggestion) return;
    const signal = pendingSuggestion;
    const nextSettings: ExtensionSettings = {
      ...settingsRef.current,
      enabled: true,
      persona: signal.suggestedPersona,
      comparisonMode: "adapted"
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
    setRuntime({ state: "done", messages: nextFeed, lastUpdated: Date.now() });
    setVisible(true);
    saveSettings(nextSettings).catch(() => undefined);
    applyAdaptation(document, nextSettings, nextInsights);
    setPendingSuggestion(null);
  }

  function dismissHeuristicSuggestion(): void {
    setPendingSuggestion(null);
  }

  const resolvedPersona = settings.persona;

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
                {pendingSuggestion ? (
                  <div className="na-section na-first-time-banner" role="alertdialog" aria-label="Adaptation suggestion">
                    <div className="na-section-head">
                      <SectionTitle
                        title="Need a hand?"
                        subtitle={pendingSuggestion.message}
                      />
                      <Pill className="text-[10px] border-amber-400/20 bg-amber-400/10 text-amber-100">
                        Suggested
                      </Pill>
                    </div>
                    <div className="na-button-row">
                      <button type="button" className="na-button na-primary" onClick={acceptHeuristicSuggestion}>
                        <ShieldCheck size={14} />
                        <span style={{ marginLeft: 8 }}>Apply</span>
                      </button>
                      <button type="button" className="na-button na-secondary" onClick={dismissHeuristicSuggestion}>
                        <span>Not now</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                <TaskAssistantPanel
                  settings={settings}
                  persona={resolvedPersona}
                  onStatus={(message) => setMessages((current) => [message, ...current].slice(0, 5))}
                  onGoalChange={() => setSidebarVisible((v) => !v)}
                  onConfusion={(signals) => setConfusionSignals(signals)}
                />

                <OverlayPanel />
                <TaskSidebar onRequestReanalysis={() => {
                  if (settings.enabled) {
                    applyAdaptation(document, settings, inspectPage(document));
                  }
                }} />

                <div className="na-section na-adapt-section">
                  <div className="na-section-head">
                    <SectionTitle
                      title="Page Comfort Mode"
                      subtitle={settings.enabled ? "Accessibility improvements are active." : "Enable to make this page easier to use."}
                    />
                    <Pill className={`text-[10px] ${settings.enabled ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/5"}`}>
                      {settings.enabled ? "Active" : "Off"}
                    </Pill>
                  </div>
                  <div className="na-adapt-actions">
                    <button type="button" className="na-button na-primary na-adapt-btn" onClick={adaptPage} disabled={!!busy}>
                      {busy === "adapt" ? <Loader2 size={14} className="inline animate-spin" /> : <ShieldCheck size={14} />}
                      <span style={{ marginLeft: 6 }}>{settings.enabled ? "Re-adapt" : "Make Comfortable"}</span>
                    </button>
                    <button type="button" className="na-button na-secondary" onClick={speakSummary} aria-label="Read page summary aloud">
                      <Mic size={14} />
                    </button>
                    {settings.enabled ? (
                      <button type="button" className="na-button na-warning" onClick={resetPage} disabled={!!busy}>
                        {busy === "reset" ? <Loader2 size={14} className="inline animate-spin" /> : <RefreshCcw size={14} />}
                        <span style={{ marginLeft: 6 }}>Reset</span>
                      </button>
                    ) : null}
                  </div>
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

