/**
 * tool-utils.js — Shared utilities for AI for Social Impact tools
 * Loaded by all tool pages via <script src="/tool-utils.js">
 */

/* ── Constants ── */
const TOOL_WORKER_URL    = 'https://ask-panos.panagiotis-kokmotoss.workers.dev/api/v1/tool';
const TOOL_STREAM_URL    = 'https://ask-panos.panagiotis-kokmotoss.workers.dev/api/v1/stream';
const TOOL_DEEP_URL      = 'https://ask-panos.panagiotis-kokmotoss.workers.dev/api/v2/tool';
const TOOL_NOTIFY_WORKER = 'https://ask-panos.panagiotis-kokmotoss.workers.dev/notify';
const TOOL_NOTIFY_SECRET = 'panos-notify-2026-xyz';
const TOOL_PROMPT_VERSION = 2; // bump when system prompts change significantly

/* ── Related tools map ── */
const _RELATED_TOOLS = {
  '/what-would-x-do.html': [
    { url: '/why-should-i-give.html',         icon: '❤️',  name: '"Why Should I Give?"',    chip: 'Donors',     cls: 'tuc-d' },
    { url: '/charity-comparison-engine.html', icon: '⚖️',  name: 'Charity Comparison',      chip: 'Donors',     cls: 'tuc-d' },
    { url: '/first-time-donor-coach.html',    icon: '🧭',  name: 'First-Time Donor Coach',  chip: 'Donors',     cls: 'tuc-d' },
  ],
  '/why-should-i-give.html': [
    { url: '/what-would-x-do.html',           icon: '💸',  name: '"What Would $X Do?"',     chip: 'Donors',     cls: 'tuc-d' },
    { url: '/first-time-donor-coach.html',    icon: '🧭',  name: 'First-Time Donor Coach',  chip: 'Donors',     cls: 'tuc-d' },
    { url: '/charity-comparison-engine.html', icon: '⚖️',  name: 'Charity Comparison',      chip: 'Donors',     cls: 'tuc-d' },
  ],
  '/first-time-donor-coach.html': [
    { url: '/why-should-i-give.html',         icon: '❤️',  name: '"Why Should I Give?"',    chip: 'Donors',     cls: 'tuc-d' },
    { url: '/what-would-x-do.html',           icon: '💸',  name: '"What Would $X Do?"',     chip: 'Donors',     cls: 'tuc-d' },
    { url: '/charity-comparison-engine.html', icon: '⚖️',  name: 'Charity Comparison',      chip: 'Donors',     cls: 'tuc-d' },
  ],
  '/charity-comparison-engine.html': [
    { url: '/nonprofit-health-checker.html',  icon: '🔍',  name: 'Nonprofit Health Checker',chip: 'Donors',     cls: 'tuc-d' },
    { url: '/scam-nonprofit-detector.html',   icon: '🚨',  name: 'Scam Detector',           chip: 'Donors',     cls: 'tuc-d' },
    { url: '/what-would-x-do.html',           icon: '💸',  name: '"What Would $X Do?"',     chip: 'Donors',     cls: 'tuc-d' },
  ],
  '/nonprofit-health-checker.html': [
    { url: '/scam-nonprofit-detector.html',   icon: '🚨',  name: 'Scam Detector',           chip: 'Donors',     cls: 'tuc-d' },
    { url: '/charity-comparison-engine.html', icon: '⚖️',  name: 'Charity Comparison',      chip: 'Donors',     cls: 'tuc-d' },
    { url: '/first-time-donor-coach.html',    icon: '🧭',  name: 'First-Time Donor Coach',  chip: 'Donors',     cls: 'tuc-d' },
  ],
  '/scam-nonprofit-detector.html': [
    { url: '/nonprofit-health-checker.html',  icon: '🔍',  name: 'Nonprofit Health Checker',chip: 'Donors',     cls: 'tuc-d' },
    { url: '/charity-comparison-engine.html', icon: '⚖️',  name: 'Charity Comparison',      chip: 'Donors',     cls: 'tuc-d' },
    { url: '/first-time-donor-coach.html',    icon: '🧭',  name: 'First-Time Donor Coach',  chip: 'Donors',     cls: 'tuc-d' },
  ],
  '/volunteer-match.html': [
    { url: '/what-can-i-donate.html',         icon: '📦',  name: '"What Can I Donate?"',    chip: 'Donors',     cls: 'tuc-v' },
    { url: '/community-needs-map.html',       icon: '🗺️', name: 'Community Needs Map',     chip: 'Nonprofits', cls: 'tuc-n' },
    { url: '/why-should-i-give.html',         icon: '❤️',  name: '"Why Should I Give?"',    chip: 'Donors',     cls: 'tuc-d' },
  ],
  '/what-can-i-donate.html': [
    { url: '/volunteer-match.html',           icon: '🤝',  name: 'Volunteer Match',         chip: 'Volunteers', cls: 'tuc-v' },
    { url: '/first-time-donor-coach.html',    icon: '🧭',  name: 'First-Time Donor Coach',  chip: 'Donors',     cls: 'tuc-d' },
    { url: '/neighborhood-giving-map.html',   icon: '🏙️', name: 'Neighborhood Giving Map', chip: 'Nonprofits', cls: 'tuc-n' },
  ],
  '/impact-story-generator.html': [
    { url: '/community-needs-map.html',       icon: '🗺️', name: 'Community Needs Map',     chip: 'Nonprofits', cls: 'tuc-n' },
    { url: '/neighborhood-giving-map.html',   icon: '🏙️', name: 'Neighborhood Giving Map', chip: 'Nonprofits', cls: 'tuc-n' },
    { url: '/volunteer-match.html',           icon: '🤝',  name: 'Volunteer Match',         chip: 'Volunteers', cls: 'tuc-v' },
  ],
  '/community-needs-map.html': [
    { url: '/neighborhood-giving-map.html',   icon: '🏙️', name: 'Neighborhood Giving Map', chip: 'Nonprofits', cls: 'tuc-n' },
    { url: '/impact-story-generator.html',    icon: '✍️',  name: 'Impact Story Generator',  chip: 'Nonprofits', cls: 'tuc-n' },
    { url: '/volunteer-match.html',           icon: '🤝',  name: 'Volunteer Match',         chip: 'Volunteers', cls: 'tuc-v' },
  ],
  '/neighborhood-giving-map.html': [
    { url: '/community-needs-map.html',       icon: '🗺️', name: 'Community Needs Map',     chip: 'Nonprofits', cls: 'tuc-n' },
    { url: '/charity-comparison-engine.html', icon: '⚖️',  name: 'Charity Comparison',      chip: 'Donors',     cls: 'tuc-d' },
    { url: '/impact-story-generator.html',    icon: '✍️',  name: 'Impact Story Generator',  chip: 'Nonprofits', cls: 'tuc-n' },
  ],
};

/* ── Usage counter seeds ── */
const _USAGE_SEEDS = {
  '/what-would-x-do.html':           2847,
  '/why-should-i-give.html':         1923,
  '/first-time-donor-coach.html':    1456,
  '/charity-comparison-engine.html': 1289,
  '/nonprofit-health-checker.html':  1034,
  '/scam-nonprofit-detector.html':    978,
  '/volunteer-match.html':           1102,
  '/what-can-i-donate.html':          834,
  '/impact-story-generator.html':     672,
  '/community-needs-map.html':        589,
  '/neighborhood-giving-map.html':    543,
};

/* ── Loading messages ── */
const _DEFAULT_LOADING_MSGS = [
  'Analyzing your inputs…',
  'Building your personalized response…',
  'Connecting the dots…',
  'Almost there…',
];
let _loadingMsgTimer = null;

function startLoadingMessages(customMsgs) {
  const el = document.getElementById('loadingText');
  if (!el) return;
  const msgs = customMsgs || _DEFAULT_LOADING_MSGS;
  let i = 0;
  el.textContent = msgs[0];
  clearInterval(_loadingMsgTimer);
  _loadingMsgTimer = setInterval(() => {
    i = (i + 1) % msgs.length;
    el.style.opacity = '0';
    setTimeout(() => { el.textContent = msgs[i]; el.style.opacity = '1'; }, 180);
  }, 2200);
}

function stopLoadingMessages() {
  clearInterval(_loadingMsgTimer);
  _loadingMsgTimer = null;
}

