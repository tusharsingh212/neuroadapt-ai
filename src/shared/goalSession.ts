import type { ChecklistItem, GoalSession, GoalSessionStatus } from "@/shared/types";

const STORAGE_KEY = "na-goal-session";
const listeners = new Set<(session: GoalSession | null) => void>();

function loadRaw(): GoalSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveRaw(session: GoalSession): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch { }
}

function notify(session: GoalSession | null): void {
  listeners.forEach((fn) => fn(session));
}

export function getSession(): GoalSession | null {
  return loadRaw();
}

export function subscribe(fn: (session: GoalSession | null) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function initGoalSession(
  goal: string,
  steps: string[],
  estimatedTime?: string,
  estimatedSteps?: number
): GoalSession {
  const session: GoalSession = {
    id: `goal-${Date.now()}`,
    goal,
    status: "preview",
    checklist: steps.map((label, i) => ({
      id: String(i + 1),
      label,
      status: i === 0 ? "active" as const : "pending" as const
    })),
    startedAt: Date.now(),
    lastUpdatedAt: Date.now(),
    confidence: 0.85,
    estimatedSteps: estimatedSteps ?? steps.length,
    estimatedTimeLabel: estimatedTime ?? "10–15 minutes",
    pageUrl: window.location.href
  };
  saveRaw(session);
  notify(session);
  return session;
}

export function startSession(): GoalSession | null {
  const session = loadRaw();
  if (!session || session.status !== "preview") return session;
  session.status = "active";
  session.lastUpdatedAt = Date.now();
  saveRaw(session);
  notify(session);
  return session;
}

export function pauseSession(): GoalSession | null {
  const session = loadRaw();
  if (!session || session.status !== "active") return session;
  session.status = "paused";
  session.lastUpdatedAt = Date.now();
  saveRaw(session);
  notify(session);
  return session;
}

export function resumeSession(): GoalSession | null {
  const session = loadRaw();
  if (!session || session.status !== "paused") return session;
  session.status = "active";
  session.lastUpdatedAt = Date.now();
  saveRaw(session);
  notify(session);
  return session;
}

export function restartSession(): GoalSession | null {
  const session = loadRaw();
  if (!session) return null;
  session.status = "active";
  session.checklist = session.checklist.map((item, i) => ({
    ...item,
    status: i === 0 ? "active" as const : "pending" as const
  }));
  session.confidence = 0.85;
  session.lastUpdatedAt = Date.now();
  saveRaw(session);
  notify(session);
  return session;
}

export function cancelSession(): void {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { }
  notify(null);
}

export function completeSession(): GoalSession | null {
  const session = loadRaw();
  if (!session) return null;
  session.status = "completed";
  session.checklist = session.checklist.map((item) => ({ ...item, status: "completed" as const }));
  session.confidence = 1;
  session.lastUpdatedAt = Date.now();
  saveRaw(session);
  notify(session);
  return session;
}

export function advanceChecklist(): ChecklistItem[] | null {
  const session = loadRaw();
  if (!session) return null;
  for (let i = 0; i < session.checklist.length; i++) {
    if (session.checklist[i].status === "active") {
      session.checklist[i] = { ...session.checklist[i], status: "completed" };
      if (i + 1 < session.checklist.length) {
        session.checklist[i + 1] = { ...session.checklist[i + 1], status: "active" };
      }
      if (i + 1 >= session.checklist.length) {
        session.status = "completed";
        session.confidence = 1;
      }
      session.confidence = Math.min(1, session.confidence + 0.03);
      session.lastUpdatedAt = Date.now();
      saveRaw(session);
      notify(session);
      return session.checklist;
    }
  }
  return session.checklist;
}

export function updateChecklist(items: ChecklistItem[]): void {
  const session = loadRaw();
  if (!session) return;
  session.checklist = items;
  if (items.every((i) => i.status === "completed")) {
    session.status = "completed";
    session.confidence = 1;
  }
  session.lastUpdatedAt = Date.now();
  saveRaw(session);
  notify(session);
}

export function isActive(): boolean {
  const session = loadRaw();
  return session?.status === "active" || session?.status === "preview";
}

export function isOnSamePage(): boolean {
  const session = loadRaw();
  return session?.pageUrl === window.location.href;
}
<<<<<<< HEAD

export function updateSessionUrl(url: string): void {
  const session = loadRaw();
  if (!session) return;
  session.pageUrl = url;
  session.lastUpdatedAt = Date.now();
  saveRaw(session);
}
=======
>>>>>>> 7ecace2cdad4876ae7c753f95748df15ab821191
