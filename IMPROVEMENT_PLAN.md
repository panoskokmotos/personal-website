# Givelink Site — Improvement Plan

Audited: 2026-06-13 · Stack: Vanilla HTML/CSS/JS + Cloudflare Workers + Anthropic API

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

---

### 1. Copy buttons fail silently in all tool pages

**What:** `navigator.clipboard.writeText()` has no `.catch()` on three call sites, so copy silently does nothing in HTTP contexts, old browsers, or when permission is denied.

**Where:** `tool-utils.js:405`, `tool-utils.js:487`, `tool-utils.js:629`

**Why it matters:** Every tool has a copy button. This is the most-used action after generating a result. Silent failure destroys trust at the exact moment users want to act on the output.

**Effort:** S

**Suggested fix:**
- Add `.catch(() => { btn.textContent = 'Copy failed — select text manually'; })` to all three sites.
- At line 405, also reset back to `'Copy'` in the catch branch after a 3 s timeout.
- Alternatively, extract a shared `safeClipboard(text, btn)` helper and use it in all three places.

---

### 2. Rate limiting resets on every Cloudflare Worker cold-start

**What:** `rateLimitStore` is an in-memory `Map` inside the worker (line 105). Each cold-start — which Cloudflare triggers after ~30 s of inactivity — wipes the store, giving every IP a fresh 20-request budget.

**Where:** `cloudflare-worker.js:104–124`

**Why it matters:** A determined user (or bot) can bypass rate limiting entirely by waiting for a cold-start, letting API costs run unchecked on the Anthropic side.

**Effort:** M

**Suggested fix:**
- Replace the `Map` with Cloudflare KV: `await env.RATE_LIMIT_KV.get(ip)` / `.put(ip, count, { expirationTtl: 3600 })`. The Worker binding already exists for other vars.
- If KV isn't available on the current plan, use a Durable Object (one per IP shard).
- Keep the existing in-memory path as a fast-path for the first request per IP in the window.

---

### 3. Streaming SSE parse errors swallowed silently in the worker

**What:** The inner `catch {}` at line 346 of `cloudflare-worker.js` discards all Anthropic SSE parse errors without writing anything to the stream. The outer `catch {}` at line 349 does the same for read errors. The browser receives a truncated or empty response with no error indicator.

