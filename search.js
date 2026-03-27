// ── Site Search (Cmd+K / Ctrl+K) ──
(function () {
  'use strict';

  let searchIndex = null;
  let modalOpen = false;
  let activeIdx = -1;

  // ── Load index on first open ──
  async function loadIndex() {
    if (searchIndex) return;
    try {
      const res = await fetch('/search-index.json');
      searchIndex = await res.json();
    } catch (e) {
      searchIndex = [];
    }
  }

  // ── Scoring: keyword relevance ──
  function scoreEntry(entry, terms) {
    const haystack = (entry.title + ' ' + entry.snippet + ' ' + (entry.category || '')).toLowerCase();
    let s = 0;
    const allPresent = terms.every(t => haystack.includes(t));
    if (allPresent) s += 10;
    for (const t of terms) {
      const count = (haystack.match(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      s += count;
      if (entry.title.toLowerCase().includes(t)) s += 6; // title bonus
      if (entry.category && entry.category.toLowerCase().includes(t)) s += 3;
    }
    return s;
  }

  function runSearch(query) {
    if (!searchIndex || !query.trim()) return [];
    const terms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1);
    if (!terms.length) return [];
    return searchIndex
      .map(entry => ({ entry, s: scoreEntry(entry, terms) }))
      .filter(r => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 7)
      .map(r => r.entry);
  }

  // ── Icons per category ──
  function catIcon(cat) {
    const map = {
      Home: '🏠', About: '👤', Projects: '🚀', Podcast: '🎙️', Books: '📚',
      Beliefs: '💡', Now: '⚡', Watch: '▶️', Awards: '🏆', Contact: '✉️',
      Speaking: '🎤', Education: '🎓', Milestones: '📍', FAQ: '❓'
    };
    return map[cat] || '🔍';
  }

  // ── Render helpers ──
  function renderEmpty(query) {
    if (!query) {
      return '<p class="ss-hint">Search books, beliefs, Givelink, awards, contact…</p>' +
        '<div class="ss-shortcuts"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>Esc</kbd> close</span></div>';
    }
    return '<p class="ss-hint">No results found — try the <button class="ss-ai-link" onclick="openSearch(); closeSearch(); setTimeout(openChat,120)">AI chat</button> instead.</p>';
  }

  function highlight(text, query) {
    const terms = query.trim().split(/\s+/).filter(t => t.length > 1);
    if (!terms.length) return text;
    const pattern = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    return text.replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>');
  }

  function renderResults(results, query) {
    return results.map((r, i) =>
      `<a href="${r.url}" class="ss-result${i === activeIdx ? ' ss-active' : ''}" data-idx="${i}" onclick="window.__ssClose()">
        <span class="ss-result-icon">${catIcon(r.category)}</span>
        <div class="ss-result-body">
          <strong class="ss-result-title">${highlight(r.title, query)}</strong>
          <span class="ss-result-snippet">${highlight(r.snippet.slice(0, 88), query)}…</span>
        </div>
        <span class="ss-result-cat">${r.category}</span>
      </a>`
    ).join('');
  }

  // ── Open / close ──
  function openModal() {
    const overlay = document.getElementById('siteSearchOverlay');
    const input   = document.getElementById('ssInput');
    if (!overlay || !input) return;
    overlay.classList.add('ss-open');
    input.value = '';
    activeIdx = -1;
    renderPane('');
    input.focus();
    loadIndex();
    modalOpen = true;
    if (typeof posthog !== 'undefined') {
      posthog.capture('search_opened', { trigger: 'keyboard' });
    }
  }

  function closeModal() {
    const overlay = document.getElementById('siteSearchOverlay');
    if (overlay) overlay.classList.remove('ss-open');
    modalOpen = false;
    activeIdx = -1;
  }

  function renderPane(query) {
    const results = document.getElementById('ssResults');
    if (!results) return;
    const hits = runSearch(query);
    results.innerHTML = hits.length ? renderResults(hits, query) : renderEmpty(query);
  }

  // ── Keyboard navigation ──
  function moveActive(dir) {
    const items = document.querySelectorAll('.ss-result');
    if (!items.length) return;
    activeIdx = Math.max(-1, Math.min(items.length - 1, activeIdx + dir));
    items.forEach((el, i) => el.classList.toggle('ss-active', i === activeIdx));
    if (activeIdx >= 0) items[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  // ── Wire DOM after load ──
  document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('siteSearchOverlay');
    const input   = document.getElementById('ssInput');
    if (!overlay || !input) return;

    // Click backdrop to close
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    // Debounced input handler
    let debounce;
    input.addEventListener('input', () => {
      activeIdx = -1;
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        await loadIndex();
        renderPane(input.value);
      }, 110);
    });

    // Keyboard nav inside modal
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); moveActive(-1); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const active = document.querySelector('.ss-result.ss-active') || document.querySelector('.ss-result');
        if (active) { active.click(); closeModal(); }
      }
    });

    // Nav search button
    const navBtn = document.getElementById('navSearchBtn');
    if (navBtn) navBtn.addEventListener('click', openModal);
  });

  // ── Global keyboard shortcut ──
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      modalOpen ? closeModal() : openModal();
    }
    if (e.key === 'Escape' && modalOpen) closeModal();
  });

  // ── Expose globally ──
  window.openSearch  = openModal;
  window.__ssClose   = closeModal;
  // Helper referenced in empty-state button
  window.openChat = function () {
    const toggle = document.getElementById('chatToggle');
    if (toggle) toggle.click();
  };
})();
