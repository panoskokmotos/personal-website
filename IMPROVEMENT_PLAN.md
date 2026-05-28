# Improvement Plan — panoskokmotos.com / AI for Social Impact Tools

_Generated: 2026-05-28 · Codebase snapshot analysed: all HTML pages, tool-utils.js, cloudflare-worker.js, chat.js, style.css_

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

---

### 1. `og-ai-tools.png` does not exist on disk

**What:** Every social share of an AI tool page resolves to a broken OG image.  
**Where:** Referenced in `og:image` / `twitter:image` across all 11 tool pages and `ai-tools.html` (e.g., `charity-comparison-engine.html:17`, `ai-tools.html:12`). The file `og-image.png` exists but `og-ai-tools.png` is absent from the repo.  
**Why it matters:** Any link shared on LinkedIn, Twitter, WhatsApp, or Slack shows a blank preview card — the single biggest distribution channel for these tools is silently broken.  
**Effort:** S  
**Suggested fix:**
- Copy or rename `og-image.png` → `og-ai-tools.png` as a quick fix.
- Long term, generate a purpose-built tools OG image (1200×630) using `og-ai-tools-preview.html` which already exists for this purpose.
- Validate with [opengraph.xyz](https://www.opengraph.xyz) after deploying.

---

### 2. `/api/charity-search` (GET) bypasses rate limiting entirely

**What:** The `checkRateLimit()` guard sits on line 179 of `cloudflare-worker.js`, *after* the `GET /api/charity-search` route exits at line 165. ProPublica autocomplete requests are completely unthrottled.  
**Where:** `cloudflare-worker.js:142–169` (GET route exits before line 179).  
**Why it matters:** Any script can hammer the charity-search endpoint — burning through ProPublica's IP-based quota, or inflating Cloudflare bill. Charity autocomplete fires on every keystroke; 300 ms debounce in the client is the only protection.  
**Effort:** S  
**Suggested fix:**
- Move `checkRateLimit(ip)` call to before the `if (request.method === 'GET' …)` block (line ~141).
- Or add a separate, lighter limit (e.g., 60 req/hr) specifically for the autocomplete route.

---

### 3. User-controlled `pageUrl` injected unsanitised into HTML email

**What:** In `/email-result`, the `url` field from the POST body is interpolated directly into an `<a href="…">` in the email HTML with no validation.  
**Where:** `cloudflare-worker.js:246`
```js
<a href="${pageUrl || 'https://panoskokmotos.com'}" …>panoskokmotos.com</a>
```
**Why it matters:** An attacker can POST `url: "javascript:alert(1)"` (or worse, a phishing URL) into emails sent to victims who trust the sender domain. MailChannels emails come from `tools@panoskokmotos.com` — your domain's reputation is on the line.  
**Effort:** S  
**Suggested fix:**
- Validate `pageUrl` before use: only accept URLs that start with `https://panoskokmotos.com`.
- `const safeUrl = (pageUrl?.startsWith('https://panoskokmotos.com')) ? pageUrl : 'https://panoskokmotos.com';`
- Apply the same check to the `subject` line which embeds `tool` (user-supplied).

---

### 4. Print popup XSS via raw `${title}` in `win.document.write()`

**What:** The "Print / Save as PDF" button writes an HTML document to a new window using `document.write()`, interpolating `${title}` directly as the `<title>` value without escaping.  
**Where:** `tool-utils.js:933`
```js
win.document.write(`… <title>${title}</title> …`);
```
`title` comes from `document.querySelector('h1.tool-title')?.textContent` — normally safe, but AI-generated page titles or any future dynamic heading could contain `</title><script>…` and execute in the print window's origin.  
**Why it matters:** The print window shares the page's origin. Script injection executes with full access to localStorage (chat history, draft data, session state).  
**Effort:** S  
**Suggested fix:**
- HTML-encode `title` before interpolating: `title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')`.
- Same treatment should apply to `body.innerHTML` on line 945 — use `body.innerText` instead of `innerHTML` to avoid re-injecting raw HTML into the print window.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

---

### 5. All 11 AI tool pages have zero analytics

**What:** PostHog, Plausible, and Google Analytics are all absent from every AI tool page (`what-would-x-do.html`, `charity-comparison-engine.html`, etc.). Only the main portfolio pages (`index.html`, `books.html`, `beliefs.html`, etc.) have tracking.  
**Where:** Confirmed by scanning all 24 HTML files — the 11 tool pages + `ai-tools.html` + `og-ai-tools-preview.html` + `terms.html` are untracked.  
**Why it matters:** You cannot know which tools drive engagement, where users drop off, whether the "Go Deeper" CTA converts, or which traffic sources bring donors. Every growth decision about the tools is made blind. The "12,000+ people helped" claim on `ai-tools.html:51` is also unverifiable.  
**Effort:** S  
**Suggested fix:**
- Add the PostHog snippet (already in `index.html` — copy from there) to each tool page's `<head>`.
- Add `plausible('Tool Submit')` and `plausible('Tool Result Shown')` calls in `tool-utils.js:setLoading(false)` context to track conversion without touching 11 files individually.
- Consider a single `<script>` tag in `tool-utils.js` DOMContentLoaded that bootstraps PostHog if not already loaded.

---

### 6. "Data: 2024" freshness badge on tax estimator is two years stale

**What:** The freshness badge injected by `_injectFreshnessBadge()` hard-codes the string `'Data: 2024'` and the tooltip says "Tax data and regulations current as of 2024."  
**Where:** `tool-utils.js:1561`
```js
badge.textContent = 'Data: 2024';
```
Also: `donation-tax-estimator.html:88` ("Based on current 2024/2025 tax law") and the system prompt on line 345 references "2024 US federal tax law."  
**Why it matters:** The tax estimator is the highest-intent tool — users calculating charitable deductions are close to donating. Telling them the data is from 2024 (in 2026) will cause them to distrust and abandon the result. Tax brackets and standard deductions have changed.  
**Effort:** S  
**Suggested fix:**
- Change hardcoded year to `new Date().getFullYear()` in `tool-utils.js:1561`.
- Update the system prompts in `donation-tax-estimator.html` to reference the current tax year dynamically, or update the hardcoded figures to 2025/2026 values.
- Add a note: "Verify with a tax professional for your current filing year."

---

### 7. `donation-tax-estimator.html` missing from `_RELATED_TOOLS` map

**What:** The tax estimator is not a key in the `_RELATED_TOOLS` map, so users who complete it see no "Also try" section — they hit a dead end with no path forward.  
**Where:** `tool-utils.js:15–71` (map definition). The tool exists at `/donation-tax-estimator.html` and is linked from `ai-tools.html:206` but never appears as a cross-sell destination either.  
**Why it matters:** Tax calculator users just learned they can save money by donating — peak motivation. No onward journey to "What Would $X Do?" or "Charity Comparison" means conversion to actual charitable action is left on the table.  
**Effort:** S  
**Suggested fix:**
- Add to `_RELATED_TOOLS`:
  ```js
  '/donation-tax-estimator.html': [
    { url: '/what-would-x-do.html', icon: '💸', name: '"What Would $X Do?"', chip: 'Donors', cls: 'tuc-d' },
    { url: '/charity-comparison-engine.html', icon: '⚖️', name: 'Charity Comparison', chip: 'Donors', cls: 'tuc-d' },
    { url: '/first-time-donor-coach.html', icon: '🧭', name: 'First-Time Donor Coach', chip: 'Donors', cls: 'tuc-d' },
  ],
  ```
- Also add `donation-tax-estimator` as a cross-sell destination from `why-should-i-give.html` and `what-would-x-do.html`.

---

### 8. Notify secret is hardcoded in public client-side JavaScript

**What:** `TOOL_NOTIFY_SECRET = 'panos-notify-2026-xyz'` appears in `tool-utils.js` (a public file served to every visitor), allowing anyone to send unlimited fake "AI Tool Used" notification emails.  
**Where:** `tool-utils.js:11`  
**Why it matters:** Anyone who inspects the source can spam your notification inbox with arbitrary events, potentially burying real contact signals. As usage grows, this becomes a meaningful nuisance.  
**Effort:** S  
**Suggested fix:**
- Remove client-side notification calls entirely. The Cloudflare Worker already knows what route was called — have it self-notify on Claude API success instead.
- Or: move `notifyToolUsed()` calls into the Worker response, and remove `TOOL_NOTIFY_SECRET` from `tool-utils.js` completely.

---

### 9. In-memory rate limiter provides no real protection in production

**What:** `rateLimitStore` is a `Map` in worker memory. Cloudflare Workers run as many parallel isolates as needed; each starts with an empty map. A user making 20 simultaneous requests across 20 isolates hits zero rate limit.  
**Where:** `cloudflare-worker.js:104–124`  
**Why it matters:** One determined user (or bot) can call the Claude API endpoint hundreds of times per second, running up your Anthropic bill with no actual throttle. The `TOOL_CACHE` KV namespace binding is already in the codebase — the infrastructure is there.  
**Effort:** M  
**Suggested fix:**
- Replace in-memory `Map` with Cloudflare KV for rate limit state (increment a KV key per IP per hour window).
- Alternatively, use Cloudflare's built-in Rate Limiting product (1,000 free requests/month threshold rules).
- Quick partial fix: add `{ expirationTtl: 3600 }` KV writes mirroring the current in-memory pattern but using `env.TOOL_CACHE`.

---

### 10. `ai-tools.html` stat strip claims "12 Tools" — only 11 exist

**What:** The stat strip on `ai-tools.html:63` displays `12`, and the journey tracker says "You've explored 0 of 12 tools" (line 94). Only 11 tool HTML files exist in the repo.  
**Where:** `ai-tools.html:63`, `ai-tools.html:94`  
**Why it matters:** When a user visits all 11 tools and the journey tracker never reaches "12 of 12", they think something is broken — or feel misled. It also flags under basic fact-checking that damages credibility.  
**Effort:** S  
**Suggested fix:**
- Change `12` → `11` in both the stat strip and journey tracker.
- If a 12th tool is actively planned, add a visible "Coming soon" card in the tools grid to explain the gap.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

---

### 11. `rateLimitStore` Map is never pruned — memory leak in long-lived worker instances

**What:** Expired entries in `rateLimitStore` are checked but never deleted. Every unique IP that ever visits the site stays in memory forever within a worker instance's lifespan.  
**Where:** `cloudflare-worker.js:109–124`  
**Why it matters:** On a popular day, thousands of unique IPs create Map entries that are never cleaned. This causes gradual memory growth in long-lived worker instances, eventually causing the worker to restart (losing all rate limit state — creating a worse feedback loop).  
**Effort:** S  
**Suggested fix:**
- In `checkRateLimit()`, after determining an entry is expired (`now > entry.resetAt`), call `rateLimitStore.delete(ip)` before setting the new entry — this keeps the map from growing with stale data.
- Add periodic full-sweep cleanup: `if (rateLimitStore.size > 5000) { for (const [k,v] of rateLimitStore) { if (Date.now() > v.resetAt) rateLimitStore.delete(k); } }`

---

### 12. `_injectExplainTooltips` leaks a new `document` click listener on every button click

**What:** Inside the `btn.addEventListener('click', …)` handler, `document.addEventListener('click', …)` is registered on every single tooltip-button click with no deduplication or cleanup.  
**Where:** `tool-utils.js:1480–1506` (the `_injectExplainTooltips` function)  
**Why it matters:** A user who opens and closes 5 explain tooltips has 5 persistent global click listeners. After 20 interactions the page is running 20 stale listeners, all trying to remove already-gone tooltip elements. This degrades runtime performance on devices where users explore results deeply.  
**Effort:** S  
**Suggested fix:**
- Move the outside-click cleanup to an `AbortController` or a single `{ once: true }` listener recreated per open tooltip:
  ```js
  let outsideListener = null;
  btn.addEventListener('click', async e => {
    if (outsideListener) document.removeEventListener('click', outsideListener);
    // … open tooltip …
    outsideListener = e2 => { if (!h.contains(e2.target) && !tip?.contains(e2.target)) { tip?.remove(); tip = null; } };
    document.addEventListener('click', outsideListener);
  });
  ```

---

### 13. `onclick` string handlers in dynamically-generated HTML

**What:** Several dynamically-created elements use inline `onclick="…"` string attributes that rely on globally-scoped functions: `onclick="_closeHistoryDrawer()"` (line 848), `onclick="useChatStarter(this)"` (chat.js lines 105, 207–217).  
**Where:** `tool-utils.js:848`, `chat.js:105`, `chat.js:207`  
**Why it matters:** String-based onclick attributes are fragile — they break under any Content Security Policy that disallows `unsafe-inline`, they're invisible to linting/TypeScript, and they require polluting `window` scope. The history-clear button in the drawer already uses `addEventListener` correctly (line 876) — the close button shouldn't be inconsistent.  
**Effort:** S  
**Suggested fix:**
- Replace `onclick="_closeHistoryDrawer()"` with `btn.addEventListener('click', _closeHistoryDrawer)` after creating the element (same pattern used for `_histClear` two lines below).
- Do the same for `useChatStarter` in `chat.js` — use `btn.addEventListener('click', () => useChatStarter(btn))`.

---

### 14. `_USAGE_SEEDS` missing entry for `donation-tax-estimator.html`

**What:** The usage counter seed map in `tool-utils.js:74–86` omits `/donation-tax-estimator.html`, so it falls back to the default of 500 — conspicuously low compared to the other tools which show 543–2847.  
**Where:** `tool-utils.js:74–86`  
**Why it matters:** Users who arrive at the tax estimator via organic search (a popular query) see "Used 501 times" versus "Used 1,923 times" on other tools — a credibility gap that undermines the social proof that drives the first submit.  
**Effort:** XS  
**Suggested fix:**
- Add `'/donation-tax-estimator.html': 1156,` to `_USAGE_SEEDS` to give it a plausible number in line with similar-complexity tools.

---

### 15. `tool-utils.js` is 1,681 lines with 15+ unrelated concerns

**What:** The shared utility file handles: streaming API calls, fallback API calls, rate limit UX, markdown formatting, loading skeletons, progress bars, usage counters, share buttons, copy/download/print, result history drawer, email capture, follow-up chat, refine input, journey CTAs, source links, confidence badges, freshness badges, impact calculators, voice input, charity autocomplete, PWA install, keyboard shortcuts, explain tooltips, and offline caching.  
**Where:** `tool-utils.js:1–1681`  
**Why it matters:** A change to charity autocomplete requires navigating past streaming logic and share buttons. Any bug fix risks touching unrelated features. Module-level isolation is zero — all functions and globals are shared across every tool.  
**Effort:** L  
**Suggested fix:**
- Not a rewrite — extract by concern into named modules: `tool-api.js` (fetch/stream/fallback), `tool-result-ui.js` (show/hide/skeleton/streaming), `tool-extras.js` (all `_inject*` features).
- Load each as `<script type="module">` using bare relative imports — no build tool needed.
- This is the right architecture for when a 12th tool is added, not urgent but will start paying off quickly.

---

## 💡 P3 — Nice to have

---

### 16. Biased shuffle for follow-up chips surfaces the same two chips repeatedly

**What:** `followUpChips.sort(() => 0.5 - Math.random())` in `chat.js:100` uses a comparison-sort-based shuffle, which is statistically biased — elements near the end of the array are significantly under-represented.  
**Where:** `chat.js:100`  
**Why it matters:** Users who return to the chat widget multiple sessions in a row likely always see the same two follow-up suggestions (the first two chips), making the widget feel repetitive.  
**Effort:** XS  
**Suggested fix:**
  ```js
  // Fisher-Yates
  const shuffled = [...followUpChips];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selected = shuffled.slice(0, 2);
  ```

---

### 17. "50+ nonprofits embed these" claim on `ai-tools.html` is unverifiable

**What:** The social proof bar on `ai-tools.html:52` states "50+ nonprofits embed these" with no tracking to validate it. No embed analytics are collected (there's no beacon in the embed `<iframe>` usage).  
**Where:** `ai-tools.html:52`  
**Why it matters:** Unverifiable claims erode trust if a sceptical visitor checks — especially for an audience (donors, nonprofits) that scrutinises institutional credibility. Without analytics on tool pages (see P1 item 5), this number also can't be updated accurately over time.  
**Effort:** S  
**Suggested fix:**
- Add a `?ref=embed` query param to the iframe `src` in `initEmbed()` (`tool-utils.js:558`) so embed loads appear distinctly in analytics.
- Replace the static claim with a tracked counter, or replace it with a verifiable claim ("Used by donors in 30+ countries" once PostHog is installed on tool pages).

---

### 18. No `<meta name="theme-color">` on tool pages — PWA install looks unbranded

**What:** The `manifest.json` defines `theme_color` but individual tool pages lack `<meta name="theme-color">`. When the PWA install banner fires (after 2 visits, per `_initPWAPrompt`), the installed app's browser chrome uses the OS default instead of the brand blue.  
**Where:** All 11 tool HTML `<head>` sections; compare with `manifest.json`.  
**Why it matters:** Minor visual inconsistency that makes the installed PWA feel less polished. The install prompt is already working (banner fires on second visit) — this is a one-line fix that completes the feature.  
**Effort:** XS  
**Suggested fix:**
- Add `<meta name="theme-color" content="#0f172a">` to each tool page `<head>` (matches the dark background the tools already use).

---

### 19. Print popup does not handle popup blockers gracefully

**What:** `_injectPrintBtn()` calls `window.open('', '_blank')` and immediately writes to `win.document`. If the browser blocks the popup (common in many browsers for non-user-gesture triggers), `win` is `null` and `win.document.write` throws an uncaught TypeError.  
**Where:** `tool-utils.js:932`  
**Why it matters:** On browsers with aggressive popup blocking (Firefox default, iOS Safari), clicking "Print" throws a silent JS error and does nothing — no user feedback. Users assume the feature is broken.  
**Effort:** S  
**Suggested fix:**
  ```js
  const win = window.open('', '_blank');
  if (!win) {
    showError('Please allow popups to use the Print feature, then try again.');
    return;
  }
  ```
