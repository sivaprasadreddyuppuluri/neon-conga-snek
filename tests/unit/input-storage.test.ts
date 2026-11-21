import { describe, expect, it } from "vitest";
import { keyAction, swipeDirection } from "../../src/input";
import { loadFlag, loadNumber, saveValue } from "../../src/storage";

describe("keyboard (AC2, AC11, AC12)", () => {
  it.each([
    ["ArrowUp", { x: 0, y: -1 }],
    ["ArrowDown", { x: 0, y: 1 }],
    ["ArrowLeft", { x: -1, y: 0 }],
    ["ArrowRight", { x: 1, y: 0 }],
    ["w", { x: 0, y: -1 }],
    ["S", { x: 0, y: 1 }],
    ["a", { x: -1, y: 0 }],
    ["D", { x: 1, y: 0 }],
  ])("%s steers", (key, dir) => {
    expect(keyAction(key)).toEqual({ type: "steer", dir });
  });

  it.each([
    [" ", "primary"],
    ["Enter", "primary"],
    ["p", "pause"],
    ["P", "pause"],
    ["Escape", "pause"],
    ["m", "mute"],
  ] as const)("%j is %s", (key, type) => {
    expect(keyAction(key)).toEqual({ type });
  });

  it("ignores other keys", () => {
    expect(keyAction("Tab")).toBeNull();
    expect(keyAction("x")).toBeNull();
  });
});

describe("swipes (AC3)", () => {
  it("ignores movements under 20px", () => {
    expect(swipeDirection(19, -5)).toBeNull();
  });

  it.each([
    [40, 10, { x: 1, y: 0 }],
    [-40, 10, { x: -1, y: 0 }],
    [10, 40, { x: 0, y: 1 }],
    [10, -40, { x: 0, y: -1 }],
  ])("a swipe of (%i, %i) steers along its main direction", (dx, dy, dir) => {
    expect(swipeDirection(dx, dy)).toEqual(dir);
  });
});

describe("storage (AC13)", () => {
  function memory(): Storage {
    const data = new Map<string, string>();
    return {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
      clear: () => data.clear(),
      key: () => null,
      get length() {
        return data.size;
      },
    };
  }
  const broken = (): Storage => {
    throw new Error("SecurityError: storage disabled");
  };

  it("round-trips a number", () => {
    const s = memory();
    saveValue("best", 420, () => s);
    expect(loadNumber("best", () => s)).toBe(420);
  });

  it("reads a missing or garbled number as 0", () => {
    const s = memory();
    expect(loadNumber("best", () => s)).toBe(0);
    s.setItem("best", "lots");
    expect(loadNumber("best", () => s)).toBe(0);
  });

  it("round-trips a flag, with a default when unset", () => {
    const s = memory();
    expect(loadFlag("calm", true, () => s)).toBe(true);
    saveValue("calm", false, () => s);
    expect(loadFlag("calm", true, () => s)).toBe(false);
  });

  it("keeps working when storage is unavailable", () => {
    expect(loadNumber("best", broken)).toBe(0);
    expect(loadFlag("calm", false, broken)).toBe(false);
    expect(() => saveValue("best", 1, broken)).not.toThrow();
  });
});