/* ── Core API ── */
async function callWorker(systemPrompt, userMessage) {
  // Use streaming endpoint — progressively renders result body in real-time
  let res;
  try {
    res = await fetch(TOOL_STREAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, userMessage }),
    });
  } catch {
    // Network error — fall back to non-streaming
    return _callWorkerFallback(systemPrompt, userMessage);
  }

  if (res.status === 429) {
    _showRateLimitError();
    const err = new Error('Rate limit exceeded');
    err._shown = true;
    throw err;
  }
  if (!res.ok) throw new Error(`Server error: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let firstChunk = true;
  let pendingRender = false;

  const resultBody = document.getElementById('resultBody');
  const resultEl   = document.getElementById('result');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;

    if (firstChunk) {
      firstChunk = false;
      // Hide loading state as soon as text starts arriving
      _removeLoadingSkeleton();
      stopLoadingMessages();
      if (resultEl && resultBody) {
        resultEl.classList.add('visible', 'tool-streaming');
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // Throttle DOM updates to animation frames
    if (resultBody && !pendingRender) {
      pendingRender = true;
      requestAnimationFrame(() => {
        resultBody.innerHTML = formatMarkdown(fullText);
        pendingRender = false;
      });
    }
  }

  // Final render — remove streaming cursor class
  if (resultBody) resultBody.innerHTML = formatMarkdown(fullText);
  if (resultEl) resultEl.classList.remove('tool-streaming');

  // Save for offline restoration
  if (fullText && resultBody) {
    _saveLastResultOffline(fullText, resultBody.innerHTML);
  }

  return fullText;
}

async function _callWorkerFallback(systemPrompt, userMessage) {
  const res = await fetch(TOOL_WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userMessage, promptVersion: TOOL_PROMPT_VERSION }),
  });
  if (res.status === 429) {
    _showRateLimitError();
    const err = new Error('Rate limit exceeded');
    err._shown = true;
    throw err;
  }
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

function _showRateLimitError() {
  let secs = 30;
  const _update = () => {
    showError(`You've been using this a lot! Please wait ${secs}s before trying again, or email panagiotis.kokmotoss@gmail.com directly.`);
  };
  _update();
  const _timer = setInterval(() => {
    secs--;
    if (secs <= 0) {
      clearInterval(_timer);
      hideError();
    } else {
      _update();
    }
  }, 1000);
}

function formatMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function notifyToolUsed(toolName) {
  /* Increment local counter */
  const key = 'tuc_' + window.location.pathname.replace(/[^a-z0-9]/gi, '_');
  let newCount = 1;
  try {
    const n = parseInt(localStorage.getItem(key) || '0', 10);
    newCount = n + 1;
    localStorage.setItem(key, newCount);
  } catch {}
  _renderUsageCount();

  /* Milestone toast */
  if ([1, 5, 10, 25].includes(newCount)) _showMilestoneToast(newCount, toolName);

  /* Fire-and-forget notification */
  if (!TOOL_NOTIFY_SECRET) return;
  fetch(TOOL_NOTIFY_WORKER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: TOOL_NOTIFY_SECRET, event: 'AI Tool Used', data: { tool: toolName } }),
  }).catch(() => {});
}

function _showMilestoneToast(count, toolName) {
  const msgs = {
    1:  { text: 'First use! Welcome to AI for Social Impact 🎉', color: '#3b6ef8' },
    5:  { text: 'You\'ve used this 5 times! Sharing helps nonprofits find this tool 🙌', color: '#7c3aed' },
    10: { text: '10 uses! You\'re a power user. Tell a friend? 🚀', color: '#059669' },
    25: { text: '25 uses! You\'re an impact champion 🏆', color: '#d97706' },
  };
  const m = msgs[count];
  if (!m) return;
  const toast = document.createElement('div');
  toast.className = 'tool-toast';
  toast.style.cssText = `--toast-color:${m.color}`;
  toast.innerHTML = `<span class="tool-toast-text">${m.text}</span>
    <button class="tool-toast-close" aria-label="Dismiss">✕</button>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  const close = () => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 320);
  };
  toast.querySelector('.tool-toast-close').addEventListener('click', close);
  setTimeout(close, 5000);
}

/* ── Standard UI helpers (complex tools override with local versions) ── */
function setLoading(on) {
  const btn       = document.getElementById('submitBtn');
  const loadingEl = document.getElementById('loading');
  if (btn) btn.disabled = on;
  if (loadingEl) loadingEl.classList.toggle('visible', on);

  /* Progress bar */
  let pb = document.getElementById('_tpb');
  if (on) {
    if (!pb && loadingEl) {
      pb = document.createElement('div');
      pb.id = '_tpb';
      pb.className = 'tool-progress-bar';
      pb.innerHTML = '<div class="tool-progress-fill" id="_tpbFill"></div>';
      loadingEl.appendChild(pb);
    }
    if (pb) {
      const fill = pb.querySelector('.tool-progress-fill');
      fill.style.transition = 'none';
      fill.style.width = '0%';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fill.style.transition = 'width 9s cubic-bezier(0.1,0.4,0.2,1)';
        fill.style.width = '88%';
      }));
    }
  } else {
    if (pb) {
      const fill = pb.querySelector('.tool-progress-fill');
      fill.style.transition = 'width 0.25s ease';
      fill.style.width = '100%';
      setTimeout(() => { pb.remove(); }, 320);
    }
  }

  const hasText = !!document.getElementById('loadingText');
  if (on && hasText) startLoadingMessages();
  else if (!on) stopLoadingMessages();
  if (on) _showLoadingSkeleton();
  else _removeLoadingSkeleton();
}

function showError(msg) {
  const el = document.getElementById('errorBox');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

function hideError() {
  const el = document.getElementById('errorBox');
  if (el) el.classList.remove('visible');
}

function showResult(text) {
  const result     = document.getElementById('result');
  const resultBody = document.getElementById('resultBody');
  if (!result || !resultBody) return;
  // If streaming already rendered the content, just ensure it's visible
  if (!result.classList.contains('visible')) {
    resultBody.innerHTML = formatMarkdown(text);
    result.classList.add('visible');
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    // Streaming rendered it; do a clean final render if needed
    resultBody.innerHTML = formatMarkdown(text);
  }
  result.classList.remove('tool-streaming');
  _removeLoadingSkeleton();
  /* Inject extras after each result show */
  setTimeout(() => {
    _injectResultExtras(text);
    _saveToHistory(text);
    _renderHistoryBtn();
  }, 80);
}

/* ── Loading skeleton ── */
function _showLoadingSkeleton() {
  let sk = document.getElementById('_loadSkeleton');
  if (sk) return;
  sk = document.createElement('div');
  sk.id = '_loadSkeleton';
  sk.className = 'tool-skeleton';
  sk.innerHTML = `
    <div class="skel-line skel-h"></div>
    <div class="skel-line skel-full"></div>
    <div class="skel-line skel-lg"></div>
    <div class="skel-line skel-md"></div>
    <div class="skel-line skel-full"></div>
    <div class="skel-line skel-sm"></div>`;
  const loading = document.getElementById('loading');
  if (loading) loading.insertAdjacentElement('afterend', sk);
}
function _removeLoadingSkeleton() {
  const sk = document.getElementById('_loadSkeleton');
  if (sk) sk.remove();
}

/* ── All extras injected once per result show ── */
function _injectResultExtras(text) {
  _injectRating();
  _injectDownloadBtn();
  _injectPrintBtn();
  _injectShareCard();
  _injectGoDeeperBtn();
  _injectAskAbout();
  _injectConfidenceBadge(text);
  _injectRefineInput();
  _injectFollowUpChat();
  _injectImpactCalculator();
  _injectFreshnessBadge();
  _injectDisclaimer();
  _injectSourceLinks();
  _injectExplainTooltips();
  _injectJourneyCTA(text);
  _injectEmailCapture();
}

function hideResult() {
  const el = document.getElementById('result');
  if (el) el.classList.remove('visible');
}

/* ── Copy button ── */
function initCopyBtn() {
  const copyBtn    = document.getElementById('copyBtn');
  const resultBody = document.getElementById('resultBody');
  if (!copyBtn || !resultBody) return;
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(resultBody.textContent).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
    });
  });
}

/* ── Tab switcher ── */
function initTabSwitcher() {
  document.querySelectorAll('.tool-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tool-tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById('panel-' + tab.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });
}

/* ── Example chips ── */
function initExampleChips() {
  document.querySelectorAll('.tool-example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      /* Fill form fields from data-fill-* attributes */
      Object.keys(chip.dataset).forEach(key => {
        if (!key.startsWith('fill')) return;
        /* dataset converts data-fill-org-name → fillOrgName; reverse to orgName */
        const raw = key.slice(4); /* strip 'fill' */
        const fieldId = raw.charAt(0).toLowerCase() + raw.slice(1);
        const el = document.getElementById(fieldId);
        if (el) el.value = chip.dataset[key];
      });
      /* Active state */
      document.querySelectorAll('.tool-example-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      /* Scroll toward submit */
      const submit = document.getElementById('submitBtn');
      if (submit) submit.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

/* ── Try-another button ── */
function initTryAnother() {
  const btn = document.getElementById('tryAnotherBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    hideResult();
    hideError();
    const form = document.getElementById('toolForm');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        const first = form.querySelector('input[type="text"], input:not([type]), textarea');
        if (first) first.focus();
      }, 420);
    }
  });
}

/* ── Share buttons ── */
function initShareBtns() {
  const xBtn    = document.getElementById('shareXBtn');
  const linkBtn = document.getElementById('shareLinkBtn');

  if (xBtn) {
    xBtn.addEventListener('click', () => {
      const title = document.querySelector('h1.tool-title')?.textContent?.trim() || document.title;
      const url   = window.location.href;
      const text  = `Just tried "${title}" — free AI tool for social impact by @panoskokmotoss`;
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        '_blank', 'noopener,width=600,height=420'
      );
    });
  }

  if (linkBtn) {
    const _linkIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`;
    const _checkIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>`;
    linkBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        linkBtn.innerHTML = _checkIcon + ' Copied!';
        setTimeout(() => { linkBtn.innerHTML = _linkIcon + ' Copy link'; }, 2200);
      });
    });
  }

  /* Auto-inject WhatsApp share button */
  const shareGroup = document.querySelector('.tool-share-group');
  if (shareGroup && !shareGroup.querySelector('#shareWABtn')) {
    const waBtn = document.createElement('button');
    waBtn.id = 'shareWABtn';
    waBtn.className = 'tool-share-wa';
    waBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M5.077 19.617A11.965 11.965 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10a11.965 11.965 0 01-5.617-1.383L2 22l2.078-4.383z"/></svg> WhatsApp`;
    waBtn.addEventListener('click', () => {
      const title = document.querySelector('h1.tool-title')?.textContent?.trim() || document.title;
      const url   = window.location.href;
      window.open(`https://wa.me/?text=${encodeURIComponent('Just used this free AI tool for social impact: ' + title + ' — ' + url)}`, '_blank', 'noopener');
    });
    shareGroup.insertBefore(waBtn, linkBtn);
  }
}

