// The rules of Neon Conga Snek, with no drawing, input or audio in here.
// Time is the game's own clock: it only moves while the game is playing, so pausing
// freezes power-up effects, waiting power-ups and the next power-up's arrival.
// Things worth reacting to (sound, particles, announcements) come back as events.

import {
  BPM_PER_GUEST,
  CHEESE_LOSS,
  CHEESE_MIN_LENGTH,
  COLS,
  EFFECT_MS,
  FIRST_POWER_MS,
  GUESTS,
  MAX_BPM,
  MAX_QUEUED_TURNS,
  POWER_GAP_MS,
  POWER_GAP_RANDOM_MS,
  POWER_LIFETIME_MS,
  ROWS,
  START_BPM,
  START_LENGTH,
  type PowerKind,
  type TimedPower,
} from "./config";

export type Vec = { x: number; y: number };
export type Segment = Vec & { guest: string | null };
export type Status = "title" | "playing" | "paused" | "dead";
export type PowerUp = Vec & { kind: PowerKind; expires: number };
export type Food = Vec & { guest: string };

export type GameEvent =
  | { type: "eat"; x: number; y: number; guest: string }
  | { type: "power"; x: number; y: number; kind: PowerKind }
  | { type: "shrink"; cells: Vec[] }
  | { type: "layer"; layers: number }
  | { type: "wrap"; x: number; y: number }
  | { type: "die"; x: number; y: number; score: number };

export const bpmFor = (len: number): number =>
  Math.min(MAX_BPM, START_BPM + (len - START_LENGTH) * BPM_PER_GUEST);

export const layersFor = (len: number): number => (len >= 20 ? 4 : len >= 12 ? 3 : len >= 6 ? 2 : 1);

export class Game {
  status: Status = "title";
  /** Game clock in ms; only advances while playing. */
  time = 0;
  snake: Segment[] = [];
  dir: Vec = { x: 1, y: 0 };
  queue: Vec[] = [];
  food: Food = { x: -1, y: -1, guest: GUESTS[0] };
  power: PowerUp | null = null;
  nextPowerAt = 0;
  /** Game-clock time at which each timed power-up wears off. */
  effects: Record<TimedPower, number> = { hot: 0, banana: 0, disco: 0 };
  score = 0;

