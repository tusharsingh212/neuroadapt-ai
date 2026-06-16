import { motion } from "framer-motion";
import { ArrowRight, Chrome, Layers3, MonitorSmartphone, Sparkles } from "lucide-react";

import { Pill, SoftCard, SectionTitle, cx } from "@/shared/ui";

export function LandingApp(): JSX.Element {
  const cardItems = [
    {
      icon: <Chrome className="h-4 w-4" />,
      title: "Extension surface",
      body: "Popup controls, background sync, and content-script adaptation live together in one build."
    },
    {
      icon: <MonitorSmartphone className="h-4 w-4" />,
      title: "Popup experience",
      body: "Modern controls for enabling personas, analyzing the current page, and comparing before vs after."
    },
    {
      icon: <Layers3 className="h-4 w-4" />,
      title: "Demo portal",
      body: "A dense healthcare portal that shows a visible transformation when adaptation is enabled."
    }
  ];

  return (
    <main className="min-h-screen overflow-hidden text-slate-950">
      <div className="absolute inset-0 subtle-grid opacity-35" />
      <div className="absolute left-[-8rem] top-[-7rem] h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute right-[-8rem] top-[16rem] h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-7"
          >
            <Pill className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100">NeuroAdapt AI</Pill>

            <div className="space-y-5">
              <h1 className="max-w-2xl text-5xl font-extrabold tracking-tight text-slate-950 sm:text-6xl">
                Technology That Adapts To You.
              </h1>
              <p className="max-w-2xl text-lg font-semibold leading-8 text-slate-700">
                A production-quality Chrome Extension MVP that injects an intelligent accessibility layer
                on top of any website, highlights the right action, and simplifies the page in real time.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/popup.html"
                className={cx(
                  "inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-100"
                )}
              >
                Open Popup Preview
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/demo.html"
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                Launch Demo Portal
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {cardItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.08 }}
                >
                  <SoftCard className="h-full">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
                      {item.icon}
                    </div>
                    <h3 className="mb-2 text-sm font-extrabold text-slate-950">{item.title}</h3>
                    <p className="text-sm font-semibold leading-6 text-slate-700">{item.body}</p>
                  </SoftCard>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="space-y-4"
          >
            <SoftCard className="relative overflow-hidden border-white/12 bg-slate-950/70 p-0">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400" />
              <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                  <SectionTitle
                    title="Extension Status"
                    subtitle="Built for Chrome Manifest V3, React, Tailwind, and real-time DOM adaptation."
                  />
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                    Ready
                  </div>
                </div>

                <div className="grid gap-3">
                  {[
                    "Popup with persona selection and motion polish",
                    "Content script overlay with floating assistant",
                    "Adaptive DOM engine and heuristic auto-detect",
                    "Demo portal for government / healthcare workflows"
                  ].map((line) => (
                    <div key={line} className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
                      <Sparkles className="mt-0.5 h-4 w-4 text-cyan-600" />
                      <span className="text-sm font-semibold leading-6 text-slate-700">{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SoftCard>
          </motion.aside>
        </div>
      </div>
    </main>
  );
}
