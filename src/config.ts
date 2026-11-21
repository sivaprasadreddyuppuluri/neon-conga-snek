// Board size, timings and the game's cast of characters and jokes.

export const COLS = 28;
export const ROWS = 20;
export const CELL = 28;
export const HUD = 52;
export const W = COLS * CELL;
export const PLAY_H = ROWS * CELL;
export const H = PLAY_H + HUD;

export const START_LENGTH = 3;
export const START_BPM = 76;
export const MAX_BPM = 190;
export const BPM_PER_GUEST = 3;

/** How long hot sauce, banana and disco ball last. */
export const EFFECT_MS = 6000;
/** How long an uncollected power-up stays on the floor. */
export const POWER_LIFETIME_MS = 8000;
export const FIRST_POWER_MS = 6000;
/** After a power-up is taken or vanishes, the next one comes 7–15 s later. */
export const POWER_GAP_MS = 7000;
export const POWER_GAP_RANDOM_MS = 8000;
/** Cheese only shows up once the line is longer than this. */
export const CHEESE_MIN_LENGTH = 7;
export const CHEESE_LOSS = 3;
export const MAX_QUEUED_TURNS = 3;

export type PowerKind = "hot" | "banana" | "disco" | "cheese";
export type TimedPower = Exclude<PowerKind, "cheese">;

export const GUESTS = ["🕺", "💃", "🦩", "🐸", "🦄", "🐔", "👽", "🤖", "🦖", "🐙", "🦆", "🐧", "👻", "🦥"];

export const POWERS: Record<PowerKind, { emoji: string; label: string; hue: number }> = {
  hot: { emoji: "🌶️", label: "HOT SAUCE! DOUBLE SPEED", hue: 15 },
  banana: { emoji: "🍌", label: "BANANA PEEL! CONTROLS FLIPPED", hue: 55 },
  disco: { emoji: "🪩", label: "GHOST GROOVE! PHASE THROUGH YOURSELF", hue: 290 },
  cheese: { emoji: "🧀", label: "LACTOSE INTOLERANT! 3 GUESTS LEFT", hue: 45 },
};

export const EAT_LINES = [
  "CONGA!",
  "+1 PARTY ANIMAL",
  "nom nom",
  "WOOOO!",
  "GET IN LINE",
  "sssplendid",
  "FLOOR CERTIFIED",
  "LET'S GOOO",
  "BOOGIE!",
];

export const DEATH_LINES = [
  "You tripped over your own conga line.",
  "Ouch. That was your own butt.",
  "The fire marshal shut the party down.",
  "You were the party pooper all along.",
  "Someone stepped on someone's toes. It was you.",
  "The conga line has formed a conga circle.",
];

export const LAYER_LINES: Record<number, string> = {
  2: "ARPEGGIATOR UNLOCKED",
  3: "SPARKLES UNLOCKED",
  4: "MORE COWBELL!!!",
};

export const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