  private accumulator = 0;
  private readonly rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
    this.reset();
  }

  get bpm(): number {
    return bpmFor(this.snake.length);
  }

  get layers(): number {
    return layersFor(this.snake.length);
  }

  isActive(kind: TimedPower): boolean {
    return this.time < this.effects[kind];
  }

  /** Milliseconds of the effect still to run, 0 if it's off. */
  effectLeft(kind: TimedPower): number {
    return Math.max(0, this.effects[kind] - this.time);
  }

  /** Milliseconds between moves: one 16th note, or half that on hot sauce. */
  moveInterval(): number {
    const sixteenth = 60000 / this.bpm / 4;
    return this.isActive("hot") ? sixteenth / 2 : sixteenth;
  }

  start(): void {
    this.reset();
    this.status = "playing";
  }

  pause(): void {
    if (this.status === "playing") this.status = "paused";
  }

  togglePause(): void {
    if (this.status === "playing") this.status = "paused";
    else if (this.status === "paused") this.status = "playing";
  }

  steer(d: Vec): void {
    if (this.status !== "playing") return;
    if (this.isActive("banana")) d = { x: 0 - d.x, y: 0 - d.y };
    const lastDir = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
    if (d.x === -lastDir.x && d.y === -lastDir.y) return; // no instant U-turn
    if (d.x === lastDir.x && d.y === lastDir.y) return;
    if (this.queue.length < MAX_QUEUED_TURNS) this.queue.push(d);
  }

  /** Let `dt` ms of game time pass: move as often as the tempo says, spawn and expire power-ups. */
  advance(dt: number): GameEvent[] {
    if (this.status !== "playing") return [];
    const events: GameEvent[] = [];
    this.time += dt;
    this.accumulator += dt;
    let interval = this.moveInterval();
    while (this.accumulator >= interval && this.status === "playing") {
      this.accumulator -= interval;
      events.push(...this.step());
      interval = this.moveInterval();
    }
    this.updatePowerSpawns();
    return events;
  }

  /** One move of the line. Exposed for tests; normally driven by advance(). */
  step(): GameEvent[] {
    const events: GameEvent[] = [];
    if (this.queue.length) this.dir = this.queue.shift()!;
    const head = this.snake[0];
    const rawX = head.x + this.dir.x;
    const rawY = head.y + this.dir.y;
    const nx = (rawX + COLS) % COLS;
    const ny = (rawY + ROWS) % ROWS;
    const eating = nx === this.food.x && ny === this.food.y;

    // When not eating, the tail moves out of the way, so it doesn't count.
    const body = eating ? this.snake : this.snake.slice(0, -1);
    if (!this.isActive("disco") && body.some((s) => s.x === nx && s.y === ny)) {
      this.status = "dead";
      events.push({ type: "die", x: head.x, y: head.y, score: this.score });
      return events;
    }

    const tail = this.snake[this.snake.length - 1];
    const oldTail = { x: tail.x, y: tail.y };
    for (let i = this.snake.length - 1; i > 0; i--) {
      this.snake[i].x = this.snake[i - 1].x;
      this.snake[i].y = this.snake[i - 1].y;
    }
    head.x = nx;
    head.y = ny;

    if (rawX !== nx || rawY !== ny) events.push({ type: "wrap", x: nx, y: ny });

    if (eating) {
      const layersBefore = this.layers;
      this.score += 10 * layersBefore;
      this.snake.push({ ...oldTail, guest: this.food.guest });
      events.push({ type: "eat", x: nx, y: ny, guest: this.food.guest });
      this.spawnFood();
      if (this.layers > layersBefore) events.push({ type: "layer", layers: this.layers });
    }

    if (this.power && nx === this.power.x && ny === this.power.y) events.push(...this.takePower());
    return events;
  }

  // ---- internals ----------------------------------------------------------------

  private reset(): void {
    const cy = Math.floor(ROWS / 2);
    this.snake = Array.from({ length: START_LENGTH }, (_, i) => ({ x: 8 - i, y: cy, guest: null }));
    this.dir = { x: 1, y: 0 };
    this.queue = [];
    this.score = 0;
    this.time = 0;
    this.accumulator = 0;
    this.effects = { hot: 0, banana: 0, disco: 0 };
    this.power = null;
    this.nextPowerAt = FIRST_POWER_MS;
    this.spawnFood();
  }

  private pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.rng() * arr.length)];
  }

  private occupied(x: number, y: number): boolean {
    return (
      this.snake.some((s) => s.x === x && s.y === y) ||
      (this.food.x === x && this.food.y === y) ||
      (this.power !== null && this.power.x === x && this.power.y === y)
    );
  }

  /** A random free cell, or null if the line fills the whole floor. */
  private freeCell(): Vec | null {
    for (let tries = 0; tries < 50; tries++) {
      const x = Math.floor(this.rng() * COLS);
      const y = Math.floor(this.rng() * ROWS);
      if (!this.occupied(x, y)) return { x, y };
    }
    // Crowded floor (or a predictable rng in tests): fall back to listing the free cells.
    const free: Vec[] = [];
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) if (!this.occupied(x, y)) free.push({ x, y });
    return free.length ? this.pick(free) : null;
  }

  private spawnFood(): void {
    this.food = { x: -1, y: -1, guest: this.pick(GUESTS) };
    const cell = this.freeCell();
    if (cell) Object.assign(this.food, cell);
  }

  private nextPowerGap(): number {
    return POWER_GAP_MS + this.rng() * POWER_GAP_RANDOM_MS;
  }

  private takePower(): GameEvent[] {
    const { x, y, kind } = this.power!;
    const events: GameEvent[] = [{ type: "power", x, y, kind }];
    if (kind === "cheese") {
      const cells: Vec[] = [];
      for (let i = 0; i < CHEESE_LOSS && this.snake.length > START_LENGTH; i++) {
        const gone = this.snake.pop()!;
        cells.push({ x: gone.x, y: gone.y });
      }
      events.push({ type: "shrink", cells });
    } else {
      this.effects[kind] = this.time + EFFECT_MS;
    }
    this.power = null;
    this.nextPowerAt = this.time + this.nextPowerGap();
    return events;
  }

  private updatePowerSpawns(): void {
    if (this.status !== "playing") return;
    const now = this.time;
    if (this.power && now > this.power.expires) {
      this.power = null;
      this.nextPowerAt = now + this.nextPowerGap();
    }
    if (!this.power && now >= this.nextPowerAt) {
      const kinds: PowerKind[] = ["hot", "banana", "disco"];
      if (this.snake.length > CHEESE_MIN_LENGTH) kinds.push("cheese");
      const cell = this.freeCell();
      if (cell) this.power = { ...cell, kind: this.pick(kinds), expires: now + POWER_LIFETIME_MS };
    }
  }
}
