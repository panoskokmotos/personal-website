# Givelink Personal Site — Improvement Plan

Audit date: 2026-06-06  
Scope: `/index.html`, `/style.css`, `/script.js`, `/chat.js`, `/tool-utils.js`, `/search.js`, `/cloudflare-worker.js`, all tool HTML pages  
Brand palette: purple `#6B3FA0` / `#5718CA`, pink `#C2185B` / `#E353B6` — no pink-on-purple rule  

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. Chat API response never checks `res.ok` — renders `undefined` on errors

**What**: `fetch()` in chat.js calls `.json()` without first verifying `res.ok`, so any 4xx/5xx error returns garbled content or silently renders `undefined` to the user.  
**Where**: `chat.js:161-179`  
**Why it matters**: Every API error (rate limit, worker downtime, auth failure) produces broken UI that looks like a bug in the product, not a network issue. Users lose trust.  
**Effort**: S  
**Suggested fix**:
- Add `if (!res.ok) throw new Error(res.statusText)` immediately after `await fetch(...)`
- Catch the throw and display a user-readable message ("Something went wrong — try again")
- Log the error to console so it surfaces in PostHog session replays

---

### 2. Contact form notification silently swallows failures

**What**: `sendSiteNotification()` is called fire-and-forget on form submission — if the Cloudflare Worker or Formspree is down, the user sees a success message but nothing is delivered.  
**Where**: `script.js:400`, `index.html:2189`  
**Why it matters**: You lose real inbound messages with no indication anything went wrong. Someone reaching out for a partnership or job inquiry disappears into the void.  
**Effort**: S  
**Suggested fix**:
- Wrap `sendSiteNotification()` in try/catch and await it before showing success
- On failure, display an error message with a direct mailto fallback link
- Log failures to console (and optionally PostHog) so you know your contact form is broken

---

### 3. PostHog loaded unconditionally — no consent gate

**What**: PostHog analytics initialises on every page load without checking for cookie consent, while Google Analytics correctly waits for user opt-in.  
**Where**: `index.html:516-518`  
**Why it matters**: GDPR/ePrivacy violation. EU users are tracked without consent. Exposes the site (and any linked organisations) to regulatory risk.  
**Effort**: S  
**Suggested fix**:
- Mirror the existing GA consent pattern: only call `posthog.init()` inside the consent callback
- Add `posthog.opt_out_capturing()` as the default until consent is granted
- Test with a fresh private-browsing session to confirm no PostHog requests fire before opt-in

---

### 4. Search silently breaks when `search-index.json` is missing or slow

**What**: `search.js` calls `loadIndex()` asynchronously on page load with no loading state, no error state, and no user feedback. If the JSON 404s, users type into search and see nothing with no explanation.  
**Where**: `search.js:10-18`  
**Why it matters**: Search is a primary navigation tool. A silent failure looks like broken functionality to users who don't open DevTools.  
**Effort**: S  
**Suggested fix**:
- Show a "Loading search…" state while the index fetches
- On fetch failure, disable the input and display "Search unavailable" with `aria-disabled="true"`
- Add `if (!res.ok) throw new Error(...)` before `.json()` parse

---

### 5. Tool-page fetch calls parse `.json()` without checking response status

**What**: Multiple fetch calls in `tool-utils.js` call `.json()` directly on the response without checking `res.ok`, causing unhandled JSON parse errors when the API returns an error body.  
**Where**: `tool-utils.js:132, 200, 1284`  
**Why it matters**: A rate-limited or auth-failed AI tool call crashes the streaming UI mid-render, leaving partial results on screen. Users have no idea what happened.  
**Effort**: S  
**Suggested fix**:
- Create a single `safeFetch(url, opts)` helper: check `res.ok`, throw on failure, return `res`
- Replace all raw `fetch → .json()` pairs in `tool-utils.js` with this helper
- Surface API errors in the existing tool error UI (not `alert()`)

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 6. Body text contrast fails WCAG AA — illegible for low-vision users

**What**: Muted body copy uses `rgba(255,255,255,0.48)` on `#0d1530` background, producing a contrast ratio of ~2.8:1. WCAG AA requires 4.5:1 for normal text. Link color `#3b6ef8` on dark background hits ~3.2:1.  
**Where**: `style.css` — search for `rgba(255,255,255,0.48)` and `color: #3b6ef8`  
**Why it matters**: Fails accessibility audits. Affects ~8% of users with vision impairments and hurts SEO (Lighthouse accessibility score). Low contrast also reads as low-quality design.  
**Effort**: S  
**Suggested fix**:
- Raise muted text opacity from `0.48` → `0.65` minimum (targets ~4.6:1 ratio)
- Change link color to `#6090ff` or `#7ba8ff` which clears 4.5:1 on the dark background
- Run final check with the [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) before shipping

---

### 7. Chat widget has no `role="dialog"` and messages have no `aria-live` region

