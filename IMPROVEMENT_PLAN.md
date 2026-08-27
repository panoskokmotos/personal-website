# Givelink Personal Site — Improvement Plan

_Scanned: all HTML, CSS, JS, worker, and SW files. August 2026._

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. Two competing nav active-state systems fighting each other

**What:** `script.js` has two separate `IntersectionObserver` loops that both try to mark the active nav link — the first applies an inline `style.color` (lines 103–113), the second applies/removes an `.active` CSS class (lines 767–780). Both target `.nav-links a` / `.nav-link` (same DOM nodes), so they overwrite each other on every scroll event. The active link flickers or shows neither state on fast scrolls.

**Where:** `script.js:101–113` and `script.js:766–780`

**Why it matters:** The nav active state is broken for every visitor on every scroll. This is a core wayfinding signal on a long single-page site.

**Effort:** S

**Suggested fix:**
- Remove the first block entirely (lines 101–113, the `style.color` version)
- Keep only the `.active` class system (lines 766–780) — it is CSS-driven and correct
- Ensure `style.css` defines a visible `.nav-link.active` style (contrast check: white on dark nav)

---

### 2. Duplicate drag handler registered on the same element

**What:** The logo marquee strip has two separate drag implementations both attached to `.logos-strip-wrap`: one that manipulates `wrap.scrollLeft` (lines 120–150) and a second that manipulates the CSS animation via `track.style.transform` (lines 863–922). Both listen to `mousedown` and `touchstart` on the same element, so every drag fires both handlers, producing erratic animation-vs-scroll conflicts.

**Where:** `script.js:120–150` and `script.js:862–922`

**Why it matters:** Drag-to-scroll on the logos strip is broken on every browser — the animation snaps, stutters, or freezes unpredictably.

**Effort:** S

**Suggested fix:**
- Delete the first block (lines 120–150, the `scrollLeft` version) entirely
- Keep only the animation-based implementation (lines 862–922), which resumes the CSS marquee animation seamlessly after drag

---

### 3. `shared.js` not in Service Worker precache — chat breaks offline

**What:** `shared.js` is the first script loaded on every page that uses the chat widget or AI tools; it defines `window.SITE_CONFIG` (worker URLs) and `window.renderMarkdown`. The SW precache list in `sw.js` includes `script.js` and `chat.js` but omits `shared.js`. Any offline or cache-first load will throw `Cannot read properties of undefined (reading 'chatUrl')` and break the chat widget completely.

**Where:** `sw.js:4–13`

**Why it matters:** Users who revisit the site on flaky connections get a broken chat widget and broken AI tools — a jarring experience exactly when they most need caching to work.

**Effort:** S

**Suggested fix:**
- Add `'/shared.js'` to the `PRECACHE_ASSETS` array in `sw.js`
- Bump `CACHE_NAME` from `'panos-v5'` to `'panos-v6'` so the new SW activates and replaces the old cache

---

### 4. Contact form errors shown via `alert()` — blocks page and looks broken

**What:** When the Formspree submit fails (`!res.ok`) or throws a network error, the handler calls `alert('Something went wrong...')` and `alert('Network error...')`. `alert()` is synchronous, locks the browser tab, and looks broken on modern sites — especially egregious because the form already has a `#formSuccess` element that shows a proper success state.

**Where:** `script.js:405` and `script.js:411`

**Why it matters:** A prospective investor, partner, or journalist hits a submit error and sees a browser dialog box from 1995. Conversion blocker.

**Effort:** S

**Suggested fix:**
- Add an `#formError` div near the submit button (mirror the `#formSuccess` style)
- On error, toggle it visible with an appropriate message and auto-hide after 5 s
- Remove both `alert()` calls entirely

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 5. `<nav role="banner">` is an ARIA violation

