# Givelink Personal Website — Improvement Plan
_Generated: October 2026_

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. Notify secret exposed in client-side JS
- **What**: The `/notify` endpoint secret is hardcoded in a public file, allowing anyone to trigger email notifications.
- **Where**: `shared.js:21` — `notifySecret: 'panos-notify-2026-xyz'`
- **Why it matters**: Any visitor (or script) can POST to the `/notify` URL with this secret and spam your email inbox with fake contact events. Rate-limiting in the worker is your only protection, and it uses an in-memory Map that resets on each worker restart.
- **Effort**: S
- **Suggested fix**:
  - Move the secret to a Cloudflare Worker environment variable and validate it server-side only.
  - Remove the `notifySecret` field from `window.SITE_CONFIG` entirely; the worker should pull it from `env.NOTIFY_SECRET`.
  - The `notifySite()` call in `shared.js` should POST without a secret body field; authentication should be a header the worker adds.

---

### 2. Duplicate `@type: FAQPage` JSON-LD schemas
- **What**: Two separate `FAQPage` structured-data blocks are present on the same page.
- **Where**: `index.html:204` and `index.html:462`
- **Why it matters**: Google's Rich Results guidelines forbid multiple schemas of the same type on one URL. Search Console will report a validation error; Google may discard both blocks, losing FAQ rich snippets in SERPs.
- **Effort**: S
- **Suggested fix**:
  - Merge both `mainEntity` arrays into a single `FAQPage` schema.
  - Remove the duplicate block at line 462.
  - Validate with the Rich Results Test after the fix.

---

### 3. `<nav>` has wrong ARIA landmark role
- **What**: The main nav element carries `role="banner"`, which overrides its native `navigation` landmark.
- **Where**: `index.html:580` — `<nav id="navbar" role="banner">`
- **Why it matters**: Screen readers using landmark navigation (common with NVDA, JAWS, VoiceOver) will find no `navigation` landmark on the page, meaning keyboard-only users cannot jump to the nav. They also get a spurious `banner` region alongside the real `<header>`.
- **Effort**: S
- **Suggested fix**:
  - Remove `role="banner"` entirely — `<nav>` already has the implicit `navigation` role.
  - If a banner landmark is needed, add it to `<header>` which is the semantic element for it.
  - Also update `partials/nav.html` so `build.py` propagates the fix.

---

### 4. Duplicate logo-strip drag handlers fire simultaneously
- **What**: Two completely separate drag-to-scroll implementations are both attached to `.logos-strip-wrap`, causing them to conflict on every mouse/touch drag.
- **Where**: `script.js:123–153` (scroll-left approach) and `script.js:869–928` (CSS-transform approach)
- **Why it matters**: Both `mousedown` handlers fire; one mutates `wrap.scrollLeft`, the other mutates `track.style.transform`. The result is jank and a broken drag experience — the strip jumps erratically. One implementation was never removed when the other was added.
- **Effort**: S
- **Suggested fix**:
  - Delete the older, simpler implementation at lines 123–153 (the scroll-left one).
  - Keep lines 869–928 (the CSS-transform version), which correctly resumes the CSS animation after a drag ends.
  - Verify the drag feel on mobile after the removal.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 5. Synchronous Google Fonts load on `goal.html` (the "Let's Talk" page)
- **What**: `goal.html` loads the font stylesheet with a synchronous `<link rel="stylesheet">`, blocking rendering until the font response arrives.
- **Where**: `goal.html:57` — `<link href="https://fonts.googleapis.com/...display=swap" rel="stylesheet" />`
- **Why it matters**: `goal.html` is the conversion endpoint that "Let's Talk" CTAs link to everywhere on the site. A render-blocking font load directly raises First Contentful Paint and harms the impression visitors form right before they decide to reach out.
- **Effort**: S
- **Suggested fix**:
  - Replace the synchronous link with the async pattern already used in `index.html:71–72`:
    ```html
    <link rel="preload" href="...googleapis.com/..." as="style"
          onload="this.onload=null;this.rel='stylesheet'" />
    <noscript><link rel="stylesheet" href="..." /></noscript>
    ```
  - Update `partials/nav.html` if the font link is generated there, so all pages benefit.

