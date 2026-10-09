// Core data model for a show. Every list the app shows (patch list, pull
// list, input list) is derived from these four collections.

export type Id = string;

export type Direction = "in" | "out" | "io";

export type Connector =
  | "XLR3"
  | "XLR5"
  | "TRS"
  | "TS"
  | "speakON"
  | "etherCON"
  | "RJ45"
  | "BNC"
  | "HDMI"
  | "DisplayPort"
  | "Fiber"
  | "Other";

// What a cable or network link carries. Network protocols ride on a
// physical Cat5e/Cat6 or fiber run but are tracked as their own link so a
// Dante subscription or SLink channel can be patched like a snake channel.
export type Protocol =
  | "Analog"
  | "AES3"
  | "Dante"
  | "AES50"
  | "SLink"
  | "gigaACE"
  | "dSNAKE"
  | "MADI"
  | "SDI"
  | "HDMI"
  | "NDI";

export interface Device {
  id: Id;
  name: string;
  kind: string; // e.g. "Mic", "DI", "Stage box", "Console", "Amp", "Projector"
  location?: string; // e.g. "Stage left", "FOH", "Rack 2"
  position?: { x: number; y: number }; // where the device sits on the map
}

export interface Port {
  id: Id;
  deviceId: Id;
  name: string; // e.g. "Input 1", "Dante Primary", "SLink"
  direction: Direction;
  connector: Connector;
  protocol?: Protocol; // set on network ports, e.g. a Dante or SLink port
}

export interface Cable {
  id: Id;
  label: string; // the printed label, e.g. "SL-01" or "SNAKE A"
  connector: Connector;
  protocol: Protocol;
  lengthM?: number;
  channels: number; // 1 for a plain cable, 16/32/64... for snakes and network links
  sampleRateHz?: number; // network links only
  parentCableId?: Id; // network link riding on a physical cable
}

export interface Connection {
  id: Id;
  fromPortId: Id;
  toPortId: Id;
  cableId?: Id;
  channel?: number; // 1-based channel on a multichannel cable or link
}

export interface Show {
  formatVersion: 1;
  name: string;
  devices: Device[];
  ports: Port[];
  cables: Cable[];
  connections: Connection[];
}
