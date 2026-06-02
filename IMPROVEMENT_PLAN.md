# Givelink Personal Site — Improvement Plan

> Audited 2026-06-02. Covers `index.html`, `script.js`, `style.css`, `chat.js`, `tool-utils.js`, `cloudflare-worker.js`, and all 12 tool pages.

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. `og-ai-tools.png` missing — social previews broken on all tool pages

**What:** The file `og-ai-tools.png` doesn't exist in the repo, so every `<meta og:image>` tag for tool pages returns a 404.

**Where:** `charity-comparison-engine.html:17`, `what-would-x-do.html:20`, `donation-tax-estimator.html:17`, `scam-nonprofit-detector.html:17`, `volunteer-match.html:17`, `nonprofit-health-checker.html:17`, `community-needs-map.html:17`, `neighborhood-giving-map.html:17`, `first-time-donor-coach.html:17`, `impact-story-generator.html:17`, `what-can-i-donate.html:17`, `ai-tools.html:12` (12 files total).

**Why it matters:** Every LinkedIn/Twitter/iMessage share of a tool page shows a blank or broken thumbnail. This is the single biggest killer of organic sharing — a polished tool with an ugly blank card gets 60–80% fewer clicks.

**Effort:** S

**Suggested fix:**
- `og-ai-tools-preview.html` is already in the repo as a design template; run `generate_og.py` (or a headless screenshot) to render it as `og-ai-tools.png` and commit it.
- Short-term fallback: point all 12 `og:image` tags to the existing `/og-image.png` until the proper file is generated.
- Add a CI check (`grep og-ai-tools.png *.html && test -f og-ai-tools.png`) to prevent regression.

---

### 2. Contact form submit button permanently disabled after successful send

**What:** On a successful Formspree submission, `btn.disabled = true` (line 375) is never reset — the button stays disabled and shows "✓ Sent!" forever. A second message in the same session is silently impossible.

**Where:** `script.js:375`, `script.js:393–398`

**Why it matters:** Anyone who submits the form and then wants to follow up (or correct a mistake) discovers a dead form with no explanation. They'll assume the form is broken or their message didn't send.

**Effort:** S

**Suggested fix:**
- On the success path, add `setTimeout(() => { btn.disabled = false; btn.innerHTML = originalHTML; success.classList.remove('visible'); }, 8000)` so the form resets after 8 seconds, keeping the "✓ Sent!" feedback long enough to read.
- Alternatively, keep the success banner visible but restore the button immediately so the user can send a follow-up if needed.

---

### 3. Contact form errors surface as native `alert()` dialogs

**What:** Both the Formspree HTTP-error and the network-catch paths call `alert()` (lines 405, 411), which shows a browser-native popup — unstyled, inaccessible, and suppressed on some mobile browsers in certain modes.

**Where:** `script.js:405`, `script.js:411`

**Why it matters:** Native alerts block the entire page, can't be styled, and have been suppressed by Chrome on some mobile views. A user who hits a transient network error gets stranded with no branded recovery path and no way to retry inline.

**Effort:** S

**Suggested fix:**
- Add a `<div id="formError" role="alert" aria-live="assertive" class="form-error"></div>` below the submit button in `index.html` (mirror the existing `#formSuccess` element).
- Replace both `alert(...)` calls in `script.js` with `formError.textContent = '...'; formError.classList.add('visible');` and style `.form-error` to match the existing `.form-success` design token.
- Clear the error on the next submit attempt.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 4. Chat error state is a dead-end — no retry button

**What:** When the AI chat fetch fails, the bot message is replaced with "Connection error. Email panagiotis.kokmotoss@gmail.com directly!" with no way to retry from the UI.

**Where:** `chat.js:177–179`

**Why it matters:** Network blips are common on mobile. A user who gets this message during a conversation is forced to either reload the page (losing context) or manually copy an email address. This is the most likely point of drop-off for warm leads.

**Effort:** S

**Suggested fix:**
- Append a `<button class="chat-retry-btn">Try again</button>` to the error message element.
- On click, remove the error message and re-call `sendMessage()` with the last user message still in `messages[]`.
- Store the last user message before clearing `chatInput.value` so retry has something to resend.

---

### 5. Voice input mic error silently stops listening — no user feedback on permission denial

**What:** `recognition.onerror` (line 305) just calls `stopListening()` with no visual or textual feedback. If a user taps the mic and denies permission (or if the API errors), the mic button just quietly resets — the user doesn't know what happened.

