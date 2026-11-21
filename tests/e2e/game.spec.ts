import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);
}

const board = (page: Page) => page.getByRole("img", { name: /Neon Conga Snek game board/ });
const status = (page: Page) => page.locator("main").getAttribute("data-status");
const announcement = (page: Page) => page.getByRole("status");
const playButton = (page: Page) => page.locator("#btn-play");

/** `?debug` exposes the game so a test can set up a crash without playing for minutes. */
async function crash(page: Page): Promise<void> {
  await page.evaluate(() => {
    const g = (window as unknown as { __snek: import("../../src/game").Game }).__snek;
    g.snake = [
      { x: 5, y: 5, guest: null },
      { x: 6, y: 5, guest: null },
      { x: 6, y: 6, guest: null },
      { x: 5, y: 6, guest: null },
      { x: 4, y: 6, guest: null },
    ];
    g.dir = { x: 0, y: 1 };
    g.queue = [];
  });
  await expect.poll(() => status(page)).toBe("dead");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/?debug");
});

test("title screen: named board, heading, controls, no axe violations (AC1, AC15)", async ({ page }) => {
  await expect(page).toHaveTitle("Neon Conga Snek");
  await expect(page.getByRole("heading", { level: 1, name: "Neon Conga Snek" })).toBeAttached();
  await expect(board(page)).toBeVisible();
  await expect(playButton(page)).toHaveText(/Start/);
  expect(await status(page)).toBe("title");
  await expectAccessible(page);
});

test("keyboard: Space starts, P pauses and resumes (AC1, AC11, AC21)", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard flow is a desktop check");
  await page.keyboard.press("Space");
  await expect.poll(() => status(page)).toBe("playing");
  await expect(announcement(page)).toHaveText(/started/i);
  await expectAccessible(page);

  await page.keyboard.press("p");
  await expect.poll(() => status(page)).toBe("paused");
  await expect(announcement(page)).toHaveText(/paused/i);
  await expect(playButton(page)).toHaveText(/Resume/);
  await expectAccessible(page);

  await page.keyboard.press("p");
  await expect.poll(() => status(page)).toBe("playing");
});

test("Space on a focused button presses only that button (no double toggle)", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard flow is a desktop check");
  await playButton(page).focus();
  await page.keyboard.press("Space");
  await expect.poll(() => status(page)).toBe("playing");
  await page.keyboard.press("Space");
  await expect.poll(() => status(page)).toBe("paused");
});

test("on-screen buttons pause, mute and calm the effects (AC19)", async ({ page }) => {
  await playButton(page).click();
  await expect.poll(() => status(page)).toBe("playing");
  await expect(playButton(page)).toHaveText(/Pause/);
  await playButton(page).click();
  await expect.poll(() => status(page)).toBe("paused");

  const sound = page.getByRole("button", { name: "Sound" });
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("m");
  await expect(sound).toHaveAttribute("aria-pressed", "true");

  const calm = page.getByRole("button", { name: "Calm effects" });
  const before = await calm.getAttribute("aria-pressed");
  await calm.click();
  await expect(calm).not.toHaveAttribute("aria-pressed", before!);
  await expectAccessible(page);
});

test("buttons are big enough to tap (WCAG 2.5.8)", async ({ page }) => {
  for (const button of await page.getByRole("button").all()) {
    const box = (await button.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test("leaving the window pauses the game (AC18)", async ({ page }) => {
  await playButton(page).click();
  await expect.poll(() => status(page)).toBe("playing");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(() => status(page)).toBe("paused");
});

test("game over announces the score and can start again (AC14, AC21)", async ({ page }) => {
  await board(page).click();
  await expect.poll(() => status(page)).toBe("playing");
  await crash(page);
  await expect(announcement(page)).toHaveText(/game over.*score 0/i);
  await expect(playButton(page)).toHaveText(/Play again/);
  await expectAccessible(page);
  await board(page).click();
  await expect.poll(() => status(page)).toBe("playing");
});

test("the best score survives a reload (AC13)", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("neon-conga-snek-best", "230"));
  await page.reload();
  await expect(page.locator("#scoreline")).toHaveText(/Best score 230/);
});

test("the board fits the screen without sideways scrolling (AC16)", async ({ page }) => {
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 700 });
    const box = (await board(page).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    const scrolls = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(scrolls).toBe(false);
  }
});

test("touch: a tap starts, a swipe steers (AC3)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch is a phone check");
  await board(page).tap();
  await expect.poll(() => status(page)).toBe("playing");
  const box = (await board(page).boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.evaluate(
    ({ cx, cy }) => {
      const canvas = document.querySelector("canvas")!;
      const touch = (y: number) => new Touch({ identifier: 1, target: canvas, clientX: cx, clientY: y });
      canvas.dispatchEvent(
        new TouchEvent("touchstart", { touches: [touch(cy)], changedTouches: [touch(cy)], bubbles: true }),
      );
      canvas.dispatchEvent(
        new TouchEvent("touchend", { touches: [], changedTouches: [touch(cy - 60)], bubbles: true }),
      );
    },
    { cx, cy },
  );
  const dir = await page.evaluate(() => {
    const g = (window as unknown as { __snek: import("../../src/game").Game }).__snek;
    return g.queue[0] ?? g.dir;
  });
  expect(dir).toEqual({ x: 0, y: -1 });
});

test("only beating the best score counts as a new high score (AC14)", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("neon-conga-snek-best", "50"));
  await page.reload();
  await playButton(page).click();
  await page.evaluate(() => ((window as unknown as { __snek: { score: number } }).__snek.score = 50));
  await crash(page);
  await expect(announcement(page)).not.toHaveText(/new high score/i);

  await playButton(page).click();
  await expect.poll(() => status(page)).toBe("playing");
  await page.evaluate(() => ((window as unknown as { __snek: { score: number } }).__snek.score = 60));
  await crash(page);
  await expect(announcement(page)).toHaveText(/new high score/i);
  await expect(page.locator("#scoreline")).toHaveText(/Best score 60/);
});

test("browser shortcuts with Ctrl/Cmd are left alone", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard flow is a desktop check");
  await page.keyboard.press("Space");
  await expect.poll(() => status(page)).toBe("playing");
  await page.keyboard.press("Control+m");
  await page.keyboard.press("Meta+p");
  expect(await status(page)).toBe("playing");
  await expect(page.getByRole("button", { name: "Sound" })).toHaveAttribute("aria-pressed", "true");
});

test("after clicking Sound, Space still pauses the game", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard flow is a desktop check");
  await playButton(page).click();
  await page.getByRole("button", { name: "Sound" }).click();
  await page.keyboard.press("Space");
  await expect.poll(() => status(page)).toBe("paused");
});

for (const [width, height] of [
  [320, 568],
  [380, 420],
  [568, 320],
  [360, 360],
]) {
  test(`board and buttons fit a ${width}×${height} screen without scrolling (AC16)`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const scrolls = await page.evaluate(
      () =>
        document.documentElement.scrollHeight > window.innerHeight + 1 ||
        document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(scrolls).toBe(false);
    for (const button of await page.getByRole("button").all()) {
      const box = (await button.boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(height);
    }
  });
}
