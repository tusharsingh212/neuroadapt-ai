import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { resetAdaptation } from "@/shared/adaptation";
import { asErrorMessage, injectContentScriptIfNeeded, queryActiveTab, sendToActiveTab } from "@/shared/chrome";
import {
  DEFAULT_SETTINGS,
  PERSONA_OPTIONS,
  type ExtensionSettings
} from "@/shared/types";
import { loadSettings, saveSettings } from "@/shared/storage";
import { Pill, SectionTitle, SoftCard } from "@/shared/ui";

import type { NeuroAdaptStateMessage } from "@/shared/messaging";

type BusyAction = "adapt" | "reset" | null;

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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"info" | "success" | "warning" | "error">("info");
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  function showStatus(message: string, tone: "info" | "success" | "warning" | "error", autoClear = true): void {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatusMessage(message);
    setStatusTone(tone);
    if (autoClear) {
      statusTimerRef.current = setTimeout(() => setStatusMessage(null), 4000);
    }
  }

  async function persistSettings(next: ExtensionSettings): Promise<void> {
    setSettings(next);
    await saveSettings(next);
  }

  async function helpWithPage(): Promise<void> {
    setBusyAction("adapt");
    showStatus("Setting things up...", "info", false);
    const next = { ...settings, enabled: true, comparisonMode: "adapted" as const };
    setSettings(next);
    try {
      const activeTab = await queryActiveTab();
      if (!activeTab?.id) throw new Error("No active tab available.");
      await injectContentScriptIfNeeded(activeTab.id);
      await sendToActiveTab<NeuroAdaptStateMessage>({ type: "NA_ADAPT_PAGE", payload: { persona: next.persona } });
      await saveSettings(next);
      showStatus("Done! Look for the chat icon in the bottom-right corner of the page.", "success");
    } catch (error) {
      showStatus(`Could not connect: ${asErrorMessage(error)}`, "error");
    } finally {
      setBusyAction(null);
    }
  }

  async function undoChanges(): Promise<void> {
    setBusyAction("reset");
    showStatus("Restoring original page...", "info", false);
    const next = { ...settings, enabled: false, comparisonMode: "original" as const };
    setSettings(next);
    try {
      const activeTab = await queryActiveTab();
      if (!activeTab?.id) throw new Error("No active tab available.");
      await injectContentScriptIfNeeded(activeTab.id);
      const response = await sendToActiveTab<NeuroAdaptStateMessage>({ type: "NA_RESET_PAGE" });
      if (!response) resetAdaptation(document);
      await saveSettings(next);
      showStatus("Changes undone.", "success");
    } catch (error) {
      showStatus(`Could not undo: ${asErrorMessage(error)}`, "error");
    } finally {
      setBusyAction(null);
    }
  }

  function launchDemoPortal(): void {
    if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
      window.open(chrome.runtime.getURL("demo.html"), "_blank", "noopener,noreferrer");
      return;
    }
    window.open("/demo.html", "_blank", "noopener,noreferrer");
  }

  return (
    <main className="relative flex h-full min-h-[360px] w-[340px] flex-col overflow-hidden text-slate-950">
      <div className="absolute inset-0 subtle-grid opacity-20" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400" />

      <div className="relative flex h-full flex-col gap-3 p-4">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel-strong rounded-[24px] p-4 text-slate-950"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-emerald-400 to-amber-400 text-slate-950 shadow-lg shadow-cyan-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                NeuroAdapt AI
              </p>
              <h1 className="text-base font-extrabold leading-tight text-slate-950">
                Your Page Assistant
              </h1>
            </div>
            <Pill className={settings.enabled
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-slate-50 text-slate-500"
            }>
              {settings.enabled ? "Active" : "Off"}
            </Pill>
          </div>
        </motion.header>

        {/* Main action */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <SoftCard className="space-y-3">
            {!settings.enabled ? (
              <button
                type="button"
                onClick={helpWithPage}
                disabled={busyAction !== null}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {busyAction === "adapt"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <ShieldCheck className="h-4 w-4" />
                }
                Help me with this page
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                  <p className="text-xs font-semibold leading-5 text-emerald-800">
                    Assistance is active. Look for the chat icon in the bottom-right corner of the page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={undoChanges}
                  disabled={busyAction !== null}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-900 transition hover:bg-rose-100 disabled:opacity-60"
                >
                  {busyAction === "reset"
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <RotateCcw className="h-4 w-4" />
                  }
                  Undo changes
                </button>
              </div>
            )}

            {statusMessage ? (
              <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${statusToneClass(statusTone)}`}>
                {statusMessage}
              </div>
            ) : null}
          </SoftCard>
        </motion.div>

        {/* Settings accordion */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
          <SoftCard className="space-y-0">
            <button
              type="button"
              className="flex w-full items-center justify-between py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-700"
              onClick={() => setSettingsOpen((v) => !v)}
            >
              <span className="flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                Settings
              </span>
              {settingsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  key="settings-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-3">
                    <SectionTitle
                      title="Assistance style"
                      subtitle="Adjusts how the AI explains and adapts pages."
                    />
                    <div className="flex gap-2">
                      {PERSONA_OPTIONS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => persistSettings({ ...settings, persona: p.id })}
                          className={`flex-1 rounded-2xl border px-3 py-2.5 text-left transition ${
                            settings.persona === p.id
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-800"
                              : "border-sky-200 bg-white text-slate-700 hover:bg-sky-50"
                          }`}
                        >
                          <div className="text-xs font-bold">{p.badge}</div>
                          <div className="mt-0.5 text-[10px] font-normal leading-tight text-slate-500">
                            {p.description}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="text-[11px] text-slate-400">Current: {selectedPersona.badge}</span>
                      <button
                        type="button"
                        onClick={launchDemoPortal}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition hover:text-slate-600"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Demo page
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SoftCard>
        </motion.div>

      </div>
    </main>
  );
}
