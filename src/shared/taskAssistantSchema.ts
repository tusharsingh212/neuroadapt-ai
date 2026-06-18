import type { ChecklistItem, FormFieldGuide, TaskAssistantResult } from "@/shared/types";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function checklistStatus(value: unknown): ChecklistItem["status"] {
  return value === "completed" || value === "active" || value === "pending" ? value : "pending";
}

function checklistItem(value: unknown, index: number): ChecklistItem {
  const record = asRecord(value);
  return {
    id: asString(record.id, `step-${index + 1}`),
    label: asString(record.label, `Step ${index + 1}`),
    status: checklistStatus(record.status)
  };
}

function formField(value: unknown): FormFieldGuide | null {
  const record = asRecord(value);
  const label = asString(record.label);
  const explanation = asString(record.explanation);
  const elementRef = asString(record.elementRef);
  if (!label && !explanation) return null;

  return {
    elementRef,
    label: label || "Form field",
    explanation: explanation || "Fill in this field as requested.",
    required: record.required === true,
    expectedFormat: asString(record.expectedFormat) || undefined
  };
}

export function parseTaskAssistantJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Task assistant did not return JSON.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

export function validateTaskAssistantResult(value: unknown): Omit<TaskAssistantResult, "source" | "generatedAt" | "cached"> {
  const record = asRecord(value);

  return {
    reply: asString(record.reply, "I can help you navigate this page. What would you like to do?"),
    highlightElementRef: asString(record.highlightElementRef) || undefined,
    highlightTooltip: asString(record.highlightTooltip) || undefined,
    checklist: asArray(record.checklist).map(checklistItem).filter((item) => item.label).slice(0, 8),
    formFields: asArray(record.formFields).map(formField).filter((item): item is FormFieldGuide => Boolean(item)).slice(0, 12),
    walkthroughStep: asString(record.walkthroughStep) || undefined
  };
}
