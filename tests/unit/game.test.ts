import { describe, expect, it } from "vitest";
import { COLS, EFFECT_MS, ROWS, START_BPM } from "../../src/config";
import { Game, bpmFor, layersFor } from "../../src/game";

/** A game that is already playing, with randomness fixed so spawns are predictable. */
function playing(rng: () => number = () => 0.5): Game {
  const g = new Game(rng);
  g.start();
  return g;
}

/** Put the food somewhere harmless so it doesn't interfere with a test. */
function parkFood(g: Game, x = 0, y = 0): void {
  g.food = { x, y, guest: "🦩" };
}

/** Replace the line with the given cells (head first). */
function setSnake(g: Game, cells: [number, number][]): void {
  g.snake = cells.map(([x, y]) => ({ x, y, guest: null }));
}

const RIGHT = { x: 1, y: 0 };
const LEFT = { x: -1, y: 0 };
const UP = { x: 0, y: -1 };
const DOWN = { x: 0, y: 1 };

describe("start", () => {
  it("starts with a line of three heading right, score 0, base tempo", () => {
    const g = playing();
    expect(g.status).toBe("playing");
    expect(g.snake).toHaveLength(3);
    expect(g.dir).toEqual(RIGHT);
    expect(g.score).toBe(0);
    expect(g.bpm).toBe(START_BPM);
    expect(g.layers).toBe(1);
  });

  it("places the first guest on a free cell", () => {
    const g = playing();
    expect(g.snake.some((s) => s.x === g.food.x && s.y === g.food.y)).toBe(false);
    expect(g.food.x).toBeGreaterThanOrEqual(0);
    expect(g.food.x).toBeLessThan(COLS);
  });
});

describe("steering (AC2)", () => {
  it("ignores a direction straight back into the line", () => {
    const g = playing();
    g.steer(LEFT);
    expect(g.queue).toEqual([]);
  });

  it("ignores the direction it is already going", () => {
    const g = playing();
    g.steer(RIGHT);
    expect(g.queue).toEqual([]);
  });

  it("queues up to three turns, judged against the last queued one", () => {
    const g = playing();
    g.steer(UP);
    g.steer(DOWN); // opposite of the queued UP
    g.steer(LEFT);
    g.steer(DOWN);
    g.steer(RIGHT); // fourth turn: queue full
    expect(g.queue).toEqual([UP, LEFT, DOWN]);
  });

  it("applies one queued turn per move", () => {
    const g = playing();
    parkFood(g);
    g.steer(UP);
    g.steer(LEFT);
    g.step();
    expect(g.dir).toEqual(UP);
    g.step();
    expect(g.dir).toEqual(LEFT);
  });

  it("does nothing unless the game is playing", () => {
    const g = new Game(() => 0.5);
    g.steer(UP);
    expect(g.queue).toEqual([]);
  });
});

describe("movement and wrapping (AC4)", () => {
  it("moves the whole line one cell, each segment following the one ahead", () => {
    const g = playing();
    parkFood(g);
    setSnake(g, [
      [5, 5],
      [4, 5],
      [3, 5],
    ]);
    g.step();
    expect(g.snake.map((s) => [s.x, s.y])).toEqual([
      [6, 5],
      [5, 5],
      [4, 5],
    ]);
  });

  it.each([
    ["right edge", [COLS - 1, 5], RIGHT, [0, 5]],
    ["left edge", [0, 5], LEFT, [COLS - 1, 5]],
    ["top edge", [5, 0], UP, [5, ROWS - 1]],
    ["bottom edge", [5, ROWS - 1], DOWN, [5, 0]],
  ] as const)("wraps through the %s", (_name, from, dir, to) => {
    const g = playing();
    parkFood(g, 10, 10);
    setSnake(g, [[from[0], from[1]]]);
    g.dir = dir;
    const events = g.step();
    expect([g.snake[0].x, g.snake[0].y]).toEqual(to);
    expect(events).toContainEqual({ type: "wrap", x: to[0], y: to[1] });
  });
});

