# Product brief: neon-conga-snek

Status: agreed · Last updated: 2026-11-21

<!--
Drafted by Claude from the code and README on 2026-11-21, at the owner's request
("draft it all, I'll review once"). Everything here describes what the game does today
plus the most likely intent; corrections from the owner override it.
-->

## Problem statement

Classic Snake is instantly understandable but feels flat and silent: the speed-up is arbitrary and nothing about the game rewards you for doing well beyond a number. People who want a quick, silly, one-more-go browser game have nothing that turns that familiar loop into a small party, where growing longer is a spectacle rather than just a bigger risk.

### Product objectives

- A player understands the game within seconds of opening it, without reading instructions.
- Growing the line feels rewarding: the music, tempo and visuals visibly and audibly escalate.
- Losing is funny, not frustrating, so players start another round straight away.
- It runs in any modern browser on any device, with nothing to install and no account.

### Target audience

Casual players of any age who want a short game in a spare minute, on a phone, tablet or computer, with touch, mouse or keyboard. Any level of comfort with technology. Players with low vision, motor impairments or sensitivity to motion and flashing must be able to play or to turn the intense effects down.

## Key features and functionality

- v1: Snake on a 28×20 grid; edges wrap around ("neon portals"); the only way to lose is running into your own line.
- v1: Each guest picked up (a random party-animal emoji) joins the line and rides along behind the head.
- v1: Live synthesised music (Web Audio, no samples). The snake moves one cell per 16th note; tempo rises by 3 BPM per guest, from 76 up to 190 BPM.
- v1: Instrument layers unlock as the line grows: arpeggiator at 6, sparkles at 12, cowbell at 20. Points per guest scale with the number of layers.
- v1: Power-ups that appear for a while and then vanish: hot sauce (double speed for 6 s), banana peel (controls flipped, floor wobbles, 6 s), disco ball (pass through yourself, 6 s), cheese (three guests leave; only once the line is longer than 7).
- v1: Title, playing, paused and game-over screens; a sad trombone and a random joke line on game over.
- v1: Best score kept on this device between visits.
- v1: Controls: arrow keys or WASD to steer, Space/Enter to start or pause, P/Esc to pause, M to mute; swipe to steer and tap to start on touch screens.
- v1: On-screen Pause, Sound and Effects buttons, so pause and mute work with touch or mouse alone.
- v1: Calm effects mode (no screen shake, no floor reshuffle, no wobble), on automatically when the device asks for reduced motion, and switchable with the Effects button.
- v1: The game pauses by itself when the tab is hidden or the window loses focus.

## Look and feel

Neon disco: a dark purple-black background, a light-up dance floor that reshuffles on every beat, glowing outlines in shifting hues, Monoton for titles and Orbitron for interface text, emoji for the guests and power-ups. Playful, silly copy ("Don't trip over your own butt."). Keep this palette, type and mood.

## Data, privacy and access

The only stored data is the best score, in the browser's localStorage on the player's own device. No accounts, no personal data, nothing sent to a server. No analytics or tracking. The game and its code may be public.

## Constraints and dependencies

- Must cost nothing to build, run and host.
- Runs entirely in the browser as a static site; no backend and no API keys.
- Should work offline once loaded; fonts and scripts are bundled rather than loaded from third parties.
- Sound starts only after the player's first interaction (browser autoplay rules).

## Acceptance criteria

- AC1: Opening the page shows the title screen with the controls listed; pressing Space, pressing Enter, clicking or tapping the board starts a game.
- AC2: Arrow keys and WASD steer; a direction directly opposite to the current one is ignored; up to three turns can be queued between moves.
- AC3: On a touch screen, a swipe of at least 20px steers in the swipe's main direction.
- AC4: Moving off any edge brings the head back in on the opposite edge.
- AC5: Moving into your own line ends the game (except while the disco ball is active); moving into the cell the tail is just leaving does not.
- AC6: Picking up a guest adds one segment showing that guest, adds 10 points × the current number of layers, and places a new guest on a free cell.
- AC7: Tempo is 76 BPM with the starting line of 3 and rises by 3 BPM per extra segment, capped at 190; the snake moves once per 16th note at that tempo (twice as fast with hot sauce).
- AC8: Music layers are 1 below 6 segments, 2 from 6, 3 from 12 and 4 from 20, and drop again if the line shrinks.
- AC9: Hot sauce, banana and disco ball each last 6 seconds; cheese removes up to three segments but never shrinks the line below 3; cheese only appears once the line is longer than 7.
- AC10: An uncollected power-up disappears after 8 seconds, blinking for its last 2 seconds.
- AC11: P or Esc (or Space while playing) pauses and resumes; the music stops while paused.
- AC12: M mutes and unmutes all sound; the HUD shows a mute indicator.
- AC13: The best score survives a page reload, and the game still works when storage is unavailable.
- AC14: Game over shows the score, the line length, a joke line, and "new high score" when it is one; Space, a click or a tap starts a new game.
- AC15: The page meets WCAG 2.2 AA, checked automatically by an axe test in `make test`.
- AC16: The game is usable at phone width (320px) and on a desktop without the board overflowing the screen.
- AC17: Time spent paused does not count: power-up effects, a waiting power-up and the next power-up's arrival all resume where they stopped.
- AC18: Hiding the tab or leaving the window while playing pauses the game.
- AC19: On-screen buttons pause/resume, mute/unmute and switch calm effects, by touch, mouse or keyboard; Sound and Effects show their on/off state to screen readers.
- AC20: With reduced motion requested by the device, or calm effects switched on, the screen does not shake, the floor does not reshuffle or pulse, and the board does not wobble.
- AC21: Screen-reader users hear the game's state changes (started, paused, power-up, new instrument layer, game over with score) through a live region.
- AC22: On a touch-first device the title and game-over screens say "tap" instead of naming keys.

## Out of scope

- Accounts, online leaderboards, multiplayer.
- Analytics, ads, in-app purchases.
- Levels, obstacles or walls (the open, wrapping floor is the design).

## Open questions

- Should the game be deployed (for example GitHub Pages, which needs a public repo on the free plan), and should the repo be public or private?
- Gap list from adoption on 2026-11-21: see below. The owner chose on 2026-11-21 to fix all of it in the adoption refactor.

### Gap list (adoption, 2026-11-21)

All of the items below were fixed in the adoption refactor on 2026-11-21, except where noted.

**Intended but missing or incomplete**

- Pause and mute needed a keyboard → on-screen Start/Pause, Sound and Calm effects buttons (AC19); touch wording on the title, pause and game-over screens (AC22).
- Power-up timers kept running while paused → game clock that only runs while playing (AC17).
- No pause when the tab is hidden or the window loses focus → auto-pause (AC18).
- No accessibility support → heading, named and described board, readable score line, live announcements, calm effects mode, axe test in `make test` (AC15, AC20, AC21).
- Fonts from Google Fonts → bundled.

**Built but not intended**

- None found.

**Not meeting the house conventions**

- Not a git repository; no GitHub repo yet → git initialised. Still open: creating the GitHub repo (asks first; see the deploy/visibility question above).
- Contract files, `Makefile`, CI, Dependabot, tests → added.
- Plain `tsc` with global scripts → Vite, ES modules, vitest, ESLint, Prettier.
- One 730-line file with shared mutable state → rules split into `src/game.ts` with 72 unit tests.
- TypeScript 5.9 → 6.0.3. Still open: TypeScript 7, blocked until typescript-eslint supports it.
- README not in newcomer format → rewritten.
- Still open: no security scan has been run yet (`last_security_scan: never`).
