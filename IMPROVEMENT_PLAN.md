# Givelink Personal Website — Improvement Plan

Audit date: 2026-05-30 · Scope: all HTML, CSS, JS, and Cloudflare Worker files.

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. `og-ai-tools.png` does not exist — all 12 AI tool social cards are broken

**What:** Every AI tool page references `/og-ai-tools.png` for both `og:image` and `twitter:image`, but the file does not exist in the repository (only `og-image.png` exists).

**Where:** All 12 AI tool pages — e.g. `what-would-x-do.html:20-21`, `charity-comparison-engine.html`, `scam-nonprofit-detector.html`, etc. (24 broken `<meta>` tags total), plus `ai-tools.html`.

**Why it matters:** Every link shared on Twitter/X, LinkedIn, WhatsApp, and iMessage shows a blank grey card instead of a preview image. This kills the shareability and social virality that the WhatsApp share button and Twitter share button are designed to drive.

**Effort:** S

**Suggested fix:**
- Create `og-ai-tools.png` (1200×630) with a tools-hub design — the existing `generate_og.py` script can be adapted.
- OR: point all tool pages at the existing `og-image.png` as a temporary fix while a dedicated image is created.
- The `og-ai-tools-preview.html` file already exists to visually prototype the OG design.

---

### 2. Email capture and contact notifications silently broken (MailChannels free tier deprecated)

**What:** Both the "Email me this result" feature (`/email-result` route) and the contact-form notification (`/notify` route) use MailChannels (`api.mailchannels.net`). MailChannels ended its free-tier integration with Cloudflare Workers in May 2024. The worker returns HTTP 202 as if successful, but emails are never delivered.

**Where:** `cloudflare-worker.js:204-228` (notify route), `cloudflare-worker.js:252-286` (email-result route). Worker comment at line 204 still reads "free on Cloudflare Workers — no signup required."

**Why it matters:** Users who enter their email address to receive their AI result get a "✓ Sent!" confirmation but receive nothing. This is the feature most likely to convert a one-time visitor into a returning user. Silent failures also mean Panos is not getting notified of contact form submissions.

**Effort:** M

**Suggested fix:**
- Switch to a transactional email provider that has a Cloudflare Workers-compatible API and a free tier (Resend, Postmark, or SendGrid all work).
- Update the `from` address domain with proper SPF/DKIM records after switching providers.
- Until fixed: remove the "Email me this result" UI element rather than showing a false success state.

---

### 3. Rate-limit error countdown is a lie — shows "wait 30s" but actual cooldown is up to 1 hour

**What:** `_showRateLimitError()` displays a 30-second countdown and then hides the error. The actual server-side rate limit is 20 requests per hour per IP. After the 30-second countdown clears the error, users immediately retry, hit the limit again, see another countdown, and repeat — a frustrating loop.

**Where:** `tool-utils.js:205-219`

**Why it matters:** A misleading countdown turns a recoverable limitation into an active source of frustration. Users who hit the limit are the most engaged users — this is the worst moment to mislead them.

**Effort:** S

**Suggested fix:**
- Change the countdown to accurately reflect the hourly reset window (show minutes remaining, not 30 seconds).
- On 429, disable the submit button and show a non-countdown message: *"You've reached today's free limit. Come back in ~1 hour, or email panagiotis.kokmotoss@gmail.com directly."*
- Consider bumping the rate limit to 30–40 req/hour; 20/hour is tight for a legitimate research session.

---

### 4. "Email me this result" send button permanently disabled after success — users cannot resend

**What:** In `_injectEmailCapture`, `this.disabled = true` is set before the `fetch` call and is only re-enabled in the `catch` block (on failure). On success, the button stays disabled. A user who made a typo in their address cannot correct it and send again.

**Where:** `tool-utils.js:741-760`

**Why it matters:** This is a dead end for a user who wants to share a result with a colleague at a different address. It silently breaks a core conversion action.

**Effort:** S

**Suggested fix:**
- After setting the success text, add `setTimeout(() => { this.textContent = 'Send →'; this.disabled = false; document.getElementById('_emailCapInput').value = ''; }, 3000)` to reset the button.
- Or: replace the button with a persistent "✓ Sent!" badge and render a fresh `Send another` link.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 5. `formatMarkdown` ignores headings and lists — AI output renders as garbled raw text

**What:** `formatMarkdown()` only converts `**bold**` and newlines to `<br>`. Claude's responses frequently contain `## Heading`, `### Sub-heading`, `- bullet item`, and numbered lists, which all render as raw text prefixes (`## `, `- `) cluttering the result.

**Where:** `tool-utils.js:222-226`