/* ── Usage counter (render) ── */
function _renderUsageCount() {
  const el = document.getElementById('toolUsageCount');
  if (!el) return;
  const path  = window.location.pathname;
  const seed  = _USAGE_SEEDS[path] || 500;
  const key   = 'tuc_' + path.replace(/[^a-z0-9]/gi, '_');
  const local = parseInt(localStorage.getItem(key) || '0', 10);
  const total = seed + local;
  const fmt   = total >= 10000
    ? Math.round(total / 1000) + 'K'
    : total.toLocaleString();
  el.innerHTML = `<span class="tuc-icon">✓</span> Used <strong>${fmt} times</strong> by donors &amp; changemakers`;
}

function initUsageCounter() { _renderUsageCount(); }

/* ── Related tools (auto-inject) ── */
function initRelatedTools() {
  const wrap = document.getElementById('toolRelated');
  if (!wrap) return;
  const items = _RELATED_TOOLS[window.location.pathname];
  if (!items || !items.length) return;
  wrap.innerHTML = `
    <div class="trel-inner">
      <span class="trel-label">Also try</span>
      <div class="trel-grid">
        ${items.map(t => `
          <a href="${t.url}" class="trel-card">
            <span class="trel-icon">${t.icon}</span>
            <span class="trel-name">${t.name}</span>
            <span class="trel-chip ${t.cls}">${t.chip}</span>
          </a>`).join('')}
      </div>
    </div>`;
}

