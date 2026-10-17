# Improvement Plan — panoskokmotos.com

> Automated audit · 2026-10-17 · supersedes the 2026-10-11 plan (all its fixable items shipped).

## ⚠️ Scope note

The repo this routine ran against (`panoskokmotos/personal-website`) is Panos's **static personal site** (plain HTML/CSS/JS on GitHub Pages + one Cloudflare Worker), **not the Givelink app**. Consequences:

- There is **no Stripe/checkout/onboarding code here**, so the known Stripe-onboarding friction could not be audited. Point the routine at the Givelink app repo to cover it.
- There is no `/docs` folder and no PostHog findings to cross-reference. PostHog is only the analytics snippet (`partials/gtag.html`).
- Brand palette check was run against `style.css` anyway. The site's own palette is blue (`--blue #3b6ef8`); Givelink purple/pink only appear in `--givelink-purple/-pink` and one unused class.

Everything below is from the code that exists here. Items are ordered by ROI within each tier.

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. Service worker precaches the wrong asset URLs (stale `ASSET_VERSION`)
- **What**: `sw.js` precaches `style.min.css?v=20261011` etc., but every HTML page now requests `?v=20261016`, so the precache never matches a real request.
- **Where**: `sw.js:2` (`ASSET_VERSION = '20261011'`) vs `index.html` and the 8 other pages (`?v=20261016`); the commit "bump asset cache-busting version" updated HTML but not the SW.
- **Why it matters**: Returning visitors get no offline/precache benefit. Worse, because the cache name didn't change, installed clients keep the old `panos-20261011` cache, and old cached assets can be served cache-first alongside newer HTML.
- **Effort**: S
- **Suggested fix**:
  - Set `ASSET_VERSION = '20261016'` in `sw.js:2`.
  - Make `build.py` (or a tiny script) write the same version into `sw.js` and all `?v=` strings so they can't drift, and add that to `build.py --check` in CI.

### 2. Worker rate limit is per-isolate memory and the `unknown` fallback shares one bucket
- **What**: `checkRateLimit` uses an in-memory `Map`, so limits reset on every cold start and aren't shared across isolates. If neither IP header is present, every caller shares the single bucket `'unknown'`.
- **Where**: `cloudflare-worker.js:104-124`, `:188-198`
- **Why it matters**: The limit protects the Anthropic API key from cost abuse, and today it can be bypassed by anyone (new isolate = new quota). Conversely, one bad actor without headers can lock out everyone in the `unknown` bucket.
- **Effort**: M
- **Suggested fix**:
  - Use Cloudflare's Rate Limiting binding (or KV/Durable Object) keyed on `CF-Connecting-IP`; drop the `X-Forwarded-For` fallback (spoofable).
  - Cap `max_tokens` and `messages` length server-side for `/api/v1/stream`, `/api/v1/tool`, `/api/v2/tool`, `/tool` (`cloudflare-worker.js:302-526`).
  - Move the unauthenticated `GET /api/charity-search` (`:155`) behind the same limiter; it currently runs before it.

### 3. CORS fix to the Worker is still undeployed
- **What**: The origin allowlist (`ALLOWED_ORIGINS`, `cloudflare-worker.js:126-148`) exists in source, but the previous plan notes it needs `wrangler deploy` to take effect. No evidence in the repo that it was deployed.
- **Where**: `cloudflare-worker.js:126-148`
- **Why it matters**: Until deployed, any website can call the paid AI endpoints from a visitor's browser.
- **Effort**: S
- **Suggested fix**:
  - Run `wrangler deploy`; verify with `curl -H "Origin: https://evil.example" -X POST <worker>` returns 403.
  - Note: `wrangler.jsonc` sets `assets.directory` to `"."`, so see item 8.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 4. Nine redirect-stub pages flash a blank page before leaving the site
- **What**: `ai-tools.html` and eight old tool URLs are 7-line pages using `meta refresh` + `location.replace` to `tools.panoskokmotos.com/compass/`, with only a one-line fallback body.
- **Where**: `ai-tools.html`, `volunteer-match.html`, `what-can-i-donate.html`, `scam-nonprofit-detector.html`, and the other tool stubs in the repo root.
- **Why it matters**: Anyone with an old bookmark or backlink sees an unstyled flash and loses the specific tool they wanted (all land on the same Compass root).
- **Effort**: S
- **Suggested fix**:
  - Map each old URL to its Compass deep link instead of the generic `#/`.
  - If the host supports it, replace the stubs with real 301s (Cloudflare `_redirects`/Rules).

### 5. Chat widget missing dialog semantics and focus management
- **What**: Chat opens/closes with CSS only. Escape closes it (`chat.js:64`), but focus isn't trapped or returned to the toggle, and the panel has no `role="dialog"`/`aria-expanded` state.
- **Where**: `chat.js:46-64`; `partials/chat.html`
- **Why it matters**: Keyboard and screen-reader users can't tell the chat opened and lose their place on close; this is the site's main conversion path ("ask Panos" → contact).
- **Effort**: S
- **Suggested fix**:
  - Set `aria-expanded` on the toggle, `role="dialog" aria-label="Chat with Panos"` on the panel, and return focus to the toggle in `closeChat()`.
  - Add `aria-live="polite"` to the messages container so replies are announced.

