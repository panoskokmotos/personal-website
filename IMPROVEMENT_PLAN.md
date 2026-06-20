# Givelink Personal Website — Improvement Plan

Audited: 2026-06-20 | Branch: `claude/gracious-ramanujan-pykht6`

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. Exposed notification secret in client-side source

**What**: `TOOL_NOTIFY_SECRET` is hardcoded in JavaScript served to every visitor.  
**Where**: `tool-utils.js:11`  
**Why it matters**: Anyone who opens DevTools can extract `panos-notify-2026-xyz` and spam the `/notify` Cloudflare Worker endpoint, flooding your inbox or burning Worker quota.  
**Effort**: S  
**Suggested fix**:
- Rotate the secret immediately on the Worker side.
- Move auth to the Worker itself — add IP rate-limiting + a unique per-request HMAC instead of a static secret.
- If a shared secret must exist, generate it server-side per session rather than shipping it in JS.

---

### 2. XSS in AI markdown rendering

**What**: AI response text is set via `innerHTML` after a regex-only parse, with no sanitization.  
**Where**: `chat.js:22` (URL regex → `<a href="$1">`), `tool-utils.js:169` (`resultBody.innerHTML = formatMarkdown(fullText)`), `tool-utils.js:176,335,340`  
**Why it matters**: If the AI ever returns a crafted string like `https://x.com" onmouseover="alert(document.cookie)`, it executes in the user's browser. Unlikely but catastrophic when it happens.  
**Effort**: S  
**Suggested fix**:
- Add `DOMPurify` (CDN: `https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js`) and wrap all `innerHTML` assignments: `el.innerHTML = DOMPurify.sanitize(formatMarkdown(text))`.
- In the URL regex, ensure `href` is escaped: use `encodeURI(url)` before injecting into the `<a>` tag.

---

### 3. Charity search silently breaks on API errors

**What**: The charity search API response is parsed as JSON without checking `res.ok` first, so a 4xx/5xx causes an unhandled `.json()` failure and the UI freezes on the loading state.  
**Where**: `tool-utils.js:1432–1434`  
**Why it matters**: If the charity lookup Worker is briefly down or rate-limited, the tool becomes non-functional with no message to the user.  
**Effort**: S  
**Suggested fix**:
- Add `if (!res.ok) throw new Error(\`API error \${res.status}\`);` before `.json()`.
- Catch and call the existing `showError()` helper so the user sees a human message instead of a spinner that never resolves.

---

### 4. Book cover broken-image fallback never fires

**What**: The `checkSize` callback is attached to `img.onload`, but when an image fails to load entirely (404, CORS block), `load` never fires — leaving a broken icon in the book card.  
**Where**: `script.js:213–222`  
**Why it matters**: Broken book covers make the reading section look unfinished to every visitor whose browser can't reach the cover CDN.  
**Effort**: S  
**Suggested fix**:
- Add an `img.addEventListener('error', () => { img.parentElement.innerHTML = \`<div class="book-cover-fb">\${abbr}</div>\`; })` handler alongside the existing `load` listener.
- The same fallback markup is already used in `checkSize` — extract it to a one-liner and call from both handlers.

---

### 5. Contact form gives no feedback on rate-limit (HTTP 429)

**What**: The form's fetch handler only checks `res.ok` → success vs. catch → network error. A 429 from Formspree surfaces as a generic "network error" alert.  
**Where**: `script.js:388–411`  
**Why it matters**: Legitimate users who submit twice get a confusing "email directly" alert with no explanation; they may think their message was lost and never retry.  
**Effort**: S  
**Suggested fix**:
- After `await fetch(...)`, check `res.status === 429` before the generic `!res.ok` branch and show: *"You've sent a message recently — please wait a few minutes and try again."*
- Reference the existing `429` handling pattern already in `tool-utils.js:131–135` for consistency.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 6. Primary CTA button is blue, not brand purple

