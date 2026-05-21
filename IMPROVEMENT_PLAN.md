# Givelink Personal Website — Improvement Plan
*Scanned: May 2026 · 24 HTML pages · ~35K lines of vanilla JS/CSS*

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. Missing `og-ai-tools.png` — all 13 tool pages serve a broken OG card
**What:** Every AI tool page references `/og-ai-tools.png` for `og:image` and `twitter:image`, but the file does not exist on disk.  
**Where:** `why-should-i-give.html:17–19`, `what-would-x-do.html:20–22`, and all 11 remaining tool pages (same lines); `og-ai-tools-preview.html` contains the generation instructions.  
**Why it matters:** Every time a user shares a tool on Twitter/X, LinkedIn, WhatsApp, or Slack, the preview card renders with a broken image placeholder. Sharing is a primary viral-growth mechanism (there's an explicit Share button on every tool), so this silently kills click-through on every share.  
**Effort:** S  
**Suggested fix:**
- Open `og-ai-tools-preview.html` in a browser, screenshot the preview at 1200×630px, and save as `/og-ai-tools.png` in the repo root.
- Or run `generate_og.py` if it supports a custom output path — check its CLI flags.
- Verify with `curl -I https://panoskokmotos.com/og-ai-tools.png` once deployed.

---

### 2. `closeSearch()` is undefined — "try AI chat" button crashes on empty search
**What:** In the no-results empty state, a button runs `onclick="openSearch(); closeSearch(); setTimeout(openChat,120)"`. `closeSearch` is never exported globally; the module only exports `window.__ssClose`.  
**Where:** `search.js:63`  
**Why it matters:** Any user who searches for something with no hits and then clicks "try the AI chat" gets a silent `ReferenceError: closeSearch is not defined`, the search modal stays open, and the chat never opens. This is the fallback path for *all* failed searches.  
**Effort:** S  
**Suggested fix:**
- Change line 63 to: `onclick="window.__ssClose(); setTimeout(openChat,120)"` — `openSearch()` is a no-op here since the modal is already open.
- Add `window.closeSearch = closeModal;` alongside the other global exports (line 173) to future-proof.

---

### 3. Print popup crashes when a popup blocker is active
**What:** `_injectPrintBtn` calls `window.open('', '_blank')` then immediately calls `win.document.write(...)`. When a browser popup blocker fires, `window.open` returns `null`, and the next line throws `TypeError: Cannot read properties of null`.  
**Where:** `tool-utils.js:932–949`  
**Why it matters:** Chrome, Firefox, and Safari all block programmatic `window.open` calls by default unless triggered by a direct user gesture in the current context. Any user with a popup blocker (i.e., most users) who clicks "Print" sees nothing and gets no error message — the button just silently fails.  
**Effort:** S  
**Suggested fix:**
- Add a null guard: immediately after line 932, insert `if (!win) { showError('Allow popups for this site to use Print.'); return; }`.
- Alternative: use `window.print()` directly with a `@media print` CSS rule that shows only `#result` — no popup needed.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 4. `NOTIFY_SECRET` is hardcoded in public JavaScript — anyone can email-bomb Panos
**What:** The notify secret `"panos-notify-2026-xyz"` is hardcoded as a public constant in two client-side files, enabling any visitor to POST to `/notify` and send arbitrary emails to Panos's personal address.  
**Where:** `script.js:931`, `tool-utils.js:11`  
**Why it matters:** The `/notify` endpoint (cloudflare-worker.js:187) accepts `event` and `data` as freeform strings, both of which appear verbatim in the email body. An attacker can flood the inbox with spam or craft misleading notifications. Rate limiting (20/hr) slows but doesn't stop distributed abuse.  
**Effort:** M  
**Suggested fix:**
- Remove the secret from both client files and replace with an endpoint-specific signed HMAC or a simple per-form token minted server-side.
- Short-term: rotate the secret in the Cloudflare Worker env var to invalidate the current exposed value, then add input validation (max `data` length, allowed `event` allowlist) in the worker.
- Consider making the `/notify` endpoint require an origin check (`request.headers.get('Origin') === 'https://panoskokmotos.com'`) as a defense-in-depth layer.

---

### 5. "Data: 2024" freshness badge is now two years stale
**What:** `_injectFreshnessBadge` injects a `Data: 2024` label on `donation-tax-estimator.html`, `nonprofit-health-checker.html`, and `scam-nonprofit-detector.html`.  
**Where:** `tool-utils.js:1553–1563`  
**Why it matters:** It's now May 2026. Users relying on these tools for actual tax or compliance decisions see a confidence-eroding "2024" label. For donation tax and scam detection, stale data labels actively reduce trust and could drive users away from the tools that most benefit from perceived accuracy.  
**Effort:** S  
**Suggested fix:**
- Change the hardcoded `'Data: 2024'` string to `'Data: ' + new Date().getFullYear()` so it auto-updates each year without a deploy.
- Update `title` attribute to reference the current year and recommend professional verification.

---

### 6. Email capture shows "✓ Sent!" on server errors
**What:** `_injectEmailCapture` awaits the `fetch` call to `/email-result` but never checks `response.ok`. Any 4xx or 5xx from MailChannels shows the user a success confirmation.  
**Where:** `tool-utils.js:748–760`  
**Why it matters:** Users who enter their email to receive a result and see "✓ Sent!" believe they'll receive the email. If MailChannels fails (it's a free, unreliable tier), they wait for an email that never arrives and lose trust in the site.  
**Effort:** S  
**Suggested fix:**
- After `await fetch(...)`, parse the JSON and check `ok` / `response.ok`:
  ```js
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error('send_failed');
  ```