**What:** The `<nav>` element at line 590 carries `role="banner"`. ARIA `banner` is a landmark role reserved for the page-level `<header>` element; applying it to a `<nav>` causes screen readers to announce "banner" instead of "navigation", which confuses assistive-technology users and breaks landmark navigation (users rely on the `navigation` landmark to jump between sections).

**Where:** `index.html:590`

**Why it matters:** Screen reader users (≈1–2% of visitors) can't reliably navigate the site. It's also an automated-accessibility-audit fail (axe, WAVE) that could be cited as a WCAG non-conformance.

**Effort:** S

**Suggested fix:**
- Remove `role="banner"` from `<nav id="navbar">` — it already has an implicit `navigation` landmark from its element type
- If a `banner` landmark is desired, wrap the whole header (logo + nav) in `<header>` and put `role="banner"` there

---

### 6. Skip-to-content link targets `#about` instead of `<main>`

**What:** The skip link at line 584 (`<a href="#about" class="skip-to-content">`) skips to the About section, not to the page's `<main>` element. Keyboard users activating it still have to tab through the entire hero section and impact bar before reaching useful content.

**Where:** `index.html:584`

**Why it matters:** The entire point of a skip link is bypassing repetitive navigation. Currently it bypasses only the `<nav>` but not the full decorative header area, which defeats its purpose.

**Effort:** S

**Suggested fix:**
- Change the link target to `href="#main-content"`
- Add `id="main-content"` to the `<main>` element (line 652)

---

### 7. Hero `<img>` fallback src is `.webp` — no JPEG fallback for old browsers

**What:** The hero `<picture>` element has `<source srcset="photo.webp" type="image/webp">` and `<img src="photo.webp" ...>`. The fallback `<img src>` should be the JPEG; when a browser doesn't support WebP (or the `<picture>` element fails), it falls back to the `<img src>` — which is still WebP.

**Where:** `index.html:665–667`

**Why it matters:** Older WebView versions (Samsung Internet < 4, UC Browser, certain embedded browsers) won't render the hero photo at all.

**Effort:** S

**Suggested fix:**
- Change the `<img>` fallback to `src="photo.jpg"` (the file already exists)
- Same fix applies to the nav logo `<picture>` at line 595

---

### 8. GSEA result is stated inconsistently across the page

**What:** The logo strip caption (line 769) reads "Top 16 Worldwide" while the milestone card for 2023 (line 1140) says "Top 4 Europe GSEA". The FAQ schema and About section also say "Top 4 Europe". These are two different claims; one of them is wrong.

**Where:** `index.html:769` (logo strip) vs `index.html:1140`, and `cloudflare-worker.js:28` (system prompt)

**Why it matters:** Prospective investors and partners cross-check claims. An inconsistency on the same page undermines credibility. Google's rich-results extractor will also see conflicting data.

**Effort:** S

**Suggested fix:**
- Decide which is accurate ("Top 4 Europe" is the more specific and verifiable claim)
- Update the logo strip sub-caption from "Top 16 Worldwide" to "Top 4 Europe"
- Update the worker system prompt at `cloudflare-worker.js:28` to match

---

### 9. Hero particle canvas runs `requestAnimationFrame` indefinitely

**What:** The particle canvas in `script.js` (lines 628–675) starts an unbounded RAF loop at page load and never stops, even when the user has scrolled far past the hero section. This consumes constant GPU and CPU cycles for the entire session.

**Where:** `script.js:658–675`

**Why it matters:** On mid-range Android devices and laptops on battery, an always-running canvas animation measurably reduces battery life and can cause thermal throttling. It contributes to lower Lighthouse performance scores.

**Effort:** M

**Suggested fix:**
- Use `IntersectionObserver` on `#hero` to start/stop the RAF loop
- When the hero is not intersecting, call `cancelAnimationFrame(animId)` and restart the loop only when the hero re-enters the viewport
- Alternatively use `document.visibilitychange` to pause when the tab is hidden

---

### 10. Notify secret hardcoded in client-visible `shared.js`

