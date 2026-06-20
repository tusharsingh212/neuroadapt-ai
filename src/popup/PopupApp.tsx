import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { resetAdaptation } from "@/shared/adaptation";
import { asErrorMessage, injectContentScriptIfNeeded, queryActiveTab, sendToActiveTab } from "@/shared/chrome";
import {
  DEFAULT_SETTINGS,
  PERSONA_LABELS,
  PERSONA_OPTIONS,
  type ExtensionSettings
} from "@/shared/types";
import { loadSettings, saveSettings } from "@/shared/storage";
import { Pill, SectionTitle, SoftCard } from "@/shared/ui";

import type { NeuroAdaptStateMessage } from "@/shared/messaging";

type BusyAction = "analyze" | "adapt" | "reset" | null;

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

export function PopupApp(): JSX.Element {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [statusMessage, setStatusMessage] = useState("Ready to adapt.");
  const [statusTone, setStatusTone] = useState<"info" | "success" | "warning" | "error">("info");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    let mounted = true;
    loadSettings().then((next) => {
      if (mounted) setSettings(next);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    saveSettings(settings).catch(() => undefined);
  }, [settings]);

  const selectedPersona = useMemo(
    () => PERSONA_OPTIONS.find((p) => p.id === settings.persona) ?? PERSONA_OPTIONS[0],
    [settings.persona]
  );

  async function persistSettings(next: ExtensionSettings, tone: typeof statusTone = "info"): Promise<void> {
    setSettings(next);
    setStatusMessage(`Mode set to ${PERSONA_LABELS[next.persona]}`);
    setStatusTone(tone);
    await saveSettings(next);
  }

  async function analyzeCurrentPage(): Promise<void> {
    setBusyAction("analyze");
    setStatusMessage("Analyzing current page...");
    setStatusTone("info");
    try {
      const activeTab = await queryActiveTab();
      if (!activeTab?.id) throw new Error("No active tab available.");
      await injectContentScriptIfNeeded(activeTab.id);
      const response = await sendToActiveTab<NeuroAdaptStateMessage>({ type: "NA_ANALYZE_PAGE" });
      setStatusMessage(response ? `Analysis complete for ${response.insights.title}.` : "Analysis complete.");
      setStatusTone("success");
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
      if (!activeTab?.id) throw new Error("No active tab available.");
      await injectContentScriptIfNeeded(activeTab.id);
      await sendToActiveTab<NeuroAdaptStateMessage>({ type: "NA_ADAPT_PAGE", payload: { persona: next.persona } });
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
      if (!activeTab?.id) throw new Error("No active tab available.");
      await injectContentScriptIfNeeded(activeTab.id);
      const response = await sendToActiveTab<NeuroAdaptStateMessage>({ type: "NA_RESET_PAGE" });
      if (!response) resetAdaptation(document);
      setStatusMessage("Changes reset.");
      setStatusTone("success");
    } catch (error) {
      setStatusMessage(`Reset failed: ${asErrorMessage(error)}`);
      setStatusTone("error");
    } finally {
      setBusyAction(null);
    }
  }

  async function launchDemoPortal(): Promise<void> {
    if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
      window.open(chrome.runtime.getURL("demo.html"), "_blank", "noopener,noreferrer");
      return;
    }
    window.open("/demo.html", "_blank", "noopener,noreferrer");
  }

  return (
    <main className="relative flex h-full min-h-[480px] w-[380px] flex-col overflow-hidden text-slate-950">
      <div className="absolute inset-0 subtle-grid opacity-20" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400" />

      <div className="relative flex h-full flex-col gap-4 p-4">
        {/* Header */}
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
              onClick={() => setPanelOpen((v) => !v)}
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
              {/* Mode selector */}
              <SoftCard className="space-y-3">
                <SectionTitle
                  title="Who is using this?"
                  subtitle="Choose the mode that fits the person using the browser."
                />
                <div className="flex gap-2">
                  {PERSONA_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => persistSettings({ ...settings, persona: p.id })}
                      className={`flex-1 rounded-2xl border px-3 py-3 text-xs font-bold transition ${
                        settings.persona === p.id
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-800"
                          : "border-sky-200 bg-white text-slate-700 hover:bg-sky-50"
                      }`}
                    >
                      <div className="text-base">{p.id === "elderly" ? "👴" : "🆕"}</div>
                      <div className="mt-1">{p.badge}</div>
                      <div className="mt-0.5 text-[10px] font-normal leading-tight text-slate-500">
                        {p.description}
                      </div>
                    </button>
                  ))}
                </div>
              </SoftCard>

              {/* Quick actions */}
              <SoftCard className="space-y-3">
                <SectionTitle title="Quick Actions" subtitle="Analyze and adapt the current page." />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={analyzeCurrentPage}
                    disabled={busyAction !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-900 transition hover:bg-sky-50 disabled:opacity-60"
                  >
                    {busyAction === "analyze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                    Analyze Page
                  </button>
                  <button
                    type="button"
                    onClick={adaptInterface}
                    disabled={busyAction !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {busyAction === "adapt" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Adapt Interface
                  </button>
                  <button
                    type="button"
                    onClick={resetChanges}
                    disabled={busyAction !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-900 transition hover:bg-rose-100 disabled:opacity-60"
                  >
                    {busyAction === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Reset Changes
                  </button>
                </div>

                <div className={`mt-1 rounded-xl border px-3 py-2 text-xs font-semibold ${statusToneClass(statusTone)}`}>
                  {statusMessage}
                </div>
              </SoftCard>
            </motion.section>
          ) : (
            <motion.section
              key="closed"
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
}
