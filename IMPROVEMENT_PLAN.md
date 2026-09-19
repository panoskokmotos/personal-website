# Givelink / Personal Website — Improvement Plan

> Generated: 2026-09-19 | Codebase: panoskokmotos/personal-website
> Max 20 items, ordered by ROI within each tier.

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. GDPR violation — unconsented analytics on 404 & offline pages

**What:** `404.html` and `offline.html` fire Google Analytics and PostHog on every page load, bypassing the consent gate that every other page enforces.

**Where:** `404.html` lines 5–11 and 55; `offline.html` lines 4–11 and 60

**Why it matters:** Every visitor who hits a 404 or goes offline is tracked without consent. This is a literal GDPR violation — regulators have fined sites for exactly this. Also violates your own Privacy Policy.

**Effort:** S

**Suggested fix:**
- Replace the bare GA/PostHog snippet in both files with the consent-gated pattern from `partials/gtag.html`
- Wrap both snippets in `if (localStorage.getItem('cookie_consent') === 'accepted')` before initialising

---

### 2. Undefined CSS variable `--text-primary` — invisible text on Privacy and Terms pages

**What:** `privacy.html` and `terms.html` reference `--text-primary` throughout their inline `<style>` blocks, but that variable is never defined anywhere; the defined variable is `--text`.

**Where:** `privacy.html` lines 41, 47; `terms.html` lines 41, 47; `style.css` lines 1426, 1455

**Why it matters:** Body text on the Privacy and Terms pages renders as transparent (initial colour) — visitors and Google can't read the content. Google also indexes these pages; invisible text triggers spam signals.

**Effort:** S

**Suggested fix:**
- Find-and-replace `--text-primary` → `--text` in `privacy.html`, `terms.html`, and `style.css`
- Verify no other undefined token references exist: `grep -r 'var(--' *.html *.css | grep -v ':root'`

---

### 3. Chat API errors silently fail — `res.ok` never checked in `chat.js`

**What:** After calling the Cloudflare Worker, `chat.js` calls `res.json()` without first checking `res.ok`, so 429 / 500 responses throw and fall into an empty `catch {}` that swallows the actual error message.

**Where:** `chat.js` lines 153–175 (fetch call) and line 169 (empty catch block)

**Why it matters:** When the Worker rate-limits a user or returns a server error, the chat widget shows a generic "Sorry, something went wrong" with no retry guidance. The Worker *does* return structured `{ error: "..." }` JSON — it's just never read.

**Effort:** S

**Suggested fix:**
- After `const data = await res.json()`, check: `if (!res.ok) throw new Error(data.error || res.statusText)`
- In the catch block, replace `catch {}` with `catch (e) { console.warn('[chat] fetch error:', e); showError(e.message) }`
- Surface `data.error` in the user-facing error message for rate-limit clarity

---

### 4. Flash of light mode (FOUC) on Privacy and Terms pages

**What:** `privacy.html` and `terms.html` open with `<html lang="en">` — missing `data-theme="dark"` — so the dark-mode CSS tokens don't apply until JS sets the attribute, causing a white flash on every page load.

**Where:** `privacy.html` line 1; `terms.html` line 1

**Why it matters:** Every visitor to these pages sees a jarring white flash before dark mode kicks in. It looks broken and erodes trust on the two pages that are supposed to reassure visitors about data practices.

**Effort:** S

**Suggested fix:**
- Change `<html lang="en">` → `<html lang="en" data-theme="dark">` in both files
- Confirm `script.js` respects the existing attribute rather than always overwriting it on load

---

### 5. `wrangler.jsonc` worker name mismatch — deploys create a phantom worker

**What:** `wrangler.jsonc` has `"name": "1stproject"` but the production worker is `ask-panos` (at `ask-panos.panagiotis-kokmotoss.workers.dev`). Running `wrangler deploy` creates or updates a separate, unused `1stproject` worker instead of the live one.

**Where:** `wrangler.jsonc` (root level `name` field)

**Why it matters:** Any hotfix deployed via `wrangler deploy` goes nowhere — the live chat on the homepage keeps running stale code. Could silently leave a broken rate-limit fix or security patch undeployed while appearing to succeed.

**Effort:** S

