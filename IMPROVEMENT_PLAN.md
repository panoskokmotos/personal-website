# Givelink / panoskokmotos.com — Improvement Plan

Scope note: this repo is the personal site for Panos Kokmotos ("Founder @ Givelink"), not the Givelink product itself (that lives at givelink.app, outside this repo). It's a static HTML/CSS/JS site with ~17 AI-powered "tool" pages sharing `tool-utils.js`, backed by `cloudflare-worker.js`. There is no Stripe/checkout flow and no `/docs` PostHog export in this repo — those parts of the brief don't apply here, so this plan is grounded in what's actually in the codebase. The repo's real brand palette (defined in `style.css:8-33` and the `[data-theme="light"]` override at `style.css:901-916`) is **dark navy + blue `#3b6ef8` + gold `#f4a924`**, not purple/pink — the brand-consistency section below is reframed around the tokens that actually exist.

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. AI tool failures are reported to users as successful answers
- **What**: When the Anthropic API call fails (rate limit, auth error, overload), the Worker still returns HTTP 200 with a generic fallback string, so the UI shows it as a normal AI reply.
- **Where**: `cloudflare-worker.js:393-394, 448-449, 492-493, 528-529` — `await response.json()` is called with no `response.ok` check on any of the 4 Claude-calling routes.
- **Why it matters**: Every tool page (donation tax estimator, charity comparison, scam detector, etc.) silently degrades to "Sorry, I had trouble responding" with zero signal that anything broke — users can't tell a real (if bland) AI answer from a failure, and there's no retry prompt.
- **Effort**: S
- **Suggested fix**:
  - Check `response.ok` before `.json()`; on failure return a distinct `{ error: true, ... }` shape with a non-200 status.
  - Have the client (`tool-utils.js` `callWorker`/`_callWorkerFallback`) branch on that and show the existing `showError()` UI instead of rendering it as a result.

### 2. "Email me this result" shows a fake success message on failure
- **What**: The email-capture button sets its text to "✓ Sent!" unconditionally after `fetch()` resolves, without checking the response status.
- **Where**: `tool-utils.js:749-754` (`_injectEmailCapture`, the `fetch('.../email-result', ...)` call).
- **Why it matters**: A 400 (bad email) or 500 (mail provider failure) from the worker still shows "Sent!" — users believe they'll get an email that never arrives, with no way to know to retry.
- **Effort**: S
- **Suggested fix**:
  - Capture the `fetch` response, check `res.ok` before setting the success text; on failure reuse the existing `catch` branch's "Failed — try again" text.

### 3. Unguarded `localStorage` read can break page init in private/blocked-storage browsing
- **What**: `_renderUsageCount()` calls `localStorage.getItem(key)` with no try/catch, unlike the nearly identical guarded pattern elsewhere in the same file.
- **Where**: `tool-utils.js:517` (compare to the guarded version at `tool-utils.js:233`).
- **Why it matters**: In Safari private browsing or storage-blocked contexts this throws inside the `DOMContentLoaded` handler that also wires up related-tools rendering and autosave (`tool-utils.js:1298-1312`) — depending on call order, one thrown error here can silently abort the rest of page init on every tool page.
- **Effort**: S
- **Suggested fix**: Wrap the `localStorage.getItem` call in try/catch (mirror `tool-utils.js:233`), default to `0` on failure.

### 4. Streaming AI responses can hang the UI forever with no timeout
- **What**: The `callWorker` streaming reader loop (`while (true) { await reader.read() }`) has no `AbortController`/timeout, so a stalled upstream stream leaves the page stuck in "loading" indefinitely.
- **Where**: `tool-utils.js:121-184`.
- **Why it matters**: If the Worker's connection to Anthropic hangs without sending a `done` event, `setLoading(false)` in the caller's `finally` never runs — the user sees a permanent spinner with no way to recover except reloading.
- **Effort**: S
- **Suggested fix**:
  - Wire an `AbortController` with a ~30-45s timeout into the `fetch()` call; on abort, fall back to the non-streaming path or show a "this is taking longer than expected" error.