/* ── Embed widget (auto-inject) ── */
function initEmbed() {
  const wrap = document.getElementById('toolEmbed');
  if (!wrap) return;
  const url = window.location.origin + window.location.pathname;

  const platforms = [
    {
      id: 'html',
      label: 'Custom HTML',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>`,
      code: `<iframe src="${url}" width="100%" height="700" frameborder="0" loading="lazy" style="border-radius:12px;border:1px solid #eee"></iframe>`,
      instruction: 'Paste anywhere in your HTML page.',
    },
    {
      id: 'wp',
      label: 'WordPress',
      icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM3.5 12c0-1.15.22-2.25.61-3.26L7.86 19.6A8.51 8.51 0 0 1 3.5 12zm8.5 8.5c-.78 0-1.53-.11-2.24-.31l2.38-6.9 2.44 6.68c.02.04.04.08.06.11A8.54 8.54 0 0 1 12 20.5zm1.17-12.45l2.03 6.07-2.84.08-.06-.18-1.82-5.19c.46-.02.9-.05 1.35-.08.48-.03.94-.08 1.34-.7zm1.41 8.33l2.44-7.08c.38-.97.51-1.74.51-2.43 0-.25-.02-.47-.05-.68A8.51 8.51 0 0 1 20.5 12a8.5 8.5 0 0 1-5.92 8.38z"/></svg>`,
      code: `<iframe src="${url}" width="100%" height="700" frameborder="0" loading="lazy" style="border-radius:12px;border:1px solid #eee"></iframe>`,
      instruction: 'In the WordPress editor, add a <strong>Custom HTML</strong> block and paste the code.',
    },
    {
      id: 'wix',
      label: 'Wix',
      icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M21 5H3c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 11l-5-5 1.4-1.4L12 13.2l7.6-7.6L21 7l-9 9z"/></svg>`,
      code: `<iframe src="${url}" width="100%" height="700" frameborder="0" loading="lazy" style="border-radius:12px;border:1px solid #eee"></iframe>`,
      instruction: 'In Wix Editor, add an <strong>Embed &gt; HTML iframe</strong> element, then paste the code.',
    },
    {
      id: 'webflow',
      label: 'Webflow',
      icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M17.114 0S13.8 7.116 10.097 9.68H4.743L3 15.998h4.057l-1.828 8.002S15.22 12.587 19.714 7.988h-5.23L17.113 0z"/></svg>`,
      code: `<iframe src="${url}" width="100%" height="700" frameborder="0" loading="lazy" style="border-radius:12px;border:1px solid #eee"></iframe>`,
      instruction: 'In Webflow, add an <strong>HTML Embed</strong> element from the Add panel (+), then paste the code.',
    },
  ];

  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  wrap.innerHTML = `
    <button class="temb-toggle" id="_embToggle">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>
      Embed this tool on your site
    </button>
    <div class="temb-body" id="_embBody">
      <p class="temb-desc">Add this free tool to your nonprofit website — no account needed.</p>
      <div class="temb-tabs" id="_embTabs">
        ${platforms.map((p, i) => `
          <button class="temb-tab${i === 0 ? ' active' : ''}" data-tab="${p.id}">
            ${p.icon} ${p.label}
          </button>`).join('')}
      </div>
      ${platforms.map((p, i) => `
        <div class="temb-tab-panel${i === 0 ? ' active' : ''}" id="_embPanel_${p.id}">
          <p class="temb-instruction">${p.instruction}</p>
          <div class="temb-code"><code id="_embCode_${p.id}">${esc(p.code)}</code></div>
          <button class="temb-copy" data-platform="${p.id}">Copy code</button>
        </div>`).join('')}
    </div>`;

  document.getElementById('_embToggle').addEventListener('click', function () {
    const body = document.getElementById('_embBody');
    const open = body.classList.toggle('visible');
    this.classList.toggle('open', open);
  });

  // Tab switching
  document.getElementById('_embTabs').addEventListener('click', function(e) {
    const btn = e.target.closest('.temb-tab');
    if (!btn) return;
    const tab = btn.dataset.tab;
    wrap.querySelectorAll('.temb-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    wrap.querySelectorAll('.temb-tab-panel').forEach(p => p.classList.toggle('active', p.id === `_embPanel_${tab}`));
  });

  // Copy buttons
  wrap.addEventListener('click', function(e) {
    const btn = e.target.closest('.temb-copy');
    if (!btn) return;
    const pid = btn.dataset.platform;
    const platform = platforms.find(p => p.id === pid);
    if (!platform) return;
    navigator.clipboard.writeText(platform.code).then(() => {
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy code'; }, 2200);
    });
  });
}

/* ── Confidence disclaimer ── */
function _injectDisclaimer() {
  const result = document.getElementById('result');
  if (!result || result.querySelector('._disclaimer')) return;
  const p = document.createElement('p');
  p.className = 'tool-disclaimer _disclaimer';
  p.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> AI-generated analysis. Always verify with official sources before making giving decisions.`;
  const body = result.querySelector('.tool-result-body');
  if (body) body.insertAdjacentElement('afterend', p);
}

/* ── Refine result ── */
function _injectRefineInput() {
  const result = document.getElementById('result');
  if (!result || result.querySelector('#_refineWrap')) return;
  const wrap = document.createElement('div');
  wrap.id = '_refineWrap';
  wrap.className = 'tool-refine';
  wrap.innerHTML = `
    <p class="tool-refine-label">Want to adjust anything?</p>
    <div class="tool-refine-row">
      <input class="tool-refine-input" id="_refineInput" type="text"
        placeholder="e.g. make it shorter, focus on climate orgs, add a step about tax deductions…"
        autocomplete="off" />
      <button class="tool-refine-btn" id="_refineBtn">Refine →</button>
    </div>`;
  const actions = result.querySelector('.tool-result-actions');
  if (actions) result.insertBefore(wrap, actions);
  else result.appendChild(wrap);

  document.getElementById('_refineBtn').addEventListener('click', async function() {
    const instruction = document.getElementById('_refineInput').value.trim();
    if (!instruction) return;
    const body = document.getElementById('resultBody');
    if (!body) return;
    // Save current state for undo (feature 6)
    _lastResultHTML = body.innerHTML;
    _lastResultText = body.innerText;
    const originalText = body.innerText;
    const sysPrompt = `You are a helpful assistant. The user has an AI-generated result and wants to refine it based on their instruction. Keep the same format and structure unless told otherwise. Return only the refined result, no meta-commentary.`;
    const userMsg = `Original result:\n${originalText}\n\nRefinement instruction: ${instruction}`;
    this.disabled = true;
    this.textContent = 'Refining…';
    setLoading(true);
    hideResult();
    try {
      const text = await callWorker(sysPrompt, userMsg);
      showResult(text);
      document.getElementById('_refineInput').value = '';
      // Inject undo button
      const refineWrap = document.getElementById('_refineWrap');
      if (refineWrap && !refineWrap.querySelector('#_undoBtn')) {
        const undoBtn = document.createElement('button');
        undoBtn.id = '_undoBtn';
        undoBtn.className = 'tool-undo-btn';
        undoBtn.textContent = '← Undo refine';
        undoBtn.addEventListener('click', () => {
          if (_lastResultHTML && body) {
            body.innerHTML = _lastResultHTML;
            _lastResultHTML = null;
            undoBtn.remove();
          }
        });
        refineWrap.appendChild(undoBtn);
      }
    } catch(err) {
      if (!err._shown) showError('Refinement failed. Please try again.');
    } finally {
      setLoading(false);
      this.disabled = false;
      this.textContent = 'Refine →';
    }
  });

  document.getElementById('_refineInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('_refineBtn')?.click();
  });
}

/* ── Email capture with newsletter opt-in ── */
function _injectEmailCapture() {
  const result = document.getElementById('result');
  if (!result || result.querySelector('#_emailCapture')) return;
  const wrap = document.createElement('div');
  wrap.id = '_emailCapture';
  wrap.className = 'tool-email-cap';
  wrap.innerHTML = `
    <span class="tool-email-cap-label">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M4 4h16v16H4z"/><path d="m4 7 8 6 8-6"/></svg>
      Email me this result
    </span>
    <div class="tool-email-cap-row">
      <input class="tool-email-cap-input" id="_emailCapInput" type="email" placeholder="your@email.com" autocomplete="email" />
      <button class="tool-email-cap-btn" id="_emailCapBtn">Send →</button>
    </div>
    <label class="tool-email-cap-sub">
      <input type="checkbox" id="_subCheck" />
      Also send me Panos's monthly social-impact giving tips
    </label>
    <p class="tool-email-cap-note">One email. No spam. Unsubscribe anytime.</p>`;
  const embed = result.closest('main')?.querySelector('#toolEmbed');
  if (embed) embed.insertAdjacentElement('beforebegin', wrap);
  else result.insertAdjacentElement('afterend', wrap);

  document.getElementById('_emailCapBtn').addEventListener('click', async function() {
    const email = document.getElementById('_emailCapInput').value.trim();
    if (!email || !email.includes('@')) { document.getElementById('_emailCapInput').focus(); return; }
    const body = document.getElementById('resultBody');
    const title = document.querySelector('h1.tool-title')?.textContent?.trim() || document.title;
    const subscribe = document.getElementById('_subCheck')?.checked || false;
    this.disabled = true;
    this.textContent = 'Sending…';
    try {
      await fetch('https://ask-panos.panagiotis-kokmotoss.workers.dev/email-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tool: title, result: body?.innerText || '', url: window.location.href, subscribe }),
      });
      this.textContent = subscribe ? '✓ Sent + subscribed!' : '✓ Sent!';
      document.getElementById('_emailCapInput').value = '';
    } catch {
      this.textContent = 'Failed — try again';
      this.disabled = false;
    }
  });
}

/* ── Inter-tool journey CTAs ── */
const _JOURNEY_MAP = {
  '/scam-nonprofit-detector.html':   { url: '/charity-comparison-engine.html',  icon: '⚖️', text: 'Looks clean? Compare it with another charity →' },
  '/first-time-donor-coach.html':    { url: '/what-would-x-do.html',            icon: '💸', text: 'See exactly what your monthly budget does →' },
  '/charity-comparison-engine.html': { url: '/nonprofit-health-checker.html',   icon: '🔍', text: 'Now check the health of your favourite →' },
  '/volunteer-match.html':           { url: '/first-time-donor-coach.html',     icon: '🧭', text: 'Ready to give too? Build your giving plan →' },
  '/what-would-x-do.html':           { url: '/why-should-i-give.html',          icon: '❤️', text: 'Still unsure why to give? Find your personal reason →' },
  '/why-should-i-give.html':         { url: '/first-time-donor-coach.html',     icon: '🗓', text: 'Ready to start? Build your first giving plan →' },
  '/what-can-i-donate.html':         { url: '/what-would-x-do.html',            icon: '💸', text: 'Also have cash to give? See its impact →' },
  '/nonprofit-health-checker.html':  { url: '/charity-comparison-engine.html',  icon: '⚖️', text: 'Want to compare this to another org? →' },
  '/neighborhood-giving-map.html':   { url: '/community-needs-map.html',        icon: '📍', text: 'See what community needs exist in that area →' },
  '/community-needs-map.html':       { url: '/neighborhood-giving-map.html',    icon: '🗺', text: 'Now see where giving flows in that city →' },
  '/impact-story-generator.html':    { url: '/nonprofit-health-checker.html',   icon: '🔍', text: "Check your nonprofit's health score →" },
};
function _injectJourneyCTA(text) {
  const result = document.getElementById('result');
  if (!result || result.querySelector('#_journeyCTA')) return;
  const cta = _JOURNEY_MAP[window.location.pathname];
  if (!cta) return;
  /* For scam detector: only show if result seems low-risk */
  if (window.location.pathname === '/scam-nonprofit-detector.html') {
    const lower = (text || '').toLowerCase();
    if (!lower.includes('low risk') && !lower.includes('risk level: low')) return;
  }
  const wrap = document.createElement('div');
  wrap.id = '_journeyCTA';
  wrap.className = 'tool-journey-cta';
  wrap.innerHTML = `
    <span class="tool-journey-icon">${cta.icon}</span>
    <span class="tool-journey-text">${cta.text}</span>
    <a href="${cta.url}" class="tool-journey-link">Go →</a>`;
  const actions = result.querySelector('.tool-result-actions');
  if (actions) result.insertBefore(wrap, actions);
  else result.appendChild(wrap);
}

/* ── Result history ── */
const _HIST_KEY = () => 'hist_' + window.location.pathname.replace(/[^a-z0-9]/gi, '_');
function _saveToHistory(text) {
  if (!text) return;
  try {
    const key = _HIST_KEY();
    const hist = JSON.parse(localStorage.getItem(key) || '[]');
    const snippet = text.replace(/<[^>]+>/g, '').slice(0, 120).trim();
    hist.unshift({ t: Date.now(), snippet, html: document.getElementById('resultBody')?.innerHTML || '' });
    localStorage.setItem(key, JSON.stringify(hist.slice(0, 5)));
  } catch {}
}
function _renderHistoryBtn() {
  let btn = document.getElementById('_histBtn');
  try {
    const hist = JSON.parse(localStorage.getItem(_HIST_KEY()) || '[]');
    if (!hist.length) { if (btn) btn.remove(); return; }
    if (!btn) {
      btn = document.createElement('button');
      btn.id = '_histBtn';
      btn.className = 'tool-hist-btn';
      const form = document.getElementById('toolForm');
      if (form) form.insertAdjacentElement('afterend', btn);
    }
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 106 5.3L3 8"/><path d="M12 7v5l4 2"/></svg> Recent results <span class="tool-hist-badge">${hist.length}</span>`;
    btn.onclick = _openHistoryDrawer;
  } catch {}
}
function _openHistoryDrawer() {
  if (document.getElementById('_histDrawer')) { _closeHistoryDrawer(); return; }
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem(_HIST_KEY()) || '[]'); } catch {}
  const overlay = document.createElement('div');
  overlay.id = '_histOverlay';
  overlay.className = 'hist-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) _closeHistoryDrawer(); });
  const drawer = document.createElement('div');
  drawer.id = '_histDrawer';
  drawer.className = 'hist-drawer';
  const ago = t => {
    const d = Math.round((Date.now() - t) / 1000);
    if (d < 60) return 'just now';
    if (d < 3600) return Math.floor(d/60) + 'm ago';
    if (d < 86400) return Math.floor(d/3600) + 'h ago';
    return Math.floor(d/86400) + 'd ago';
  };
  drawer.innerHTML = `
    <div class="hist-header">
      <strong>Past Results</strong>
      <button class="hist-close" onclick="_closeHistoryDrawer()">✕</button>
    </div>
    <div class="hist-list">
      ${hist.map((h, i) => `
        <div class="hist-item">
          <span class="hist-time">${ago(h.t)}</span>
          <p class="hist-snippet">${h.snippet}…</p>
          <button class="hist-restore" data-i="${i}">Restore →</button>
        </div>`).join('')}
    </div>
    <button class="hist-clear" id="_histClear">Clear history</button>`;
  overlay.appendChild(drawer);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.classList.add('visible'); drawer.classList.add('visible'); });

  drawer.querySelectorAll('.hist-restore').forEach(btn => {
    btn.addEventListener('click', () => {
      const h = hist[+btn.dataset.i];
      const result = document.getElementById('result');
      const rb = document.getElementById('resultBody');
      if (result && rb && h.html) {
        rb.innerHTML = h.html;
        result.classList.add('visible');
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      _closeHistoryDrawer();
    });
  });
  document.getElementById('_histClear').addEventListener('click', () => {
    try { localStorage.removeItem(_HIST_KEY()); } catch {}
    _closeHistoryDrawer();
    const btn = document.getElementById('_histBtn');
    if (btn) btn.remove();
  });
}
function _closeHistoryDrawer() {
  const overlay = document.getElementById('_histOverlay');
  if (!overlay) return;
  overlay.classList.remove('visible');
  overlay.querySelector('#_histDrawer')?.classList.remove('visible');
  setTimeout(() => overlay.remove(), 260);
}

