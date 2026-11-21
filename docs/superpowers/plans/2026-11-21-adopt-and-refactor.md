# Plan: adopt into oberchecker and refactor (2026-11-21)

Covers AC1–AC22 of `docs/brief.md`. Owner decisions: migrate to Vite + split the rules out,
fix every gap on the adoption gap list, first git commit only once all of it is done.

## Measurable goals (refactor)

|                                       | Before                                         | Target                                                                                      |
| ------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Automated tests                       | 0, no `make test`                              | Unit tests for every rule in AC2–AC10, AC13, AC17; Playwright + axe for every screen (AC15) |
| Game rules testable without a browser | No (DOM, audio and rules share module globals) | `src/game.ts` imports no DOM, canvas or audio code                                          |
| Largest source file                   | `main.ts`, 730 lines                           | No file over ~350 lines                                                                     |
| Build                                 | `tsc` → two global scripts                     | Vite, ES modules, one bundle                                                                |
| JS shipped                            | 29.5 KB unminified (tsc output)                | Smaller (minified)                                                                          |
| Third-party requests at runtime       | Google Fonts (2 hosts)                         | None                                                                                        |
| Lint                                  | none                                           | ESLint + Prettier + `tsc --noEmit` clean                                                    |

## Tasks

1. **Tooling** – Vite, vitest, ESLint (typescript-eslint), Prettier, Playwright, axe; TypeScript 6.0
   (TS 7 is not supported by typescript-eslint yet → recommendation). `Makefile`, CI, Dependabot,
   `.oberchecker.json`, `CLAUDE.md`, `.env.example`, `.gitignore`, `.claude/settings.json`.
2. **Pure rules** (`src/game.ts`, `src/config.ts`) test-first: movement and wrap (AC4), self-collision
   and tail rule (AC5), steering queue (AC2), eating and score (AC6), tempo (AC7), layers (AC8),
   power-ups (AC9, AC10), a game clock that only runs while playing (AC17). Randomness injected.
   The rules emit events (eat, power, die, layer, wrap) instead of calling audio/particles.
3. **Small helpers** test-first: swipe direction (AC3), key mapping, best-score storage that
   survives broken storage (AC13).
4. **Shell** – `render.ts` (drawing, calm mode AC20, touch wording AC22), `fx.ts` (particles,
   floating text), `music.ts` as a module, `main.ts` wiring: on-screen buttons (AC19),
   auto-pause (AC18), live region (AC21), bundled fonts.
5. **Browser tests** – Playwright: title → play → pause → game over flow, buttons, phone size
   (AC1, AC11, AC12, AC14, AC16, AC19); axe on title, playing, paused, game over (AC15).
6. **Docs** – README in the newcomer format, CLAUDE.md, brief gap list marked done.