### 5. Charity comparison tool visibly corrupts its own UI mid-render
- **What**: When comparing two causes, the streaming call for cause A progressively renders into `#resultBody`, then a second `Promise.all`-resolved render stomps the whole `innerHTML` to lay out the two-column grid — A's streamed text flashes and gets discarded.
- **Where**: `charity-comparison-engine.html:272-294`.
- **Why it matters**: Users watch column A "finish," then watch it disappear and get replaced — looks broken/buggy, and wastes the streaming work already done for A.
- **Effort**: M
- **Suggested fix**:
  - Render both columns into pre-allocated placeholder containers from the start (skeleton for B) instead of building the side-by-side grid only after both promises resolve.

---

## ⚡ P1 — High ROI (UX friction blocking conversion/trust)

### 6. Donation Tax Estimator uses two-year-stale hardcoded tax brackets with no actual math
- **What**: The entire "tax savings" calculation is LLM prose generated from a prompt that hardcodes 2024 US/Greek tax brackets and standard deductions as plain text — there's no client-side arithmetic, and the data is now outdated.
- **Where**: `donation-tax-estimator.html:348-350` (2024 US brackets: "10% up to $11,600...") and `:383` (Greek brackets), fed into `callWorker()` at `donation-tax-estimator.html:405`.
- **Why it matters**: This is a financial-advice tool with the site's name on it; outdated brackets mean wrong dollar figures are being told to real donors making real giving decisions, and there's zero way to verify the LLM didn't also misapply the bracket math in its prose.
- **Effort**: M
- **Suggested fix**:
  - Move bracket data to a small JS constants object, compute the actual marginal-rate/savings numbers in JS, and use the LLM only for the narrative explanation around a number you already know is correct.
  - Update the bracket constants for the current tax year as part of the fix.

### 7. Loading states give screen-reader users no feedback that anything is happening
- **What**: The shared `.tool-loading` spinner/text block has no `aria-live`/`role="status"`, so assistive tech never announces "calculating…" or that a result arrived.
- **Where**: `donation-tax-estimator.html:202-205` (representative instance of the shared `tool-utils.js` scaffold used on all ~17 tool pages).
- **Why it matters**: A screen-reader user submits a tool form and gets total silence until they manually re-discover the result region — on AI tools that can take several seconds, this reads as broken.
- **Effort**: S
- **Suggested fix**: Add `aria-live="polite" role="status"` to the shared `.tool-loading` container once in the markup/template used across tool pages.

### 8. Copy/Share buttons are below mobile touch-target minimums on every tool result
- **What**: `.tool-copy-btn` and `.tool-share-link`/`.tool-share-x` compute to roughly 24-30px tall (padding 5-7px + ~0.8rem font), well under the ~44px recommended tap target.
- **Where**: `style.css:5241-5252` (`.tool-copy-btn`), `style.css:6231-6259` (`.tool-share-link` family).
- **Why it matters**: These sit adjacent to each other on the result panel of every one of the ~17 tool pages — on mobile, the highest-traffic surface for this kind of share/copy action, users will routinely mis-tap.
- **Effort**: S
- **Suggested fix**: Bump `min-height`/`padding` on these shared classes to hit ~44px on touch viewports (a `@media (pointer: coarse)` override is enough — no need to resize on desktop).

### 9. Focus indicator on every tool input is a subtle border-color shift, not a visible ring
- **What**: Nine separate `:focus` rules across tool inputs/textareas set `outline: none` and rely solely on `border-color` changing to blue.
- **Where**: `style.css:1966, 2922, 5181, 6902, 6953, 7440, 7704, 7787, 8057` (e.g. `.tool-input:focus` at `5181-5195`).
- **Why it matters**: Keyboard users tabbing through dense multi-field forms (e.g. the tax estimator) get a weak, easy-to-miss focus signal — a real accessibility and usability cost on exactly the pages that require the most form-filling.
- **Effort**: S
- **Suggested fix**: Add a visible `box-shadow`/outline ring on `:focus-visible` for the shared `.tool-input`/`.tool-refine-input`/etc. classes instead of relying on border-color alone.

### 10. Heading hierarchy skips a level in the milestones section
- **What**: "Key Milestones" goes from `<h2>` straight to `<h4>` for all ~9 milestone cards, with no `<h3>` anywhere in the section.
- **Where**: `index.html:1065-1090`.
- **Why it matters**: Breaks heading-based screen-reader navigation and dilutes the section's SEO outline — an easy, zero-risk fix.
- **Effort**: S
- **Suggested fix**: Change the milestone-card headings from `<h4>` to `<h3>` (or insert an intermediate `<h3>` group label) so the hierarchy is sequential.

