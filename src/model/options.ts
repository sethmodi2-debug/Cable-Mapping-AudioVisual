import type { Connector, Protocol } from "./types";

export const CONNECTORS: Connector[] = [
  "XLR3", "XLR5", "TRS", "TS", "speakON", "etherCON", "RJ45", "BNC", "HDMI", "DisplayPort", "Fiber", "Other",
];

export const PROTOCOLS: Protocol[] = [
  "Analog", "AES3", "Dante", "AES50", "SLink", "gigaACE", "dSNAKE", "MADI", "AVB", "Optocore", "TWINLANe", "SDI", "HDMI", "NDI",
];
