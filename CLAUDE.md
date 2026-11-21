# neon-conga-snek

Snake as a neon disco conga line whose live-synthesised music speeds up as the line grows. What the product is for, who uses it and what counts as done is in `docs/brief.md`; read it before changing behaviour.

## Architecture

A static TypeScript site built with Vite. One canvas draws the whole game; real HTML around it carries the buttons, the heading and the screen-reader text.

- `src/config.ts`: board size, timings, guests, power-ups, joke lines. Change balance here.
- `src/game.ts`: the rules, as a `Game` class with no DOM, canvas or audio. `advance(dt)` runs the game clock and returns `GameEvent`s (eat, power, shrink, layer, wrap, die); `step()` is one move. Randomness is injected for tests.
- `src/input.ts`: keys and swipes → actions (pure).
- `src/storage.ts`: localStorage wrappers that survive storage being unavailable. Keys are prefixed `neon-conga-snek-` (`best` and `calm`); `best` keeps the same key as before the refactor so old high scores carry over.
- `src/fx.ts`: visual-only state (beat pulse, shake, particles, floating text).
- `src/render.ts`: draws everything from `Game` + `Fx` + a `View` (real time, calm mode, touch wording, best, muted).
- `src/music.ts`: `NeonBeat`, a Web Audio step sequencer; layers 1–4, plus sound effects.
- `src/main.ts`: wiring. Turns game events into sound, effects and live-region announcements, keeps the buttons and `data-status` on `<main>` in sync, and runs the `requestAnimationFrame` loop.
- Tests: `tests/unit` (vitest, rules and helpers), `tests/e2e` (Playwright on desktop and a phone profile, including axe).

## Decisions

- **Game clock, not wall clock.** Effect expiry, power-up lifetime and the next power-up's arrival are all in `game.time`, which only advances while playing. This is what makes pause fair (AC17). Animations (bobbing, hue cycling) use real time and keep running while paused.
- **Rules emit events** instead of calling audio and particles, so they stay testable and the shell decides how to react.
- **Calm effects** (AC20) start on if the OS asks for reduced motion; the player's own choice is remembered after that. Calm mode stops shake, floor reshuffle and pulse, banana wobble, disco flicker, segment wiggle and blinking text; power-ups fade instead of blinking.
- **Fonts are bundled** (`@fontsource/monoton`, `@fontsource/orbitron`, both under the SIL Open Font License) instead of loaded from Google Fonts, for privacy and offline play.
- **TypeScript stays on 6.0.x.** TS 7 exists, but typescript-eslint supports only `<6.1` as of 2026-11-21. Upgrade once it supports 7.
- **`?debug`** exposes the game as `window.__snek` so browser tests can set up a crash without playing for minutes. It reveals nothing secret.

## Gotchas

- Space/Enter on a focused button are left to the button; the global key handler skips them, or a button press would toggle twice.
- The toggle buttons show on/off with a CSS switch graphic, not text. Visible text that isn't in the accessible name fails WCAG 2.5.3 (axe `label-content-name-mismatch`).
- Browsers only allow audio after a user gesture; `NeonBeat.ensure()` creates/resumes the `AudioContext` on start. On touch, the game therefore starts on `touchend`. `touchstart` is not a user activation, and starting there leaves phones silent.
- The key handler ignores Ctrl/Cmd/Alt combinations (browser shortcuts) and auto-repeat for anything but steering (holding Space would otherwise flicker pause).
- Buttons drop focus after a mouse/touch press (`detail > 0`) so Space goes back to the game; keyboard presses keep focus.
- The board's size comes from a CSS size container (`.stage`, `cqw`/`cqh`), so it fits however many rows the buttons wrap to.
- `window.blur` pauses the game, so browser tests that open devtools or switch windows will see it paused.
- `fsevents` shows up under `npm install-scripts ls` as not approved. It's an optional macOS file watcher, and nothing needs it.

General conventions come from the oberchecker plugin (project-contract, house-conventions). Don't repeat them here.
