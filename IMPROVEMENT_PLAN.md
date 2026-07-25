# Improvement Plan — panoskokmotos.com

> Generated: 2026-07-25. Max 20 items, ordered by ROI within each tier.

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. Anthropic API errors crash the AI chat with a silent 500

- **What**: Three Worker routes call `response.json()` without first checking `response.ok`, so a 429 rate-limit or 5xx from Anthropic returns an HTML body that blows up `.json()` and bubbles as an opaque 500 to the user.
- **Where**: `cloudflare-worker.js` lines 393 (`/api/v2/tool`), 448 (`/api/v1/tool`), 492 (`/tool`)
- **Why it matters**: Any Anthropic rate-limit or outage makes the chat silently fail. Users see a generic error and assume the site is broken. `/api/v1/stream` (line 314) already does this correctly — the other three routes need the same treatment.
- **Effort**: S
- **Suggested fix**:
  - After `const response = await fetch(...)`, add `if (!response.ok) throw new Error(\`Anthropic ${response.status}\`)` before calling `.json()`.
  - Return a user-facing error body with the actual status code so retries can be distinguished from hard failures.

---

### 2. SSE streaming errors silently terminate the stream mid-message

- **What**: Two bare `catch {}` blocks inside the SSE streaming IIFE swallow parse and reader errors, leaving the client with a truncated response and no error signal.
- **Where**: `cloudflare-worker.js` lines 346, 349 (inside `/api/v1/stream` handler)
- **Why it matters**: A user mid-conversation gets a cut-off response with no explanation. The chat stalls rather than showing an error they can act on (retry, reload).
- **Effort**: S
- **Suggested fix**:
  - In the SSE parse catch, write an error event to the stream: `writer.write(encoder.encode('data: [ERROR]\n\n'))`.
  - In the reader catch, log the error before closing so it appears in Cloudflare Workers tail logs.

---

### 3. XSS vector: `pageUrl` injected into HTML without sanitisation

- **What**: The `/email-result` route reads `pageUrl` from the request and embeds it directly into an HTML email template without encoding.
- **Where**: `cloudflare-worker.js` line 246
- **Why it matters**: A crafted `pageUrl` value containing `<script>` or `onload=` attributes could inject arbitrary HTML into the email sent to the admin inbox. Low exploitability (caller must know the notify secret) but high severity if triggered.
- **Effort**: S
- **Suggested fix**:
  - Wrap `pageUrl` in a simple HTML-escape helper: replace `&`, `<`, `>`, `"`, `'` before interpolation.
  - Validate that `pageUrl` starts with `https://panoskokmotos.com` and reject otherwise.

---

### 4. Email delivery is silently broken — notifications never arrive

- **What**: MailChannels free tier was discontinued (documented in README line 313). The `/notify` and `/email-result` Worker routes still call MailChannels but the emails never send. No error surfaces to the caller.
- **Where**: `cloudflare-worker.js` `/notify` and `/email-result` route handlers; `README.md` line 311
- **Why it matters**: Every contact form submission and AI chat notification is silently dropped. You're losing every inbound lead.
- **Effort**: M
- **Suggested fix**:
  - Replace MailChannels with a working transactional email provider: Resend (has a free tier and a Cloudflare Workers SDK), SendGrid, or Mailgun.
  - Alternatively, forward to a Formspree-style endpoint as a temporary fix given the contact form already uses Formspree.
  - After switching, add a `response.ok` check and return a 500 if delivery fails so the caller knows.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 5. PostHog analytics fires before cookie consent is given

- **What**: PostHog initialises unconditionally in `<head>` via `partials/posthog.html`. Google Analytics is correctly gated behind the consent banner, but PostHog is not.
- **Where**: `partials/posthog.html` (entire file); `index.html` line ~22 where the partial is included
- **Why it matters**: Depending on what PostHog captures (IP, session replay, user agents), this may violate GDPR/ePrivacy for EU visitors. A data protection authority fine or a cookie audit complaint is a real risk.
- **Effort**: S
- **Suggested fix**:
  - Wrap the PostHog init in the same `acceptAnalytics()` gate used for Google Analytics in `script.js`.
  - Call `posthog.opt_out_capturing()` by default on page load, and call `posthog.opt_in_capturing()` only after consent.
  - Add PostHog to the cookie consent banner's description text.