### 6. 10 `outline: none` rules rely on one global `:focus-visible` rule
- **What**: Many inputs/buttons remove the outline; replacements aren't guaranteed to be visible on dark backgrounds.
- **Where**: `style.css:1621, 1939, 2904, 5169, 6890, 6941, 7428, 7692, 7775, 8045` ; global rule at `style.css:2708`
- **Why it matters**: Keyboard users lose track of focus in the search modal, chat input, and contact form — the exact fields that convert visitors.
- **Effort**: S
- **Suggested fix**:
  - Audit each `outline: none` to confirm it has a `:focus`/`:focus-within` border or box-shadow replacement; add one where missing.
  - Check with Tab through `goal.html` form and the search modal.

### 7. `now.html` metadata says "Updated March 2026" (7 months stale)
- **What**: Page title/OG/JSON-LD advertise a March 2026 snapshot; `datePublished` is `2026-03-17`.
- **Where**: `now.html:42, 50, 77, 80`
- **Why it matters**: A "what I'm doing now" page that's visibly old signals an inactive site to recruiters, partners, and search engines. Needs Panos to refresh the content (dates alone shouldn't be changed).
- **Effort**: S
- **Suggested fix**:
  - Refresh content, then update the three date strings and add `dateModified` to the JSON-LD.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 8. `wrangler.jsonc` publishes the entire repo root as static assets
- **What**: `"assets": { "directory": "." }` serves `agent.py`, `build.py`, `scripts/`, `IMPROVEMENT_PLAN.md`, `cloudflare-worker.js` (including the full system prompt) and `.github/` metadata if the project is deployed via Workers assets.
- **Where**: `wrangler.jsonc:6-8`
- **Why it matters**: Leaks internal tooling and the exact AI system prompt (makes prompt-injection easier); no secrets are in them, but there's no reason to expose them.
- **Effort**: S
- **Suggested fix**:
  - Add a `.assetsignore` (or move site files into `public/`) excluding `*.py`, `scripts/`, `*.md`, `cloudflare-worker.js`, `wrangler.jsonc`.

### 9. Giant files with no tests: `style.css` (8,193 lines), `index.html` (2,248), `cloudflare-worker.js` (554)
- **What**: One stylesheet for every page (195 KB, no purge), a single 2.2k-line homepage, and a worker with five near-identical Anthropic-fetch blocks.
- **Where**: `style.css`; `index.html`; `cloudflare-worker.js:302-526` (blocks at `:311, 391, 446, 490, 526`)
- **Why it matters**: Slows every change; the repeated worker blocks are where inconsistencies (token caps, error shape) creep in. There are zero automated tests beyond link checking.
- **Effort**: M
- **Suggested fix**:
  - Extract one `callAnthropic({system, messages, maxTokens})` helper in the worker and route all five endpoints through it.
  - Split `style.css` per page group (home / tools / legal) so inner pages don't ship homepage CSS.

### 10. Contact form and chat failures lose no data but give no recovery path in chat
- **What**: Chat shows a generic string on any failure, including the worker's 429 rate-limit response, because `data.text` is used regardless of status; the "Connection error" copy is the same for a network failure and an API error.
- **Where**: `chat.js:154-172`
- **Why it matters**: A rate-limited or erroring visitor can't tell why, and the failed user turn stays in `messages` (`chat.js:139`) and is resent with the next message.
- **Effort**: S
- **Suggested fix**:
  - Branch on `res.ok`/`res.status === 429`; on error, pop the failed user message from `messages` before `saveHistory()`.

### 11. Analytics key and consent logic duplicated across `partials/gtag.html`, `cookie-banner.html`, `script.js`
- **What**: Consent state lives in `localStorage` read in three places; the banner `onclick` handlers and loaders are separate inline scripts, and there's no way to later revoke consent.
- **Where**: `partials/gtag.html:15-24`; `partials/cookie-banner.html:26-42`
- **Why it matters**: GDPR expectation of "withdraw as easily as given" isn't met — once the banner is dismissed there's no UI to change the choice (privacy page has no toggle).
- **Effort**: M
- **Suggested fix**:
  - Add a "Cookie settings" footer link in `partials/footer.html` that clears `cookie_consent` and re-shows the banner; call `posthog.opt_out_capturing()` on decline.

---

## 💡 P3 — Nice to have

### 12. Off-palette purples in `style.css` gradients
- **What**: `#7c3aed`, `#6d28d9`, `#a78bfa`, `#c084fc` are used for gradients/badges instead of the brand purples `#6B3FA0`/`#5718CA`.
- **Where**: `style.css:359, 388, 421, 1248, 1259, 1516, 2867, 3283, 4384, 4893, 6310, 7471, 7483, 7615, 7943, 7949`
- **Why it matters**: Minor brand drift on a site whose own accent is blue; matters only if Givelink branding is meant to extend here.
- **Effort**: S
- **Suggested fix**:
  - Replace with `var(--givelink-purple)` or a new `--accent-purple` token so one value controls them all.

### 13. `.btn-givelink` is an unused purple→pink gradient
- **What**: Gradient runs `#5718CA → #C2185B`, which conflicts with the "no pink on purple" rule if the class is ever used.
- **Where**: `style.css:204-205` (class unused in HTML)
- **Effort**: S
- **Suggested fix**:
  - Delete the class, or make it solid `--givelink-purple` with white text.

### 14. Light theme CSS is unreachable
- **What**: `html[data-theme="light"]` overrides exist, but `script.js` locks dark mode.
- **Where**: `style.css` (light overrides); `script.js` theme init
- **Effort**: M
- **Suggested fix**:
  - Either delete the dead overrides to shrink CSS, or ship a tested theme toggle.

### 15. SW caches HTML on every navigation without size/err checks
- **What**: The HTML branch clones and caches any response, including 404/500 pages.
- **Where**: `sw.js:53-62`
- **Effort**: S
- **Suggested fix**:
  - Only `cache.put` when `res.ok`.
