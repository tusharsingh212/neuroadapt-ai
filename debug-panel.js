// NeuroAdapt AI — Developer Debug Panel
// Accessed only via chrome-extension://<id>/debug-panel.html — never shown to normal users.

'use strict';

// ─── View routing ────────────────────────────────────────────────────────────

const VIEWS = {
  live:    document.getElementById('view-live'),
  history: document.getElementById('view-history'),
  metrics: document.getElementById('view-metrics'),
};

function showView(name) {
  Object.entries(VIEWS).forEach(([k, el]) => { el.style.display = k === name ? '' : 'none'; });
  document.getElementById('btn-live').className    = name === 'live'    ? 'btn-primary' : 'btn-ghost';
  document.getElementById('btn-history').className = name === 'history' ? 'btn-primary' : 'btn-ghost';
  document.getElementById('btn-metrics').className = name === 'metrics' ? 'btn-primary' : 'btn-ghost';
}

document.getElementById('btn-live').addEventListener('click',    () => showView('live'));
document.getElementById('btn-history').addEventListener('click', () => { showView('history'); renderHistory(); });
document.getElementById('btn-metrics').addEventListener('click', () => { showView('metrics'); renderAggMetrics(); });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pill(text, color) {
  return `<span class="pill pill-${color}">${esc(text)}</span>`;
}

function fmtTs(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtMs(ms) {
  if (ms == null) return '—';
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function fmtPct(n, d) {
  if (!d) return '—';
  return `${Math.round((n / d) * 100)}%`;
}

// ─── Live polling ─────────────────────────────────────────────────────────────

let _liveTimer = null;

async function pollLive() {
  try {
    const state = await chrome.runtime.sendMessage({ type: 'NA_GET_STATE' });
    renderLiveState(state);
  } catch (_) {
    renderLiveState(null);
  }
}

function renderLiveState(state) {
  const dot   = document.getElementById('live-dot');
  const label = document.getElementById('live-label');
  const stateEl = document.getElementById('live-state-content');
  const stepsEl = document.getElementById('live-steps-content');

  if (!state) {
    dot.style.background = '#4a5568';
    label.textContent = 'No response';
    stateEl.innerHTML = '<p class="empty">Extension not responding.</p>';
    stepsEl.innerHTML = '';
    return;
  }

  const STATUS_COLOR = { idle: '#4a5568', navigating: '#3b82f6', waiting_for_human: '#f59e0b', complete: '#10b981', error: '#ef4444' };
  const statusColor = STATUS_COLOR[state.status] ?? '#718096';
  dot.style.background = state.status === 'navigating' ? '#3b82f6' : statusColor;
  label.textContent = state.status ?? 'unknown';

  const verRate = state.verificationTotal > 0
    ? `${state.verificationPassed}/${state.verificationTotal} (${fmtPct(state.verificationPassed, state.verificationTotal)})`
    : '—';

  stateEl.innerHTML = `
    <div class="kv"><span class="k">Status</span>       <span class="v">${pill(state.status ?? '—', state.status === 'navigating' ? 'blue' : state.status === 'complete' ? 'green' : state.status === 'error' ? 'red' : 'yellow')}</span></div>
    <div class="kv"><span class="k">Goal</span>          <span class="v">${esc(state.goal ?? '—')}</span></div>
    <div class="kv"><span class="k">Workflow</span>      <span class="v">${esc(state.workflowId ?? 'none (LLM-generated)')}</span></div>
    <div class="kv"><span class="k">Step</span>          <span class="v">${state.currentStep != null ? state.currentStep + 1 : '—'} / ${state.steps?.length ?? 0}</span></div>
    <div class="kv"><span class="k">LLM calls</span>    <span class="v">${state.llmCalls ?? 0}</span></div>
    <div class="kv"><span class="k">Verification</span> <span class="v">${verRate}</span></div>
    <div class="kv"><span class="k">Recovery used</span><span class="v">${state.recoveryUsed ? pill('yes', 'yellow') : pill('no', 'green')}</span></div>
    <div class="kv"><span class="k">Session start</span><span class="v">${fmtTs(state.startTs)}</span></div>
  `;

  const steps = state.steps ?? [];
  if (!steps.length) {
    stepsEl.innerHTML = '<p class="empty">No steps.</p>';
    return;
  }
  const cur = state.currentStep ?? -1;
  stepsEl.innerHTML = steps.map((s, i) => {
    const dotClass = i < cur ? 'dot-done' : i === cur ? 'dot-active' : 'dot-pending';
    const label = typeof s === 'string' ? s : (s.label ?? s.description ?? JSON.stringify(s));
    return `<div class="step-row"><div class="step-dot ${dotClass}"></div><div>${i + 1}. ${esc(label)}</div></div>`;
  }).join('');
}

// Start live polling when on live view
function startLivePolling() {
  pollLive();
  _liveTimer = setInterval(pollLive, 1500);
}

function stopLivePolling() {
  if (_liveTimer) { clearInterval(_liveTimer); _liveTimer = null; }
}

// Always poll while panel is open
startLivePolling();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopLivePolling(); } else { startLivePolling(); }
});

