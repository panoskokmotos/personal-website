# Givelink / panoskokmotos.com — Improvement Plan

> Generated: 2026-05-16  
> Scope: full repository audit — bugs, UX, code health, brand consistency

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. Missing OG image breaks social sharing on all 13 tool pages
**What:** `og-ai-tools.png` is referenced 28 times across every tool page and `ai-tools.html`, but the file does not exist in the repo.  
**Where:** `ai-tools.html:12,16` · `what-would-x-do.html:20,22` · `charity-comparison-engine.html:17,19` · and 22 more identical references across all other tool pages  
**Why it matters:** Every time someone shares a tool link on LinkedIn, Twitter/X, Slack, or iMessage, the preview card shows no image — a blank rectangle instead of the branded card. For a site whose social sharing CTAs are on every tool result, this silently kills virality.  
**Effort:** S  
**Suggested fix:**
- The template already exists at `og-ai-tools-preview.html` with instructions in the comment header — open it in Chrome at 1200×630, screenshot, save as `og-ai-tools.png`
- Alternatively, run `generate_og.py` and adapt it for the tools variant (purple gradient, "AI for Social Impact" headline)
- Commit the generated PNG and verify with a social card preview tool (e.g. opengraph.xyz)

---

### 2. Notification secret hardcoded in public JavaScript
**What:** The Cloudflare Worker notify secret is exposed verbatim in two frontend JS files anyone can read in DevTools.  
**Where:** `tool-utils.js:11` — `const TOOL_NOTIFY_SECRET = 'panos-notify-2026-xyz';` · `script.js:931` — same value  
**Why it matters:** Anyone who opens DevTools can extract this secret and POST directly to `/notify`, bypassing rate limiting on the frontend and flooding your inbox with fake "Tool Used" / "Form Submitted" notifications indefinitely. The secret's purpose (preventing abuse) is entirely defeated by being public.  
**Effort:** S  
**Suggested fix:**
- Remove `TOOL_NOTIFY_SECRET` from both frontend files entirely — the secret should only live in the Cloudflare Worker's environment variable `NOTIFY_SECRET`
- Move notification calls to a dedicated worker route that authenticates via the same-origin Cloudflare request context rather than a shared secret in JS
- As an interim: rotate the secret in the Worker env var now, then remove the frontend constant

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 3. Both CTAs render on every tool card — duplicate "Try it" confusion
**What:** Each card in `ai-tools.html` contains both `<span class="ait-cta">Try it →</span>` AND `<span class="ait-try-btn">Try it free →</span>`, both styled and visible, stacked on top of each other.  
**Where:** `ai-tools.html:138–140` — and 12 more identical pairs through line 310  
**Why it matters:** Two competing CTAs on the same clickable card create visual noise and signal design uncertainty to visitors. The entire card is already a link — both CTAs are redundant with each other and with the wrapping `<a>` tag. This likely happened when `ait-try-btn` was added as a redesign but `ait-cta` wasn't removed.  
**Effort:** S  
**Suggested fix:**
- Remove all 13 `<span class="ait-cta">…</span>` elements — keep only `ait-try-btn`
- Verify the card hover style still shows the button correctly after removal
- Remove the `.ait-cta` CSS rule at `ai-tools.html:460` to clean up dead styles

---

### 4. `formatMarkdown()` too minimal — AI output renders with raw markdown noise
**What:** The shared markdown renderer only converts `**bold**` to `<strong>` and `\n` to `<br>`. All other AI-generated markdown — `## headings`, `- bullet lists`, `[links](url)`, `` `code` `` — renders as raw characters in the result body.  
**Where:** `tool-utils.js:222–226`  
**Why it matters:** AI responses from Claude regularly use lists, headers, and bullets for structure. Users see output like `## Your Impact\n- $50 provides...` as literal text instead of formatted content. This makes every tool result harder to scan and looks unpolished — it's the first thing a user sees after waiting for the AI response.  
**Effort:** M  
**Suggested fix:**
- Extend `formatMarkdown()` to handle: `## Heading` → `<h3>`, `- item` / `* item` → `<ul><li>`, `[text](url)` → `<a>` (with `target="_blank" rel="noopener"`), `` `code` `` → `<code>`
- Process in the right order: headings and lists before inline replacements to avoid conflicts
- No external library needed; the existing regex approach scales to 8–10 patterns cleanly

