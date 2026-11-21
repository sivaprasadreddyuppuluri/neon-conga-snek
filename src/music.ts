// A tiny Web Audio step sequencer. No samples, everything is synthesized.
// The tempo (bpm) and number of instrument layers are set by the game.

interface Chord {
  root: number; // MIDI note
  minor: boolean;
}

// Am - F - C - G, the most danceable four chords in the universe.
const CHORDS: Chord[] = [
  { root: 57, minor: true },
  { root: 53, minor: false },
  { root: 48, minor: false },
  { root: 55, minor: false },
];

const BASS_STEPS: Record<number, number> = { 0: 0, 3: 0, 6: 12, 8: 0, 10: 0, 11: 7, 14: 12 };
const ARP_PATTERN = [0, 1, 2, 3, 2, 1, 2, 3];
const COWBELL_STEPS = [2, 6, 10, 13, 14];

function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export class NeonBeat {
  bpm = 96;
  layers = 1;
  /** Called (roughly in sync with the audio) on every 16th-note step. */
  onStep: ((step: number) => void) | null = null;

  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private muted = false;

  get isMuted(): boolean {
    return this.muted;
  }

  private ensure(): AudioContext {
    if (!this.ctx) {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      const comp = ctx.createDynamicsCompressor();
      this.master.connect(comp);
      comp.connect(ctx.destination);

      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    void this.ctx.resume();
    return this.ctx;
  }

  start(): void {
    const ctx = this.ensure();
    if (this.timer !== null) return;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.06;
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  // ---- scheduler ----------------------------------------------------------

  private tick(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    // If the tab was asleep, don't machine-gun all the missed notes.
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;

    while (this.nextTime < ctx.currentTime + 0.12) {
      const s = this.step;
      this.playStep(s, this.nextTime);
      const delayMs = (this.nextTime - ctx.currentTime) * 1000;
      window.setTimeout(() => this.onStep?.(s), Math.max(0, delayMs));
      this.nextTime += 60 / this.bpm / 4;
      this.step = (s + 1) % 64;
    }
  }

  private playStep(step: number, t: number): void {
    const chord = CHORDS[Math.floor(step / 16) % CHORDS.length];
    const s = step % 16;
    const tones = [0, chord.minor ? 3 : 4, 7, 12];
    const sixteenth = 60 / this.bpm / 4;

    // Layer 1: drums + bass
    if (s % 4 === 0) this.kick(t);
    if (s === 4 || s === 12) this.snare(t);
    if (s % 4 === 2) this.hat(t, false);
    if (s in BASS_STEPS) this.bass(chord.root - 12 + BASS_STEPS[s], t, sixteenth * 1.6);

    // Layer 2: arpeggiator
    if (this.layers >= 2) {
      const note = chord.root + 12 + tones[ARP_PATTERN[s % 8]];
      this.tone("square", midiToFreq(note), t, sixteenth * 0.8, 0.05);
    }

    // Layer 3: busy hats + sparkly triplet-ish bleeps
    if (this.layers >= 3) {
      if (s % 2 === 1) this.hat(t, false);
      if (s % 3 === 0) {
        const note = chord.root + 24 + tones[(step * 7) % 4];
        this.tone("triangle", midiToFreq(note), t, 0.12, 0.07);
      }
    }

    // Layer 4: MORE COWBELL
    if (this.layers >= 4 && COWBELL_STEPS.includes(s)) this.cowbell(t);
  }

  // ---- instruments --------------------------------------------------------

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private tone(
    type: OscillatorType,
    freq: number,
    t: number,
    dur: number,
    vol: number,
    dest?: AudioNode,
  ): OscillatorNode {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    this.env(g, t, vol, 0.005, dur);
    o.connect(g);
    g.connect(dest ?? this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  private kick(t: number): void {
    const o = this.tone("sine", 160, t, 0.32, 0.9);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  }

  private noiseHit(t: number, vol: number, dur: number, highpass: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = highpass;
    const g = ctx.createGain();
    this.env(g, t, vol, 0.002, dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  private snare(t: number): void {
    this.noiseHit(t, 0.45, 0.16, 1200);
    this.tone("triangle", 190, t, 0.08, 0.3);
  }

  private hat(t: number, open: boolean): void {
    this.noiseHit(t, 0.12, open ? 0.12 : 0.035, 8000);
  }

  private bass(midi: number, t: number, dur: number): void {
    const ctx = this.ctx!;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.Q.value = 8;
    f.frequency.setValueAtTime(1400, t);
    f.frequency.exponentialRampToValueAtTime(220, t + dur);
    f.connect(this.master);
    this.tone("sawtooth", midiToFreq(midi), t, dur, 0.35, f);
  }

  private cowbell(t: number): void {
    const ctx = this.ctx!;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1100;
    f.Q.value = 1.5;
    f.connect(this.master);
    this.tone("square", 540, t, 0.25, 0.12, f);
    this.tone("square", 800, t, 0.25, 0.12, f);
  }

  // ---- sound effects ------------------------------------------------------

  eat(): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    this.tone("square", midiToFreq(84), t, 0.06, 0.12);
    this.tone("square", midiToFreq(91), t + 0.05, 0.1, 0.12);
  }

  powerUp(): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const o = this.tone("sawtooth", 300, t, 0.35, 0.15);
    o.frequency.exponentialRampToValueAtTime(1600, t + 0.3);
  }

  /** Womp. Womp. Womp. Wommmmmp. */
  sadTrombone(): void {
    const ctx = this.ensure();
    const notes = [58, 57, 56, 55];
    const durs = [0.32, 0.32, 0.32, 1.2];
    let t = ctx.currentTime + 0.05;
    notes.forEach((n, i) => {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 1100;
      f.connect(this.master);
      const o = this.tone("sawtooth", midiToFreq(n), t, durs[i], 0.3, f);
      if (i === notes.length - 1) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 6;
        const depth = ctx.createGain();
        depth.gain.value = 7;
        lfo.connect(depth);
        depth.connect(o.frequency);
        lfo.start(t);
        lfo.stop(t + durs[i]);
      }
      t += durs[i] + 0.04;
    });
  }
}
