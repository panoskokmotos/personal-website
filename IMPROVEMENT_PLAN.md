# Givelink Personal Site — Improvement Plan
_Audited 2026-06-04 · 30 HTML files · 11,698 lines · 6 JS files_

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

---

### 1. Notify secret exposed in public frontend JS
**What**: `TOOL_NOTIFY_SECRET` is hardcoded in a public JS file, letting anyone spam email notifications.  
**Where**: `tool-utils.js:11` — `const TOOL_NOTIFY_SECRET = 'panos-notify-2026-xyz';`  
**Why it matters**: Any visitor who opens DevTools can call `POST /notify` with this secret and flood your inbox or burn MailChannels quota. Secrets in frontend JS are never secret.  
**Effort**: S  
**Suggested fix**:
- Remove `TOOL_NOTIFY_SECRET` from `tool-utils.js` entirely; move it to a `NOTIFY_SECRET` env var in the Worker (already done for the in-worker self-notify at line 269).
- Instead of authenticating the `/notify` endpoint with a shared secret from the browser, protect it by checking that the request `Origin` header matches `panoskokmotos.com` on the Worker side.
- Until patched, rotate the secret in Workers env vars immediately.

---

### 2. Contact form failures surface as native browser `alert()`
**What**: Network errors and non-OK HTTP responses on the contact form trigger `alert()` calls, not inline error messages.  
**Where**: `script.js:405` (`alert('Something went wrong...')`) and `script.js:411` (`alert('Network error...')`)  
**Why it matters**: `alert()` blocks the entire tab, looks broken on modern browsers, breaks in certain embedded contexts, and is jarring UX — users abandon the form. The success path already uses an elegant inline `.visible` element; errors should too.  
**Effort**: S  
**Suggested fix**:
- Add an `<div id="contactError" class="error-box">` below the submit button (mirroring the existing `#contactSuccess` element).
- Replace both `alert(...)` calls with `document.getElementById('contactError').textContent = ...; document.getElementById('contactError').classList.add('visible');`.
- Clear it on each new submit attempt.

---

### 3. Cloudflare Worker downtime leaves all 11 AI tools silently broken
**What**: When the single Cloudflare Worker (`ask-panos...workers.dev`) is unreachable, all AI tools show only the generic error box with no guidance — users don't know if it's permanent or temporary.  
**Where**: `tool-utils.js:187-202` (fallback fetch), `tool-utils.js:317-327` (error display); affects all 11 tool pages  
**Why it matters**: A cold Worker spin-up, Cloudflare incident, or deployment error leaves every tool page in a broken state with zero user communication. First-time visitors bounce permanently.  
**Effort**: S  
**Suggested fix**:
- In `tool-utils.js`'s `catch` block after the fallback fetch, detect network errors (`TypeError: Failed to fetch`) specifically and show: *"The AI is temporarily unavailable — try again in a few seconds or [email me]."*
- Add a retry button that re-invokes `submitTool()` after a failed fetch rather than requiring a full page reload.
- Consider adding a `/health` endpoint to the Worker that returns `{ok:true}` so you can proactively detect downtime.

---

### 4. In-memory rate limiting in Worker is per-isolate, making it bypassable
**What**: The Worker's rate limiter uses an in-memory `Map` that resets every time Cloudflare spawns a new isolate — the 20 req/hour limit is unenforced across instances.  
**Where**: `cloudflare-worker.js` — the `rateLimitMap` constant and surrounding logic (lines ~80-130 of the deployed worker)  
**Why it matters**: A single user can bypass the rate limit by hitting the Worker URL from multiple tabs or waiting for a cold start — burning your Anthropic API budget. At 11 tools + streaming, this adds up fast.  
**Effort**: M  
**Suggested fix**:
- Migrate to Cloudflare Workers KV or Durable Objects for rate limit state that persists across isolate instances.
- As a quick interim fix, lower the in-memory limit to 5 req/30 minutes so even per-isolate limits are meaningful.
- Add the `--no-cache` header check or a session token to prevent trivial bypasses.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

---