### 11. "Show all 18 awards" toggle doesn't announce its expanded/collapsed state
- **What**: Unlike the FAQ accordion and TidyCal toggle (both correctly use `aria-expanded`), the awards "show more" button has no `aria-expanded` attribute despite doing the same job.
- **Where**: `index.html:1738-1740` (`#awardsShowMore`), compare to the correct pattern at `index.html:2139, 2143, 2065`.
- **Why it matters**: Inconsistent with the site's own established a11y pattern — assistive-tech users get no indication the button toggles content.
- **Effort**: S
- **Suggested fix**: Add `aria-expanded="false"` and toggle it in `toggleAwards()`, matching the FAQ accordion's existing pattern.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 12. Loading/error/escapeHtml/markdown helpers reimplemented locally in the two largest tool pages
- **What**: `tool-utils.js:275` explicitly notes "complex tools override with local versions" — `what-would-x-do.html:1046-1064` and `why-should-i-give.html:608-630` both hand-roll their own `setLoading`/`showError`/`escapeHtml`, and `why-should-i-give.html:632-644` defines three local markdown formatters duplicating `tool-utils.js:222-226`'s `formatMarkdown`.
- **Why it matters**: Any future change to loading/error UX (e.g. fix #7's `aria-live` addition) has to be made in 3+ places by hand, and these two pages will silently drift from the shared behavior.
- **Effort**: M
- **Suggested fix**:
  - Extend the shared `setLoading`/`showError`/`formatMarkdown` to support whatever these two pages needed a local override for, then delete the local copies.

### 13. Copy-to-clipboard hand-rolled 4 times despite a shared helper existing
- **What**: `tool-utils.js:400-409` provides `initCopyBtn()` (correctly used by simpler tools like `donation-tax-estimator.html:415`), but `what-would-x-do.html:951-955`, `why-should-i-give.html:581-586`, `volunteer-match.html:342-348`, and `impact-story-generator.html:374-380` each reimplement `navigator.clipboard.writeText(...)` inline.
- **Why it matters**: Four extra copies of the same ~5-line block to keep in sync (e.g. for the "copied!" feedback state or error handling) for no functional gain.
- **Effort**: S
- **Suggested fix**: Extend `initCopyBtn()` to accept a target-selector/content-getter param, swap all 4 call sites over.

### 14. No shared form-submit wrapper — 12 pages hand-roll the same submit→loading→fetch→error→finally skeleton
- **What**: Every tool page wires its own near-identical `form.addEventListener('submit', ...)` handler with the same try/catch/finally shape.
- **Where**: `nonprofit-health-checker.html:198`, `community-needs-map.html:197`, `impact-story-generator.html:274`, `why-should-i-give.html:264`, `what-can-i-donate.html:225`, `first-time-donor-coach.html:244`, `neighborhood-giving-map.html:203`, `scam-nonprofit-detector.html:269`, `volunteer-match.html:272`, `charity-comparison-engine.html:212`, `donation-tax-estimator.html:325`, `what-would-x-do.html:634`.
- **Why it matters**: Every new tool page means copy-pasting this skeleton again; bug fixes to the pattern (like #1's worker error handling) require touching all 12 files instead of one.
- **Effort**: M
- **Suggested fix**: Introduce a shared `initToolForm(formEl, handler)` wrapper in `tool-utils.js` that owns the loading/error/finally plumbing, and migrate pages incrementally.

### 15. Hardcoded notification secret duplicated across two client-side files
- **What**: `TOOL_NOTIFY_SECRET`/`NOTIFY_SECRET` is hardcoded plaintext in both `tool-utils.js:11` and `script.js:931`, manually kept in sync with the Worker's `NOTIFY_SECRET` env var; mismatches fail silently (`.catch(() => {})`).
- **Why it matters**: Provides no real protection (it's visible to anyone viewing source) and a future typo in either copy silently breaks all `/notify` calls with no error surfaced anywhere.
- **Effort**: S
- **Suggested fix**: Either drop the shared-secret pretense (it's not protecting anything meaningful client-side) or move the check fully server-side and stop shipping it in JS; at minimum, define it once and import/reference rather than duplicating the literal.

### 16. Zero test coverage on the three highest-stakes logic paths
- **What**: No test framework/files anywhere in the repo (confirmed: no `*.test.js`, `/tests`, jest/vitest/playwright config). The riskiest untested logic: the tax estimator's bracket math (see #6), `chat.js`'s `sendMessage()`/intent detection, and `search.js`'s `runSearch()`/`scoreEntry()` ranking.
- **Why it matters**: These are the three places a silent regression would be hardest to notice and most damaging to user trust.
- **Effort**: S to start (a minimal `node --test` smoke harness for pure functions like bracket math and `scoreEntry`), L for fuller coverage.
- **Suggested fix**: Start with the tax-bracket math once it's extracted to JS (#6) — that's the highest-value, easiest-to-test unit.

### 17. `style.css` is an 8,198-line monolith with a real class-name collision between two tools
- **What**: Only ~9% of the file is cleanly attributable to a single tool; most tool-specific CSS is interleaved into chronological "Phase N feature batch" sections covering multiple unrelated tools at once. Two different tools share the same `cmp-` prefix (`scam-nonprofit-detector.html` and `charity-comparison-engine.html` both use `.cmp-col`/`.cmp-grid`/`.cmp-toggle-btn`, e.g. `style.css:7547`), and two tools (`community-needs-map.html`, `neighborhood-giving-map.html`) use no tool-specific prefix at all.
- **Why it matters**: Finding "all the CSS for tool X" requires searching scattered Phase blocks; the `cmp-` collision is a live footgun — a style change intended for one comparison-style tool can silently affect the other.
- **Effort**: M to add consistent per-tool prefixes/headers and resolve the `cmp-` collision now; L if you want a full per-tool file split.
- **Suggested fix**:
  - Rename one of the two `cmp-` tools to a unique prefix immediately (cheapest fix with real risk reduction).
  - Add prefixes to the two unprefixed map tools.

---

## 💡 P3 — Nice to have

### 18. Untokenized purple accent family used 25+ times with no CSS variable backing it
- **What**: A purple/violet family (`#7c3aed`, `#a78bfa`, `#c084fc`, `#a855f7`) is reused consistently across ~25+ rules for AI/nonprofit chip and gradient styling (e.g. `style.css:356, 385, 1543, 6322, 7483, 7490, 7495, 7955, 7961`; `ai-tools.html:455, 746`), alongside three inconsistent "success green" shades (`#22c55e`, `#4ade80`, `#10b981`) and two "warning amber" shades (`#fbbf24`, `#f59e0b`) used interchangeably for the same semantic role.
- **Why it matters**: Not a brand violation (the site has no purple/pink rule — its real tokens are navy/blue/gold), but it's a fourth color family that's clearly intentional and reused, just never promoted to a `:root` token — makes it easy for the next purple/success/warning usage to pick a 5th slightly-different shade.
- **Effort**: S
- **Suggested fix**: Add `--purple-accent`, `--success`, `--warning` custom properties matching the most-used existing shade of each, and swap the literal hex values over opportunistically.

### 19. A few small, low-risk cleanup items
- **What**:
  - Dead conditional `if (!window._lastShownErr)` at `tool-utils.js:1288` — `window._lastShownErr` is never set anywhere, so the condition is always true (harmless today, but signals incomplete error-suppression logic someone may build on by mistake).
  - One non-HTTPS external link: `index.html:1788` (`href="http://patrasevents.gr/..."`) — the only `http://` link on an otherwise all-HTTPS site.
  - Dead `dns-prefetch` for `esm.sh` at `index.html:65` — nothing on the site loads from there.
- **Why it matters**: Low impact individually, but each is a one-line fix that removes a small bit of confusion for the next person reading this code.
- **Effort**: S
- **Suggested fix**: Fix all three in one small cleanup pass.

### 20. Verify two external links that may be genuinely dead (not just bot-blocked)
- **What**: `scripts/check_links.py` flags `https://pitchbook.com/profiles/company/703792-90` (`index.html:1198, 1446`, also in JSON-LD at `:168, 194`) and `https://www.startupuniverse.eu/` (`index.html:1244`) as unreachable. LinkedIn and Pitchbook both commonly block automated checkers, so those are likely false positives — but `startupuniverse.eu` references a 2021-22 past employer and is plausibly a genuinely lapsed domain.
- **Why it matters**: A dead link in the press/experience section undercuts credibility on a site whose whole pitch is professional credibility.
- **Effort**: S
- **Suggested fix**: Manually visit `startupuniverse.eu` in a browser; if it's truly dead, replace the link with an archive.org snapshot or remove it.