- Show a distinct error state (`'Failed — try again'`) on non-ok responses, which is already partially implemented in the `catch` block.

---

### 7. `why-should-i-give.html` uses a blocking fetch while every other tool streams
**What:** The form submit on the highest-traffic tool (seed: 2,847 uses) does a direct synchronous `fetch` to the non-streaming `/api/v1/tool` endpoint instead of calling `callWorker()` from `tool-utils.js`. The full response must arrive before anything renders.  
**Where:** `why-should-i-give.html:315–325`  
**Why it matters:** Claude Haiku typically takes 3–6 seconds for this prompt. All other tools show progressive text appearing token-by-token (via `callWorker`), which dramatically improves perceived performance. This tool — the most likely entry point for first-time donors — offers the worst loading experience.  
**Effort:** M  
**Suggested fix:**
- Replace the `fetch(WORKER_URL, ...)` + `data.result` pattern with a call to `callWorker(systemPrompt, userMessage)` which streams via `/api/v1/stream`.
- Remove the duplicated `startLoadingMessages`/`stopLoadingMessages` functions at lines 249–261 (identical copies already exist in `tool-utils.js`).
- The custom `renderSections()` parser can still run on the completed `fullText` string returned by `callWorker`.

---

### 8. Rate-limit countdown tells users "wait 30 seconds" when the real window is 1 hour
**What:** `_showRateLimitError` counts down from 30 seconds with messaging "Please wait Xs before trying again." The actual rate limit in the Cloudflare Worker is 20 requests per rolling hour.  
**Where:** `tool-utils.js:205–220` (client), `cloudflare-worker.js:106–107` (server)  
**Why it matters:** A user who hits the 20-request-per-hour limit will wait 30 seconds, try again, get the same error, and not understand why. This is the most frustrating possible UX for power users — exactly the people you want to retain.  
**Effort:** S  
**Suggested fix:**
- Return `X-RateLimit-Reset` header from the Worker (the `resetAt` timestamp is already tracked in the `entry` object) so the client can show the real wait time.
- Update `_showRateLimitError` to read that header and count down to the actual reset, or simply say "You've reached the daily limit. Try again in a few minutes, or email panagiotis.kokmotoss@gmail.com."

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 9. `formatMarkdown` sets `innerHTML` directly from API response text — potential XSS
**What:** `formatMarkdown(text)` converts `**bold**` and newlines, then the result is assigned to `resultBody.innerHTML`, `loading.innerHTML`, and all follow-up chat bubbles. No HTML is stripped before insertion.  
**Where:** `tool-utils.js:222–226` (function), used at lines 169, 176, 335, 340, 1061, 1080, 1543  
**Why it matters:** If the Anthropic API or the Cloudflare Worker is ever compromised, or a prompt injection causes Claude to emit `<script>` or `<img onerror=...>` tags, they land directly in the DOM. The streaming path (line 169) renders incrementally while data is arriving, making sanitization especially important.  
**Effort:** M  
**Suggested fix:**
- Strip raw HTML before processing markdown: `text = text.replace(/<[^>]+>/g, '')` as the first step in `formatMarkdown`.
- Long-term: use a tiny allowlist-based sanitizer (e.g., DOMPurify is ~6KB minified) to allow `<strong>`, `<em>`, `<br>` but block everything else.

---

### 10. `tool-utils.js` is a 1,680-line monolith with no module boundaries
**What:** A single file bundles API calls, streaming, markdown rendering, DOM injection for 15+ separate UI features, analytics, PWA prompts, voice input, charity autocomplete, history drawers, and offline caching.  
**Where:** `tool-utils.js` (entire file)  
**Why it matters:** Every tool page downloads all 1,680 lines even when using only 10% of the features. Adding or debugging any single feature means navigating 1,600+ lines with no imports. The current phase marker comments (`Phase 7`) suggest this has grown organically without refactoring.  
**Effort:** L  
**Suggested fix:**
- No full rewrite needed — split by responsibility: `tool-api.js` (callWorker + fallback + rate limit), `tool-ui.js` (setLoading, showError, formatMarkdown), `tool-extras.js` (all `_inject*` features). Each file is ~400–500 lines.
- Add ES module `type="module"` to the script tags and use `import`/`export` — no bundler needed for a static site.
- As a quick win, move the 400-line `_RELATED_TOOLS` and `_JOURNEY_MAP` constant blocks into a `tool-data.js` data file.

