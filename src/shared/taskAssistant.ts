import { compactPageContext, getActiveContextElement, type PageContext } from "@/shared/pageContext";
<<<<<<< HEAD
import { checkOfficialUrl } from "@/shared/pageClassifier";
import { parseTaskAssistantJson, validateTaskAssistantResult } from "@/shared/taskAssistantSchema";
import type { AccessibilityDetail, ChatMessage, ChecklistItem, ConfusionSignal, GoalSession, PersonaId, TaskAssistantResult } from "@/shared/types";
import { callGemini } from "@/shared/geminiClient";
=======
import { parseTaskAssistantJson, validateTaskAssistantResult } from "@/shared/taskAssistantSchema";
import type { AccessibilityDetail, ChatMessage, ChecklistItem, ConfusionSignal, GoalSession, PersonaId, TaskAssistantResult } from "@/shared/types";
import { callGemini } from "@/shared/geminiClient";
import { createAbortSignal } from "@/shared/requestManager";
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191

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
<<<<<<< HEAD
  "Admit uncertainty: if the page doesn't have the needed feature, say so clearly.",
  "If confidence is 'low', set highlightElementRef to null and explain uncertainty in the reply instead of guessing.",
  "Always populate 'reason' with one sentence (under 20 words) explaining why this specific element is recommended.",
  "Set isOfficialSource to true only when highlightElementRef points to a verified government or institutional website."
=======
  "Admit uncertainty: if the page doesn't have the needed feature, say so clearly."
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
];

