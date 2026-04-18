# Givelink Personal Website — Improvement Plan

_Audited: 2026-04-18 | Codebase: vanilla HTML/CSS/JS, Cloudflare Workers backend_

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### P0-1 · Notify secret exposed in client-side JavaScript

- **What:** `TOOL_NOTIFY_SECRET` is hardcoded in public JavaScript and can be read by anyone who opens DevTools.
- **Where:** `tool-utils.js:11` — `const TOOL_NOTIFY_SECRET = 'panos-notify-2026-xyz';`
- **Why it matters:** Any visitor can spoof notification events or abuse the endpoint; this is a live security hole in production.
- **Effort:** S
- **Suggested fix:**
  - Move the secret into a Cloudflare Worker environment variable (`wrangler secret put NOTIFY_SECRET`).
  - The Worker already handles the request server-side (`cloudflare-worker.js`), so the client never needs the secret — just remove the header from the client call and authenticate it inside the Worker.
  - Rotate the current secret immediately after the fix is deployed.

---

### P0-2 · Share-link clipboard copy silently fails with no user feedback

- **What:** `navigator.clipboard.writeText()` for the share-link button has no `.catch()` handler; failures are invisible to the user.
- **Where:** `tool-utils.js:487`
  ```js
  navigator.clipboard.writeText(window.location.href).then(() => { ... }); // no catch
  ```
- **Why it matters:** Clipboard access requires HTTPS and explicit permission. On some mobile browsers or within iframes it throws — the user clicks "Copy link" and nothing happens.
- **Effort:** S
- **Suggested fix:**
  - Add `.catch(() => { showToast('Could not copy — try selecting the URL manually'); })`.
  - Optionally fall back to `document.execCommand('copy')` for legacy support (already used elsewhere in the codebase).
  - Audit the two other bare clipboard calls at `tool-utils.js:405` and `script.js:694` for the same pattern.

---

### P0-3 · Contact form swallows server errors and shows `alert()` dialogs

- **What:** On Formspree 4xx/5xx responses the form calls `alert()` with a generic message; server validation errors (e.g. honeypot triggered, rate limit) are never surfaced.
- **Where:** `script.js:388–411`
- **Why it matters:** Users who hit a deliverability issue think they've sent a message when they haven't; `alert()` is also blocked by some browsers in iframes.
- **Effort:** S
- **Suggested fix:**
  - Parse the Formspree JSON error body and display it inline below the submit button using the existing `#formStatus` element.
  - Replace both `alert()` calls with the same inline element (already styled in `style.css`).
  - Disable the submit button while the request is in-flight to prevent double-submission.

---

### P0-4 · Streaming response reader has no error handling around `reader.read()`

- **What:** The `while (true)` loop that consumes the AI stream does not wrap `reader.read()` in try/catch; a mid-stream network drop throws an unhandled promise rejection.
- **Where:** `tool-utils.js:139–173`
- **Why it matters:** A dropped connection during a long AI generation leaves the results panel in a perpetual loading state with no recovery path and a console error.
- **Effort:** S
- **Suggested fix:**
  - Wrap the `reader.read()` call in try/catch; on error call `showError('Stream interrupted — please try again')` and break out of the loop.
  - Re-enable the run button so the user can retry without refreshing the page.
  - Set a 30-second inactivity timeout on the reader to catch stalled streams.

---

### P0-5 · Rate-limit countdown is hardcoded at 30 seconds regardless of actual limit

- **What:** The rate-limit error UI always counts down from 30 seconds even when the Worker returns a different `Retry-After` value.
- **Where:** `tool-utils.js:317–327`
- **Why it matters:** If the actual cooldown is 60 seconds, users retry at 30 seconds, get a second error, and blame the product.
- **Effort:** S
- **Suggested fix:**
  - Read the `Retry-After` header from the 429 response: `const wait = res.headers.get('Retry-After') ?? 30`.
  - Pass `wait` into the countdown timer instead of the hardcoded `30`.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### P1-1 · Charity search returns empty silently — no empty-state UI

- **What:** When the ProPublica charity search returns zero results (or the API is down) the results list simply clears with no message.
- **Where:** `tool-utils.js` — charity search result handler (search for `charityResults` or similar autocomplete render)
- **Why it matters:** Users assume they typed something wrong and abandon the flow; an empty state with a suggestion ("Try a shorter name or check the spelling") retains them.
- **Effort:** S
- **Suggested fix:**
  - After rendering results, check `results.length === 0` and inject an `<li class="empty-state">No results found — try a shorter name</li>`.
  - On API error inject `<li class="error-state">Search unavailable — try again in a moment</li>` so the failure is visible.

---

### P1-2 · Chat widget connection errors have no retry button

- **What:** When the AI fetch fails, the widget shows a generic error message but gives the user no actionable next step.
- **Where:** `chat.js:177`
- **Why it matters:** Users hitting a transient Worker error close the widget and never re-engage; a retry button keeps them in the flow.
- **Effort:** S
- **Suggested fix:**
  - Append a "Try again" button to the error message bubble that re-submits the last user message.
  - Preserve the last user input so the user does not need to retype.

