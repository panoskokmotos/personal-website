/* Homepage hero chat: a Claude-style conversation with "AI Panos", front and centre.
   Uses the same backend as the side widget (window.SITE_CONFIG.chatUrl, POST {messages} → {text}).
   The conversation is kept for the browser session; the side chat bubble hides while this is on screen. */
(function () {
  const root = document.getElementById('heroChat');
  if (!root || !window.SITE_CONFIG) return;
  const thread = root.querySelector('.hc-thread');
  const form = root.querySelector('.hc-composer');
  const input = root.querySelector('.hc-input');
  const send = root.querySelector('.hc-send');
  const chips = root.querySelector('.hc-chips');
  const KEY = 'hero_chat_v1';
  let messages = [];
  try { messages = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { messages = []; }

  const track = (ev, props) => { try { if (window.posthog && posthog.capture) posthog.capture(ev, props); } catch (e) {} };
  const md = (t) => (window.renderMarkdown ? window.renderMarkdown(t, { italic: true, links: true }) : (window.escapeHtml ? escapeHtml(t) : t));

  function add(role, text, opts) {
    const row = document.createElement('div');
    row.className = 'hc-msg hc-' + role + (opts && opts.thinking ? ' hc-thinking' : '');
    if (role === 'assistant') {
      row.innerHTML = '<span class="hc-avatar" aria-hidden="true"><img src="/assets/avatar.jpg" alt="" width="26" height="26"></span><div class="hc-body"></div>';
      const body = row.querySelector('.hc-body');
      if (opts && opts.thinking) body.innerHTML = '<span class="hc-dots" aria-label="Thinking"><i></i><i></i><i></i></span>';
      else body.innerHTML = md(text);
    } else {
      const b = document.createElement('div'); b.className = 'hc-body'; b.textContent = text; row.appendChild(b);
    }
    thread.appendChild(row);
    root.classList.add('hc-active');
    thread.scrollTop = thread.scrollHeight;
    return row;
  }

  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(messages.slice(-20))); } catch (e) {} }
  messages.forEach(m => add(m.role, m.content));

  async function ask(text) {
    text = (text || '').trim();
    if (!text || send.disabled) return;
    input.value = ''; resize();
    send.disabled = true;
    add('user', text);
    messages.push({ role: 'user', content: text }); save();
    track('hero_chat_message', { n: messages.filter(m => m.role === 'user').length });
    if (typeof window.detectAndTrackIntent === 'function') { try { window.detectAndTrackIntent(text); } catch (e) {} }
    const thinking = add('assistant', '', { thinking: true });
    try {
      const res = await fetch(window.SITE_CONFIG.chatUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) });
      const data = await res.json();
      let reply = data.text || '';
      const fb = window.chatFallback ? window.chatFallback(text, reply) : null;
      if (fb) { reply = fb; track('hero_chat_fallback', {}); }
      thinking.remove();
      add('assistant', reply);
      messages.push({ role: 'assistant', content: reply }); save();
    } catch (e) {
      thinking.remove();
      const fb = window.chatFallback ? window.chatFallback(text, '') : null;
      add('assistant', fb || 'I couldn\'t connect just now. You can reach the real me through the Let\'s Talk page.');
    } finally {
      send.disabled = false;
      input.focus({ preventScroll: true });
    }
  }

  function resize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; send.classList.toggle('ready', !!input.value.trim()); }
  input.addEventListener('input', resize);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
  form.addEventListener('submit', e => { e.preventDefault(); ask(input.value); });
  if (chips) chips.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { track('hero_chat_chip', { q: b.textContent.trim() }); ask(b.textContent); } });
  root.querySelector('.hc-reset')?.addEventListener('click', () => { messages = []; save(); thread.innerHTML = ''; root.classList.remove('hc-active'); input.focus(); });

  // Hide the floating side chat while this one is visible.
  new IntersectionObserver(e => document.documentElement.classList.toggle('hero-chat-on', e[e.length - 1].isIntersecting)).observe(root);
})();
