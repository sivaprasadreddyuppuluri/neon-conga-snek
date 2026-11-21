// NEON CONGA SNEK
// You are the head of a conga line on a neon disco floor. Every party animal
// you pick up joins the line, and the DJ speeds up the beat as the line grows.
// The snake moves exactly one cell per 16th note, so it literally dances to the music.
//
// This file wires the pieces together: rules (game.ts), drawing (render.ts),
// effects (fx.ts), music (music.ts), and the page's buttons and announcements.

import "@fontsource/monoton/400.css";
import "@fontsource/orbitron/400.css";
import "@fontsource/orbitron/900.css";
import "./style.css";

import { CELL, DEATH_LINES, EAT_LINES, LAYER_LINES, PLAY_H, POWERS, W } from "./config";
import { Fx } from "./fx";
import { Game, type GameEvent } from "./game";
import { keyAction, swipeDirection } from "./input";
import { NeonBeat } from "./music";
import { Renderer } from "./render";
import { loadFlag, loadNumber, saveValue } from "./storage";

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

function element<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`The page is missing #${id}; index.html and main.ts are out of step.`);
  return el as T;
}

const main = element<HTMLElement>("app");
const canvas = element<HTMLCanvasElement>("game");
const playBtn = element<HTMLButtonElement>("btn-play");
const soundBtn = element<HTMLButtonElement>("btn-sound");
const calmBtn = element<HTMLButtonElement>("btn-calm");
const announcer = element<HTMLElement>("announcer");
const scoreline = element<HTMLElement>("scoreline");

const game = new Game();
const fx = new Fx();
const music = new NeonBeat();
const renderer = new Renderer(canvas);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const touch = window.matchMedia("(pointer: coarse)").matches;
let calm = loadFlag("calm", reducedMotion);
let best = loadNumber("best");
let deathLine = "";
let newBest = false;

music.onStep = (s) => fx.onStep(s);

// `?debug` lets the browser tests reach the game to set up situations quickly.
if (new URLSearchParams(location.search).has("debug")) {
  (window as unknown as { __snek: Game }).__snek = game;
}

// ---- page state ----------------------------------------------------------------

function announce(text: string): void {
  announcer.textContent = text;
}

let lastScoreline = "";
function syncPage(): void {
  main.dataset.status = game.status;
  const label = { title: "Start", playing: "Pause", paused: "Resume", dead: "Play again" }[game.status];
  const icon = { title: "▶", playing: "⏸", paused: "▶", dead: "↻" }[game.status];
  if (playBtn.dataset.label !== label) {
    playBtn.dataset.label = label;
    const iconSpan = document.createElement("span");
    iconSpan.setAttribute("aria-hidden", "true");
    iconSpan.textContent = icon;
    playBtn.replaceChildren(iconSpan, ` ${label}`);
  }
  soundBtn.setAttribute("aria-pressed", String(!music.isMuted));
  soundBtn.querySelector(".icon")!.textContent = music.isMuted ? "🔇" : "🔊";
  calmBtn.setAttribute("aria-pressed", String(calm));

  const text = `Score ${game.score}. Best score ${best}. Conga line ${game.snake.length}.`;
  if (text !== lastScoreline) scoreline.textContent = lastScoreline = text;
}

// ---- actions -------------------------------------------------------------------

function startGame(): void {
  game.start();
  fx.clear();
  music.bpm = game.bpm;
  music.layers = game.layers;
  music.start();
  announce("Game started. The conga line is 3 long.");
}

function togglePause(): void {
  if (game.status === "playing") {
    game.pause();
    music.stop();
    announce("Paused.");
  } else if (game.status === "paused") {
    game.togglePause();
    music.start();
    announce("Resumed.");
  }
}

function autoPause(): void {
  if (game.status === "playing") togglePause();
}

/** Space, Enter or the Start/Pause button: start a game, or pause/resume one. */
function primary(): void {
  if (game.status === "title" || game.status === "dead") startGame();
  else togglePause();
}

function toggleMute(): void {
  music.toggleMute();
  syncPage();
}

function toggleCalm(): void {
  calm = !calm;
  saveValue("calm", calm);
  syncPage();
}