**What**: Every call-to-action button (`.btn-primary`) uses `#3b6ef8` (blue), while the Givelink brand is purple (`#6B3FA0`/`#5718CA`) and pink (`#C2185B`/`#E353B6`). None of the brand colors appear in the stylesheet.  
**Where**: `style.css` — multiple `.btn-primary` and general button declarations; `.btn-givelink` at ~line 203 uses `#7c3aed` (off-brand purple) only for the company card.  
**Why it matters**: Every visitor sees a blue CTA — the brand signal for Givelink (purple/pink) is absent from its own founder's website. Undermines brand recognition and portfolio credibility.  
**Effort**: M  
**Suggested fix**:
- Define CSS custom properties at `:root`: `--clr-purple: #6B3FA0; --clr-purple-dark: #5718CA; --clr-pink: #C2185B; --clr-pink-light: #E353B6;`
- Replace `#3b6ef8` with `var(--clr-purple)` on `.btn-primary`; use `var(--clr-purple-dark)` for `:hover`.
- Update `.btn-givelink` to `var(--clr-purple)` to eliminate the inconsistency between the company card and main CTAs.

---

### 7. Chat widget overflows the viewport on 360 px mobile screens

**What**: `.chat-widget` has a fixed `width: 390px` with no viewport-relative constraint, causing horizontal overflow on common Android devices (Galaxy A series, Pixel 4a).  
**Where**: `style.css:1526`  
**Why it matters**: Mobile users — likely 40–60% of visitors — see a clipped chat widget and may not realise they can scroll horizontally; most will just close it.  
**Effort**: S  
**Suggested fix**:
- Change to `width: min(390px, calc(100vw - 16px));` and add `right: 8px;` to keep the widget anchored with a margin.
- Verify the send button and input remain full-width inside with `width: 100%` inside the widget.

---

### 8. Chat fetch hangs indefinitely on slow networks

**What**: The `fetch()` in `chat.js:161` has no timeout. On a 2G connection or mid-flight WiFi handoff, the "thinking" spinner will spin forever.  
**Where**: `chat.js:161–184`  
**Why it matters**: Users who see a permanent spinner assume the feature is broken and leave — a recoverable error becomes a lost engagement.  
**Effort**: S  
**Suggested fix**:
- Wrap the fetch in an `AbortController` with a 30-second timeout: `const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 30000);` and pass `signal: ctrl.signal`.
- In the `catch` block, distinguish `error.name === 'AbortError'` and show: *"This is taking longer than expected — try again in a moment."*

---

### 9. Hero photo unoptimised (289 KB) slows Largest Contentful Paint

**What**: `photo.jpg` is 289 KB; `photo.webp` is 184 KB. Neither has a responsive `srcset` variant for mobile.  
**Where**: `index.html` hero `<img>` element; `assets/photo.jpg`, `assets/photo.webp`  
**Why it matters**: LCP is a Core Web Vital that affects Google search ranking. On mobile, downloading 289 KB for a hero image is a measurable delay on the most-visited section.  
**Effort**: S  
**Suggested fix**:
- Re-export `photo.webp` at 800 px wide / quality 75 → target ≤80 KB.
- Add a `<picture>` element with `srcset` for 400w/800w variants and keep the `.jpg` as the `<img>` fallback.
- Verify `loading="eager"` (no lazy on above-the-fold LCP image) and add `fetchpriority="high"`.

---

### 10. FAQ accordion missing `aria-controls` — keyboard users can't navigate

**What**: FAQ `<button>` elements have `aria-expanded` but no `aria-controls` pointing at the answer panel, and answer panels lack corresponding `id` attributes.  
**Where**: `index.html:2139` (FAQ section buttons)  
**Why it matters**: Screen readers can't announce which panel the button controls; keyboard users navigating with Tab/Enter get no feedback about what expanded. Affects WCAG 2.1 compliance.  
**Effort**: S  
**Suggested fix**:
- Add matching `id="faq-answer-N"` to each answer `<div>` and `aria-controls="faq-answer-N"` to each `<button>`.
- The JS toggle in `script.js` already sets `aria-expanded` — just add `panel.id` and `btn.setAttribute('aria-controls', panel.id)` in the same initialisation loop.

---

### 11. Hero parallax causes scroll jank on touch devices

