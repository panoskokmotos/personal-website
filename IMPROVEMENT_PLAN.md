# Improvement Plan — panoskokmotos.com
_Generated: September 2026_

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. Duplicate logo-marquee drag handlers fire simultaneously on every drag
- **What**: Two separate drag-to-scroll implementations both bind `mousedown` on `.logos-strip-wrap`.
- **Where**: `script.js:123–153` (scroll-based, modifies `wrap.scrollLeft`) and `script.js:869–928` (transform-based, modifies CSS `transform` on `.logos-track`). Both run on the same element every time a user drags the logo strip.
- **Why it matters**: On every drag, one handler fights the other — the strip jumps erratically, the animation doesn't resume smoothly, and users get a broken experience on one of the most visually prominent sections.
- **Effort**: S
- **Suggested fix**:
  - Delete the older scroll-based block (`script.js:123–153`) entirely; the transform-based block (`script.js:869–928`) is more complete and handles animation resume.
  - Confirm the marquee animates and resumes correctly after drag on both desktop and mobile.

---

### 2. Two competing IntersectionObservers set nav active state with conflicting APIs
- **What**: Nav link active state is managed by two observers: one applies inline `style.color` (lines 104–116), the other toggles a `.active` CSS class (lines 782–796). Inline styles always win over class rules, so the CSS `.nav-link.active` styles are silently overridden.
- **Where**: `script.js:104–116` (inline style observer, `threshold: 0.4`) and `script.js:782–796` (class-based observer, `threshold: 0.3`).
- **Why it matters**: Nav links flicker between states or show the wrong section highlighted as users scroll. Degrades perceived polish on every page visit.
- **Effort**: S
- **Suggested fix**:
  - Remove the older inline-style block (`script.js:104–116`); keep only the `.active` class-based observer.
  - Update the CSS `.nav-link.active` rule to define the highlighted colour and verify it renders correctly.

---

### 3. Contact form errors show a blocking `alert()` dialog
- **What**: On Formspree submission failure (`res.ok` false or network error), two `alert()` calls are used to communicate the error to the user.
- **Where**: `script.js:409` and `script.js:415`.
- **Why it matters**: `alert()` is a browser modal that can be blocked by popup blockers, breaks the page flow, and looks unprofessional. On the success path, an inline `#formSuccess` element is used correctly — the error path should match.
- **Effort**: S
- **Suggested fix**:
  - Add a `#formError` element in the HTML adjacent to `#formSuccess`.
  - Replace `alert(...)` calls with `formError.classList.add('visible')` and set appropriate error copy.
  - Auto-hide after 5 s on re-submit.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 4. Duplicate `FAQPage` JSON-LD blocks on the homepage
- **What**: `index.html` contains two separate `@type: "FAQPage"` structured-data blocks.
- **Where**: `index.html:204` (block 1, 16 questions) and `index.html:462` (block 2, 6 questions).
- **Why it matters**: Google's guidelines require at most one `FAQPage` schema per URL. With two, only the first block is processed; the 6 questions in the second block are ignored, losing potential FAQ rich snippets in search results.
- **Effort**: S
- **Suggested fix**:
  - Merge the two `mainEntity` arrays into a single `FAQPage` block (keep the larger first block, append the 6 unique questions from the second).
  - Validate with Google's Rich Results Test after merging.

---

### 5. `goal.html` loads Google Fonts with a render-blocking `<link>`
- **What**: The "Let's Talk" / booking page loads the font stylesheet synchronously.
- **Where**: `goal.html:57` — `<link href="https://fonts.googleapis.com/..." rel="stylesheet" />` (no `media` trick, no `preload`, no async).
- **Why it matters**: `goal.html` is the primary conversion page (booking calls, contact). A render-blocking font request adds 300–500 ms to First Contentful Paint, directly reducing conversion rate.
- **Effort**: S
- **Suggested fix**:
  - Replace with the same async-loading pattern used on `index.html` (lines 71–72): `<link rel="preload" ... as="style" onload="...">` + `<noscript>` fallback.
  - Apply the same fix to `now.html`, `books.html`, `watch.html`, `beliefs.html`, and `podcast.html`, which also use the blocking pattern.

