// ── Ask Panos AI Chat ──
// Replace WORKER_URL with your deployed Cloudflare Worker URL after deploying cloudflare-worker.js
const WORKER_URL = 'https://ask-panos.YOUR-SUBDOMAIN.workers.dev';

const chatWidget  = document.getElementById('chatWidget');
const chatToggle  = document.getElementById('chatToggle');
const chatClose   = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const chatInput   = document.getElementById('chatInput');
const chatSend    = document.getElementById('chatSend');

let messages = []; // conversation history

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
  chatInput.value = btn.textContent;
  document.getElementById('chatStarters').classList.add('hidden');
  sendMessage();
}
