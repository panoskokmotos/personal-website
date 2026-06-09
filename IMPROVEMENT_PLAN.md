# Givelink Personal Site — Improvement Plan

> Reviewed: 2026-06-09 | Scope: panoskokmotos/personal-website (main branch)  
> Stack: Vanilla HTML/CSS/JS + Cloudflare Worker (Anthropic API proxy)  
> No payment flows exist in this repo (Givelink app is separate).  
> PostHog not active in code despite privacy-policy reference.

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

---

### P0-1 · XSS via unescaped innerHTML on all AI tool results

**What:** `formatMarkdown()` sets `resultBody.innerHTML` directly with raw AI output, without escaping HTML entities first.

**Where:** `tool-utils.js:169`, `tool-utils.js:176`; the formatter itself is `tool-utils.js:222-226`

```js
// tool-utils.js:222-226
function formatMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}
// — no HTML entity escaping before innerHTML assignment
```

**Why it matters:** Any Claude response containing `<script>`, `<img onerror=…>`, or similar HTML executes in the user's browser. Claude itself won't generate this—but if prompt-injection via charity search results or user inputs ever triggers it, all 12 tool pages are affected simultaneously.

**Effort:** S

**Suggested fix:**
- Add an `escapeHtml()` pass *before* the regex substitutions in `formatMarkdown()`
- `return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') …`
- Then apply the bold/newline replacements on the escaped string (angle brackets are now safe literals)

---

### P0-2 · Chat widget spins forever when worker is slow or down

**What:** The `sendMessage()` fetch call in `chat.js` has no timeout and no AbortController. If the Worker takes >30s or never responds, the "thinking" dots animate indefinitely with no error or recovery path.

**Where:** `chat.js:160-184`

**Why it matters:** Worker cold-starts and Anthropic rate-limit queuing can easily take 15-25s. Users see a frozen UI and have no idea whether to wait or refresh. This is the most common reason first-time visitors abandon the chat widget.

**Effort:** S

**Suggested fix:**
- Wrap the fetch in `AbortController` with a 20-second timeout
- If the signal fires, show the existing catch branch message: `"Connection error. Email panagiotis.kokmotoss@gmail.com directly!"`
- Add a "Retry" chip alongside that error message so users don't have to retype

---

### P0-3 · Contact form failure shows a browser `alert()` dialog

**What:** When the Formspree submission returns a non-2xx or throws a network error, the page calls `alert('Something went wrong…')` (failure) and `alert('Network error…')` (catch).

**Where:** `script.js:405`, `script.js:411`

**Why it matters:** `alert()` is blocked by Safari's pop-up suppressor on many iOS Safari configurations, meaning users silently get no feedback at all. On desktop it looks broken and unprofessional for a Forbes 30U30 portfolio page.

**Effort:** S