---

### 6. Service Worker precaches `/style.min.css` but HTML requests `/style.min.css?v=20260912`
- **What**: The SW's `PRECACHE_ASSETS` list uses the bare path `/style.min.css`, but every HTML file loads `style.min.css?v=20260912`. Cache key mismatch means the SW never matches on the versioned request, so the CSS is always fetched from network even for offline/slow users.
- **Where**: `sw.js:7` (precache entry) vs `index.html:73`, `goal.html:58`, etc. (HTML loads).
- **Why it matters**: Defeats the main performance benefit of the precache for the heaviest asset. Offline users also get unstyled pages.
- **Effort**: S
- **Suggested fix**:
  - Either update `sw.js:7` to `/style.min.css?v=20260912` and keep in sync with the HTML version string on every deploy.
  - Or switch to a cache-busting approach using `ETag`/`Cache-Control` headers at the CDN level and drop the query-string version, simplifying SW management.

---

### 7. `followUpChips.sort()` produces a statistically biased shuffle
- **What**: The follow-up chip randomiser in the chat widget uses `array.sort(() => 0.5 - Math.random())`, a well-known non-uniform shuffle. Some chips appear ~3× more often than others.
- **Where**: `chat.js:92`.
- **Why it matters**: Users who engage with the chat widget repeatedly will always see the same 1–2 chips, reducing perceived conversation variety and follow-up click-through.
- **Effort**: S
- **Suggested fix**:
  - Replace with a Fisher-Yates shuffle:
    ```js
    const shuffled = [...followUpChips];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    shuffled.slice(0, 2).forEach(chip => { /* render */ });
    ```

---

### 8. `chat.js` crashes on load if `shared.js` fails to load
- **What**: `chat.js:2` reads `window.SITE_CONFIG.chatUrl` at module scope during script evaluation. If `shared.js` has not loaded (network error, partial load, CDN issue), this throws `Cannot read properties of undefined`, killing the entire chat widget — and potentially blocking the rest of `script.js` execution since scripts load sequentially.
- **Where**: `chat.js:2` (`const WORKER_URL = window.SITE_CONFIG.chatUrl;`).
- **Why it matters**: A CDN hiccup or load-order edge case silently breaks the main interactive feature on the homepage.
- **Effort**: S
- **Suggested fix**:
  - Guard with: `const WORKER_URL = window.SITE_CONFIG?.chatUrl ?? 'https://ask-panos.panagiotis-kokmotoss.workers.dev';`
  - Alternatively, inline the fallback URL as the default and override from config when available.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 9. Notify secret hardcoded and shipped to every browser
- **What**: The worker notification secret is embedded in client-side JavaScript.
- **Where**: `shared.js:21` — `notifySecret: 'panos-notify-2026-xyz'`.
- **Why it matters**: Any visitor (or automated scraper) can read the secret and send unlimited fake notifications to the `/notify` endpoint, polluting your inbox. The Cloudflare Worker already validates `NOTIFY_SECRET` via its environment variable — the client-side value is thus redundant if the worker rejects mismatched secrets.
- **Effort**: S
- **Suggested fix**:
  - Since the worker enforces `NOTIFY_SECRET` via its env var, the client-side string only needs to match — consider rotating it to a shorter, random value quarterly.
  - Document this in a `.env.example` or in `cloudflare-worker.js` comments so the rotation is not forgotten.
  - Longer term: replace the secret with a CAPTCHA or a signed token so the endpoint isn't freely spammable.

---

