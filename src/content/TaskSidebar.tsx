import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, Pause, Play, RefreshCcw, X, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GoalSession } from "@/shared/types";
import { getSession, subscribe, startSession, pauseSession, resumeSession, restartSession, cancelSession } from "@/shared/goalSession";
import { formatTaskTime } from "@/shared/metrics";

export function TaskSidebar({ onRequestReanalysis }: { onRequestReanalysis?: () => void }): JSX.Element | null {
  const [session, setSession] = useState<GoalSession | null>(() => getSession());

  useEffect(() => {
    const unsub = subscribe((s) => setSession(s));
    return unsub;
  }, []);

  const handleStart = useCallback(() => {
    startSession();
    onRequestReanalysis?.();
  }, [onRequestReanalysis]);

  const handlePause = useCallback(() => pauseSession(), []);
  const handleResume = useCallback(() => { resumeSession(); onRequestReanalysis?.(); }, [onRequestReanalysis]);
  const handleRestart = useCallback(() => { restartSession(); onRequestReanalysis?.(); }, [onRequestReanalysis]);
  const handleCancel = useCallback(() => cancelSession(), []);

  if (!session || session.status === "cancelled") return null;

  const completed = session.checklist.filter((i) => i.status === "completed").length;
  const total = session.checklist.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const elapsed = Math.round((Date.now() - session.startedAt) / 1000);

  const isPreview = session.status === "preview";
  const isActive = session.status === "active";
  const isPaused = session.status === "paused";
  const isComplete = session.status === "completed";

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="na-sidebar"
        role="complementary"
        aria-label="Task progress sidebar"
      >
        <div className="na-sidebar-inner">
          <div className="na-sidebar-head">
            <Sparkles size={14} />
            <span>Current Goal</span>
            <button type="button" className="na-sidebar-close" onClick={handleCancel} aria-label="Cancel task">
              <X size={14} />
            </button>
          </div>

          <div className="na-sidebar-goal">{session.goal}</div>

          {isComplete ? (
            <div className="na-sidebar-complete">
              <CheckCircle2 size={20} />
              <span>Task Complete!</span>
            </div>
          ) : null}

          <div className="na-sidebar-stats">
            <span className="na-sidebar-stat">{completed}/{total} steps</span>
            <span className="na-sidebar-stat">{formatTaskTime(elapsed)} elapsed</span>
            {session.estimatedTimeLabel ? (
              <span className="na-sidebar-stat">Est. {session.estimatedTimeLabel}</span>
            ) : null}
          </div>

          <div className="na-sidebar-progress">
            <div className="na-sidebar-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <ol className="na-sidebar-list">
            {session.checklist.map((item) => (
              <li
                key={item.id}
                className={`na-sidebar-item na-sidebar-${item.status}`}
                aria-current={item.status === "active" ? "step" : undefined}
              >
                {item.status === "completed" ? (
                  <CheckCircle2 size={13} className="na-sidebar-icon na-sidebar-done" />
                ) : item.status === "active" ? (
                  <Circle size={13} className="na-sidebar-icon na-sidebar-active" />
                ) : (
                  <Circle size={13} className="na-sidebar-icon na-sidebar-pending" />
                )}
                <span>{item.label}</span>
              </li>
            ))}
          </ol>

          <div className="na-sidebar-actions">
            {isPreview ? (
              <button type="button" className="na-button na-primary" onClick={handleStart} style={{ width: "100%" }}>
                Start Guided Mode
              </button>
            ) : null}

            {isActive ? (
              <button type="button" className="na-btn-icon" onClick={handlePause} aria-label="Pause">
                <Pause size={14} /> Pause
              </button>
            ) : null}

            {isPaused ? (
              <button type="button" className="na-btn-icon" onClick={handleResume} aria-label="Resume">
                <Play size={14} /> Resume
              </button>
            ) : null}

            {isActive || isPaused ? (
              <button type="button" className="na-btn-icon na-btn-secondary" onClick={handleRestart} aria-label="Restart">
                <RefreshCcw size={14} /> Restart
              </button>
            ) : null}

            {isActive || isPaused ? (
              <button type="button" className="na-btn-icon na-btn-danger" onClick={handleCancel} aria-label="Cancel">
                <X size={14} /> Cancel
              </button>
            ) : null}

            {isComplete ? (
              <button type="button" className="na-btn-icon na-btn-danger" onClick={handleCancel} aria-label="Dismiss">
                <X size={14} /> Dismiss
              </button>
            ) : null}
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