describe("collisions (AC5)", () => {
  // A loop of four: the head at (5,5) going down runs into (5,6).
  const square: [number, number][] = [
    [5, 5],
    [6, 5],
    [6, 6],
    [5, 6],
    [4, 6],
  ];

  it("ends the game when the head runs into the line", () => {
    const g = playing();
    parkFood(g);
    setSnake(g, square);
    g.dir = DOWN;
    const events = g.step();
    expect(g.status).toBe("dead");
    expect(events).toContainEqual({ type: "die", x: 5, y: 5, score: 0 });
  });

  it("lets the head move into the cell the tail is just leaving", () => {
    const g = playing();
    parkFood(g);
    setSnake(g, [
      [5, 5],
      [6, 5],
      [6, 6],
      [5, 6],
    ]);
    g.dir = DOWN;
    g.step();
    expect(g.status).toBe("playing");
    expect([g.snake[0].x, g.snake[0].y]).toEqual([5, 6]);
  });

  it("but not when that move also eats, because then the tail stays", () => {
    const g = playing();
    setSnake(g, [
      [5, 5],
      [6, 5],
      [6, 6],
      [5, 6],
    ]);
    g.food = { x: 5, y: 6, guest: "🐸" };
    g.dir = DOWN;
    g.step();
    expect(g.status).toBe("dead");
  });

  it("passes through the line while the disco ball is active", () => {
    const g = playing();
    parkFood(g);
    setSnake(g, square);
    g.effects.disco = g.time + EFFECT_MS;
    g.dir = DOWN;
    g.step();
    expect(g.status).toBe("playing");
  });
});

describe("eating (AC6, AC7, AC8)", () => {
  it("adds a segment showing the guest, scores, speeds up and respawns the guest", () => {
    const g = playing();
    const head = g.snake[0];
    g.food = { x: head.x + 1, y: head.y, guest: "🦖" };
    const events = g.step();
    expect(g.snake).toHaveLength(4);
    expect(g.snake[3].guest).toBe("🦖");
    expect(g.score).toBe(10);
    expect(g.bpm).toBe(START_BPM + 3);
    expect(events).toContainEqual(expect.objectContaining({ type: "eat", guest: "🦖" }));
    expect(g.snake.some((s) => s.x === g.food.x && s.y === g.food.y)).toBe(false);
  });

  it("multiplies the points by the number of layers playing before the guest joins", () => {
    const g = playing();
    // 12 segments → 3 layers
    setSnake(
      g,
      Array.from({ length: 12 }, (_, i) => [12 - i, 3] as [number, number]),
    );
    g.food = { x: 13, y: 3, guest: "🐙" };
    g.step();
    expect(g.score).toBe(30);
  });

  it("announces a new instrument layer when the line reaches 6", () => {
    const g = playing();
    setSnake(g, [
      [7, 3],
      [6, 3],
      [5, 3],
      [4, 3],
      [3, 3],
    ]);
    g.food = { x: 8, y: 3, guest: "🐙" };
    const events = g.step();
    expect(g.layers).toBe(2);
    expect(events).toContainEqual({ type: "layer", layers: 2 });
  });

  it.each([
    [3, 76],
    [4, 79],
    [10, 97],
    [41, 190],
    [100, 190],
  ])("tempo for a line of %i is %i BPM", (len, bpm) => {
    expect(bpmFor(len)).toBe(bpm);
  });

  it.each([
    [5, 1],
    [6, 2],
    [11, 2],
    [12, 3],
    [19, 3],
    [20, 4],
  ])("a line of %i plays %i layer(s)", (len, layers) => {
    expect(layersFor(len)).toBe(layers);
  });

  it("moves once per 16th note, twice as often with hot sauce", () => {
    const g = playing();
    expect(g.moveInterval()).toBeCloseTo(60000 / 76 / 4);
    g.effects.hot = g.time + EFFECT_MS;
    expect(g.moveInterval()).toBeCloseTo(60000 / 76 / 8);
  });
});

describe("game clock (AC7, AC17)", () => {
  it("steps whenever a full move interval has passed", () => {
    const g = playing();
    parkFood(g);
    const x = g.snake[0].x;
    g.advance(g.moveInterval() * 2 + 1);
    expect(g.snake[0].x).toBe(x + 2);
  });

  it("does not run while paused", () => {
    const g = playing();
    parkFood(g);
    g.togglePause();
    const before = g.time;
    const x = g.snake[0].x;
    g.advance(10_000);
    expect(g.status).toBe("paused");
    expect(g.time).toBe(before);
    expect(g.snake[0].x).toBe(x);
  });

  it("keeps a power-up effect's remaining time across a pause", () => {
    const g = playing();
    parkFood(g);
    g.effects.hot = g.time + EFFECT_MS;
    g.togglePause();
    g.advance(EFFECT_MS * 2);
    g.togglePause();
    expect(g.effectLeft("hot")).toBe(EFFECT_MS);
  });
});

