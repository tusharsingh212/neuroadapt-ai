import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, Compass, Loader2, MessageCircle, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { sendRuntimeMessage } from "@/shared/chrome";
import {
  advanceChecklistOnInteraction,
  applyGuidanceFromResponse,
  clearGuidanceHighlights,
  mergeChecklistProgress
} from "@/shared/elementGuide";
import { extractPageContext } from "@/shared/pageContext";
import type { TaskAssistantMessage } from "@/shared/messaging";
import type { ChatMessage, ChecklistItem, ExtensionSettings, PersonaId, TaskAssistantResult } from "@/shared/types";

interface TaskAssistantPanelProps {
  settings: ExtensionSettings;
  persona: PersonaId;
  onStatus?: (message: string) => void;
}

function createId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function TypingIndicator(): JSX.Element {
  return (
    <div className="na-chat-bubble na-chat-assistant na-typing" aria-label="Assistant is typing">
      <span className="na-typing-dot" />
      <span className="na-typing-dot" />
      <span className="na-typing-dot" />
    </div>
  );
}

function ChecklistView({ items }: { items: ChecklistItem[] }): JSX.Element | null {
  if (items.length === 0) return null;

  const completed = items.filter((item) => item.status === "completed").length;
  const progress = Math.round((completed / items.length) * 100);

  return (
    <div className="na-checklist" aria-label="Task progress">
      <div className="na-checklist-head">
        <span className="na-label">Your progress</span>
        <span className="na-compact">{completed}/{items.length}</span>
      </div>
      <div className="na-progress" style={{ marginBottom: 10 }}>
        <div className="na-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <ol className="na-checklist-items">
        {items.map((item) => (
          <li
            key={item.id}
            className={`na-checklist-item na-checklist-${item.status}`}
            aria-current={item.status === "active" ? "step" : undefined}
          >
            {item.status === "completed" ? (
              <CheckCircle2 size={14} className="na-checklist-icon na-checklist-done" />
            ) : (
              <Circle size={14} className={`na-checklist-icon ${item.status === "active" ? "na-checklist-active" : ""}`} />
            )}
            <span>{item.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TaskAssistantPanel({ settings, persona, onStatus }: TaskAssistantPanelProps): JSX.Element {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your live guide. Ask me anything about this page — like \"Help me apply for an Aadhaar card\" or \"What should I click next?\"",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [walkthroughMode, setWalkthroughMode] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [chatExpanded, setChatExpanded] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const checklistRef = useRef(checklist);
  const walkthroughRef = useRef(walkthroughMode);

  useEffect(() => {
    checklistRef.current = checklist;
  }, [checklist]);

  useEffect(() => {
    walkthroughRef.current = walkthroughMode;
  }, [walkthroughMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, loading]);

  const runAssistant = useCallback(
    async (question: string, history: ChatMessage[]): Promise<TaskAssistantResult | null> => {
      const resolvedPersona = settings.persona === "auto" ? persona : settings.persona;
      const context = extractPageContext(document, resolvedPersona);

      const response = await sendRuntimeMessage<TaskAssistantMessage>({
        type: "NA_RUN_TASK_ASSISTANT",
        payload: {
          context,
          question,
          conversationHistory: history,
          walkthroughMode: walkthroughRef.current,
          walkthroughStepIndex: walkthroughStep
        }
      });

      if (!response?.ok || !response.result) {
        onStatus?.(response?.error ?? "Assistant unavailable. Using local guidance.");
        return null;
      }

      return response.result;
    },
    [settings.persona, persona, walkthroughStep, onStatus]
  );

  const handleResponse = useCallback((result: TaskAssistantResult) => {
    applyGuidanceFromResponse(
      document,
      result.highlightElementRef,
      result.highlightTooltip,
      result.formFields,
      result.customCss,
      result.domActions
    );

    if (result.checklist.length > 0) {
      setChecklist((prev) => mergeChecklistProgress(prev, result.checklist));
    }

    const assistantMessage: ChatMessage = {
      id: createId(),
      role: "assistant",
      content: walkthroughRef.current && result.walkthroughStep ? result.walkthroughStep : result.reply,
      timestamp: Date.now(),
      checklist: result.checklist,
      formFields: result.formFields
    };

    setChatMessages((prev) => [...prev, assistantMessage]);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMessage: ChatMessage = {
        id: createId(),
        role: "user",
        content: trimmed,
        timestamp: Date.now()
      };

      const history = [...chatMessages, userMessage];
      setChatMessages(history);
      setInput("");
      setLoading(true);

      const result = await runAssistant(trimmed, history);
      setLoading(false);

      if (result) {
        handleResponse(result);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            content: "I'm having trouble connecting right now. Try again, or use the highlighted buttons on the page.",
            timestamp: Date.now()
          }
        ]);
      }
    },
    [chatMessages, loading, runAssistant, handleResponse]
  );

  const startWalkthrough = useCallback(async () => {
    setWalkthroughMode(true);
    setWalkthroughStep(0);
    onStatus?.("Walkthrough mode started.");

    const question =
      "Analyze this page and create a step-by-step walkthrough. Show only the FIRST step I should take right now.";
    setLoading(true);

    const result = await runAssistant(question, chatMessages);
    setLoading(false);

    if (result) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "user",
          content: "Guide me through this page step by step.",
          timestamp: Date.now()
        }
      ]);
      handleResponse(result);
    }
  }, [chatMessages, runAssistant, handleResponse, onStatus]);

  const interactionDebounceRef = useRef<number | null>(null);

  const handlePageInteraction = useCallback(async () => {
    if (!walkthroughRef.current || loading) return;

    setChecklist((prev) => advanceChecklistOnInteraction(prev));

    const question = "The user completed an action on the page. Re-analyze the current page and tell me the NEXT single step only.";
    setLoading(true);
    setWalkthroughStep((step) => step + 1);

    const result = await runAssistant(question, chatMessages);
    setLoading(false);

    if (result) {
      handleResponse(result);
    }
  }, [chatMessages, loading, runAssistant, handleResponse]);

  useEffect(() => {
    if (!walkthroughMode) return;

    const handler = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest("#neuroadapt-host")) return;

      if (interactionDebounceRef.current) {
        window.clearTimeout(interactionDebounceRef.current);
      }
      interactionDebounceRef.current = window.setTimeout(() => {
        handlePageInteraction();
      }, 800);
    };

    document.addEventListener("click", handler, true);
    document.addEventListener("change", handler, true);
    document.addEventListener("input", handler, true);

    return () => {
      document.removeEventListener("click", handler, true);
      document.removeEventListener("change", handler, true);
      document.removeEventListener("input", handler, true);
      if (interactionDebounceRef.current) {
        window.clearTimeout(interactionDebounceRef.current);
      }
      clearGuidanceHighlights(document);
    };
  }, [walkthroughMode, handlePageInteraction]);

  useEffect(() => {
    return () => clearGuidanceHighlights(document);
  }, []);

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="na-section na-chat-section">
      <div className="na-section-head">
        <div className="na-chat-title-row">
          <MessageCircle size={16} />
          <span className="na-label" style={{ marginBottom: 0 }}>
            Task Assistant
          </span>
        </div>
        <div className="na-chat-actions">
          <button
            type="button"
            className={`na-button na-guide-btn ${walkthroughMode ? "na-guide-active" : ""}`}
            onClick={startWalkthrough}
            disabled={loading || walkthroughMode}
            aria-label="Guide me through this page"
          >
            <Compass size={14} />
            <span>Guide Me</span>
          </button>
          <button
            type="button"
            className="na-button na-secondary"
            onClick={() => setChatExpanded((value) => !value)}
            aria-expanded={chatExpanded}
            aria-label={chatExpanded ? "Collapse chat" : "Expand chat"}
          >
            {chatExpanded ? "−" : "+"}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {chatExpanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="na-chat-body"
          >
            {walkthroughMode ? (
              <div className="na-walkthrough-badge">
                <Sparkles size={12} />
                Walkthrough active — complete each step, then I'll guide you to the next.
              </div>
            ) : null}

            <ChecklistView items={checklist} />

            <div className="na-chat-messages" role="log" aria-live="polite" aria-relevant="additions">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`na-chat-bubble ${message.role === "user" ? "na-chat-user" : "na-chat-assistant"}`}
                >
                  {message.content}
                  {message.formFields && message.formFields.length > 0 ? (
                    <div className="na-form-hints">
                      {message.formFields.slice(0, 4).map((field) => (
                        <div key={`${field.elementRef}-${field.label}`} className="na-form-hint">
                          <strong>{field.label}</strong>
                          {field.required ? <span className="na-required">Required</span> : null}
                          <p>{field.explanation}</p>
                          {field.expectedFormat ? (
                            <span className="na-compact">Expected: {field.expectedFormat}</span>
                          ) : null}
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
                placeholder='Ask anything… e.g. "Help me apply for an Aadhaar card"'
                rows={2}
                aria-label="Ask the task assistant"
                disabled={loading}
              />
              <button type="submit" className="na-button na-primary na-send-btn" disabled={loading || !input.trim()} aria-label="Send message">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
