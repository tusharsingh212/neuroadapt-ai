import { AlertCircle, CheckCircle2, Circle, Compass, Loader2, MessageCircle, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { sendRuntimeMessage } from "@/shared/chrome";
import {
  applyGuidanceFromResponse,
  clearGuidanceHighlights,
  mergeChecklistProgress
} from "@/shared/elementGuide";
import { extractPageContext } from "@/shared/pageContext";
import {
  initGoalSession,
  startSession,
  getSession,
  updateChecklist,
  advanceChecklist,
  isActive,
  isOnSamePage,
  completeSession,
  pauseSession
} from "@/shared/goalSession";
import { PageObserver } from "@/shared/pageObserver";
import type { TaskAssistantMessage } from "@/shared/messaging";
import type { ChatMessage, ChecklistItem, ConfusionSignal, ExtensionSettings, PersonaId, TaskAssistantResult } from "@/shared/types";

interface TaskAssistantPanelProps {
  settings: ExtensionSettings;
  persona: PersonaId;
  onStatus?: (message: string) => void;
  onGoalChange?: () => void;
  confusionSignals?: ConfusionSignal[];
  onPageSummary?: (text: string) => void;
}

const GENERAL_SUGGESTIONS = [
  "Help me fill this form",
  "What can I do here?"
];

const FIRST_TIME_SUGGESTIONS = [
  "Help me apply on this page",
  "What is this page for?"
];

function buildWelcomeMessage(isFirstTimeMode: boolean): string {
  if (isFirstTimeMode) {
    return "Hello! I'm here to help. Tell me what you'd like to do — for example, \"Help me apply\" or \"What is this page for?\"";
  }
  return "Hello! I'm here to help. What would you like to do on this page? You can ask me anything.";
}

function createId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function TypingIndicator(): JSX.Element {
  return (
    <div className="na-chat-bubble na-chat-assistant na-typing" aria-label="Assistant is typing">
      <span className="na-typing-dot" /><span className="na-typing-dot" /><span className="na-typing-dot" />
    </div>
  );
}

function ChecklistView({ items }: { items: ChecklistItem[] }): JSX.Element | null {
  if (items.length === 0) return null;
  const completed = items.filter((i) => i.status === "completed").length;
  return (
    <div className="na-checklist" aria-label="Task progress">
      <div className="na-checklist-head">
        <span className="na-label">Your progress</span>
        <span className="na-compact">{completed}/{items.length}</span>
      </div>
      <div className="na-progress" style={{ marginBottom: 10 }}>
        <div className="na-progress-fill" style={{ width: `${Math.round((completed / items.length) * 100)}%` }} />
      </div>
      <ol className="na-checklist-items">
        {items.map((item) => (
          <li key={item.id} className={`na-checklist-item na-checklist-${item.status}`} aria-current={item.status === "active" ? "step" : undefined}>
            {item.status === "completed"
              ? <CheckCircle2 size={14} className="na-checklist-icon na-checklist-done" />
              : <Circle size={14} className={`na-checklist-icon ${item.status === "active" ? "na-checklist-active" : ""}`} />
            }
            <span>{item.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const PRIMARY_ACTION_KEYWORDS = [
  "continue", "next", "submit", "apply", "register", "sign up", "create",
  "book", "schedule", "confirm", "save", "send", "pay", "checkout",
  "proceed", "verify", "activate", "enable", "start"
];

const SECONDARY_ACTION_KEYWORDS = [
  "cancel", "back", "close", "skip", "settings", "help", "privacy",
  "terms", "logout", "sign out", "menu", "more", "options"
];

function isPrimaryActionClick(target: HTMLElement): boolean {
  const interactive = target.closest("button, a[href], [role='button'], input[type='submit'], input[type='button']");
  if (!interactive) return false;
  const text = (interactive.textContent || interactive.getAttribute("aria-label") || interactive.getAttribute("value") || "").toLowerCase().trim();
  if (!text) return false;
  if (SECONDARY_ACTION_KEYWORDS.some((kw) => text.includes(kw))) return false;
  return PRIMARY_ACTION_KEYWORDS.some((kw) => text.includes(kw));
}

export function TaskAssistantPanel({ settings, persona, onStatus, onGoalChange, confusionSignals = [], onPageSummary }: TaskAssistantPanelProps): JSX.Element {
  const resolvedPersona = settings.persona;
  const isFirstTimeMode = resolvedPersona === "firstTime";

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    id: "welcome",
    role: "assistant",
    content: buildWelcomeMessage(isFirstTimeMode),
    timestamp: Date.now()
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [walkthroughMode, setWalkthroughMode] = useState(false);
  const [goalActive, setGoalActive] = useState(isActive());

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const checklistRef = useRef(checklist);
  const chatMessagesRef = useRef(chatMessages);
  const walkthroughRef = useRef(walkthroughMode);
  const confusionSignalsRef = useRef(confusionSignals);
  const runAssistantRef = useRef<(...args: Parameters<typeof runAssistant>) => ReturnType<typeof runAssistant>>();
  const handleResponseRef = useRef<(...args: Parameters<typeof handleResponse>) => void>();
  const pageObserverRef = useRef<PageObserver | null>(null);
  // hasScanRef persists across panel open/close since the component stays mounted
  const hasScanRef = useRef(false);
  const onPageSummaryRef = useRef(onPageSummary);

  useEffect(() => { checklistRef.current = checklist; }, [checklist]);
  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);
  useEffect(() => { walkthroughRef.current = walkthroughMode; }, [walkthroughMode]);
  useEffect(() => { confusionSignalsRef.current = confusionSignals; }, [confusionSignals]);
  useEffect(() => { onPageSummaryRef.current = onPageSummary; }, [onPageSummary]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, loading]);

  // Page observer for continuous re-analysis when goal is active
  useEffect(() => {
    if (!goalActive && !walkthroughMode) return;

    const observer = new PageObserver();
    pageObserverRef.current = observer;

    observer.onChange((event) => {
      if (!walkthroughRef.current && !isActive()) return;

      if (event.type === "navigation") {
        clearGuidanceHighlights(document);
        const session = getSession();
        if (session && !isOnSamePage()) {
          pauseSession();
          setGoalActive(false);
          onGoalChange?.();
        }
        return;
      }

      if (event.type !== "click" && event.type !== "dom") return;

      if (event.type === "click" && event.target) {
        if (!isPrimaryActionClick(event.target)) return;
      }

      advanceChecklist();
      const question = "The page changed. Determine if the previous step was completed and tell me the next single step.";
      setLoading(true);
      runAssistantRef.current?.(question, chatMessagesRef.current, true).then((result) => {
        if (result) handleResponseRef.current?.(result, true);
      }).finally(() => setLoading(false));
    });

    observer.start(document);
    return () => { observer.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalActive, walkthroughMode]);

  const runAssistant = useCallback(
    async (question: string, history: ChatMessage[], silent = false): Promise<TaskAssistantResult | null> => {
      const context = extractPageContext(document, resolvedPersona);
      const session = getSession();
      const signalKey = `task-${context.summary.url}`;

      const response = await sendRuntimeMessage<TaskAssistantMessage>({
        type: "NA_RUN_TASK_ASSISTANT",
        payload: {
          context,
          question,
          conversationHistory: history,
          goalSession: session,
          checklist: checklistRef.current,
          confusionSignals: silent ? [] : confusionSignalsRef.current,
          signalKey
        }
      });

      if (!response?.ok || !response.result) {
        if (!silent) onStatus?.(response?.error ?? "Assistant unavailable.");
        return null;
      }

      const result = response.result;
      if (result.goalSession) {
        if (result.goalSession.status !== "preview") startSession();
      }

      return result;
    },
    [resolvedPersona, onStatus]
  );

  const handleResponse = useCallback((result: TaskAssistantResult, silent = false) => {
    applyGuidanceFromResponse(
      document,
      result.highlightElementRef,
      result.highlightTooltip,
      result.formFields,
      result.customCss,
      result.domActions,
      result.candidates
    );

    if (result.checklist.length > 0) {
      setChecklist((prev) => mergeChecklistProgress(prev, result.checklist));
      updateChecklist(result.checklist);
    }

    if (result.taskLabel && !getSession()) {
      const steps = result.checklist.length > 0
        ? result.checklist.map((c) => c.label)
        : ["Find the right section", "Fill in the form", "Review and submit"];
      initGoalSession(result.taskLabel, steps, result.estimatedTime, result.estimatedSteps);
      setGoalActive(true);
      onGoalChange?.();
    }

    const allDone = result.checklist.length > 0 && result.checklist.every((c) => c.status === "completed");
    if (allDone) {
      completeSession();
      setGoalActive(false);
      onGoalChange?.();
    }

    if (silent && result.highlightElementRef) return;

    const assistantMessage: ChatMessage = {
      id: createId(),
      role: "assistant",
      content: result.walkthroughStep || result.reply,
      timestamp: Date.now(),
      checklist: result.checklist,
      formFields: result.formFields
    };

    setChatMessages((prev) => {
      const next = [...prev, assistantMessage];
      if (allDone) {
        next.push({
          id: createId(),
          role: "assistant",
          content: "You've completed all the steps — well done! Is there anything else I can help you with?",
          timestamp: Date.now() + 1
        });
      }
      return next;
    });
  }, [onGoalChange]);

  useEffect(() => { runAssistantRef.current = runAssistant; }, [runAssistant]);
  useEffect(() => { handleResponseRef.current = handleResponse; }, [handleResponse]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMessage: ChatMessage = { id: createId(), role: "user", content: trimmed, timestamp: Date.now() };
      const history = [...chatMessages, userMessage];
      setChatMessages(history);
      setInput("");
      setLoading(true);

      try {
        const result = await runAssistant(trimmed, history);
        if (result) {
          handleResponse(result);
        } else {
          setChatMessages((prev) => [...prev, {
            id: createId(),
            role: "assistant",
            content: "I'm having trouble connecting right now. Please try again in a moment.",
            timestamp: Date.now()
          }]);
        }
      } catch {
        setChatMessages((prev) => [...prev, {
          id: createId(),
          role: "assistant",
          content: "Something went wrong. Please try again.",
          timestamp: Date.now()
        }]);
      } finally {
        setLoading(false);
      }
    },
    [chatMessages, loading, runAssistant, handleResponse]
  );

  const startWalkthrough = useCallback(async () => {
    setWalkthroughMode(true);
    onStatus?.("Walkthrough started.");

    const question = "Analyze this page. If this is a form or application, list ALL the steps needed. Include a taskLabel.";
    setLoading(true);

    try {
      const result = await runAssistant(question, chatMessages);
      if (result) {
        // handleResponse adds the assistant reply — no need for a fake user message
        handleResponse(result);
        if (result.goalSession || result.taskLabel) {
          setGoalActive(true);
          onGoalChange?.();
        }
      }
    } finally {
      setLoading(false);
    }
  }, [chatMessages, runAssistant, handleResponse, onStatus, onGoalChange]);

  // Auto-scan: give user a 1-sentence page context on first open.
  // hasScanRef persists across close/reopen since the component stays mounted.
  useEffect(() => {
    if (hasScanRef.current) return;
    hasScanRef.current = true;
    const timer = setTimeout(async () => {
      if (!runAssistantRef.current) return;
      try {
        setLoading(true);
        const result = await runAssistantRef.current(
          "In one sentence, what is this page for and what can I do here?",
          chatMessagesRef.current,
          true
        );
        if (result?.reply) {
          setChatMessages((prev) => [
            ...prev,
            { id: "auto-scan", role: "assistant" as const, content: result.reply, timestamp: Date.now() }
          ]);
          // Surface the summary to ContentApp so TTS has meaningful text to read
          onPageSummaryRef.current?.(result.reply);
        }
      } catch {
        // silently ignore — welcome message alone is fine
      } finally {
        setLoading(false);
      }
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!walkthroughMode) return;
    return () => { clearGuidanceHighlights(document); };
  }, [walkthroughMode]);

  useEffect(() => () => clearGuidanceHighlights(document), []);

  function handleSubmit(event: React.FormEvent): void { event.preventDefault(); sendMessage(input); }
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(input); }
  }

  return (
    <div className="na-section na-chat-section">
      <div className="na-section-head">
        <div className="na-chat-title-row">
          <MessageCircle size={16} />
          <span className="na-label" style={{ marginBottom: 0 }}>Ask me anything</span>
        </div>
      </div>

      <div className="na-chat-body">

        {walkthroughMode ? (
          <div className="na-walkthrough-badge">
            <Sparkles size={12} /> Walkthrough active — complete each step and I'll guide you forward.
          </div>
        ) : null}

        {goalActive && !walkthroughMode && getSession()?.status === "active" ? (
          <div className="na-walkthrough-badge">
            <Sparkles size={12} /> Goal in progress — I'll guide you as the page changes.
          </div>
        ) : null}

        {!walkthroughMode && !goalActive ? (
          <div className="na-suggestions" aria-label="Suggested actions">
            <button
              type="button"
              className="na-suggestion-chip na-suggestion-primary"
              disabled={loading}
              onClick={startWalkthrough}
              aria-label="Walk me through this page step by step"
            >
              <Compass size={12} style={{ marginRight: 4 }} />
              Walk me through this
            </button>
            {(isFirstTimeMode ? FIRST_TIME_SUGGESTIONS : GENERAL_SUGGESTIONS).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="na-suggestion-chip"
                disabled={loading}
                onClick={() => sendMessage(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <ChecklistView items={checklist} />

        {confusionSignals.length > 0 ? (
          <div className="na-api-banner" role="alert" style={{ borderColor: "rgba(251, 191, 36, 0.4)", background: "rgba(251, 191, 36, 0.08)" }}>
            <AlertCircle size={14} />
            <span>{confusionSignals[0].suggestion}</span>
            <button type="button" className="na-button na-secondary" onClick={() => sendMessage("Help me, I'm stuck")}>Get Help</button>
          </div>
        ) : null}

        <div className="na-chat-messages" role="log" aria-live="polite" aria-relevant="additions">
          {chatMessages.map((message) => (
            <div key={message.id} className={`na-chat-bubble ${message.role === "user" ? "na-chat-user" : "na-chat-assistant"}`}>
              {message.content}
              {message.formFields && message.formFields.length > 0 ? (
                <div className="na-form-hints">
                  {message.formFields.slice(0, 4).map((field) => (
                    <div key={`${field.elementRef}-${field.label}`} className="na-form-hint">
                      <strong>{field.label}</strong>
                      {field.required ? <span className="na-required">Required</span> : null}
                      <p>{field.explanation}</p>
                      {field.expectedFormat ? <span className="na-compact">Expected: {field.expectedFormat}</span> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {loading ? <TypingIndicator /> : null}
          <div ref={chatEndRef} />
        </div>

        <form className="na-chat-input-row" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            className="na-chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isFirstTimeMode
              ? 'Type your question... e.g. "Help me apply here"'
              : 'Type your question... e.g. "Help me fill this form"'
            }
            rows={2}
            aria-label="Ask the task assistant"
            disabled={loading}
          />
          <button
            type="submit"
            className="na-button na-primary na-send-btn"
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