---

### 5. Range slider on First-Time Donor Coach is inaccessible to screen readers
**What:** The budget slider input has no `aria-label`, no `aria-valuetext`, and the visible `<label>` element at line 115 has no `for` attribute connecting it to the input.  
**Where:** `first-time-donor-coach.html:115` (label without `for`) · `first-time-donor-coach.html:123` (range input with no `aria-label` or value attributes)  
**Why it matters:** Screen readers announce this as "slider, 20" with no context — users don't know it controls donation amount. Nonprofits frequently recommend this tool to donors with disabilities; an inaccessible budget picker is a silent conversion killer for that segment.  
**Effort:** S  
**Suggested fix:**
- Add `aria-label="Monthly donation amount"` to the range input at line 123
- Add `aria-valuetext` updated dynamically in the existing `updateDisplay()` function at line 214 (e.g. `range.setAttribute('aria-valuetext', '$20/month')`)
- Add `for="fdrcRange"` to the `<label>` at line 115 (currently labels a hidden input, not the visible range)

---

### 6. Chip/toggle buttons have no `aria-pressed` state — keyboard users fly blind
**What:** The amount and cause chip buttons in `what-would-x-do.html` toggle a visual "active" class (`wxd-chip-active`) when selected but never set `aria-pressed`, so keyboard and screen reader users can't tell which option is currently chosen.  
**Where:** `what-would-x-do.html:122–165` (chip buttons) · `tool-utils.js:531–542` (where `classList.add('wxd-chip-active')` is set without ARIA update)  
**Why it matters:** This is the primary input UI for the most-used tool. A keyboard user tabbing through amount options hears "button, $50" on every chip with no indication that $50 is the selected one. WCAG 4.1.2 violation.  
**Effort:** S  
**Suggested fix:**
- Set `aria-pressed="false"` as the initial attribute on all chip buttons in HTML
- In the JS click handlers where `classList.add/remove('wxd-chip-active')` is called, also update: `allChips.forEach(c => c.setAttribute('aria-pressed', 'false'))` then `chip.setAttribute('aria-pressed', 'true')`
- The same pattern applies to the "One-time / Monthly" mode toggle buttons in the same tool

---

### 7. Tool pages have no skip-to-content link — keyboard navigation penalty
**What:** `index.html` has a skip-to-content link at line 581, but none of the 12 tool pages (or `ai-tools.html`) have one. Keyboard users must tab through the back-arrow header on every tool page before reaching the form.  
**Where:** All tool HTML pages — e.g. `what-would-x-do.html` (no skip link) · `ai-tools.html` (no skip link) · The CSS rule for `.skip-to-content` already exists at `style.css:2731–2738`  
**Why it matters:** The skip link CSS is already written and tested; this is just missing markup. On the donation tools where the form is the primary purpose, forcing keyboard users through header navigation first is a significant friction point.  
**Effort:** S  
**Suggested fix:**
- Add `<a href="#toolForm" class="skip-to-content">Skip to tool</a>` as the first child of `<body>` in each tool page
- For `ai-tools.html`, target `<main>` since there's no single form: `<a href="#main-content" class="skip-to-content">Skip to tools</a>`
- No CSS changes needed — the `.skip-to-content` class is already defined with the correct focus-reveal behavior

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 8. `pageUrl` injected unsanitized into email HTML
**What:** In the `/email-result` Worker route, the `url` field from the POST body is embedded directly into an HTML email's `href` attribute without validation.  
**Where:** `cloudflare-worker.js:246` — `` `<a href="${pageUrl || 'https://panoskokmotos.com'}">` ``  
**Why it matters:** A POST to `/email-result` with `"url": "javascript:alert(1)"` or `"url": "https://evil.com\" onclick=\"..."` injects malicious content into emails sent to real users. The `/email-result` endpoint accepts any POST (only rate-limited), so this is exploitable without authentication.  
**Effort:** S  
**Suggested fix:**
- Validate `pageUrl` before using it: `const safeUrl = (() => { try { const u = new URL(pageUrl); return ['https:','http:'].includes(u.protocol) && u.hostname.endsWith('panoskokmotos.com') ? pageUrl : 'https://panoskokmotos.com'; } catch { return 'https://panoskokmotos.com'; } })()`
- Apply this same pattern to the `tool` field at line 245 which uses `.replace(/</g,'&lt;')` — add `>` escaping too: `.replace(/>/g, '&gt;')`

