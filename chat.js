// ── Ask Panos AI Chat ──
const WORKER_URL = 'https://ask-panos.panagiotis-kokmotoss.workers.dev';

const chatWidget   = document.getElementById('chatWidget');
const chatToggle   = document.getElementById('chatToggle');
const chatClose    = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const chatInput    = document.getElementById('chatInput');
const chatSend     = document.getElementById('chatSend');
const chatNewChat  = document.getElementById('chatNewChat');

const STORAGE_KEY = 'panos_chat_v1';
let messages = []; // conversation history

// ── Minimal markdown: bold & italic ──
function parseMarkdown(text) {
  // **bold** → <strong>
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // *italic* (not inside bold)
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  // Line breaks
  text = text.replace(/\n/g, '<br>');
  return text;
}

// ── Load saved chat from localStorage ──
(function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    messages = parsed;
    // Re-render saved messages
    parsed.forEach(m => addMessage(m.role === 'user' ? 'user' : 'bot', m.content));
    // Hide starters since there's a conversation
    const starters = document.getElementById('chatStarters');
    if (starters) starters.classList.add('hidden');
  } catch (e) {
    messages = [];
  }
})();

// ── Save to localStorage ──
function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20))); // keep last 20 msgs
  } catch (e) {}
}

// ── Toggle open/close ──
function openChat() { chatWidget.classList.add('open'); chatInput.focus(); }
function closeChat() { chatWidget.classList.remove('open'); }

chatToggle.addEventListener('click', () => {
  chatWidget.classList.contains('open') ? closeChat() : openChat();
});
chatClose.addEventListener('click', closeChat);

// Close on Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeChat(); });

// ── Render a message bubble ──
function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = 'chat-msg ' + role;
  const p = document.createElement('p');
  p.innerHTML = parseMarkdown(text);
  div.appendChild(p);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

// ── Follow-up suggested chips (shown after first AI reply) ──
const followUpChips = [
  { icon: '🚀', text: 'Tell me more about Givelink\'s impact' },
  { icon: '📬', text: 'How can I contact Panos?' },
  { icon: '🎙️', text: 'What is Entrepreneurship Talks?' },
  { icon: '🌍', text: 'What is Panos working on now?' },
];

function showFollowUpChips() {
  const starters = document.getElementById('chatStarters');
  if (!starters) return;
  // Clear existing chips and label
  starters.innerHTML = '<p class="chat-starters-label">Follow-up questions</p>';
  // Add 2 random follow-up chips
  const shuffled = followUpChips.sort(() => 0.5 - Math.random()).slice(0, 2);
  shuffled.forEach(chip => {
    const btn = document.createElement('button');
    btn.className = 'chat-starter-chip';
    btn.setAttribute('onclick', 'useChatStarter(this)');
    btn.innerHTML = `<span class="csc-icon">${chip.icon}</span><span class="csc-text">${chip.text}</span><svg class="csc-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg>`;
    starters.appendChild(btn);
  });
  starters.classList.remove('hidden');
}

// ── Send message ──
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = '';
  chatSend.disabled = true;

  addMessage('user', text);
  messages.push({ role: 'user', content: text });
  saveHistory();

  // Hide starters while waiting
  const starters = document.getElementById('chatStarters');
  if (starters) starters.classList.add('hidden');

  // Animated typing dots indicator
  const thinkingEl = document.createElement('div');
  thinkingEl.className = 'chat-msg thinking';
  thinkingEl.innerHTML = '<p><span class="chat-typing-dots" aria-label="Thinking"><span></span><span></span><span></span></span></p>';
  chatMessages.appendChild(thinkingEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    const data = await res.json();
    const reply = data.text || 'Sorry, I had trouble responding. Please try again.';

    thinkingEl.remove();
    addMessage('bot', reply);
    messages.push({ role: 'assistant', content: reply });
    saveHistory();

    // Always show follow-up chips after every bot reply
    showFollowUpChips();
  } catch {
    thinkingEl.remove();
    addMessage('bot', 'Connection error. Email panagiotis.kokmotoss@gmail.com directly!');
  } finally {
    chatSend.disabled = false;
    chatInput.focus();
  }
}

chatSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

