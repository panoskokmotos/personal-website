# Givelink / panoskokmotos.com — Improvement Plan

_Generated 2026-07-02 via full codebase audit. Max 20 items, ordered by ROI within each tier._

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. XSS: AI output injected as raw HTML without sanitization

**What:** Every bot reply and AI tool result is set via `innerHTML` after only a two-regex "markdown" transform — no escaping or sanitization. The history drawer also stores and re-renders raw `innerHTML`, creating a persistent XSS sink.

**Where:**
- `chat.js:79` — `p.innerHTML = parseMarkdown(text)`
- `tool-utils.js:169, 176, 335, 340` — `resultBody.innerHTML = formatMarkdown(fullText)`
- `tool-utils.js:807` — `html: document.getElementById('resultBody')?.innerHTML` (stored and later re-rendered)

**Why it matters:** A prompt-injection attack or server compromise can deliver JavaScript payloads to every visitor who opened the chat or ran a tool. The stored-history path makes it persistent across sessions on the same device.

**Effort:** S

**Suggested fix:**
- Add DOMPurify (`<script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js">`) once in a shared `<head>` include.
- Replace every `el.innerHTML = formatMarkdown(text)` with `el.innerHTML = DOMPurify.sanitize(formatMarkdown(text))`.
- Strip stored `html` from history entries — store only plain `text` and re-run `formatMarkdown` + sanitize on render.

---

### 2. NOTIFY_SECRET hardcoded in publicly served JS

**What:** The MailChannels notification secret is hardcoded in two client-side files that every visitor downloads.

**Where:**
- `script.js:931` — `const NOTIFY_SECRET = "panos-notify-2026-xyz"`
- `tool-utils.js:11` — `const TOOL_NOTIFY_SECRET = 'panos-notify-2026-xyz'`

**Why it matters:** Anyone who views source can fire unlimited POST requests to `/notify`, burning the MailChannels free sending quota and flooding your inbox. The comment in the code says "only protects against random noise" — that is accurate but understates the risk of deliberate abuse.

**Effort:** M

**Suggested fix:**
- Remove the `/notify` endpoint from the Worker entirely and use a server-side webhook (e.g., a Cloudflare Queue triggered on Formspree submission) so no shared secret needs to live in client code.
- Short-term: rotate the secret to something not in version-control history, and enforce a stricter per-IP rate limit (≤3/hour) specifically on the `/notify` route in the Worker.
- Add a `sendgrid` or `resend` integration rather than MailChannels if deliverability becomes an issue.

---

### 3. PostHog initializes before GDPR consent is given

**What:** PostHog loads unconditionally in `<head>` on page load. The GDPR banner only gates Google Analytics. PostHog starts capturing IPs, sessions, and custom events regardless of whether the user clicks "Accept" or "Decline."

**Where:**
- `index.html:514–521` — unconditional PostHog init snippet
- Cookie banner logic at `index.html:550–567` — `_loadGA()` is called on accept; PostHog has no equivalent deferred-load path

**Why it matters:** GDPR Article 7 requires prior consent before any analytics tracking. Running PostHog on EU visitors without consent is a regulatory risk, and the banner explicitly mentions PostHog by name in the consent text, which makes the gap obvious to any auditor.

**Effort:** S

**Suggested fix:**
- Move the PostHog init snippet into a `_loadPostHog()` function mirroring the existing `_loadGA()` pattern.
- Call `_loadPostHog()` inside the `cookieAccept.onclick` handler alongside `_loadGA()`.
- On decline, call `posthog.opt_out_capturing()` if the snippet was already loaded (guard with `typeof posthog !== 'undefined'`).

---

### 4. Contact form shows `alert()` on error — broken on mobile

**What:** When the Formspree POST returns a non-2xx or the fetch throws, the contact form calls `alert('...')` instead of using the styled error UI used everywhere else on the site.

**Where:**
- `script.js:405` — `alert('Something went wrong. Please try again.')`
- `script.js:411` — `alert('Network error. Please email panagiotis.kokmotoss@gmail.com directly.')`

