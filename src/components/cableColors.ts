import type { Connector, Protocol } from "../model/types";

// One colour per cable family, so a map reads at a glance: every Cat cable is
// green whatever it carries, every XLR is blue, and so on.
export interface CableFamily {
  name: string;
  color: string;
}

const FAMILIES = {
  xlr: { name: "XLR", color: "#3b82f6" },
  jack: { name: "Jack (TRS/TS)", color: "#a855f7" },
  cat: { name: "Cat5e/6 (RJ45, etherCON)", color: "#22c55e" },
  speakon: { name: "speakON", color: "#ef4444" },
  bnc: { name: "BNC / SDI", color: "#eab308" },
  hdmi: { name: "HDMI / DisplayPort", color: "#ec4899" },
  fiber: { name: "Fiber", color: "#f97316" },
  other: { name: "Other", color: "#9ca3af" },
} satisfies Record<string, CableFamily>;

const BY_CONNECTOR: Record<Connector, CableFamily> = {
  XLR3: FAMILIES.xlr,
  XLR5: FAMILIES.xlr,
  TRS: FAMILIES.jack,
  TS: FAMILIES.jack,
  RJ45: FAMILIES.cat,
  etherCON: FAMILIES.cat,
  speakON: FAMILIES.speakon,
  BNC: FAMILIES.bnc,
  HDMI: FAMILIES.hdmi,
  DisplayPort: FAMILIES.hdmi,
  Fiber: FAMILIES.fiber,
  Other: FAMILIES.other,
};

export function cableFamily(connector: Connector): CableFamily {
  return BY_CONNECTOR[connector];
}

// Protocols that run both ways over one cable, drawn with dots in both directions.
const BIDIRECTIONAL: Protocol[] = ["Dante", "AES50", "SLink", "gigaACE", "dSNAKE", "MADI", "NDI"];

export function isBidirectional(protocol: Protocol): boolean {
  return BIDIRECTIONAL.includes(protocol);
}
