import { addDevice, newId } from "./edit";
import { deviceSystem } from "./systems";
import type { Connector, Direction, Port, Protocol, Show, SystemType } from "./types";

export interface PortSpec {
  name: string;
  direction: Direction;
  connector: Connector;
  protocol?: Protocol;
  count?: number; // how many the product has: "Input" x 24 is Input 1..24
}

// Picker sections, in display order.
export const CATEGORIES = [
  "Generic",
  "Consoles & surfaces",
  "Stage boxes & I/O",
  "Engines & mix racks",
  "Dynamic mics",
  "Condenser mics",
  "DI boxes",
  "Video switchers",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Preset {
  kind: string;
  category?: Category; // defaults to "Generic"
  manufacturer?: string;
  model?: string;
  system?: SystemType; // worked out from the ports when not set
  ports: PortSpec[];
}

export const PRESETS: Preset[] = [
  { kind: "Mic", ports: [{ name: "Out", direction: "out", connector: "XLR3" }] },
  {
    kind: "DI",
    ports: [
      { name: "In", direction: "in", connector: "TS" },
      { name: "Out", direction: "out", connector: "XLR3" },
    ],
  },
  {
    kind: "Stage box",
    ports: [
      { name: "Input", direction: "in", connector: "XLR3", count: 16 },
      { name: "Output", direction: "out", connector: "XLR3", count: 8 },
      { name: "SLink", direction: "io", connector: "etherCON", protocol: "SLink" },
    ],
  },
  {
    kind: "Console",
    ports: [
      { name: "SLink", direction: "io", connector: "etherCON", protocol: "SLink" },
      { name: "Dante", direction: "io", connector: "RJ45", protocol: "Dante" },
      { name: "Main", direction: "out", connector: "XLR3", count: 2 },
    ],
  },
  {
    kind: "Amp",
    ports: [
      { name: "In", direction: "in", connector: "XLR3", count: 2 },
      { name: "Out", direction: "out", connector: "speakON", count: 2 },
    ],
  },
  { kind: "Speaker", ports: [{ name: "In", direction: "in", connector: "speakON" }] },
  { kind: "Powered speaker", ports: [{ name: "In", direction: "in", connector: "XLR3" }] },
  { kind: "Dante switch", ports: [{ name: "Port", direction: "io", connector: "RJ45", protocol: "Dante", count: 8 }] },
  { kind: "Recorder", ports: [{ name: "Dante", direction: "io", connector: "RJ45", protocol: "Dante" }] },
  { kind: "Camera", ports: [{ name: "SDI Out", direction: "out", connector: "BNC", protocol: "SDI" }] },
  {
    kind: "Video switcher",
    ports: [
      { name: "SDI In", direction: "in", connector: "BNC", protocol: "SDI", count: 4 },
      { name: "HDMI Out", direction: "out", connector: "HDMI", protocol: "HDMI" },
    ],
  },
  { kind: "Projector", ports: [{ name: "HDMI In", direction: "in", connector: "HDMI", protocol: "HDMI" }] },
  { kind: "Laptop", ports: [{ name: "HDMI Out", direction: "out", connector: "HDMI", protocol: "HDMI" }] },
];

export function presetLabel(preset: Preset): string {
  return preset.model ? [preset.manufacturer, preset.model].filter(Boolean).join(" ") : preset.kind;
}

// Adds a device built from a preset and places it at position. Products are
// named after the model ("Qu-6D", then "Qu-6D 2"); generic presets after the
// kind ("Mic 1", "Mic 2").
export function addPreset(show: Show, preset: Preset, position: { x: number; y: number }): Show {
  const base = preset.model ?? preset.kind;
  const taken = new Set(show.devices.map((d) => d.name));
  let name = preset.model ? base : `${base} 1`;
  for (let n = 2; taken.has(name); n++) name = `${base} ${n}`;
  const next = addDevice(show, { name, kind: preset.kind, inputs: 0, outputs: 0, connector: "XLR3" });
  const device = next.devices[next.devices.length - 1];
  device.position = position;
  if (preset.model) device.model = presetLabel(preset);
  // Banks of sockets (Input 1..24) start empty, since most shows use only a
  // few; add them from the side panel. One-off sockets such as a network
  // port, SLink or a mic's output come with the device.
  const ports: Port[] = preset.ports
    .filter((spec) => (spec.count ?? 1) === 1)
    .map((spec) => ({
      id: newId(),
      deviceId: device.id,
      name: spec.count ? `${spec.name} 1` : spec.name,
      direction: spec.direction,
      connector: spec.connector,
      protocol: spec.protocol,
    }));
  device.system = preset.system ?? deviceSystem(device, ports);
  return { ...next, ports: [...next.ports, ...ports] };
}