---

### P1-3 · Loading skeletons missing `aria-busy` — screen readers get no progress signal

- **What:** When AI tool results are loading, the container that shows skeleton loaders does not set `aria-busy="true"`, so screen readers give no indication that content is loading.
- **Where:** `tool-utils.js:329–350` (result container rendering); `index.html` — individual tool `#resultBox` containers
- **Why it matters:** Blind/low-vision users who trigger an AI tool hear nothing until the result appears; WCAG 2.1 §4.1.3 (Status Messages) requires this.
- **Effort:** S
- **Suggested fix:**
  - Set `resultBox.setAttribute('aria-busy', 'true')` when loading begins; set it to `'false'` when `showResult()` or `showError()` completes.
  - Add `role="status"` to the result container so the populated content is announced.

---

### P1-4 · Confetti colors use an off-brand mixed palette

- **What:** The achievement confetti burst uses six hardcoded colors that include green, orange, and red — none of which are in the site's design tokens.
- **Where:** `script.js:173` — `['#3b6ef8', '#d4af37', '#10b981', '#f43f5e', '#8b5cf6', '#f97316']`
- **Why it matters:** Brand fragmentation; the confetti feels borrowed from a different product and undermines the premium look.
- **Effort:** S
- **Suggested fix:**
  - Replace with brand-adjacent values: `['#6c4bff', '#3b6ef8', '#f4a924', '#ff6268', '#a78bfa', '#fbbf24']` (purples, blues, golds).
  - Define them as a `CONFETTI_PALETTE` constant so future changes are in one place.

---

### P1-5 · `.btn-givelink` gradient uses an untracked salmon/red that is not in any design token

- **What:** The primary CTA button for Givelink links uses `linear-gradient(135deg, #6c4bff, #ff6268)` — the endpoint `#ff6268` (salmon-red) appears nowhere else in the design system.
- **Where:** `style.css:202`
- **Why it matters:** When placed next to other purple/blue elements the salmon tail clashes visually; it also blocks future brand token rollouts.
- **Effort:** S
- **Suggested fix:**
  - Replace `#ff6268` with `#C2185B` (brand pink) or `#E353B6` to align with the Givelink brand palette.
  - Add the gradient endpoints as CSS custom properties (`--gradient-start`, `--gradient-end`) in `:root` so they can be updated globally.

---

### P1-6 · Hero background orb uses `#7c3aed` (Tailwind purple) instead of a brand token

- **What:** One of the three hero background orbs is coloured with `#7c3aed`, a Tailwind-shipped value that diverges from `--blue: #3b6ef8` and the Givelink purples.
- **Where:** `style.css:356`
- **Why it matters:** On certain monitor calibrations this creates a visible colour seam in the gradient background.
- **Effort:** S
- **Suggested fix:**
  - Replace `#7c3aed` with `#6B3FA0` (brand purple) or the existing CSS variable for the Givelink gradient start.
  - Run a quick visual regression on the hero section across light/dark displays.

---

### P1-7 · Quiz overlay close handler is fragile and breaks on iOS Safari

- **What:** The AI tools quiz overlay closes by checking `if (event.target === this)` in an inline `onclick` attribute — this fails on iOS Safari when tap targets are small and events bubble unexpectedly.
- **Where:** `ai-tools.html:717–729` (inline `onclick` on overlay `<div>`)
- **Why it matters:** Mobile users on iOS cannot dismiss the quiz overlay by tapping outside it; they must either complete or abandon the quiz, increasing drop-off.
- **Effort:** S
- **Suggested fix:**
  - Move the handler to a `addEventListener('click', ...)` in a script block.
  - Use a dedicated invisible close backdrop element (`position:fixed; inset:0; z-index:N-1`) rather than relying on event target equality.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### P2-1 · Markdown parsing duplicated across `chat.js` and `tool-utils.js`

- **What:** Two nearly-identical functions — `parseMarkdown()` (`chat.js:16–25`) and `formatMarkdown()` (`tool-utils.js:222–226`) — apply the same regex transforms independently.
- **Where:** `chat.js:16–25`, `tool-utils.js:222–226`
- **Why it matters:** Any markdown quirk fix must be applied twice; the two implementations have already diverged (chat supports bold, tools do not support `**`).
- **Effort:** S
- **Suggested fix:**
  - Extract a single `renderMarkdown(text)` function into a new `utils.js` module.
  - Import it via `<script type="module">` in both pages (the service worker already handles caching).

---

### P2-2 · Copy-to-clipboard pattern repeated three times with no shared abstraction

- **What:** The same clipboard write + fallback + toast pattern appears in `script.js:694`, `tool-utils.js:405`, and `tool-utils.js:487`.
- **Where:** `script.js:694`, `tool-utils.js:405`, `tool-utils.js:487`
- **Why it matters:** The missing `.catch()` on the third instance (P0-2 above) proves the danger: diverged copies accumulate inconsistencies.
- **Effort:** S
- **Suggested fix:**
  - Create a single `copyToClipboard(text, successMessage)` helper that handles the write, the `execCommand` fallback, and the toast in one place.
  - Replace all three call sites.

