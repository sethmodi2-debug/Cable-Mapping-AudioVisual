import type { Direction, Port } from "./types";

// A short, readable list of a device's port names, with numbered runs
// folded together: "Input 1, Input 2, Input 3, Talkback" → "Input 1–3, Talkback".
export function portNames(ports: Port[], direction: Direction): string {
  const names = ports.filter((p) => p.direction === direction).map((p) => p.name);
  const parts: string[] = [];
  let i = 0;
  while (i < names.length) {
    const m = /^(.*?)(\d+)$/.exec(names[i]);
    if (!m) {
      parts.push(names[i++]);
      continue;
    }
    const [, base, first] = m;
    let last = Number(first);
    let j = i + 1;
    while (j < names.length && names[j] === `${base}${last + 1}`) {
      last++;
      j++;
    }
    parts.push(j - i > 1 ? `${base}${first}–${last}` : names[i]);
    i = j;
  }
  return parts.join(", ");
}