**What:** `shared.js:21` contains `notifySecret: 'panos-notify-2026-xyz'` verbatim. The comment acknowledges this is intentional but relies entirely on the worker's in-memory rate limiter (which resets on Cloudflare cold starts). Any visitor who opens DevTools can trivially scrape the secret and send unlimited (within rate-window) notifications to Panos's email.

**Where:** `shared.js:21`

**Why it matters:** Notification spam clutters Panos's inbox and could mask real submissions from investors or partners. The rate-limit resets on worker cold starts, which happen frequently in low-traffic scenarios.

**Effort:** M

**Suggested fix:**
- Remove the secret from `shared.js` and from the client altogether
- Add the validation check inside the worker using a server-side per-IP rate limit: `/notify` only accepts requests where `CF-Connecting-IP` is the same origin (i.e., only the worker itself forwards them), or use Cloudflare Workers KV to persist rate state across cold starts

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 11. `document.execCommand('copy')` deprecated in the clipboard fallback

**What:** The "copy email" button fallback in `script.js:699` uses `document.execCommand('copy')`, which MDN marks as deprecated and which Chromium has started removing. The `navigator.clipboard.writeText()` call above it handles all modern browsers — the fallback is both unnecessary and fragile.

**Where:** `script.js:694–703`

**Why it matters:** When the deprecated API is eventually removed, the fallback will silently fail and the user will see the "copied" animation with nothing actually copied. Safari and Firefox already warn on this call.

**Effort:** S

**Suggested fix:**
- Remove the `execCommand` fallback block (lines 696–702)
- If graceful degradation is needed, catch the clipboard rejection and show a tooltip with the email address to copy manually

---

### 12. Two `FAQPage` JSON-LD blocks on `index.html`

**What:** `index.html` has two separate `<script type="application/ld+json">` blocks both typed as `"@type": "FAQPage"` — one at lines 197–347 (16 questions) and a second at lines 455–510 (6 different questions). Google's structured data parser processes only one `FAQPage` block per page and silently ignores the second.

**Where:** `index.html:197` and `index.html:455`

**Why it matters:** Half of the FAQ rich-results content is invisible to Google, wasting the SEO/AEO investment. The Rich Results Test will also flag it as a warning.

**Effort:** S