---

### 11. `search.js` and `search-index.json` are not in the Service Worker precache
**What:** The SW precaches all HTML pages and core assets, but `search.js` (6.4KB) and `search-index.json` (15KB) are absent from `PRECACHE_ASSETS`.  
**Where:** `sw.js:4–27`  
**Why it matters:** Users who open the search modal (`Cmd+K`) while offline — a likely scenario given this is a PWA with offline support — will get an empty search with no results because `search-index.json` fails to load. The search input shows "Search books, beliefs…" but returns nothing.  
**Effort:** S  
**Suggested fix:**
- Add `'/search.js'` and `'/search-index.json'` to `PRECACHE_ASSETS` in `sw.js`.
- Bump `CACHE_NAME` from `'panos-v4'` to `'panos-v5'` to force cache refresh on existing installs.

---

### 12. Three analytics platforms with no shared event taxonomy
**What:** The site fires events to PostHog (`contact_intent`, `search_opened`), Plausible (`Tool Rating`), and Google Analytics (page views) independently with no shared naming or property structure.  
**Where:** `chat.js:120–131`, `search.js:98–100`, `tool-utils.js:973`  
**Why it matters:** Tool usage, conversion, and engagement data is siloed across three platforms. There's no way to correlate "user searched → used tool → clicked Givelink CTA" as a funnel. The PostHog events are the richest (with properties) but only cover 2 of the ~20 meaningful user actions.  
**Effort:** M  
**Suggested fix:**
- Pick one platform as the source of truth for conversion events (PostHog has the most features).
- Add a thin `track(event, props)` wrapper in `tool-utils.js` that fires all three simultaneously from one call.
- Instrument the 5 highest-value events that are currently unmeasured: `tool_submitted`, `tool_result_shown`, `email_captured`, `share_clicked`, `givelink_cta_clicked`.

---

### 13. `_injectSourceLinks` hardcodes the Greek Tax Authority for a global tool
**What:** When `window.location.pathname.includes('donation-tax-estimator')`, `_injectSourceLinks` appends `AADE (Greek Tax Authority)` as one of two official sources alongside the US IRS.  
**Where:** `tool-utils.js:1578–1582`  
**Why it matters:** The donation-tax-estimator tool is framed as a general tool, but surfacing the Greek tax authority to a US or UK user is confusing and undermines credibility. The tool prompt already handles multi-country tax logic; the sources should reflect that.  
**Effort:** S  
**Suggested fix:**
- Add a country-selector field to the estimator form and use it to conditionally render country-specific source links (UK: HMRC, US: IRS, EU: AADE/local authority).
- Short-term: replace AADE with `OECD Charitable Giving Guide` (a neutral international source) and add a note that "tax rules vary by country — check your local authority."

---

## 💡 P3 — Nice to have

### 14. Usage counter seeds are static fabricated numbers displayed as live counts
**What:** `_USAGE_SEEDS` in `tool-utils.js` hardcodes starting counts (e.g., 2,847 for `what-would-x-do.html`) that display as "Used 2,847 times by donors & changemakers." Only the local `localStorage` delta is real.  
**Where:** `tool-utils.js:73–86`, `_renderUsageCount` at lines 511–523  
**Why it matters:** Users who inspect localStorage, share the tool, then return from a different device, or simply notice the counter never moves on a fresh browser will see through the fabrication. The counter is a trust signal — if it appears fake, it undermines the tool's credibility precisely at conversion time.  
**Effort:** S  
**Suggested fix:**
- Track real usage by incrementing a Cloudflare KV counter on each `/api/v1/tool` call (a single `env.TOOL_STATS.put(path, count + 1)` in the Worker).
- Return the real count in the tool API response and replace the seed + localStorage pattern with the server value.

---

### 15. History drawer uses inline `onclick` string attributes referencing globals
**What:** The history drawer HTML is built as a string with `onclick="_closeHistoryDrawer()"` (line 848) and the keyboard shortcut modal has `onclick="_closeShortcutModal()"` (line 1628) — relying on global function names in string-based event handlers.  
**Where:** `tool-utils.js:848`, `tool-utils.js:1628`  
**Why it matters:** These are fragile — if the function is ever renamed or wrapped in a module scope, the buttons silently break. It also creates inconsistency with the rest of the codebase which uses `addEventListener`.  
**Effort:** S  
**Suggested fix:**
- Store references to the close elements and attach event listeners after `innerHTML` injection, as already done for `.hist-restore` buttons (line 863).
- Remove the `_closeHistoryDrawer` and `_closeShortcutModal` global function declarations once inline handlers are eliminated.