---

### 6. Chat input and search input have no accessible label

- **What**: `#chatInput` and `#ssInput` use only a `placeholder` attribute for their visual label. Placeholder text disappears on focus and is not reliably announced by screen readers.
- **Where**: `index.html` line 2260 (`#chatInput`), line 2289 (`#ssInput`)
- **Why it matters**: Users with screen readers (and users who forget what a field does after typing) have no label to reference. Fails WCAG 2.1 SC 1.3.1 and 3.3.2.
- **Effort**: S
- **Suggested fix**:
  - Add a visually hidden `<label>` for each input: `<label for="chatInput" class="sr-only">Message</label>` and `<label for="ssInput" class="sr-only">Search</label>`.
  - Ensure the `.sr-only` class (position absolute, clip) is present in `style.css` — add it if missing.

---

### 7. `--text-muted` fails WCAG AA contrast at normal text sizes

- **What**: `--text-muted: rgba(255,255,255,0.48)` against `--bg: #0d1530` yields approximately 3.5:1 contrast ratio. WCAG AA requires 4.5:1 for normal text.
- **Where**: `style.css` line 19 (variable definition); used extensively for dates, subtitles, metadata, and disclaimer text throughout.
- **Why it matters**: Muted text is unreadable for users with low vision or in bright ambient light. Content like publication dates, project subtitles, and form hints become invisible.
- **Effort**: S
- **Suggested fix**:
  - Raise opacity to `0.60` (`rgba(255,255,255,0.60)`) which gives ~4.7:1 on `#0d1530` — passes AA.
  - Verify the change site-wide; the adjusted value should look intentionally secondary, not identically prominent to body text.

---

### 8. `offline.html` back button is broken — reload and navigation conflict

- **What**: `<a href="/" onclick="window.location.reload()">` fires `reload()` which is immediately cancelled by the navigation to `/`. The page never actually reloads; it just navigates, which will also fail if offline.
- **Where**: `offline.html` line ~40 (the "Try Again" button anchor)
- **Why it matters**: A user who is offline clicks "Try Again" and goes deeper into a broken state instead of retrying their connection.
- **Effort**: S
- **Suggested fix**:
  - Change to a `<button>` with `onclick="window.location.reload()"` (no `href`).
  - Add a second link `<a href="/">Go home when back online</a>` below it as a separate affordance.

---

### 9. `role="banner"` applied to `<nav>` — incorrect landmark

- **What**: The main `<nav>` element has `role="banner"` which is the ARIA landmark for the page header (`<header>`), not for navigation. `<nav>` already has an implicit role of `navigation`.
- **Where**: `index.html` line 590; `partials/nav.html` line 2
- **Why it matters**: Screen reader users navigating by landmarks will find the navigation listed as the "banner" and may not find a proper `navigation` landmark. Confuses assistive technology users.
- **Effort**: S
- **Suggested fix**:
  - Remove `role="banner"` from `<nav>`.
  - If a header landmark is needed, wrap the nav in `<header role="banner">`.
  - Add `aria-label="Main navigation"` to the `<nav>` to distinguish it from any secondary navs.

---

### 10. `sitemap.xml`, `search-index.json`, and SW precache list are hand-maintained

- **What**: Adding any new page or blog post requires manually updating three separate files. The README documents this as a known limitation.
- **Where**: `sitemap.xml`, `search-index.json`, `sw.js` (ASSETS_TO_CACHE list), `README.md` lines 301–308
- **Why it matters**: Content gets missed in search, service-worker cache goes stale, and Google loses freshly published pages. Each new page is a maintenance task with three failure points.
- **Effort**: M
- **Suggested fix**:
  - Add a `build.js` or GitHub Actions step that reads the `pages/` directory and auto-generates `sitemap.xml` and `search-index.json` on deploy.
  - For the SW precache list, switch to a Workbox-style manifest or generate it from the same build step.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 11. `script.js` is a 930-line flat monolith