function systemPrompt(persona: PersonaId): string {
  const personaExtras = persona === "firstTime"
    ? [
        "The user is a first-time internet user. Explain everything in very simple words.",
        "Avoid technical jargon. Use analogies like 'this works like a paper form' or 'clicking this is like pressing a doorbell'.",
        "Break actions into tiny steps. Explain unfamiliar terminology.",
        "Highlight only the ONE most relevant control."
      ]
    : [
        // Elderly mode
        "The user may be unfamiliar with modern web interfaces. Use clear, reassuring language.",
        "Explain what each action does before recommending it.",
        "Warn before any action that cannot be undone or involves payment."
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
<<<<<<< HEAD
    '{"reply":"","highlightElementRef":"na-el-0 or null","highlightTooltip":"","taskLabel":"","elementFound":true,"checklist":[{"id":"","label":"","status":"pending|active|completed"}],"formFields":[{"elementRef":"","label":"","explanation":"","required":true,"expectedFormat":""}],"candidates":[{"ref":"","label":"","reason":""}],"estimatedTime":"","estimatedSteps":5,"customCss":"","domActions":[],"safetyNote":"","reason":"","confidence":"high","isOfficialSource":false}',
    "reply: clear conversational answer grounded in the current page. Keep to 2-3 sentences.",
    "highlightElementRef: ref of the ONE element the user should click or fill next. Omit/null if informational or low confidence.",
    "highlightTooltip: 3-5 word instruction like 'Click here to continue.'",
    "reason: one sentence under 20 words explaining why this specific element is recommended. Required when highlightElementRef is set.",
    "confidence: 'high' if you are certain of the recommendation, 'medium' if plausible, 'low' if guessing. Low = no highlight.",
    "isOfficialSource: true only if highlightElementRef is a verified government or institutional website (.gov, .gov.in, .nhs.uk, etc.).",
=======
    '{"reply":"","highlightElementRef":"na-el-0 or null","highlightTooltip":"","taskLabel":"","elementFound":true,"checklist":[{"id":"","label":"","status":"pending|active|completed"}],"formFields":[{"elementRef":"","label":"","explanation":"","required":true,"expectedFormat":""}],"candidates":[{"ref":"","label":"","reason":""}],"estimatedTime":"","estimatedSteps":5,"customCss":"","domActions":[],"safetyNote":""}',
    "reply: clear conversational answer grounded in the current page. Keep to 2-3 sentences.",
    "highlightElementRef: ref of the ONE element the user should click or fill next. Omit/null if informational.",
    "highlightTooltip: 3-5 word instruction like 'Click here to continue.'",
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
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
<<<<<<< HEAD
  const activeElement = typeof document !== "undefined" ? getActiveContextElement() : null;
=======
  const activeElement = getActiveContextElement();
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
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

<<<<<<< HEAD
function heuristicFallback(context: PageContext, question: string, goalSession?: import("@/shared/types").GoalSession | null): TaskAssistantResult {
  const q = question.toLowerCase();
=======
function heuristicFallback(context: PageContext, question: string): TaskAssistantResult {
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
  const buttons = context.summary.buttons.filter((b) => b.label);
  const primaryButton = buttons.find((b) => /start|apply|register|continue|submit|book|next|enroll|aadhaar/i.test(b.label));
  const firstRelevant = context.elements.find((el) =>
    primaryButton ? el.label.toLowerCase() === primaryButton.label.toLowerCase() : /start|apply|register|continue|submit|enroll/i.test(el.label)
  ) ?? context.elements[0];

  const checklist: ChecklistItem[] = [];
<<<<<<< HEAD
  if (/apply|aadhaar|register|enrol/i.test(q)) {
=======
  if (/apply|aadhaar|register|enrol/i.test(question)) {
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
    checklist.push(
      { id: "1", label: "Find the registration or apply section", status: "active" },
      { id: "2", label: "Fill in your personal information", status: "pending" },
      { id: "3", label: "Upload required documents", status: "pending" },
      { id: "4", label: "Review your details", status: "pending" },
      { id: "5", label: "Submit the application", status: "pending" }
    );
  }

<<<<<<< HEAD
  const informational = /what is|what does|explain|mean|help me understand|what.s this|what is this/i.test(q);
  const asksAboutForm = /\bform\b/i.test(q);
  const asksWhatToClick = /what (should|do|can) i click|what.s next|what to click|where (should|do) i click|click next/i.test(q);
  const asksWhatToType = /help me type|how (do|should) i (type|fill|enter|write)|type (the|my|an?)\s+\w+|fill (the|this|my|an?) \w+|enter (the|my|an?) \w+/i.test(q);
  const isContinuation = /navigat|new page|page (has )?changed|just (arrived|came|navigated)|continue.*goal|what.*do.*next|next step|what should i do now|element.*not found|expected.*not found|previous step/i.test(q);
  const firstForm = context.summary.forms[0];

  // Detect if the question mentions a specific field type
  const fieldTypeMatch = q.match(/\b(email|name|phone|password|address|date|number|username|message|comment|zip|postal|city|state|country)\b/);
  const targetFieldType = fieldTypeMatch?.[1];

  // Find matching form field element if a specific field type was mentioned
  const matchingField = targetFieldType
    ? context.summary.forms.flatMap((f) => f.fields).find((f) =>
        (f.label || "").toLowerCase().includes(targetFieldType) || f.type === targetFieldType
      )
    : undefined;
  const matchingFieldElement = matchingField
    ? context.elements.find((el) => el.label.toLowerCase().includes(matchingField.label?.toLowerCase() ?? "__none__") || (matchingField.type && el.type === matchingField.type))
    : undefined;

  // Only show field hints for meaningful forms (3+ fields, not search bars).
  // Single-field forms (Gmail search, Google search, etc.) should not show REQUIRED hints.
  const isSearchOnlyForm =
    !firstForm ||
    firstForm.fields.length < 3 ||
    firstForm.fields.every((f) => f.type === "search" || f.role === "searchbox");
  const allFields = isSearchOnlyForm
    ? []
    : firstForm!.fields.slice(0, 6).map((field, i) => ({
        elementRef: context.elements[i]?.ref ?? "",
        label: field.label || `Field ${i + 1}`,
        explanation: `Enter your ${(field.label || "information").toLowerCase()} here.`,
        required: false,
        expectedFormat: field.type === "email" ? "example@email.com" : field.type === "tel" ? "e.g. +1 555 000 0000" : undefined
      }));

  const isSearchPage = /google\.[a-z.]+\/search|bing\.com\/search|duckduckgo\.com\/\?q=|yahoo\.com\/search|search\?q=/i.test(context.summary.url);
  const officialLinks = isSearchPage
    ? context.elements.filter((el) => el.href && checkOfficialUrl(el.href))
    : [];
  const isSearchScan = /\bsearch\b.*(page|result)|identify.*result|official.*result/i.test(q);

  let reply: string;
  let highlightRef: string | undefined = firstRelevant?.ref;
  let highlightTooltip: string | undefined;

  let reason: string | undefined;
  let confidence: "high" | "medium" | "low" = "medium";
  let isOfficialSource = false;

  if (isSearchPage && officialLinks.length > 0 && (isSearchScan || asksWhatToClick)) {
    const best = officialLinks[0];
    const domain = (() => { try { return new URL(best.href ?? "").hostname; } catch { return best.label; } })();
    reply = `I found an official government website (${domain}) in these search results. This is the safest and most trusted link to click.`;
    highlightRef = best.ref;
    highlightTooltip = `Official source — click to visit ${domain}.`;
    reason = `Recommended because this appears to be the official government website.`;
    confidence = "high";
    isOfficialSource = true;
  } else if (isContinuation && goalSession) {
    const activeStep = goalSession.checklist.find((s) => s.status === "active");
    const completed = goalSession.checklist.filter((s) => s.status === "completed").length;
    const total = goalSession.checklist.length;
    if (activeStep) {
      reply = `Continuing "${goalSession.goal}" (step ${completed + 1} of ${total}): ${activeStep.label}.${primaryButton ? ` I can see "${primaryButton.label}" — that may be your next action.` : " Look around this page for the next action."}`;
      highlightTooltip = primaryButton ? `Click "${primaryButton.label}" to continue.` : undefined;
      reason = primaryButton ? `This is the next required action to continue your goal.` : undefined;
      confidence = primaryButton ? "medium" : "low";
      if (confidence === "low") { highlightRef = undefined; }
    } else {
      reply = `Continuing "${goalSession.goal}". All previous steps appear complete — let me check what's available on this page.${primaryButton ? ` I see "${primaryButton.label}".` : ""}`;
      confidence = "medium";
    }
  } else if (asksWhatToClick) {
    if (primaryButton) {
      reply = `The next thing to click is "${primaryButton.label}" — that will move you forward on this page.`;
      highlightRef = firstRelevant?.ref;
      highlightTooltip = `Click "${primaryButton.label}" to continue.`;
      reason = `This is the primary action button on the page.`;
      confidence = "high";
    } else if (buttons[0]?.label) {
      reply = `I see a "${buttons[0].label}" button — try clicking that to continue.`;
      reason = `This is the most prominent interactive button found.`;
      confidence = "medium";
    } else {
      reply = `I'm not fully confident which option is correct. Please verify before continuing.`;
      highlightRef = undefined;
      confidence = "low";
    }
  } else if (asksWhatToType && targetFieldType) {
    const fieldEl = matchingFieldElement ?? context.elements.find((el) => el.type === "input" || el.type === "email" || el.type === "text");
    reply = `Look for the ${targetFieldType} field on the page and type your ${targetFieldType} there.${fieldEl ? ` I've highlighted it for you.` : ""}`;
    highlightRef = fieldEl?.ref ?? highlightRef;
    highlightTooltip = `Enter your ${targetFieldType} here.`;
    reason = fieldEl ? `This field is required for your ${targetFieldType}.` : undefined;
    confidence = fieldEl ? (matchingFieldElement ? "high" : "medium") : "low";
    if (confidence === "low") { highlightRef = undefined; }
  } else if (asksWhatToType) {
    const inputEl = context.elements.find((el) => el.type === "input" || el.type === "email" || el.type === "text" || el.type === "textarea");
    reply = firstForm
      ? `This form has ${firstForm.fields.length} field${firstForm.fields.length !== 1 ? "s" : ""} to fill in: ${firstForm.fields.slice(0, 3).map((f) => f.label || "a field").join(", ")}${firstForm.fields.length > 3 ? ", and more" : ""}. I've highlighted the first one.`
      : `I've highlighted the first input field I found — click it and start typing.`;
    highlightRef = inputEl?.ref ?? highlightRef;
    highlightTooltip = "Type here.";
    reason = inputEl ? `This is the first required field in the form.` : undefined;
    confidence = inputEl ? "medium" : "low";
    if (confidence === "low") { highlightRef = undefined; }
  } else if (informational && asksAboutForm && firstForm?.fields.length) {
    reply = `This form ("${firstForm.label || "the form on this page"}") asks for: ${firstForm.fields.map((f) => f.label || "an unlabeled field").join(", ")}. Fill these in, then look for a submit button to continue.`;
    confidence = "high";
  } else if (informational) {
    reply = `This page is "${context.summary.title}". ${context.summary.description || context.summary.textBlocks[0]?.text || "Tell me what you'd like to do and I'll guide you step by step."}`;
    confidence = "high";
  } else if (primaryButton) {
    reply = `I can see "${primaryButton.label}" on this page — that's likely your next step.`;
    highlightTooltip = `Click "${primaryButton.label}" to continue.`;
    reason = `This is the primary action button on the page.`;
    confidence = "high";
  } else {
    reply = `You're viewing "${context.summary.title}". What would you like to accomplish?`;
    confidence = firstRelevant ? "medium" : "low";
    if (confidence === "low") { highlightRef = undefined; }
  }

  return {
    reply,
    highlightElementRef: highlightRef,
    highlightTooltip,
    elementFound: !!firstRelevant,
    checklist,
    formFields: allFields,
    source: "heuristic",
    generatedAt: Date.now(),
    estimatedSteps: checklist.length || undefined,
    estimatedTime: "10-15 minutes",
    reason,
    confidence,
    isOfficialSource: isOfficialSource || undefined
=======
  const informational = /what is|what does|explain|mean|help me understand/i.test(question);
  const asksAboutForm = /\bform\b/i.test(question);
  const firstForm = context.summary.forms[0];

  return {
    reply: informational && asksAboutForm && firstForm?.fields.length
      ? `This form ("${firstForm.label || "the form on this page"}") asks for: ${firstForm.fields.map((f) => f.label || "an unlabeled field").join(", ")}. Fill these in, then look for a submit button to continue.`
      : informational
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
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
  };
}

export async function analyzeTaskWithGemini(
  request: TaskAssistantRequest,
  options?: { allowHeuristicFallback?: boolean }
): Promise<TaskAssistantResult> {
  const allowFallback = options?.allowHeuristicFallback ?? false;

  if (!request.apiKey.trim()) {
    if (allowFallback) {
<<<<<<< HEAD
      return heuristicFallback(request.context, request.question, request.goalSession);
=======
      return heuristicFallback(request.context, request.question);
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
    }
    throw new Error("AI assistant unavailable. Backend API not yet configured.");
  }

  try {
    const fullPrompt = `${systemPrompt(request.context.persona)}\n\n${userPrompt(request)}`;
    const text = await callGemini(request.apiKey, request.model, fullPrompt, {
<<<<<<< HEAD
      signal: request.signal,
      timeout: 22000,
      retries: 0,
=======
      signal: request.signal
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
    });

    const parsed = parseTaskAssistantJson(text);
    return {
      ...validateTaskAssistantResult(parsed),
      source: "gemini",
      generatedAt: Date.now()
    };
  } catch (error) {
<<<<<<< HEAD
    console.error("[NeuroAdapt] Gemini task assistant error:", error);
    if (allowFallback) {
      return heuristicFallback(request.context, request.question, request.goalSession);
=======
    if (allowFallback) {
      return heuristicFallback(request.context, request.question);
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
    }
    throw error instanceof Error ? error : new Error("Task assistant failed.");
  }
}
