# Givelink Personal Website — Improvement Plan

> Audited: 2026-05-14 · Files scanned: `script.js`, `tool-utils.js`, `chat.js`, `cloudflare-worker.js`, `sw.js`, `style.css`, `index.html`, all 24 HTML pages  
> Total: 20 items, capped at highest leverage. Ordered within each tier by ROI.

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. In-memory rate limiter resets on every Cloudflare cold start
- **What**: The Worker's rate-limit map lives in JavaScript memory and is lost on cold start, giving every newly-warmed instance a clean slate — meaning a determined caller can exhaust the Anthropic API key.
- **Where**: `cloudflare-worker.js:104–124`
- **Why it matters**: Direct financial exposure — cold starts on Cloudflare are frequent. An attacker who triggers many simultaneous requests can always hit a fresh instance with a full quota.
- **Effort**: M
- **Suggested fix**:
  - Add a Cloudflare KV namespace (e.g. `RATE_STORE`) and replace the in-memory `Map` with KV reads/writes keyed on IP + current hour bucket.
  - Alternatively, use a Durable Object for atomic counter increments.
  - At minimum add a `Retry-After: 3600` header to the 429 response so browsers back off automatically.

---

### 2. Streaming fetch has no timeout — hangs indefinitely on slow/dropped connections
- **What**: `callWorker()` opens a streaming fetch with no `AbortController` timeout. If the network stalls mid-stream, the user sees a loading skeleton forever with no way to recover short of a page refresh.
- **Where**: `tool-utils.js:117–185` (primary); `_callWorkerFallback` at `tool-utils.js:187–203` also has no timeout.
- **Why it matters**: On mobile or flaky connections this is the most common failure mode. Users assume the tool is broken and leave.
- **Effort**: S
- **Suggested fix**:
  - Wrap both fetch calls with an `AbortController` and `setTimeout(..., 30_000)`.
  - On timeout, call `controller.abort()` and surface the classified error (see item 3 below).
  - Show "Taking longer than expected — check your connection" copy after 10 s via the existing `loadingText` element.

---

### 3. `_classifyError` is dead code — every error shows the same generic message
- **What**: A well-written `_classifyError(err, status)` function distinguishes offline / 429 / 503 / generic errors with tailored messages, but it is never called anywhere. All catch blocks either silently swallow the error or call `showError('Something went wrong. Please try again.')`.
- **Where**: `tool-utils.js:1649–1656` (definition); none of the catch blocks in `_injectRefineInput` (line 701), `_injectGoDeeperBtn` (line 1287), `_injectImpactCalculator` (line 1544), or `_injectFollowUpChat` (line 1081) call it.
- **Why it matters**: Offline users get "Something went wrong" instead of "You're offline — showing your last saved result" (which the offline restore logic is already built to handle). Rate-limited users see a generic message even though a countdown timer is implemented. Functionality exists; it just isn't wired up.
- **Effort**: S
- **Suggested fix**:
  - In each catch block that receives an HTTP response, call `_classifyError(err, res?.status)` and pass the result to `showError()`.
  - Remove the duplicate ad-hoc rate-limit handling in `_showRateLimitError` (line 205) since `_classifyError` replaces it for the 429 case.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 4. Contact form errors show native `alert()` dialogs
- **What**: On network error or non-OK response the contact form calls `alert('Something went wrong...')` — a browser-native dialog that looks broken and kills the page's polished feel.
- **Where**: `script.js:405`, `script.js:411`
- **Why it matters**: The contact section is the primary conversion goal of the site. A jarring alert on failure undercuts trust right at the moment of highest intent. The form already renders a `#formSuccess` element for the happy path but has no inline error element for failures.
- **Effort**: S
- **Suggested fix**:
  - Add a `<p id="formError" class="form-error" aria-live="polite"></p>` beneath the submit button in `index.html`.
  - Replace both `alert()` calls with `formError.textContent = '...'` + `formError.classList.add('visible')`.
  - Clear the error on next submission attempt.

---

### 5. Freshness badge displays "Data: 2024" — it is 2026
- **What**: The badge injected by `_injectFreshnessBadge()` reads "Data: 2024" with a tooltip claiming "Tax data and regulations current as of 2024."
- **Where**: `tool-utils.js:1560–1561`
- **Why it matters**: This badge appears on `/donation-tax-estimator.html`, `/nonprofit-health-checker.html`, and `/scam-nonprofit-detector.html` — exactly the pages where legal/financial accuracy is most scrutinised. A two-year-stale badge actively undermines trust at the decision point.
- **Effort**: S (tiny code change, but verify the underlying data/prompt is actually current)
- **Suggested fix**:
  - Replace the hardcoded `'Data: 2024'` string with a computed value: `` `Data: ${new Date().getFullYear()}` ``.
  - Update the system prompt in the Cloudflare Worker to reference current tax year regulations so the badge claim is accurate.
  - Consider linking the badge to a "methodology" anchor explaining data sources.

