# Givelink / Personal Website — Improvement Plan
_Generated: 2026-06-23 · Codebase: vanilla HTML/CSS/JS + Cloudflare Worker_

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. PostHog silently splits analytics data across two regions
**What:** 4 pages send events to `eu.posthog.com` and 4 others to `us.posthog.com` — events land in different project partitions and are never merged.  
**Where:** `now.html:53`, `index.html:518`, `beliefs.html:53`, `books.html:54` → `us.posthog.com` · `podcast.html:57`, `watch.html:57`, `offline.html:62`, `404.html:57` → `eu.posthog.com`  
**Why it matters:** Dashboard shows half the real traffic; conversion funnels are broken at page-boundary transitions (e.g., index → tool → result).  
**Effort:** S  
**Suggested fix:**
- Pick one host (e.g. `us.posthog.com`) and update all 8 pages to use it consistently.
- Add a grep lint step (or pre-commit hook): `grep -r "posthog.com" *.html` to catch drift.

---

### 2. Search falls back silently to "No results" on fetch failure
**What:** When `search-index.json` fails to load, `catch (e) { searchIndex = []; }` sets an empty array — any search query returns a "No results" UI with no indication the feature is broken.  
**Where:** `search.js:15–17`  
**Why it matters:** A visitor searching for "Givelink" or "AI tools" sees a dead search box and assumes the content doesn't exist, rather than knowing to retry.  
**Effort:** S  
**Suggested fix:**
- Replace `searchIndex = []` with `searchIndex = null` and keep a `loadFailed = true` flag.
- In the render function, when `loadFailed`, display "Search unavailable — try refreshing" instead of "No results".

---

### 3. Chat error is a dead-end with no retry affordance
**What:** The catch block on Anthropic API calls adds a hardcoded error message to the chat log with no way to retry except typing the message again.  
**Where:** `chat.js:177–179`  
**Why it matters:** Network hiccups are common; a user who hit send and got an error is most likely to close the chat rather than retype their message — losing the conversion intent.  
**Effort:** S  
**Suggested fix:**
- Store the last sent message in a variable.
- In the catch block, append the error message plus a "↩ Retry" button that re-calls `sendMessage()` with the stored content.
- Track `posthog.capture('chat_error')` so failure rate is visible.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 4. Rate-limit countdown traps users on error for 30 seconds
**What:** When a tool hits its rate limit, a non-dismissible error replaces the UI with a live 30-second countdown that cannot be closed.  
**Where:** `tool-utils.js:205–220`  
**Why it matters:** Forcing a visitor to stare at an error screen for 30 seconds guarantees a bounce; they cannot navigate away from the error without losing their place.  
**Effort:** S  
**Suggested fix:**
- Add a dismiss/close button to the error element that calls `hideError()` and `clearInterval(_timer)`.
- Reduce countdown to 15s (the UI penalty is UX friction, not a real security control — the rate limit lives server-side in the Cloudflare Worker).
- Keep the countdown visible but non-blocking: show it as a toast overlay rather than replacing the form.

---