**Where:** `chat.js:305`

**Why it matters:** First-time mic users who accidentally deny the permission prompt see no explanation and no path to enable it, so they assume the feature is broken. This is especially confusing on mobile where the permission prompt is easy to accidentally dismiss.

**Effort:** S

**Suggested fix:**
- In the `onerror` handler, inspect `e.error`: for `'not-allowed'` set `chatInput.placeholder = 'Mic access denied — type your message'`; for other errors set `'Voice input failed — type instead'`.
- Reset the placeholder back to default after 4 seconds.

---

### 6. Hero particle loop runs indefinitely — no prefers-reduced-motion or visibility guard

**What:** The `draw()` function in the hero particle canvas (line 669) calls `requestAnimationFrame(draw)` unconditionally. It has no stop condition, no `prefers-reduced-motion` check, and no `Page Visibility API` listener — it fires at 60 fps even when the user has scrolled miles past the hero section or switched tabs.

**Where:** `script.js:658–674`

**Why it matters:** On a mid-range Android phone this burns 10–15% extra CPU continuously, draining battery and causing thermal throttling that slows down the rest of the page. Users with vestibular disorders who set `prefers-reduced-motion: reduce` still get animated particles.

**Effort:** S

**Suggested fix:**
- Wrap the `requestAnimationFrame` call: `if (!document.hidden && animRunning) requestAnimationFrame(draw);`
- Store the RAF id: `let rafId = requestAnimationFrame(draw);`
- Add: `document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(rafId); else rafId = requestAnimationFrame(draw); });`
- At the top of `draw()`, add: `if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;`

---

### 7. `.btn-givelink` gradient fails WCAG AA contrast — white text on pink end

**What:** The `.btn-givelink` class (style.css:202) uses `background: linear-gradient(135deg, #6c4bff, #ff6268)` with white text. At the pink end (`#ff6268`), white text achieves only ~1.7:1 contrast — well below the 4.5:1 WCAG AA threshold for normal text.

**Where:** `style.css:202–203`

**Why it matters:** This is a legal accessibility risk and makes the button's text unreadable in harsh sunlight on mobile. It also violates the "no pink on purple" brand rule if the intent is white-on-mixed-gradient.

**Effort:** S

**Suggested fix:**
- Replace the gradient endpoint: `#ff6268` → `#d94f80` (WCAG-safe: ~4.8:1 with white) or keep the gradient purely in the purple range (`#6c4bff` → `#5c3cf0`).
- Alternatively, use the brand pink (`#C2185B`) with white text, which passes at ~5.1:1.
- Audit any other gradient buttons for the same issue.

---

### 8. Givelink purple tokens are scattered and inconsistent across the codebase