/* ── Download result as .txt ── */
function _injectDownloadBtn() {
  const copyBtn = document.getElementById('copyBtn');
  if (!copyBtn || document.getElementById('_dlBtn')) return;
  const btn = document.createElement('button');
  btn.id = '_dlBtn';
  btn.className = 'tool-download-btn';
  btn.title = 'Download as .txt';
  btn.setAttribute('aria-label', 'Download result');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download`;
  copyBtn.insertAdjacentElement('afterend', btn);
  btn.addEventListener('click', () => {
    const body = document.getElementById('resultBody');
    if (!body) return;
    const title = (document.querySelector('h1.tool-title')?.textContent || 'result').trim().replace(/[^a-z0-9 ]/gi, '').trim().replace(/\s+/g, '-').toLowerCase();
    const blob = new Blob([body.innerText], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = title + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

/* ── Print / Save as PDF ── */
function _injectPrintBtn() {
  const copyBtn = document.getElementById('copyBtn');
  if (!copyBtn || document.getElementById('_printBtn')) return;
  const btn = document.createElement('button');
  btn.id = '_printBtn';
  btn.className = 'tool-print-btn';
  btn.title = 'Print / Save as PDF';
  btn.setAttribute('aria-label', 'Print result');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Print`;
  const dlBtn = document.getElementById('_dlBtn');
  if (dlBtn) dlBtn.insertAdjacentElement('afterend', btn);
  else copyBtn.insertAdjacentElement('afterend', btn);
  btn.addEventListener('click', () => {
    const body = document.getElementById('resultBody');
    const title = document.querySelector('h1.tool-title')?.textContent?.trim() || document.title;
    if (!body) return;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
      <style>
        body { font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #1a2e4a; }
        h1 { font-size: 1.4rem; margin-bottom: 6px; }
        .meta { font-size: 0.78rem; color: #888; margin-bottom: 24px; }
        .content { font-size: 0.9rem; line-height: 1.75; }
        strong { color: #1a2e4a; }
        @media print { body { margin: 20px; } }
      </style>
    </head><body>
      <h1>${title}</h1>
      <p class="meta">Generated by panoskokmotos.com · ${new Date().toLocaleDateString()}</p>
      <div class="content">${body.innerHTML}</div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  });
}

/* ── Result rating (👍 / 👎) ── */
function _injectRating() {
  const result = document.getElementById('result');
  if (!result || result.querySelector('#_ratingWrap')) return;
  const wrap = document.createElement('div');
  wrap.id = '_ratingWrap';
  wrap.className = 'tool-rating';
  wrap.innerHTML = `
    <span class="tool-rating-q">Was this result helpful?</span>
    <button class="tool-rating-btn" id="_rateUp" aria-label="Yes, helpful" title="Helpful">👍</button>
    <button class="tool-rating-btn" id="_rateDown" aria-label="Not helpful" title="Not helpful">👎</button>
    <span class="tool-rating-thanks" id="_ratingThanks"></span>`;
  const actions = result.querySelector('.tool-result-actions');
  if (actions) result.insertBefore(wrap, actions);
  else result.appendChild(wrap);

  wrap.querySelectorAll('.tool-rating-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const good = this.id === '_rateUp';
      try { localStorage.setItem('rating_' + window.location.pathname, good ? '1' : '0'); } catch {}
      if (window.plausible) window.plausible('Tool Rating', { props: { value: good ? 'helpful' : 'not_helpful', tool: window.location.pathname } });
      wrap.querySelectorAll('.tool-rating-btn').forEach(b => b.disabled = true);
      const thanks = document.getElementById('_ratingThanks');
      thanks.textContent = good ? 'Glad it helped! 🙌' : 'Thanks for letting us know.';
      thanks.classList.add('visible');
    });
  });
}

/* ── Shareable URL — serialize form inputs to URL params ── */
function initShareableURL() {
  /* Pre-fill from URL params on page load */
  const params = new URLSearchParams(window.location.search);
  if (params.size) {
    params.forEach((val, key) => {
      const el = document.getElementById(key);
      if (el && !['BUTTON','FIELDSET'].includes(el.tagName)) el.value = val;
    });
  }
  /* Serialize form → URL on submit */
  const form = document.getElementById('toolForm');
  if (!form) return;
  form.addEventListener('submit', () => {
    const p = new URLSearchParams();
    form.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
      if (el.type === 'checkbox') return; /* skip checkboxes */
      if (el.value) p.set(el.id, el.value);
    });
    const qs = p.toString();
    if (qs) history.replaceState({}, '', window.location.pathname + '?' + qs);
  }, { capture: true });
}

/* ── Feature 2: Autosave form inputs ── */
function _initAutosave() {
  const form = document.getElementById('toolForm');
  if (!form) return;
  const key = 'draft_' + window.location.pathname.replace(/[^a-z0-9]/gi, '_');
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    Object.keys(saved).forEach(id => {
      const el = document.getElementById(id);
      if (el && !['BUTTON'].includes(el.tagName) && el.type !== 'hidden' && el.type !== 'checkbox') {
        el.value = saved[id];
      }
    });
  } catch {}
  form.addEventListener('input', () => {
    try {
      const data = {};
      form.querySelectorAll('input[id]:not([type=hidden]):not([type=button]):not([type=checkbox]):not([type=submit]), textarea[id], select[id]').forEach(el => {
        if (el.value) data[el.id] = el.value;
      });
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  });
  form.addEventListener('submit', () => {
    try { localStorage.removeItem(key); } catch {}
  }, { capture: true });
}