**What**: The chat panel is a visually distinct overlay but is missing `role="dialog"`, `aria-modal="true"`, and a focus trap. The message container has no `aria-live="polite"`, so screen readers never announce new messages.  
**Where**: `index.html:2252` (chat panel), `index.html:2275` (message container)  
**Why it matters**: Screen reader users can't use the chat feature at all — new messages are invisible to assistive tech. This blocks a core interaction for a disability-rights-adjacent brand.  
**Effort**: S  
**Suggested fix**:
- Add `role="dialog" aria-modal="true" aria-label="Chat with Panos"` to the chat panel element
- Add `aria-live="polite" aria-atomic="false"` to the messages container
- On open, move focus to the chat input; on close, restore focus to the trigger button

---

### 8. FAQ accordion buttons missing initial `aria-expanded` state

**What**: FAQ `.faq-q` buttons have no `aria-expanded` attribute in the HTML. The script only adds it after the first click, so the initial closed state is invisible to screen readers.  
**Where**: `index.html` — all `.faq-q` buttons; `script.js:2350`  
**Why it matters**: Screen readers announce FAQ items as plain buttons with no disclosure state. Users can't know whether content is hidden or that clicking will reveal anything.  
**Effort**: S  
**Suggested fix**:
- Add `aria-expanded="false"` to every `.faq-q` button in the HTML source
- The existing JS toggle logic already flips the attribute — no script changes needed
- Also add `aria-controls="faq-answer-N"` linking each button to its answer panel

---

### 9. Charity autocomplete shows no feedback during search — users think it's broken

**What**: The charity search dropdown has a 300ms debounce but no visual feedback during the wait. Users who type and pause see nothing for ~300ms and assume the feature isn't working.  
**Where**: `tool-utils.js:1426-1437`  
**Why it matters**: On the charitable-giving tool, charity search is the primary interaction. Perceived unresponsiveness causes abandonment before any result loads.  
**Effort**: S  
**Suggested fix**:
- Show a "Searching…" spinner or text immediately on keydown (before the debounce fires)
- Hide it when results appear or after a timeout
- On network error, show "Search unavailable — try again" instead of silently closing the dropdown

---

### 10. "See My Work" CTA scrolls to company list, not actual work samples

**What**: The primary hero CTA says "See My Work" but targets `#projects`, which shows logos of companies/affiliations — not portfolio pieces, case studies, or tangible outputs.  
**Where**: `index.html:678`  
**Why it matters**: Visitors clicking the primary CTA expecting work samples hit a wall of logos and bounce. This is the single highest-traffic click on the page and it under-delivers.  
**Effort**: S  
**Suggested fix**:
- Rename the button to "My Projects" or "Where I Work" to match what the section actually shows
- OR add a genuine "work" section (case studies, writing, tools built) and point the CTA there
- If keeping the companies section, add 1-line context under each logo explaining the role/output

---

### 11. Search modal has no focus trap or focus restoration

**What**: The search modal has `role="dialog"` and `aria-modal="true"`, but Tab focus can escape to the page behind it. When closed, focus is not returned to the trigger element.  
**Where**: `index.html:2329`, `script.js` (modal open/close handlers)  
**Why it matters**: Keyboard-only users get stranded in the background page. WCAG 2.1.2 (No Keyboard Trap) and 2.4.3 (Focus Order) violations.  
**Effort**: M  
**Suggested fix**:
- On modal open, store the triggering element and call `.focus()` on the first focusable element inside
- Add a keydown listener that wraps Tab within the modal's focusable elements
- On close, call `.focus()` on the stored trigger element

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 12. `showError()` and markdown parser duplicated across three files

**What**: Error display logic is re-implemented in `tool-utils.js:317-326`, `chat.js:177-179`, and `script.js:407-411`. Markdown parsing (bold, italic, links) is separately implemented in `tool-utils.js:222-226` and `chat.js:16-25`.  
**Where**: Files listed above  
**Why it matters**: A bug fix or style change to error display must be applied in three places. Markdown rendering differences between chat and tools create inconsistent output.  
**Effort**: M  
**Suggested fix**:
- Create `utils.js` with `showError(msg)`, `parseMarkdown(text)`, and `safeFetch(url, opts)`
- Import/include it on all pages that use these patterns
- Delete the duplicate implementations

---

### 13. `tool-utils.js` is 1,680 lines with no internal organisation

**What**: The shared tool utility library mixes rate-limiting logic, DOM manipulation, API calls, markdown parsing, charity search, and streaming response handling in a single file with no clear sections or exports.  
**Where**: `tool-utils.js` (entire file)  
**Why it matters**: Any edit to one tool's behaviour risks breaking all 12 tool pages. New tool pages copy-paste from this file, compounding the duplication. Onboarding a contributor is very difficult.  
**Effort**: L  
**Suggested fix**:
- Group functions into logical blocks with `// === SECTION ===` headers as a first pass
- Extract the rate-limiting logic and charity-search autocomplete into standalone modules
- Long-term: move to ES modules so tree-shaking can reduce per-page bundle size