**What**: The scroll listener for hero orb parallax runs on every `scroll` event with no `matchMedia` guard, triggering layout recalculations during touch momentum scrolling on iOS/Android.  
**Where**: `script.js:224–232`  
**Why it matters**: Touch users perceive this as a laggy site, lowering time-on-page and increasing bounce rate. The effect also looks wrong on mobile (orbs move but the hero is already offscreen).  
**Effort**: S  
**Suggested fix**:
- Wrap the `addEventListener` call: `if (!window.matchMedia('(hover: none)').matches) { window.addEventListener('scroll', ...) }`.
- The listener is already `{ passive: true }` which is good — the media query guard eliminates the layout work on touch entirely.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 12. Search result highlighting injects user query into `innerHTML` unsanitized

**What**: The `highlight()` function in `search.js:70` wraps matched text with `<mark>` tags via `innerHTML` assignment, using the raw user query string as a regex.  
**Where**: `search.js:70`, `search.js:78` (`strong.innerHTML = highlight(r.title, query)`)  
**Why it matters**: A query like `<img src=x onerror=alert(1)>` would execute. The risk is low (search index is static), but it's a latent XSS that grows in risk if the index ever becomes dynamic.  
**Effort**: S  
**Suggested fix**:
- Escape the query before inserting: `document.createTextNode(match).textContent` or use a replace that only injects `<mark>` around already-escaped text.
- Alternatively, build result elements with `document.createElement` + `textContent` and insert `<mark>` nodes via DOM API rather than `innerHTML`.

---

### 13. Copy-to-clipboard logic duplicated in four places

**What**: The clipboard copy + visual feedback pattern appears separately in `script.js:694–701` (email copy), `tool-utils.js:405–408`, `tool-utils.js:629–631`, and `tool-utils.js:488–489`, each with slightly different button feedback text and timing.  
**Where**: `script.js:694–701`, `tool-utils.js:405–408`, `tool-utils.js:488–489`, `tool-utils.js:629–631`  
**Why it matters**: Four copies means four places to fix if `navigator.clipboard` needs a fallback (it does on HTTP or iOS ≤12). Two of the copies already have different fallback behaviour — a lurking bug.  
**Effort**: S  
**Suggested fix**:
- Extract to `tool-utils.js`: `async function copyToClipboard(text, btn, label = 'Copied!')` that handles the async write + the `execCommand` fallback + the button feedback animation.
- Replace all four call sites with a single import of this function.

---

### 14. `tool-utils.js` is 1,680 lines with unrelated responsibilities

**What**: The file mixes API call logic, UI rendering helpers, feature injectors (rating widget, download button, share links, clipboard, deep-dive), and analytics — making it hard to find or test any individual concern.  
**Where**: `tool-utils.js` (entire file, 1,680 lines)  
**Why it matters**: Adding a new AI tool requires reading ~1,700 lines to understand which helpers exist. This slows feature work and increases the risk of accidental regressions.  
**Effort**: M  
**Suggested fix**:
- Split into three focused files without changing any public API: `tool-api.js` (fetch, `callWorker`, fallbacks), `tool-ui.js` (`setLoading`, `showError`, `showResult`, markdown formatting), `tool-features.js` (rating, download, share, deep-dive injectors).
- Each tool HTML page already does `<script src="tool-utils.js">` — update to include all three, or bundle with a simple `cat` step in CI.

---

### 15. Service worker has no cache-busting — users see stale CSS/JS after deploys

**What**: `sw.js` precaches `style.css`, `script.js`, and others by URL alone. When these files change after a deploy, cached visitors keep seeing the old version until they force-refresh.  
**Where**: `sw.js:32` (`cache.addAll(PRECACHE_ASSETS)`)  
**Why it matters**: A layout bug fix or brand colour update ships to new visitors but not to returning ones — the cohort most likely to convert.  
**Effort**: S  
**Suggested fix**:
- Add a `CACHE_VERSION = 'v2026-06-20'` constant (or auto-generated timestamp) to the cache name in `sw.js`. On `activate`, delete all caches not matching the current version — browsers then re-fetch all assets.
- Alternatively, append a `?v=YYYYMMDD` query string to precached asset URLs in `sw.js` and update it on each deploy.

---