---

### 6. Contact form shows `alert()` on error
- **What**: Network and server errors on the contact form fall back to `window.alert()`.
- **Where**: `script.js:409` and `script.js:415`
- **Why it matters**: `alert()` is blocked inside cross-origin iframes, blocked by some browser extensions, and freezes the main thread. It also vanishes without a trace if the user dismisses it while distracted. An inline error message next to the form button is more reliable and less jarring.
- **Effort**: S
- **Suggested fix**:
  - Add a hidden `<p id="formError" class="form-error">` element next to the submit button.
  - Replace both `alert()` calls with `formError.textContent = '...' ; formError.classList.add('visible')`.
  - Style it with the same pattern as the existing `#formSuccess` element (lines 401–402).

---

### 7. Hero `<picture>` fallback `<img>` points to `.webp` not `.jpg`
- **What**: The `<img>` fallback inside the hero `<picture>` element also uses `photo.webp`, so browsers without WebP support see nothing.
- **Where**: `index.html:656–657`:
  ```html
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.webp" ...>   ← should be photo.jpg
  ```
- **Why it matters**: The hero photo is the first thing investors and visitors see. Safari <14, certain older Chromium forks, and some WebView environments fall through to the `<img>` src; they render a broken image in the most prominent position on the page.
- **Effort**: S
- **Suggested fix**:
  - Change `<img src="photo.webp"` to `<img src="photo.jpg"` in the hero block.
  - Verify the nav avatar `<picture>` at line 585–587 — it correctly uses `photo.jpg` as the fallback.

---

### 8. No focus trap in the mobile navigation overlay
- **What**: When the mobile menu opens, keyboard focus is not trapped inside the overlay; Tab continues cycling through the page content behind it.
- **Where**: `script.js:36–71` (mobile menu logic) and the overlay markup at `index.html:610–640`
- **Why it matters**: Keyboard users and screen-reader users who open the mobile menu get lost — they tab past the menu into invisible page content. WCAG 2.1 SC 1.4.13 and the ARIA authoring guide for dialog patterns require focus trapping in modal-like overlays.
- **Effort**: M
- **Suggested fix**:
  - After opening the menu, query all focusable children; store the last focused element before open; trap Tab/Shift+Tab within the menu.
  - On close (`closeMenu`), return focus to the hamburger button.
  - A minimal ~15-line `trapFocus` helper (no library needed) is sufficient.

---

### 9. Two competing nav active-link observers overwrite each other
- **What**: Two `IntersectionObserver` instances independently try to mark the active nav link — one using inline `style.color`, the other using the `.active` CSS class.
- **Where**: `script.js:107–117` (inline-style approach) and `script.js:783–796` (class approach)
- **Why it matters**: On every scroll event both fire. The first clears all inline styles and sets one; the second removes `.active` and adds it. Since the first uses a different selector (`section[id]` only) from the second (`section[id], div[id]`), they disagree on which link is active — the nav highlight flickers and often shows the wrong section.
- **Effort**: S
- **Suggested fix**:
  - Delete the first observer block at lines 107–117 entirely.
  - The second block (lines 783–796) is more complete — it also observes `div[id]` anchors (e.g. `#impact`). Keep it and confirm it covers all nav targets.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 10. `chat.js` doesn't check `res.ok` before calling `res.json()`
- **What**: After fetching the worker, the code calls `res.json()` unconditionally, regardless of HTTP status.
- **Where**: `chat.js:158–160`
- **Why it matters**: If the Cloudflare Worker returns a 429 (rate-limit), 5xx, or a Cloudflare HTML error page, `res.json()` throws a JSON parse error and the catch block shows a generic "Connection error" — hiding the actual cause. Users who hit the rate limit should see a more helpful message.
- **Effort**: S
- **Suggested fix**:
  - After `const res = await fetch(...)`, add `if (!res.ok) throw new Error(res.status)`.
  - In the catch block, differentiate `error.message === '429'` and show "You're chatting fast! Try again in a minute." for rate-limit hits.

