import type { Cable, Connection, Connector, Device, Direction, Port, Protocol, Show } from "./types";

// The show the app opens with: a dLive S5000 at FOH on a DM48 MixRack, three
// DX168 stage boxes (two daisy-chained on DX 1/2, one on DX 3/4), and a
// Dante card in the MixRack feeding a switch, a recording laptop and an amp.

const devices: Device[] = [];
const ports: Port[] = [];
const cables: Cable[] = [];
const connections: Connection[] = [];

function device(id: string, d: Omit<Device, "id">, portList: [name: string, direction: Direction, connector: Connector, protocol?: Protocol][]) {
  devices.push({ id, ...d });
  for (const [name, direction, connector, protocol] of portList) {
    ports.push({ id: `${id}:${name}`, deviceId: id, name, direction, connector, protocol });
  }
}

function cable(label: string, from: string, to: string, c: { connector: Connector; protocol?: Protocol; lengthM?: number; channels?: number }) {
  const id = `c-${label}`;
  const channels = c.channels ?? 1;
  cables.push({ id, label, connector: c.connector, protocol: c.protocol ?? "Analog", lengthM: c.lengthM, channels });
  connections.push({ id: `x-${label}`, fromPortId: from, toPortId: to, cableId: id, channel: channels > 1 ? 1 : undefined });
}

const mic = (id: string, name: string, model: string, x: number, y: number, location: string) =>
  device(id, { name, kind: "Mic", model, location, system: "Audio", position: { x, y } }, [["Out", "out", "XLR3"]]);

const dx168 = (id: string, name: string, location: string, x: number, y: number, inputs: number) =>
  device(
    id,
    { name, kind: "Stage box", model: "Allen & Heath DX168", location, system: "Audio", position: { x, y } },
    [
      ...Array.from({ length: inputs }, (_, i) => [`Input ${i + 1}`, "in", "XLR3"] as [string, Direction, Connector]),
      ["Output 1", "out", "XLR3"],
      ["DX A", "io", "etherCON", "SLink"],
      ["DX B", "io", "etherCON", "SLink"],
    ],
  );

// Sources on stage
mic("kick", "Kick", "Shure Beta 91A", 0, 0, "Drum riser");
mic("snare", "Snare", "Shure SM57", 0, 110, "Drum riser");
mic("oh", "Overheads", "Shure KSM137", 0, 220, "Drum riser");
mic("gtr", "Guitar", "Sennheiser e906", 0, 360, "Stage right");
mic("vox", "Lead vox", "Shure SM58", 0, 470, "Downstage");
device("di", { name: "Keys DI", kind: "DI", model: "Radial JDI", location: "Stage left", system: "Audio", position: { x: 0, y: 600 } }, [
  ["In", "in", "TS"],
  ["Out", "out", "XLR3"],
]);

// Stage boxes
dx168("dx-drums", "DX168 Drums", "Drum riser", 330, 0, 3);
dx168("dx-sr", "DX168 SR", "Stage right", 330, 330, 2);
dx168("dx-sl", "DX168 SL", "Stage left", 330, 560, 1);

// MixRack with a Dante card, and the surface at FOH
device(
  "rack",
  { name: "MixRack", kind: "Mix engine", model: "Allen & Heath dLive DM48", location: "Stage left wing", system: "Audio", ip: "192.168.1.10", position: { x: 700, y: 260 } },
  [
    ["gigaACE", "io", "etherCON", "gigaACE"],
    ["DX 1/2", "io", "etherCON", "SLink"],
    ["DX 3/4", "io", "etherCON", "SLink"],
    ["Dante Primary", "io", "RJ45", "Dante"],
    ["Dante Secondary", "io", "RJ45", "Dante"],
    ["Network", "io", "RJ45"],
  ],
);
device(
  "surface",
  { name: "dLive S5000", kind: "Console", model: "Allen & Heath dLive S5000", location: "FOH", system: "Audio", ip: "192.168.1.11", position: { x: 1080, y: 40 } },
  [
    ["gigaACE", "io", "etherCON", "gigaACE"],
    ["Network", "io", "RJ45"],
  ],
);

// Dante network
device(
  "switch",
  { name: "Dante switch", kind: "Network switch", model: "Netgear M4250-10G2F", location: "Stage left wing", system: "Network", ip: "192.168.1.2", position: { x: 1080, y: 380 } },
  [1, 2, 3, 4].map((n) => [`Port ${n}`, "io", "RJ45", "Dante"] as [string, Direction, Connector, Protocol]),
);
device(
  "rec",
  { name: "Recording laptop", kind: "Recorder", model: "Dante Virtual Soundcard", location: "FOH", system: "Audio", ip: "192.168.1.20", position: { x: 1440, y: 300 } },
  [["Dante", "io", "RJ45", "Dante"]],
);
device(
  "amp",
  { name: "Amp rack", kind: "Amp", model: "Powersoft X4", location: "Stage left wing", system: "Audio", ip: "192.168.1.30", position: { x: 1440, y: 480 } },
  [
    ["Dante", "io", "RJ45", "Dante"],
    ["Out 1", "out", "speakON"],
    ["Out 2", "out", "speakON"],
  ],
);
device("pa-l", { name: "Main L", kind: "Speaker", location: "Stage left", system: "Audio", position: { x: 1780, y: 440 } }, [["In", "in", "speakON"]]);
device("pa-r", { name: "Main R", kind: "Speaker", location: "Stage right", system: "Audio", position: { x: 1780, y: 560 } }, [["In", "in", "speakON"]]);

const xlr = { connector: "XLR3" as const, lengthM: 10 };
cable("XLR-01", "kick:Out", "dx-drums:Input 1", xlr);
cable("XLR-02", "snare:Out", "dx-drums:Input 2", xlr);
cable("XLR-03", "oh:Out", "dx-drums:Input 3", xlr);
cable("XLR-04", "gtr:Out", "dx-sr:Input 1", xlr);
cable("XLR-05", "vox:Out", "dx-sr:Input 2", { connector: "XLR3", lengthM: 15 });
cable("XLR-06", "di:Out", "dx-sl:Input 1", { connector: "XLR3", lengthM: 5 });

const dx = { connector: "etherCON" as const, protocol: "SLink" as const, channels: 32 };
cable("DX-01", "rack:DX 1/2", "dx-sr:DX A", { ...dx, lengthM: 30 });
cable("DX-02", "dx-sr:DX B", "dx-sl:DX A", { ...dx, lengthM: 20 });
cable("DX-03", "rack:DX 3/4", "dx-drums:DX A", { ...dx, lengthM: 20 });
cable("GIGA-01", "rack:gigaACE", "surface:gigaACE", { connector: "etherCON", protocol: "gigaACE", channels: 128, lengthM: 80 });

const dante = { connector: "RJ45" as const, protocol: "Dante" as const, channels: 64 };
cable("DANTE-01", "rack:Dante Primary", "switch:Port 1", { ...dante, lengthM: 2 });
cable("DANTE-02", "switch:Port 2", "rec:Dante", { ...dante, lengthM: 80 });
cable("DANTE-03", "switch:Port 3", "amp:Dante", { ...dante, lengthM: 3 });
cable("SPK-01", "amp:Out 1", "pa-l:In", { connector: "speakON", lengthM: 15 });
cable("SPK-02", "amp:Out 2", "pa-r:In", { connector: "speakON", lengthM: 25 });

export const dliveShow: Show = { formatVersion: 1, name: "dLive S5000 with Dante", devices, ports, cables, connections };