**Why it matters:** On mobile, `alert()` looks like a browser security warning (phishing appearance). It also blocks the main thread. The rest of the UI shows inline error messages — this is the only exception, and it's on the most conversion-critical page section.

**Effort:** S

**Suggested fix:**
- Add a `<p id="contactError" class="form-error" role="alert"></p>` element below the submit button in `index.html`.
- Replace both `alert()` calls with `document.getElementById('contactError').textContent = '...'` and scroll the error into view.
- Mirror the success banner's CSS class pattern (`.visible`) for show/hide.

---

### 5. Missing `og-ai-tools.png` causes broken social previews on all tool pages

**What:** Every tool page's `<meta property="og:image">` references `/og-ai-tools.png`, which does not exist in the repository. Only `/og-ai-tools-preview.html` (the generator template) is committed.

**Where:**
- All 11 tool HTML files, e.g., `what-would-x-do.html:14`, `why-should-i-give.html:14`, etc. — `content="/og-ai-tools.png"`

**Why it matters:** Every share of a tool page on LinkedIn, Twitter, WhatsApp, or Slack shows a blank/broken image. This is the highest-traffic acquisition channel for tool pages (AI tool shares go viral). The first impression is broken.

**Effort:** S

**Suggested fix:**
- Run `generate_og.py` (or open `og-ai-tools-preview.html` in a browser and screenshot) to produce `og-ai-tools.png` and commit it to the repo root.
- Alternatively, generate individual per-tool OG images using the existing preview template with a `?tool=...` param and update each page's meta tag.
- Add `og-ai-tools.png` to the link-checker script so a missing image file would fail CI in the future.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 6. PostHog not initialized on any of the 11 AI tool pages

**What:** PostHog analytics is missing from every tool page. There is zero behavioral data on how users interact with the AI tools suite — the most active part of the product.

**Where:**
- `what-would-x-do.html`, `why-should-i-give.html`, `first-time-donor-coach.html`, `charity-comparison-engine.html`, `scam-nonprofit-detector.html`, `nonprofit-health-checker.html`, `volunteer-match.html`, `what-can-i-donate.html`, `impact-story-generator.html`, `community-needs-map.html`, `neighborhood-giving-map.html` — all lack PostHog init

**Why it matters:** You cannot optimize what you cannot see. Which tools convert to email captures? Which have high bounce before submitting? Which "Go Deeper" features are used? All unknown. The intent-detection event (`contact_intent`) that fires in the chat also can't fire from tool pages.

**Effort:** S

