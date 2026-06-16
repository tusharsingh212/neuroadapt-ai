import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Gauge,
  Loader2,
  HeartPulse,
  Eye,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Volume2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { applyAdaptation, buildAdaptationSummary, resetAdaptation } from "@/shared/adaptation";
import { asErrorMessage, injectContentScriptIfNeeded, queryActiveTab, sendRuntimeMessage, sendToActiveTab } from "@/shared/chrome";
import { buildAnalysisReport, inspectPage } from "@/shared/pageInsights";
import { formatTaskTime } from "@/shared/metrics";
import {
  DEFAULT_SETTINGS,
  PERSONA_LABELS,
  PERSONA_OPTIONS,
  type AnalysisReport,
  type AiSettings,
  type ExtensionSettings,
  type PageSummary,
  type PageInsights,
  type PersonaId
} from "@/shared/types";
import { DEFAULT_AI_SETTINGS } from "@/shared/types";
import { loadAiSettings, loadSettings, saveAiSettings, saveSettings } from "@/shared/storage";
import { cx, Pill, ProgressBar, SectionTitle, SoftCard } from "@/shared/ui";

import type { AiAnalysisMessage, NeuroAdaptStateMessage } from "@/shared/messaging";

type BusyAction = "analyze" | "adapt" | "reset" | "testGemini" | null;

function statusToneClass(kind: "info" | "success" | "warning" | "error"): string {
  switch (kind) {
    case "success":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
    case "warning":
      return "border-amber-400/20 bg-amber-400/10 text-amber-100";
    case "error":
      return "border-rose-400/20 bg-rose-400/10 text-rose-100";
    default:
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-100";
  }
}

function formatPersonaLabel(persona: PersonaId, detectedPersona?: PersonaId): string {
  if (persona === "auto" && detectedPersona) return `${PERSONA_LABELS[persona]} -> ${PERSONA_LABELS[detectedPersona]}`;
  return PERSONA_LABELS[persona];
}

function createGeminiSmokeTestSummary(): PageSummary {
  return {
    title: "NeuroAdapt Gemini Smoke Test",
    url: "chrome-extension://neuroadapt/smoke-test",
    language: "en",
    description: "Synthetic page summary used to verify Gemini integration.",
    metadata: {},
    headings: [{ level: 1, text: "Patient appointment portal" }],
    navigation: [{ label: "Home", role: "link", tag: "a", smallTarget: false }],
    links: [{ label: "Insurance help", role: "link", tag: "a", smallTarget: true }],
    buttons: [
      { label: "Schedule appointment", role: "button", tag: "button", smallTarget: false },
      { label: "Submit form", role: "button", tag: "button", smallTarget: false }
    ],
    forms: [
      {
        label: "Appointment request",
        fields: [
          { label: "Patient name", role: "textbox", tag: "input", type: "text", smallTarget: false },
          { label: "Date of birth", role: "textbox", tag: "input", type: "date", smallTarget: false }
        ],
        buttons: [{ label: "Continue", role: "button", tag: "button", smallTarget: false }]
      }
    ],
    tables: [],
    textBlocks: [
      {
        text: "Users must choose a clinic, fill out several required fields, and continue to confirmation.",
        fontSize: 14,
        contrastRatio: 3.8
      }
    ],
    interactiveElements: [
      { label: "Schedule appointment", role: "button", tag: "button", smallTarget: false },
      { label: "Continue", role: "button", tag: "button", smallTarget: false },
      { label: "Insurance help", role: "link", tag: "a", smallTarget: true }
    ],
    stats: {
      interactiveCount: 3,
      smallTargetCount: 1,
      navCount: 1,
      formCount: 1,
      textBlockCount: 1,
      averageFontSize: 14,
      lowContrastCount: 1,
      bodyTextLength: 220
    }
  };
}

