# Improvement Plan — panoskokmotos.com

> Reviewed: 2026-04-30 · Stack: HTML5 / Vanilla JS / CSS (8 198 lines) / Cloudflare Worker (claude-haiku-4-5)

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

---

### 1. Duplicate active-nav observers fire simultaneously, causing highlight flicker

**What:** Two separate `IntersectionObserver` instances both try to manage the active nav-link state — one sets `style.color` (line 109), the other adds/removes the `.active` class (line 774). They fight each other every time the user scrolls.

**Where:** `script.js:104–114` and `script.js:767–780`

**Why it matters:** The nav link highlighting flickers as the two observers produce conflicting results in the same scroll frame. Visitors lose the "where am I" wayfinding cue, making a long single-page portfolio feel disorienting.

**Effort:** S

**Suggested fix:**
- Delete the first observer block (lines 102–114, which uses the inline `style.color` approach).
- Keep only the second observer (lines 766–780), which uses the `.active` CSS class — that's the one styled in the design system.
- Add a `rootMargin: '0px 0px -40% 0px'` option to the surviving observer so the active item updates earlier.

---

### 2. Hero particle canvas loops forever — no tab-visibility guard

**What:** `draw()` in the hero particle canvas calls `requestAnimationFrame(draw)` unconditionally (line 669) with no check for `document.hidden`. The loop runs at 60 fps even when the user is on a different tab.

**Where:** `script.js:628–675`, specifically line 669

**Why it matters:** On mobile, this drains battery noticeably within minutes. On lower-powered devices, a background 60 fps canvas loop can cause the browser to throttle or crash the tab. Users who leave the site open while reading something else come back to a warm phone.

**Effort:** S

**Suggested fix:**
- Add a `document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(draw); })` guard.
- Store the RAF ID in a module-level variable (`let raf`) so it can be cancelled.
- Also cancel if the hero section scrolls fully out of view via `IntersectionObserver`.

---

### 3. `followUpChips.sort()` permanently mutates the module-level chip array

**What:** `showFollowUpChips()` shuffles chips with `followUpChips.sort(() => 0.5 - Math.random())` (line 100). `Array.prototype.sort` operates in place, so the module-level `followUpChips` constant is reordered on every call. After the first bot reply, subsequent "random" selections are drawn from a permanently mutated array — making the shuffle deterministic and biased.

**Where:** `chat.js:100`

**Why it matters:** Users who have long conversations always see the same follow-up chips, reducing engagement. The `sort(() => 0.5 - Math.random())` trick is also a known biased shuffle that over-weights certain orderings.

**Effort:** S

**Suggested fix:**
- Spread a copy before sorting: `[...followUpChips].sort(() => 0.5 - Math.random()).slice(0, 2)`.
- Or replace with a Fisher-Yates shuffle on a copy for truly uniform distribution.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

---

### 4. JS-driven animations bypass `prefers-reduced-motion` entirely

**What:** The CSS file correctly applies `@media (prefers-reduced-motion: reduce)` (line 2743) to kill CSS transitions, but three JavaScript animation loops ignore it: `animateCounter` (1 800 ms RAF loop), the confetti canvas (140 frames), and the hero particles. Users with vestibular disorders or motion sickness get all three regardless.

**Where:** `script.js:78–99` (counters), `script.js:162–210` (confetti), `script.js:628–675` (particles)

**Why it matters:** Users with vestibular disorders rely on `prefers-reduced-motion`. Running heavy JS animations for them is an accessibility violation (WCAG 2.1 SC 2.3.3) and makes the site unusable for a segment that is disproportionately likely to abandon a page with motion.

**Effort:** S

**Suggested fix:**
- Add a constant at the top of `script.js`: `const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;`
- Wrap the confetti block (line 162) and particle init (line 628) in `if (!reducedMotion)`.
- In `animateCounter`, if `reducedMotion`, set `el.textContent` to the final value immediately instead of starting the RAF loop.

---

### 5. No fetch timeout — chat and contact form can hang forever

**What:** Neither `sendMessage()` in `chat.js` (line 161) nor the contact form submit in `script.js` (line 388) pass an `AbortController` signal to `fetch`. If the Cloudflare Worker or Formspree is slow or unresponsive, the typing indicator or "Sending…" spinner stays on screen indefinitely with no recovery.

**Where:** `chat.js:161`, `script.js:388`

**Why it matters:** An unresponsive loading state is indistinguishable from "it worked" to many users. They wait, eventually close the tab, and the contact lead is lost. A 15-second timeout with a clear retry message is far better than infinite limbo.

**Effort:** S

**Suggested fix:**
- Wrap both fetch calls with `AbortController`: `const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15_000);`
- Add `signal: controller.signal` to the fetch options, and `clearTimeout(timeout)` in `finally`.
- Show a specific "Request timed out — try again or email directly" message in the catch block when the error is an `AbortError`.

---

### 6. Error fallbacks expose personal Gmail across three files