---

### 6. `/donation-tax-estimator.html` is absent from `_RELATED_TOOLS` and `_JOURNEY_MAP`
- **What**: The tax estimator page exists and is precached in the service worker, but has no entry in either cross-tool map. Users who land on it see zero related-tool suggestions and no next-step journey CTA.
- **Where**: `tool-utils.js:15–86` (`_RELATED_TOOLS`), `tool-utils.js:764–796` (`_JOURNEY_MAP`)
- **Why it matters**: The tax estimator is a natural entry point for first-time donors researching giving decisions. With no onward journey, conversion into the broader tool funnel is zero from that page.
- **Effort**: S
- **Suggested fix**:
  - Add a `_RELATED_TOOLS` entry linking to `/nonprofit-health-checker.html`, `/charity-comparison-engine.html`, and `/first-time-donor-coach.html`.
  - Add a `_JOURNEY_MAP` entry: `{ url: '/first-time-donor-coach.html', icon: '🧭', text: 'Ready to give? Build your giving plan →' }`.
  - Add a `_USAGE_SEEDS['/donation-tax-estimator.html']` seed count to initialise the social proof counter.

---

### 7. Two competing `IntersectionObserver`s both mutate the same nav links
- **What**: `script.js:101–114` sets `a.style.color = '#fff'` on active nav links (using selector `.nav-links a`). `script.js:766–780` adds class `.active` to the same elements (selector `.nav-link`). Both observers run simultaneously on the same DOM nodes, with different thresholds (0.4 vs 0.3) causing them to disagree about which section is active.
- **Where**: `script.js:101–114` and `script.js:766–780`
- **Why it matters**: Inline `style` has higher specificity than any class rule, so the first observer's `style.color` overrides whatever `.active` CSS declares. This can produce flicker and unpredictable states, especially during fast scrolling.
- **Effort**: S
- **Suggested fix**:
  - Delete the first observer block (lines 101–114) entirely — it is superseded by the second.
  - Confirm the `.active` CSS rule in `style.css` covers the desired highlight colour; add `color: #fff` there if needed.
  - Align threshold to 0.4 (the value that matched viewport centre better).

---

### 8. Print popup injects AI-generated `innerHTML` via `document.write` without sanitisation
- **What**: `_injectPrintBtn()` opens a new window and calls `win.document.write(...)` embedding `body.innerHTML` directly, which contains formatted HTML generated via `formatMarkdown()`. If the AI response ever includes `</style>` or `</script>` sequences, the print document's layout breaks.
- **Where**: `tool-utils.js:933–950`
- **Why it matters**: `formatMarkdown` only handles `**bold**` and newlines — any other HTML in the AI response passes through as-is. The feature will silently produce malformed print documents without any user feedback. This is also a latent XSS vector if ever extended to user-supplied content.
- **Effort**: S
- **Suggested fix**:
  - Use `body.innerText` (plain text) instead of `body.innerHTML` for the print content; wrap it in a `<pre style="white-space:pre-wrap">` or apply the same `formatMarkdown()` transform freshly on the plain text.
  - Alternatively, open a `<details>` print view inside the same page and use `window.print()` with a `@media print` CSS rule — avoids cross-origin popup issues entirely.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 9. Two competing drag-scroll implementations attached to the same `.logos-strip-wrap` element
- **What**: `script.js:120–150` implements drag-to-scroll using `wrap.scrollLeft`. `script.js:862–922` implements a second, more sophisticated version using CSS transform manipulation. Both attach `mousedown`, `mousemove`, `mouseup`, and `touch*` listeners to the same elements.
- **Where**: `script.js:120–150` (first impl), `script.js:862–922` (second impl)
- **Why it matters**: Both event handlers fire on every interaction. The second implementation correctly manages the CSS animation state; the first counteracts it by also mutating `scrollLeft`. Results in jittery drag behaviour and double-handling of all pointer events.
- **Effort**: S
- **Suggested fix**:
  - Delete the first implementation (lines 120–150) — it is fully superseded.
  - Verify the marquee resumes correctly after drag-end on the second implementation (test on mobile).

---