**Suggested fix:**
- Set `"name": "ask-panos"` in `wrangler.jsonc` (or whatever `wrangler whoami` / the Cloudflare dashboard confirms)
- Run `wrangler deploy --dry-run` to verify it targets the correct worker before next push

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 6. MailChannels defunct — contact form and AI tool email delivery silently broken

**What:** The Cloudflare Worker uses MailChannels to send email for the contact form (`/notify`) and AI tool result sharing (`/email-result`). MailChannels discontinued free email for Workers; every send returns a non-2xx response that is never checked.

**Where:** `cloudflare-worker.js` — `/notify` route (~line 180) and `/email-result` route (~line 230)

**Why it matters:** Contact form submissions and "email me these results" actions silently fail. Users think they've sent a message or shared results; nothing arrives. Any lead or engagement attempt through these flows is lost.

**Effort:** M

**Suggested fix:**
- Migrate to [Resend](https://resend.com) — free tier covers personal-site volume; SDK is tiny
- Check `emailRes.ok` in both routes and return a proper `400/500` with an error message so the UI can tell the user to try again
- Add a basic test send to your own address after migrating

---

### 7. AI Tools not reachable from inner-page nav; Beliefs not reachable from homepage nav

**What:** `index.html`'s custom nav includes "AI Tools" but not "Beliefs". `partials/nav.html` (used on all inner pages) includes "Beliefs" but not "AI Tools". The two navs are out of sync.

**Where:** `index.html` line 597 (desktop nav); `partials/nav.html` (all nav items)

**Why it matters:** A visitor landing on `/books.html`, `/podcast.html`, etc. cannot find the AI Tools page from navigation — the highest-traffic engagement feature is hidden from 100% of inner-page visitors. Symmetrically, homepage visitors can't reach `/beliefs.html`.

**Effort:** S

**Suggested fix:**
- Add "AI Tools" link to `partials/nav.html` (external link if it lives on tools.panoskokmotos.com)
- Add "Beliefs" link to `index.html`'s desktop and mobile nav
- Run `build.py` to propagate the updated partial to all inner pages

---

### 8. Search feature completely broken offline (files missing from service worker precache)

**What:** `sw.js` precaches core assets but omits `/search.min.js` and `/search-index.json`. The Cmd+K search modal dynamically loads both — neither is available offline.

**Where:** `sw.js` lines 4–14 (`PRECACHE_ASSETS` array)

**Why it matters:** The site is a PWA with an offline page, which sets an expectation of offline functionality. The most interactive feature (search) fails silently offline. Particularly damaging on slow connections where the PWA mode is most likely to be used.

**Effort:** S

**Suggested fix:**
- Add `'/search.min.js'` and `'/search-index.json'` to `PRECACHE_ASSETS`
- Bump the `CACHE_NAME` version string so existing service workers update their cache
- Confirm search works in Chrome DevTools → Application → Service Workers → Offline

---

### 9. Wrong PostHog project key on error pages — 404/offline traffic invisible in main dashboard

**What:** `404.html` and `offline.html` initialise PostHog with `phc_WDGdxSf2xcEbL1c6vbAkrr8LJcJqrodykJKGKhom82L`, while every other page uses `phc_BJBQFh9hadJS3u6CzBUa8KY3kxveMeuXVfGGZVm4N34n`.

**Where:** `404.html` line 55; `offline.html` line 60

**Why it matters:** 404 rates and offline page visits never appear in the main PostHog project. You can't see which URLs are 404-ing in context with the rest of the funnel, and 404 → homepage recovery rates are invisible.

**Effort:** S

**Suggested fix:**
- Replace the PostHog key in `404.html` and `offline.html` with the main project key
- Fix item #1 (consent gating) at the same time so this is one pass through both files

---

### 10. Homepage displays "Top 16 Worldwide" for GSEA — factual error contradicting all other content

**What:** The awards/logo strip area in `index.html` shows "Top 16 Worldwide" for the GSEA competition. Every other reference on the site — structured data, FAQ answers, `search-index.json`, `now.html` — consistently says "Top 4 Europe".

**Where:** `index.html` lines 757–758 and 822–823

**Why it matters:** Recruiters and investors who skim the homepage see an inflated and inconsistent claim. If they cross-check with the FAQ or search, they'll notice the mismatch — exactly the opposite of the trust signal the awards section is meant to provide.

**Effort:** S

**Suggested fix:**
- Change the logo strip caption to "Top 4 Europe 2023" to match all other content
- Run a quick audit: `grep -n "GSEA\|Top 16\|Top 4" index.html` to catch any remaining instances

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 11. Auth check runs *after* rate limit in `/notify` — unauthenticated callers exhaust the budget

**What:** In the `/notify` route of `cloudflare-worker.js`, the rate limit is applied and decremented before the `notifySecret` header is validated. Unauthenticated requests burn slots in your own notification budget.

**Where:** `cloudflare-worker.js` — `/notify` route, auth check and rate limit ordering

**Why it matters:** An attacker who discovers the `/notify` URL can silently exhaust your rate limit without ever providing the correct secret, eventually blocking legitimate automated notifications. Easy to fix and should precede any email migration work.

**Effort:** S

**Suggested fix:**
- Move the secret-header check to the top of the `/notify` handler: return `401` immediately for missing/wrong secret
- Apply rate limiting only after the caller is authenticated
- Same pattern should be audited for any other authenticated routes in the worker

---

### 12. XSS via unsanitized `innerHTML` in `search.js`

**What:** `search.js` builds result HTML by string-interpolating `r.url`, `r.title`, and `r.snippet` from `search-index.json` directly into `innerHTML` without escaping.

**Where:** `search.js` lines 75–81

**Why it matters:** `search-index.json` is static and committed to git, so the immediate attack surface is low. But if the JSON is ever generated by a build script that pulls external data (book titles, podcast names, tool descriptions), a crafted entry could run arbitrary JS. Fix now before the build pipeline becomes the attack vector.

**Effort:** S

**Suggested fix:**
- Create a small `escapeHtml(str)` helper: `str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')`
- Wrap `r.title` and `r.snippet` with it in the template literal
- `r.url` should be validated to start with `/` or the site's origin before use as `href`

---

### 13. Silent error swallowing in `chat.js` makes production debugging impossible

**What:** Two `catch` blocks in `chat.js` discard the error object entirely: `catch (e) {}` at line 33 (localStorage parse failure) and `catch {}` at line 169 (API call failure).

**Where:** `chat.js` lines 33 and 169

**Why it matters:** When the chat breaks in production, there is zero diagnostic signal. The error type, message, and stack disappear silently. Debugging requires guessing. Line 33 also means corrupted chat history is silently ignored without clearing it, potentially causing repeated parse failures.

**Effort:** S

**Suggested fix:**
- Line 33: `catch (e) { console.warn('[chat] localStorage parse failed, clearing history:', e); localStorage.removeItem('chatHistory'); }`
- Line 169: `catch (e) { console.error('[chat] API call failed:', e); /* existing user-facing error display */ }`
- These changes are safe — they don't alter any user-visible behaviour

---

### 14. Wrong ARIA role on `<nav>` breaks screen-reader navigation

**What:** `<nav id="navbar" role="banner">` in `partials/nav.html` overrides the nav's implicit `navigation` role with `banner`, making the navigation landmark invisible to screen readers as a nav.

**Where:** `partials/nav.html` line 2; `index.html` line 580

**Why it matters:** Screen reader users who press `N` to jump to navigation landmark, or use the landmark rotor, won't find the nav. They may instead land on the banner landmark (intended for `<header>`), which now has no corresponding element. Basic accessibility regression on every page.

**Effort:** S

**Suggested fix:**
- Remove `role="banner"` from the `<nav>` element entirely — `<nav>` already carries the `navigation` landmark role implicitly
- If a `banner` landmark is needed, wrap `<nav>` in a `<header>` element at the page level
- Re-run `build.py` to propagate the fix to all pages built from the partial

---

### 15. `scripts/check_links.py` only validates links in `index.html`

**What:** The link-checking script hardcodes `index.html` as its only input. The 20+ other HTML pages on the site are never checked for broken external links.

**Where:** `scripts/check_links.py`

**Why it matters:** Dead links on inner pages (books.html, now.html, beliefs.html, podcast.html, the AI tool pages) go undetected indefinitely. Given the site links to many external nonprofits, charities, and Givingwhat.we.can pages, link rot is a real risk.

**Effort:** S

**Suggested fix:**
- Replace the hardcoded filename with `glob.glob('*.html')` to check all HTML files
- Consider skipping `404.html`, `offline.html` to avoid false positives
- Add this to the CI/build pipeline (or a cron) so it runs on every deploy

---

## 💡 P3 — Nice to have

### 16. PWA manifest missing required icon sizes — install prompt won't appear

**What:** `manifest.json` only defines 32×32 and 180×180 icons, combined under `"purpose": "any maskable"`. Chrome requires 192×192 for the install prompt and 512×512 for the splash screen; purpose entries should be split.

**Where:** `manifest.json`

**Why it matters:** The PWA install prompt is suppressed on Android Chrome. The site has a service worker and manifest but visitors can't install it to their home screen.

**Effort:** M

**Suggested fix:**
- Generate 192×192 and 512×512 PNG icons (can use the existing `og-image.png` as source)
- Add two separate entries per size: `{ "purpose": "any" }` and `{ "purpose": "maskable" }`
- Validate with Chrome DevTools → Application → Manifest

---

### 17. `books.html` loads Google Fonts synchronously — blocks rendering

**What:** `books.html` imports Google Fonts with a blocking `<link rel="stylesheet">`, while `index.html` uses the optimal `rel="preload"` + `onload` async pattern.

**Where:** `books.html` line 57

**Why it matters:** Books is likely the second-most-visited page (linked from the homepage). The blocking font load adds 100–300ms to First Contentful Paint on every visit. Inconsistency also makes future style audits harder.

**Effort:** S

**Suggested fix:**
- Copy the async font loading pattern from `index.html` (the `<link rel="preload" ... onload="this.rel='stylesheet'">` + `<noscript>` block) into `books.html`

---

### 18. Chat panel missing ARIA dialog semantics and focus trap

**What:** The chat panel `<div id="chatPanel">` has no `role="dialog"`, `aria-modal="true"`, or `aria-labelledby`. When the chat opens, `Tab` focus escapes to background content. The input has no `<label>`.

**Where:** `index.html` (chat panel markup); `chat.js` (open/close handlers)

**Why it matters:** Screen reader users have no semantic signal that a dialog has opened, and keyboard users can accidentally interact with the obscured page underneath the chat panel.

**Effort:** M

**Suggested fix:**
- Add `role="dialog" aria-modal="true" aria-label="Chat with Panos"` to `#chatPanel`
- In `chat.js` open handler, save the previously focused element; on close, restore focus to it
- Add a keyboard focus trap: catch `Tab`/`Shift+Tab` inside the panel and cycle within it

---

### 19. `offline.html` "Try again" button has conflicting `onclick` + `href`

**What:** `<a href="/" onclick="window.location.reload()">Try again</a>` calls `reload()` (reloads the offline page) and navigates to `/` — behaviour is undefined and browser-dependent.

**Where:** `offline.html` line 72

**Why it matters:** On some browsers the user gets reloaded back to the offline page; on others both fire in an unpredictable order. The intended "retry the network" behaviour doesn't reliably work.

**Effort:** S

**Suggested fix:**
- Decide on the intent: if "go home and retry", use `href="/"` with no onclick — the browser will fetch `/` fresh, letting the service worker attempt network-first
- If "retry in place", use `onclick="event.preventDefault(); window.location.reload()" href="#"`

---

### 20. Duplicate drag-to-scroll implementations on logo strip — event listener conflicts

**What:** `script.js` registers two separate sets of `mousedown`/`mousemove`/`mouseup` listeners on `.logos-strip-wrap` — a simpler one at lines 123–153 and a more sophisticated momentum version at lines 869–928. Both are active simultaneously.

**Where:** `script.js` lines 123–153 and 869–928

**Why it matters:** The two handlers compete: the simpler one runs first on `mousedown` and sets its own `isDragging` state. Both then fire on `mousemove`, producing jittery or doubled scroll updates. The momentum version (the better one) may be partially overridden.

**Effort:** S

**Suggested fix:**
- Delete the earlier simpler implementation (lines 123–153)
- Test the logo strip drag behaviour on desktop after removing it
- Consider extracting the momentum implementation into a small `initDragScroll(el)` utility to reuse if more strips are added

---

*Total: 20 items across 4 tiers.*
