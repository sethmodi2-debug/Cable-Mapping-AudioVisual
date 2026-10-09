import type { FoundPreset } from "./lookup";

// Devices looked up online, and the API key used to look them up. Both are
// kept in this browser only, so they're there next time the app opens.

const FOUND_KEY = "foundDevices";
const API_KEY = "anthropicApiKey";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private windows); it just isn't remembered.
  }
}

export function loadFound(): FoundPreset[] {
  try {
    const list = JSON.parse(read(FOUND_KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveFound(list: FoundPreset[]) {
  write(FOUND_KEY, JSON.stringify(list));
}

export function loadApiKey(): string {
  return read(API_KEY) ?? "";
}

export function saveApiKey(key: string) {
  write(API_KEY, key.trim() || null);
}
