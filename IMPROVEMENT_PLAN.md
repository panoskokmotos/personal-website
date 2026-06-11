# Givelink Personal Website — Improvement Plan

> Generated 2026-06-11. 16 items across 4 tiers, ordered by ROI within each tier.

---

## 🔥 P0 — Ship this week (bugs breaking user flows)

### 1. Chat API errors swallowed — rate-limited users get no recovery path

- **What**: `chat.js` never checks `res.ok` before parsing JSON, so a 429 response silently falls back to a generic error message with no countdown timer — while `tool-utils.js` correctly shows a 30-second wait indicator for the same endpoint.
- **Where**: `chat.js:160–177`
- **Why it matters**: Any user who asks the chat too many questions sees "Sorry, I had trouble responding" with no explanation or retry guidance. They don't know to wait and assume the widget is broken.
- **Effort**: S
- **Suggested fix**:
  - After `const res = await fetch(...)`, add `if (res.status === 429) { addMessage('bot', "You've been chatting a lot! Wait 30 seconds and try again."); return; }`
  - Mirror the countdown pattern from `tool-utils.js:205–220` or extract it to a shared helper both files call.

---

### 2. `alert()` for contact form errors is suppressible on mobile Chrome

- **What**: Contact form error paths call `alert()` which Chrome for Android can suppress after repeated invocations — the error message silently disappears and the user can't tell why submit failed.
- **Where**: `script.js:405, 411`
- **Why it matters**: A visitor trying to contact Panos on mobile gets a broken form with no error feedback. High-value leads give up.
- **Effort**: S
- **Suggested fix**:
  - Replace both `alert()` calls with an inline error element (a `<div class="form-error">` below the submit button, toggled visible/hidden).
  - A `showFormError(msg)` helper of ~5 lines is enough; mirrors the existing `showError()` pattern in `tool-utils.js:317–322`.

---

### 3. Formspree "success" shown on failed submissions

- **What**: The contact form only checks `res.ok` (HTTP 200) before showing "✓ Sent!". Formspree returns 200 with `{errors: [...]}` when its honeypot or spam filter fires — the form reports success on a submission that was never stored.
- **Where**: `script.js:393–398`; both Formspree endpoints at `index.html:2003, 2189`
- **Why it matters**: Panos gets no notification and the visitor thinks their message was delivered. Silently lost leads.
- **Effort**: S
- **Suggested fix**:
  - After `if (res.ok)`, parse the JSON body and check `if (data.errors?.length)` before showing success.
  - Formspree's error array contains human-readable strings; surface the first one as the form error message.

---

### 4. Hero orbs overflow viewport on narrow mobile, causing horizontal scroll

- **What**: `.hero-orb-1` is hardcoded at `width: 600px; height: 600px` with no mobile override and no `overflow: hidden` on the parent — on screens narrower than ~480px it bleeds 450 px off the right edge, triggering an invisible horizontal scrollbar.
- **Where**: `style.css:349–363`
- **Why it matters**: Horizontal scroll on mobile is a layout defect that disrupts every section below the hero and scores poorly on Core Web Vitals (CLS).
- **Effort**: S
- **Suggested fix**:
  - Add `overflow: hidden` to `.hero` or `.hero-bg`.
  - Optionally add a `@media (max-width: 480px)` block scaling the orbs down to 300/250/150px.

---

## ⚡ P1 — High ROI (UX friction blocking conversion)

### 5. Contact form: zero inline validation, user must guess which field failed

- **What**: Fields only have the `required` attribute; no real-time feedback on invalid email format or empty fields — the only error path is the `alert()` described in P0 #2.
- **Where**: `index.html:2189–2218`, `script.js:370–413`
- **Why it matters**: Every validation error adds a full submit → read alert → close modal → fix → resubmit cycle. On mobile this is especially painful and increases abandonment.
- **Effort**: M
- **Suggested fix**:
  - Add an `invalid` event listener on the email input to show inline error text (`"Please enter a valid email"`) below the field.
  - On submit, loop fields and set `.error` class with a message before calling Formspree — saves a network round-trip for empty submissions.
  - A `<p class="field-error" aria-live="polite">` per field is enough; no library needed.

---

