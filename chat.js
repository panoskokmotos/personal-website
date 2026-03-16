// ── Ask Panos AI Chat ──
// Replace WORKER_URL with your deployed Cloudflare Worker URL after deploying cloudflare-worker.js
const WORKER_URL = 'https://ask-panos.YOUR-SUBDOMAIN.workers.dev';

const chatWidget   = document.getElementById('chatWidget');
const chatToggle   = document.getElementById('chatToggle');
const chatClose    = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const chatInput    = document.getElementById('chatInput');
const chatSend     = document.getElementById('chatSend');

const STORAGE_KEY = 'panos_chat_v1';
let messages = []; // conversation history

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
  p.textContent = text;
  div.appendChild(p);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
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

  const thinkingEl = addMessage('thinking', 'Thinking…');

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

// ── Clear chat (exposed for potential use) ──
function clearChat() {
  messages = [];
  localStorage.removeItem(STORAGE_KEY);
  chatMessages.innerHTML = '<div class="chat-msg bot"><p>👋 Hi! I\'m Panos\'s AI assistant. Ask me anything about his work, Givelink, the podcast, or how to get in touch!</p></div>';
  const starters = document.getElementById('chatStarters');
  if (starters) starters.classList.remove('hidden');
}