---

### 11. Service worker precaches both `'/'` and `'/index.html'`
- **What**: `PRECACHE_ASSETS` lists both `'/'` and `'/index.html'` as separate cache entries, which point to the same resource.
- **Where**: `sw.js:5–6`
- **Why it matters**: The SW fetches and stores the same HTML twice during install (doubling the network cost). On cache hits, a request for `/` returns from one entry while a request for `/index.html` returns from another, which can serve different versions if the SW versioning ever drifts.
- **Effort**: S
- **Suggested fix**:
  - Remove `'/index.html'` from `PRECACHE_ASSETS`; keep only `'/'`.
  - The network-first HTML strategy will handle `/index.html` requests correctly regardless.

---

### 12. Multiple `scroll` event listeners never consolidated
- **What**: Seven or more separate `window.addEventListener('scroll', ...)` calls exist in `script.js`, each running synchronous DOM reads on every scroll tick.
- **Where**: `script.js:26–28`, `157–162`, `231–237`, `362–363`, `435–436`, `458–460`, `774–779`, `807–809`
- **Why it matters**: On mid-range Android devices, stacked scroll handlers can cause jank on a page that's already rendering a particle canvas and parallax orbs. All handlers are `passive: true` so they don't block scrolling, but they do queue synchronous layout queries (`getBoundingClientRect`, `scrollHeight`, etc.) which batch into a single reflow per frame only if consolidated.
- **Effort**: M
- **Suggested fix**:
  - Create one `onScroll()` function that calls all the sub-handlers in sequence and register it once with `{ passive: true }`.
  - Alternatively, wrap each individual handler in a shared `requestAnimationFrame` gate to debounce to one frame.

---

### 13. `sendSiteNotification` silently swallows every error
- **What**: The `notifySite()` helper in `shared.js` has a `.catch(function() {})` that discards all errors with no logging.
- **Where**: `shared.js:52–56`
- **Why it matters**: When the Cloudflare Worker `/notify` endpoint is down or misconfigured, contact form submissions appear to succeed on the client (the form resets and shows "✓ Sent!") but Panos never gets notified. There's no way to detect this in local dev or production without actively watching worker logs.
- **Effort**: S
- **Suggested fix**:
  - Change `.catch(function() {})` to `.catch(function(e) { console.warn('[notifySite] failed:', e); })`.
  - Optionally add a `navigator.sendBeacon()` fallback path that queues the notification for delivery once connectivity recovers.

---

### 14. `heroTagline` `aria-label` duplicates the JS-typed text
- **What**: The element has a static `aria-label="Advocate. Changemaker. Builder."` but the typewriter JS also writes the same string as visible `textContent`.
- **Where**: `index.html:665` — `<p class="hero-tagline" id="heroTagline" aria-label="Advocate. Changemaker. Builder.">`
- **Why it matters**: Screen readers read both the `aria-label` (immediately, at page load) and the `textContent` (once JS finishes typing). Users with screen readers hear the phrase twice. The `aria-label` was intended as a fallback for the in-progress typing state, but it fires even after typing completes.
- **Effort**: S
- **Suggested fix**:
  - In `script.js`, once typing is complete, call `el.removeAttribute('aria-label')` so the live text becomes the accessible name.
  - In the `prefersReducedMotion` path (line 531), the text is set synchronously and the label can be removed immediately.

---

## 💡 P3 — Nice to have