**What:** Every failure path — contact form network error (`script.js:411`), chat API error (`chat.js:179`), Cloudflare Worker 500 (`cloudflare-worker.js:537`), and rate-limit message (`cloudflare-worker.js:181`) — surfaces `panagiotis.kokmotoss@gmail.com` as the fallback contact.

**Where:** `script.js:411`, `chat.js:179`, `cloudflare-worker.js:181, 537`

**Why it matters:** A Forbes 30 Under 30 founder's error messages directing people to a personal Gmail is a credibility signal mismatch. It also creates a single point of contact that could be scraped and spammed. A professional alias (`hello@panoskokmotos.com` or the Formspree/tidycal link) is more appropriate.

**Effort:** S

**Suggested fix:**
- Replace all four instances of `panagiotis.kokmotoss@gmail.com` in error strings with a professional alias or a link to the contact section (`/#contact`).
- Consider defining a single `CONTACT_EMAIL` constant at the top of each file rather than repeating the string.

---

### 7. Chat message area has no `aria-live` region — screen readers are silent

**What:** New bot messages are appended to `#chatMessages` via `chatMessages.appendChild(div)` (chat.js:82), but the container has no `aria-live` attribute. Screen readers never announce incoming responses.

**Where:** `chat.js:74–84`, and the `#chatMessages` element in `index.html`

**Why it matters:** For keyboard-only or screen-reader users, the chat widget is completely unusable after sending a message — they type into the input, press Enter, and hear nothing back. This blocks the primary lead-capture mechanism for users with visual impairments.

**Effort:** S

**Suggested fix:**
- Add `aria-live="polite"` and `aria-atomic="false"` to the `#chatMessages` div in `index.html`.
- Optionally add a visually-hidden status element (e.g. `aria-live="assertive"`) that announces "Response received" when the thinking indicator is replaced.

---

### 8. "Visit Givelink" button uses a purple gradient outside the design system

**What:** `.btn-visit-givelink` uses `linear-gradient(135deg, #7c4dff, #5c3cf0)` (style.css:2777) — a purple palette that appears nowhere else in the design token set (`--blue: #3b6ef8`, `--gold: #f4a924`). No other component uses these purple values.

**Where:** `style.css:2777–2791`

**Why it matters:** This is the primary CTA button linking to Givelink in the Projects section — the most business-critical link on the page. It drawing from an undefined color source makes it look like a third-party embed rather than an intentional design choice, and the purple on dark blue background fails WCAG AA contrast at small font sizes.

**Effort:** S