**Suggested fix:**
- Add the PostHog snippet (with consent gate per fix #3) to `tool-utils.js` as a conditional init, so it loads automatically for every page that includes `tool-utils.js`.
- Emit a `tool_result_shown`, `tool_email_captured`, and `tool_go_deeper_clicked` event at the relevant points in `tool-utils.js`.
- This covers all 11 tools in one edit to a single file.

---

### 7. Dark mode is forced on every page load — light-mode preference is ignored

**What:** `script.js` unconditionally sets `data-theme="dark"` on `<html>` on every page load, overriding the user's OS preference and any previously saved preference.

**Where:**
- `script.js:117` — `document.documentElement.setAttribute('data-theme', 'dark')`

**Why it matters:** Users who prefer light mode (common on mobile in bright environments, accessibility needs) get dark mode every visit with no way to switch. The light-mode CSS already exists and is complete — it just can't be triggered.

**Effort:** S

**Suggested fix:**
- Replace the hardcoded line with:
  ```js
  const saved = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', saved);
  ```
- Wire the existing theme-toggle button (if any; otherwise add one to the navbar) to `localStorage.setItem('theme', newTheme)` and update the attribute.

---

### 8. Bing Webmaster verification placeholder left in production `<head>`

**What:** The Bing verification meta tag contains the literal placeholder string `BING_VERIFICATION_CODE_HERE` instead of a real verification code, meaning Bing has never verified this site and the site cannot appear in Bing Webmaster Tools reports.

**Where:**
- `index.html:27` — `<meta name="msvalidate.01" content="BING_VERIFICATION_CODE_HERE" />`

**Why it matters:** Bing powers DuckDuckGo, Yahoo, and Ecosia search. Without verification you have no access to Bing's crawl error reports, keyword data, or structured-data debugging — and those engines can't confirm site ownership for indexing purposes.

**Effort:** S

**Suggested fix:**
- Log into Bing Webmaster Tools (webmaster.bing.com) with a Microsoft account, add `panoskokmotos.com`, choose the meta-tag verification method, and copy the code into `index.html:27`.
- Takes ~5 minutes total.

---

### 9. In-memory rate limit on Cloudflare Workers is effectively unbounded under real traffic

**What:** The rate-limit `Map` in `cloudflare-worker.js` is in the memory of a single Worker isolate. Cloudflare spins up new isolates per-region and on demand, each with empty memory. The 20 req/hour limit only applies within a single isolate's lifetime — concurrent requests hit different instances and each starts fresh.

**Where:**
- `cloudflare-worker.js:104–124` — `rateLimitStore` Map and `checkRateLimit()` function

**Why it matters:** The AI calls to Anthropic are not free. Under any sustained traffic (e.g., going viral on LinkedIn), the per-IP limit provides no real protection and the Anthropic API bill can spike unexpectedly.

**Effort:** M

**Suggested fix:**
- Replace the in-memory Map with a [Cloudflare KV](https://developers.cloudflare.com/kv/) read/write. KV is globally consistent and persists across isolate restarts. Use `env.TOOL_CACHE` (already bound in `wrangler.jsonc`) with a TTL-based key like `rl_${ip}`.
- Alternatively, use [Cloudflare Rate Limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/) in the dashboard for zero-code protection.

---

### 10. `formatMarkdown()` renders plain text — lists, headers, code blocks are unformatted

**What:** The shared markdown-to-HTML function does only two transforms: `**bold**` → `<strong>` and `\n` → `<br>`. Claude's responses regularly contain numbered lists, bullet points, headers, and code — all rendered as undifferentiated inline text.

**Where:**
- `tool-utils.js:222–225` — `function formatMarkdown(text)`

**Why it matters:** AI results are the core deliverable of all 11 tools. When Claude returns a structured analysis with bullet points and headers (which it does by default), users see it as a wall of text with asterisks and hyphens. This directly reduces perceived quality of every tool result.

**Effort:** S

**Suggested fix:**
- Add `<script src="https://cdn.jsdelivr.net/npm/marked@9/marked.min.js"></script>` to `tool-utils.js`'s loading pages (or inline it in the Worker's response).
- Replace `formatMarkdown` body with `return marked.parse(text)` (and pipe through DOMPurify per fix #1).
- Adjust the system prompts in `cloudflare-worker.js` to explicitly encourage lists and headers in responses.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 11. No global `unhandledrejection` or `window.onerror` handler — silent failures

**What:** There is no global error handler anywhere in the codebase. Promise rejections and uncaught exceptions outside try/catch blocks (e.g., in event listeners, setTimeout callbacks, async IIFE failures) are invisible — they never reach the user and never reach analytics.

**Where:** Absence across all JS files (`script.js`, `chat.js`, `tool-utils.js`, `search.js`)

**Why it matters:** When users hit errors you don't know about, you can't fix them. Several `catch {}` blocks are empty (e.g., `saveHistory()`, `_saveLastResultOffline()`), so even internally-caught errors produce no signal.

**Effort:** S

**Suggested fix:**
- Add to the top of `script.js`:
  ```js
  window.addEventListener('unhandledrejection', e => {
    if (typeof posthog !== 'undefined') posthog.capture('js_error', { type: 'unhandledrejection', reason: String(e.reason) });
  });
  window.addEventListener('error', e => {
    if (typeof posthog !== 'undefined') posthog.capture('js_error', { type: 'onerror', message: e.message, source: e.filename, line: e.lineno });
  });
  ```
- This costs 6 lines and immediately surfaces unknown breakage in PostHog.

---

### 12. Link checker only covers `index.html` — 11+ sub-pages never checked

**What:** `scripts/check_links.py` hard-codes `index.html` as the only file to check. All tool pages, `books.html`, `beliefs.html`, `now.html`, `podcast.html`, `watch.html`, and other HTML files are never scanned for broken links.

**Where:**
- `scripts/check_links.py` (file-level — the input file list is fixed)
- `.github/workflows/link-check.yml` — runs the script on every push

**Why it matters:** A broken external link in `what-would-x-do.html` or `charity-comparison-engine.html` would only be caught by a real user. These pages are the ones most likely to have external charity/org links that change.

**Effort:** S

**Suggested fix:**
- Change the script to glob all `*.html` files in the repo root and subdirectories (skipping `node_modules`, `.wrangler`).
- Add `og-ai-tools.png` and other referenced asset files to the checked list.
- Set CI to fail on any 404 (it currently may warn-only).

---

### 13. `tool-utils.js` at 1681 lines handles 20+ unrelated concerns

**What:** The shared utility file is a monolith: streaming, email capture, history drawer, voice input, charity autocomplete, offline cache, PWA install prompt, rating widget, confidence badge, freshness badge, explain tooltips, download/print/share, journey CTAs, and follow-up chat are all in one file.

**Where:** `tool-utils.js` — entire file

**Why it matters:** Any change to one feature requires loading/reading/searching the full 1681-line file. Merge conflicts on this file block all tool development simultaneously. It's also impossible to test individual utilities in isolation.

**Effort:** L

**Suggested fix:**
- Split into logical modules using native ES modules: `tool-streaming.js`, `tool-history.js`, `tool-email.js`, `tool-offline.js`, `tool-ui.js`.
- Each tool page's `<script type="module">` imports only what it needs.
- This requires updating the 11 tool HTML files but is otherwise mechanical refactoring — no behavior changes.

---

### 14. History drawer stores and re-renders raw `innerHTML` — persistent XSS vector

**What:** When a result is saved to history, the raw `resultBody.innerHTML` string is stored in `localStorage`. When the drawer opens, it renders these strings back into the DOM with `innerHTML`. This creates a stored XSS path independent of the point-of-use sanitization fix in P0 #1.

**Where:**
- `tool-utils.js:807` — `html: document.getElementById('resultBody')?.innerHTML || ''`
- History drawer render code (wherever `h.html` is set back into the DOM)

**Why it matters:** Even after adding DOMPurify at render time, the stored value could have been set from a pre-patch session and contain unsafe HTML. Defense in depth requires sanitizing at both store and render time.

**Effort:** S

**Suggested fix:**
- Store only the plain-text result: `text: document.getElementById('resultBody')?.textContent || ''`.
- On render, call `DOMPurify.sanitize(formatMarkdown(h.text))` to re-generate safe HTML.
- Clear existing history entries in localStorage on next load (one-time migration check by version key).

---

### 15. Zero automated tests for `tool-utils.js` — 11 pages can break silently

**What:** There are no tests anywhere in the repository. The 1681-line `tool-utils.js` drives all 11 AI tool pages, yet a bad edit to `formatMarkdown()`, `callWorker()`, or `showResult()` would only be caught by manually opening each page.

**Where:** Entire repository — no `*.test.js`, `*.spec.js`, or test runner config

**Why it matters:** Every tool page depends on `tool-utils.js`. When this file breaks (through a well-intentioned edit), all 11 tools break simultaneously, and there's no automated signal. The link checker won't catch JS runtime errors.

**Effort:** M

**Suggested fix:**
- Add Vitest (zero-config, no bundler required for vanilla JS): `npm init -y && npm i -D vitest`.
- Write unit tests for `formatMarkdown()`, `_classifyError()`, and `_HIST_KEY()` as a starting point — these are pure functions with no DOM dependency.
- Add a `test` step to `.github/workflows/link-check.yml` so tests run on every PR.

---

## 💡 P3 — Nice to have

### 16. PostHog `ui_host` is inconsistent across pages — EU vs US

**What:** The PostHog snippet uses `ui_host: "https://us.posthog.com"` on some pages and `"https://eu.posthog.com"` on others, signalling that the boilerplate was copy-pasted from two different sources.

**Where:**
- `index.html:518`, `now.html`, `books.html`, `beliefs.html` — `us.posthog.com`
- `404.html`, `podcast.html`, `offline.html`, `watch.html` — `eu.posthog.com`

**Why it matters:** `ui_host` only affects the dashboard link embedded in the snippet, not data routing, so there's no user-facing impact. But it signals sloppy boilerplate and will confuse anyone who needs to update the snippet later.

**Effort:** S

**Suggested fix:** Pick one (match your actual PostHog project region) and do a find-and-replace across all HTML files.

---

### 17. Confetti colors are hardcoded outside the design-token system

**What:** Celebration confetti uses six hardcoded hex values that include green, red, orange, and purple — colors not present in the design system's CSS custom properties.

**Where:**
- `script.js:173` — `['#3b6ef8', '#d4af37', '#10b981', '#f43f5e', '#8b5cf6', '#f97316']`

**Why it matters:** Minor brand inconsistency; confetti looks off-palette compared to the rest of the dark navy + blue aesthetic. Low priority but easy to fix.

**Effort:** S

**Suggested fix:** Replace with `['#3b6ef8', '#6090ff', '#f4a924', 'rgba(255,255,255,0.8)', '#60a5fa', '#93c5fd']` (using `--blue`, `--blue-light`, `--gold`, white, and blue tints from the token system).

---

### 18. `agent.py` boilerplate committed to the repo — confuses project purpose

**What:** `agent.py` is a generic Python CLI coding assistant boilerplate with no connection to the website, Cloudflare Workers, or any site functionality. It appears to have been committed accidentally.

**Where:** `/agent.py` — root of repo

**Why it matters:** New contributors (or future you) waste time trying to understand what this file does. It also adds noise to `git log` and GitHub's language statistics (it registers the repo as partially a Python project).

**Effort:** S

**Suggested fix:** Delete the file and commit. If it was intentional scaffolding, move it to a `scripts/` or `tooling/` directory with a comment explaining its purpose.

---

### 19. Service worker `PRECACHE_ASSETS` list not synced with actual tool pages

**What:** `sw.js` has a hardcoded list of pages to precache for offline use. If a tool page is added or renamed, the service worker won't cache the new page until the list is manually updated.

**Where:**
- `sw.js` — `PRECACHE_ASSETS` constant (lines ~10–30)

**Why it matters:** Users on slow connections who previously visited the site won't get offline access to new tools. Not critical, but offline capability is listed as a feature.

**Effort:** S

**Suggested fix:** Generate the precache list automatically by reading the HTML file list during a build step, or add a comment-checked `# SYNC` marker and include checking this list in the pre-deploy checklist in `README.md`.

---

### 20. `README.md` to-do items are stale — LinkedIn post URLs and press links unupdated

**What:** The `README.md` contains an unchecked to-do checklist including "Update LinkedIn post URLs in media section" and "Add new press features" — indicating manual maintenance tasks that have been pending since the file was written.

**Where:**
- `README.md` — to-do section (lines ~340–360)

**Why it matters:** Stale README to-dos confuse onboarding and signal the media section may be showing placeholder or outdated press links to real visitors.

**Effort:** S

**Suggested fix:** Address each unchecked item (update the LinkedIn URLs and add recent press), then remove the to-do checklist from the README entirely — these are one-off tasks, not ongoing documentation.

---

_Total: 5 P0, 5 P1, 5 P2, 5 P3 — 20 items._
