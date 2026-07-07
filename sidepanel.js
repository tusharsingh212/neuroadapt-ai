/**
 * NeuroAdapt AI — Side Panel Script (Phase 4.1)
 * Renders structured step guidance from workflow metadata when available,
 * falls back to LLM explanation for non-workflow steps.
 */

console.log('[NeuroAdapt] Side panel opened.');

// ── DOM refs ──────────────────────────────────────────────────────────────
const statusDot         = document.getElementById('na-panel-status-dot');
const goalCard          = document.getElementById('na-goal-card');
const goalText          = document.getElementById('na-goal-text');
const stepProgress      = document.getElementById('na-step-progress');
const stepText          = document.getElementById('na-step-text');
const guidanceEl        = document.getElementById('na-guidance');
const guidanceInstr     = document.getElementById('na-guidance-instruction');
const guidanceWhy       = document.getElementById('na-guidance-why');
const guidanceWhyText   = document.getElementById('na-guidance-why-text');
const guidanceNext      = document.getElementById('na-guidance-next');
const guidanceNextText  = document.getElementById('na-guidance-next-text');
const highlightAgainBtn = document.getElementById('na-highlight-again-btn');
const stepsListEl       = document.getElementById('na-steps-list');
const explanationSec    = document.getElementById('na-explanation-section');
const explanationBub    = document.getElementById('na-explanation-bubble');
const fallbackSec       = document.getElementById('na-panel-fallback');
const fallbackMsgEl     = document.getElementById('na-panel-fallback-msg');
const cancelBtn         = document.getElementById('na-panel-cancel-btn');
const goalInput         = document.getElementById('na-panel-goal');
const startBtn          = document.getElementById('na-panel-start-btn');

// ── Status label map ──────────────────────────────────────────────────────
const STATUS_LABELS = {
  idle:              'Ready',
  navigating:        'Navigating',
  waiting_for_human: 'Needs your help',
  complete:          'Complete',
  error:             'Error',
};

// ── Render helpers ────────────────────────────────────────────────────────
function renderSteps(steps, currentIndex) {
  stepsListEl.innerHTML = '';
  if (!steps?.length) return;

  steps.forEach((label, i) => {
    const li = document.createElement('li');
    li.className = 'na-panel__step';
    if      (i < currentIndex)  li.dataset.state = 'done';
    else if (i === currentIndex) li.dataset.state = 'active';
    else                         li.dataset.state = 'pending';
    li.textContent = label;
    stepsListEl.appendChild(li);
  });
}

