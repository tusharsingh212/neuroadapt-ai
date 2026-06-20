import { compactPageContext, getActiveContextElement, type PageContext } from "@/shared/pageContext";
import { parseTaskAssistantJson, validateTaskAssistantResult } from "@/shared/taskAssistantSchema";
import type { AccessibilityDetail, ChatMessage, ChecklistItem, ConfusionSignal, GoalSession, PersonaId, TaskAssistantResult } from "@/shared/types";
import { callGemini } from "@/shared/geminiClient";
import { createAbortSignal } from "@/shared/requestManager";

export interface TaskAssistantRequest {
  apiKey: string;
  model: string;
  context: PageContext;
  question: string;
  conversationHistory?: ChatMessage[];
  goalSession?: GoalSession | null;
  checklist?: ChecklistItem[];
  accessibilityDetail?: AccessibilityDetail;
  confusionSignals?: ConfusionSignal[];
  signal?: AbortSignal;
}

const SAFETY_RULES = [
  "Never invent buttons, links, or form fields that are not listed in the page context.",
  "Never auto-submit forms or fabricate personal information.",
  "Never claim an action was completed unless the user explicitly confirms it.",
  "Never ask for or repeat passwords, OTPs, PINs, or other sensitive credentials.",
  "If the element you want to highlight is not in the provided context, set highlightElementRef to null.",
  "Be concise: reply in 2-3 sentences max.",
  "Stay grounded: only reference elements present in the page context.",
  "Never hallucinate: if you are unsure, say 'I'm not sure' and suggest alternatives.",
  "Admit uncertainty: if the page doesn't have the needed feature, say so clearly."
];

function systemPrompt(persona: PersonaId): string {
  const personaExtras = persona === "firstTime"
    ? [
        "The user is a first-time internet user. Explain everything in very simple words.",
        "Avoid technical jargon. Use analogies like 'this works like a paper form' or 'clicking this is like pressing a doorbell'.",
        "Break actions into tiny steps. Explain unfamiliar terminology.",
        "Highlight only the ONE most relevant control."
      ]
    : persona === "taskHelper"
    ? [
        "The user wants to complete a specific task on this website.",
        "Give direct navigation guidance: name the exact button or section.",
        "Keep each instruction to ONE action at a time."
      ]
    : [
        "Provide accurate, helpful guidance based on the current page content."
      ];

  return [
    "You are NeuroAdapt AI, a navigation copilot for accessible web browsing.",
    "You receive a structured page summary with element refs (na-el-N). Reference ONLY elements that exist in that summary.",
    "Your job is to:",
    "1. Analyze the page context to understand what the user is looking at.",
    "2. Determine whether the user's task is supported by this page.",
    "3. If yes: identify the ONE element the user should interact with next and set highlightElementRef.",
    "4. If multiple candidates exist, list them in the 'candidates' array with reasons for each.",
    "5. If no: explain what's available and suggest alternatives.",
    ...SAFETY_RULES,
    ...personaExtras,
    "Return strict JSON only. No markdown.",
    '{"reply":"","highlightElementRef":"na-el-0 or null","highlightTooltip":"","taskLabel":"","elementFound":true,"checklist":[{"id":"","label":"","status":"pending|active|completed"}],"formFields":[{"elementRef":"","label":"","explanation":"","required":true,"expectedFormat":""}],"candidates":[{"ref":"","label":"","reason":""}],"estimatedTime":"","estimatedSteps":5,"customCss":"","domActions":[],"safetyNote":""}',
    "reply: clear conversational answer grounded in the current page. Keep to 2-3 sentences.",
    "highlightElementRef: ref of the ONE element the user should click or fill next. Omit/null if informational.",
    "highlightTooltip: 3-5 word instruction like 'Click here to continue.'",
    "taskLabel: a short name for the current user goal like 'Aadhaar enrollment'.",
    "elementFound: true if the required element exists on this page, false otherwise.",
    "checklist: ordered task steps with one step set to 'active' at a time.",
    "candidates: if multiple elements match, list each with ref, label, and why it is a candidate.",
    "estimatedTime: estimate like '10-15 minutes' or '2-3 minutes'.",
    "estimatedSteps: estimated total number of steps.",
    "formFields: explain visible form fields in plain language.",
    "customCss: raw CSS to inject for layout improvement.",
    "domActions: reversible actions to restructure DOM (move elements, hide clutter, add classes).",
    "safetyNote: optional note if the task involves sensitive data."
  ].join("\n");
}