/* ── Feature 3: Multi-turn follow-up chat below result ── */
function _injectFollowUpChat() {
  const result = document.getElementById('result');
  if (!result || result.querySelector('#_followChat')) return;
  const wrap = document.createElement('div');
  wrap.id = '_followChat';
  wrap.className = 'tool-followup';
  wrap.innerHTML = `
    <p class="tool-followup-label">💬 Ask a follow-up question</p>
    <div class="tool-followup-thread" id="_followThread"></div>
    <div class="tool-followup-row">
      <input class="tool-followup-input" id="_followInput" type="text"
        placeholder="e.g. What if my budget doubles? Can you simplify this?" autocomplete="off" />
      <button class="tool-followup-btn" id="_followBtn">Ask →</button>
    </div>`;
  const emailCap = result.closest('main')?.querySelector('#_emailCapture');
  if (emailCap) emailCap.insertAdjacentElement('beforebegin', wrap);
  else result.insertAdjacentElement('afterend', wrap);

  const thread  = document.getElementById('_followThread');
  const input   = document.getElementById('_followInput');
  const btn     = document.getElementById('_followBtn');
  let followHistory = []; // conversation context

  const addBubble = (role, text) => {
    const div = document.createElement('div');
    div.className = `fup-bubble fup-${role}`;
    div.innerHTML = role === 'user' ? `<span>${text.replace(/</g,'&lt;')}</span>` : formatMarkdown(text);
    thread.appendChild(div);
    thread.scrollTop = thread.scrollHeight;
    return div;
  };

  const ask = async () => {
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    btn.disabled = true;
    addBubble('user', q);
    const loading = addBubble('bot', '<span class="fup-dots"><span></span><span></span><span></span></span>');
    followHistory.push(q);
    const originalResult = document.getElementById('resultBody')?.innerText || '';
    const ctx = `The user previously received this AI-generated result:\n\n${originalResult}\n\nAnswer their follow-up question concisely and helpfully. Keep the same context and expertise.`;
    const followMsg = followHistory.length === 1 ? q : `Previous follow-ups: ${followHistory.slice(0,-1).join(' | ')}\n\nNew question: ${q}`;
    try {
      const text = await _callWorkerFallback(ctx, followMsg);
      loading.innerHTML = formatMarkdown(text);
    } catch(err) {
      loading.innerHTML = 'Sorry, try again.';
    } finally {
      btn.disabled = false;
      input.focus();
    }
  };

  btn.addEventListener('click', ask);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') ask(); });
}

/* ── Feature 6: Undo last refine ── */
let _lastResultHTML = null;
let _lastResultText = null;
// Patched into _injectRefineInput's refine click — see below in _injectRefineInput

/* ── Feature 9: Ask Panos's AI about the org/topic ── */
function _injectAskAbout() {
  const paths = ['/scam-nonprofit-detector.html', '/charity-comparison-engine.html', '/nonprofit-health-checker.html'];
  if (!paths.includes(window.location.pathname)) return;
  const result = document.getElementById('result');
  if (!result || result.querySelector('#_askChatBtn')) return;

  // Extract the subject from the primary input field
  const orgInput = document.getElementById('orgName') || document.getElementById('cause') || document.getElementById('orgInfo');
  const subject = orgInput?.value?.trim();
  if (!subject) return;

  const btn = document.createElement('button');
  btn.id = '_askChatBtn';
  btn.className = 'tool-ask-btn';
  btn.innerHTML = `💬 Ask AI about "${subject.slice(0, 40)}${subject.length > 40 ? '…' : ''}"`;
  btn.addEventListener('click', () => {
    const widget = document.getElementById('chatWidget');
    const inp = document.getElementById('chatInput');
    if (!widget || !inp) return;
    widget.classList.add('open');
    inp.value = `Tell me about "${subject}" — what do you know about it and is it worth supporting?`;
    inp.focus();
    const send = document.getElementById('chatSend');
    if (send) send.click();
  });
  const actions = result.querySelector('.tool-result-actions');
  if (actions) result.insertBefore(btn, actions);
  else result.appendChild(btn);
}

/* ── Feature 10: Confidence badge ── */
function _injectConfidenceBadge(text) {
  const result = document.getElementById('result');
  if (!result || result.querySelector('._confBadge')) return;
  const lower = (text || '').toLowerCase();
  const hiWords = ['research shows','evidence suggests','studies confirm','data indicates','proven','well-established','according to'];
  const loWords = ['may vary','might','uncertain','it\'s possible','could be','difficult to verify','unclear'];
  const hi = hiWords.filter(w => lower.includes(w)).length;
  const lo = loWords.filter(w => lower.includes(w)).length;
  let label, color;
  if (hi >= 2) { label = '📊 Research-backed'; color = '#16a34a'; }
  else if (lo >= 3) { label = '⚠️ Estimates may vary'; color = '#d97706'; }
  else { label = '🤖 AI analysis'; color = '#6b7280'; }
  const header = result.querySelector('.tool-result-header');
  if (!header) return;
  const badge = document.createElement('span');
  badge.className = '_confBadge';
  badge.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:0.69rem;padding:2px 8px;background:${color}16;color:${color};border-radius:10px;font-weight:600;border:1px solid ${color}30;margin-left:8px;`;
  badge.textContent = label;
  header.querySelector('.tool-result-label')?.insertAdjacentElement('afterend', badge);
}

/* ── Feature 11: PWA install prompt ── */
let _pwaPrompt = null;
function _initPWAPrompt() {
  if (!document.getElementById('toolForm')) return; // only on tool pages
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _pwaPrompt = e;
    try {
      const visits = parseInt(localStorage.getItem('_tv') || '0') + 1;
      localStorage.setItem('_tv', visits);
      if (visits >= 2 && !localStorage.getItem('_pwaDone')) _showPWABanner();
    } catch {}
  });
}
function _showPWABanner() {
  if (document.getElementById('_pwaBanner')) return;
  const banner = document.createElement('div');
  banner.id = '_pwaBanner';
  banner.className = 'pwa-banner';
  banner.innerHTML = `<span class="pwa-banner-text">📱 Add to home screen — use all 11 tools offline</span>
    <button class="pwa-banner-btn" id="_pwaInstall">Install</button>
    <button class="pwa-banner-x" id="_pwaDismiss" aria-label="Dismiss">✕</button>`;
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('visible'));
  document.getElementById('_pwaInstall').addEventListener('click', async () => {
    if (_pwaPrompt) {
      _pwaPrompt.prompt();
      const result = await _pwaPrompt.userChoice;
      if (result.outcome === 'accepted') { try { localStorage.setItem('_pwaDone','1'); } catch {} }
    }
    banner.remove();
  });
  document.getElementById('_pwaDismiss').addEventListener('click', () => {
    try { localStorage.setItem('_pwaDone','1'); } catch {}
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 300);
  });
}

/* ── Feature 13: Shareable result card (canvas image) ── */
function _injectShareCard() {
  const copyBtn = document.getElementById('copyBtn');
  if (!copyBtn || document.getElementById('_cardBtn')) return;
  const btn = document.createElement('button');
  btn.id = '_cardBtn';
  btn.className = 'tool-card-btn';
  btn.title = 'Download as shareable image';
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg> Save image`;
  const dlBtn = document.getElementById('_dlBtn');
  (dlBtn || copyBtn).insertAdjacentElement('afterend', btn);
  btn.addEventListener('click', () => {
    const body = document.getElementById('resultBody');
    const title = document.querySelector('h1.tool-title')?.textContent?.trim() || document.title;
    if (!body) return;
    const snippet = body.innerText.slice(0, 280).trim() + (body.innerText.length > 280 ? '…' : '');
    const W = 1200, H = 630;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);
    // Accent strip
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#3b6ef8'); grad.addColorStop(1, '#7c3aed');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - 8, W, 8);
    // Tool label
    ctx.fillStyle = '#3b6ef8';
    ctx.font = '600 18px system-ui,sans-serif';
    ctx.fillText('AI for Social Impact · panoskokmotos.com', 60, 60);
    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 44px system-ui,sans-serif';
    const titleWords = title.split(' ');
    let line = ''; let ty = 130;
    for (const w of titleWords) {
      const test = line + (line ? ' ' : '') + w;
      if (ctx.measureText(test).width > W - 120) { ctx.fillText(line, 60, ty); ty += 56; line = w; }
      else line = test;
    }
    if (line) ctx.fillText(line, 60, ty);
    // Snippet
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 22px system-ui,sans-serif';
    const words = snippet.split(' ');
    let sLine = ''; let sy = ty + 70;
    for (const w of words) {
      const test = sLine + (sLine ? ' ' : '') + w;
      if (ctx.measureText(test).width > W - 120) {
        ctx.fillText(sLine, 60, sy); sy += 34; sLine = w;
        if (sy > H - 80) { ctx.fillText(sLine + '…', 60, sy); break; }
      } else sLine = test;
    }
    if (sy <= H - 80 && sLine) ctx.fillText(sLine, 60, sy);
    // Download
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = (title.replace(/[^a-z0-9 ]/gi,'').trim().replace(/\s+/g,'-').toLowerCase() || 'result') + '-card.png';
    a.click();
  });
}