### 6. AI tool pages show blank space for ~2–3 s before response appears

- **What**: On `what-would-x-do.html` (and other tool pages), the result container is hidden until the response arrives. `setLoading(true)` fires but the progress bar only appears if `#loading` is visible — during the API call there's dead whitespace.
- **Where**: `tool-utils.js:276–315`, `what-would-x-do.html:84–120`
- **Why it matters**: Users landing on these tools from social/email click "Submit" and see nothing happen for 2–3 s — the most likely moment to close the tab.
- **Effort**: M
- **Suggested fix**:
  - Show the result container immediately on submit, in a skeleton/placeholder state (grey shimmer lines are a single CSS class).
  - Alternatively, animate a "Thinking…" text into the result area the instant the button is clicked, replacing it with the real response on arrival.

---

### 7. Search shows no feedback during index fetch + 110 ms debounce

- **What**: When the search modal opens for the first time, `loadIndex()` fetches the JSON index over the network. Combined with the 110 ms debounce, there's no visual indication that the search is working.
- **Where**: `search.js:94–96, 136–143`
- **Why it matters**: Users type a query and see the empty-state screen. Some will assume search is broken and close the modal without finding what they came for.
- **Effort**: S
- **Suggested fix**:
  - Add a "Searching…" or spinner class to `#ssResults` inside the debounce callback, before `await loadIndex()`.
  - Clear it once `renderPane()` runs. Three lines of code.

---

### 8. FAQ expand doesn't scroll to bring the answer into view on mobile

- **What**: Clicking a collapsed FAQ item expands it but does not scroll the answer into the viewport — on mobile the expanded text is frequently below the fold.
- **Where**: `index.html:2143–2165` (FAQ accordion markup)
- **Why it matters**: Users expand a question to see the answer, see blank space, think expansion failed or there's no answer, and close it. Defeats the purpose of the FAQ entirely on mobile.
- **Effort**: S
- **Suggested fix**:
  - In the accordion click handler, after adding the `open` class, call `el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` with a ~50 ms delay to let the expand animation begin first.

---

### 9. Proactive chat auto-opens for iPad + keyboard users

- **What**: The proactive chat guard is `pointer: coarse OR width < 768` — an iPad with a Magic Keyboard has a fine pointer and width >768px, so chat auto-opens after 15 s, which feels intrusive on a tablet.
- **Where**: `script.js:466`
- **Why it matters**: Unexpected auto-opening UI on a device someone is actively using with a keyboard creates a jarring first impression and associates the brand with spammy behaviour.
- **Effort**: S
- **Suggested fix**:
  - Change the width threshold from `768` to `1024` to also guard all tablet form factors.
  - One character change: `window.innerWidth < 1024`.

---

## 🛠 P2 — Code health (tech debt slowing velocity)

### 10. `style.css` is 8,198 lines with no spacing or sizing scale

- **What**: Grid gaps are ad hoc throughout — awards `16px`, books `20px`, projects `24px` — with no `--gap-*` or `--space-*` CSS custom properties. Every layout decision requires grepping to find the local convention.
- **Where**: `style.css` (entire file), representative gaps at lines ~640, ~900, ~1020
- **Why it matters**: New UI sections default to whatever the developer happened to pick. Design consistency degrades gradually with every new section added.
- **Effort**: M
- **Suggested fix**:
  - Define at the `:root` level: `--gap-sm: 16px; --gap-md: 20px; --gap-lg: 24px; --gap-xl: 32px;`
  - Do a search-and-replace pass for the most common literal values (`gap: 16px`, `gap: 24px`). No visual change, but future additions have a reference.

---

### 11. `tool-utils.js` mixes 4 unrelated concerns in 1,680 lines

- **What**: API calls, UI rendering (progress bars, toasts, error panels), analytics tracking (`notifyToolUsed`), and localStorage helpers are all in one file with no separation.
- **Where**: `tool-utils.js` (entire file); API layer ~lines 175–240, UI layer ~lines 276–350, analytics ~lines 228–270, storage ~lines 380–430
- **Why it matters**: Adding or debugging any tool requires reading and understanding the entire file. The blast radius of a change is unknowable without reading all 1,680 lines.
- **Effort**: L
- **Suggested fix**:
  - Split into `tool-api.js` (fetch + error handling), `tool-ui.js` (DOM helpers), and keep `tool-utils.js` as a thin re-export barrel.
  - The analytics and storage helpers are small enough to stay inline in the barrel.
  - Do this incrementally — one concern at a time — to avoid regressions.