### 5. Muted text fails WCAG AA contrast on dark backgrounds
**What:** `--text-muted: rgba(255,255,255,0.48)` on `#0d1530` background yields ~4.2:1 contrast — below the 4.5:1 WCAG AA minimum. Additional offenders at 0.3 and 0.35 opacity are far worse.  
**Where:** `style.css:19` (token definition) · `style.css:113`, `437`, `441`, `465`, `581` (additional low-opacity instances)  
**Why it matters:** Secondary text — role descriptions, project types, date labels, timeline locations — is illegible for users with moderate vision impairment. Also a liability risk if the site ever undergoes accessibility audit.  
**Effort:** S  
**Suggested fix:**
- Raise `--text-muted` to `rgba(255,255,255,0.62)` (~5.5:1 on `#0d1530`).
- Audit and raise all raw `rgba(255,255,255,0.3x)` instances to at minimum `0.55`.
- Use the [APCA contrast checker](https://www.myndex.com/APCA/) for a quick bulk pass.

---

### 6. Mobile navigation has no focus trap — keyboard users tab behind the overlay
**What:** When the hamburger menu opens, Tab continues cycling through page content behind the overlay; focus is never restored to the hamburger button on close.  
**Where:** `script.js:33–69` (open/close logic)  
**Why it matters:** Keyboard-only and switch-device users (and screen reader users in browse mode) cannot reliably use the navigation — they either get lost in the page or the menu appears to not function.  
**Effort:** M  
**Suggested fix:**
- On menu open: collect all focusable elements inside `#navMobile`, focus the first, and add a `keydown` handler that cycles focus between first and last on Tab/Shift+Tab and closes on Escape.
- On menu close: return focus to `#hamburger`.
- Reference: MDN's [Dialog focus management pattern](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/dialog_role).

---

### 7. No skip-to-content link — keyboard traversal of nav is mandatory
**What:** Every page lacks a visually-hidden "Skip to main content" link at the top of `<body>`, forcing keyboard and screen reader users to tab through the full navigation bar before reaching any content.  
**Where:** `index.html` (and all tool pages — no shared header template)  
**Why it matters:** The nav has ~10 items plus social icons; on tool pages with the sidebar, a keyboard user makes 15+ Tab presses before reaching the tool form. Common accessibility expectation and a quick win.  
**Effort:** S  
**Suggested fix:**
- Add `<a href="#main-content" class="skip-link">Skip to main content</a>` as the first element in `<body>`.
- Add `id="main-content"` to the main landmark element on each page.
- Style: `position: absolute; left: -9999px;` with `:focus { left: 1rem; }`.

---

### 8. Givelink CTA — the site's most important button generates no analytics event
**What:** The Givelink "Try Givelink →" button on the homepage project card is not instrumented; no PostHog, GA, or Plausible event fires when it is clicked.  
**Where:** `index.html` (Givelink project card section) · `script.js` (no corresponding event handler found)  
**Why it matters:** Givelink is described as the site's primary purpose in the title tag and meta description. Without click tracking you cannot measure conversion intent from visitors who arrive via Forbes/WEF/LinkedIn profiles.  
**Effort:** S  
**Suggested fix:**
- Add a click listener to the Givelink CTA button:  
  `posthog.capture('givelink_cta_clicked', { source: 'project_card' })`
- Also track App Store and Play Store badge clicks separately so you know which platform drives downloads.
- Set up a PostHog funnel: `pageview` → `givelink_cta_clicked` → (session ends on givelink.app) to measure referral effectiveness.

---

### 9. Three analytics scripts load on every page — redundant and slow
**What:** Every page loads Plausible, PostHog, and Google Analytics simultaneously, with separate network requests, JS parse time, and cookie/storage writes.  
**Where:** `index.html:57–59` (Plausible), `index.html:506–524` (PostHog), `index.html:~530` (GA4) — replicated across all pages  
**Why it matters:** ~3 analytics scripts add ~80–150ms of JS execution on cold load; Plausible and PostHog have substantial feature overlap; GA fires third-party cookies which conflict with the site's own privacy policy page.  
**Effort:** M  
**Suggested fix:**
- Designate PostHog as the primary product analytics tool (it has funnels, session replay, and event capture that Plausible lacks).
- Keep Plausible only if you need a public-facing traffic dashboard (it's privacy-first with no cookie wall needed).
- Remove GA4 entirely — the consent banner friction it creates costs more than the marginal audience data it adds, and PostHog covers the same needs.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 10. `tool-utils.js` is a 1,680-line monolith covering unrelated concerns
**What:** A single file implements streaming text output, milestone toasts, email capture forms, history drawer, result sharing, markdown formatting, and tool rating UI.  
**Where:** `tool-utils.js:1–1680`  
**Why it matters:** Any change to the streaming logic risks breaking the sharing UI; it's impossible to tree-shake or independently test; onboarding a contributor to the AI tools means reading 1,680 lines to understand any one feature.  
**Effort:** L  
**Suggested fix:**
- Split into: `streaming.js` (lines ~1–200), `sharing.js` (~700–820), `history.js` (~820–930), `ratings.js` (~930–1000).
- Keep a thin `tool-utils.js` that imports and re-exports for backwards compat during migration.
- No behaviour changes needed — pure refactor.

---

### 11. Three independent toast implementations with inconsistent styling
**What:** Toast notifications are implemented three separate ways: `showToast()` in `script.js:288` (achievement toasts), milestone toast in `tool-utils.js:260`, and result-rating toast in `tool-utils.js:~960`. Each has different animation, dismiss logic, and CSS classes.  
**Where:** `script.js:288–305` · `tool-utils.js:239–275` · `tool-utils.js:960–980`  
**Why it matters:** Adding a new notification type means picking one of three inconsistent patterns; styling changes must be made in three places; Escape-to-dismiss works in some but not others.  
**Effort:** M  
**Suggested fix:**
- Create a single `showToast(text, { color, duration, dismissible })` function.
- Consolidate all three CSS class families (`.achievement-toast`, `.tool-toast`) into one `.toast` component in `style.css`.
- Replace all three call sites with the unified function.

---

### 12. No timeout on Anthropic API calls in the Cloudflare Worker
**What:** The Worker proxies requests to Anthropic's API with no `AbortController` timeout; a slow or hung upstream response will hold the Worker request open until Cloudflare's platform-level 30s CPU timeout kills it — with no meaningful error returned to the client.  
**Where:** `cloudflare-worker.js` (Anthropic fetch, no `signal` or timeout found)  
**Why it matters:** Users on slow connections may see the chat input spinner for 20–29 seconds before getting a generic error; there's no way to distinguish "API is slow" from "API is down".  
**Effort:** S  
**Suggested fix:**
```js
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 20000);
const res = await fetch('https://api.anthropic.com/...', {
  signal: controller.signal,
  ...
});
clearTimeout(timeoutId);
```
- Return a structured `{ error: 'timeout' }` JSON response so the client can show "Taking longer than usual — please retry".

---

### 13. API errors are swallowed silently — no observability into tool failure rates
**What:** Catch blocks in `chat.js:177`, `tool-utils.js`, and `search.js:15` show error UI but fire no analytics event — there is no way to know from PostHog how often tools fail or which errors are most common.  
**Where:** `chat.js:177` · `search.js:15` · `tool-utils.js:195–203`  
**Why it matters:** If the Anthropic API degrades or a rate limit is misconfigured, you will only learn about it from user complaints rather than from a spike in an error metric.  
**Effort:** S  
**Suggested fix:**
- In each catch block, add:  
  `posthog.capture('tool_error', { tool: TOOL_NAME, error: e.message, status: res?.status })`
- Set up a PostHog alert for `tool_error` count > 5 in any 10-minute window.

---

## 💡 P3 — Nice to have

### 14. Quote attribution and timeline location text at critically low contrast
**What:** `.hero-quote-attr` uses `rgba(255,255,255,0.3)` and `.tl-loc` uses `rgba(255,255,255,0.35)` — roughly 2.5:1, failing even WCAG A (minimum 3:1).  
**Where:** `style.css:441` · `style.css:581`  
**Why it matters:** These elements are decorative-adjacent but still carry content ("— Tim Ferriss", "San Francisco, CA"). Users with any visual impairment cannot read them.  
**Effort:** S  
**Suggested fix:**
- Raise both to `rgba(255,255,255,0.55)` for ~4.7:1, which passes WCAG AA.

---

### 15. Givelink project card button uses approximate brand colours, not exact hex values
**What:** The Givelink button uses `linear-gradient(135deg, #6c4bff, #ff6268)` — close to but not the official Givelink brand purple (#6B3FA0 / #5718CA) and pink (#C2185B / #E353B6).  
**Where:** `style.css` (Givelink project card button rule) · `index.html` (inline style if any)  
**Why it matters:** The personal site is a first-touch for investors, press, and donors who then visit givelink.app. Colour inconsistency between the two properties is a subtle but real brand credibility signal.  
**Effort:** S  
**Suggested fix:**
- Update button gradient to `linear-gradient(135deg, #6B3FA0, #E353B6)` to use the official palette.
- If the "no pink on purple" rule applies here, use `linear-gradient(135deg, #5718CA, #6B3FA0)` (purple-to-purple) instead.

---

### 16. `aria-hidden="false"` on hero tagline is semantically misleading
**What:** `#heroTagline` carries `aria-hidden="false"`, which is redundant (elements are visible to AT by default) and can confuse assistive technology that treats explicit `false` as an override signal differently from omission.  
**Where:** `index.html:672`  
**Why it matters:** Low risk, but misleads screen reader users if the element ever becomes dynamically hidden — the attribute will need to be toggled, and the inconsistency creates a footgun.  
**Effort:** S  
**Suggested fix:**
- Remove the `aria-hidden="false"` attribute entirely.
- If the typewriter animation updates this element dynamically, add `aria-live="polite"` instead so screen readers announce the completed text once.
