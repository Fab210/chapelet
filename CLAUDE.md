# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Rosaire Interactive** is a static vanilla JavaScript web application for guided rosary prayer in Portuguese. No build tools, bundlers, or transpilers — files run directly in the browser.

**Stack**: Vanilla JS (ES6+), HTML5, CSS3, Bootstrap 5.3.7 (CDN only), Web Speech API for TTS.

## Local Development

```bash
# Open directly in browser (file:// works), or serve with:
python -m http.server 8000
# or
npx http-server
```

**Service worker caveat (Windows)**: `python -m http.server` may serve `.js` as `text/plain` (it reads MIME types from the registry), which browsers tolerate for `<script>` but **reject for service worker registration**. To test the PWA/offline behaviour locally, use `npx http-server` instead. `file://` never registers service workers.

No lint, test framework, or build commands exist in this project.

## Architecture

### File Layout

- `index.html` — Main application (interactive rosary)
- `js/scripts.js` — All JavaScript logic (~641 lines)
- `css/styles.css` — All CSS (~711 lines)
- `img/` — Mystery images; some referenced in code may be missing
- `rosaire.html` — Placeholder secondary page
- `sw.js` + `manifest.json` — PWA: offline service worker (precaches shell + the 21 used images; audio is cached on first play with Range/206 support for iOS). **Bump `VERSION` in `sw.js` whenever files under `img/` or `vendor/` change** — HTML/CSS/JS are network-first and refresh on their own.
- `vendor/` — Self-hosted Bootstrap 5.3.7 and Google Fonts (latin + latin-ext woff2), required for offline use. Do not reintroduce CDN links in `index.html`.

### Responsive Layout Strategy

- **Desktop (≥768px)**: Two-column "open book" — prayer text left, rosary beads right
- **Mobile (<768px)**: Single column — beads centered, prayer text in a bottom-sheet modal (`#modal-priere`)
- All bead/container sizing derives from `min(500px, 90vw)` as the base unit; JS uses `chapSize / 500` as a scale factor for proportional positioning

### JavaScript Architecture (`js/scripts.js`)

