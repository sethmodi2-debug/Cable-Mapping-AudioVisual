import type { Show } from "./types";

// A small band setup: two mics and a DI into a stage box, the stage box to
// FOH over SLink on a Cat6 run, plus a Dante feed to a recorder.
export const sampleShow: Show = {
  formatVersion: 1,
  name: "Sample gig",
  devices: [
    { id: "d-kick", name: "Kick mic", kind: "Mic", location: "Stage" },
    { id: "d-vox", name: "Lead vox", kind: "Mic", location: "Stage" },
    { id: "d-di", name: "Keys DI", kind: "DI", location: "Stage left" },
    { id: "d-box", name: "Stage box", kind: "Stage box", location: "Stage left" },
    { id: "d-desk", name: "FOH desk", kind: "Console", location: "FOH" },
    { id: "d-rec", name: "Recorder", kind: "Recorder", location: "FOH" },
  ],
  ports: [
    { id: "p-kick", deviceId: "d-kick", name: "Out", direction: "out", connector: "XLR3" },
    { id: "p-vox", deviceId: "d-vox", name: "Out", direction: "out", connector: "XLR3" },
    { id: "p-di", deviceId: "d-di", name: "Out", direction: "out", connector: "XLR3" },
    { id: "p-box-1", deviceId: "d-box", name: "Input 1", direction: "in", connector: "XLR3" },
    { id: "p-box-2", deviceId: "d-box", name: "Input 2", direction: "in", connector: "XLR3" },
    { id: "p-box-3", deviceId: "d-box", name: "Input 3", direction: "in", connector: "XLR3" },
    { id: "p-box-slink", deviceId: "d-box", name: "SLink", direction: "io", connector: "etherCON" },
    { id: "p-desk-slink", deviceId: "d-desk", name: "SLink", direction: "io", connector: "etherCON" },
    { id: "p-desk-dante", deviceId: "d-desk", name: "Dante Primary", direction: "io", connector: "RJ45" },
    { id: "p-rec-dante", deviceId: "d-rec", name: "Dante Primary", direction: "io", connector: "RJ45" },
  ],
  cables: [
    { id: "c-1", label: "SL-01", connector: "XLR3", protocol: "Analog", lengthM: 10, channels: 1 },
    { id: "c-2", label: "SL-02", connector: "XLR3", protocol: "Analog", lengthM: 10, channels: 1 },
    { id: "c-3", label: "SL-03", connector: "XLR3", protocol: "Analog", lengthM: 5, channels: 1 },
    { id: "c-cat", label: "CAT-A", connector: "etherCON", protocol: "Analog", lengthM: 50, channels: 1 },
    { id: "c-slink", label: "SLINK-A", connector: "etherCON", protocol: "SLink", channels: 128, sampleRateHz: 96000, parentCableId: "c-cat" },
    { id: "c-dante", label: "DANTE-REC", connector: "RJ45", protocol: "Dante", lengthM: 2, channels: 64, sampleRateHz: 48000 },
  ],
  connections: [
    { id: "x-1", fromPortId: "p-kick", toPortId: "p-box-1", cableId: "c-1" },
    { id: "x-2", fromPortId: "p-vox", toPortId: "p-box-2", cableId: "c-2" },
    { id: "x-3", fromPortId: "p-di", toPortId: "p-box-3", cableId: "c-3" },
    { id: "x-4", fromPortId: "p-box-slink", toPortId: "p-desk-slink", cableId: "c-slink", channel: 1 },
    { id: "x-5", fromPortId: "p-desk-dante", toPortId: "p-rec-dante", cableId: "c-dante", channel: 1 },
  ],
};