### 16. Inline `onerror` handlers on `<img>` tags — hard to maintain and policy-hostile

**What**: Company logo fallback chains are implemented with `onerror="this.src='...'; this.onerror=function(){...}"` inline on multiple `<img>` tags.  
**Where**: `index.html:1425` (Givelink logo) and similar logo fallback patterns throughout  
**Why it matters**: Inline event handlers break any future Content-Security-Policy (`script-src 'self'` disallows `onerror`). They're also invisible to linters and impossible to unit-test.  
**Effort**: S  
**Suggested fix**:
- In `script.js`, add: `document.querySelectorAll('img[data-fallback]').forEach(img => { img.addEventListener('error', () => { img.src = img.dataset.fallback; }) })`.
- Replace the inline `onerror` attribute with `data-fallback="assets/logo.svg"` on each `<img>`.

---

## 💡 P3 — Nice to have

### 17. "Go Deeper" button has no explanation — users don't know what they're clicking

**What**: The AI tool "Go Deeper" button appears after a result with only a sparkle emoji and a "Claude Sonnet" badge, no tooltip or description of what it does differently.  
**Where**: `tool-utils.js:1263`  
**Why it matters**: Users unfamiliar with model names don't know if this costs money, takes longer, or produces a better answer. Low click-through on a high-value feature.  
**Effort**: S  
**Suggested fix**:
- Add a `title` attribute: `title="Analyse this result in greater depth using Claude Sonnet — takes ~10 seconds"`.
- Optionally, add a one-line sub-label below the button: *"More detailed analysis · ~10 sec"*.

---

### 18. Responsive image `srcset` missing across the site

**What**: All `<img>` tags use a single resolution source with no `srcset` or `sizes`, serving the same asset to both a 320 px phone and a 4K monitor.  
**Where**: `index.html` — hero `photo.webp`, press section thumbnails, book cover fallbacks  
**Why it matters**: Mobile users download more bytes than needed; retina desktop users see lower-resolution images than the display supports.  
**Effort**: M  
**Suggested fix**:
- For the hero: generate `photo-400w.webp` and `photo-800w.webp` and add `srcset="photo-400w.webp 400w, photo-800w.webp 800w" sizes="(max-width: 600px) 400px, 800px"`.
- Automate with a small `generate_images.py` using Pillow alongside the existing `generate_og.py`.

---

### 19. No `Content-Security-Policy` header — broad XSS surface

**What**: GitHub Pages serves no `Content-Security-Policy` header, and the site relies entirely on browser SOP. If any of the XSS vectors in P0/P2 are exploited, there's no backstop.  
**Where**: No CSP file exists in the repo; would need a `_headers` file for Cloudflare Pages or a meta tag  
**Why it matters**: A CSP that restricts `script-src` to `'self'` plus known CDNs would neutralise most injection attempts as a defence-in-depth layer.  
**Effort**: M  
**Suggested fix**:
- Add a `<meta http-equiv="Content-Security-Policy">` tag to `index.html` with `default-src 'self'; script-src 'self' 'nonce-...' cdn.jsdelivr.net plausible.io; style-src 'self' 'unsafe-inline' fonts.googleapis.com; img-src * data:;`.
- Long-term, migrate to Cloudflare Pages (already using Workers) and add a `_headers` file for proper HTTP-level CSP.

---

### 20. JSDoc types absent from all API-facing functions

**What**: Functions like `callWorker(endpoint, payload)`, `showResult(text, container)`, and `parseMarkdown(text)` have no type annotations or JSDoc, making parameter expectations opaque.  
**Where**: `tool-utils.js:1–50` (exported functions), `chat.js:79` (`parseMarkdown`)  
**Why it matters**: Without types, refactors silently break callsites. The existing `data.organizations` assumption (`tool-utils.js:1434`) is the kind of bug types would have caught.  
**Effort**: M  
**Suggested fix**:
- Add `@param` / `@returns` JSDoc to the 10–15 most-called functions in `tool-utils.js`.
- Optionally add a `jsconfig.json` with `"checkJs": true` to get VS Code type-checking without migrating to TypeScript.

---

*Total: 20 items across 4 priority tiers.*
