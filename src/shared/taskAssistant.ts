import { compactPageContext, type PageContext } from "@/shared/pageContext";
import { parseTaskAssistantJson, validateTaskAssistantResult } from "@/shared/taskAssistantSchema";
import type { ChatMessage, ChecklistItem, PersonaId, TaskAssistantResult } from "@/shared/types";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

export interface TaskAssistantRequest {
  apiKey: string;
  model: string;
  context: PageContext;
  question: string;
  conversationHistory?: ChatMessage[];
  walkthroughMode?: boolean;
  walkthroughStepIndex?: number;
}

function systemPrompt(): string {
  return [
    "You are NeuroAdapt AI, a live task guide that helps users complete workflows on webpages.",
    "You receive a structured page summary with element refs (na-el-N). Reference ONLY elements that exist in the summary.",
    "Never invent buttons, links, or form fields that are not listed.",
    "Never claim an action was completed unless the user explicitly says so.",
    "Never auto-submit forms or fabricate personal information.",
    "Do not ask for or repeat passwords, OTPs, PINs, or other sensitive credentials.",
    "Use plain, beginner-friendly language suitable for first-time internet users.",
    "Return strict JSON only. No markdown.",
    "JSON shape:",
    '{"reply":"","highlightElementRef":"na-el-0 or null","highlightTooltip":"","checklist":[{"id":"","label":"","status":"pending|active|completed"}],"formFields":[{"elementRef":"","label":"","explanation":"","required":true,"expectedFormat":""}],"walkthroughStep":""}',
    "reply: clear conversational answer grounded in the current page.",
    "highlightElementRef: ref of the ONE element the user should interact with next, or omit if none.",
    "highlightTooltip: short tooltip like 'Click here to continue.'",
    "checklist: ordered task steps with status. Mark completed steps when user progress suggests it.",
    "formFields: explain visible form fields in plain language when relevant.",
    "walkthroughStep: when in walkthrough mode, the single current instruction only."
  ].join("\n");
}

function formatHistory(messages: ChatMessage[]): string {
  if (messages.length === 0) return "No prior conversation.";
  return messages
    .slice(-8)
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n");
}

function userPrompt(request: TaskAssistantRequest): string {
  const lines = [
    `Current persona: ${request.context.persona}`,
    request.walkthroughMode ? `Walkthrough mode: ON (step ${(request.walkthroughStepIndex ?? 0) + 1})` : "Walkthrough mode: OFF",
    `User question: ${request.question}`,
    "",
    "Conversation history:",
    formatHistory(request.conversationHistory ?? []),
    "",
    "Structured page context:",
    compactPageContext(request.context)
  ];
  return lines.join("\n");
}

function heuristicFallback(context: PageContext, question: string): TaskAssistantResult {
  const buttons = context.summary.buttons.filter((b) => b.label);
  const forms = context.summary.forms;
  const primaryButton = buttons.find((b) =>
    /start|apply|register|continue|submit|book|next|enroll|aadhaar/i.test(b.label)
  );
  const firstElement =
    context.elements.find((el) => primaryButton && el.label.toLowerCase() === primaryButton.label.toLowerCase()) ??
    context.elements.find((el) => /start|apply|register|continue|submit|enroll/i.test(el.label)) ??
    context.elements[0];

  const checklist: ChecklistItem[] = [];
  if (/apply|aadhaar|register|enrol/i.test(question)) {
    checklist.push(
      { id: "1", label: "Find the registration or apply section", status: "active" },
      { id: "2", label: "Fill in your personal information", status: "pending" },
      { id: "3", label: "Upload required documents", status: "pending" },
      { id: "4", label: "Review your details", status: "pending" },
      { id: "5", label: "Submit the application", status: "pending" }
    );
  }

  const formFields =
    forms[0]?.fields.slice(0, 6).map((field, index) => ({
      elementRef: context.elements[index]?.ref ?? "",
      label: field.label || `Field ${index + 1}`,
      explanation: `Enter your ${(field.label || "information").toLowerCase()} here.`,
      required: true,
      expectedFormat: field.type === "email" ? "example@email.com" : undefined
    })) ?? [];

  return {
    reply: primaryButton
      ? `I can see "${primaryButton.label}" on this page — that's likely your next step. ${context.summary.title ? `You're on "${context.summary.title}".` : ""} Ask me "What should I click next?" for more help.`
      : `You're viewing "${context.summary.title}". Tell me what you'd like to accomplish and I'll guide you step by step.`,
    highlightElementRef: firstElement?.ref,
    highlightTooltip: primaryButton ? `Click "${primaryButton.label}" to continue.` : "Click here to continue.",
    checklist,
    formFields,
    source: "heuristic",
    generatedAt: Date.now()
  };
}

export async function analyzeTaskWithGemini(request: TaskAssistantRequest): Promise<TaskAssistantResult> {
  if (!request.apiKey.trim()) {
    return heuristicFallback(request.context, request.question);
  }

  try {
    const response = await fetch(
      `${GEMINI_ENDPOINT}/${encodeURIComponent(request.model)}:generateContent?key=${encodeURIComponent(request.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationConfig: {
            temperature: 0.25,
            topP: 0.85,
            maxOutputTokens: 1800,
            responseMimeType: "application/json"
          },
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt()}\n\n${userPrompt(request)}` }]
            }
          ]
        })
      }
    );

    const payload = (await response.json()) as GeminiGenerateResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message || `Gemini request failed with ${response.status}.`);
    }

    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return {
      ...validateTaskAssistantResult(parseTaskAssistantJson(text)),
      source: "gemini",
      generatedAt: Date.now()
    };
  } catch {
    return heuristicFallback(request.context, request.question);
  }
}