**Where:** `cloudflare-worker.js:326–354` (the entire streaming handler's try/catch blocks)

**Why it matters:** When Anthropic returns a malformed event or the connection drops mid-stream, the user sees the result cut off with no message explaining why — looks like a bug in the tool itself.

**Effort:** S

**Suggested fix:**
- On parse errors (inner catch), `continue` rather than silently dropping — the line is probably benign whitespace, not a real error.
- On stream-read errors (outer catch), write a sentinel string (e.g. `\n\n[Error: stream interrupted]`) before closing the writer, so the client-side error handler can surface it.
- Wire the existing `showError()` utility in `tool-utils.js:317` to detect that sentinel.

---

### 4. `innerHTML` on AI-generated content is an XSS vector

**What:** `formatMarkdown(fullText)` output is injected directly with `innerHTML` at two call sites during streaming. If the Anthropic API were ever compromised or returned manipulated content, arbitrary HTML/script tags would execute in the user's page.

**Where:** `tool-utils.js:169`, `tool-utils.js:176`, `tool-utils.js:335`, `tool-utils.js:340`

**Why it matters:** Low probability but high impact — a supply-chain compromise of the API key or a MITM on the worker would give an attacker arbitrary code execution in every visitor's browser session.

**Effort:** M

**Suggested fix:**
- Add [DOMPurify](https://github.com/cure53/DOMPurify) (single `<script>` tag, 45 KB) and wrap every `innerHTML` assignment: `resultBody.innerHTML = DOMPurify.sanitize(formatMarkdown(fullText))`.
- Allowlist only the tags your `formatMarkdown` actually produces (`<strong>`, `<em>`, `<ul>`, `<li>`, `<p>`, `<br>`, `<a>` with `href` check) for minimal surface area.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

---

### 5. No accessible error states on any form field across all tool pages

**What:** Every tool page uses `required` HTML attributes for form validation but never sets `aria-invalid="true"` on invalid fields, never adds an error message element with `aria-describedby`, and has no CSS styling for the `:invalid` pseudo-class.

**Where:** All tool HTML files (`what-would-x-do.html`, `scam-nonprofit-detector.html`, `donation-tax-estimator.html`, etc.) — the `<input>` and `<select>` elements in each form.

**Why it matters:** Screen-reader users get no feedback when they submit with empty fields. Sighted users get the browser-native tooltip (which disappears on first click) and nothing more. This is both a WCAG 2.1 AA failure (1.3.1, 3.3.1) and a conversion killer for any user unfamiliar with the tool.

**Effort:** M

**Suggested fix:**
- Add a `validateForm()` call in `initToolForm()` inside `tool-utils.js` that sets `aria-invalid="true"` and inserts a `<span role="alert">` error message after each failing field.
- Add `.field-error` CSS class in `style.css` (red border + icon) driven by `[aria-invalid="true"]`.
- Clear the error state on `input` event. One implementation covers all 11 tools.

---

### 6. Milestone toast colors violate brand palette

**What:** The 5-use, 10-use, and 25-use milestone toasts use `#7c3aed` (Tailwind purple), `#059669` (green), and `#d97706` (amber) — none of which are in the site's defined brand palette.

**Where:** `tool-utils.js:254–256`

**Why it matters:** These toasts fire for active, engaged users — exactly the audience you most want to feel brand cohesion with. Off-palette colors undermine the premium feel at a high-engagement moment.

**Effort:** S

**Suggested fix:**
- Replace with brand CSS variables: `#3b6ef8` (blue), `#f4a924` (gold), and for the third tier a darker shade of blue (`#1a3a8f`) or the gradient from `.btn-givelink` (`#6c4bff → #ff6268`).
- Consider using a single gold `#f4a924` for all milestone toasts to create a consistent "achievement" visual language.

---

### 7. Contact form submits to an `alert()` on error

**What:** The contact form's error path calls `alert('Something went wrong...')` — a browser modal that blocks the page and has no styling.

**Where:** `index.html` — the Formspree form submit handler (search for `alert(` in the file).

**Why it matters:** `alert()` looks broken to modern users, breaks in CSP-restricted environments, and provides no way to retry or see what went wrong. It's the last touchpoint before a potential collaborator or donor gives up.

**Effort:** S

**Suggested fix:**
- Replace `alert()` with an inline error message element already in the DOM (`<p id="contact-error" role="alert" hidden>`), shown with `removeAttribute('hidden')` on failure.
- Mirror the success toast pattern already used elsewhere on the page.

---

### 8. `anthropic-version` header is pinned to a two-year-old API version

**What:** All Anthropic API calls in the worker hard-code `'anthropic-version': '2023-06-01'`, the original release version from June 2023.

**Where:** `cloudflare-worker.js:304` (and likely repeated in other route handlers in the same file)

**Why it matters:** Newer API versions include token-efficient tool use, cache-control headers, and improved streaming reliability. Running on the oldest version means you're missing performance gains and may eventually hit a deprecation sunset without warning.

**Effort:** S

**Suggested fix:**
- Update to `'2023-06-01'` → the latest stable version listed in the [Anthropic versioning docs](https://docs.anthropic.com/en/api/versioning).
- Define it as a single constant at the top of the worker: `const ANTHROPIC_API_VERSION = '...'` to avoid drift across the 4+ call sites.

---

### 9. `TOOL_NOTIFY_SECRET` is publicly visible in browser DevTools

**What:** The worker notification secret is hardcoded in `tool-utils.js:11` and `script.js:931`, making it fully visible in browser source view and any JS bundle inspection.

**Where:** `tool-utils.js:11`, `script.js:931`

**Why it matters:** Anyone can replay notification events, flooding your inbox or triggering misleading analytics events. The comment at `script.js:928` acknowledges this as intentional ("protects against random noise") — but a simple HMAC or time-based token would give much stronger protection at no extra infrastructure cost.

**Effort:** S

**Suggested fix:**
- Move secret validation entirely into the worker. The frontend sends the raw event; the worker decides whether to forward it based on its own rules (e.g. rate limit + IP check) rather than a shared secret.
- If a secret is still desired, generate a short-lived token server-side (a session cookie hash) so it isn't static and publicly readable.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

---

### 10. `tool-utils.js` is a 1,680-line monolith

**What:** A single file handles streaming API calls, markdown formatting, DOM skeleton injection, localStorage history, share buttons, email capture modals, progress bars, usage counters, milestone toasts, and refine-mode interactions.

**Where:** `tool-utils.js` (entire file)

**Why it matters:** Adding a new tool or fixing a bug requires scrolling through 1,680 lines with no module boundaries. Any change to one feature risks breaking an unrelated one. New contributors have no mental model of the structure.

**Effort:** L

**Suggested fix:**
- Split into four focused files: `tool-api.js` (worker calls, streaming), `tool-ui.js` (modals, toasts, loading states), `tool-history.js` (localStorage), `tool-share.js` (copy/X/WhatsApp).
- Each tool page includes all four with `<script>` tags; no bundler needed since this is a static site.
- No behavior changes — pure extraction. Do one file at a time to keep diffs reviewable.

---

### 11. Clipboard and notification logic duplicated between `tool-utils.js` and `script.js`

**What:** `sendSiteNotification()` exists in `script.js:933` and an identical `_sendToolNotify()` exists in `tool-utils.js:241`. Toast display logic is similarly duplicated.

**Where:** `script.js:933–939`, `tool-utils.js:241–249`, `script.js:288–296`, `tool-utils.js:251–273`

**Why it matters:** A bug fix or secret rotation must be applied in two places. Last time the secret was set, both files needed updating — a pattern that will cause a drift bug eventually.

**Effort:** S

**Suggested fix:**
- Move the canonical implementation to `tool-utils.js` (already loaded on tool pages) and delete from `script.js`.
- For the portfolio page (which doesn't load `tool-utils.js`), inline just the one function needed, or create a minimal `notify.js` shared by both.

---

### 12. Zero test coverage on critical paths

**What:** There are no test files (`*.test.js`, `*.spec.js`, or any test runner config) anywhere in the repository.

**Where:** Repository root — absent.

**Why it matters:** `formatMarkdown()`, the streaming parser, rate-limit logic, and form validation are all manually tested. A one-line regression (e.g. a markdown edge case breaking the `<strong>` pattern) would ship silently.

**Effort:** M

**Suggested fix:**
- Add [Vitest](https://vitest.dev/) (zero-config, runs in Node) and write unit tests for `formatMarkdown()` (5–10 edge cases) and `checkRateLimit()` in the worker.
- Add one Playwright smoke test: load a tool page, fill the form, submit, assert a result appears. This covers the full happy-path end-to-end in CI.
- Target 80% coverage on the two files with the most logic: `tool-utils.js` and `cloudflare-worker.js`.

---

### 13. Empty `catch {}` blocks hide streaming errors in the worker

**What:** The SSE streaming loop uses bare `catch {}` (no identifier, no logging) in two nested locations, making it impossible to debug streaming failures in production.

**Where:** `cloudflare-worker.js:346` (inner catch for JSON parse), `cloudflare-worker.js:349` (outer catch for stream read)

**Why it matters:** When streaming silently fails in production, there is no log entry, no error event, nothing. Root-causing user reports of "the result just stops" requires guesswork.

**Effort:** S

**Suggested fix:**
- Log to `console.error` in the outer catch: `catch (e) { console.error('[stream]', e.message); }`.
- Cloudflare Workers surfaces `console.error` in the Workers dashboard log stream and in Tail Workers — this costs nothing and gives instant observability.

---

## 💡 P3 — Nice to have

---

### 14. Google Fonts URL is unversioned

**What:** The `<link>` to Google Fonts in every HTML file loads `Plus Jakarta Sans` without a version pin. A font update by Google could subtly shift line heights or character widths.

**Where:** Every `<head>` in all HTML files.

**Why it matters:** Low probability, but layout regressions from font changes are hard to diagnose after the fact.

**Effort:** S

**Suggested fix:**
- Self-host the font using `next-font` or a one-time download with [google-webfonts-helper](https://gwfh.mranftl.com/fonts) and serve from `/fonts/`. Eliminates the third-party dependency entirely and removes a render-blocking request.

---

### 15. Mobile share sheet not used on supported devices

**What:** The share buttons always open Twitter and WhatsApp URLs in new tabs. On iOS/Android, `navigator.share()` opens the native share sheet, which is significantly higher-converting.

**Where:** `tool-utils.js:473–508` (X share handler and WhatsApp handler)

**Why it matters:** Mobile traffic is significant for charity-focused tools used by volunteers and donors on the go. Native share is one tap vs. three.

**Effort:** S

**Suggested fix:**
- Add `if (navigator.share)` guard before the existing `window.open` calls:
  ```js
  if (navigator.share) {
    navigator.share({ title, url }).catch(() => {});
    return;
  }
  ```
- Falls back gracefully to the current Twitter/WhatsApp URLs on desktop.

---

### 16. `formatMarkdown()` output is injected as innerHTML everywhere but the function itself is not audited against edge cases

**What:** `formatMarkdown()` is used in 4+ places but has no tests and likely has untested edge cases (e.g. nested lists, code blocks with backticks, bold inside a link).

**Where:** `tool-utils.js` — wherever `formatMarkdown` is defined (search: `function formatMarkdown`).

**Why it matters:** A malformed AI response that triggers a markdown edge case could produce broken HTML, a blank result section, or in the worst case (combined with P0 item 4) an XSS payload that bypasses a naive sanitizer.

**Effort:** S

**Suggested fix:**
- Add 8–10 unit tests covering: empty string, string with only whitespace, nested `**bold**`, backtick code, numbered list, unordered list, mixed content.
- This is the fastest win for test coverage and can be done in under an hour.