**Why it matters:** Every single AI result in every tool is rendered through this function. Broken markdown means the output looks unprofessional and harder to scan. This is the single biggest presentation bug affecting all 12 tools.

**Effort:** M

**Suggested fix:**
- Extend `formatMarkdown` to handle: `## heading` → `<h3>`, `- item` / `* item` → `<ul><li>`, numbered lists `1. item` → `<ol><li>`, and `\`code\`` → `<code>`.
- Keep it a pure function (no regex library dependency) — these 5 patterns cover ~95% of Claude's output style.
- Add `line-height: 1.7` and `margin-bottom: 0.5em` to list items in `style.css` for the result area.

---

### 6. Proactive chat auto-opens on every new browser session — returning visitors are always interrupted

**What:** The 15-second auto-open timer uses `sessionStorage`, which resets every time the user opens a new browser tab or restarts their browser. A repeat visitor who opens the site daily will see the chat forcibly open every single visit.

**Where:** `script.js:464-488`

**Why it matters:** Auto-opening chat is intrusive. Done once for first-time visitors it can delight; done every session it trains users to close the site or block the widget. This is especially damaging because the proactive trigger replaces the welcome message with a more aggressive prompt.

**Effort:** S

**Suggested fix:**
- Change `sessionStorage.getItem('chat_proactive_done')` / `sessionStorage.setItem(...)` to `localStorage` — this fires at most once per device.
- Add a longer cooldown: `if (localStorage.getItem('chat_proactive_ts') && Date.now() - parseInt(...) < 7 * 86400000) return;` to limit re-triggers to once per week maximum.

---

### 7. Freshness badge shows "Data: 2024" — now two years stale, actively misleads users

**What:** `_injectFreshnessBadge()` hardcodes the string `'Data: 2024'` on the Donation Tax Estimator and Nonprofit Health Checker pages.

**Where:** `tool-utils.js:1560-1562`

**Why it matters:** Tax rules and nonprofit data change annually. A badge saying 2024 on a tool someone uses in 2026 to make a real financial decision signals that the analysis may be outdated. This is the opposite of the trust signal it was meant to provide.

**Effort:** S

**Suggested fix:**
- Replace the hardcoded year with `new Date().getFullYear()` so the badge always shows the current year.
- Update the tooltip to: `'Data current as of ${year}. Always verify with a tax professional.'`

---

### 8. Chat `sendMessage` calls `res.json()` on any HTTP response without checking `res.ok`

**What:** If the Cloudflare Worker returns an HTML error page (e.g., a Cloudflare 503 when the worker is overloaded), `res.json()` throws a `SyntaxError`, which lands in the generic `catch` block showing "Connection error." The 429 rate-limit JSON is handled correctly only because the worker returns valid JSON for it — any other server-side error is swallowed silently.

**Where:** `chat.js:165-168`

**Why it matters:** When the AI service is degraded, users see a confusing generic error that gives them no actionable next step. On tool pages, `callWorker()` correctly checks `res.status === 429` before parsing JSON (`tool-utils.js:131`) — the chat widget doesn't.

**Effort:** S

**Suggested fix:**
```js
const data = res.ok
  ? await res.json()
  : await res.json().catch(() => ({ text: null }));
const reply = data.text || (res.status === 429
  ? "You've sent a lot of messages! Please wait before trying again."
  : 'Temporary error. Please try again or email panagiotis.kokmotoss@gmail.com.');
```

---

### 9. Notify secret exposed in public client-side JavaScript

**What:** `TOOL_NOTIFY_SECRET = 'panos-notify-2026-xyz'` is hardcoded in `tool-utils.js:11` and repeated in `script.js:931`. Any visitor can read it and POST arbitrary events to the `/notify` endpoint, sending emails to Panos's inbox.

**Where:** `tool-utils.js:11`, `script.js:931`

**Why it matters:** While the comment acknowledges this is deliberate ("only protects against random noise"), the secret is effectively public. Automated scrapers and bots can (and do) harvest secrets from JS files. As the site grows, inbox flooding becomes a real risk — especially since the email sender is `notify@panoskokmotos.com`, making filters unreliable.

**Effort:** M

**Suggested fix:**
- Remove the `/notify` call entirely from `tool-utils.js` (tool usage notifications). Tool usage is already tracked via Plausible and PostHog.
- For the contact form notification in `script.js`, remove the client-side notify call and rely solely on Formspree's built-in email notification, which is server-side and doesn't expose a secret.

---

### 10. "Ask AI about this org" button opens chat and immediately sends without waiting for animation