---

### P2-3 · `tool-utils.js` is 1,680 lines with unrelated concerns mixed together

- **What:** A single file handles streaming I/O, markdown rendering, toast notifications, rate-limit UX, PWA install, charity search, and share links.
- **Where:** `tool-utils.js` (entire file)
- **Why it matters:** Any change requires reading 1,680 lines to understand blast radius; section comments exist but cannot substitute for module boundaries.
- **Effort:** M
- **Suggested fix:**
  - Extract into three files: `stream-utils.js` (fetch + streaming), `ui-utils.js` (toasts, loading states, markdown), `share-utils.js` (clipboard, share links).
  - No logic changes needed — purely a cut-and-paste split with updated `<script>` tags.

---

### P2-4 · `index.html` is 11,517 lines — a single broken tag can corrupt the entire page

- **What:** All 11 AI tools, the contact form, the journey tracker, the books section, and the header/footer live in one file.
- **Where:** `index.html` (entire file)
- **Why it matters:** A merge conflict or accidental edit in the 6,000-line tool section can take down the entire site; load time also suffers because the browser must parse the full document for every page view.
- **Effort:** L
- **Suggested fix:**
  - Move each major section (AI tools, books, journey, contact) into a separate `<section>` partial loaded via `fetch` + `innerHTML` or (better) via individual HTML pages with shared nav/footer.
  - Start with the largest discrete unit (AI tools) to get the most risk reduction per hour of work.
  - Keep the change purely structural — no logic moves, no redesign.

---

### P2-5 · In-memory rate limiting loses state on every Cloudflare Worker restart

- **What:** The rate-limit map in `cloudflare-worker.js` is stored in module-level memory (`const rateLimitMap = new Map()`), which Cloudflare Workers do not persist across restarts or isolate reuse.
- **Where:** `cloudflare-worker.js` (rate limit implementation)
- **Why it matters:** A Worker restart (which can happen on traffic spikes) resets all rate-limit counters, allowing a burst of free requests. Conversely, a cold start may assign the same in-memory slot to two different users.
- **Effort:** M
- **Suggested fix:**
  - Migrate to Cloudflare KV for rate-limit state: `await KV.put(key, count, { expirationTtl: 60 })`.
  - KV writes are eventually consistent but that is acceptable for soft rate limiting.

---

### P2-6 · Duplicate toast notification implementation in `script.js` vs `tool-utils.js`

- **What:** Achievement toasts (`script.js:287–296`) and milestone toasts (`tool-utils.js:251–273`) are separate implementations with different animation timings and ARIA handling.
- **Where:** `script.js:287–296`, `tool-utils.js:251–273`
- **Why it matters:** Users see inconsistent toast durations (2.5s vs 3s) depending on which event triggered it; ARIA `role` is set on one but not the other.
- **Effort:** S
- **Suggested fix:**
  - Unify into one `showToast(message, type, durationMs)` helper (can live in `ui-utils.js` per P2-3).
  - Set `role="status"` and `aria-live="polite"` on the shared toast element.

---

## 💡 P3 — Nice to have

### P3-1 · Inline `onclick` attributes across multiple pages prevent reliable unit testing

- **What:** Dozens of buttons across `ai-tools.html`, `index.html`, and `chat.js` attach handlers via inline `onclick="fn()"` rather than `addEventListener`.
- **Where:** `ai-tools.html:717–729`, `chat.js:104`, `index.html` (multiple)
- **Why it matters:** Inline handlers cannot be easily replaced in tests, create a global namespace dependency, and resist CSP policies.
- **Effort:** M
- **Suggested fix:**
  - Progressively migrate to `addEventListener` as files are touched for other fixes.
  - Add a `default-src 'self'` CSP header in the Cloudflare Worker to prevent script injection — this will also surface remaining inline handlers as console errors.

---

### P3-2 · Service worker caches HTML pages but offline form submission has no queue

- **What:** `sw.js` caches the site shell for offline use, but a contact form submission made offline fails silently with no retry queue.
- **Where:** `sw.js:1–90`
- **Why it matters:** If a user is on a flaky connection and submits the contact form just as they go offline, their message is lost with no indication.
- **Effort:** M
- **Suggested fix:**
  - Use the Background Sync API (`sw.js` `sync` event + IndexedDB queue) to hold form payloads until connectivity returns.
  - Show an inline "Message queued — will send when online" status message.

---

### P3-3 · No JSDoc on complex public functions in `tool-utils.js`

- **What:** Functions like `streamToolRequest()`, `buildShareParams()`, and `renderCharityResult()` have no parameter or return type documentation.
- **Where:** `tool-utils.js` (throughout)
- **Why it matters:** New contributors (or a future AI coding assistant) must reverse-engineer call signatures from usage, slowing down onboarding.
- **Effort:** S
- **Suggested fix:**
  - Add a one-line `@param` + `@returns` JSDoc comment to the ~10 most-called functions.
  - Pair with VS Code's built-in type inference so autocomplete starts working without TypeScript migration.

---

_Total items: 18 across P0–P3._