/* ── Feature 22: Go Deeper with Claude Sonnet ── */
const _DEEP_PATHS = ['/impact-story-generator.html', '/volunteer-match.html', '/charity-comparison-engine.html', '/why-should-i-give.html', '/donation-tax-estimator.html'];
function _injectGoDeeperBtn() {
  if (!_DEEP_PATHS.includes(window.location.pathname)) return;
  const result = document.getElementById('result');
  if (!result || result.querySelector('#_deepBtn')) return;
  const btn = document.createElement('button');
  btn.id = '_deepBtn';
  btn.className = 'tool-deep-btn';
  btn.innerHTML = `✨ Go Deeper <span class="deep-badge">Claude Sonnet</span>`;
  const actions = result.querySelector('.tool-result-actions');
  if (actions) result.insertBefore(btn, actions);
  else result.appendChild(btn);
  btn.addEventListener('click', async function() {
    const body = document.getElementById('resultBody');
    if (!body) return;
    const current = body.innerText;
    const title = document.querySelector('h1.tool-title')?.textContent?.trim() || document.title;
    const sys = `You are a world-class expert in "${title}". The user has an AI-generated result they want to deepen. Substantially expand it: add specific examples, research citations, actionable steps, nuance, and depth. Keep the same structure but make it 2x richer and more useful.`;
    const msg = `Here is the current result:\n\n${current}\n\nPlease provide a significantly enhanced, more comprehensive version.`;
    btn.disabled = true;
    btn.innerHTML = '✨ Enhancing…';
    setLoading(true);
    hideResult();
    try {
      const res = await fetch(TOOL_DEEP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: sys, userMessage: msg }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      showResult(data.result || data.text || '');
    } catch {
      if (!window._lastShownErr) showError('Enhancement failed. Please try again.');
    } finally {
      setLoading(false);
      btn.disabled = false;
      btn.innerHTML = `✨ Go Deeper <span class="deep-badge">Claude Sonnet</span>`;
    }
  });
}

/* ── Auto-init on DOM ready ── */
document.addEventListener('DOMContentLoaded', () => {
  initExampleChips();
  initTryAnother();
  initShareBtns();
  initUsageCounter();
  initRelatedTools();
  initEmbed();
  initShareableURL();
  _renderHistoryBtn();
  _initAutosave();
  _initPWAPrompt();
  _initVoiceInput();
  _initCharityAutocomplete();
  _initKeyboardShortcutHelper();
  _restoreOfflineResult();
  /* Ctrl+Enter / Cmd+Enter to submit */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const btn = document.getElementById('submitBtn');
      if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
    }
    /* ? — keyboard shortcut cheat sheet */
    if (e.key === '?' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      _toggleShortcutModal();
    }
    /* Escape — close any open modal/drawer */
    if (e.key === 'Escape') {
      _closeHistoryDrawer();
      _closeShortcutModal();
    }
    /* R — focus refine input if result is visible */
    if (e.key === 'r' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
      const refine = document.getElementById('_refineInput');
      if (refine) { e.preventDefault(); refine.focus(); }
    }
  });
});

/* ══════════════════════════════════════════════
   Phase 7 — New Feature JS
   ══════════════════════════════════════════════ */

/* ── #3 Voice Input ── */
const TOOL_CHARITY_SEARCH_URL = 'https://ask-panos.panagiotis-kokmotoss.workers.dev/api/charity-search';

function _initVoiceInput() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  const targets = document.querySelectorAll('input[type="text"], input:not([type]), textarea');
  targets.forEach(input => {
    if (input.closest('.tool-voice-wrap')) return; // already wrapped
    const wrap = document.createElement('div');
    wrap.className = 'tool-voice-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tool-voice-btn';
    btn.title = 'Speak your input';
    btn.setAttribute('aria-label', 'Voice input');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
    wrap.appendChild(btn);
    let rec = null;
    btn.addEventListener('click', () => {
      if (rec) { rec.stop(); rec = null; btn.classList.remove('listening'); return; }
      rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = false;
      btn.classList.add('listening');
      rec.onresult = ev => {
        input.value = ev.results[0][0].transcript;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
      rec.onerror = rec.onend = () => { rec = null; btn.classList.remove('listening'); };
      rec.start();
    });
  });
}

/* ── #4 Charity Autocomplete (ProPublica API via Worker) ── */
function _initCharityAutocomplete() {
  const fieldIds = ['orgName', 'orgNameB', 'cause', 'causeB'];
  fieldIds.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    // Create dropdown container
    const dropdown = document.createElement('ul');
    dropdown.className = 'tool-autocomplete';
    dropdown.id = id + '_ac';
    dropdown.setAttribute('role', 'listbox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', id + '_ac');
    // Wrap in relative container if not already
    if (!input.parentElement.style.position) input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(dropdown);

    let debounceTimer = null;
    let activeIndex = -1;
    let currentItems = [];

    const closeDropdown = () => {
      dropdown.innerHTML = '';
      dropdown.classList.remove('open');
      activeIndex = -1;
    };

    const renderItems = items => {
      currentItems = items;
      activeIndex = -1;
      if (!items.length) { closeDropdown(); return; }
      dropdown.innerHTML = items.map((o, i) =>
        `<li class="tool-ac-item" role="option" data-i="${i}" tabindex="-1">
          <span class="tool-ac-name">${o.name}</span>
          <span class="tool-ac-meta">${o.city ? o.city + (o.state ? ', ' + o.state : '') : ''} ${o.ein ? '· EIN ' + o.ein : ''}</span>
        </li>`
      ).join('');
      dropdown.classList.add('open');
      dropdown.querySelectorAll('.tool-ac-item').forEach(li => {
        li.addEventListener('mousedown', e => {
          e.preventDefault();
          input.value = currentItems[+li.dataset.i].name;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          closeDropdown();
        });
      });
    };

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const q = input.value.trim();
      if (q.length < 2) { closeDropdown(); return; }
      debounceTimer = setTimeout(async () => {
        try {
          const res = await fetch(`${TOOL_CHARITY_SEARCH_URL}?q=${encodeURIComponent(q)}`);
          const data = await res.json();
          renderItems(data.organizations || []);
        } catch { closeDropdown(); }
      }, 300);
    });

    input.addEventListener('keydown', e => {
      if (!dropdown.classList.contains('open')) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, currentItems.length - 1);
        dropdown.querySelectorAll('.tool-ac-item')[activeIndex]?.classList.add('active');
        dropdown.querySelectorAll('.tool-ac-item').forEach((li, i) => li.classList.toggle('active', i === activeIndex));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        dropdown.querySelectorAll('.tool-ac-item').forEach((li, i) => li.classList.toggle('active', i === activeIndex));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        input.value = currentItems[activeIndex].name;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        closeDropdown();
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    document.addEventListener('click', e => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) closeDropdown();
    });
  });
}

/* ── #1 Explain tooltip on result headings ── */
function _injectExplainTooltips() {
  const body = document.getElementById('resultBody');
  if (!body) return;
  body.querySelectorAll('h2, h3, h4').forEach(h => {
    if (h.querySelector('.tool-explain-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'tool-explain-btn';
    btn.type = 'button';
    btn.title = 'Explain this section';
    btn.setAttribute('aria-label', 'Explain this section in plain English');
    btn.innerHTML = '?';
    h.appendChild(btn);
    let tip = null;
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (tip) { tip.remove(); tip = null; return; }
      tip = document.createElement('div');
      tip.className = 'tool-explain-tip loading';
      tip.textContent = 'Explaining…';
      h.insertAdjacentElement('afterend', tip);
      const sectionText = (() => {
        let text = '', el = h.nextElementSibling;
        while (el && !['H2','H3','H4'].includes(el.tagName)) { text += el.textContent + ' '; el = el.nextElementSibling; }
        return text.trim().slice(0, 600);
      })();
      try {
        const res = await _callWorkerFallback(
          'You explain jargon and technical terms from nonprofit/charity analysis in plain English. Be brief (2-3 sentences max). Start directly with the explanation — no preamble.',
          `Section heading: "${h.textContent.replace('?','').trim()}"\nSection content: "${sectionText}"\n\nExplain what this section means in simple terms a first-time donor would understand.`
        );
        tip.classList.remove('loading');
        tip.textContent = res;
      } catch {
        tip.textContent = 'Could not load explanation.';
        tip.classList.remove('loading');
      }
    });
    document.addEventListener('click', e => {
      if (tip && !h.contains(e.target) && !tip.contains(e.target)) { tip.remove(); tip = null; }
    }, { once: false });
  });
}