function renderState(state) {
  const {
    status,
    userGoal,
    stepsList,
    stepsMetadata,
    currentStepIndex,
    topScore,
    topLabel,
    llmExplanation,
    stepGuidance,
    fallbackPrompt,
  } = state;

  const idx     = currentStepIndex ?? 0;
  const isActive = status === 'navigating' || status === 'waiting_for_human';

  // Status dot
  statusDot.dataset.status = status;

  // Goal banner
  if (userGoal && isActive) {
    goalText.textContent = userGoal;
    goalCard.hidden = false;
  } else {
    goalCard.hidden = true;
  }

  // Step progress label and main text
  if (stepsList?.length && isActive) {
    const total = stepsList.length;
    const meta  = stepsMetadata?.[idx];
    stepProgress.textContent = `Step ${idx + 1} of ${total}`;
    // Title line: prefer structured title, else fall back to step label
    stepText.textContent = meta?.title || stepsList[idx] || '';
  } else if (status === 'complete') {
    stepProgress.textContent = 'Done';
    stepText.textContent = 'All steps completed!';
  } else {
    stepProgress.textContent = 'Current Step';
    stepText.textContent = STATUS_LABELS[status] ?? status;
  }

  // Structured guidance (workflow steps)
  if (stepGuidance?.instruction && isActive) {
    guidanceInstr.textContent = stepGuidance.instruction;

    if (stepGuidance.reason) {
      guidanceWhyText.textContent = stepGuidance.reason;
      guidanceWhy.hidden = false;
    } else {
      guidanceWhy.hidden = true;
    }

    if (stepGuidance.nextHint) {
      guidanceNextText.textContent = stepGuidance.nextHint;
      guidanceNext.hidden = false;
    } else {
      guidanceNext.hidden = true;
    }

    guidanceEl.hidden = false;
    explanationSec.hidden = true; // suppress LLM bubble when structured guidance is shown
  } else {
    guidanceEl.hidden = true;

    // LLM explanation bubble (fallback for non-workflow steps)
    if (llmExplanation) {
      explanationBub.textContent = llmExplanation;
      explanationSec.hidden = false;
    } else if (topLabel && isActive) {
      explanationBub.textContent =
        topScore >= 70
          ? `Found "${topLabel}" — ready for you to click.`
          : `Best match: "${topLabel}".`;
      explanationSec.hidden = false;
    } else {
      explanationSec.hidden = true;
    }
  }

  // Highlight Again button (only while a step is actively being navigated)
  highlightAgainBtn.hidden = !(isActive && stepsList?.length);

  // Step list
  renderSteps(stepsList, idx);

  // HITL fallback banner
  if (status === 'waiting_for_human') {
    fallbackMsgEl.textContent = fallbackPrompt ?? 'Please click the element on the page.';
    fallbackSec.hidden = false;
  } else {
    fallbackSec.hidden = true;
  }

  // Start button adapts to state
  if (status === 'navigating') {
    startBtn.textContent = 'Next Step →';
    startBtn.disabled    = false;
    goalInput.disabled   = true;
  } else if (status === 'waiting_for_human') {
    startBtn.textContent = 'Waiting…';
    startBtn.disabled    = true;
    goalInput.disabled   = true;
  } else {
    startBtn.textContent = 'Start';
    startBtn.disabled    = false;
    goalInput.disabled   = false;
  }
}

<<<<<<< HEAD
// ── Local state mirror (avoids extra NA_GET_STATE round-trips) ────────────
=======
// ── Local state mirror ────────────────────────────────────────────────────
>>>>>>> 5d80ee7cb4e0c8288b353ddaa9e8f5315739759c
let _localState = { status: 'idle' };

// ── On panel open: sync state from background ─────────────────────────────
chrome.runtime.sendMessage({ type: 'NA_GET_STATE' }, (resp) => {
  if (chrome.runtime.lastError) {
    console.warn('[NeuroAdapt] NA_GET_STATE error:', chrome.runtime.lastError.message);
    return;
  }
  if (resp?.ok) { _localState = resp.state; renderState(resp.state); }
});

// ── Live state updates ────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'NA_STATE_UPDATE') {
    _localState = message.state;
    renderState(message.state);
  }
});

// ── Start / Next button ───────────────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { console.warn('[NeuroAdapt] No active tab.'); return; }

<<<<<<< HEAD
  // Use in-memory state — no extra round-trip needed
=======
>>>>>>> 5d80ee7cb4e0c8288b353ddaa9e8f5315739759c
  if (_localState.status === 'navigating') {
    chrome.runtime.sendMessage({ type: 'NA_NEXT_STEP' });
    return;
  }

  const goal = goalInput.value.trim();
  if (!goal) { goalInput.focus(); return; }

  console.log('[NeuroAdapt] Side panel: starting goal:', goal, 'tab', tab.id);
  startBtn.disabled    = true;
  startBtn.textContent = 'Starting…';

  chrome.runtime.sendMessage(
    { type: 'NA_SET_GOAL', goal, tabId: tab.id },
    (r) => {
      startBtn.disabled = false;
      if (!r?.ok) console.error('[NeuroAdapt] NA_SET_GOAL failed:', r?.error);
    }
  );
});

// ── Cancel button ─────────────────────────────────────────────────────────
cancelBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'NA_CANCEL' });
});

// ── Highlight Again button ────────────────────────────────────────────────
highlightAgainBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'NA_HIGHLIGHT_AGAIN' });
});