// ── Chat starter chips ──
function useChatStarter(btn) {
  chatInput.value = btn.querySelector('.csc-text')?.textContent || btn.textContent;
  const starters = document.getElementById('chatStarters');
  if (starters) starters.classList.add('hidden');
  sendMessage();
}

// ── Clear chat (new conversation) ──
function clearChat() {
  messages = [];
  localStorage.removeItem(STORAGE_KEY);
  chatMessages.innerHTML = '<div class="chat-msg bot"><p>👋 Hi! I\'m Panos\'s AI assistant. Ask me anything about his work, Givelink, the podcast, or how to get in touch!</p></div>';
  const starters = document.getElementById('chatStarters');
  if (starters) {
    starters.innerHTML = `<p class="chat-starters-label">Suggested questions</p>
      <button class="chat-starter-chip" onclick="useChatStarter(this)">
        <span class="csc-icon">💡</span>
        <span class="csc-text">What is Givelink?</span>
        <svg class="csc-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
      </button>
      <button class="chat-starter-chip" onclick="useChatStarter(this)">
        <span class="csc-icon">📅</span>
        <span class="csc-text">How can I book a call?</span>
        <svg class="csc-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
      </button>
      <button class="chat-starter-chip" onclick="useChatStarter(this)">
        <span class="csc-icon">🏆</span>
        <span class="csc-text">What awards has Panos won?</span>
        <svg class="csc-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
      </button>`;
    starters.classList.remove('hidden');
  }
}

if (chatNewChat) chatNewChat.addEventListener('click', clearChat);

// ── Book AI: open chat pre-loaded with a book question ──
window.chatOpenWithBook = function(title, author) {
  openChat();
  // Show book-specific starters instead of immediately sending
  const starters = document.getElementById('chatStarters');
  if (starters) {
    starters.innerHTML = '<p class="chat-starters-label">Ask about <em>' + title + '</em></p>' +
      '<button class="chat-starter-chip" onclick="useChatStarter(this)">' +
        '<span class="csc-icon">\uD83D\uDCAD</span>' +
        '<span class="csc-text">How did this book influence Panos\u2019 thinking?</span>' +
        '<svg class="csc-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg>' +
      '</button>' +
      '<button class="chat-starter-chip" onclick="useChatStarter(this)">' +
        '<span class="csc-icon">\uD83D\uDCD6</span>' +
        '<span class="csc-text">What are the key lessons from \u201c' + title + '\u201d?</span>' +
        '<svg class="csc-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg>' +
      '</button>' +
      '<button class="chat-starter-chip" onclick="useChatStarter(this)">' +
        '<span class="csc-icon">\uD83D\uDE80</span>' +
        '<span class="csc-text">How did \u201c' + title + '\u201d apply to Panos\u2019 work?</span>' +
        '<svg class="csc-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg>' +
      '</button>';
    starters.classList.remove('hidden');
  }
  // Pre-fill input with a contextual prompt
  chatInput.value = 'Tell me about "' + title + '" by ' + author + ' \u2014 what did Panos take from it and how did it shape his thinking?';
  chatInput.focus();
  chatInput.select();
};

// ── AI button size toggle ──
const chatSizeToggle = document.getElementById('chatSizeToggle');
function updateSizeToggleUI(isLg) {
  if (!chatSizeToggle) return;
  const expand = chatSizeToggle.querySelector('.size-icon-expand');
  const shrink = chatSizeToggle.querySelector('.size-icon-shrink');
  chatSizeToggle.setAttribute('aria-pressed', String(isLg));
  chatSizeToggle.title = isLg ? 'Restore button size' : 'Make button bigger';
  if (expand) expand.style.display = isLg ? 'none' : '';
  if (shrink) shrink.style.display = isLg ? '' : 'none';
  chatSizeToggle.classList.toggle('active', isLg);
}
if (chatSizeToggle && chatWidget) {
  const savedLg = localStorage.getItem('chat_btn_lg') === '1';
  if (savedLg) chatWidget.classList.add('chat-widget-lg');
  updateSizeToggleUI(savedLg);
  chatSizeToggle.addEventListener('click', () => {
    const isLg = chatWidget.classList.toggle('chat-widget-lg');
    localStorage.setItem('chat_btn_lg', isLg ? '1' : '0');
    updateSizeToggleUI(isLg);
  });
}