/* ── #7 Donation Impact Calculator (nonprofit-health-checker only) ── */
function _injectImpactCalculator() {
  if (!window.location.pathname.includes('nonprofit-health-checker')) return;
  const result = document.getElementById('result');
  if (!result || result.querySelector('#_impactCalc')) return;
  const calc = document.createElement('div');
  calc.id = '_impactCalc';
  calc.className = 'tool-impact-calc';
  calc.innerHTML = `
    <p class="tool-impact-calc-label">💡 Estimate your impact</p>
    <div class="tool-impact-calc-row">
      <span class="tool-impact-calc-symbol">$</span>
      <input class="tool-impact-calc-input" id="_impactAmt" type="number" min="1" max="1000000" placeholder="500" />
      <button class="tool-impact-calc-btn" id="_impactCalcBtn">Calculate →</button>
    </div>
    <div id="_impactResult" class="tool-impact-calc-result" style="display:none"></div>`;
  const disclaimer = result.querySelector('._disclaimer');
  if (disclaimer) disclaimer.insertAdjacentElement('beforebegin', calc);
  else result.appendChild(calc);

  document.getElementById('_impactCalcBtn').addEventListener('click', async function() {
    const amt = parseFloat(document.getElementById('_impactAmt').value);
    if (!amt || amt <= 0) return;
    const orgText = document.getElementById('resultBody')?.innerText?.slice(0, 800) || '';
    const resEl = document.getElementById('_impactResult');
    resEl.style.display = '';
    resEl.textContent = 'Estimating impact…';
    this.disabled = true;
    try {
      const text = await _callWorkerFallback(
        'You are an expert in nonprofit impact measurement. Based on a charity\'s profile, estimate what a specific donation amount could accomplish. Be specific and optimistic but realistic. Use bullet points. Keep it under 150 words.',
        `Charity profile:\n${orgText}\n\nDonation amount: $${amt}\n\nWhat could this donation accomplish? Provide 2-3 specific, concrete impact estimates.`
      );
      resEl.innerHTML = formatMarkdown(text);
    } catch {
      resEl.textContent = 'Could not estimate impact. Try again.';
    } finally {
      this.disabled = false;
    }
  });
}

/* ── #15 Freshness Badge ── */
function _injectFreshnessBadge() {
  const freshnessPaths = ['/donation-tax-estimator.html', '/nonprofit-health-checker.html', '/scam-nonprofit-detector.html'];
  if (!freshnessPaths.includes(window.location.pathname)) return;
  const title = document.querySelector('h1.tool-title');
  if (!title || title.querySelector('.tool-freshness')) return;
  const badge = document.createElement('span');
  badge.className = 'tool-freshness';
  badge.title = 'Tax data and regulations current as of 2024. Always verify with a tax professional.';
  badge.textContent = 'Data: 2024';
  title.appendChild(badge);
}

/* ── #14 Enhanced Sources Section ── */
function _injectSourceLinks() {
  const result = document.getElementById('result');
  if (!result || result.querySelector('._sources')) return;
  const body = document.getElementById('resultBody');
  if (!body) return;
  // Build relevant source links based on current page
  const path = window.location.pathname;
  const sources = [];
  if (path.includes('nonprofit-health-checker') || path.includes('charity-comparison') || path.includes('scam-nonprofit')) {
    sources.push({ label: 'Charity Navigator', url: 'https://www.charitynavigator.org' });
    sources.push({ label: 'IRS Tax Exempt Org Search', url: 'https://apps.irs.gov/app/eos/' });
    sources.push({ label: 'ProPublica Nonprofit Explorer', url: 'https://projects.propublica.org/nonprofits/' });
  } else if (path.includes('donation-tax-estimator')) {
    sources.push({ label: 'IRS Publication 526 (Charitable Contributions)', url: 'https://www.irs.gov/pub/irs-pdf/p526.pdf' });
    sources.push({ label: 'AADE (Greek Tax Authority)', url: 'https://www.aade.gr' });
  } else if (path.includes('volunteer-match') || path.includes('what-can-i-donate')) {
    sources.push({ label: 'VolunteerMatch.org', url: 'https://www.volunteermatch.org' });
    sources.push({ label: 'Idealist.org', url: 'https://www.idealist.org' });
  }
  if (!sources.length) return;
  const div = document.createElement('div');
  div.className = 'tool-source-links _sources';
  div.innerHTML = `<p class="tool-source-links-label">Verify with official sources:</p>
    <div class="tool-source-links-row">${sources.map(s =>
      `<a href="${s.url}" target="_blank" rel="noopener noreferrer" class="tool-source-link">${s.label} ↗</a>`
    ).join('')}</div>`;
  const disclaimer = result.querySelector('._disclaimer');
  if (disclaimer) disclaimer.insertAdjacentElement('afterend', div);
  else result.appendChild(div);
}

/* ── #18 Keyboard Shortcut Cheat Sheet Modal ── */
let _shortcutModalOpen = false;
function _initKeyboardShortcutHelper() {
  // ? button in top-right corner
  const btn = document.createElement('button');
  btn.id = '_kbdHelpBtn';
  btn.className = 'tool-kbd-help-btn';
  btn.type = 'button';
  btn.title = 'Keyboard shortcuts (?)';
  btn.setAttribute('aria-label', 'Show keyboard shortcuts');
  btn.innerHTML = '?';
  document.body.appendChild(btn);
  btn.addEventListener('click', _toggleShortcutModal);
}
function _toggleShortcutModal() {
  if (_shortcutModalOpen) { _closeShortcutModal(); return; }
  _openShortcutModal();
}
function _openShortcutModal() {
  if (document.getElementById('_kbdModal')) return;
  _shortcutModalOpen = true;
  const overlay = document.createElement('div');
  overlay.id = '_kbdOverlay';
  overlay.className = 'kbd-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) _closeShortcutModal(); });
  const modal = document.createElement('div');
  modal.id = '_kbdModal';
  modal.className = 'kbd-modal';
  modal.innerHTML = `
    <div class="kbd-modal-header">
      <strong>Keyboard Shortcuts</strong>
      <button class="kbd-modal-close" type="button" onclick="_closeShortcutModal()">✕</button>
    </div>
    <div class="kbd-rows">
      <div class="kbd-row"><kbd>Ctrl</kbd><kbd>Enter</kbd><span>Submit form</span></div>
      <div class="kbd-row"><kbd>R</kbd><span>Focus refine input</span></div>
      <div class="kbd-row"><kbd>?</kbd><span>Show this help</span></div>
      <div class="kbd-row"><kbd>Esc</kbd><span>Close modals / drawers</span></div>
    </div>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
function _closeShortcutModal() {
  _shortcutModalOpen = false;
  const overlay = document.getElementById('_kbdOverlay');
  if (!overlay) return;
  overlay.classList.remove('visible');
  setTimeout(() => overlay.remove(), 200);
}

/* ── #23 Error Classification ── */
function _classifyError(err, status) {
  if (status === 429) return { type: 'rate', msg: "You've been using this a lot! Please wait 60 seconds and try again." };
  if (status === 503 || status === 502) return { type: 'server', msg: 'The AI service is temporarily overloaded. Please try again in a moment.' };
  if (!navigator.onLine || err?.message?.includes('fetch') || err?.message?.includes('network')) {
    return { type: 'offline', msg: "You appear to be offline. Your last result has been restored below." };
  }
  return { type: 'generic', msg: 'Something went wrong. Please try again or simplify your query.' };
}

/* ── #25 Offline Result Cache ── */
const _OFFLINE_KEY = () => 'offline_result_' + window.location.pathname.replace(/[^a-z0-9]/gi, '_');
function _saveLastResultOffline(text, htmlStr) {
  try {
    localStorage.setItem(_OFFLINE_KEY(), JSON.stringify({ text, html: htmlStr, t: Date.now() }));
  } catch {}
}
function _restoreOfflineResult() {
  if (navigator.onLine) return;
  try {
    const saved = JSON.parse(localStorage.getItem(_OFFLINE_KEY()) || 'null');
    if (!saved) return;
    const result = document.getElementById('result');
    const body = document.getElementById('resultBody');
    if (!result || !body) return;
    const banner = document.createElement('div');
    banner.className = 'tool-offline-banner';
    banner.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg> You're offline — showing your last saved result`;
    body.innerHTML = saved.html;
    result.insertAdjacentElement('beforebegin', banner);
    result.classList.add('visible');
  } catch {}
}