---

### 16. Follow-up chat uses the non-streaming fallback — slow for multi-turn conversations
**What:** `_injectFollowUpChat` calls `_callWorkerFallback(ctx, followMsg)` — the non-streaming endpoint — instead of `callWorker`. Users wait for a full response before seeing anything.  
**Where:** `tool-utils.js:1079`  
**Why it matters:** The follow-up chat is a multi-turn interaction where responsiveness matters most. The streaming endpoint is already deployed and used for all primary tool calls; using it for follow-ups would make the experience feel significantly faster.  
**Effort:** S  
**Suggested fix:**
- Replace `_callWorkerFallback(ctx, followMsg)` with `callWorker(ctx, followMsg)` and pass the `loading` bubble element's `innerHTML` as the progressive render target (similar to how `resultBody` is used in the main flow).
- Add a dedicated `callWorkerToElement(sysPrompt, userMsg, targetEl)` helper to `tool-utils.js` to avoid duplicating the streaming read loop.

---

### 17. `what-would-x-do.html` is 1,188 lines / 56KB — hardest file to maintain
**What:** The largest single tool file embeds a custom scenario-card renderer, multi-section parser, persona chips, and "dig deeper" inline chat — all in one `<script>` block.  
**Where:** `what-would-x-do.html` (entire file)  
**Why it matters:** Any bug fix in this file requires navigating 1,100+ lines of mixed HTML and JavaScript. The file is a maintenance risk that grows with each feature added directly into the script block.  
**Effort:** M  
**Suggested fix:**
- Extract the inline `<script>` to `what-would-x-do.js` and reference it with `<script src="/what-would-x-do.js">` — zero functional change, immediate readability win.
- As a second step, move the `parseSections`/`renderSections`/persona chip logic into the dedicated JS file with clear function boundaries.

---

### 18. In-memory rate limiting resets on Cloudflare Worker cold-start
**What:** The `rateLimitStore` Map in `cloudflare-worker.js` is a module-level `const` that lives only in the Worker's memory. A cold-start (which Cloudflare triggers after ~30 seconds of inactivity) resets all rate limit counters to zero.  
**Where:** `cloudflare-worker.js:104–124`  
**Why it matters:** A determined user can trivially bypass the 20 req/hour limit by waiting 30 seconds of inactivity (or using multiple Worker instances). For a free tool, this is mainly a cost risk (each request costs Anthropic API credits) rather than a security risk.  
**Effort:** M  
**Suggested fix:**
- Bind a Cloudflare KV namespace (`RATE_LIMIT_KV`) and store `{ count, resetAt }` keyed by IP with a 1-hour TTL.
- The Worker already conditionally uses `env.TOOL_CACHE` (a KV namespace) as a pattern — replicate it for rate limiting.
- If KV is not available, at minimum add a `resetAt` check that persists across requests in the same Worker instance (already done — just note the cold-start limitation in a comment).

---

### 19. `_injectAskAbout` reads the org input at render time — clears to empty if user edits the field
**What:** `_injectAskAbout` grabs `orgInput.value` once when injecting the button after a result. If the user then clears or changes the input field before clicking the button, the chat opens with `Ask AI about ""`.  
**Where:** `tool-utils.js:1105–1127`  
**Why it matters:** Minor but jarring — the "Ask AI about" button is shown prominently on the scam detector, charity comparison, and nonprofit health checker pages. An empty subject line in the chat opener confuses users.  
**Effort:** S  
**Suggested fix:**
- Read `orgInput.value` lazily inside the button's click handler instead of at injection time:
  ```js
  btn.addEventListener('click', () => {
    const subject = (document.getElementById('orgName') || ...).value.trim() || 'this organization';
    ...
  });
  ```

---

### 20. Contact form error path uses `alert()` instead of the site's inline error UI
**What:** On form submission failure, `script.js:405` calls `alert('Something went wrong...')` and on network error, line 411 calls `alert('Network error...')`. All other error paths site-wide use `showError(msg)` or inline HTML.  
**Where:** `script.js:405`, `script.js:411`  
**Why it matters:** `alert()` is a browser-modal that blocks the page, looks visually broken against a dark-themed site, and is jarring on mobile. Small inconsistency that signals rough edges on the main conversion surface (contact section).  
**Effort:** S  
**Suggested fix:**
- Replace both `alert(...)` calls with `success.textContent = '...'` shown as an error variant, or add an `#formError` element to the contact form and call a local `showFormError(msg)` that mirrors the tool `showError` pattern.
