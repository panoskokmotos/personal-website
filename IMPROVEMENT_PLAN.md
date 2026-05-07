# Givelink / Personal Website — Improvement Plan

Audited: 2026-05-07 · 20 items across 4 tiers · ordered by ROI within each tier

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. `NOTIFY_SECRET` hardcoded in client-side JavaScript

**What:** A shared auth secret is baked in plaintext into two public JS files, exposing it to anyone who opens browser DevTools or views source.

**Where:** `/script.js:931`, `/tool-utils.js:11`

```js
const NOTIFY_SECRET = "panos-notify-2026-xyz";   // script.js:931
const TOOL_NOTIFY_SECRET = 'panos-notify-2026-xyz'; // tool-utils.js:11
```

**Why it matters:** Anyone can forge authenticated "tool used" or "visit" notifications to the Cloudflare Worker endpoint — polluting analytics and potentially abusing the notification flow indefinitely.

**Effort:** S

**Suggested fix:**
- Remove the secret from both client files entirely; the worker should authenticate using a Cloudflare Worker `env.NOTIFY_SECRET` env var set in `wrangler.jsonc`, never visible to the browser.
- Replace the client-side auth pattern with an opaque worker endpoint that doesn't require a secret (rate-limit by IP instead).
- Rotate the existing secret in the Cloudflare dashboard immediately since it has already been public.

---

### 2. Clipboard `writeText()` called without `.catch()` — silent failures

**What:** Three separate calls to `navigator.clipboard.writeText()` have no rejection handler; they fail silently when clipboard access is unavailable (HTTP context, permissions denied, or Firefox Private Mode).

**Where:** `/tool-utils.js:405`, `/tool-utils.js:487`, `/tool-utils.js:629`

**Why it matters:** Users see the "Copy" button do nothing with no feedback — looks like a broken feature on a significant share of browsers and contexts.

**Effort:** S

**Suggested fix:**
- Add `.catch()` to all three call sites with a `document.execCommand('copy')` fallback.
- Show a brief toast ("Copied!" / "Copy failed — select manually") on both success and failure.
- Consolidate all three into the single shared utility described in P2 item 13 so fixes propagate automatically.

---

### 3. PostHog initialised with conflicting regions across pages

**What:** The same PostHog project key is inlined on every HTML page but `ui_host` differs: `eu.posthog.com` on `/watch.html` and `us.posthog.com` on `/beliefs.html` (and other pages).

**Where:** `/watch.html:57`, `/beliefs.html:53`, `/podcast.html` (check host), `/404.html` (check host)

**Why it matters:** Events from different pages end up in different PostHog regional clusters. Cross-page funnels and session recordings will silently break; some EU-routed data won't appear in a US dashboard and vice-versa.

**Effort:** S

**Suggested fix:**
- Extract PostHog initialisation into a single `/analytics.js` module imported by every page.
- Pick one region (EU recommended for GDPR) and use it consistently.
- Eliminates 11+ copies of the 800-char minified snippet that currently live inline.

---

### 4. Service worker precache install swallows failures silently

**What:** The `install` event calls `cache.addAll(PRECACHE_ASSETS)` inside `.then()` with no `.catch()` — if any asset 404s or the network is unavailable, the install fails and the error is never surfaced.

**Where:** `/sw.js:31-33`

```js
event.waitUntil(
  caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  // no .catch()
);
```

**Why it matters:** When precaching fails, users on flaky connections get no offline fallback. The failure is invisible — no logs, no Sentry event, no way to know the service worker is broken until users report blank pages.

**Effort:** S

**Suggested fix:**
- Chain `.catch(err => console.error('[SW] Precache failed:', err))` onto the `event.waitUntil` promise.
- Consider splitting PRECACHE_ASSETS into critical (must succeed) and optional (nice-to-have) lists and using `Promise.allSettled` for the optional set.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 5. No request timeout on AI tool calls — hangs forever

**What:** All `fetch()` calls to the Cloudflare Worker in the AI tools use no `AbortController` and no timeout signal, so a request on a degraded connection spins indefinitely.

**Where:** `/tool-utils.js:129-196` (streaming path and fallback path)

**Why it matters:** Users on slow or spotty mobile connections see the loading skeleton forever with no recovery path except a hard refresh — they leave thinking the tool is broken.

**Effort:** S