### 10. `_injectExplainTooltips` accumulates `document` click listeners on every result re-render
- **What**: Each call to `_injectExplainTooltips()` (which is called by `_injectResultExtras()` on every result show, refine, and "Go Deeper" action) adds `document.addEventListener('click', ...)` with `{ once: false }` for each heading in the result body. These listeners are never removed.
- **Where**: `tool-utils.js:1466–1508` (specifically line 1504)
- **Why it matters**: A user who runs three refinements on a result with five headings has added 15 extra click listeners to `document`. Each one checks DOM state on every document click. On long sessions this accumulates into measurable overhead.
- **Effort**: S
- **Suggested fix**:
  - Change to `{ once: true }` since the tooltip is already removed on the next click anyway.
  - Or store a single delegated listener on the `resultBody` container that checks `tip` state — replacing per-heading listeners with one.

---

### 11. `_lastResultHTML` / `_lastResultText` are module-level mutable globals shared across concurrent refines
- **What**: The undo state for "Refine →" is stored in two module-level `let` variables (`_lastResultHTML`, `_lastResultText` at lines 1094–1095). If a user triggers two rapid refine requests (or if a refine fires while a "Go Deeper" is in progress), the second overwrites the undo state for the first.
- **Where**: `tool-utils.js:1094–1095`, used at `tool-utils.js:672–674`
- **Why it matters**: The undo button silently restores the wrong content. User loses their previous result without warning.
- **Effort**: S
- **Suggested fix**:
  - Move undo state into a closure local to each `_injectRefineInput()` call (the function already creates its own `wrap` element, so the state can live there).
  - Disable the Refine button while a refine is already in-flight instead of relying on the button's own `disabled` state.

---

### 12. `onclick="useChatStarter(this)"` inline string handlers in `chat.js` require global function scope
- **What**: Chat starter chips and the `clearChat` rebuilt DOM use `setAttribute('onclick', 'useChatStarter(this)')` and `onclick="_closeHistoryDrawer()"` string attributes, forcing `useChatStarter`, `_closeHistoryDrawer`, and `_closeShortcutModal` to be globals on `window`.
- **Where**: `chat.js:105`, `tool-utils.js:851`, `tool-utils.js:1627`
- **Why it matters**: Prevents adding a Content Security Policy (`unsafe-inline` would be required), pollutes the global namespace, and is incompatible with any future ES module migration.
- **Effort**: S
- **Suggested fix**:
  - Replace string-attribute handlers with `addEventListener` calls after DOM creation, or use event delegation on the parent container.
  - Mark the functions as local (remove from global scope) once no inline handler references them.

---

### 13. `tool-utils.js` is 1,681 lines with 23+ unrelated concerns in a single file
- **What**: API calls, streaming, markdown formatting, loading skeletons, history drawer, PWA install, voice input, charity autocomplete, share cards, canvas image generation, keyboard shortcuts, offline cache, and cross-tool journey CTAs all live in one file loaded on every tool page.
- **Where**: `tool-utils.js` (entire file)
- **Why it matters**: Every tool page downloads all 1,681 lines even if it uses only the core API call and `showResult`. Debugging a charity-autocomplete regression requires navigating through 1,500 lines of unrelated code. New contributors have no idea where a feature lives.
- **Effort**: L
- **Suggested fix**:
  - Split into at minimum: `tool-api.js` (callWorker, fallback, formatMarkdown), `tool-extras.js` (inject* features), `tool-autocomplete.js`, `tool-voice.js`.
  - Load `tool-extras.js` deferred; it is non-critical for first render.
  - This is a refactor, not a rewrite — all function signatures stay the same.

---

### 14. Service worker cache name is a hardcoded string with no automated version bump
- **What**: `const CACHE_NAME = 'panos-v4'` in `sw.js`. When CSS or JS assets are updated, users with a cached service worker continue to receive the old `style.css` / `script.js` from cache-first until the cache name is manually incremented.
- **Where**: `sw.js:1`
- **Why it matters**: Every deploy that changes a cached asset requires a manual `sw.js` edit. Miss it once and users see a stale UI until they hard-refresh. This has likely already happened (the name suggests at least four prior bumps).
- **Effort**: S
- **Suggested fix**:
  - Inject the cache name at deploy time using a build script (e.g. `sed -i "s/panos-v[0-9]*/panos-v$(date +%s)/" sw.js` in CI).
  - Or switch to a Workbox-generated service worker that handles versioning automatically.
  - At minimum document that `CACHE_NAME` must be bumped on every deploy that touches `PRECACHE_ASSETS` files.

---

