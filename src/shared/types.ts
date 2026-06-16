export type PersonaId =
  | "elderly"
  | "visuallyImpaired"
  | "firstTime"
  | "patient"
  | "auto";

export type ComparisonMode = "original" | "adapted";

export type NavigationComplexity = "Low" | "Medium" | "High";

export interface PersonaOption {
  id: PersonaId;
  label: string;
  badge: string;
  description: string;
  accent: string;
}

export const PERSONA_OPTIONS: PersonaOption[] = [
  {
    id: "elderly",
    label: "👴 Elderly User",
    badge: "Comfort",
    description: "Larger text, clearer hierarchy, and simpler interactions.",
    accent: "from-amber-400 to-orange-500"
  },
  {
    id: "visuallyImpaired",
    label: "👁️ Visually Impaired User",
    badge: "Contrast",
    description: "Higher contrast, larger targets, and stronger focus states.",
    accent: "from-cyan-400 to-sky-500"
  },
  {
    id: "firstTime",
    label: "🌱 First-Time Internet User",
    badge: "Guidance",
    description: "Step-by-step hints and gentle reduction of clutter.",
    accent: "from-emerald-400 to-teal-500"
  },
  {
    id: "patient",
    label: "🏥 Patient",
    badge: "Care",
    description: "Prioritize healthcare actions and nearby appointment tasks.",
    accent: "from-rose-400 to-red-500"
  },
  {
    id: "auto",
    label: "🤖 Auto Detect (demo mode)",
    badge: "Heuristic",
    description: "Simulated detection based on interaction patterns.",
    accent: "from-violet-400 to-fuchsia-500"
  }
];

export interface ExtensionSettings {
  enabled: boolean;
  persona: PersonaId;
  comparisonMode: ComparisonMode;
  autoDetect: boolean;
}

export interface PageInsights {
  title: string;
  url: string;
  interactiveCount: number;
  smallTargetCount: number;
  navCount: number;
  formCount: number;
  textBlockCount: number;
  bodyTextLength: number;
  averageFontSize: number;
  healthcareSignals: number;
  complexityScore: number;
  detectedPersona: PersonaId;
  summary: string;
}

export interface MetricsSnapshot {
  readability: number;
  navigationComplexity: NavigationComplexity;
  estimatedTaskSeconds: number;
}

export interface AnalysisReport {
  detectedPersona: PersonaId;
  detectedPersonaLabel: string;
  observedChallenges: string[];
  adaptationsApplied: string[];
  before: MetricsSnapshot;
  after: MetricsSnapshot;
}

export interface RuntimeStatus {
  state: "idle" | "analyzing" | "applying" | "done";
  messages: string[];
  lastUpdated: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: false,
  persona: "auto",
  comparisonMode: "adapted",
  autoDetect: true
};

export const PERSONA_LABELS: Record<PersonaId, string> = {
  elderly: "Elderly User",
  visuallyImpaired: "Visually Impaired User",
  firstTime: "First-Time Internet User",
  patient: "Patient",
  auto: "Auto Detect"
};

export const PERSONA_GUIDANCE: Record<Exclude<PersonaId, "auto">, string[]> = {
  elderly: ["Increase text size", "Increase button size", "Reduce visual clutter"],
  visuallyImpaired: ["High-contrast mode", "Larger text", "Visible focus outlines"],
  firstTime: ["Step-by-step hints", "Contextual tooltips", "Hide secondary actions"],
  patient: ["Prioritize appointments", "Highlight healthcare actions", "De-emphasize unrelated items"]
};