**Suggested fix:**
- Merge both `mainEntity` arrays into a single `FAQPage` block (keep the 16-question one, append the 6 unique questions from the second block that aren't already covered)
- Delete the second `FAQPage` script block

---

### 13. `clearChat()` builds HTML with inline `onclick` attributes — inconsistent and fragile

**What:** `clearChat()` (chat.js:193–214) rebuilds the starter chips HTML using template strings with literal `onclick="useChatStarter(this)"` attributes. Every other event handler in the file uses `addEventListener`. The `useChatStarter` global has to exist on `window` for this to work; if the function is ever scoped or renamed, it silently breaks.

**Where:** `chat.js:193–214`

**Why it matters:** This is a maintenance trap — future refactors that scope `useChatStarter` will break the reset flow silently. It also pollutes the global namespace.

**Effort:** S

**Suggested fix:**
- Extract the chip-building logic into a `buildStarterChips(chips)` helper that creates elements with `addEventListener` and returns them
- Call it from both `clearChat()` and `showFollowUpChips()` to eliminate duplication

---

### 14. `showFollowUpChips` uses a biased array shuffle

**What:** `chat.js:92` does `followUpChips.sort(() => 0.5 - Math.random())` to pick 2 random chips. This sort-based shuffle is statistically biased (first elements are under-sampled) and also mutates the `followUpChips` array in place, meaning chips picked after the first time are no longer uniformly random.

**Where:** `chat.js:92`

**Why it matters:** The same 1–2 chips will appear disproportionately often after the first chat exchange, reducing the perceived helpfulness of the follow-up suggestions. Also mutates a module-level constant unintentionally.

**Effort:** S

**Suggested fix:**
```js
// Fisher-Yates pick 2, non-mutating:
const shuffled = [...followUpChips];
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}
const picks = shuffled.slice(0, 2);
```

---

### 15. `chatOpenWithBook` injects `title`/`author` into `innerHTML` without sanitisation

**What:** `chat.js:229` builds the chat starter panel with `starters.innerHTML = '<p class="chat-starters-label">Ask about <em>' + title + '</em></p>' + ...`. The `title` and `author` values come from `textContent.trim()` on the book cards (safe today), but the function is exported as `window.chatOpenWithBook(title, author)` and callable from anywhere. Any future caller that passes user-sourced strings creates a stored-XSS vector.

**Where:** `chat.js:229–238`

**Why it matters:** Low risk today, but the pattern makes future-you write a bug. As the book catalogue grows or data becomes dynamic, this becomes a live XSS.

**Effort:** S

**Suggested fix:**
- Replace string concatenation with `document.createElement` + `textContent` assignments for `title` and `author`
- Or use a small helper: `function escape(s) { const d = document.createElement('span'); d.textContent = s; return d.innerHTML; }`

---

## 💡 P3 — Nice to have

### 16. `theme-color` meta tag uses brand-blue, not brand-purple

**What:** `<meta name="theme-color" content="#3b6ef8">` (index.html:76) sets the browser chrome colour on Android Chrome to the accent blue. The primary Givelink brand colour is purple (`#5718CA`). On Android, users see a blue title bar that doesn't match the hero gradient or brand assets.

**Where:** `index.html:76`

**Why it matters:** Minor brand inconsistency for ~30% of mobile visits. Low effort to fix.

**Effort:** S

**Suggested fix:**
- Change to `content="#5718CA"` (brand purple) or `content="#6B3FA0"` (softer purple) — test both in Chrome DevTools → Application → Manifest

---

### 17. Hardcoded LinkedIn/X engagement numbers will go stale

**What:** All six social-post cards on the homepage have hardcoded like/comment/repost counts (e.g. `❤️ 1,024`, `💬 118 comments`). These were accurate when written but will look increasingly wrong over time, especially as posts age.

**Where:** `index.html:1291–1408`

**Why it matters:** A LinkedIn post showing "118 comments" that actually has 3× that when a recruiter visits reads as either lazy or dishonest. A quick check of the real numbers from time to time would help.

**Effort:** S

**Suggested fix:**
- Update the numbers manually each quarter (5-minute task)
- Or, longer term, consider removing the engagement stats entirely and relying on the post content alone — the posts are linked, so real numbers are one click away

---

### 18. Confetti canvas runs during the LCP window

**What:** The confetti animation (script.js:162–210) creates a full-viewport canvas and starts a 140-frame animation on first page load (session-gated). This fires during the critical rendering path and can delay LCP by competing with the hero image paint.

**Where:** `script.js:162–210`

**Why it matters:** May push LCP above 2.5 s on slow mobile connections. The confetti is delightful but not worth a Core Web Vitals regression.

**Effort:** S

**Suggested fix:**
- Delay start by wrapping in `requestIdleCallback(() => ..., { timeout: 3000 })` so it defers until the main thread is idle post-render
- Or trigger it on the first `mousemove`/`touchstart` after load (user has engaged, render is done)

---

### 19. Mobile menu close doesn't return focus to the trigger button

**What:** When the mobile menu is closed (via overlay click, Escape key, or link click), focus is not explicitly returned to `#hamburger`. Screen reader and keyboard users lose their position on the page and must re-navigate from the top.

**Where:** `script.js:33–41` (`closeMenu` function)

**Why it matters:** WCAG 2.5 focus management requirement. Keyboard users (including power users on desktop) experience disorientation every time they dismiss the menu.

**Effort:** S

**Suggested fix:**
- Add `hamburger.focus()` at the end of the `closeMenu()` function (after the `window.scrollTo` call)
