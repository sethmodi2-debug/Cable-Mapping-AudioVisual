import type { Connector, Protocol } from "../model/types";

// Each cable type has its own colour, so a map reads at a glance. The type
// is picked when a cable is drawn and can be changed in the side panel.
export interface CableType {
  connector: Connector;
  name: string;
  short: string; // printed on the cable itself
  color: string;
}

// Spread round the colour wheel (and in lightness where hues sit close), so
// no two types are easy to mix up on the map, in light or dark mode.
export const CABLE_TYPES: CableType[] = [
  { connector: "XLR3", name: "XLR", short: "XLR", color: "#2563eb" }, // blue
  { connector: "XLR5", name: "XLR 5-pin", short: "XLR 5-pin", color: "#22d3ee" }, // light cyan
  { connector: "TRS", name: "TRS jack", short: "TRS", color: "#8b5cf6" }, // violet
  { connector: "TS", name: "TS jack", short: "TS", color: "#f9a8d4" }, // light pink
  { connector: "etherCON", name: "Cat6 (etherCON)", short: "Cat6", color: "#16a34a" }, // green
  { connector: "RJ45", name: "Cat6 (RJ45)", short: "Cat6", color: "#a0522d" }, // brown
  { connector: "speakON", name: "speakON", short: "speakON", color: "#dc2626" }, // red
  { connector: "BNC", name: "BNC / SDI", short: "SDI", color: "#eab308" }, // yellow
  { connector: "HDMI", name: "HDMI", short: "HDMI", color: "#c026d3" }, // magenta
  { connector: "DisplayPort", name: "DisplayPort", short: "DP", color: "#0f766e" }, // dark teal
  { connector: "Fiber", name: "Fiber", short: "Fiber", color: "#f97316" }, // orange
  { connector: "Other", name: "Other", short: "Other", color: "#9ca3af" }, // grey
];

const BY_CONNECTOR = new Map(CABLE_TYPES.map((t) => [t.connector, t]));

export function cableType(connector: Connector): CableType {
  return BY_CONNECTOR.get(connector) ?? CABLE_TYPES[CABLE_TYPES.length - 1];
}

// Protocols that run both ways over one cable, drawn with dots in both directions.
const BIDIRECTIONAL: Protocol[] = ["Dante", "AES50", "SLink", "gigaACE", "dSNAKE", "MADI", "AVB", "Optocore", "TWINLANe", "NDI"];

export function isBidirectional(protocol: Protocol): boolean {
  return BIDIRECTIONAL.includes(protocol);
}

// Dark text on the light cable colours, white on the rest.
export function labelTextColor(color: string): string {
  const n = parseInt(color.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#111" : "#fff";
}