### 15. Chat widget auto-opens after 15 s regardless of user engagement
- **What**: A timer fires `toggle.click()` 15 seconds after page load on desktop, even if the user is actively reading or scrolling.
- **Where**: `script.js:476–492`
- **Why it matters**: Interrupting engaged users with a pop-up is a known conversion killer. The session-gate prevents repeat fires, but the first-visit pop-up still feels intrusive. It's also currently disabled on mobile, which means the pattern is already considered too aggressive for smaller screens but it's still applied to all desktop visitors.
- **Effort**: S
- **Suggested fix**:
  - Add an idle check: only fire after 15 s of *no scroll events* (i.e., user is actually idle, not reading).
  - Or reduce the timer to a "proactive message bubble" that appears next to the chat toggle but doesn't open the full panel.

---

### 16. Skip link targets `#about`, bypassing `<main>` scroll anchor
- **What**: The keyboard skip link jumps to `#about` which is a section inside `<main>`, not to the `<main>` element itself.
- **Where**: `index.html:574` — `<a href="#about" class="skip-to-content">Skip to content</a>`
- **Why it matters**: The standard pattern for skip links is to target the `<main>` element so the browser's focus order starts from the main content. Going to `#about` works but skips the impact bar and hero CTA buttons that precede it.
- **Effort**: S
- **Suggested fix**:
  - Add `id="main"` to the `<main>` element at line 642 and update the skip link to `href="#main"`.
  - The `<main role="main">` already has the landmark role; an `id` makes it targetable by the skip link.

---

### 17. Particle canvas `resize` listener is never removed
- **What**: `window.addEventListener('resize', resize)` is added inside the particles IIFE but never cleaned up.
- **Where**: `script.js:688`
- **Why it matters**: On single-page-like navigation or if the canvas element is removed (e.g. in future framework migration), the resize handler persists and calls `canvas.closest('#hero')` on a detached DOM node, which can throw.
- **Effort**: S
- **Suggested fix**:
  - Use a `ResizeObserver` on the `#hero` element instead, which automatically cleans up when the element is removed.
  - Or store the listener reference and add a `visibilitychange` cleanup path alongside the existing one at line 679.

---

### 18. Cookie banner causes Cumulative Layout Shift (CLS)
- **What**: The cookie banner is initially hidden via `style="display:none"` in HTML and shown by an inline `<script>` after DOM parse. The transition from hidden to visible shifts all content below it.
- **Where**: `index.html:518–541`
- **Why it matters**: Google's Core Web Vitals measure CLS; a banner that slides in on first load (before the LCP image is measured) adds to the CLS score.
- **Effort**: M
- **Suggested fix**:
  - Reserve the banner's height with a CSS `min-height` placeholder that collapses to zero once consent is stored.
  - Or position the banner `fixed` so it overlays content rather than pushing it down, eliminating its contribution to CLS.

---

### 19. `photo.jpg` loaded in nav `<picture>` without width/height causing reflow
- **What**: The nav avatar `<img>` has `width="38" height="38"` set but the `<source>` srcset photo was originally served at the hero's larger dimensions and is resized by CSS.
- **Where**: `index.html:586–588`
- **Why it matters**: Minor — the dimensions hint is present so the browser can reserve space. This is P3 because the LCP image (`photo.webp` in the hero) does the same but `fetchpriority="high"` mitigates it. Worth noting as a future reference when regenerating assets.
- **Effort**: S
- **Suggested fix**:
  - Generate a dedicated `photo-nav-38.webp` at 38×38 (76×76 for 2x) and use it in the nav `<picture>`, keeping the full-size `photo.webp` for the hero only.

---

### 20. `search.js` renders `r.url` into `href` without sanitisation
- **What**: The search result template literal interpolates `r.url` directly into an `href` attribute with no encoding.
- **Where**: `search.js:75`
- **Why it matters**: Currently low-risk because `search-index.json` is self-authored and committed in the repo. But if search index generation is ever automated (e.g. scraped from external sources), a malicious `javascript:` URL in a search result entry would execute in a click. Worth fixing before any automation is added.
- **Effort**: S
- **Suggested fix**:
  - Wrap `r.url` with a URL validation: `const safeUrl = /^https?:\/\//.test(r.url) ? r.url : '#'; `
  - Use `safeUrl` in the `href` attribute of each result link.