**Data at the top:**
- `paiNosso`, `aveMaria` — prayer HTML strings
- `basePrières` — opening prayer sequence (Creed + Lord's Prayer + 3× Hail Mary)
- `mysteres` — 4 mystery sets × 5 mysteries each (joyeux, lumineux, douloureux, glorieux)
- `imagesMysteres` — corresponding image paths per mystery
- `prières` — dynamically built prayer sequence for the active mystery type
- `sousTextes` — meditation sub-texts shown at specific prayer indices

**State:**
- `currentIndex` — current position in `prières`
- `sousIndexes` — tracks sub-text pagination per prayer
- `history` — stack of `{type, index, subIndex}` objects for back navigation

**Key function groups:**
- Mystery management: `changerMystere(type)`, `changerImageMystere(numMystere)` (fade transition)
- Navigation: `avancePriere()` (next, handles sub-texts), `reculePriere()` (back via history stack)
- Visual sync: `updateRosaire()`, `mettreAJourPerles()`, `regenererPerles()` (on resize)
- Bead generation: `generatePerles()` — 5 vertical chain beads (1 cross) + 60 circular beads; beads at indices 5, 16, 27, 38, 49 are larger Our-Father beads
- Mobile UI: `mettreAJourBandeau()`, `ouvrirModal()`, `fermerModal()`
- TTS: `tts` object wrapping Web Speech API — voice priority pt-BR > pt-PT > pt-* > default; rate 0.88×

**Input handling:** Right Arrow / Space = next; Left Arrow = back; touch swipe ≥50px left/right; mystery selector buttons. Resize is debounced 150ms; `orientationchange` debounced 300ms.

### CSS Architecture (`css/styles.css`)

- `#chapelet` container uses `min(500px, 90vw)` with aspect-ratio 1.45
- `.perle` beads: 3D gradient spheres at 3.6% of rosary width; active state uses `@keyframes brillance` (brightness pulse)
- `.croix`: clip-path polygon cross shape
- Modal slides up via `translateY(100%) → translateY(0)` with cubic-bezier transition
- Breakpoints: `max-width: 767px` (mobile), `max-width: 359px` (small phones), `hover: none` and `pointer: coarse` (touch — shows swipe hint)

## Rules

- **Never modify TTS or Web Speech API behaviour without flagging browser limitations upfront.** The API does not support changing rate mid-utterance; any speed-change feature requires cancel + restart, which has audible side-effects. Describe the trade-off to the user before implementing.
- **Do not claim a feature works without testing it in the browser first.** This project has no automated tests — the only way to verify behaviour is to open `http://localhost:8000` and exercise the feature manually. If a local server cannot be started, say so explicitly rather than shipping untested code.

### Modifying the App

**Add a mystery set:** Add to `mysteres` and `imagesMysteres` objects, add a button in HTML, add a click listener in the init section of `scripts.js`.

**Edit prayers:** Modify `paiNosso`, `aveMaria`, or `basePrières` at the top of `scripts.js`.

**Change breakpoint:** Edit `@media (max-width: 767px)` in CSS and any corresponding width checks in JS.

# Agent Execution Guidelines

## Core Priorities

Priority order matters. When rules conflict, follow the higher priority item.

Correctness

Verification

Minimal Changes

Clarity

Maintainability

---

## Operating Principles

### Verify Reality First

- Never assume filesystem state.

- Never assume APIs, functions, schemas, or dependencies exist.

- Never assume tool outputs are correct or complete.

- Read relevant files before editing them.

- Distinguish observations from assumptions.

- If uncertain, state the uncertainty explicitly.

### Correctness Before Completion

- Do not claim success without verification.

- Verify behavior through tests, execution, or direct inspection whenever possible.

- If something cannot be verified, say so clearly.

- Prefer reproducible evidence over confidence statements.

### Keep Changes Scoped

- Keep changes tightly scoped to the requested task.

- Do not refactor unrelated code unless necessary for correctness.

- Do not rewrite working systems without justification.

- Avoid broad architectural changes unless explicitly requested.

- Mention adjacent issues separately before changing them.

### Prefer Simplicity

- Prefer the simplest solution that correctly solves the problem.

- Avoid speculative abstractions.

- Avoid adding configurability, flexibility, or extensibility that was not requested.

- Avoid introducing new dependencies unless necessary.

- Do not optimize prematurely.

### Maintain Consistency

- Match existing project conventions and style unless they are harmful.

- Reuse existing patterns when reasonable.

- Do not silently introduce conflicting architectural patterns.

- Remove only the dead code directly caused by your own changes.

### Communicate Clearly

- State assumptions explicitly.

- Explain important tradeoffs briefly when relevant.

- Ask questions only when ambiguity materially affects correctness.

- If multiple valid approaches exist, summarize the options briefly before proceeding.

- Do not hide uncertainty or missing information.

---

## Execution Process

For non-trivial tasks:

Understand the request

Inspect relevant code and context

State assumptions and constraints

Make the smallest correct change

Verify results

Report what changed and what was verified

---

## Editing Rules

When modifying existing code:

- Change only what is necessary.

- Preserve unrelated behavior.

- Preserve existing public interfaces unless requested otherwise.

- Avoid cosmetic-only edits.

- Avoid unnecessary formatting churn.

- Do not remove unrelated dead code, TODOs, or comments.

Every modified line should have a direct reason tied to the task.

---

## Testing and Verification

When fixing bugs:

- Reproduce the issue if possible.

- Verify the fix directly.

When adding features:

- Verify expected behavior.

- Verify no obvious regressions were introduced.

When refactoring:

- Preserve behavior unless changes were requested.

- Verify before-and-after behavior when possible.

---

## Failure Handling

If blocked:

- Stop and describe the blocker clearly.

- State what information is missing.

- State what was already verified.

- Do not fabricate progress or results.

If a request appears harmful, destructive, or unsafe:

- Explain the concern clearly.

- Do not proceed silently.

---

## Decision Heuristics

Prefer:

- explicit over implicit

- simple over clever

- concrete over abstract

- verified over assumed

- focused changes over broad rewrites

Avoid:

- speculative engineering

- hallucinated implementations

- hidden side effects

- silent behavior changes

- unnecessary complexity

---

## Success Criteria

A task is complete only when:

- The requested change is implemented

- The result is verified as much as possible

- Assumptions and limitations are disclosed

- No unrelated behavior was unintentionally changed