---

### 9. Worker URL hardcoded in three separate files
**What:** `https://ask-panos.panagiotis-kokmotoss.workers.dev` is hardcoded in `tool-utils.js` (lines 7–11), `chat.js` (line 2), and `script.js` (line 930). Rotating or staging the worker requires editing three files.  
**Where:** `tool-utils.js:7–11` · `chat.js:2` · `script.js:930`  
**Why it matters:** When testing a staging worker or rotating to a new deployment, any missed file silently fails with network errors that surface as "Connection error" to users. It's happened: the `tool-utils.js` and `chat.js` currently use the same domain string but have diverged in format (chat.js omits the path prefix).  
**Effort:** S  
**Suggested fix:**
- Create a single `config.js` file with `const WORKER_BASE = 'https://ask-panos.panagiotis-kokmotoss.workers.dev'`
- Load it first via `<script src="/config.js">` in all HTML pages (before `tool-utils.js` and `chat.js`)
- Replace all three hardcoded string occurrences with `WORKER_BASE + '/...'`

---

### 10. Community Needs Map and Neighborhood Giving Map are near-duplicate files
**What:** `community-needs-map.html` (338 lines) and `neighborhood-giving-map.html` (346 lines) share ~95% of their HTML structure; they differ only in title, description, system prompt framing, and FAQ copy.  
**Where:** `community-needs-map.html` · `neighborhood-giving-map.html`  
**Why it matters:** Any structural change — adding a share button, updating the disclaimer, fixing an accessibility issue — must be made twice. Already happened: both pages have the `.tool-how` `aria-label` but the h1 copy diverged. Next time a bug is fixed in one, it will be missed in the other.  
**Effort:** M  
**Suggested fix:**
- Extract the ~90% shared structure into a template comment block in `community-needs-map.html` and treat it as the canonical source
- In the near-term (without a build step): add a `<!-- SYNC WITH: neighborhood-giving-map.html -->` comment at the top of both files so changes aren't missed
- Longer term: parameterize via URL query string or a small JS config object at the top of a shared template

---

### 11. `style.css` is a 8,198-line monolith loaded on every page
**What:** The entire site's CSS — home page, all tool pages, PWA banner, history drawer, offline page — ships as a single 267 KB file that every page loads in full, including ~6,000 lines of CSS the current page doesn't use.  
**Where:** `style.css` (all 8,198 lines) · referenced from every HTML page via `<link rel="stylesheet" href="/style.css">`  
**Why it matters:** Tool pages load the full awards section, books grid, Spotify widget, and home-page-specific component styles. This is ~180 KB of parse-and-discard CSS on every tool page load. Service worker caches it, so it's a one-time cost per visitor — but first-load on slow connections is penalized, particularly for users arriving from social shares.  
**Effort:** L  
**Suggested fix:**
- Split into: `style-base.css` (reset, variables, typography, shared components), `style-home.css` (home-page-only sections), `style-tools.css` (tool-page-specific CSS starting at roughly line 5100)
- Each HTML file loads only the base + its page-specific file
- The service worker's `PRECACHE_ASSETS` list already exists at `sw.js:4–27` — add the new split files