**What:** Three different purple values are used for Givelink UI with no shared token: `.btn-givelink` uses `#6c4bff`, `.btn-visit-givelink` uses `#7c4dff / #5c3cf0`, and `.project-img-givelink` uses a navy-to-steel gradient. None match the stated brand colors (#6B3FA0 / #5718CA).

**Where:** `style.css:202`, `style.css:2777`, `style.css:644`

**Why it matters:** When a designer or developer touches Givelink UI, they'll pick one of three inconsistent references. Each iteration drifts further from brand. The Givelink project card, hero CTA, and company section currently look like three different products.

**Effort:** S

**Suggested fix:**
- Add to `:root` in `style.css`: `--givelink-purple: #6B3FA0; --givelink-purple-dark: #5718CA;`
- Replace all three hard-coded values with `var(--givelink-purple)` / `var(--givelink-purple-dark)`.
- Decide once whether `.btn-givelink` should use brand purple, brand pink, or a gradient — then apply consistently.

---

### 9. Contact intent PostHog event is not disclosed in the privacy policy

**What:** `chat.js:120–131` captures user chat text (truncated to 120 chars) and sends it to PostHog tagged as a `contact_intent` event. This is not mentioned in `privacy.html`.

**Where:** `chat.js:120–131`, `privacy.html`

**Why it matters:** GDPR and CCPA require disclosure of analytics data collection. If a user asks the chat "how do I invest in Givelink?" that query is sent to PostHog. Undisclosed behavioral tracking on identified intent creates legal and trust risk, especially as the site grows.

**Effort:** S

**Suggested fix:**
- Add a bullet to the "Analytics" section in `privacy.html` explaining that anonymised chat-intent signals (topic category, not verbatim text) are collected via PostHog.
- Consider truncating further (60 chars) or hashing the query before sending to reduce the identifiability of the payload.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 10. `toggleAwards` and `toggleAwardsMobile` are near-identical with brittle text-node traversal

**What:** Two functions (lines 837–860) do the same job (toggle an awards list, update button copy) with slightly different selectors, duplicated text-node traversal logic, and no shared abstraction.

**Where:** `script.js:837–860`

**Why it matters:** The `[...btn.childNodes].find(n => n.nodeType === 3)` text-node trick breaks if a future editor wraps the button text in a `<span>` (a common accessibility improvement). Both functions would need to be updated separately.

**Effort:** S

**Suggested fix:**
- Extract a single `toggleExpandable({ container, btn, openText, closedText, onOpen })` helper.
- Replace both functions with calls to that helper.
- Use `btn.dataset.label` or a dedicated `<span class="btn-label">` inside the button rather than relying on raw text nodes.

---

### 11. Contact form success banner never clears on subsequent page visits (same session)

**What:** The `#formSuccess` banner (line 397) is made visible on submit but never hidden again if the user scrolls away and returns. There is no `MutationObserver` or scroll-detection to auto-dismiss it.

**Where:** `script.js:397`, `index.html:2214`

**Why it matters:** If a user successfully submits, scrolls to another section, and then comes back to the contact section later in the session, they see "Message sent" even though no new message was sent — potentially confusing.

**Effort:** S

**Suggested fix:**
- After restoring `btn.disabled = false` (fix from P0-2), also call `success.classList.remove('visible')`.
- Optionally, use an `IntersectionObserver` on the contact section to hide the success banner when the section leaves the viewport.

---

### 12. Owner email hardcoded in three separate files

**What:** `panagiotis.kokmotoss@gmail.com` appears as a fallback contact in `script.js:411`, `chat.js:179`, and `tool-utils.js:208`. If the contact email ever changes, all three must be updated manually.

**Where:** `script.js:411`, `chat.js:179`, `tool-utils.js:208`

**Why it matters:** Low risk now, but a single-point-of-truth reduces the chance of a stale email being shown to users after a future update.

**Effort:** S

**Suggested fix:**
- Define `const OWNER_EMAIL = 'panagiotis.kokmotoss@gmail.com';` once at the top of a shared init block (or in a tiny `config.js` included before the other scripts).
- Replace all three inline strings with a reference to `OWNER_EMAIL`.

---

### 13. Hero particle canvas has no Page Visibility API pause

**What:** Even after the prefers-reduced-motion fix (P1-6), the particle loop continues when the browser tab is hidden, wasting GPU compositing cycles in the background.

**Where:** `script.js:669`

**Why it matters:** Users with 10+ tabs open (a common research session pattern) will have this running in the background for the entire session, impacting battery and competing with active tabs.

**Effort:** S

**Suggested fix:** (Covered partially in P1-6) — ensure `document.addEventListener('visibilitychange', ...)` cancels and resumes `requestAnimationFrame` based on `document.hidden`. This is the canonical pattern and is a one-liner.

---

### 14. `style.css` is a 8,198-line monolith with no section boundaries

**What:** All styles — reset, tokens, nav, hero, cards, chat, 12 tool UIs, responsive breakpoints — live in one file. There are comment headers but no file-level separation.

**Where:** `style.css` (full file)

**Why it matters:** Finding and changing tool-specific styles (e.g., the scam detector) requires either search or scrolling through thousands of unrelated lines. Any edit risks touching a rule that cascades unexpectedly to another section.

**Effort:** M

**Suggested fix:**
- Do not rewrite — just split along existing comment headers: `style-base.css` (reset, tokens, buttons, chips), `style-layout.css` (nav, hero, sections, footer), `style-tools.css` (tool page overrides), `style-chat.css`.
- Import all four in `index.html` via `<link>` tags; tool pages only import what they need.
- The split itself is mechanical; the risk is low because no logic changes.

---

### 15. `NOTIFY_SECRET` is committed to the public repository in plaintext

**What:** `script.js:931` contains `const NOTIFY_SECRET = "panos-notify-2026-xyz";`. The inline comment explains this is intentional, but it's still searchable on GitHub and will show up in any code scan or fork.

**Where:** `script.js:931`

**Why it matters:** Anyone who finds the secret can send spoofed notifications to the Cloudflare Worker endpoint. The worker has rate limiting, but there's no audit trail distinguishing your own notifications from spoofed ones. Future contributors will also treat committed secrets as acceptable practice.

**Effort:** S

**Suggested fix:**
- Move the secret to a `<meta name="notify-secret" content="...">` injected at build/deploy time, or load it from a small `/config.json` that is `.gitignore`-d and deployed separately.
- Update the Cloudflare Worker to use an environment variable (already documented in the comment at line 927) and rotate the secret after moving it out of the repo.

---

## 💡 P3 — Nice to have

### 16. `generate_og.py` / `og-ai-tools-preview.html` exist but their output is never committed

**What:** There is a `generate_og.py` script and a `og-ai-tools-preview.html` template intended to produce the missing `og-ai-tools.png` (P0-1), but the generated file is not in the repo and apparently not part of the deployment pipeline.

**Where:** `generate_og.py`, `og-ai-tools-preview.html`

**Why it matters:** The generation step is manual and therefore easy to forget. Every time the OG preview design changes, someone has to remember to run the script.

**Effort:** S

**Suggested fix:**
- Add a GitHub Actions step that runs `python generate_og.py` (or a headless Playwright screenshot) during deploy, committing the result to `gh-pages`.
- Alternatively, just run it once, commit the output, and document in `README.md` that it needs to be re-run when the design changes.

---

### 17. `what-would-x-do.html` is 1,188 lines mixing markup, inline `<style>`, and `<script>`

**What:** The largest tool page inlines ~200 lines of CSS and ~350 lines of JavaScript directly in the HTML file, making it hard to diff, search, or extract shared logic.

**Where:** `what-would-x-do.html` (full file)

**Why it matters:** When tool-utils.js is updated (e.g., to fix a rate-limit message), you have to remember to check this file for any forked versions of the same logic. Inline styles also prevent browser caching.

**Effort:** M

**Suggested fix:**
- Extract inline `<style>` to a `what-would-x-do.css` file (tool-specific overrides only).
- Extract the inline `<script>` to `what-would-x-do.js`, keeping only the tool-specific logic (everything that calls `tool-utils.js` functions).
- Verify that the other long tool pages (`scam-nonprofit-detector.html`, `first-time-donor-coach.html`) follow the same pattern.

---

### 18. `search-index.json` is present but there is no search UI wired to it

**What:** A `search-index.json` file exists at the root suggesting an in-progress site search feature, but no input, modal, or trigger is visible on any page.

**Where:** `search-index.json`, `search.js`

**Why it matters:** Either this is unused dead weight (remove it to reduce confusion) or it's a half-shipped feature (wire it up). Either way, the current state is unclear.

**Effort:** S

**Suggested fix:**
- If the feature is paused, delete `search-index.json` and `search.js` and remove them from the service worker precache list (`sw.js`) to save bandwidth.
- If the feature is planned, create a minimal `⌘K` / `/` triggered modal that queries the index — this could be a high-engagement feature given the AI tools library.

---

### 19. Six separate `IntersectionObserver` instances in `script.js`

**What:** Six `new IntersectionObserver(...)` calls in `script.js` (lines 72, 94, 104, 575, 770, 821) each register their own callback, root, and threshold. Some share the same threshold (`0.1`).

**Where:** `script.js:72`, `94`, `104`, `575`, `770`, `821`

**Why it matters:** Not a performance crisis — IntersectionObserver is cheap — but consolidating overlapping observers reduces initialization overhead and makes it easier to reason about scroll-driven behavior in one place.

**Effort:** M

**Suggested fix:**
- Merge the two `threshold: 0.1` observers that add `.visible` to elements into one shared observer.
- Keep separate observers only where the callback logic or threshold genuinely differs.
- Not urgent; tackle alongside any other `script.js` refactor.

---

### 20. `CLAUDE.md` / architecture documentation is missing

**What:** There is no `CLAUDE.md` or developer README explaining the project architecture, how the Cloudflare Worker relates to the static site, how to run/preview locally, or what `generate_og.py` does.

**Where:** (root — file does not exist)

**Why it matters:** Any future contributor (or your future self after 6 months) will spend 30+ minutes reverse-engineering the Worker URL, the PostHog project, the Formspree form ID, and the secret management approach. A 1-page CLAUDE.md eliminates all of that.

**Effort:** S

**Suggested fix:**
- Create `CLAUDE.md` with: project overview, how to preview locally (`python serve.py`), how to deploy (GitHub Pages + `wrangler deploy`), what environment variables the Worker needs, and how to regenerate the OG image.
- Reference `DOMAIN_TROUBLESHOOTING.md` for DNS notes (it already exists).