### 5. `--blue: #3b6ef8` is the de-facto primary color but violates brand spec
**What**: The entire UI — CTAs, links, active states, skill bars, confetti, milestone toasts, tool chips — uses `#3b6ef8` (royal blue), which is not in the brand palette (purple `#6B3FA0`/`#5718CA`, pink `#C2185B`/`#E353B6`).  
**Where**: `style.css:15` — `--blue: #3b6ef8` token used ~200+ times throughout the stylesheet  
**Why it matters**: The Givelink brand is purple/pink. When visitors cross from `givelink.app` to `panoskokmotos.com`, the jarring color switch breaks trust and weakens brand recall — especially for investors and press doing due diligence.  
**Effort**: M  
**Suggested fix**:
- Rename `--blue` → `--brand-primary` and change its value to `#5718CA` (Givelink's strong purple).
- Rename `--blue-light` → `--brand-primary-light` and adjust to `#7B3FD0`.
- Update `--gold: #f4a924` to `--accent` and keep as a secondary accent (it's distinct enough to not clash). Audit `milestone toast` colors in `tool-utils.js:253-256` to use these vars instead of hardcoded hex.

---

### 6. Iframe embed height fixed at 700px — breaks on mobile for all 11 embeddable tools
**What**: The "Embed this tool on your site" snippet always generates `height="700"` iframes with no responsive alternative.  
**Where**: `tool-utils.js:558, 565, 572, 579` — all four platform templates  
**Why it matters**: Nonprofits embedding these tools on their own sites (a key distribution channel) will see truncated or overflowing iframes on mobile, which likely covers the majority of their traffic. This directly impacts the embed-to-use funnel.  
**Effort**: S  
**Suggested fix**:
- Change the iframe snippet to use `style="width:100%;height:700px;min-height:500px;"` and add a note that height can be adjusted.
- For the HTML/WordPress variants, provide the responsive wrapper snippet: `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;"><iframe ... style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe></div>`.
- Add a "Copy responsive version" toggle button alongside the existing copy button.

---

### 7. Rate limit countdown ends silently — no retry CTA shown
**What**: After the 30-second rate limit countdown ticks to zero, `hideError()` is called and the error disappears — leaving no prompt to tell the user they can try again.  
**Where**: `tool-utils.js:205-220` — `_showRateLimitError()` function, specifically the `secs <= 0` branch at line 213  
**Why it matters**: Users who hit the rate limit wait 30 seconds then see... nothing. No "You're good to go — try again!" signal means most users assume the tool is still broken and leave.  
**Effort**: S  
**Suggested fix**:
- When `secs <= 0`, instead of `hideError()`, call a new `showSuccess('All clear — go ahead and try again!')` helper that auto-dismisses after 4 seconds.
- Alternatively, re-enable the submit button and auto-focus it so the next interaction is obvious.

---

### 8. Follow-up question errors are swallowed with generic copy
**What**: When the follow-up chat box inside a tool fails (Worker error, rate limit, network), the loading bubble is replaced with `'Sorry, try again.'` — no distinction between a rate limit, a network error, or a server error.  
**Where**: `tool-utils.js:1082` — `loading.innerHTML = 'Sorry, try again.';` in the `ask()` function's catch block  
**Why it matters**: Rate-limited users hit the same 30s wait but get no countdown — they spam the button making things worse. Network errors get the same copy as server errors, giving zero actionable information.  
**Effort**: S  
**Suggested fix**:
- In the catch block, check `err._shown` (already set for rate limit errors) and display the rate limit countdown inside the bubble if true.
- For non-rate-limit errors, show: *"Couldn't reach the AI — check your connection and try again."*
- Disable the ask button for 3s after an error to prevent spam.

---

### 9. Book cover fallback `<div>` has no accessible label
**What**: When a book cover image fails (1×1px GIF from OpenLibrary), the entire `<img>` tag is replaced with `<div class="book-cover-fb">ABC</div>` with no `role`, `aria-label`, or `title`.  
**Where**: `script.js:217` — `img.parentElement.innerHTML = \`<div class="book-cover-fb">${abbr}</div>\``  
**Why it matters**: Screen reader users browsing the books section hear nothing for these items — the book title is visually shown elsewhere but the cover slot is a dead zone. Minor accessibility gap but trivially fixable.  
**Effort**: S  
**Suggested fix**:
- Change to: `<div class="book-cover-fb" role="img" aria-label="${img.alt.replace(' cover','')} book cover">${abbr}</div>`
- The `abbr` already derives from `img.alt`, so the label requires no new data.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

---

### 10. `formatMarkdown` / `parseMarkdown` duplicated across files
**What**: Two nearly-identical Markdown-to-HTML functions exist: `formatMarkdown()` in `tool-utils.js` and `parseMarkdown()` in `chat.js`, with minor differences (chat.js adds italic support).  
**Where**: `tool-utils.js:222-226` and `chat.js:16-26`  
**Why it matters**: When you extend Markdown support (e.g., add bullet lists, headers, or XSS-safe escaping), you'll need to update both — and will inevitably miss one, causing rendering inconsistency between chat and tool results.  
**Effort**: S  
**Suggested fix**:
- Promote the more complete `chat.js` version (which handles bold + italic + URLs + newlines) to `tool-utils.js` as the canonical `parseMarkdown()` export.
- In `chat.js`, remove the local definition and use `parseMarkdown` from `tool-utils.js` (load order already has tool-utils first on tool pages; on chat-only pages, move `parseMarkdown` to a tiny shared `utils.js`).

---

### 11. `localStorage` try/catch wrapper repeated 4+ times
**What**: Every localStorage read/write is wrapped in its own ad-hoc `try { ... } catch {}` block with no shared abstraction.  
**Where**: `chat.js:30-44`, `tool-utils.js:232-236`, `tool-utils.js:830`, and multiple other locations  
**Why it matters**: When localStorage is unavailable (private browsing in Safari, storage quota errors), each block handles it differently — some silently ignore the error, some fall through to broken state. Centralizing this makes behavior consistent.  
**Effort**: S  
**Suggested fix**:
- Add two helpers to `tool-utils.js`: `safeGet(key, fallback)` and `safeSet(key, value)` — each wrapping localStorage with try/catch.
- Replace all 4+ inline try/catch blocks with calls to these helpers.

---

### 12. Milestone toast colors set as hardcoded hex inline styles
**What**: The four milestone toast messages each carry a different hex color literal applied as an inline style.  
**Where**: `tool-utils.js:253-256` — `color: '#3b6ef8'`, `'#7c3aed'`, `'#059669'`, `'#d97706'`  
**Why it matters**: These are the four values that would need changing as part of the brand color fix (P1 item #5). Currently invisible to CSS tooling — they can't be themed, overridden, or updated via the CSS token system.  
**Effort**: S  
**Suggested fix**:
- Define four CSS custom properties: `--milestone-1`, `--milestone-5`, `--milestone-10`, `--milestone-25` in `style.css`.
- In `_showMilestoneToast()`, apply a CSS class (e.g., `milestone-${count}`) to the toast element instead of inline color styles.

---

### 13. Inline `onclick` handlers in the AI Tools quiz flow
**What**: The tool-finder quiz in `ai-tools.html` wires all interaction via `onclick="aitPickRole('donor')"` inline attributes rather than event listeners.  
**Where**: `ai-tools.html:712, 717-721, 726-729, 736` — quiz overlay buttons  
**Why it matters**: Inline handlers execute in global scope, can't be cleaned up, and will break if you ever add a Content Security Policy (CSP). The rest of the site correctly uses `addEventListener`.  
**Effort**: S  
**Suggested fix**:
- Move the quiz logic inline script block (at the bottom of `ai-tools.html`) to a separate `ai-tools.js` file.
- Replace `onclick="..."` attributes with `data-action="..."` data attributes and wire a single delegated listener on the quiz overlay.

---

### 14. `style.css` is 8,198 lines — a single monolithic file with 91 media queries
**What**: The entire stylesheet (global tokens, components, pages, dark/light mode, 91 responsive breakpoints) is one unstructured file.  
**Where**: `style.css:1-8198`  
**Why it matters**: Finding and editing specific component styles requires scanning thousands of lines. New contributors or future Panos will waste significant time hunting through this. Inconsistencies are also harder to spot.  
**Effort**: L  
**Suggested fix**:
- Split into: `tokens.css` (variables, reset), `layout.css` (nav, hero, section structure), `components.css` (cards, buttons, chips, forms), `tools.css` (AI tool page styles), `pages.css` (page-specific overrides), `utils.css` (animations, loaders, modals).
- Since this is a static site with no build step, use `<link>` tags for each file — browser HTTP/2 handles parallel loading efficiently.
- Do this incrementally: start with extracting `tokens.css` (lines 1-33) and tool-specific styles.

---

## 💡 P3 — Nice to have

---

### 15. Cloudflare Worker referenced by hardcoded URL in three constants
**What**: `TOOL_WORKER_URL`, `TOOL_STREAM_URL`, `TOOL_DEEP_URL`, and `TOOL_NOTIFY_WORKER` all hardcode the same worker hostname across four `const` declarations.  
**Where**: `tool-utils.js:7-10`  
**Why it matters**: If you ever migrate to a new Worker URL or add a staging environment, you need to update four strings. One constant for the base URL would suffice.  
**Effort**: S  
**Suggested fix**:
- Define `const WORKER_BASE = 'https://ask-panos.panagiotis-kokmotoss.workers.dev'` and derive the four endpoints from it.

---

### 16. External CDN dependencies (Google Fonts) are unpinned
**What**: Google Fonts is loaded via a standard `<link>` with no version pin, meaning the font version can change without notice.  
**Where**: `index.html` `<head>` (and mirrored in all 30 HTML pages)  
**Why it matters**: Very low probability but non-zero: a Google Fonts API change or outage causes all text to fall back to the system font, breaking the design. Self-hosting is the robust solution.  
**Effort**: M  
**Suggested fix**:
- Download the Plus Jakarta Sans font files and host them in `/assets/fonts/`.
- Replace the Google Fonts `<link>` tags with a single `@font-face` block in `style.css`.
- This also removes a third-party network dependency that marginally affects page load performance and privacy (GDPR).

---

### 17. Decorative logo strip images have empty `alt=""` — technically correct but inconsistent
**What**: The animated logo strip (partner/award logos) uses `alt=""` on all images, which is correct for purely decorative images but visually significant logos arguably deserve a text alternative.  
**Where**: `index.html:802-815`  
**Why it matters**: Users on screen readers get no context about the recognizable organizations shown (Forbes, WEF, etc.). Changing these from decorative to informative — `alt="Forbes 30 Under 30"` — would meaningfully improve the accessibility of a socially impactful profile page.  
**Effort**: S  
**Suggested fix**:
- Add descriptive `alt` text to each logo image: the organization name + context (e.g., `alt="Forbes 30 Under 30 Greece"`).
- For truly decorative items (repeated logos), keep `alt=""`.

---

_Total items: 17 · P0: 4 · P1: 5 · P2: 5 · P3: 3_
