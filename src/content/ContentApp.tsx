import { motion } from "framer-motion";
import {
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
import { applyDomActions, resetDomActions, clearGuidanceHighlights } from "@/shared/elementGuide";
import { simplifyPage } from "@/shared/simplifyPage";
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
  if (insights.healthcareSignals > 0) lines.splice(1, 0, "Healthcare signals detected.");
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

  // collapsed: whether the panel is minimised to the bubble
  const [collapsed, setCollapsed] = useState(false);
  // visible: user has intentionally opened the panel OR extension is enabled from popup
  const [visible, setVisible] = useState(false);

  const [comparison, setComparison] = useState<"original" | "adapted">(DEFAULT_SETTINGS.comparisonMode);
  const [busy, setBusy] = useState<"analyze" | "adapt" | "reset" | null>(null);

  const [confusionSignals, setConfusionSignals] = useState<ConfusionSignal[]>([]);
  const [pendingSuggestion, setPendingSuggestion] = useState<HeuristicSignal | null>(null);
  const [, setSidebarVisible] = useState(false);

  // Text from the AI auto-scan so speakSummary reads something meaningful
  const [pageSummaryText, setPageSummaryText] = useState("");

  const settingsRef = useRef(settings);
  const debounceRef = useRef<number | null>(null);
  const simplifyCleanupRef = useRef<(() => void) | null>(null);

  const showAssistant = visible || settings.enabled;
  const panelOpen = showAssistant && !collapsed;
  const bubbleVisible = !panelOpen;

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
      setMessages(next.enabled
        ? feedLines(nextAnalysis, nextInsights)
        : ["Adaptive assistant loaded.", "Awaiting page analysis."]
      );
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
    return () => { mounted = false; };
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
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        const nextInsights = inspectPage(document);
        const nextAnalysis = buildAnalysisReport(settingsRef.current, nextInsights);
        setInsights(nextInsights);
        setAnalysis(nextAnalysis);
        setMessages((current) => {
          const nextFeed = settingsRef.current.enabled ? feedLines(nextAnalysis, nextInsights) : current;
          setRuntime((s) => ({ ...s, messages: nextFeed, lastUpdated: Date.now() }));
          return nextFeed;
        });
        if (settingsRef.current.enabled && settingsRef.current.comparisonMode === "adapted") {
          applyAdaptation(document, settingsRef.current, nextInsights);
        }
      }, 220);
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
    return () => {
      observer.disconnect();
      if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
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
          const previewSettings: ExtensionSettings = { ...settingsRef.current, enabled: true, comparisonMode: "adapted" };
          const nextRuntime: RuntimeStatus = { state: "analyzing", messages: nextFeed, lastUpdated: Date.now() };
          setInsights(nextInsights); setAnalysis(nextAnalysis); setMessages(nextFeed); setRuntime(nextRuntime);
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
          // 1. Instant visual transformation — happens before Gemini
          simplifyCleanupRef.current?.();
          simplifyCleanupRef.current = simplifyPage(document, nextSettings.persona);
          // 2. Gemini analysis runs in background; page already looks different
          const nextInsights = inspectPage(document);
          const nextAnalysis = await runGeminiAnalysis(nextSettings);
          const nextFeed = feedLines(nextAnalysis, nextInsights);
          const nextRuntime: RuntimeStatus = { state: "done", messages: nextFeed, lastUpdated: Date.now() };
          settingsRef.current = nextSettings;
          setSettings(nextSettings); setComparison("adapted"); setInsights(nextInsights);
          setAnalysis(nextAnalysis); setMessages(nextFeed); setRuntime(nextRuntime);
          setVisible(true);
          saveSettings(nextSettings).catch(() => undefined);
          sendResponse({ settings: nextSettings, insights: nextInsights, analysis: nextAnalysis, runtime: nextRuntime } satisfies NeuroAdaptStateMessage);
        })();
        return true;
      }

      if (message.type === "NA_RESET_PAGE") {
        const nextSettings: ExtensionSettings = { ...settingsRef.current, enabled: false, comparisonMode: "original" };
        const nextInsights = inspectPage(document);
        const nextAnalysis = buildAnalysisReport(nextSettings, nextInsights);
        const nextRuntime: RuntimeStatus = { state: "idle", messages: ["Original interface restored."], lastUpdated: Date.now() };
        settingsRef.current = nextSettings;
        setSettings(nextSettings); setComparison("original"); setInsights(nextInsights);
        setAnalysis(nextAnalysis); setMessages(nextRuntime.messages); setRuntime(nextRuntime);
        setVisible(false);
        saveSettings(nextSettings).catch(() => undefined);
        resetAdaptation(document); resetDomActions(document);
        simplifyCleanupRef.current?.();
        simplifyCleanupRef.current = null;
        sendResponse({ settings: nextSettings, insights: nextInsights, analysis: nextAnalysis, runtime: nextRuntime } satisfies NeuroAdaptStateMessage);
        return false;
      }

      if (message.type === "NA_SET_COMPARISON") {
        const nextMode = message.payload.mode;
        const nextSettings = { ...settingsRef.current, comparisonMode: nextMode };
        settingsRef.current = nextSettings;
        setSettings(nextSettings); setComparison(nextMode);
        saveSettings(nextSettings).catch(() => undefined);
        if (nextMode === "adapted") { applyAdaptation(document, nextSettings, insights); setVisible(true); }
        else { resetAdaptation(document); }
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
      payload: { summary: extractPageSummary(document), preferredPersona: nextSettings.persona, question }
    });
    if (!response?.ok || !response.analysis) {
      const msg = response?.error ? `AI unavailable: ${response.error}` : "AI unavailable. Using local heuristic analysis.";
      setMessages((current) => [msg, ...current].slice(0, 5));
      return heuristicReport;
    }
    // Persona CSS is already injected by simplifyPage; only apply Gemini's page-specific output
    if (response.analysis.customCss || (response.analysis.domActions?.length ?? 0) > 0) {
      applyDomActions(document, response.analysis.domActions ?? [], response.analysis.customCss || undefined);
    }
    return buildAnalysisReport(nextSettings, nextInsights, response.analysis);
  }

  async function adaptPage(): Promise<void> {
    setBusy("adapt");
    const nextSettings: ExtensionSettings = { ...settingsRef.current, enabled: true, comparisonMode: "adapted" };
    await persistSettings(nextSettings);
    // 1. Instant visual transformation
    simplifyCleanupRef.current?.();
    simplifyCleanupRef.current = simplifyPage(document, nextSettings.persona);
    // 2. Gemini page-specific enhancements (after user already sees the change)
    const nextInsights = inspectPage(document);
    const nextAnalysis = await runGeminiAnalysis(nextSettings);
    const nextFeed = feedLines(nextAnalysis, nextInsights);
    setInsights(nextInsights); setAnalysis(nextAnalysis); setMessages(nextFeed);
    setRuntime({ state: "done", messages: nextFeed, lastUpdated: Date.now() });
    setVisible(true);
    setBusy(null);
  }

  async function resetPage(): Promise<void> {
    setBusy("reset");
    const nextSettings: ExtensionSettings = { ...settingsRef.current, enabled: false, comparisonMode: "original" };
    await persistSettings(nextSettings);
    const nextInsights = inspectPage(document);
    const nextAnalysis = buildAnalysisReport(nextSettings, nextInsights);
    setInsights(nextInsights); setAnalysis(nextAnalysis);
    setMessages(["Original interface restored."]);
    setRuntime({ state: "idle", messages: ["Original interface restored."], lastUpdated: Date.now() });
    setVisible(false);
    resetAdaptation(document); resetDomActions(document); clearGuidanceHighlights(document);
    simplifyCleanupRef.current?.();
    simplifyCleanupRef.current = null;
    setBusy(null);
  }

  function speakSummary(): void {
    if (!("speechSynthesis" in window)) return;
    // Use the AI page summary if available, otherwise fall back to insights summary
    const text = pageSummaryText || insights.summary || analysis.observedChallenges.join(". ") || "No summary available.";
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setMessages((current) => ["Speaking page summary.", ...current].slice(0, 5));
  }

  useEffect(() => {
    const heuristics = new HeuristicObserver((signal) => {
      setConfusionSignals(signal.signals);
      // Show the hint card near the bubble — don't force the full panel open.
      if (signal.signals.some((s) => s.severity === "high")) {
        setPendingSuggestion(signal);
      }
    });
    heuristics.start(document);
    return () => heuristics.stop();
  }, []);

  function acceptHeuristicSuggestion(): void {
    if (!pendingSuggestion) return;
    const signal = pendingSuggestion;
    const nextSettings: ExtensionSettings = {
      ...settingsRef.current, enabled: true,
      persona: signal.suggestedPersona, comparisonMode: "adapted"
    };
    const nextInsights = inspectPage(document);
    const nextAnalysis = buildAnalysisReport(nextSettings, nextInsights);
    const nextFeed = [signal.message, ...feedLines(nextAnalysis, nextInsights)].slice(0, 5);
    settingsRef.current = nextSettings;
    setSettings(nextSettings); setComparison("adapted"); setInsights(nextInsights);
    setAnalysis(nextAnalysis); setMessages(nextFeed);
    setRuntime({ state: "done", messages: nextFeed, lastUpdated: Date.now() });
    setVisible(true); setCollapsed(false);
    saveSettings(nextSettings).catch(() => undefined);
    applyAdaptation(document, nextSettings, nextInsights);
    setPendingSuggestion(null);
  }

  function dismissHeuristicSuggestion(): void { setPendingSuggestion(null); }

  function openPanel(): void { setVisible(true); setCollapsed(false); }

  const resolvedPersona = settings.persona;

  return (
    <div className="na-root" aria-live="polite">

      {/* ── Full panel ─────────────────────────────────────────────────
          Always kept in the DOM so TaskAssistantPanel never loses its
          chat history or auto-scan state when the user closes the panel.
          Visibility + pointer-events toggle it on/off; framer-motion
          animates the opacity/position so enter/exit feel polished.
      ───────────────────────────────────────────────────────────────── */}
      <motion.div
          className="na-shell"
          initial={false}
          animate={panelOpen
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 24, scale: 0.98 }
          }
          transition={{ duration: 0.24 }}
          style={{
            visibility: panelOpen ? "visible" : "hidden",
            pointerEvents: panelOpen ? "auto" : "none",
          }}
          aria-hidden={!panelOpen}
        >
          <div className="na-card">

            {/* Header */}
            <div className="na-header">
              <div className="na-brand">
                <div className="na-mark"><Sparkles size={18} /></div>
                <p className="na-title">AI Assistant</p>
              </div>
              <button
                type="button"
                className="na-button na-secondary"
                onClick={() => setCollapsed(true)}
                aria-label="Close assistant"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            <div className="na-body">

              {/* Heuristic suggestion (only inside open panel) */}
              {pendingSuggestion ? (
                <div className="na-section na-suggestion-banner" role="alertdialog" aria-label="Adaptation suggestion">
                  <p className="na-text" style={{ marginBottom: 10 }}>
                    {pendingSuggestion.message}
                  </p>
                  <div className="na-button-row">
                    <button type="button" className="na-button na-primary" onClick={acceptHeuristicSuggestion}>
                      <ShieldCheck size={14} />
                      <span style={{ marginLeft: 6 }}>Yes, help me</span>
                    </button>
                    <button type="button" className="na-button na-secondary" onClick={dismissHeuristicSuggestion}>
                      Not now
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Chat — TaskAssistantPanel stays mounted even when panel is visually hidden */}
              <TaskAssistantPanel
                settings={settings}
                persona={resolvedPersona}
                onStatus={(message) => setMessages((current) => [message, ...current].slice(0, 5))}
                onGoalChange={() => setSidebarVisible((v) => !v)}
                confusionSignals={confusionSignals}
                onPageSummary={(text) => setPageSummaryText(text)}
              />

              {/* Reading & display options (collapsed by default) */}
              <OverlayPanel />

              {/* Footer actions */}
              <div className="na-footer-row">
                <button
                  type="button"
                  className={`na-button na-adapt-btn ${settings.enabled ? "na-warning" : "na-primary"}`}
                  onClick={settings.enabled ? resetPage : adaptPage}
                  disabled={!!busy}
                >
                  {busy === "adapt" || busy === "reset"
                    ? <Loader2 size={14} className="inline animate-spin" />
                    : settings.enabled ? <RefreshCcw size={14} /> : <ShieldCheck size={14} />
                  }
                  <span style={{ marginLeft: 6 }}>
                    {settings.enabled ? "Restore original" : "Simplify this page"}
                  </span>
                </button>
                <button
                  type="button"
                  className="na-button na-secondary na-read-aloud-btn"
                  onClick={speakSummary}
                  aria-label="Read page summary aloud"
                  title="Read aloud"
                >
                  <Mic size={14} />
                  <span style={{ marginLeft: 5 }}>Read aloud</span>
                </button>
              </div>

            </div>
          </div>
        </motion.div>

      {/* ── Bubble + hint card ─────────────────────────────────────── */}
      {bubbleVisible ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="na-shell na-collapsed"
        >
          {/* Hint card floats above the bubble when heuristics detect confusion */}
          {pendingSuggestion ? (
            <motion.div
              key="hint-card"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="na-hint-card"
              role="alertdialog"
              aria-label="Help suggestion"
            >
              <p className="na-hint-text">{pendingSuggestion.message}</p>
              <div className="na-hint-actions">
                <button
                  type="button"
                  className="na-hint-btn na-hint-yes"
                  onClick={() => { acceptHeuristicSuggestion(); openPanel(); }}
                >
                  Yes, help me
                </button>
                <button
                  type="button"
                  className="na-hint-btn na-hint-no"
                  onClick={dismissHeuristicSuggestion}
                >
                  Not now
                </button>
              </div>
            </motion.div>
          ) : null}

          <button
            type="button"
            className="na-bubble"
            onClick={openPanel}
            aria-label="Open AI assistant"
          >
            <Bot size={20} />
            {settings.enabled ? <span className="na-bubble-dot" /> : null}
          </button>
        </motion.div>
      ) : null}

      {/* Task sidebar — shown only when the main panel is collapsed so goal info isn't duplicated */}
      {!panelOpen ? (
        <TaskSidebar onRequestReanalysis={() => {
          if (settings.enabled) applyAdaptation(document, settings, inspectPage(document));
        }} />
      ) : null}
    </div>
  );
}