---

### 12. Duplicate markdown parsers with diverging behaviour across chat and tools

- **What**: `chat.js:16–26` parses bold + italic + URLs into clickable links; `tool-utils.js:222–226` parses only bold + line breaks. A tool response containing a URL renders as plain text; the same URL in chat becomes a clickable link.
- **Where**: `chat.js:16–26`, `tool-utils.js:222–226`
- **Why it matters**: Inconsistent rendering between the chat widget and tool pages confuses users and means bug fixes must be applied in two places.
- **Effort**: S
- **Suggested fix**:
  - Move `chat.js`'s `parseMarkdown()` to `tool-utils.js` and rename `formatMarkdown` to call it.
  - Delete the duplicate from `chat.js` and import the shared version.

---

### 13. Navbar scroll handler fires on every scroll event without throttle

- **What**: `window.addEventListener('scroll', ...)` on `script.js:23` runs a classList toggle on every pixel of scroll. `passive: true` prevents jank from blocking the thread but the callback still runs ~60 times per second on smooth-scroll devices.
- **Where**: `script.js:23–25`
- **Why it matters**: On content-heavy pages or low-end Android devices this contributes to scroll jank. Minor individually, but scroll performance is one of the first things users notice.
- **Effort**: S
- **Suggested fix**:
  - Wrap the callback body in `requestAnimationFrame(() => { ... })` with a `ticking` boolean guard — the standard RAF throttle pattern, ~4 extra lines.

---

### 14. `what-would-x-do.html` has 700+ lines of inline `<script>`

- **What**: All tool logic, UI state, prompt templates, example handling, and analytics for the "What Would X Do?" tool live inside a `<script>` block in the HTML file — totalling 1,188 lines in one file.
- **Where**: `what-would-x-do.html` (inline script block, approximately lines 490–1188)
- **Why it matters**: Inline scripts can't be cached separately by the browser. Every page load re-parses 700+ lines of JS. Debugging requires the DevTools "Sources" panel rather than a proper editor.
- **Effort**: M
- **Suggested fix**:
  - Extract the inline script verbatim to `what-would-x-do.js` and replace the `<script>` block with `<script src="what-would-x-do.js" defer></script>`.
  - No logic changes needed — the file will now be independently cacheable and editable.

---

## 💡 P3 — Nice to have

### 15. Site color palette doesn't match Givelink brand spec

- **What**: The site's primary colours are blue (#3b6ef8) and purple (#7c3aed). The Givelink brand spec calls for purple #6B3FA0/#5718CA and pink #C2185B/#E353B6. The hero, CTAs, and project card gradients are visually disconnected from the product brand.
- **Where**: `style.css:202` (`.btn-givelink`), `style.css:350–360` (orbs), `style.css:644–645` (project card gradients)
- **Why it matters**: Visitors coming from Givelink marketing who land here won't recognise the brand colours — weak signal for credibility and consistency.
- **Effort**: M
- **Suggested fix**:
  - Define `--brand-purple: #5718CA; --brand-pink: #E353B6;` in `:root`.
  - Update the Givelink project card gradient and `.btn-givelink` to use them. Leave the hero/global palette as-is (blue is fine for the personal site).

---

### 16. Service worker offline fallback has no retry or user context

- **What**: `sw.js:71–74` serves `offline.html` when both network and cache miss. The offline page presumably just says "You're offline" with no retry button and no explanation of which page the user was trying to reach.
- **Where**: `sw.js:71–74`, `offline.html`
- **Why it matters**: Users on flaky mobile connections see a dead end with no call to action. A simple "Try again" button that calls `window.location.reload()` recovers most of these sessions.
- **Effort**: S
- **Suggested fix**:
  - Add a "Try again" button to `offline.html` that calls `window.location.reload()`.
  - Optionally pass the originally requested URL through a query param so the page can say "Couldn't load [page name]."