**Suggested fix:**
- Either add `--givelink-purple: #7c4dff` explicitly to `:root` as a named token (signalling it's intentional Givelink brand colour) and reference it from the button.
- Or restyle using `--blue` so it matches the site-wide CTA style.
- Run a contrast check: `#7c4dff` on `#fff` passes AA, but `#5c3cf0` on dark backgrounds may not — verify with a contrast analyser.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

---

### 9. Two competing drag-to-scroll handlers run on the same `.logos-strip-wrap` element

**What:** `script.js` contains two drag implementations for the logo strip. The first (lines 120–150) manipulates `wrap.scrollLeft` (scroll-based). The second (lines 863–921) overrides the CSS marquee animation using `transform` (animation-based). Both attach listeners to the same `wrap` element and fire on every mousedown.

**Where:** `script.js:120–150` (scroll-based) vs. `script.js:863–921` (transform-based)

**Why it matters:** The two handlers conflict: dragging pauses the marquee animation and simultaneously tries to scroll the wrapper. The resulting jitter makes the logos section feel broken. Maintenance is double-work — any drag fix needs to be applied twice.

**Effort:** M

**Suggested fix:**
- Remove the first drag block (lines 120–150 in the `querySelectorAll('.logos-strip-wrap')` loop) entirely — it predates the animation-override approach.
- Keep only the second (lines 863–921), which correctly integrates with the CSS `logoMarquee` animation.
- Verify the touch handlers in the surviving block cover all cases the removed block handled.

---

### 10. `NOTIFY_SECRET` is hardcoded in two separate frontend files

**What:** The worker notification secret `"panos-notify-2026-xyz"` appears in both `script.js:931` and `tool-utils.js:11` as identical string literals.

**Where:** `script.js:931`, `tool-utils.js:11`

**Why it matters:** When the secret needs rotating, it must be updated in two places — and the update is easy to miss, leaving one file with a stale secret. The duplication also makes it harder to grep for all usage sites.

**Effort:** S

**Suggested fix:**
- Define the constant once in a shared module or at the top of `tool-utils.js` and import/reference it from `script.js`.
- Since this is a static site without a build step, the simplest fix is to add a `/* shared: update both files when rotating */` comment and a TODO in both files linking to each other — at least making the coupling explicit.
- Longer term: move the secret rotation to a worker-side environment variable only, removing it from the frontend entirely (it currently only rate-limits noise, so the worker can require a fixed non-rotating header token checked server-side).

---

### 11. In-memory rate limiter resets on every Cloudflare Worker cold-start

**What:** `rateLimitStore` is a module-level `Map` (cloudflare-worker.js:105). Cloudflare Workers are stateless — every cold-start (new isolate) creates a fresh empty map. Under any real traffic, multiple worker instances run in parallel, each with separate counters, making the "20 req/hour" limit per-instance rather than per-IP globally.

**Where:** `cloudflare-worker.js:104–124`

**Why it matters:** A determined abuser can trivially exceed the rate limit by simply sending bursts that hit different instances. This exposes the Anthropic API key to higher-than-expected spend. Real rate limiting requires a shared store.

**Effort:** M

**Suggested fix:**
- Bind a Cloudflare KV namespace (e.g. `RATE_KV`) in `wrangler.jsonc` and use `env.RATE_KV.get(ip)` / `env.RATE_KV.put(ip, count, { expirationTtl: 3600 })` instead of the in-memory Map.
- Alternatively, use a Cloudflare Durable Object for atomic counter increments (stronger consistency, slightly more setup).
- The KV approach is sufficient for this use-case and adds ~2ms latency per request.

---

### 12. `anthropic-version` header is repeated as a string literal in five route handlers

**What:** The string `'anthropic-version': '2023-06-01'` appears in 5 separate `fetch` calls throughout the worker file (lines 303, 383, 438, 482, 518).

**Where:** `cloudflare-worker.js:303, 383, 438, 482, 518`

**Why it matters:** When Anthropic releases a new API version, all five instances must be updated. Missing even one can cause subtle failures where different routes behave differently based on API version.

**Effort:** S

**Suggested fix:**
- Extract a `ANTHROPIC_HEADERS` constant near the top of the file:
  ```js
  const ANTHROPIC_HEADERS = {
    'Content-Type': 'application/json',
    'x-api-key': env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  };
  ```
- Spread it into each fetch: `headers: { ...ANTHROPIC_HEADERS }`.
- Note: `env` is only in scope inside the `fetch` handler, so either thread it as a parameter or define the constant inline at the top of the handler.

---

### 13. `parseMarkdown` passes user-typed text to `innerHTML` without sanitization

**What:** `addMessage('user', text)` (chat.js:145) calls `parseMarkdown(text)` and sets the result as `p.innerHTML` (chat.js:79). `parseMarkdown` replaces `**bold**` and `*italic*` patterns but leaves all other content — including raw HTML tags — untouched before the string is injected into the DOM.

**Where:** `chat.js:16–26, 79`

**Why it matters:** A user who types `<img src=x onerror="alert(document.cookie)">` will trigger script execution in their own browser session (self-XSS). While this doesn't affect other users (history stays in localStorage), it could be exploited via a crafted URL that pre-fills the chat input, or if history is ever synced server-side in future.

**Effort:** S

**Suggested fix:**
- Before calling `parseMarkdown`, escape the raw text: `const safe = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');` then pass `safe` through the markdown transforms.
- Alternatively, build the message bubble using `textContent` for the plain-text portion and only inject markdown-generated HTML via a trusted whitelist.

---

## 💡 P3 — Nice to have

---

### 14. Confetti particle colours are off-brand

**What:** The first-session confetti uses `['#3b6ef8', '#d4af37', '#10b981', '#f43f5e', '#8b5cf6', '#f97316']` — red, green, purple, and orange shades that don't appear anywhere else in the design system.

**Where:** `script.js:173`

**Why it matters:** The confetti is the very first thing a new visitor sees. Using colours that don't match the dark-navy-and-blue site palette subtly breaks the brand impression at the most important moment.

**Effort:** S

**Suggested fix:**
- Replace the palette with brand tokens: `['#3b6ef8', '#6090ff', '#f4a924', 'rgba(59,110,248,0.6)', '#fff', '#f4a924']`.
- Keep at least two distinct hues (blue + gold) for visual interest while staying on-brand.

---

### 15. AI tool usage counters are static seed numbers, never updated

**What:** `tool-utils.js:74–86` defines hardcoded "seeds" like `'/what-would-x-do.html': 2847` that are added to a `localStorage` counter and displayed to users as total usage figures. These numbers are invented, never reflect actual server-side usage, and stay fixed for all users who have never visited before.

**Where:** `tool-utils.js:74–86`

**Why it matters:** If usage grows significantly above the seed, the displayed number becomes obviously wrong. If actual usage is far below it, it misrepresents adoption to potential nonprofit partners or journalists who inspect the page. The social-proof value is real, but only if credible.

**Effort:** M

**Suggested fix:**
- Log actual tool invocations in the Cloudflare Worker to a KV counter per tool slug.
- Expose a lightweight `GET /api/usage?tool=<slug>` endpoint that returns the real count.
- Each tool page fetches this on load and falls back to the seed if the endpoint fails.

---

*Total items: 15 across four tiers. Ordered within each tier by estimated user/business impact.*
