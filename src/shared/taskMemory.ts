import type { ChecklistItem, TaskState } from "@/shared/types";

const STORAGE_KEY = "na-task-memory";

function loadState(): TaskState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state: TaskState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* storage full */ }
}

export function clearTaskMemory(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

export function getActiveTask(): string | null {
  return loadState()?.activeTask ?? null;
}

export function initTask(taskName: string, steps: string[]): TaskState {
  const state: TaskState = {
    activeTask: taskName,
    checklist: steps.map((label, i) => ({
      id: String(i + 1),
      label,
      status: i === 0 ? "active" : "pending"
    })),
    startedAt: Date.now(),
    lastUpdatedAt: Date.now(),
    pageUrl: window.location.href
  };
  saveState(state);
  return state;
}

export function getChecklist(): ChecklistItem[] {
  return loadState()?.checklist ?? [];
}

export function advanceChecklist(): ChecklistItem[] | null {
  const state = loadState();
  if (!state) return null;

  let advanced = false;
  for (let i = 0; i < state.checklist.length; i++) {
    if (state.checklist[i].status === "active") {
      state.checklist[i].status = "completed";
      if (i + 1 < state.checklist.length) {
        state.checklist[i + 1].status = "active";
      }
      advanced = true;
      break;
    }
  }

  if (advanced) {
    state.lastUpdatedAt = Date.now();
    saveState(state);
  }

  return state.checklist;
}

export function isTaskOnSamePage(): boolean {
  const state = loadState();
  return state?.pageUrl === window.location.href;
}