**Suggested fix:**
- Wrap each fetch with an `AbortController`:
  ```js
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 30_000);
  fetch(url, { signal: ctrl.signal, ... }).finally(() => clearTimeout(tid));
  ```
- On `AbortError`, show: "Request timed out — check your connection and try again." with a retry button.

---

### 6. WCAG AA contrast failures on muted text throughout the site

**What:** `--text-muted` is `rgba(255,255,255,0.48)` on dark backgrounds (~3.5:1 contrast ratio). Several inline rules use even lower opacity (0.45 on `.tl-card > p`, timeline text).

**Where:** `/style.css:19` (custom property), `/style.css:430`, `/style.css:437`, `/style.css:606` (inline overrides)

**Why it matters:** Fails WCAG 2.1 AA (minimum 4.5:1 for body text) — accessibility liability, Lighthouse score penalty, and genuinely hard to read for users with moderate vision impairment. Used on card descriptions, project metadata, and about section copy.

**Effort:** S

**Suggested fix:**
- Raise `--text-muted` to `rgba(255,255,255,0.65)` (~5.2:1 on a typical `#0a0a1a` background) — verify with WebAIM Contrast Checker.
- Audit and update the 3–4 inline overrides below 0.60 opacity to match.
- Add a comment in `:root` with the tested contrast ratio so future edits don't regress it.

---

### 7. Award flip cards inaccessible to keyboard users

**What:** On desktop, award cards flip on CSS `:hover` only. The JS handler at line 719 only toggles `.flipped` on touch devices (`hover: none`). Cards have no `tabindex`, no `role`, and no `keydown` handler — keyboard users can't access any award detail text or the "Read more" links inside.

**Where:** `/index.html:1632-1680` (card markup), `/script.js:719-727` (event handler)

**Why it matters:** The awards section is a key credibility signal for the portfolio. Any keyboard-only user (including assistive technology users and power users) sees a static grid of emoji + names with no way to read the details.

**Effort:** S

**Suggested fix:**
- Add `tabindex="0"` and `role="button"` to each `.award-flip` card.
- Extend the JS handler to fire on `focus` and `keydown` (Enter/Space) regardless of `hover` media query.
- Add `:focus-visible` flip styles in CSS so the card visually opens when focused.

---

### 8. `outline: none` on form inputs removes keyboard focus indicator

**What:** Contact form inputs and the email capture input explicitly set `outline: none` with only a `border-color` change on `:focus`, which provides insufficient visual contrast for keyboard focus indication.

**Where:** `/style.css:1966` (contact form), `/style.css:2922` (email capture `.ec-input`)

**Why it matters:** The global `*:focus-visible` rule at line 2726 is correctly defined but these component-level overrides take precedence, silently defeating it for two of the most conversion-critical interactive elements on the page.

**Effort:** S

**Suggested fix:**
- Replace `outline: none` with `outline: none` only inside `@media (hover: hover)` for mouse users, or remove the override entirely and let the global `*:focus-visible` rule handle it.
- Alternatively: keep `outline: none` but ensure the `:focus` border change has at minimum a 3px width with sufficient color contrast.

---

### 9. Chat widget sends raw user message text to PostHog analytics

**What:** `detectAndTrackIntent()` includes `query: text.slice(0, 120)` in the PostHog event payload — meaning the first 120 characters of every matched chat message are stored in analytics.

**Where:** `/chat.js:124-127`

```js
posthog.capture('contact_intent', {
  type,
  query: text.slice(0, 120),  // raw user text
  page: window.location.pathname,
});
```

**Why it matters:** Users haven't consented to their message content being forwarded to a third-party analytics service. This is a GDPR/CCPA exposure risk if any visitor is in the EU or California — and the portfolio is promoted to international investors and press.

**Effort:** S

**Suggested fix:**
- Remove the `query` field from the captured event entirely — the `type` alone is sufficient for routing/analytics.
- The intent is only to categorise the contact type, not store message content.

---

### 10. `console.error()` leaks stack traces on all 11 AI tool pages

**What:** Every tool page's catch block calls `console.error(err)` unconditionally, exposing internal error details and stack traces to anyone who opens the browser console.

