// Tiny wrappers around localStorage. Storage can be missing or throw (private browsing,
// blocked site data); the game then simply doesn't remember anything between visits.

const PREFIX = "neon-conga-snek-";

type StorageGetter = () => Storage;
const browserStorage: StorageGetter = () => localStorage;

function read(key: string, getStorage: StorageGetter): string | null {
  try {
    return getStorage().getItem(PREFIX + key);
  } catch (err) {
    console.warn(`Could not read "${key}" from browser storage`, err);
    return null;
  }
}

export function loadNumber(key: string, getStorage = browserStorage): number {
  return Number(read(key, getStorage)) || 0;
}

export function loadFlag(key: string, fallback: boolean, getStorage = browserStorage): boolean {
  const value = read(key, getStorage);
  return value === null ? fallback : value === "true";
}

export function saveValue(key: string, value: number | boolean, getStorage = browserStorage): void {
  try {
    getStorage().setItem(PREFIX + key, String(value));
  } catch (err) {
    console.warn(`Could not save "${key}" to browser storage`, err);
  }
}
