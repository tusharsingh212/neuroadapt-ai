import { motion } from "framer-motion";
import {
  Building2,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle,
  IdCard,
  MapPin,
  Phone,
  Shield,
  Upload,
  User
} from "lucide-react";
import { useState } from "react";

import { Pill, SectionTitle, SoftCard } from "@/shared/ui";

type Step = "home" | "register" | "personal" | "documents" | "review";

const navLinks = ["Home", "Enroll Aadhaar", "Update Aadhaar", "Check Status", "Locate Center", "Help"];

export function AadhaarDemoApp(): JSX.Element {
  const [step, setStep] = useState<Step>("home");
  const [form, setForm] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    mobile: "",
    address: "",
    pinCode: "",
    state: ""
  });

  function updateField(field: keyof typeof form, value: string): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-emerald-50 text-slate-900">
      <div className="border-b border-orange-200/70 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5" />
            <span>Government of India — Demo Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span>English</span>
            <span>|</span>
            <span>हिन्दी</span>
            <span>|</span>
            <button type="button" className="font-semibold text-orange-700">
              Accessibility
            </button>
          </div>
        </div>
      </div>

      <header className="border-b border-orange-100 bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <IdCard className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-100">Unique Identification Authority of India</p>
              <h1 className="text-2xl font-bold">Aadhaar Enrollment Services</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill className="border-white/20 bg-white/10 text-white">Demo site for NeuroAdapt AI</Pill>
            <Pill className="border-white/20 bg-white/10 text-white">Not an official UIDAI portal</Pill>
          </div>
        </div>
      </header>

      <nav aria-label="Main navigation" className="border-b border-orange-100 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
          {navLinks.map((link) => (
            <button
              key={link}
              type="button"
              onClick={() => {
                if (link === "Enroll Aadhaar") setStep("register");
                if (link === "Home") setStep("home");
              }}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                (link === "Enroll Aadhaar" && step !== "home") || (link === "Home" && step === "home")
                  ? "bg-orange-100 text-orange-800"
                  : "text-slate-600 hover:bg-orange-50 hover:text-orange-800"
              }`}
            >
              {link}
            </button>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {step === "home" ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <SoftCard className="overflow-hidden border-orange-200/70 bg-white p-0">
                <div className="bg-gradient-to-r from-orange-100 to-amber-50 px-6 py-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">Citizen Services</p>
                  <h2 className="mt-2 text-3xl font-bold text-slate-900">Apply for a new Aadhaar card</h2>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
                    Aadhaar is a 12-digit unique identity number issued to residents of India. Use this demo portal to
                    practice enrollment with NeuroAdapt AI guiding you step by step.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep("register")}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-orange-300/40 transition hover:bg-orange-700"
                  >
                    New Aadhaar Enrollment
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-3">
                  {[
                    { title: "Book appointment", desc: "Schedule a visit at an enrollment center.", icon: MapPin },
                    { title: "Check status", desc: "Track your Aadhaar application progress.", icon: FileText },
                    { title: "Update details", desc: "Change address, mobile, or biometrics.", icon: User }
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                      <item.icon className="mb-3 h-5 w-5 text-orange-600" />
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </SoftCard>

              <SoftCard className="border-slate-200 bg-white">
                <SectionTitle title="Important notices" subtitle="Read before you begin enrollment." />
                <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
                  <li>Carry proof of identity and proof of address to the enrollment center.</li>
                  <li>Children below 5 years receive a blue Aadhaar (Bal Aadhaar).</li>
                  <li>Biometric update is free once every 10 years for adults.</li>
                </ul>
              </SoftCard>
            </div>

            <aside className="space-y-4">
              <SoftCard className="border-emerald-200 bg-emerald-50/60">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-emerald-700" />
                  <SectionTitle title="Need help?" subtitle="Try asking NeuroAdapt AI:" />
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p className="rounded-xl border border-emerald-200 bg-white p-3">"Help me apply for an Aadhaar card."</p>
                  <p className="rounded-xl border border-emerald-200 bg-white p-3">"What should I click next?"</p>
                  <p className="rounded-xl border border-emerald-200 bg-white p-3">"Explain this form in simple language."</p>
                </div>
              </SoftCard>

              <SoftCard className="border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-orange-600" />
                  <SectionTitle title="Helpline" subtitle="Demo contact information." />
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">1947</p>
                <p className="text-sm text-slate-600">Toll-free (demo only)</p>
              </SoftCard>
            </aside>
          </motion.div>
        ) : null}

        {step === "register" ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl">
            <SoftCard className="border-orange-200 bg-white">
              <SectionTitle title="New Aadhaar Enrollment" subtitle="Step 1 of 4 — Choose how to proceed" />
              <p className="mt-4 text-sm leading-7 text-slate-700">
                Select an enrollment option below. Most residents visit an Aadhaar Seva Kendra with supporting documents.
              </p>
              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  onClick={() => setStep("personal")}
                  className="flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-left transition hover:border-orange-400 hover:bg-orange-100"
                >
                  <div>
                    <p className="font-semibold text-slate-900">Start online pre-enrollment</p>
                    <p className="mt-1 text-sm text-slate-600">Fill your details online, then visit a center for biometrics.</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-orange-600" />
                </button>
                <button
                  type="button"
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left opacity-80"
                >
                  <div>
                    <p className="font-semibold text-slate-900">Book appointment at enrollment center</p>
                    <p className="mt-1 text-sm text-slate-600">Schedule a time slot near your location.</p>
                  </div>
                  <Building2 className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </SoftCard>
          </motion.div>
        ) : null}

        {step === "personal" ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl">
            <form
              className="space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                setStep("documents");
              }}
            >
              <SoftCard className="border-orange-200 bg-white">
                <SectionTitle title="Personal Information" subtitle="Step 2 of 4 — Tell us about yourself" />
                <p className="mt-3 text-sm text-slate-600">Fields marked with * are required. Do not enter real Aadhaar numbers in this demo.</p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-sm font-semibold text-slate-800">Full name *</span>
                    <input
                      type="text"
                      required
                      aria-required="true"
                      aria-describedby="name-help"
                      placeholder="As on your identity proof"
                      value={form.fullName}
                      onChange={(event) => updateField("fullName", event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    />
                    <span id="name-help" className="mt-1 block text-xs text-slate-500">
                      Enter your name exactly as it appears on your ID document.
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-800">Date of birth *</span>
                    <input
                      type="date"
                      required
                      aria-required="true"
                      value={form.dateOfBirth}
                      onChange={(event) => updateField("dateOfBirth", event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-800">Gender *</span>
                    <select
                      required
                      aria-required="true"
                      value={form.gender}
                      onChange={(event) => updateField("gender", event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    >
                      <option value="">Select gender</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="transgender">Transgender</option>
                    </select>
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-sm font-semibold text-slate-800">Mobile number *</span>
                    <input
                      type="tel"
                      required
                      aria-required="true"
                      placeholder="10-digit mobile number"
                      pattern="[0-9]{10}"
                      value={form.mobile}
                      onChange={(event) => updateField("mobile", event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-sm font-semibold text-slate-800">Residential address *</span>
                    <textarea
                      required
                      aria-required="true"
                      rows={3}
                      placeholder="House number, street, locality"
                      value={form.address}
                      onChange={(event) => updateField("address", event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-800">PIN code *</span>
                    <input
                      type="text"
                      required
                      aria-required="true"
                      placeholder="6-digit PIN"
                      pattern="[0-9]{6}"
                      value={form.pinCode}
                      onChange={(event) => updateField("pinCode", event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-800">State *</span>
                    <select
                      required
                      aria-required="true"
                      value={form.state}
                      onChange={(event) => updateField("state", event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    >
                      <option value="">Select state</option>
                      <option value="delhi">Delhi</option>
                      <option value="maharashtra">Maharashtra</option>
                      <option value="karnataka">Karnataka</option>
                      <option value="tamil-nadu">Tamil Nadu</option>
                    </select>
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("register")}
                    className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-orange-700"
                  >
                    Continue to documents
                  </button>
                </div>
              </SoftCard>
            </form>
          </motion.div>
        ) : null}

        {step === "documents" ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl">
            <SoftCard className="border-orange-200 bg-white">
              <SectionTitle title="Upload Documents" subtitle="Step 3 of 4 — Proof of identity and address" />
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Upload clear scans or photos. Accepted formats: PDF, JPG, PNG (max 2 MB each). This is a demo — files are not stored.
              </p>

              <div className="mt-6 grid gap-4">
                {[
                  { label: "Proof of Identity (POI)", hint: "Passport, PAN card, or voter ID", required: true },
                  { label: "Proof of Address (POA)", hint: "Utility bill, bank statement, or ration card", required: true },
                  { label: "Date of birth proof", hint: "Birth certificate or school certificate", required: false }
                ].map((doc) => (
                  <label
                    key={doc.label}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-orange-300 bg-orange-50/40 px-5 py-4 transition hover:border-orange-500 hover:bg-orange-50"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {doc.label} {doc.required ? "*" : "(optional)"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{doc.hint}</p>
                    </div>
                    <Upload className="h-5 w-5 text-orange-600" />
                    <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png" aria-label={`Upload ${doc.label}`} />
                  </label>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep("personal")}
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="rounded-full bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-orange-700"
                >
                  Review application
                </button>
              </div>
            </SoftCard>
          </motion.div>
        ) : null}

        {step === "review" ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl">
            <SoftCard className="border-orange-200 bg-white">
              <SectionTitle title="Review & Submit" subtitle="Step 4 of 4 — Confirm your details" />
              <p className="mt-3 text-sm text-slate-600">Please verify all information before submitting. You will receive an enrollment ID.</p>

              <dl className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Full name</dt>
                  <dd className="font-semibold text-slate-900">{form.fullName || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Date of birth</dt>
                  <dd className="font-semibold text-slate-900">{form.dateOfBirth || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Mobile</dt>
                  <dd className="font-semibold text-slate-900">{form.mobile || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Address</dt>
                  <dd className="max-w-xs text-right font-semibold text-slate-900">{form.address || "—"}</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <Shield className="mt-0.5 h-4 w-4 flex-none" />
                <p>
                  By submitting, you confirm the information is accurate. NeuroAdapt AI will never auto-submit this form — you must click Submit yourself.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep("documents")}
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => alert("Demo: Application submitted! Enrollment ID: DEMO-2025-00142")}
                  className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700"
                >
                  Submit application
                </button>
              </div>
            </SoftCard>
          </motion.div>
        ) : null}
      </div>

      <footer className="mt-10 border-t border-orange-100 bg-white py-6 text-center text-xs text-slate-500">
        Demo portal for NeuroAdapt AI · Not affiliated with UIDAI · For testing accessibility guidance only
      </footer>
    </main>
  );
}
