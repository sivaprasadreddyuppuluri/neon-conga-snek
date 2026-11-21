// Visual-only state: beat pulse, screen shake, particles and floating text.
// None of this affects the rules; it is driven by game events and the music's beat.

import { CELL } from "./config";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  hue: number;
  size: number;
}

export interface FloatText {
  text: string;
  x: number;
  y: number;
  life: number;
  hue: number;
  size: number;
}

export class Fx {
  /** 1 on a beat, fading to 0. */
  pulse = 0;
  /** Counts beats; the dance floor reshuffles on each. */
  beatCount = 0;
  shake = 0;
  particles: Particle[] = [];
  texts: FloatText[] = [];

  clear(): void {
    this.particles = [];
    this.texts = [];
  }

  /** Called by the music on every 16th note. */
  onStep(step: number): void {
    if (step % 4 === 0) {
      this.pulse = 1;
      this.beatCount++;
    } else if (step % 2 === 0) {
      this.pulse = Math.max(this.pulse, 0.45);
    }
  }

  /** A burst of particles from the centre of a grid cell. */
  burst(cx: number, cy: number, hue: number, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (0.4 + Math.random()) * speed;
      const max = 0.5 + Math.random() * 0.6;
      this.particles.push({
        x: (cx + 0.5) * CELL,
        y: (cy + 0.5) * CELL,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: max,
        max,
        hue: hue + Math.random() * 60 - 30,
        size: 2 + Math.random() * 3,
      });
    }
  }

  floatText(text: string, x: number, y: number, hue: number, size: number, life: number): void {
    this.texts.push({ text, x, y, hue, size, life });
  }

  /** Age everything by dt ms. `idle` adds a gentle shimmer on the title screen. */
  update(dt: number, idle: boolean): void {
    const frames = dt / 16.67; // chances below are per 60 Hz frame
    if (idle) {
      if (Math.random() < 0.05 * frames) this.pulse = 0.6;
      if (Math.random() < 0.02 * frames) this.beatCount++;
    }
    this.pulse = Math.max(0, this.pulse - dt / 220);
    this.shake = Math.max(0, this.shake - dt / 500);

    for (const p of this.particles) {
      p.x += p.vx * frames;
      p.y += p.vy * frames;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt / 1000;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const t of this.texts) {
      t.life -= dt / 1000;
      t.y -= dt * 0.03;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
  }
}