- **What**: A single non-module script contains 25+ unrelated behaviors — nav, hero typewriter, smooth scroll, cookie consent, YouTube facade, Spotify facade, awards toggle, testimonials carousel, clipboard, back-to-top, contact form, and more — all in flat global scope.
- **Where**: `script.js` (entire file, 930 lines)
- **Why it matters**: Adding or changing any one feature risks breaking unrelated features. No tree-shaking is possible. Debugging requires reading the full file. New contributors face an immediate wall.
- **Effort**: L
- **Suggested fix**:
  - Extract each logical section into its own ES module file (e.g., `nav.js`, `facades.js`, `contact.js`).
  - Import them via a thin `main.js` entry point.
  - Migrate incrementally — one module per PR to avoid a big-bang rewrite.

---

### 12. `style.css` is an 8,198-line single file with no scoping

- **What**: All styles for every page, component, and state live in one monolithic CSS file with no modules, no scoping, and inconsistent use of custom properties (many colours are hardcoded rather than using tokens).
- **Where**: `style.css` (entire file)
- **Why it matters**: A change to any selector risks cascade side-effects. Finding styles for a specific component requires file-wide search. The file takes measurable time to parse on first load.
- **Effort**: L
- **Suggested fix**:
  - Introduce a `tokens.css` file containing all custom properties, replacing the dozen+ hardcoded colour literals (`#22c55e`, `#2563eb`, `#6c4bff`, `#ff6268`, etc.) with variables.
  - Split by section into `nav.css`, `hero.css`, `chat.css` etc., using `@import` or a build step.
  - Do not attempt a full rewrite — start with extracting the chat widget styles (lines ~1000–1600) as a self-contained section.

---

### 13. Contact form and newsletter share one Formspree endpoint

- **What**: Both `#contactForm` and the newsletter sign-up submit to the same Formspree endpoint (`mdawlrqa`), distinguished only by a hidden `_subject` field.
- **Where**: `index.html` lines ~2140 (contact form) and ~1920 (newsletter); `script.js` newsletter submit handler
- **Why it matters**: If Formspree changes field matching, both forms silently mis-route. Formspree analytics become useless — you cannot tell which traffic is contacts vs. newsletter. Any newsletter automation built later must parse subject lines.
- **Effort**: S
- **Suggested fix**:
  - Create a second Formspree form for newsletter subscriptions.
  - Update the endpoint in the newsletter handler to the new form ID.
  - Keep the contact form on the existing endpoint.

---

### 14. `wrangler.jsonc` uses placeholder project name `"1stproject"`

- **What**: The Cloudflare Workers config has `"name": "1stproject"` — a generic placeholder that was never updated.
- **Where**: `wrangler.jsonc` line 1 (name field)
- **Why it matters**: Wrangler uses this name for deployment URLs, logs, and dashboard identification. Mismatches make debugging in the Cloudflare dashboard confusing and could cause deploy-to-wrong-project errors.
- **Effort**: S
- **Suggested fix**:
  - Change `"name"` to `"panoskokmotos-website"` (or whatever matches the actual Workers dashboard project name).
  - Confirm the name matches what `wrangler deploy` targets in Cloudflare dashboard before committing.

---

### 15. `agent.py` and `requirements.txt` are orphan files unrelated to the site

- **What**: Two files — a generic coding-agent CLI stub (`agent.py`) and its `requirements.txt` — live in the repo root and are completely unrelated to the personal website.
- **Where**: `agent.py` (root), `requirements.txt` (root)
- **Why it matters**: Confuses contributors and automated tooling (e.g., GitHub language detection may flag this as a Python project). `requirements.txt` adds noise to dependency scans.
- **Effort**: S
- **Suggested fix**:
  - Delete both files if they are not actively used.
  - If they belong to a separate experiment, move them to a dedicated subfolder or a separate repository.