### 10. Dead `<!-- include:... -->` markers ship in production HTML
- **What**: All sub-pages (`goal.html`, `books.html`, `now.html`, etc.) contain `<!-- include:gtag -->`, `<!-- include:nav -->`, and `<!-- include:footer -->` comment markers with the partials already expanded inline between them.
- **Where**: e.g. `goal.html:4–31`, `goal.html:153–205`, `goal.html:307–328` (and equivalents across 6 pages).
- **Why it matters**: These markers are build-step artifacts. Shipping them adds noise, confuses future editors ("should I edit the partial or the inline copy?"), and causes inconsistencies when `build.py` is re-run on only some pages.
- **Effort**: S
- **Suggested fix**:
  - Add a post-process step in `build.py` (or a new `scripts/strip-markers.py`) to remove the `<!-- include:* -->` and `<!-- /include:* -->` comment tags from the output files.
  - Add a CI lint rule that fails if markers appear in the deployed HTML.

---

### 11. `style.css` is 8,173 lines for a 15-page personal site
- **What**: The uncompressed stylesheet is very large and almost certainly contains dead CSS for removed components.
- **Where**: `style.css` (entire file; `style.min.css` is the deployed version).
- **Why it matters**: Dead CSS inflates parse time and the compressed file size served to every visitor on first load.
- **Effort**: M
- **Suggested fix**:
  - Run PurgeCSS against all HTML/JS files: `purgecss --css style.css --content "*.html" "*.js"`.
  - Review the output for false positives (dynamically added classes like `.visible`, `.open`, `.tl-active`), then commit the reduced stylesheet.
  - Aim for < 2,000 lines after purge.

---

### 12. SW cache name `panos-v5` requires manual bump on every deploy
- **What**: The Service Worker cache version is a hardcoded string.
- **Where**: `sw.js:1` — `const CACHE_NAME = 'panos-v5';`.
- **Why it matters**: If a deploy goes out without bumping this string, offline users get stale CSS/JS served from the old cache until they force-refresh. This has probably already happened between `v4` and `v5`.
- **Effort**: S
- **Suggested fix**:
  - In `build.py`, inject a cache name based on the build date or a content hash: `CACHE_NAME = 'panos-20260912'`.
  - Or use a simple constant at the top of a build config file and have `build.py` do a string replacement in `sw.js` on each build.

---

## 💡 P3 — Nice to have

### 13. Sub-pages missing `<meta name="robots">` tags
- **What**: `goal.html`, `now.html`, `books.html`, `watch.html`, `beliefs.html` do not include `<meta name="robots" content="index, follow, max-image-preview:large">`, unlike `index.html`.
- **Where**: All sub-page `<head>` sections.
- **Why it matters**: Without explicit robots directives, crawlers may apply more conservative indexing decisions. `max-image-preview:large` is especially valuable for OG image display in Google Search.
- **Effort**: S
- **Suggested fix**: Add `<meta name="robots" content="index, follow, max-image-preview:large" />` to the `<!-- include:gtag -->` partial in `partials/gtag.html` so it propagates to all pages automatically on next build.

---

### 14. `chat.js:159` — no HTTP-status check before parsing response
- **What**: The fetch in `sendMessage()` checks for network-level errors (`catch`) but does not check `res.ok` before calling `res.json()`. A 429 rate-limit or 500 server error returns a JSON error body that may not include a `text` field; the user sees only the generic fallback message with no distinction between "rate limited" and "server error".
- **Where**: `chat.js:153–171`.
- **Why it matters**: Rate-limited users get no guidance that they should wait before trying again. Differentiating the error improves UX at no real cost.
- **Effort**: S
- **Suggested fix**:
  - After the fetch, check `if (res.status === 429)` and show: `"You've sent a lot of messages! Try again in a few minutes."`
  - Check `if (!res.ok)` for other non-2xx codes and show a generic retry message.

---

### 15. `index.html:2250` — search placeholder copy lists "Givelink" first
- **What**: The site search input placeholder reads "Search Givelink, books, beliefs, contact…" — Givelink is the first term even though the search covers personal site content.
- **Where**: `index.html:2250`.
- **Why it matters**: Minor copy inconsistency; visitors searching for "books" or "contact" may not think to use the search bar.
- **Effort**: XS
- **Suggested fix**: Change to `"Search books, beliefs, contact, Givelink…"` or `"Search this site — books, beliefs, contact…"` to lead with the most-used local content types.

---

_Total items: 15 · P0: 3 · P1: 5 · P2: 4 · P3: 3_