export function PopupApp(): JSX.Element {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
  const [insights, setInsights] = useState<PageInsights | null>(null);
  const [statusMessage, setStatusMessage] = useState("Ready to adapt.");
  const [statusTone, setStatusTone] = useState<"info" | "success" | "warning" | "error">("info");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [localPreview, setLocalPreview] = useState<AnalysisReport | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);

  useEffect(() => {
    let mounted = true;
    loadSettings().then((next) => {
      if (!mounted) return;
      setSettings(next);
    });
    loadAiSettings().then((next) => {
      if (!mounted) return;
      setAiSettings(next);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    saveSettings(settings).catch(() => undefined);
  }, [settings]);

  const selectedPersona = useMemo(
    () => PERSONA_OPTIONS.find((persona) => persona.id === settings.persona) ?? PERSONA_OPTIONS[4],
    [settings.persona]
  );

  const metrics = analysis ?? localPreview;

  async function persistSettings(next: ExtensionSettings, tone: typeof statusTone = "info"): Promise<void> {
    setSettings(next);
    setStatusMessage(`Persona set to ${formatPersonaLabel(next.persona, insights?.detectedPersona)}`);
    setStatusTone(tone);
    await saveSettings(next);
  }

  async function persistAiSettings(next: AiSettings): Promise<void> {
    setAiSettings(next);
    await saveAiSettings(next);
    setStatusMessage(next.geminiApiKey ? "Gemini API key saved locally for extension requests." : "Gemini API key cleared.");
    setStatusTone(next.geminiApiKey ? "success" : "warning");
  }

  async function testGeminiConnection(): Promise<void> {
    setBusyAction("testGemini");
    setStatusMessage("Testing Gemini with the saved API key...");
    setStatusTone("info");

    try {
      await saveAiSettings(aiSettings);
      const response = await sendRuntimeMessage<AiAnalysisMessage>({
        type: "NA_RUN_GEMINI_ANALYSIS",
        payload: {
          summary: createGeminiSmokeTestSummary(),
          preferredPersona: "firstTime",
          question: "Return a short accessibility analysis for this smoke test."
        }
      });

      if (!response?.ok || !response.analysis) {
        throw new Error(response?.error || "No Gemini response returned.");
      }

      setStatusMessage(`Gemini working. Persona: ${PERSONA_LABELS[response.analysis.persona]}, score: ${response.analysis.score}/100.`);
      setStatusTone("success");
    } catch (error) {
      setStatusMessage(`Gemini test failed: ${asErrorMessage(error)}`);
      setStatusTone("error");
    } finally {
      setBusyAction(null);
    }
  }

  async function analyzeCurrentPage(): Promise<void> {
    setBusyAction("analyze");
    setStatusMessage("Analyzing current page...");
    setStatusTone("info");

    try {
      const activeTab = await queryActiveTab();
      if (!activeTab?.id) {
        throw new Error("No active tab available.");
      }

      await injectContentScriptIfNeeded(activeTab.id);
      const response = await sendToActiveTab<NeuroAdaptStateMessage>({
        type: "NA_ANALYZE_PAGE"
      });

      if (response) {
        setSettings(response.settings);
        setAnalysis(response.analysis);
        setInsights(response.insights);
        setStatusMessage(`Analysis complete for ${response.insights.title}.`);
        setStatusTone("success");
        return;
      }

      const localInsights = inspectPage(document);
      const localReport = buildAnalysisReport(settings, localInsights);
      setInsights(localInsights);
      setLocalPreview(localReport);
      setStatusMessage("Preview analysis generated locally. Open a webpage for live adaptation.");
      setStatusTone("warning");
    } catch (error) {
      setStatusMessage(`Analysis failed: ${asErrorMessage(error)}`);
      setStatusTone("error");
    } finally {
      setBusyAction(null);
    }
  }

  async function adaptInterface(): Promise<void> {
    setBusyAction("adapt");
    setStatusMessage("Activating adaptive interface...");
    setStatusTone("info");

    const next = { ...settings, enabled: true, comparisonMode: "adapted" as const };
    await persistSettings(next, "success");

    try {
      const activeTab = await queryActiveTab();
      if (!activeTab?.id) {
        throw new Error("No active tab available.");
      }

      await injectContentScriptIfNeeded(activeTab.id);
      const response = await sendToActiveTab<NeuroAdaptStateMessage>({
        type: "NA_ADAPT_PAGE",
        payload: { persona: next.persona }
      });

      if (response) {
        setSettings(response.settings);
        setAnalysis(response.analysis);
        setInsights(response.insights);
      }

      setStatusMessage("Adaptive interface applied.");
      setStatusTone("success");
    } catch (error) {
      setStatusMessage(`Adaptation failed: ${asErrorMessage(error)}`);
      setStatusTone("error");
    } finally {
      setBusyAction(null);
    }
  }

  async function resetChanges(): Promise<void> {
    setBusyAction("reset");
    setStatusMessage("Restoring original page state...");
    setStatusTone("info");

    const next = { ...settings, enabled: false, comparisonMode: "original" as const };
    await persistSettings(next, "warning");

    try {
      const activeTab = await queryActiveTab();
      if (!activeTab?.id) {
        throw new Error("No active tab available.");
      }

      await injectContentScriptIfNeeded(activeTab.id);
      const response = await sendToActiveTab<NeuroAdaptStateMessage>({
        type: "NA_RESET_PAGE"
      });

      if (response) {
        setSettings(response.settings);
        setAnalysis(response.analysis);
        setInsights(response.insights);
      } else {
        resetAdaptation(document);
      }

      setStatusMessage("Changes reset.");
      setStatusTone("success");
    } catch (error) {
      setStatusMessage(`Reset failed: ${asErrorMessage(error)}`);
      setStatusTone("error");
    } finally {
      setBusyAction(null);
    }
  }

  async function toggleEnabled(nextEnabled: boolean): Promise<void> {
    const next: ExtensionSettings = {
      ...settings,
      enabled: nextEnabled,
      comparisonMode: nextEnabled ? "adapted" : "original"
    };
    await persistSettings(next, nextEnabled ? "success" : "warning");
    if (nextEnabled) {
      await adaptInterface();
    } else {
      await resetChanges();
    }
  }

  async function setComparisonMode(mode: "original" | "adapted"): Promise<void> {
    const next = { ...settings, comparisonMode: mode };
    await persistSettings(next, mode === "adapted" ? "success" : "warning");
    try {
      const activeTab = await queryActiveTab();
      if (!activeTab?.id) {
        throw new Error("No active tab available.");
      }

      await injectContentScriptIfNeeded(activeTab.id);
      await sendToActiveTab({
        type: "NA_SET_COMPARISON",
        payload: { mode }
      });
    } catch {
      // Dev fallback is handled locally by the content script or local preview.
    }
  }

  async function launchDemoPortal(): Promise<void> {
    if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
      const url = chrome.runtime.getURL("demo.html");
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    window.open("/demo.html", "_blank", "noopener,noreferrer");
  }

  async function speakSummary(): Promise<void> {
    const text =
      analysis?.observedChallenges.join(". ") ||
      insights?.summary ||
      "NeuroAdapt AI demo summary. Analyze a page to hear a page overview.";

    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    setStatusMessage("Speaking page summary.");
    setStatusTone("info");
  }

  const metricsCard = metrics
    ? [
        {
          label: "Readability",
          before: `${analysis ? analysis.before.readability : localPreview?.before.readability ?? 0}%`,
          after: `${analysis ? analysis.after.readability : localPreview?.after.readability ?? 0}%`,
          color: "from-cyan-400 to-emerald-400"
        },
        {
          label: "Navigation complexity",
          before: analysis ? analysis.before.navigationComplexity : localPreview?.before.navigationComplexity ?? "High",
          after: analysis ? analysis.after.navigationComplexity : localPreview?.after.navigationComplexity ?? "Low",
          color: "from-amber-400 to-orange-400"
        },
        {
          label: "Estimated task time",
          before: formatTaskTime(analysis ? analysis.before.estimatedTaskSeconds : localPreview?.before.estimatedTaskSeconds ?? 260),
          after: formatTaskTime(analysis ? analysis.after.estimatedTaskSeconds : localPreview?.after.estimatedTaskSeconds ?? 75),
          color: "from-rose-400 to-pink-400"
        }
      ]
    : [];

  const body = (
    <main className="relative flex h-full min-h-[640px] w-[380px] flex-col overflow-hidden text-slate-950">
      <div className="absolute inset-0 subtle-grid opacity-20" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400" />
      <div className="relative flex h-full flex-col gap-4 p-4">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel-strong rounded-[28px] p-4 text-slate-950"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-emerald-400 to-amber-400 text-slate-950 shadow-lg shadow-cyan-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-400">
                  NeuroAdapt AI
                </p>
                <h1 className="text-lg font-extrabold text-slate-950">Technology That Adapts To You</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-200 bg-white text-slate-900 transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              aria-label={panelOpen ? "Collapse panel" : "Open panel"}
            >
              {panelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Pill className="border-emerald-200 bg-emerald-50 text-emerald-800">
              {settings.enabled ? "Enabled" : "Paused"}
            </Pill>
            <Pill className="border-cyan-200 bg-cyan-50 text-cyan-800">
              {selectedPersona.badge}
            </Pill>
            <button
              type="button"
              onClick={launchDemoPortal}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-sky-50"
            >
              Demo portal <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.header>

        <AnimatePresence mode="wait">
          {panelOpen ? (
            <motion.section
              key="open"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ duration: 0.28 }}
              className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1"
            >
              <SoftCard className="space-y-3">
                <SectionTitle
                  title="Gemini API Key"
                  subtitle="Paste your key here. It is stored in Chrome local storage, not hardcoded into the app."
                />

                <label className="grid gap-2 text-xs font-bold text-slate-700">
                  API key
                  <input
                    type="password"
                    value={aiSettings.geminiApiKey}
                    onChange={(event) => setAiSettings({ ...aiSettings, geminiApiKey: event.currentTarget.value })}
                    placeholder="AIza..."
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-200"
                    autoComplete="off"
                  />
                </label>

                <label className="grid gap-2 text-xs font-bold text-slate-700">
                  Gemini model
                  <input
                    type="text"
                    value={aiSettings.model}
                    onChange={(event) => setAiSettings({ ...aiSettings, model: event.currentTarget.value })}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-200"
                  />
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => persistAiSettings(aiSettings)}
                    disabled={busyAction !== null}
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs font-extrabold text-emerald-900 transition hover:bg-emerald-100"
                  >
                    Save key
                  </button>
                  <button
                    type="button"
                    onClick={testGeminiConnection}
                    disabled={busyAction !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-3 text-xs font-extrabold text-cyan-900 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busyAction === "testGemini" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Test
                  </button>
                  <button
                    type="button"
                    onClick={() => persistAiSettings({ ...aiSettings, geminiApiKey: "" })}
                    disabled={busyAction !== null}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-extrabold text-slate-900 transition hover:bg-sky-50"
                  >
                    Clear
                  </button>
                </div>

                <p className="text-xs font-semibold leading-5 text-slate-600">
                  Production note: for public release, point the AI service layer at your backend and keep Gemini keys server-side.
                </p>
              </SoftCard>

              <SoftCard className="space-y-4">
                <div className="flex items-center justify-between">
                    <SectionTitle title="Adaptation Controls" subtitle="Enable, analyze, apply, and compare in one place." />
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700">
                    <span>Toggle</span>
                    <button
                      type="button"
                      onClick={() => toggleEnabled(!settings.enabled)}
                      className={cx(
                        "relative h-7 w-12 rounded-full border transition focus:outline-none focus:ring-2 focus:ring-cyan-400/60",
                        settings.enabled
                          ? "border-emerald-300 bg-emerald-100"
                          : "border-slate-200 bg-white"
                      )}
                    >
                      <span
                        className={cx(
                          "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
                          settings.enabled ? "left-6" : "left-1"
                        )}
                      />
                    </button>
                  </label>
                </div>

                <div className="grid gap-2">
                  {PERSONA_OPTIONS.map((persona) => {
                    const active = settings.persona === persona.id;
                    return (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => persistSettings({ ...settings, persona: persona.id }, "info")}
                        className={cx(
                          "group rounded-2xl border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-400/60",
                          active
                            ? "border-cyan-300 bg-cyan-50"
                            : "border-slate-200 bg-white hover:bg-sky-50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-extrabold text-slate-950">{persona.label}</span>
                          <span
                            className={cx(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.24em]",
                              active
                                ? "bg-sky-100 text-sky-900"
                                : "bg-slate-100 text-slate-600 group-hover:text-slate-800"
                            )}
                          >
                            {persona.badge}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{persona.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={analyzeCurrentPage}
                    disabled={busyAction !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-extrabold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busyAction === "analyze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                    Analyze
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={adaptInterface}
                    disabled={busyAction !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs font-extrabold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busyAction === "adapt" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Adapt
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={resetChanges}
                    disabled={busyAction !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-extrabold text-slate-900 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busyAction === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Reset
                  </motion.button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setComparisonMode("original")}
                    className={cx(
                      "flex-1 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                      settings.comparisonMode === "original"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    Original
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonMode("adapted")}
                    className={cx(
                      "flex-1 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                      settings.comparisonMode === "adapted"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    Adapted
                  </button>
                </div>
              </SoftCard>

              <SoftCard className="space-y-4">
                <SectionTitle
                  title="AI Explanation Panel"
                  subtitle="Realistic demo values derived from the current page and interaction profile."
                />

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Detected persona
                  </p>
                  <p className="mt-2 text-lg font-extrabold text-slate-950">
                    {analysis?.detectedPersonaLabel || formatPersonaLabel(settings.persona, insights?.detectedPersona)}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                    {analysis
                      ? buildAdaptationSummary(settings, insights ?? inspectPage(document)).join(" | ")
                      : "Analyze a page to populate observed challenges and adaptations applied."}
                  </p>
                </div>

                <div className="grid gap-3">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.26em] text-slate-600">
                      Observed challenges
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(analysis?.observedChallenges ?? ["Dense navigation", "Small clickable targets", "Low readability"]).map(
                        (item) => (
                          <span
                            key={item}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800"
                          >
                            {item}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.26em] text-slate-600">
                      Adaptations applied
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(analysis?.adaptationsApplied ?? ["Larger buttons", "Increased font sizes", "Simplified menus", "Improved spacing"]).map(
                        (item) => (
                          <div key={item} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                            {item}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </SoftCard>

              <SoftCard className="space-y-4">
                <div className="flex items-center justify-between">
                  <SectionTitle title="Accessibility Metrics Dashboard" subtitle="Animated before vs after indicators." />
                  <button
                    type="button"
                    onClick={speakSummary}
                    className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-900 transition hover:bg-sky-50"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Read aloud
                  </button>
                </div>

                <div className="grid gap-3">
                  {metricsCard.map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                        <div className="mb-2 flex items-center justify-between text-xs font-extrabold text-slate-700">
                          <span>{metric.label}</span>
                          <span className="text-slate-600">
                          {metric.before} {"->"} {metric.after}
                          </span>
                        </div>
                      <ProgressBar
                        value={
                          metric.label === "Readability"
                            ? Number.parseFloat(metric.after)
                            : metric.label === "Navigation complexity"
                              ? metric.after === "High"
                                ? 82
                                : metric.after === "Medium"
                                  ? 54
                                  : 28
                              : 78
                        }
                        color={metric.color}
                      />
                    </div>
                  ))}
                </div>
              </SoftCard>

              <SoftCard className="space-y-3">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-cyan-200" />
                  <SectionTitle title="Status" subtitle="Live demo actions and current state." />
                </div>

                <div className={cx("rounded-2xl border px-4 py-3 text-sm font-semibold leading-6", statusToneClass(statusTone))}>
                  {statusMessage}
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-slate-950">Current mode</p>
                    <p className="truncate text-xs font-semibold text-slate-700">
                      {settings.enabled ? "Adaptive interface active" : "Adaptation paused"} {"|"} {PERSONA_LABELS[settings.persona]}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Pill className="border-sky-200 bg-sky-50 text-sky-800">
                      {settings.comparisonMode === "original" ? "Before" : "After"}
                    </Pill>
                  </div>
                </div>

                {settings.persona === "visuallyImpaired" ? (
                  <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-xs font-semibold leading-5 text-cyan-900">
                    High-contrast and focus-friendly mode is ready. The overlay also exposes a speech shortcut.
                  </div>
                ) : null}
              </SoftCard>
            </motion.section>
          ) : (
            <motion.section
              key="collapsed"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="glass-panel-strong rounded-[28px] p-4 text-slate-950"
            >
              <button
                type="button"
                onClick={() => setPanelOpen(true)}
                className="flex w-full items-center justify-between gap-4 rounded-[24px] border border-sky-200 bg-white px-4 py-3 text-left transition hover:bg-sky-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-emerald-400 to-amber-400 text-slate-950">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-950">NeuroAdapt AI</p>
                    <p className="text-xs font-semibold text-slate-700">Reopen the floating assistant</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-700" />
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );

  return body;
}