### 15. Rate-limit 429 response is missing `Retry-After` header
- **What**: The `checkRateLimit` function correctly tracks a `resetAt` timestamp, but the 429 response body does not include a `Retry-After` header, so clients cannot determine when to retry.
- **Where**: `cloudflare-worker.js:179–184`
- **Why it matters**: Without `Retry-After`, the frontend's `_showRateLimitError()` timer is just a hardcoded 30-second guess. The actual reset window is 1 hour (line 107). Users are told to "wait 30 seconds" when they actually need to wait up to 60 minutes.
- **Effort**: S (one-liner)
- **Suggested fix**:
  - In the 429 response, compute `const retryAfter = Math.ceil((entry.resetAt - Date.now()) / 1000)` and add `'Retry-After': String(retryAfter)` to the headers.
  - Read this header on the client in `_showRateLimitError()` to initialise the countdown from the actual remaining time.

---

## 💡 P3 — Nice to have

### 16. Book cover fallback uses `innerHTML` where `textContent` is sufficient
- **What**: When a book cover image fails to load, the script sets `img.parentElement.innerHTML = \`<div class="book-cover-fb">${abbr}</div>\`` where `abbr` is derived from the image's `alt` attribute.
- **Where**: `script.js:217`
- **Why it matters**: `innerHTML` replaces the entire parent including any siblings. `abbr` is controlled content (from the HTML author, not user input), but `innerHTML` is unnecessary here and would break if the `.book-card` ever contains other child elements alongside the image.
- **Effort**: S
- **Suggested fix**:
  - Replace the parent's child with a created element using `document.createElement` + `textContent = abbr`, then call `img.replaceWith(el)` so only the image is swapped.

---

### 17. `search.js` and `search-index.json` exist but no search UI is visible
- **What**: A `search.js` file and a `search-index.json` (with content entries) are shipped and precached, but there is no search input or button wired to them in any navigation or page.
- **Where**: `/search.js`, `/search-index.json`, `sw.js:11` (precached)
- **Why it matters**: Dead code costs every user a network request (or cache space) for assets that do nothing. Future contributors will wonder if removing it breaks something.
- **Effort**: S
- **Suggested fix**:
  - Either wire up a search UI (a `<input>` in the navbar triggers `search.js`) — which is a useful feature — or remove both files and their `sw.js` precache entry until ready.

---

### 18. Three lookup maps must be manually synchronised when adding a new tool page
- **What**: Adding a tool requires updating `_RELATED_TOOLS` (line 15), `_JOURNEY_MAP` (line 764), and `_USAGE_SEEDS` (line 74) in `tool-utils.js` independently. Missing any one produces a silent degraded experience (no related tools, no journey CTA, "Used 0 times" counter).
- **Where**: `tool-utils.js:14–86`
- **Why it matters**: `/donation-tax-estimator.html` already proves this happens — it's in `_DEEP_PATHS` and `_FRESHNESS_PATHS` but absent from the other three maps.
- **Effort**: S
- **Suggested fix**:
  - Consolidate into a single `TOOL_REGISTRY` object keyed by path, containing `related`, `journeyNext`, and `usageSeed` properties.
  - A linting check (or simple `Object.keys` assertion at load time) can verify all registered paths have all required fields.

---

### 19. `rateLimitStore` Map is never pruned — memory leaks on long-lived Worker instances
- **What**: `rateLimitStore` entries are only evicted when the same IP makes a new request after its `resetAt` timestamp. IPs that make one request and never return accumulate entries indefinitely in memory.
- **Where**: `cloudflare-worker.js:105–124`
- **Why it matters**: On a Cloudflare Worker that stays warm for hours (e.g. during a traffic spike), the store can grow to tens of thousands of entries. While Cloudflare Workers have a 128 MB memory cap, the real risk is unexpected termination from memory pressure.
- **Effort**: S
- **Suggested fix**:
  - After every `checkRateLimit` call, prune entries where `entry.resetAt < Date.now()` — or limit the Map to the 1,000 most-recent IPs with an LRU eviction strategy.
  - This becomes moot if KV-backed rate limiting (item 1) is implemented.

---

### 20. `_callWorkerFallback` has no request timeout
- **What**: The non-streaming fallback path (`_callWorkerFallback`) used by follow-up chat, refine, explain-tooltips, and impact calculator makes a plain `fetch` with no `AbortController`. This is a separate code path from the streaming `callWorker` fix in item 2.
- **Where**: `tool-utils.js:187–203`
- **Why it matters**: The fallback is triggered on network error from the primary streaming call — exactly the scenario where a timeout is most needed. A stalled fallback leaves the secondary UI elements (follow-up thread, refine, impact calculator) in permanent loading states.
- **Effort**: S
- **Suggested fix**:
  - Extract a shared `fetchWithTimeout(url, options, ms = 30_000)` helper that wraps any `fetch` with `AbortController`.
  - Apply it to `_callWorkerFallback` and all other one-shot `fetch` calls in `tool-utils.js` (lines 244, 749, 1279, 1432, 1493, 1539).
