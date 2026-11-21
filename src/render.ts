// Draws the game onto the canvas. Reads the game and effects; never changes the rules.

import { CELL, COLS, EMOJI_FONT, H, HUD, PLAY_H, POWERS, ROWS, START_BPM, W } from "./config";
import type { Fx } from "./fx";
import type { Game } from "./game";

export interface View {
  /** Real time in ms, for animation only (bobbing, hue cycling). */
  now: number;
  /** Calm effects: no shake, no floor reshuffle or pulse, no wobble, no blinking. */
  calm: boolean;
  /** Touch-first device: talk about tapping instead of keys. */
  touch: boolean;
  best: number;
  /** The game that just ended beat the previous best. */
  newBest: boolean;
  muted: boolean;
  deathLine: string;
}

const neon = (hue: number, light = 60): string => `hsl(${hue}, 100%, ${light}%)`;

function hash(x: number, y: number, b: number): number {
  return ((x * 73856093) ^ (y * 19349663) ^ (b * 83492791)) >>> 0;
}

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't draw on a canvas, so the game can't run here.");
    this.ctx = ctx;
  }

  draw(game: Game, fx: Fx, view: View, dt: number): void {
    const { ctx } = this;
    // While calm, effects that pulse or reshuffle on the beat stand still.
    const pulse = view.calm ? 0 : fx.pulse;
    const beat = view.calm ? 0 : fx.beatCount;

    ctx.save();
    ctx.fillStyle = "#06000f";
    ctx.fillRect(0, 0, W, H);
    if (fx.shake > 0 && !view.calm) {
      ctx.translate((Math.random() - 0.5) * fx.shake * 16, (Math.random() - 0.5) * fx.shake * 16);
    }

    this.drawHud(game, view, pulse);

    ctx.save();
    ctx.translate(0, HUD);
    if (game.isActive("banana") && !view.calm) {
      ctx.translate(W / 2, PLAY_H / 2);
      ctx.rotate(Math.sin(view.now / 180) * 0.05);
      ctx.translate(-W / 2, -PLAY_H / 2);
    }
    this.drawFloor(pulse, beat);
    this.drawFood(game, view.now);
    this.drawPower(game, view);
    this.drawSnake(game, fx, view, pulse, dt);
    this.drawParticles(fx);
    for (const t of fx.texts) {
      this.glowText(t.text, t.x, t.y, t.size, t.hue, "Orbitron", "center", Math.min(1, t.life * 2));
    }
    ctx.restore();

    if (game.status === "title") this.drawTitle(view);
    else if (game.status === "dead") this.drawDead(game, view);
    else if (game.status === "paused") this.drawPaused(view);
    ctx.restore();
  }

  // ---- primitives -------------------------------------------------------------

  private glowText(
    text: string,
    x: number,
    y: number,
    size: number,
    hue: number,
    font = "Orbitron",
    align: CanvasTextAlign = "center",
    alpha = 1,
  ): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${size}px ${font}, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.shadowColor = neon(hue);
    ctx.shadowBlur = 18;
    ctx.fillStyle = neon(hue, 78);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  private emoji(char: string, x: number, y: number, size: number): void {
    const { ctx } = this;
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.fillStyle = "#fff"; // emoji inherit the fill's alpha, so make it opaque
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(char, x, y + size * 0.06);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private overlay(): void {
    this.ctx.fillStyle = "rgba(5, 0, 20, 0.72)";
    this.ctx.fillRect(0, 0, W, H);
  }

  /** Blinking prompt; steady in calm mode. */
  private prompt(text: string, y: number, size: number, view: View): void {
    if (view.calm || Math.floor(view.now / 450) % 2 === 0) this.glowText(text, W / 2, y, size, 320);
  }

  // ---- board ------------------------------------------------------------------

  private drawFloor(pulse: number, beat: number): void {
    const { ctx } = this;
    // A light-up disco floor that reshuffles every beat.
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        // Kept subtle on purpose so the party animals stay easy to spot.
        const lit = hash(x, y, beat) % 10 === 0;
        const hue = (x * 12 + y * 18 + beat * 25) % 360;
        const a = 0.025 + (lit ? 0.03 + pulse * 0.04 : 0);
        ctx.fillStyle = `hsla(${hue}, 100%, 55%, ${a})`;
        ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      }
    }
    ctx.save();
    ctx.strokeStyle = `hsla(${(beat * 40) % 360}, 100%, 60%, ${0.6 + pulse * 0.2})`;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12 + pulse * 8;
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, W - 3, PLAY_H - 3);
    ctx.restore();
  }

  private drawFood(game: Game, now: number): void {
    const { ctx } = this;
    const { food } = game;
    if (food.x < 0) return;
    const cx = (food.x + 0.5) * CELL;
    const cy = (food.y + 0.5) * CELL;
    const bob = Math.sin(now / 150) * 2;
    const hue = (now / 10) % 360;
    // Spotlight: a bright ring that slowly pulses, so the guest pops off the floor.
    const ring = CELL * (0.62 + Math.sin(now / 250) * 0.06);
    ctx.save();
    ctx.shadowColor = neon(hue);
    ctx.shadowBlur = 24;
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.strokeStyle = neon(hue, 70);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, ring, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    this.emoji(food.guest, cx, cy + bob, CELL * 0.95);
  }

  private drawPower(game: Game, view: View): void {
    const { power } = game;
    if (!power) return;
    const { ctx } = this;
    const p = POWERS[power.kind];
    const left = power.expires - game.time;
    let alpha = 1;
    if (left < 2000) {
      // About to vanish: blink, or fade out in calm mode.
      if (view.calm) alpha = Math.max(0.25, left / 2000);
      else if (Math.floor(view.now / 120) % 2 === 0) return;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate((power.x + 0.5) * CELL, (power.y + 0.5) * CELL);
    ctx.rotate(Math.sin(view.now / 200) * 0.3);
    ctx.shadowColor = neon(p.hue);
    ctx.shadowBlur = 25;
    ctx.strokeStyle = neon(p.hue);
    ctx.lineWidth = 2;
    ctx.strokeRect(-CELL * 0.45, -CELL * 0.45, CELL * 0.9, CELL * 0.9);
    ctx.shadowBlur = 0;
    this.emoji(p.emoji, 0, 0, CELL * 0.75);
    ctx.restore();
  }

  private drawSnake(game: Game, fx: Fx, view: View, pulse: number, dt: number): void {
    const { ctx } = this;
    const { now } = view;
    const disco = game.isActive("disco");
    const hot = game.isActive("hot");
    for (let i = game.snake.length - 1; i >= 0; i--) {
      const s = game.snake[i];
      // Disco flickers through random hues; calm mode keeps the smooth rainbow instead.
      const hue =
        disco && !view.calm
          ? hash(i, 0, Math.floor(now / 80)) % 360
          : hot
            ? 10 + ((i * 7 + now / 20) % 40)
            : (now / 15 + i * 22) % 360;
      const isHead = i === 0;
      const inset = isHead ? 1 : 3;
      const wiggle = isHead || view.calm ? 0 : Math.sin(now / 90 + i * 0.9) * 1.5 * (1 + pulse);
      const x = s.x * CELL + inset;
      const y = s.y * CELL + inset + wiggle;
      const size = CELL - inset * 2;

      ctx.save();
      if (disco) ctx.globalAlpha = 0.65;
      ctx.shadowColor = neon(hue);
      ctx.shadowBlur = 14 + pulse * 16;
      ctx.fillStyle = `hsla(${hue}, 100%, 55%, ${isHead ? 0.95 : 0.55})`;
      ctx.strokeStyle = neon(hue, 75);
      ctx.lineWidth = 2;
      this.roundRect(x, y, size, size, 7);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if (s.guest) this.emoji(s.guest, x + size / 2, y + size / 2, CELL * 0.62);
      if (hot && game.status === "playing" && Math.random() < 0.15 * (dt / 16.67))
        fx.burst(s.x, s.y, 20, 1, 1);
    }
    this.drawHead(game, now);
  }

  private drawHead(game: Game, now: number): void {
    const { ctx } = this;
    const head = game.snake[0];
    const { dir, food } = game;
    const cx = (head.x + 0.5) * CELL;
    const cy = (head.y + 0.5) * CELL;

    // Party hat (always points up, because physics is a social construct)
    ctx.save();
    ctx.translate(cx + 3, head.y * CELL + 2);
    ctx.rotate(0.25 + Math.sin(now / 120) * 0.12);
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, -16);
    ctx.closePath();
    ctx.fillStyle = neon((now / 8) % 360, 60);
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, -16, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Googly eyes that stare longingly at the next guest
    const perp = { x: -dir.y, y: dir.x };
    let lx = food.x - head.x;
    let ly = food.y - head.y;
    const len = Math.hypot(lx, ly) || 1;
    lx /= len;
    ly /= len;
    for (const side of [-1, 1]) {
      const ex = cx + dir.x * CELL * 0.12 + perp.x * side * CELL * 0.2;
      const ey = cy + dir.y * CELL * 0.12 + perp.y * side * CELL * 0.2;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ex, ey, CELL * 0.17, 0, Math.PI * 2);
      ctx.fill();
      if (game.status === "dead") {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        const r = CELL * 0.09;
        ctx.beginPath();
        ctx.moveTo(ex - r, ey - r);
        ctx.lineTo(ex + r, ey + r);
        ctx.moveTo(ex + r, ey - r);
        ctx.lineTo(ex - r, ey + r);
        ctx.stroke();
      } else {
        const jiggle = Math.sin(now / 45 + side) * 1.2;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(ex + lx * CELL * 0.07 + jiggle, ey + ly * CELL * 0.07, CELL * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawParticles(fx: Fx): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of fx.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = neon(p.hue, 65);
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  // ---- HUD and screens ----------------------------------------------------------

  private drawHud(game: Game, view: View, pulse: number): void {
    const { ctx } = this;
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, 0, W, HUD);
    this.glowText(`SCORE ${game.score}`, 16, HUD / 2, 18, 180, "Orbitron", "left");
    this.glowText(`BEST ${view.best}`, W - 16, HUD / 2, 18, 320, "Orbitron", "right");

    const bpmHue = 120 - Math.min(120, (game.bpm - START_BPM) * 1.05); // green -> red as it speeds up
    this.glowText(`♪ ${Math.round(game.bpm)} BPM`, W / 2, HUD / 2 - 6, 18 + pulse * 4, bpmHue);

    const active: string[] = [];
    for (const kind of ["hot", "banana", "disco"] as const) {
      const left = game.effectLeft(kind);
      if (left > 0) active.push(`${POWERS[kind].emoji}${Math.ceil(left / 1000)}`);
    }
    const status =
      (active.length ? active.join("  ") : `conga line: ${game.snake.length}`) + (view.muted ? "  🔇" : "");
    ctx.font = `12px Orbitron, ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText(status, W / 2, HUD - 10);
  }

  private drawTitle(view: View): void {
    const { ctx } = this;
    this.overlay();
    const hue = view.calm ? 300 : (view.now / 12) % 360;
    this.glowText("NEON CONGA", W / 2, H * 0.27, 64, hue, "Monoton");
    this.glowText("SNEK", W / 2, H * 0.4, 72, (hue + 120) % 360, "Monoton");
    this.glowText("Lead the conga line. Pick up party animals.", W / 2, H * 0.53, 16, 190);
    this.glowText("Don't trip over your own butt.", W / 2, H * 0.58, 16, 190);
    this.glowText("The longer the line, the faster the DJ plays.", W / 2, H * 0.63, 16, 50);
    ctx.font = `22px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("🌶️ speed   🍌 flipped   🪩 ghost   🧀 shrink", W / 2, H * 0.71);
    const help = view.touch ? "SWIPE TO STEER" : "ARROWS / WASD · P pause · M mute";
    this.glowText(help, W / 2, H * 0.79, 13, 280);
    this.prompt(view.touch ? "TAP TO PARTY" : "PRESS SPACE TO PARTY", H * 0.89, 24, view);
  }

  private drawDead(game: Game, view: View): void {
    this.overlay();
    this.glowText("PARTY'S OVER", W / 2, H * 0.3, 56, 340, "Monoton");
    this.glowText(view.deathLine, W / 2, H * 0.44, 18, 50);
    this.glowText(`SCORE ${game.score}  ·  CONGA LINE ${game.snake.length}`, W / 2, H * 0.54, 22, 180);
    if (view.newBest) this.glowText("★ NEW HIGH SCORE ★", W / 2, H * 0.62, 20, 60);
    this.prompt(view.touch ? "TAP TO PARTY AGAIN" : "SPACE TO PARTY AGAIN", H * 0.78, 22, view);
  }

  private drawPaused(view: View): void {
    this.overlay();
    this.glowText("PAUSED", W / 2, H * 0.42, 56, 190, "Monoton");
    this.glowText("The DJ is on a snack break.", W / 2, H * 0.55, 18, 50);
    if (view.touch) this.glowText("TAP RESUME TO KEEP DANCING", W / 2, H * 0.66, 16, 320);
  }
}
