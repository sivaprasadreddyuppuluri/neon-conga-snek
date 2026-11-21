# 🕺 Neon Conga Snek 💃

A silly browser game for anyone who wants a quick round of something fun. It's the classic game Snake,
but you are the head of a conga line on a light-up disco floor. Every party animal you pick up joins the
line and dances behind you, and the music speeds up as the line grows. It works on phones, tablets and
computers, with touch, mouse or keyboard.

- Every party animal you pick up (🦩🐸🦄🦖🐙…) **joins the line**.
- The music is made live in your browser. The line moves **four steps per beat**, in time with the music, and
  the DJ adds **3 beats per minute per guest** (76 → 190).
- New instruments join in as the line grows: arpeggiator (6), sparkles (12) and **MORE COWBELL** (20).
- The edges are neon portals: go off one side and you come back on the other. The only way to lose is
  tripping over your own line.
- Losing plays a sad trombone. You've earned it.

Power-ups:

|     |             |                                    |
| --- | ----------- | ---------------------------------- |
| 🌶️  | Hot sauce   | Double speed for 6 seconds         |
| 🍌  | Banana peel | Controls flipped, floor wobbles    |
| 🪩  | Disco ball  | Ghost mode: pass through yourself  |
| 🧀  | Cheese      | Lactose intolerant: 3 guests leave |

**Controls**

- Keyboard: arrow keys or W A S D to steer, Space to start or pause, P to pause, M to mute.
- Touch: tap the board to start, swipe to steer.
- Buttons under the board: **Start / Pause**, **Sound** on or off, and **Calm effects**, which stops
  the screen shaking and the floor flashing. Calm effects is switched on for you if your device is set
  to reduce motion.

The game pauses by itself when you switch to another tab or app. Your best score is kept in your
browser on this device only; nothing is sent anywhere.

## Use it

Play it in your browser at **<https://sivaprasadreddyuppuluri.github.io/neon-conga-snek/>**. Nothing to install. Press Space or tap the board to start.

## Run it yourself

You need two free programs: **Git** (to download the code) and **Node.js** (to build and run the game).

1. Install Git:
   - Windows: download it from [git-scm.com](https://git-scm.com/download/win) and run the installer
     with its default choices.
   - macOS: open the Terminal app and type `git --version`. If Git is missing, macOS offers to install
     it; accept.
   - Linux: install the `git` package with your system's package manager, for example
     `sudo apt install git`.
2. Install Node.js, the version marked "LTS", from [nodejs.org](https://nodejs.org/). On Linux you can
   also use your package manager.
3. Windows only: the commands below use `make`. The easiest way to get it is to run them inside
   [WSL](https://learn.microsoft.com/windows/wsl/install). Or use the `npm` commands shown in brackets.
4. Open a terminal (Terminal on macOS and Linux; on Windows, the WSL or PowerShell window).
5. Download the code and go into its folder:
   ```bash
   git clone https://github.com/sivaprasadreddyuppuluri/neon-conga-snek.git
   cd neon-conga-snek
   ```
6. Install everything the game needs (once): `make setup` (or `npm ci`).
7. Start the game: `make dev` (or `npm run dev`).
8. Open the address it prints, usually <http://localhost:5173>, in your browser. Press Space or tap
   the board to play.
9. To stop the game, go back to the terminal and press Ctrl + C.

## For developers

- Tests: `make test` (unit tests for the rules, then browser tests including an automated
  accessibility check, against a production build)
- Lint, formatting and type checks: `make lint`
- Production build into `dist/`: `make build`
- Deploy: automatic to GitHub Pages after CI passes on `main`. `make deploy` triggers one by hand; `make deploy REF=<commit>` redeploys an earlier commit to roll back
- What the game should do, and how we check it: `docs/brief.md`
- How the code is laid out: `CLAUDE.md`