---

### 12. History drawer restores localStorage HTML without sanitization
**What:** When a user opens "Past Results" and clicks "Restore", the stored HTML string is written directly back via `innerHTML` without any sanitization.  
**Where:** `tool-utils.js:868–869` — `if (result && rb && h.html) { rb.innerHTML = h.html; }`  
**Why it matters:** The stored HTML comes from AI-generated text passed through `formatMarkdown()`, which today is safe. But `formatMarkdown()` is growing (once fix #4 is implemented, it will produce links and code tags), and localStorage can be edited by browser extensions. The blast radius is limited to the current user's session, but it's an unnecessary risk.  
**Effort:** S  
**Suggested fix:**
- Store only the raw `fullText` string in history (not the rendered HTML): change `html: document.getElementById('resultBody')?.innerHTML || ''` at line 807 to `text: text`
- On restore, re-run `rb.innerHTML = formatMarkdown(h.text)` instead of restoring raw HTML
- This also means history entries benefit automatically from future `formatMarkdown()` improvements

---

## 💡 P3 — Nice to have

### 13. Tool submissions not tracked in analytics
**What:** Plausible is loaded on all tool pages and `window.plausible` is called for rating events, but actual tool submissions — the primary conversion action — are not tracked.  
**Where:** `tool-utils.js:973` (only place `window.plausible` is called) · `tool-utils.js:228` (`notifyToolUsed()` fires a backend notification but no frontend event)  
**Why it matters:** Without submission tracking, there's no way to know which tools convert best, where users drop off, or whether UX changes improve completion rates. The backend notify counter is per-IP and lossy.  
**Effort:** S  
**Suggested fix:**
- Add `if (window.plausible) window.plausible('Tool Submit', { props: { tool: window.location.pathname } })` inside `notifyToolUsed()` at `tool-utils.js:228`, just after the localStorage counter
- Similarly track email captures and share clicks in `_addEmailCapture()` and `addShareButtons()`

---

### 14. Service worker cache name requires manual bumps on every deploy
**What:** `sw.js:1` has `const CACHE_NAME = 'panos-v4'` as a hardcoded literal. When new assets are deployed, this must be manually incremented or users get stale CSS/JS served from cache.  
**Where:** `sw.js:1`  
**Why it matters:** If you deploy a fix (say, the OG image or the markdown renderer) and forget to bump `panos-v4` to `panos-v5`, returning users continue to get the broken version from cache. There's no CI check that flags this.  
**Effort:** S  
**Suggested fix:**
- Replace the hardcoded version with a build-time timestamp or content hash injected by a pre-commit hook or GitHub Action: `const CACHE_NAME = 'panos-__BUILD_TS__'`
- Simpler interim: add a GitHub Actions step that `grep`s for the cache name and fails if `sw.js` hasn't changed when other cached assets have

---

### 15. `<label>` for monthly budget amount picker not linked to its input
**What:** In `first-time-donor-coach.html`, the visible label "What monthly amount feels comfortable to start with?" has no `for` attribute, so clicking the label text doesn't focus the slider, and the label-input association is missing for assistive tech.  
**Where:** `first-time-donor-coach.html:115` — `<label class="tool-label">What monthly amount…</label>` · the associated range input is at line 123  
**Why it matters:** Small accessibility gap that costs nothing to fix and matters for WCAG 1.3.1 (Info and Relationships) compliance.  
**Effort:** S  
**Suggested fix:**
- Add `for="fdrcRange"` to the `<label>` at line 115
- Note: line 117 has a hidden input `id="budget"` — remove the implicit label-for association conflict by keeping that input as `aria-hidden="true"` since it's purely for form serialization

---

*Items not included: vague suggestions with no specific file target, items requiring full rewrites of working code, and cosmetic polish that doesn't affect user flows or business metrics.*
