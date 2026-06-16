import { motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  HeartPulse,
  Menu,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  TimerReset,
  UserRound
} from "lucide-react";
import { useState } from "react";

import { Pill, ProgressBar, SectionTitle, SoftCard, cx } from "@/shared/ui";

const menuItems = ["Dashboard", "Appointments", "Messages", "Benefits", "Claims", "Documents", "Support"];

const appointmentRows = [
  ["Dr. Patel", "Primary care", "9:20 AM", "Check-in"],
  ["Lab Visit", "Blood work", "10:05 AM", "Instructions"],
  ["Follow-up", "Telehealth", "1:30 PM", "Details"]
];

const firstTimeTips = [
  "Step 1: Tap the big Continue button.",
  "Step 2: Use Search if you need help finding something.",
  "Step 3: Open the highlighted appointment task."
];

export function DemoApp(): JSX.Element {
  const [mode, setMode] = useState<"original" | "elderly" | "firstTime">("original");
  const elderly = mode === "elderly";
  const firstTime = mode === "firstTime";

  const lightTheme = elderly || firstTime;

  return (
    <main
      className={cx(
        "min-h-screen transition-all duration-500",
        lightTheme ? "bg-gradient-to-br from-white via-sky-50 to-emerald-50 text-slate-900" : "text-slate-50"
      )}
    >
      <div className={cx("absolute inset-0 subtle-grid transition-opacity duration-500", lightTheme ? "opacity-15" : "opacity-35")} />
      <div className={cx("absolute left-0 top-0 h-72 w-72 rounded-full blur-3xl transition-all duration-500", lightTheme ? "bg-sky-200/50" : "bg-cyan-500/10")} />
      <div className={cx("absolute right-0 top-24 h-96 w-96 rounded-full blur-3xl transition-all duration-500", lightTheme ? "bg-emerald-200/50" : "bg-emerald-500/12")} />

      <div className="relative mx-auto max-w-[1440px] px-4 py-4 lg:px-6">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cx(
            "mb-4 rounded-[28px] px-5 py-4 transition-all duration-500",
            lightTheme
              ? "border border-sky-200/70 bg-white/90 shadow-[0_22px_60px_rgba(96,165,250,0.12)] backdrop-blur-xl"
              : "glass-panel-strong"
          )}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className={cx("flex h-12 w-12 items-center justify-center rounded-2xl text-slate-950", lightTheme ? "bg-gradient-to-br from-sky-200 via-emerald-200 to-white" : "bg-gradient-to-br from-cyan-400 via-emerald-400 to-amber-400")}>
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className={cx("text-[11px] font-semibold uppercase tracking-[0.32em]", lightTheme ? "text-sky-700" : "text-slate-400")}>
                  Northbridge Health Portal
                </p>
                <h1 className={cx("text-xl font-semibold", lightTheme ? "text-slate-900" : "text-white")}>Patient Services & Benefits Center</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Pill className={cx("border-sky-200", lightTheme ? "bg-sky-50 text-sky-700" : "text-cyan-100 bg-cyan-400/10")}>Crowded menu</Pill>
              <Pill className={cx("border-emerald-200", lightTheme ? "bg-emerald-50 text-emerald-700" : "text-emerald-100 bg-emerald-400/10")}>Small buttons</Pill>
              <button
                type="button"
                onClick={() => setMode(elderly ? "original" : "elderly")}
                className={cx(
                  "rounded-full border px-4 py-2 text-xs font-semibold transition",
                  elderly ? "border-sky-200 bg-sky-50 text-sky-800 shadow-sm" : "border-sky-200 bg-white text-sky-800"
                )}
              >
                {elderly ? "View original" : "Elderly mode"}
              </button>
              <button
                type="button"
                onClick={() => setMode(firstTime ? "original" : "firstTime")}
                className={cx(
                  "rounded-full border px-4 py-2 text-xs font-semibold transition",
                  firstTime ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm" : "border-emerald-200 bg-white text-emerald-800"
                )}
              >
                {firstTime ? "Close guide" : "First-time guide"}
              </button>
            </div>
          </div>
        </motion.header>

        <div className={cx("mb-4 rounded-[28px] border px-5 py-4 transition-all duration-500", lightTheme ? "border-sky-200/70 bg-white/90 text-slate-900" : "border-white/10 bg-white/5")}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={cx("text-[11px] font-semibold uppercase tracking-[0.32em]", lightTheme ? "text-sky-700" : "text-slate-400")}>Demo State</p>
              <h2 className={cx("mt-1 font-semibold", lightTheme ? "text-2xl text-slate-900" : "text-lg text-white")}>
                {firstTime ? "Guided first-time experience" : elderly ? "Elderly-friendly large targets" : "Original interface"}
              </h2>
            </div>
            <Pill className={lightTheme ? "border-sky-200 bg-sky-50 text-sky-800" : "border-white/10 bg-white/5 text-slate-200"}>
              {firstTime ? "Guide" : elderly ? "After" : "Before"}
            </Pill>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className={cx("rounded-2xl border p-3", lightTheme ? "border-sky-200 bg-sky-50" : "border-white/10 bg-white/5")}>
              <p className={cx("text-xs uppercase tracking-[0.24em]", lightTheme ? "text-sky-700" : "text-slate-400")}>Readability</p>
              <p className={cx("mt-2 font-semibold", lightTheme ? "text-3xl text-slate-900" : "text-2xl text-white")}>{lightTheme ? "91%" : "48%"}</p>
            </div>
            <div className={cx("rounded-2xl border p-3", lightTheme ? "border-emerald-200 bg-emerald-50" : "border-white/10 bg-white/5")}>
              <p className={cx("text-xs uppercase tracking-[0.24em]", lightTheme ? "text-emerald-700" : "text-slate-400")}>Navigation complexity</p>
              <p className={cx("mt-2 font-semibold", lightTheme ? "text-3xl text-slate-900" : "text-2xl text-white")}>{lightTheme ? "Low" : "High"}</p>
            </div>
            <div className={cx("rounded-2xl border p-3", lightTheme ? "border-sky-200 bg-white" : "border-white/10 bg-white/5")}>
              <p className={cx("text-xs uppercase tracking-[0.24em]", lightTheme ? "text-sky-700" : "text-slate-400")}>Estimated task time</p>
              <p className={cx("mt-2 font-semibold", lightTheme ? "text-3xl text-slate-900" : "text-2xl text-white")}>{lightTheme ? "1m 15s" : "4m 20s"}</p>
            </div>
          </div>
        </div>

        {firstTime ? (
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            {firstTimeTips.map((tip, index) => (
              <motion.div
                key={tip}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="rounded-3xl border border-emerald-200 bg-white p-4 shadow-[0_18px_50px_rgba(16,185,129,0.10)]"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 font-semibold">
                  {index + 1}
                </div>
                <p className="text-sm font-semibold text-slate-900">{tip}</p>
              </motion.div>
            ))}
          </div>
        ) : null}

        <div className={cx("grid gap-4 transition-all duration-500 xl:grid-cols-[260px_minmax(0,1fr)_320px]", elderly && "xl:grid-cols-[240px_minmax(0,1fr)]", firstTime && "xl:grid-cols-[240px_minmax(0,1fr)]")}>
          {!firstTime ? (
            <SoftCard className={cx("space-y-4 transition-all duration-500", lightTheme ? "border-sky-200/70 bg-white/90 text-slate-900" : "border-white/10 bg-slate-950/55")}>
              <div className="flex items-center justify-between">
                <SectionTitle title="Navigation" subtitle="Intentionally compact and dense for the demo." />
                <Menu className="h-4 w-4 text-slate-400" />
              </div>
              <div className={cx("space-y-2 transition-all duration-500", elderly && "space-y-3")}>
                {menuItems.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    className={cx(
                      "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition",
                      elderly
                        ? index === 1
                          ? "border-sky-200 bg-sky-50 text-sky-900 py-5 text-base shadow-sm"
                          : "border-sky-100 bg-white text-slate-700 hover:bg-sky-50 py-4 text-sm shadow-sm"
                        : index === 1
                          ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-50"
                          : "border-white/8 bg-white/[0.03] text-slate-300 hover:bg-white/8 text-sm"
                    )}
                  >
                    <span>{item}</span>
                    <span className={cx("uppercase tracking-[0.24em]", elderly ? "text-sky-600 text-[10px]" : "text-slate-500 text-[11px]")}>Open</span>
                  </button>
                ))}
              </div>
            </SoftCard>
          ) : null}

          <div className="space-y-4">
            <SoftCard className={cx("overflow-hidden p-0 transition-all duration-500", lightTheme ? "border-sky-200/70 bg-white/90 text-slate-900" : "border-white/10 bg-slate-950/55")}>
              <div className={cx("border-b px-5 py-4", lightTheme ? "border-sky-200 bg-sky-50" : "border-white/8 bg-white/[0.03]")}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className={cx("text-xs font-semibold uppercase tracking-[0.28em]", lightTheme ? "text-sky-700" : "text-slate-500")}>Today</p>
                    <h2 className={cx("mt-1 font-semibold", lightTheme ? "text-2xl text-slate-900" : "text-lg text-white")}>Your care timeline is busy</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className={cx("rounded-full font-semibold transition", elderly || firstTime ? "border border-sky-200 bg-white text-sky-800 text-sm px-4 py-3" : "border border-white/10 bg-white/5 text-slate-200 text-xs px-3 py-1.5")}>
                      <Search className="mr-1 inline h-3.5 w-3.5" />
                      Search
                    </button>
                    <button className={cx("rounded-full font-semibold transition", elderly || firstTime ? "border border-emerald-200 bg-white text-emerald-800 text-sm px-4 py-3" : "border border-white/10 bg-white/5 text-slate-200 text-xs px-3 py-1.5")}>
                      <Bell className="mr-1 inline h-3.5 w-3.5" />
                      Alerts
                    </button>
                  </div>
                </div>
                {elderly ? (
                  <div className="mt-4 rounded-3xl border border-sky-200 bg-sky-50 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">Primary next action</p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-2xl font-semibold text-slate-900">Book your appointment</h3>
                        <p className="mt-1 text-base leading-7 text-slate-700">
                          Buttons are larger, the layout is calmer, and the next action is easier to spot.
                        </p>
                      </div>
                      <button className="rounded-full bg-sky-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-sky-300/30">
                        Continue
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className={cx("grid gap-4 p-5 transition-all duration-500", elderly ? "lg:grid-cols-1" : "lg:grid-cols-[1fr_320px]")}>
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Upcoming visits", value: "3", icon: CalendarDays, tone: "from-sky-300 to-cyan-300" },
                      { label: "Open tasks", value: "7", icon: ClipboardList, tone: "from-emerald-300 to-teal-300" },
                      { label: "Unread messages", value: "12", icon: FileText, tone: "from-sky-200 to-emerald-200" }
                    ].map((item) => (
                      <div key={item.label} className={cx("rounded-2xl p-4 transition-all duration-500", lightTheme ? "border border-sky-200 bg-white" : "border border-white/8 bg-slate-950/35")}>
                        <div className={cx("mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br", item.tone)}>
                          <item.icon className="h-4 w-4 text-slate-950" />
                        </div>
                        <p className={cx("font-semibold", lightTheme ? "text-3xl text-slate-900" : "text-2xl text-white")}>{item.value}</p>
                        <p className={cx("mt-1 uppercase tracking-[0.24em]", lightTheme ? "text-sky-700 text-[11px]" : "text-slate-500 text-xs")}>{item.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className={cx("rounded-3xl p-4 transition-all duration-500", lightTheme ? "border border-sky-200 bg-white" : "border border-white/8 bg-slate-950/35")}>
                    <div className="mb-3 flex items-center justify-between">
                      <SectionTitle title="Appointments" subtitle={elderly ? "Bigger, clearer, easier to tap." : "Small text, small buttons, and tight spacing by design."} />
                      <button className={cx("rounded-full font-semibold transition", elderly ? "border border-sky-200 bg-white text-sky-800 text-sm px-4 py-3" : "border border-white/10 bg-white/5 text-slate-200 text-[11px] px-2.5 py-1.5")}>
                        Add
                      </button>
                    </div>
                    {elderly ? (
                      <div className="mb-3 rounded-2xl border border-sky-200 bg-sky-50 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">Recommended next step</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-900">Confirm primary care visit</p>
                          </div>
                          <button className="rounded-full bg-sky-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-sky-300/30">
                            Confirm
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <div className="overflow-hidden rounded-2xl border border-white/8">
                      <table className="w-full text-left text-sm">
                        <thead className={cx("text-[11px] uppercase tracking-[0.24em]", lightTheme ? "bg-sky-50 text-sky-700" : "bg-white/[0.03] text-slate-500")}>
                          <tr>
                            <th className="px-3 py-3">Provider</th>
                            <th className="px-3 py-3">Type</th>
                            <th className="px-3 py-3">Time</th>
                            <th className="px-3 py-3">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appointmentRows.map((row) => (
                            <tr key={row[0]} className={cx("border-t", lightTheme ? "border-sky-100 bg-white" : "border-white/8 bg-slate-950/35")}>
                              <td className={cx("px-3 py-3 font-medium", lightTheme ? "text-slate-900 text-base" : "text-white")}>{row[0]}</td>
                              <td className={cx("px-3 py-3", lightTheme ? "text-slate-700 text-base" : "text-slate-300")}>{row[1]}</td>
                              <td className={cx("px-3 py-3", lightTheme ? "text-slate-700 text-base" : "text-slate-300")}>{row[2]}</td>
                              <td className="px-3 py-3">
                                <button className={cx("rounded-full font-semibold transition", elderly ? "border border-sky-200 bg-sky-50 text-sky-800 text-sm px-4 py-3" : "border border-cyan-400/20 bg-cyan-400/10 text-cyan-50 text-[11px] px-2.5 py-1")}>
                                  {row[3]}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {!elderly ? (
                    <div className={cx("grid gap-4", lightTheme ? "md:grid-cols-2" : "md:grid-cols-2")}>
                      <SoftCard className={cx("space-y-3 transition-all duration-500", lightTheme ? "border-sky-200 bg-white" : "border-white/10 bg-slate-950/55")}>
                        <div className="flex items-center gap-2">
                          <HeartPulse className="h-4 w-4 text-rose-300" />
                          <SectionTitle title="Care Actions" subtitle="Important buttons are buried among secondary items." />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {["Book appointment", "Renew prescription", "View lab results", "Ask a question"].map((item) => (
                            <button
                              key={item}
                              type="button"
                              className={cx(
                                "rounded-2xl px-3 py-2 text-xs transition",
                                lightTheme ? "border border-sky-200 bg-white text-sky-800" : "border border-white/8 bg-white/[0.03] text-slate-200"
                              )}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </SoftCard>

                      <SoftCard className={cx("space-y-3 transition-all duration-500", lightTheme ? "border-sky-200 bg-white" : "border-white/10 bg-slate-950/55")}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-cyan-300" />
                          <SectionTitle title="Benefits" subtitle="A dense information block with tight line lengths." />
                        </div>
                        <p className="text-sm leading-7 text-slate-700">
                          Your coverage includes primary care, urgent care, telehealth, and preventive screenings.
                          Claims are processed in 5 to 7 business days. Documentation can be found in the documents section.
                        </p>
                      </SoftCard>
                    </div>
                  ) : null}
                </div>

                {!elderly ? (
                  <div className="space-y-4">
                    <SoftCard className={cx("space-y-4 transition-all duration-500", lightTheme ? "border-sky-200 bg-white" : "border-white/10 bg-slate-950/55")}>
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-cyan-200" />
                        <SectionTitle title="Patient Snapshot" subtitle="Dense summary card with small controls." />
                      </div>
                      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                        <p className="text-xs uppercase tracking-[0.26em] text-sky-700">Member</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">Maya Johnson</p>
                        <p className="mt-2 text-base leading-7 text-slate-700">
                          Balance due: <span className="text-slate-900">$124.50</span>. Next annual checkup: <span className="text-slate-900">June 21</span>.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                            <span>Readability</span>
                            <span>48%</span>
                          </div>
                          <ProgressBar value={48} />
                        </div>
                        <div>
                          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                            <span>Navigation complexity</span>
                            <span>High</span>
                          </div>
                          <ProgressBar value={72} color="from-emerald-300 to-sky-300" />
                        </div>
                        <div>
                          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                            <span>Estimated task time</span>
                            <span>4m 20s</span>
                          </div>
                          <ProgressBar value={76} color="from-sky-300 to-emerald-300" />
                        </div>
                      </div>
                    </SoftCard>

                    <SoftCard className="space-y-3 border-sky-200 bg-white">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-amber-300" />
                        <SectionTitle title="Important notices" subtitle="A deliberately busy information area." />
                      </div>
                      <div className="space-y-2 text-sm leading-6 text-slate-700">
                        {[
                          "Prior authorization may be required for imaging services.",
                          "Claims filed after 30 days may require manual review.",
                          "Telehealth appointments are available Monday through Friday."
                        ].map((note) => (
                          <div key={note} className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
                            {note}
                          </div>
                        ))}
                      </div>
                    </SoftCard>
                  </div>
                ) : null}
              </div>
            </SoftCard>
          </div>

          {!elderly ? (
            <div className="space-y-4">
              <SoftCard className="space-y-3 border-sky-200 bg-white">
                <div className="flex items-center gap-2">
                  <TimerReset className="h-4 w-4 text-cyan-200" />
                  <SectionTitle title="Queue" subtitle="A narrow panel with clipped actions." />
                </div>
                {["Prescription refill request", "Lab question from Dr. Patel", "Insurance documentation upload"].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2">
                    <span className="max-w-[180px] text-sm text-slate-700">{item}</span>
                    <button className="rounded-full border border-sky-200 bg-white px-2 py-1 text-[11px] font-semibold text-sky-800">
                      Open
                    </button>
                  </div>
                ))}
              </SoftCard>

              <SoftCard className="space-y-3 border-emerald-200 bg-white">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-300" />
                  <SectionTitle title="System hints" subtitle="Future adaptation targets appear here." />
                </div>
                <div className="space-y-2 text-sm leading-6 text-slate-700">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">Multiple actions compete for attention on this screen.</div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">Primary care and appointment tasks should be prioritized.</div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">Small controls and dense menus are intentional for the demo.</div>
                </div>
              </SoftCard>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