---

### 14. No global unhandled rejection handler — silent failures in production

**What**: There is no `window.addEventListener('unhandledrejection', ...)` or `window.onerror` handler anywhere in the codebase. Async errors that aren't explicitly caught disappear without any log or user signal.  
**Where**: `script.js`, `chat.js`, `tool-utils.js` — global scope  
**Why it matters**: You have no visibility into production failures. Users experience broken UI; you see nothing.  
**Effort**: S  
**Suggested fix**:
- Add to `script.js` (or a new `error-handler.js` loaded on every page):
  ```js
  window.addEventListener('unhandledrejection', e => {
    console.error('Unhandled promise rejection:', e.reason);
    // optionally: posthog.capture('js_error', { reason: String(e.reason) })
  });
  ```
- Consider sending these events to PostHog for production visibility

---

### 15. Cloudflare Worker rate limiting resets on every cold start

**What**: Rate limiting in `cloudflare-worker.js` uses an in-memory `Map` to track request counts. Workers are ephemeral — the map is wiped on every cold start, making rate limits ineffective under low traffic or after any deployment.  
**Where**: `cloudflare-worker.js:104-124`  
**Why it matters**: A determined user can bypass the rate limit by triggering a new Worker instance (e.g., spacing requests to allow cold starts). This risks unexpected AI API costs.  
**Effort**: M  
**Suggested fix**:
- Replace the in-memory Map with Cloudflare KV or a Durable Object for persistent per-IP counters
- Alternatively, offload rate limiting to the AI provider's built-in rate limits and remove the custom logic
- At minimum, document that current rate limiting is best-effort and monitor API spend

---

### 16. Zero test coverage on six critical user paths

**What**: No `test/` directory, no Jest/Vitest config, no E2E tests exist. Six user-facing flows have no automated coverage: contact form, chat, all AI tool pages, search, offline mode, mobile menu keyboard nav.  
**Where**: Entire repository  
**Why it matters**: Any refactor or dependency update is a blind change. The contact form and chat widget are the primary conversion actions — breaking them is a direct business impact with no safety net.  
**Effort**: L  
**Suggested fix**:
- Start with two Playwright E2E tests: contact form happy path + chat happy path
- Add a unit test for `parseMarkdown()` once it's extracted to a shared utility
- Add a Lighthouse CI check to the GitHub Actions workflow to catch contrast/a11y regressions automatically

---

## 💡 P3 — Nice to have

### 17. Clipboard copy failure is silently swallowed

**What**: The copy-to-clipboard handler in `script.js:694` has an empty `.catch(() => {})`. Users on HTTP or in restricted browsers get no feedback when copy fails.  
**Where**: `script.js:694`  
**Why it matters**: Minor annoyance — copy button appears to work but doesn't. Easy fix.  
**Effort**: S  
**Suggested fix**:
- In the catch block, change the copy button label to "Copy failed — select manually" for 2 seconds
- Log the error so it's visible in PostHog replays

---

### 18. No Content Security Policy — XSS attack surface open

**What**: No `Content-Security-Policy` meta tag or header is set. All inline scripts and external CDN resources run without restriction.  
**Where**: `index.html` — `<head>` section  
**Why it matters**: Low risk given no user-generated content, but CSP is a zero-cost defence-in-depth layer that also satisfies security auditors.  
**Effort**: M  
**Suggested fix**:
- Start with a report-only CSP to enumerate violations without breaking anything
- Tighten to an enforced policy once violations are understood
- Use the [CSP Evaluator](https://csp-evaluator.withgoogle.com/) to validate

---

### 19. `style.css` is 8,198 lines — all styles in one file

**What**: The entire site's CSS is a single monolithic file. Unrelated sections (hero, tools, chat widget, mobile nav) are interspersed, making targeted changes risky.  
**Where**: `style.css` (entire file)  
**Why it matters**: Not immediately blocking anything, but makes large style changes slow and error-prone. A Lighthouse audit shows unused CSS as a performance flag.  
**Effort**: L  
**Suggested fix**:
- Split into logical partials: `base.css`, `nav.css`, `hero.css`, `tools.css`, `chat.css`
- Use a build step (Vite, esbuild) to bundle and purge unused selectors
- Do this incrementally — move one section at a time without breaking anything

---

### 20. AI tool pages (12 files) share no template — copy-paste duplication

**What**: Each tool page (e.g., `what-would-x-do.html`, others) duplicates the same nav, footer, analytics, and error-handling scaffolding. Changes to the nav require editing 12 files.  
**Where**: All `*.html` tool pages  
**Why it matters**: Currently manageable. Becomes painful as the tool count grows or brand updates require touching every page.  
**Effort**: L  
**Suggested fix**:
- Introduce a lightweight build step (11ty, Astro, or simple HTML includes via a script) to share the shell
- Extract nav + footer into a single included partial
- No need for a full framework — the site is intentionally simple and should stay that way
