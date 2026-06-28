export type PersonaId =
  | "elderly"
  | "firstTime"
  | "taskHelper"
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
    label: "Elderly User",
    badge: "Comfort",
    description: "Larger text, clearer hierarchy, and simpler interactions.",
    accent: "from-amber-400 to-orange-500"
  },
  {
    id: "firstTime",
    label: "First-Time Internet User",
    badge: "Guidance",
    description: "Step-by-step hints and gentle reduction of clutter.",
    accent: "from-emerald-400 to-teal-500"
  }
];

export interface ExtensionSettings {
  enabled: boolean;
  persona: PersonaId;
  comparisonMode: ComparisonMode;
}

export interface ExtractedElement {
  label: string;
  role: string;
  tag: string;
  href?: string;
  type?: string;
  fontSize?: number;
  contrastRatio?: number;
  smallTarget?: boolean;
  id?: string;
  cssClass?: string;
}

export interface PageSummary {
  title: string;
  url: string;
  language: string;
  description: string;
  metadata: Record<string, string>;
  headings: Array<{ level: number; text: string }>;
  navigation: ExtractedElement[];
  links: ExtractedElement[];
  buttons: ExtractedElement[];
  forms: Array<{
    label: string;
    fields: ExtractedElement[];
    buttons: ExtractedElement[];
  }>;
  tables: Array<{ caption: string; columns: string[]; rows: number }>;
  textBlocks: Array<{ text: string; fontSize: number; contrastRatio?: number }>;
  interactiveElements: ExtractedElement[];
  stats: {
    interactiveCount: number;
    smallTargetCount: number;
    navCount: number;
    formCount: number;
    textBlockCount: number;
    averageFontSize: number;
    lowContrastCount: number;
    bodyTextLength: number;
  };
}

export interface AiIssue {
  severity: "low" | "medium" | "high";
  category: string;
  description: string;
  evidence?: string;
  cssSelector?: string;
}

export interface AiRecommendation {
  id: string;
  type:
    | "font-scale"
    | "spacing"
    | "contrast"
    | "highlight-buttons"
    | "simplify-layout"
    | "guidance-markers"
    | "focus-indicators";
  priority: "low" | "medium" | "high";
  description: string;
  selectorHint?: string;
}

export interface AiGuidanceItem {
  title: string;
  body: string;
  steps?: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  checklist?: ChecklistItem[];
  formFields?: FormFieldGuide[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: "pending" | "active" | "completed";
}

export interface FormFieldGuide {
  elementRef: string;
  label: string;
  explanation: string;
  required: boolean;
  expectedFormat?: string;
}

export type GoalSessionStatus = "preview" | "active" | "paused" | "completed" | "cancelled";

export interface GoalSession {
  id: string;
  goal: string;
  status: GoalSessionStatus;
  checklist: ChecklistItem[];
  startedAt: number;
  lastUpdatedAt: number;
  confidence: number;
  estimatedSteps: number;
  estimatedTimeLabel: string;
  pageUrl: string;
}

export interface HighlightCandidate {
  ref: string;
  label: string;
  reason: string;
}

export interface TaskState {
  activeTask: string | null;
  checklist: ChecklistItem[];
  startedAt: number;
  lastUpdatedAt: number;
  pageUrl: string;
}

export interface TaskAssistantResult {
  reply: string;
  highlightElementRef?: string;
  highlightTooltip?: string;
  checklist: ChecklistItem[];
  formFields: FormFieldGuide[];
  walkthroughStep?: string;
  customCss?: string;
  domActions?: DomAction[];
  source: "gemini" | "heuristic";
  generatedAt: number;
  cached?: boolean;
  taskLabel?: string;
  safetyNote?: string;
  elementFound?: boolean;
  candidates?: HighlightCandidate[];
  goalSession?: GoalSession;
  estimatedTime?: string;
  estimatedSteps?: number;
}

export type OverlayMode =
  | "focusMode"
  | "readingMode"
  | "reducedClutter"
  | "largeTargets"
  | "highContrast"
  | "dyslexiaSpacing"
  | "simplifiedLabels";

export type OverlaySettings = Record<OverlayMode, boolean>;

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  focusMode: false,
  readingMode: false,
  reducedClutter: false,
  largeTargets: false,
  highContrast: false,
  dyslexiaSpacing: false,
  simplifiedLabels: false
};

export interface ConfusionSignal {
  type: "repeatClick" | "scrollBurst" | "failedInteraction" | "longPause" | "hoverHesitation" | "menuFlicker";
  severity: "low" | "medium" | "high";
  suggestion: string;
  timestamp: number;
}

export interface DomAction {
  action: "move" | "hide" | "style" | "addClass" | "changeText";
  elementRef: string;
  cssSelector?: string;
  targetRef?: string;
  targetSelector?: string;
  position?: "before" | "after" | "inside-start" | "inside-end";
  cssStyles?: Record<string, string>;
  classes?: string[];
  text?: string;
}

export interface AiAnalysisResult {
  source: "gemini" | "heuristic";
  persona: PersonaId;
  score: number;
  issues: AiIssue[];
  recommendations: AiRecommendation[];
  guidance: AiGuidanceItem[];
  summary: string;
  customCss?: string;
  domActions?: DomAction[];
  cached?: boolean;
  generatedAt: number;
}

export interface AccessibilityDetail {
  tinyClickTargets: number;
  denseLayoutScore: number;
  navTreeDepth: number;
  longForms: number;
  missingLabels: number;
  ambiguousButtons: number;
  excessiveScroll: boolean;
  headingGaps: number[];
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
  accessibilityDetail: AccessibilityDetail;
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
  ai?: AiAnalysisResult;
}

export interface RuntimeStatus {
  state: "idle" | "analyzing" | "applying" | "done";
  messages: string[];
  lastUpdated: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: false,
  persona: "elderly",
  comparisonMode: "adapted"
};

export const PERSONA_LABELS: Record<PersonaId, string> = {
  elderly: "Elderly User",
  firstTime: "First-Time Internet User",
  taskHelper: "Task Helper",
  auto: "Auto-Detected"
};

export const PERSONA_GUIDANCE: Record<PersonaId, string[]> = {
  elderly: ["Increase text size", "Increase button size", "Reduce visual clutter"],
  firstTime: ["Step-by-step hints", "Contextual tooltips", "Hide secondary actions"],
  taskHelper: ["Focus on the current task", "Highlight the next required action", "Minimize non-essential distractions"],
  auto: ["Apply balanced default accessibility settings"]
};