**Suggested fix:**
- Replace both `alert()` calls with an inline `#formError` element (already exists as `#formSuccess`'s sibling pattern)
- Show the error inline below the button with `role="alert"` and `aria-live="assertive"`
- Re-enable the submit button after display so the user can retry

---

### P0-4 · `/email-result` endpoint has no rate limit — usable as a spam relay

**What:** The Cloudflare Worker's `/email-result` route validates only that the body contains an `@` character. Any caller can POST arbitrary content to arbitrary email addresses with no per-IP throttle.

**Where:** `cloudflare-worker.js:232-239`

**Why it matters:** The site's MailChannels account gets burned and the domain's sending reputation is damaged. Email deliverability for the actual digest subscription feature breaks.

**Effort:** S

**Suggested fix:**
- Reuse the existing `checkRateLimit(ip)` function — call it at the top of the `/email-result` handler, same as `/` does for chat
- Additionally cap `result` payload at a reasonable length (e.g., 20,000 chars) before sending
- Use a stricter email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

---

### P1-1 · `formatMarkdown()` renders all markdown syntax as raw text

**What:** Claude's responses use bullet lists (`-`), headers (`###`), italic (`*`), and inline code (`` ` ``), none of which are handled. Only `**bold**` and newlines convert; everything else renders as literal punctuation characters.

**Where:** `tool-utils.js:222-226` (the formatter); affects all 12 tool result panels

**Why it matters:** Results look unpolished—"- Direct your $50 toward…" instead of a proper bullet. This is the most visible quality signal for new visitors forming a first impression of the AI tools.

**Effort:** M

**Suggested fix:**
- Extend `formatMarkdown()` to handle: `### h3`, `## h2`, `* / - unordered list items`, `*italic*`, `` `code` ``, and `[text](url)`
- Escape HTML entities *first* (see P0-1), then apply each regex in order from headings → lists → inline formatting
- Keep it under 30 lines; avoid pulling in a full markdown library for this simple use case

---

### P1-2 · Donation Tax Estimator: "Stock" and "DAF" donation types show no extra fields

**What:** Selecting "Stock or appreciated assets" or "Donor-advised fund" in the donation type dropdown provides no additional inputs (cost basis, acquisition date, DAF account value). The AI prompt receives just the type name, so the tax estimate ignores the most important variables for these donation types.

**Where:** `donation-tax-estimator.html:178-187`

**Why it matters:** Stock donations and DAFs are the highest-value donation types, typically used by the site's target audience (affluent donors). Giving them an obviously incomplete estimate (no capital-gains savings shown) erodes trust in the tool.

**Effort:** M

**Suggested fix:**
- Show a conditional `<div id="stockFields">` when "stock" is selected: add "Original cost basis" and "Approximate holding period" inputs
- Show a `<div id="dafFields">` when "DAF" is selected: add "DAF provider" (optional) and "Existing balance"
- Pass these values into the system prompt alongside the existing fields

---

### P1-3 · All form inputs stay enabled during active API requests in `what-would-x-do`

**What:** `setLoading()` disables only the submit button (line 1047). Amount chips, cause chips, the monthly/one-time toggle, and the custom-amount input all remain interactive during an in-flight request.

**Where:** `what-would-x-do.html:1046-1055`

**Why it matters:** Users tap a chip expecting to change their selection, then get a result for the *old* values. They assume the tool is broken when the result doesn't match what's on screen.

**Effort:** S

**Suggested fix:**
- In `setLoading(on)`, add `document.querySelectorAll('.wxd-amount-chip, .wxd-cause-chip, .wxd-toggle-btn, #customAmount').forEach(el => el.disabled = on)`
- Re-enable in the `setLoading(false)` branch
- Optionally add `pointer-events: none; opacity: 0.5` via a CSS class on the chips section for visual clarity

---

### P1-4 · Tweet share text in `why-should-i-give` is not length-capped

**What:** The tweet text is built from the AI result summary + URL, with no character-count check before encoding into the Twitter intent URL.

**Where:** `why-should-i-give.html` (tweet share button handler, approximately line 592)

**Why it matters:** Twitter silently truncates at 280 characters. The CTA and URL get cut off, and the donation link disappears from the tweet. This is a conversion-killing bug in a feature designed to grow the site's reach.

**Effort:** S

**Suggested fix:**
- Build tweet text as: `const tweetText = summary.slice(0, 230) + '… ' + pageUrl`
- `230` leaves room for the URL (which Twitter counts as ~23 chars) plus the ellipsis
- Show the character count in the share modal if one exists, or just apply the slice silently

---

### P1-5 · Bing Webmaster verification tag is a literal placeholder string

**What:** The Bing site-verification meta tag contains `content="BING_VERIFICATION_CODE_HERE"` — the template placeholder was never replaced.

**Where:** `index.html:27`

**Why it matters:** Bing/DuckDuckGo (combined ~8% of search volume) can't verify site ownership, blocking access to Bing Webmaster Tools, crawl data, and any Bing-specific SEO signals. Easy win with zero code risk.

**Effort:** S

**Suggested fix:**
- Log in to Bing Webmaster Tools, claim panoskokmotos.com, copy the verification code
- Replace the placeholder value in `index.html:27`
- Or remove the tag entirely if Bing SEO is not a priority — a placeholder is worse than nothing

---

### P1-6 · URL auto-submit in `what-would-x-do` fires with unvalidated cause param

**What:** `loadFromURL()` reads `?amount=X&cause=Y` from the query string and calls `submitForm()` immediately if both are truthy. There's no check that `cause` matches any of the actual chip values.

**Where:** `what-would-x-do.html:1040-1043`

**Why it matters:** Shared links with typos or edited URLs trigger a wasted API call and return a confusing result ("Your $50 toward 'xyz' would…"). It also means embed codes with user-modified URLs silently degrade.

**Effort:** S

**Suggested fix:**
- Before auto-submitting, validate `cause` against the defined `CAUSES` array (or the chip `data-cause` values)
- If invalid, populate the form UI without auto-submitting so the user can correct it
- Keep the amount auto-fill even if cause validation fails

---

## 🛠 P2 — Code health (tech debt slowing velocity)

---

### P2-1 · Notification secret is hardcoded in public client-side JS

**What:** `TOOL_NOTIFY_SECRET = 'panos-notify-2026-xyz'` is a string literal in both `tool-utils.js:11` and `script.js:930`, visible in every browser's DevTools Network tab.

**Where:** `tool-utils.js:11`, `script.js:930`

**Why it matters:** Low immediate risk (the `/notify` endpoint only sends email to the site owner), but it's a hygiene issue that undermines the "security-conscious founder" brand signal, and the exposed secret will never rotate as long as it's in source.

**Effort:** S

**Suggested fix:**
- Move the secret to a Cloudflare Worker environment variable and validate it server-side only
- Remove the secret from client JS entirely; the `/notify` route can authenticate via a signed timestamp or simply move to a server-only trigger (the site already calls it fire-and-forget)
- Short-term: rotate the secret and store the new value in Cloudflare env (not in source)

---

### P2-2 · In-memory rate limit map resets on Worker cold-starts

**What:** `rateLimitStore` is a module-level `Map` in `cloudflare-worker.js:104-105`. Cloudflare Workers are stateless across cold-starts and across edge PoPs. A user rate-limited in Frankfurt has zero limit applied in Tokyo.

**Where:** `cloudflare-worker.js:104-124`

**Why it matters:** The limit is bypassed trivially by waiting for a cold start (~10-30 min inactivity) or by routing requests through a different Cloudflare edge location. This matters most for the `/` (chat) and `/api/v2/tool` (Sonnet) endpoints which have direct API cost.

**Effort:** M

**Suggested fix:**
- Bind a `RATE_LIMIT_KV` namespace in `wrangler.jsonc` (one line + one Cloudflare dashboard click)
- Replace `rateLimitStore.get/set` with `await env.RATE_LIMIT_KV.get/put` using TTL equal to `RATE_WINDOW_MS`
- The existing `checkRateLimit()` function shape stays the same; only the storage backend changes

---

### P2-3 · `/api/v2/tool` calls `.json()` before checking `response.ok`

**What:** `cloudflare-worker.js:393` calls `await response.json()` on the Anthropic response unconditionally. If Anthropic returns a 429, 500, or any response with a non-JSON body, this throws a `SyntaxError` that bubbles up as an unhandled exception.

**Where:** `cloudflare-worker.js:393-394`

**Why it matters:** During Anthropic outages or rate-limit storms, the "Go Deeper" button silently fails with a 500 error that gives the client no actionable information, rather than surfacing "AI is temporarily busy—try again in a moment."

**Effort:** S

**Suggested fix:**
- Add `if (!response.ok) { const err = await response.json().catch(() => ({})); return new Response(…) }` before line 393
- Apply the same pattern to all four Anthropic `fetch()` sites in the worker (`/api/v1/stream` at line 314 already does this correctly — use it as the template)

---

### P2-4 · No fetch timeout on any Anthropic API call in the Worker

**What:** All four `fetch('https://api.anthropic.com/…')` calls in `cloudflare-worker.js` have no `AbortController` / signal. Cloudflare Workers have a 30-second CPU limit but the wall-clock timer for subrequests can run much longer.

**Where:** `cloudflare-worker.js:298` (stream), `378` (v2/tool), `433` (v1/tool), `481` (chat)

**Why it matters:** A slow Anthropic response ties up a Worker instance and burns execution time toward Cloudflare's free-tier limits, degrading performance for other simultaneous users.

**Effort:** S

**Suggested fix:**
- Create a shared helper: `const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 25_000);`
- Pass `signal: controller.signal` to each `fetch` call
- Clear the timeout on success: `clearTimeout(timeoutId)` after `await fetch(…)` resolves

---

### P2-5 · CORS is open wildcard — any site can proxy through the Worker

**What:** `cloudflare-worker.js:127` sets `'Access-Control-Allow-Origin': '*'`, allowing any external website to call the AI endpoints and consume the Anthropic API quota.

**Where:** `cloudflare-worker.js:127`

**Why it matters:** Any developer who finds the Worker URL can build their own site on top of the Claude API budget. On the current Anthropic free/starter tier, a viral Reddit post linking to the Worker URL directly would cause outage.

**Effort:** S

**Suggested fix:**
- Replace `'*'` with: `const origin = request.headers.get('Origin') || ''; const allowedOrigin = origin.includes('panoskokmotos.com') ? origin : 'https://panoskokmotos.com';`
- Use `allowedOrigin` in `CORS_HEADERS` instead of `'*'`
- Keep `'*'` only on the `/api/charity-search` GET route if that endpoint is intended as a public API

---

## 💡 P3 — Nice to have

---

### P3-1 · `filter: blur(80px)` on the hero orb causes GPU jank on low-end mobile

**What:** The decorative `.hero-orb` element uses `filter: blur(80px)` in `style.css` (approximately line 347), which forces GPU compositing on a large element and causes frame drops on mid-range Android devices.

**Where:** `style.css:~347`

**Why it matters:** Affects the hero section first-paint experience on the >50% of visitors who are on mobile. The orb is purely decorative — removing the blur loses no information.

**Effort:** S

**Suggested fix:**
- Reduce to `filter: blur(40px)` as a first step; visually identical at distance
- Or replace with a static radial-gradient background that achieves the same soft glow without GPU cost
- Wrap in `@media (prefers-reduced-motion: reduce)` to disable entirely for users who have it set

---

### P3-2 · Chat silently discards messages older than 20 with no user indication

**What:** `chat.js:49` slices history to the last 20 messages for localStorage persistence, but there is no UI indicator that earlier messages were dropped from context.

**Where:** `chat.js:49`

**Why it matters:** Users in longer conversations get confused when the AI "forgets" something they said 25 messages ago — they blame the AI quality rather than understanding the deliberate cap.

**Effort:** S

**Suggested fix:**
- When the cap is reached, inject a styled system message: `"— Earlier messages were removed to save context —"` with `role: 'system'` and a distinct style
- Add a tooltip on "New Chat" explaining the 20-message limit

---

### P3-3 · Outdated font-preload pattern increases font render time

**What:** `index.html:68` uses the `rel="preload" + onload="this.rel='stylesheet'"` polyfill pattern. This was needed in 2018 for Safari ≤11 but is cargo-culted today and adds a small parsing cost.

**Where:** `index.html:68`

**Why it matters:** Minor — modern browsers handle this fine — but the `<noscript>` fallback on line 69 means fonts only load without JavaScript if the fallback fires, which can cause a flash of unstyled text if preload is slow.

**Effort:** S

**Suggested fix:**
- Replace the preload/onload pattern with a plain `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?…" media="print" onload="this.media='all'">`
- Or simply use a standard `<link rel="stylesheet">` — the performance difference is negligible at this traffic level, and it removes the JS dependency on font loading

---

### P3-4 · Missing `preconnect` to `fonts.gstatic.com` adds latency on first visit

**What:** `index.html:66` uses `dns-prefetch` (not `preconnect`) for `fonts.gstatic.com`. The font *files* are served from that domain, so a full TLS handshake still needs to happen before the first font byte downloads.

**Where:** `index.html:66`

**Why it matters:** Adds ~150ms to first-visit font load on connections with high round-trip time. The fix is one line.

**Effort:** S

**Suggested fix:**
- Change line 66 from `<link rel="dns-prefetch" href="https://fonts.gstatic.com">` to `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
- Keep the `dns-prefetch` as a fallback for older browsers by adding it as a second line

---

### P3-5 · `style.css` is 8,198 lines with no module boundaries

**What:** All styles — global reset, component library, tool-specific overrides, light mode, animations — live in a single file. Batch markers (`/* Batch A */`, `/* Phase 6 */`) are the only navigation aid.

**Where:** `style.css` (entire file)

**Why it matters:** Every new tool page requires opening an 8k-line file to find the right section. The risk of accidental selector collision grows with each addition. No tooling (bundler, PostCSS, linting) is currently applied.

**Effort:** L

**Suggested fix:**
- Split into logical layers: `base.css`, `layout.css`, `components.css`, `tools.css`, `themes.css`, `animations.css`
- No build step needed — plain `<link>` each file, or concatenate with a simple shell script at deploy time
- Start by extracting the tool-specific sections (lines ~4500–8000) which are clearly isolated

---

*Total: 4 P0 · 6 P1 · 5 P2 · 5 P3 = 20 items*