---

### 16. Worker rate limiting resets on every cold start — limits are per-isolate only

- **What**: The README documents (line 319) that in-memory rate limit counters reset when a Worker isolate restarts, so the effective limit is per-isolate, not per-user globally.
- **Where**: `cloudflare-worker.js` (rate limit logic, ~lines 40–80 based on description); `README.md` line 319
- **Why it matters**: A determined user can bypass rate limits by hitting the Worker across isolates. Under moderate traffic each isolate serves a subset of requests, further diluting the limit.
- **Effort**: M
- **Suggested fix**:
  - Replace the in-memory counter with a Cloudflare KV or Durable Objects counter keyed by IP.
  - KV writes have ~1s eventual consistency — acceptable for rate limiting. Use `cf-connecting-ip` as the key.

---

## 💡 P3 — Nice to have

### 17. Light mode CSS exists but is unreachable — dark mode is forced in JS

- **What**: `style.css` contains `html[data-theme="light"]` overrides, but `script.js` line 117 sets `data-theme="dark"` unconditionally on every page load with no toggle.
- **Where**: `script.js` line 117; `style.css` (scattered `[data-theme="light"]` blocks)
- **Why it matters**: Dead code inflates the CSS file. Users who prefer light mode are stuck. If a toggle is never planned, the light-mode CSS should be removed to reduce file size; if it is planned, the `script.js` override should respect `prefers-color-scheme`.
- **Effort**: M
- **Suggested fix**:
  - Decide: add a toggle (respect `localStorage` + `prefers-color-scheme`) or drop light-mode styles entirely.
  - If dropping: remove all `[data-theme="light"]` rule blocks from `style.css`.
  - If adding: replace the hardcoded `"dark"` assignment with `localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')`.

---

### 18. `og-ai-tools-preview.html` is an unexplained file in the root

- **What**: A 264-line standalone HTML file sits in the repo root with no clear purpose — it appears to be an old preview page for tools that have since moved to `tools.panoskokmotos.com`.
- **Where**: `og-ai-tools-preview.html` (root, 264 lines)
- **Why it matters**: Unclear if this is served as a live page, used as an OG image template, or simply abandoned. If served, it may conflict with redirect stubs or expose outdated information.
- **Effort**: S
- **Suggested fix**:
  - Determine if any live traffic hits this URL (check Plausible/PostHog).
  - If not: delete it. If yes: either redirect it or update its content to match the current tools page.

---

### 19. README CSS token table is stale and misleading

- **What**: The README's "CSS Custom Properties" section documents token names and values (e.g., `--primary-color: #0a66c2`) that do not exist in `style.css`. The actual tokens are completely different.
- **Where**: `README.md` (CSS tokens section)
- **Why it matters**: Any developer or tool reading the README to understand theming will apply wrong values. Low risk now (solo project) but a liability if contributors join.
- **Effort**: S
- **Suggested fix**:
  - Replace the token table in README with the actual tokens from `style.css` lines 8–33.
  - Consider auto-generating this section from a comment block in the CSS to keep it in sync.

---

### 20. `manifest.json` `background_color` doesn't match the page background

- **What**: `manifest.json` sets `"background_color": "#0b0f1a"` but the actual CSS background is `--bg-dark: #080d1f`. On slow installs, Android shows a brief flash of the wrong colour before CSS loads.
- **Where**: `manifest.json` line (background_color field); `style.css` line 11 (`--bg-dark`)
- **Why it matters**: Minor visual glitch during PWA splash screen on Android. Low impact but trivially fixable.
- **Effort**: S
- **Suggested fix**:
  - Update `manifest.json` `"background_color"` to `"#080d1f"` to match `--bg-dark`.
  - Also consider aligning `"theme_color"` with the actual nav bar colour users see.