**What:** `_injectAskAbout()` does `widget.classList.add('open')` then synchronously sets `inp.value` and calls `send.click()`. On mobile (where `openChat()` has a 320ms animation delay), the keyboard hasn't opened yet and `chatMessages` hasn't scrolled — the sent message may not be visible.

**Where:** `tool-utils.js:1114-1126`

**Why it matters:** This button is a key cross-sell feature on the three highest-intent tool pages (Scam Detector, Health Checker, Comparison Engine). A broken or visually glitchy trigger on these pages hurts trust at the moment of highest engagement.

**Effort:** S

**Suggested fix:**
- Import or inline the `openChat()` function pattern so it handles the mobile delay, then use a `setTimeout` to defer the send: `setTimeout(() => send.click(), isMobile ? 380 : 0)`.
- Alternatively, pre-fill the input and show the widget open without auto-sending — let the user consciously press Enter.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 11. Dead drag handler on `.logos-strip-wrap` — two conflicting mousedown listeners

**What:** `script.js:120-150` registers a drag handler that uses `wrap.scrollLeft` to move the logos strip. `script.js:862-922` registers a second, superior handler that uses CSS `translateX` and properly resumes the marquee animation. Both are attached to the same element. The first handler's `wrap.scrollLeft` manipulations are no-ops (the strip isn't overflow-scrollable) but it still calls `e.preventDefault()` and fires `wrap.classList.add('dragging')` on every mousedown.

**Where:** `script.js:120-150` (dead), `script.js:862-922` (working)

**Effort:** S

**Suggested fix:**
- Delete lines 120–150 entirely. The second implementation is complete and correct.
- Confirm the logos strip has `overflow: hidden` (not `overflow-x: auto`) to document that `scrollLeft` was never the right approach.

---

### 12. Hero particle canvas runs at 60 fps indefinitely — no pause on scroll or hidden tab

**What:** The `draw()` function in `script.js:658-675` calls `requestAnimationFrame(draw)` unconditionally forever. The hero section is typically out of viewport after the user scrolls 10% of the page, but the canvas keeps running.

**Where:** `script.js:627-675`

**Why it matters:** A continuous 60fps canvas loop on a CPU with 80 particles burns measurable battery on mobile and creates a background throttling burden on low-end devices.

**Effort:** S

**Suggested fix:**
- Use `IntersectionObserver` on the hero canvas: start the loop on `isIntersecting`, cancel it (`cancelAnimationFrame`) when not.
- Also add `document.addEventListener('visibilitychange', ...)` to pause when the tab is hidden.

---

### 13. `tool-utils.js` is 1,681 lines mixing 10+ unrelated responsibilities

**What:** A single file handles API calls, DOM injection (17+ functions), markdown formatting, localStorage history, canvas image generation, PDF printing, voice input, charity autocomplete, PWA install prompts, keyboard shortcuts, and offline caching.

**Where:** `tool-utils.js:1-1681`

**Why it matters:** Every AI tool page loads the entire 1,681-line file even if it only uses 3–4 of the features. Adding a feature to one area risks breaking another. The file has no tests and no clear interface boundaries.

**Effort:** L

**Suggested fix:**
- Split into logical modules: `api.js` (callWorker, formatMarkdown), `result-actions.js` (inject* functions), `history.js`, `autocomplete.js`, `voice.js`. Keep a `tool-utils.js` that imports and re-exports them.
- Since there's no bundler, use native ES modules (`type="module"`) — all modern browsers support them and GitHub Pages serves them fine.

---

### 14. `followUpChips.sort(() => 0.5 - Math.random())` — biased shuffle, same chips appear 70% more often

**What:** The built-in `Array.sort` with a random comparator is not a uniform shuffle. Due to how V8 implements Timsort, certain array positions are sampled more frequently. In a 4-element array, the first chip appears ~40% of the time instead of the expected 25%.

**Where:** `chat.js:100`

**Effort:** S

**Suggested fix:**
```js
// Fisher-Yates
const shuffled = [...followUpChips];
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}
const picked = shuffled.slice(0, 2);
```

---

### 15. Inline `onclick` attributes on modal close buttons rely on implicit global scope

**What:** `_openHistoryDrawer()` injects `<button class="hist-close" onclick="_closeHistoryDrawer()">` and `_openShortcutModal()` injects `<button ... onclick="_closeShortcutModal()">`. These work today because the functions are module-level in a non-strict script, making them implicit globals. Any future move to ES modules or a bundler will break them silently.

**Where:** `tool-utils.js:848`, `tool-utils.js:1630`

**Effort:** S

