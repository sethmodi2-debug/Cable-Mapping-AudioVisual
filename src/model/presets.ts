import { addDevice, newId } from "./edit";
import type { Connector, Direction, Port, Protocol, Show } from "./types";

interface PortSpec {
  name: string;
  direction: Direction;
  connector: Connector;
  protocol?: Protocol;
  count?: number; // expands "Input" into "Input 1".."Input n"
}

export interface Preset {
  kind: string;
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

// Adds a device built from a preset, named "<kind> <n>" and placed at position.
export function addPreset(show: Show, preset: Preset, position: { x: number; y: number }): Show {
  const n = show.devices.filter((d) => d.kind === preset.kind).length + 1;
  const next = addDevice(show, { name: `${preset.kind} ${n}`, kind: preset.kind, inputs: 0, outputs: 0, connector: "XLR3" });
  const device = next.devices[next.devices.length - 1];
  device.position = position;
  const ports: Port[] = preset.ports.flatMap((spec) => {
    const names = spec.count ? Array.from({ length: spec.count }, (_, i) => `${spec.name} ${i + 1}`) : [spec.name];
    return names.map((name) => ({
      id: newId(),
      deviceId: device.id,
      name,
      direction: spec.direction,
      connector: spec.connector,
      protocol: spec.protocol,
    }));
  });
  return { ...next, ports: [...next.ports, ...ports] };
}
