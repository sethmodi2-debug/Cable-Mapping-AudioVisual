import type { Connector, Protocol } from "../model/types";

// Each cable type has its own colour, so a map reads at a glance. The type
// is picked when a cable is drawn and can be changed in the side panel.
export interface CableType {
  connector: Connector;
  name: string;
  short: string; // printed on the cable itself
  color: string;
}

export const CABLE_TYPES: CableType[] = [
  { connector: "XLR3", name: "XLR", short: "XLR", color: "#3b82f6" },
  { connector: "XLR5", name: "XLR 5-pin", short: "XLR 5-pin", color: "#06b6d4" },
  { connector: "TRS", name: "TRS jack", short: "TRS", color: "#a855f7" },
  { connector: "TS", name: "TS jack", short: "TS", color: "#d946ef" },
  { connector: "etherCON", name: "Cat6 (etherCON)", short: "Cat6", color: "#22c55e" },
  { connector: "RJ45", name: "Cat6 (RJ45)", short: "Cat6", color: "#84cc16" },
  { connector: "speakON", name: "speakON", short: "speakON", color: "#ef4444" },
  { connector: "BNC", name: "BNC / SDI", short: "SDI", color: "#eab308" },
  { connector: "HDMI", name: "HDMI", short: "HDMI", color: "#ec4899" },
  { connector: "DisplayPort", name: "DisplayPort", short: "DP", color: "#14b8a6" },
  { connector: "Fiber", name: "Fiber", short: "Fiber", color: "#f97316" },
  { connector: "Other", name: "Other", short: "Other", color: "#9ca3af" },
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