**Where:** `/volunteer-match.html:336`, `/charity-comparison-engine.html:310`, `/scam-nonprofit-detector.html:359`, `/first-time-donor-coach.html:300`, `/neighborhood-giving-map.html:269`, `/why-should-i-give.html:337`, `/what-can-i-donate.html:270`, `/impact-story-generator.html:368`, `/community-needs-map.html:261`, `/nonprofit-health-checker.html:250`, `/what-would-x-do.html:730`

**Why it matters:** Leaks internal API error shapes and worker responses to any technically curious user. Also creates noise that obscures genuine browser errors during debugging.

**Effort:** S

**Suggested fix:**
- Remove `console.error(err)` from all 11 catch blocks (the user-facing error message via `showError()` is sufficient).
- If error visibility during development is needed, gate it: `if (location.hostname === 'localhost') console.error(err);`

---

### 11. CORS wildcard on worker amplifies the exposed-secret risk

**What:** The Cloudflare Worker returns `Access-Control-Allow-Origin: *`, allowing any website to make credentialled requests to the worker endpoint. Combined with the exposed `NOTIFY_SECRET` (P0 item 1), any site can forge authenticated notifications from any origin.

**Where:** `/cloudflare-worker.js:127`

**Why it matters:** Once the secret is seen in source, a wildcard CORS header means automated cross-site abuse (notification spam, analytics poisoning) requires zero additional work for an attacker.

**Effort:** S

**Suggested fix:**
- Restrict the CORS origin to `https://panoskokmotos.com` and `https://givelink.app` in the worker's response headers.
- This is a defence-in-depth measure alongside rotating the secret (P0 item 1).

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 12. `style.css` is an 8,198-line render-blocking monolith

**What:** Every page loads a single 8,198-line stylesheet synchronously in `<head>`, forcing the browser to parse the full file before first paint — including styles for tool pages, the portfolio index, awards, chat widget, and more.

**Where:** `/style.css` (entire file), linked in every HTML `<head>`

**Why it matters:** Every page pays the full CSS parse cost regardless of which components it uses. Bloats Time to First Contentful Paint. Any two developers touching the file will produce merge conflicts.

**Effort:** L

**Suggested fix:**
- Split into `base.css` (reset, custom properties, typography), `components.css` (buttons, cards, shared UI), `index.css` (portfolio-specific sections), `tools.css` (AI tool pages).
- Link only the relevant stylesheets per page type.
- Inline ~3KB of above-the-fold critical CSS in `<style>` and defer the rest with `media="print" onload="this.media='all'"`.

---

### 13. Copy-to-clipboard logic duplicated 4 times with inconsistent behaviour

**What:** Four separate clipboard copy implementations exist: three in `tool-utils.js` (result text, share URL, platform code) and one in `script.js`, each with slightly different feedback copy and none with a `.catch()` fallback.

**Where:** `/script.js:694`, `/tool-utils.js:405`, `/tool-utils.js:487`, `/tool-utils.js:629`

**Why it matters:** Adding the missing `.catch()` handler (P0 item 2) must be done in 4 places; future feedback changes require 4 edits; the implementations have already drifted apart.

**Effort:** S

**Suggested fix:**
- Add a single `async function copyToClipboard(text, btnEl, label = 'Copy')` utility in `tool-utils.js` that handles the `execCommand` fallback and button feedback.
- Replace all 4 call sites with calls to this utility.

---

### 14. PostHog initialisation inlined verbatim on every HTML page

**What:** The full ~800-character PostHog stub + `posthog.init()` call is copy-pasted inline into every HTML file. The EU/US region split (P0 item 3) is a direct consequence of this pattern.

**Where:** All HTML files in the repo root (`/watch.html`, `/beliefs.html`, `/podcast.html`, `/404.html`, and others)

**Why it matters:** Any change to analytics config (key rotation, new capture options, region switch) requires editing every HTML file manually. Already produced one split-region bug.

**Effort:** S

**Suggested fix:**
- Create `/analytics.js` that exports the initialised PostHog instance with a consistent config.
- Replace all inline snippets with `<script defer src="/analytics.js"></script>`.

---

### 15. 11 AI tool pages share ~200 lines of identical HTML scaffold

**What:** Every tool page duplicates the same `<head>` meta block, nav, footer, error/loading UI, PostHog snippet, `tool-utils.js` import, and form submission boilerplate — with only the system prompt and input fields differing.

**Where:** All files matching `/volunteer-match.html`, `/charity-comparison-engine.html`, etc. (11 files)