**Suggested fix:**
- Replace inline `onclick` with `addEventListener` after inserting the element, exactly as done for the adjacent `hist-restore` buttons and the `_embToggle` — the pattern is already established in the same file.

---

### 16. "Go Deeper" button uses blocking fetch on a 2,048-token Sonnet response — no streaming

**What:** `_injectGoDeeperBtn()` calls `/api/v2/tool` via a standard `fetch().then(res.json())`. With `max_tokens: 2048` on Claude Sonnet, this can take 15–25 seconds with no visual progress. Meanwhile, the basic Haiku call streams progressively via `/api/v1/stream`.

**Where:** `tool-utils.js:1279-1286`, `cloudflare-worker.js:368-405`

**Why it matters:** The "Go Deeper" feature is the upsell from the free basic result to a premium-quality analysis. A 20-second blank wait before showing any content is the most common cause of abandonment.

**Effort:** M

**Suggested fix:**
- Add a `/api/v2/stream` endpoint to the Cloudflare Worker that mirrors `/api/v1/stream` but uses `claude-sonnet-4-6` and `max_tokens: 2048`.
- Update `_injectGoDeeperBtn` to call `callWorker(sys, msg)` (which already handles streaming + progressive rendering) instead of the blocking fetch.

---

## 💡 P3 — Nice to have

### 17. Confetti canvas is not responsive — fixed dimensions on orientation change

**What:** `canvas.width = window.innerWidth; canvas.height = window.innerHeight` is set once at creation (`script.js:169-170`). On orientation change or window resize, the canvas retains its original dimensions, causing a misaligned or clipped animation.

**Where:** `script.js:162-210`

**Effort:** S

**Suggested fix:**
- Add a `window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; })` inside the confetti IIFE.

---

### 18. Voice input buttons are only added to fields present at `DOMContentLoaded` — dynamic fields missed

**What:** `_initVoiceInput()` runs once on DOMContentLoaded and wraps all `input[type="text"]` and `textarea` elements at that moment. The refine input (`#_refineInput`) and follow-up chat input (`#_followInput`) are injected into the DOM later (after a result is shown), so they never receive voice buttons.

**Where:** `tool-utils.js:1344-1376`

**Effort:** S

**Suggested fix:**
- Use a `MutationObserver` on `document.body` to watch for new inputs/textareas added to the DOM, and apply the same wrapping logic to them — or explicitly call the wrapper on each dynamically created input in `_injectRefineInput` and `_injectFollowUpChat`.

---

### 19. Hardcoded `_USAGE_SEEDS` fabricate social proof — creates a trust risk

**What:** The usage counter shown on each tool page (`"Used 2,847 times by donors & changemakers"`) is a client-side seed value plus a per-device localStorage increment. The seeds are arbitrary numbers in `tool-utils.js:74-86`. A user who opens DevTools can immediately see the fabricated baseline.

**Where:** `tool-utils.js:74-86`, `tool-utils.js:510-524`

**Why it matters:** Fabricated social proof is a trust liability. If a journalist or skeptical user spots it, the credibility of all 12 tools is undermined. Actual usage data is available in PostHog and Plausible.

**Effort:** M

**Suggested fix:**
- Fetch real usage counts from a lightweight Cloudflare KV endpoint on page load (or pre-render them into the HTML at deploy time via a GitHub Actions script that reads from PostHog API).
- If real data isn't available immediately, remove the usage count widget rather than show made-up numbers.

---

### 20. Brand colors scattered as hardcoded hex in JavaScript — reskins are fragile

**What:** The confidence badge, milestone toast, share card canvas, and print template all hardcode hex values (`#16a34a`, `#d97706`, `#6b7280`, `#3b6ef8`, `#7c3aed`, `#f8fafc`, `#1a2e4a`) instead of reading from CSS custom properties. The Givelink gradient in `.btn-givelink` uses `#6c4bff`/`#ff6268`, which approximates but doesn't precisely match the documented brand palette (`#6B3FA0`/`#5718CA` purple, `#C2185B`/`#E353B6` pink).

**Where:** `tool-utils.js:1139-1147` (confidence badge), `tool-utils.js:253-256` (milestone toast), `tool-utils.js:1213-1219` (share card canvas), `tool-utils.js:933-940` (print template), `style.css` (`.btn-givelink`)

**Effort:** S

**Suggested fix:**
- Read CSS variables at runtime with `getComputedStyle(document.documentElement).getPropertyValue('--blue')` for JS-rendered elements, or set CSS variables for brand values and derive from them.
- Reconcile `.btn-givelink` gradient with the actual Givelink brand hex values to ensure on-brand consistency across the portfolio site and the product.