function formatHistory(messages: ChatMessage[]): string {
  if (messages.length === 0) return "No prior conversation.";
  return messages.slice(-8).map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`).join("\n");
}

function userPrompt(request: TaskAssistantRequest): string {
  const activeElement = getActiveContextElement();
  const lines = [
    `Current persona: ${request.context.persona}`,
    `User question: ${request.question}`,
    ""
  ];

  if (request.goalSession) {
    const gs = request.goalSession;
    lines.push(
      "Active goal session:",
      `  Goal: ${gs.goal}`,
      `  Status: ${gs.status}`,
      `  Confidence: ${Math.round(gs.confidence * 100)}%`,
      `  Checklist: ${gs.checklist.map((c) => `[${c.status}] ${c.label}`).join(" | ")}`,
      ""
    );
  }

  if (request.checklist?.length) {
    lines.push("Current checklist:", request.checklist.map((c) => `  [${c.status}] ${c.label}`).join("\n"), "");
  }

  if (request.accessibilityDetail) {
    const ad = request.accessibilityDetail;
    lines.push(
      "Accessibility findings:",
      `  Tiny targets: ${ad.tinyClickTargets}, Dense layout: ${ad.denseLayoutScore}/10`,
      `  Missing labels: ${ad.missingLabels}, Ambiguous buttons: ${ad.ambiguousButtons}`,
      `  Nav depth: ${ad.navTreeDepth}, Excessive scroll: ${ad.excessiveScroll}`,
      ""
    );
  }

  if (request.confusionSignals?.length) {
    lines.push("User confusion signals:", request.confusionSignals.map((s) => `  ${s.type} (${s.severity}): ${s.suggestion}`).join("\n"), "");
  }

  lines.push(
    "Conversation history:",
    formatHistory(request.conversationHistory ?? []),
    "",
    "Active/focused element on page:",
    activeElement ? JSON.stringify(activeElement) : "None",
    "",
    "Structured page context:",
    compactPageContext(request.context)
  );

  return lines.join("\n");
}

function heuristicFallback(context: PageContext, question: string): TaskAssistantResult {
  const buttons = context.summary.buttons.filter((b) => b.label);
  const primaryButton = buttons.find((b) => /start|apply|register|continue|submit|book|next|enroll|aadhaar/i.test(b.label));
  const firstRelevant = context.elements.find((el) =>
    primaryButton ? el.label.toLowerCase() === primaryButton.label.toLowerCase() : /start|apply|register|continue|submit|enroll/i.test(el.label)
  ) ?? context.elements[0];

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

  const informational = /what is|what does|explain|mean|help me understand/i.test(question);

  return {
    reply: informational
      ? `This page is "${context.summary.title}". ${context.summary.description || context.summary.textBlocks[0]?.text || "Tell me what you'd like to do and I'll guide you step by step."}`
      : primaryButton
        ? `I can see "${primaryButton.label}" on this page — that's likely your next step.`
        : `You're viewing "${context.summary.title}". What would you like to accomplish?`,
    highlightElementRef: firstRelevant?.ref,
    highlightTooltip: primaryButton ? `Click "${primaryButton.label}" to continue.` : undefined,
    elementFound: !!firstRelevant,
    checklist,
    formFields: context.summary.forms[0]?.fields.slice(0, 6).map((field, i) => ({
      elementRef: context.elements[i]?.ref ?? "",
      label: field.label || `Field ${i + 1}`,
      explanation: `Enter your ${(field.label || "information").toLowerCase()} here.`,
      required: true,
      expectedFormat: field.type === "email" ? "example@email.com" : undefined
    })) ?? [],
    source: "heuristic",
    generatedAt: Date.now(),
    estimatedSteps: checklist.length || undefined,
    estimatedTime: "10-15 minutes"
  };
}

export async function analyzeTaskWithGemini(
  request: TaskAssistantRequest,
  options?: { allowHeuristicFallback?: boolean }
): Promise<TaskAssistantResult> {
  const allowFallback = options?.allowHeuristicFallback ?? false;

  if (!request.apiKey.trim()) {
    throw new Error("Gemini API key is missing. Open the NeuroAdapt popup and save your API key.");
  }

  try {
    const fullPrompt = `${systemPrompt(request.context.persona)}\n\n${userPrompt(request)}`;
    const text = await callGemini(request.apiKey, request.model, fullPrompt, {
      signal: request.signal
    });

    const parsed = parseTaskAssistantJson(text);
    return {
      ...validateTaskAssistantResult(parsed),
      source: "gemini",
      generatedAt: Date.now()
    };
  } catch (error) {
    if (allowFallback) {
      return heuristicFallback(request.context, request.question);
    }
    throw error instanceof Error ? error : new Error("Task assistant failed.");
  }
}