describe("power-ups (AC9, AC10)", () => {
  function withPower(kind: "hot" | "banana" | "disco" | "cheese"): Game {
    const g = playing();
    parkFood(g);
    const head = g.snake[0];
    g.power = { x: head.x + 1, y: head.y, kind, expires: g.time + 8000 };
    return g;
  }

  it.each(["hot", "banana", "disco"] as const)("%s lasts six seconds", (kind) => {
    const g = withPower(kind);
    const events = g.step();
    expect(events).toContainEqual(expect.objectContaining({ type: "power", kind }));
    expect(g.power).toBeNull();
    expect(g.effectLeft(kind)).toBe(EFFECT_MS);
  });

  it("banana flips the controls", () => {
    const g = withPower("banana");
    g.step();
    g.steer(UP);
    expect(g.queue).toEqual([DOWN]);
  });

  it("cheese sends three guests home", () => {
    const g = withPower("cheese");
    setSnake(
      g,
      Array.from({ length: 10 }, (_, i) => [10 - i, 3] as [number, number]),
    );
    g.power = { x: 11, y: 3, kind: "cheese", expires: g.time + 8000 };
    g.step();
    expect(g.snake).toHaveLength(7);
  });

  it("cheese never shrinks the line below three", () => {
    const g = withPower("cheese");
    setSnake(g, [
      [7, 3],
      [6, 3],
      [5, 3],
      [4, 3],
    ]);
    g.power = { x: 8, y: 3, kind: "cheese", expires: g.time + 8000 };
    g.step();
    expect(g.snake).toHaveLength(3);
  });

  it("cheese drops the music layers again when the line gets shorter", () => {
    const g = withPower("cheese");
    setSnake(
      g,
      Array.from({ length: 13 }, (_, i) => [15 - i, 3] as [number, number]),
    );
    g.power = { x: 16, y: 3, kind: "cheese", expires: g.time + 8000 };
    expect(g.layers).toBe(3);
    g.step();
    expect(g.layers).toBe(2);
  });

  it("cheese only appears once the line is longer than seven", () => {
    const short = playing(() => 0.99); // rng picks the last kind on offer
    short.nextPowerAt = short.time;
    short.advance(1);
    expect(short.power?.kind).toBe("disco");

    const long = playing(() => 0.99);
    setSnake(
      long,
      Array.from({ length: 8 }, (_, i) => [10 - i, 3] as [number, number]),
    );
    long.nextPowerAt = long.time;
    long.advance(1);
    expect(long.power?.kind).toBe("cheese");
  });

  it("the first power-up arrives six seconds into the game", () => {
    const g = playing();
    parkFood(g);
    g.dir = RIGHT;
    g.advance(5999);
    expect(g.power).toBeNull();
    g.advance(2);
    expect(g.power).not.toBeNull();
  });

  it("an uncollected power-up disappears after eight seconds", () => {
    const g = playing();
    parkFood(g);
    g.power = { x: 0, y: ROWS - 1, kind: "hot", expires: g.time + 8000 };
    g.nextPowerAt = Infinity;
    g.snake = [{ x: 10, y: 10, guest: null }];
    g.advance(7999);
    expect(g.power).not.toBeNull();
    g.advance(2);
    expect(g.power).toBeNull();
  });

  it("a waiting power-up does not expire while paused (AC17)", () => {
    const g = playing();
    parkFood(g);
    g.power = { x: 0, y: ROWS - 1, kind: "hot", expires: g.time + 8000 };
    g.togglePause();
    g.advance(20_000);
    g.togglePause();
    expect(g.power).not.toBeNull();
  });
});

describe("pause and game over (AC11, AC14)", () => {
  it("toggles between playing and paused", () => {
    const g = playing();
    g.togglePause();
    expect(g.status).toBe("paused");
    g.togglePause();
    expect(g.status).toBe("playing");
  });

  it("pause() only pauses a running game", () => {
    const g = new Game(() => 0.5);
    g.pause();
    expect(g.status).toBe("title");
  });

  it("can start again after game over with a fresh line", () => {
    const g = playing();
    g.score = 120;
    g.status = "dead";
    g.start();
    expect(g.status).toBe("playing");
    expect(g.score).toBe(0);
    expect(g.snake).toHaveLength(3);
  });
});
