import type { Protocol } from "../model/types";

// Line colour per signal type, so a map reads at a glance.
export const PROTOCOL_COLORS: Record<Protocol, string> = {
  Analog: "#6b7280",
  AES3: "#0f766e",
  Dante: "#dc2626",
  AES50: "#7c3aed",
  SLink: "#2563eb",
  gigaACE: "#0891b2",
  dSNAKE: "#4f46e5",
  MADI: "#c2410c",
  SDI: "#ca8a04",
  HDMI: "#16a34a",
  NDI: "#db2777",
};