function handle(events: GameEvent[]): void {
  for (const e of events) {
    switch (e.type) {
      case "eat":
        music.eat();
        fx.burst(e.x, e.y, Math.random() * 360, 22, 4);
        fx.floatText(pick(EAT_LINES), (e.x + 0.5) * CELL, e.y * CELL, Math.random() * 360, 20, 1);
        fx.pulse = 1;
        break;
      case "layer":
        fx.floatText(LAYER_LINES[e.layers], W / 2, PLAY_H / 2, 300, 34, 2.2);
        announce(`${LAYER_LINES[e.layers]} The conga line is ${game.snake.length} long.`);
        break;
      case "power": {
        const p = POWERS[e.kind];
        music.powerUp();
        fx.burst(e.x, e.y, p.hue, 30, 5);
        fx.floatText(p.label, W / 2, PLAY_H * 0.3, p.hue, 24, 1.8);
        fx.shake = 0.5;
        announce(p.label);
        break;
      }
      case "shrink":
        for (const c of e.cells) fx.burst(c.x, c.y, 45, 10, 3);
        break;
      case "wrap":
        fx.burst(e.x, e.y, 190, 8, 2);
        break;
      case "die":
        music.stop();
        music.sadTrombone();
        fx.shake = 1;
        fx.burst(e.x, e.y, 0, 60, 7);
        deathLine = pick(DEATH_LINES);
        newBest = e.score > best;
        if (newBest) {
          best = e.score;
          saveValue("best", best);
        }
        announce(
          `Game over. ${deathLine} Score ${e.score}, conga line ${game.snake.length}.` +
            (newBest ? " New high score!" : "") +
            " Press Play again to restart.",
        );
        break;
    }
  }
  music.bpm = game.bpm;
  music.layers = game.layers;
}

// ---- input ---------------------------------------------------------------------

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts alone
  const action = keyAction(e.key);
  if (!action) return;
  // Holding a key down repeats it; only steering should repeat, not pause or mute.
  if (e.repeat && action.type !== "steer") {
    e.preventDefault();
    return;
  }
  // Space/Enter on a focused button belong to that button, not to the game.
  if (action.type === "primary" && e.target instanceof HTMLButtonElement) return;
  e.preventDefault();
  if (action.type === "steer") game.steer(action.dir);
  else if (action.type === "primary") primary();
  else if (action.type === "pause") togglePause();
  else toggleMute();
});

let touchStart: { x: number; y: number } | null = null;
canvas.addEventListener(
  "touchstart",
  (e) => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
    e.preventDefault(); // no scrolling or zooming while playing
  },
  { passive: false },
);
// Start on touchend, not touchstart: browsers only allow audio to start from touchend.
canvas.addEventListener("touchend", (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (game.status === "title" || game.status === "dead") {
    startGame();
    return;
  }
  const d = swipeDirection(dx, dy);
  if (d) game.steer(d);
});
canvas.addEventListener("click", () => {
  if (game.status === "title" || game.status === "dead") startGame();
});

// After a mouse or touch press, drop focus from the button so Space goes back to the game.
// Keyboard presses (detail 0) keep focus where it is.
function onPress(action: () => void) {
  return (e: MouseEvent) => {
    action();
    if (e.detail > 0) (e.currentTarget as HTMLElement).blur();
  };
}
playBtn.addEventListener("click", onPress(primary));
soundBtn.addEventListener("click", onPress(toggleMute));
calmBtn.addEventListener("click", onPress(toggleCalm));

// Switching tabs or apps pauses, so nobody comes back to a crashed conga line.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) autoPause();
});
window.addEventListener("blur", autoPause);

// ---- main loop -----------------------------------------------------------------

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(100, now - last);
  last = now;
  if (game.status === "playing") handle(game.advance(dt));
  fx.update(dt, game.status === "title" && !calm);
  renderer.draw(game, fx, { now, calm, touch, best, newBest, muted: music.isMuted, deathLine }, dt);
  syncPage();
  requestAnimationFrame(frame);
}

syncPage();
requestAnimationFrame(frame);
