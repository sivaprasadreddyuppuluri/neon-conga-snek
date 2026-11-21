// Turning raw keys and swipes into game actions. Pure functions, so they can be tested.

import type { Vec } from "./game";

export type KeyAction =
  | { type: "steer"; dir: Vec }
  /** Space/Enter: start a new game on the title or game-over screen, otherwise pause/resume. */
  | { type: "primary" }
  | { type: "pause" }
  | { type: "mute" };

const KEY_DIRS: Record<string, Vec> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

export function keyAction(rawKey: string): KeyAction | null {
  const key = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;
  if (KEY_DIRS[key]) return { type: "steer", dir: KEY_DIRS[key] };
  if (key === " " || key === "Enter") return { type: "primary" };
  if (key === "p" || key === "Escape") return { type: "pause" };
  if (key === "m") return { type: "mute" };
  return null;
}

/** The direction of a swipe, or null if the finger barely moved. */
export function swipeDirection(dx: number, dy: number, minDistance = 20): Vec | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < minDistance) return null;
  return Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
}
