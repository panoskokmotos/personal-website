# panoskokmotos.com — Personal Website

**Live site:** [panoskokmotos.com](https://panoskokmotos.com)

A cinematic personal website for Panos Kokmotos — Co-Founder & COO of [Givelink](https://givelink.app/en), Forbes 30 Under 30 Greece, WEF Global Shaper, and Podcast Host.

---

## ✨ Features

- **Dark / Light mode** — toggles and persists via `localStorage`
- **AI Chat Widget** — digital twin powered by Claude (Anthropic) via Cloudflare Worker proxy
- **Interactive Journey** — gamified milestone timeline with XP bar, achievement toasts, and a walking character
- **Cinematic scroll effects** — parallax hero orbs, fade-in animations, scroll progress bar
- **Real book covers** — Open Library Covers API with graceful fallbacks
- **Animated counters** — impact stats that count up on scroll
- **Responsive** — mobile-first, tested down to 320px
- **Fast** — zero frameworks, vanilla JS, lazy-loaded iframes

---

## 🗂️ File Structure

```
/
├── index.html          # Main page (all sections)
├── style.css           # All styles (dark/light, animations, components)
├── script.js           # Interactions (nav, counters, gamification, theme, confetti)
├── chat.js             # AI chat widget logic
├── cloudflare-worker.js# Cloudflare Worker: Claude API proxy + system prompt
├── photo.jpg           # Profile photo (avatar, OG image, favicon)
├── CNAME               # Custom domain: panoskokmotos.com
└── README.md           # This file
```

---

## 🛠️ Local Development

No build tools needed. Just open with a local server:

```bash
# Python (built-in)
python3 -m http.server 8000

# Then visit: http://localhost:8000
```

---

## 🤖 AI Chat — Setup

The chat widget uses a **Cloudflare Worker** as a secure proxy to the Anthropic API (so the API key never touches the browser).

1. Create a free [Cloudflare Workers](https://workers.cloudflare.com/) account
2. Deploy `cloudflare-worker.js` as a new Worker
3. Set the secret `ANTHROPIC_API_KEY` in the Worker's environment variables
4. Update the `WORKER_URL` constant in `chat.js` with your Worker's URL

---

## 📬 Contact Form — Setup

The form uses [Formspree](https://formspree.io):

1. Sign up at [formspree.io](https://formspree.io)
2. Create a new form → copy the Form ID
3. Replace `YOUR_FORM_ID` in `index.html` line ~740

---

## 📊 Analytics

The site uses [Plausible Analytics](https://plausible.io) (privacy-friendly, no cookies):

1. Sign up at [plausible.io](https://plausible.io)
2. Add `panoskokmotos.com` as a site
3. The script tag is already in `<head>` — it activates once the domain is verified

---

## 🚀 Deployment

Hosted on **GitHub Pages** with a custom domain via Namecheap DNS.

- Push to `main` → auto-deploys to `panoskokmotos.com`
- HTTPS enforced via GitHub Pages + Cloudflare SSL

---

## 📋 To-Do / Pending

- [ ] Replace `YOUR_FORM_ID` in contact form with real Formspree ID
- [ ] Add real LinkedIn post URLs to the 3 `.li-card` cards (currently link to profile)
- [ ] Deploy Cloudflare Worker and set `WORKER_URL` in `chat.js`

---

© 2026 Panos Kokmotos · [panoskokmotos.com](https://panoskokmotos.com)