// ─── History view ─────────────────────────────────────────────────────────────

let _sessions = [];
let _selectedIdx = -1;

async function loadHistory() {
  const result = await chrome.storage.local.get('naEvalHistory').catch(() => ({}));
  _sessions = (result.naEvalHistory ?? []).slice().reverse(); // newest first
}

async function renderHistory() {
  await loadHistory();
  const listEl = document.getElementById('session-list');

  if (!_sessions.length) {
    listEl.innerHTML = '<p class="empty">No session history.</p>';
    document.getElementById('session-detail').innerHTML = '<p class="empty">No sessions yet.</p>';
    return;
  }

  listEl.innerHTML = _sessions.map((s, i) => {
    const ok = s.success;
    const ts = fmtTs(s.startTs);
    const dur = s.endTs ? fmtMs(s.endTs - s.startTs) : '?';
    return `
      <div class="session-item${i === _selectedIdx ? ' active' : ''}" data-idx="${i}">
        <div class="goal">${esc(s.goal ?? 'Unknown goal')}</div>
        <div class="meta">${ts} · ${dur} · ${ok ? pill('success', 'green') : pill('failed', 'red')} · ${s.steps?.length ?? 0} steps</div>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.session-item').forEach((el) => {
    el.addEventListener('click', () => {
      _selectedIdx = parseInt(el.dataset.idx, 10);
      renderHistory();
      renderSessionDetail(_sessions[_selectedIdx]);
    });
  });

  if (_selectedIdx >= 0 && _sessions[_selectedIdx]) {
    renderSessionDetail(_sessions[_selectedIdx]);
  }
}

function renderSessionDetail(s) {
  const el = document.getElementById('session-detail');
  if (!s) { el.innerHTML = '<p class="empty">Select a session.</p>'; return; }

  const dur     = s.endTs ? fmtMs(s.endTs - s.startTs) : '?';
  const verRate = s.verificationTotal > 0
    ? `${s.verificationPassed}/${s.verificationTotal} (${fmtPct(s.verificationPassed, s.verificationTotal)})`
    : '0/0';

  const stepsHtml = (s.steps ?? []).length ? `
    <table>
      <thead><tr><th>#</th><th>Label</th><th>Source</th><th>Top Score</th><th>Confidence</th><th>Verified</th><th>Signals</th><th>Prune</th><th>Rank</th><th>LLM</th><th>Total</th></tr></thead>
      <tbody>
        ${(s.steps).map((step, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(step.label ?? '—')}</td>
            <td>${pill(step.source ?? '?', step.source === 'llm' ? 'yellow' : step.source === 'deterministic' ? 'green' : 'blue')}</td>
            <td>${step.topScore != null ? step.topScore.toFixed(1) : '—'}</td>
            <td>${step.confident != null ? (step.confident ? pill('yes', 'green') : pill('no', 'red')) : '—'}</td>
            <td>${step.verified != null ? (step.verified ? pill('yes', 'green') : pill('no', 'red')) : '—'}</td>
            <td><div class="signals">${(step.signals ?? []).map((sig) => pill(sig, 'blue')).join('')}</div></td>
            <td>${fmtMs(step.pruneMs)}</td>
            <td>${fmtMs(step.rankMs)}</td>
            <td>${fmtMs(step.llmMs)}</td>
            <td>${fmtMs(step.totalMs)}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : '<p class="empty">No step data.</p>';

  el.innerHTML = `
    <div class="section">
      <h2>Session Overview</h2>
      <div class="kv"><span class="k">Goal</span>          <span class="v">${esc(s.goal)}</span></div>
      <div class="kv"><span class="k">Workflow</span>      <span class="v">${esc(s.workflowId ?? 'none')}</span></div>
      <div class="kv"><span class="k">Result</span>        <span class="v">${s.success ? pill('success', 'green') : pill('failed', 'red')}</span></div>
      <div class="kv"><span class="k">Duration</span>      <span class="v">${dur}</span></div>
      <div class="kv"><span class="k">Steps total</span>   <span class="v">${s.steps?.length ?? 0}</span></div>
      <div class="kv"><span class="k">LLM calls</span>    <span class="v">${s.llmCalls ?? 0}</span></div>
      <div class="kv"><span class="k">Verification</span> <span class="v">${verRate}</span></div>
      <div class="kv"><span class="k">Recovery used</span><span class="v">${s.recoveryUsed ? pill('yes', 'yellow') : pill('no', 'green')}</span></div>
      <div class="kv"><span class="k">Start</span>         <span class="v">${fmtTs(s.startTs)}</span></div>
      <div class="kv"><span class="k">End</span>           <span class="v">${fmtTs(s.endTs)}</span></div>
    </div>
    <div class="section" style="overflow-x:auto">
      <h2>Step Details</h2>
      ${stepsHtml}
    </div>`;
}

document.getElementById('btn-clear').addEventListener('click', async () => {
  if (!confirm('Delete all session history?')) return;
  await chrome.storage.local.remove('naEvalHistory').catch(() => {});
  _sessions = [];
  _selectedIdx = -1;
  renderHistory();
});

// ─── Aggregate metrics ────────────────────────────────────────────────────────

async function renderAggMetrics() {
  await loadHistory();
  const el = document.getElementById('agg-metrics');

  if (!_sessions.length) {
    el.innerHTML = '<p class="empty">No sessions yet.</p>';
    return;
  }

  const total    = _sessions.length;
  const success  = _sessions.filter((s) => s.success).length;
  const allSteps = _sessions.flatMap((s) => s.steps ?? []);

  const avg = (arr, key) => {
    const vals = arr.map((s) => s[key]).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const verifiedSteps = allSteps.filter((s) => s.verified === true).length;
  const totalVerified = allSteps.filter((s) => s.verified != null).length;

  const llmSteps  = allSteps.filter((s) => s.source === 'llm').length;
  const detSteps  = allSteps.filter((s) => s.source === 'deterministic').length;
  const wfSteps   = allSteps.filter((s) => s.source === 'workflow').length;

  const avgPrune  = avg(allSteps, 'pruneMs');
  const avgRank   = avg(allSteps, 'rankMs');
  const avgLlm    = avg(allSteps.filter((s) => s.source === 'llm'), 'llmMs');
  const avgTotal  = avg(allSteps, 'totalMs');
  const avgLlmCalls = _sessions.reduce((a, s) => a + (s.llmCalls ?? 0), 0) / total;

  el.innerHTML = `
    <div class="metric-grid">
      <div class="metric-card"><div class="val">${total}</div><div class="lbl">Total sessions</div></div>
      <div class="metric-card"><div class="val">${fmtPct(success, total)}</div><div class="lbl">Task completion</div></div>
      <div class="metric-card"><div class="val">${allSteps.length}</div><div class="lbl">Total steps</div></div>
      <div class="metric-card"><div class="val">${totalVerified > 0 ? fmtPct(verifiedSteps, totalVerified) : '—'}</div><div class="lbl">Verify success rate</div></div>
      <div class="metric-card"><div class="val">${detSteps}</div><div class="lbl">Deterministic steps</div></div>
      <div class="metric-card"><div class="val">${llmSteps}</div><div class="lbl">LLM-resolved steps</div></div>
      <div class="metric-card"><div class="val">${wfSteps}</div><div class="lbl">Workflow steps</div></div>
      <div class="metric-card"><div class="val">${avgLlmCalls.toFixed(1)}</div><div class="lbl">Avg LLM calls/task</div></div>
      <div class="metric-card"><div class="val">${fmtMs(avgPrune)}</div><div class="lbl">Avg prune time</div></div>
      <div class="metric-card"><div class="val">${fmtMs(avgRank)}</div><div class="lbl">Avg rank time</div></div>
      <div class="metric-card"><div class="val">${fmtMs(avgLlm)}</div><div class="lbl">Avg LLM time</div></div>
      <div class="metric-card"><div class="val">${fmtMs(avgTotal)}</div><div class="lbl">Avg step total</div></div>
    </div>`;
}

// ─── window.__naMetrics paste-and-parse ───────────────────────────────────────

document.getElementById('btn-parse-metrics').addEventListener('click', () => {
  const raw  = document.getElementById('metrics-paste').value.trim();
  const out  = document.getElementById('raw-metrics');
  if (!raw) { out.innerHTML = '<p class="empty">Paste JSON first.</p>'; return; }

  let data;
  try { data = JSON.parse(raw); } catch (e) {
    out.innerHTML = `<p style="color:#fca5a5">Invalid JSON: ${esc(e.message)}</p>`;
    return;
  }
  if (!Array.isArray(data)) { out.innerHTML = '<p style="color:#fca5a5">Expected a JSON array.</p>'; return; }

  if (!data.length) { out.innerHTML = '<p class="empty">Array is empty.</p>'; return; }

  out.innerHTML = `
    <div style="overflow-x:auto">
    <table>
      <thead><tr><th>#</th><th>Step</th><th>Source</th><th>Confident</th><th>Top Score</th><th>Prune ms</th><th>Rank ms</th><th>LLM ms</th><th>Total ms</th></tr></thead>
      <tbody>
        ${data.map((m, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(m.step ?? '—')}</td>
            <td>${pill(m.source ?? '?', m.source === 'llm' ? 'yellow' : m.source === 'deterministic' ? 'green' : 'blue')}</td>
            <td>${m.confident != null ? (m.confident ? pill('yes', 'green') : pill('no', 'red')) : '—'}</td>
            <td>${m.topScore != null ? Number(m.topScore).toFixed(1) : '—'}</td>
            <td>${fmtMs(m.pruneMs)}</td>
            <td>${fmtMs(m.rankMs)}</td>
            <td>${fmtMs(m.llmMs)}</td>
            <td>${fmtMs(m.totalMs)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    </div>`;
});