**Why it matters:** Any global fix (new nav link, updated meta description format, new analytics call) currently requires 11 manual edits. The PostHog region bug (P0 item 3) is an example of how this goes wrong.

**Effort:** L

**Suggested fix:**
- Extract a `tool-page.js` module that injects shared nav/footer/error UI via JavaScript on `DOMContentLoaded`.
- Each tool page becomes a thin shell: just the `<head>`, the tool-specific `<main>` content, and one `<script src="/tool-page.js">`.
- Longer term: adopt a static site generator (Eleventy, Astro) to template pages at build time.

---

### 16. `tool-utils.js` (1,680 lines) mixes 5+ distinct concerns

**What:** A single file handles streaming API calls, DOM injection, result history, tool ratings, clipboard, loading skeletons, markdown formatting, and PostHog tracking — with no module boundaries.

**Where:** `/tool-utils.js` (entire file)

**Why it matters:** Any change risks unintended side effects across unrelated features. The file is too large to review quickly, making it a recurring source of bugs.

**Effort:** M

**Suggested fix:**
- Split into ES modules: `api.js` (fetch/streaming), `ui.js` (DOM injection, skeletons), `history.js`, `rating.js`.
- Convert `<script src="tool-utils.js">` to `<script type="module">` imports — already compatible with the Cloudflare static asset pipeline.
- No behaviour changes required; this is a pure structural split.

---

## 💡 P3 — Nice to have

### 17. Confetti IIFE fires at script-parse time on every new browser session

**What:** The confetti animation is an immediately-invoked function that appends a `<canvas>` and starts a `requestAnimationFrame` loop the moment the script executes, before the page is visually stable.

**Where:** `/script.js:163-210`

**Why it matters:** Adds ~65 animated particles to the first paint of a new browser session. On lower-end devices this contributes to Cumulative Layout Shift and First Input Delay — Core Web Vitals metrics that affect SEO ranking.

**Effort:** S

**Suggested fix:**
- Defer the trigger to `window.addEventListener('load', ...)` wrapped in `requestIdleCallback(() => { ... })`.
- This lets the browser prioritise the main content render before starting the animation.

---

### 18. No `.env.example` or secrets documentation

**What:** There is no template or documentation listing which environment variables must be configured for a working deployment (worker secret, PostHog key, worker URLs).

**Where:** Repository root (file missing)

**Why it matters:** A fresh deployment or a second collaborator has no guidance — they will hardcode secrets into source again (as already happened). Also a blocker if ever open-sourcing or handing off.

**Effort:** S

**Suggested fix:**
- Create `.env.example` at repo root listing: `NOTIFY_SECRET=`, `POSTHOG_KEY=`, `TOOL_WORKER_URL=`, `NOTIFY_WORKER_URL=`.
- Add a short "Secrets setup" section to the README.

---

### 19. 200+ hardcoded domain references block staging environment setup

**What:** `panoskokmotos.com` and `givelink.app` appear 200+ times hardcoded in HTML, JS, and the worker — absolute URLs in JSON-LD schema, Open Graph tags, canonical links, and API endpoint strings.

**Where:** Distributed across all HTML files and `/tool-utils.js:7-9`, `/script.js:930`

**Why it matters:** Impossible to spin up a staging environment where links, schema, and API calls point to a staging domain without a sed/find-replace across the whole repo before every test deployment.

**Effort:** M

**Suggested fix:**
- Extract the canonical domain into a single constant in a shared config file or `wrangler.jsonc` var.
- For schema/OG tags in HTML, this likely requires adopting a build step or templating system (already motivated by P2 item 15).
- Prioritise extracting the API endpoint URLs in JS as a quick win.

---

### 20. Decorative logos use `alt=""` without `aria-hidden="true"`

**What:** Nine press/partner logo images in the index use empty `alt=""` but do not set `aria-hidden="true"`, causing screen readers to announce them as unlabelled images.

**Where:** `/index.html:804-859` (logos grid — Forbes, WEF, etc.)

**Why it matters:** Screen reader users hear a sequence of "image" announcements with no context, adding noise to the page experience. Low effort and a direct Axe/Lighthouse accessibility audit failure.

**Effort:** S

**Suggested fix:**
- Add `aria-hidden="true"` to each `<img alt="">` in the logos grid.
- Alternatively, if the logos are meaningful (press features), provide descriptive `alt="Featured in Forbes"` text instead.
