import type { Preset } from "./presets";

// Real products with their rear-panel I/O. Port counts come from
// manufacturer or dealer spec pages; check them against your own unit, and
// add a port in the side panel if a model has something not listed here.
// Only connections you'd patch on a show are included (no USB, lamp or
// footswitch sockets).
export const CATALOG: Preset[] = [
  // Allen & Heath Qu (2024 range)
  {
    manufacturer: "Allen & Heath",
    model: "Qu-6",
    kind: "Console",
    ports: [
      { name: "Input", direction: "in", connector: "XLR3", count: 24 },
      { name: "ST1 L/R", direction: "in", connector: "TRS" },
      { name: "ST2 L/R", direction: "in", connector: "TRS" },
      { name: "Output", direction: "out", connector: "XLR3", count: 16 },
      { name: "AES Out", direction: "out", connector: "XLR3", protocol: "AES3" },
      { name: "SLink", direction: "io", connector: "etherCON", protocol: "SLink" },
    ],
  },
  {
    manufacturer: "Allen & Heath",
    model: "Qu-6D",
    kind: "Console",
    ports: [
      { name: "Input", direction: "in", connector: "XLR3", count: 24 },
      { name: "ST1 L/R", direction: "in", connector: "TRS" },
      { name: "ST2 L/R", direction: "in", connector: "TRS" },
      { name: "Output", direction: "out", connector: "XLR3", count: 16 },
      { name: "AES Out", direction: "out", connector: "XLR3", protocol: "AES3" },
      { name: "SLink", direction: "io", connector: "etherCON", protocol: "SLink" },
      { name: "Dante", direction: "io", connector: "etherCON", protocol: "Dante" },
    ],
  },
  // Allen & Heath SQ
  {
    manufacturer: "Allen & Heath",
    model: "SQ-5",
    kind: "Console",
    ports: [
      { name: "Input", direction: "in", connector: "XLR3", count: 16 },
      { name: "Output", direction: "out", connector: "XLR3", count: 12 },
      { name: "AES Out", direction: "out", connector: "XLR3", protocol: "AES3" },
      { name: "SLink", direction: "io", connector: "etherCON", protocol: "SLink" },
    ],
  },
  {
    manufacturer: "Allen & Heath",
    model: "SQ-6",
    kind: "Console",
    ports: [
      { name: "Input", direction: "in", connector: "XLR3", count: 24 },
      { name: "Output", direction: "out", connector: "XLR3", count: 14 },
      { name: "AES Out", direction: "out", connector: "XLR3", protocol: "AES3" },
      { name: "SLink", direction: "io", connector: "etherCON", protocol: "SLink" },
    ],
  },
  {
    manufacturer: "Allen & Heath",
    model: "SQ-7",
    kind: "Console",
    ports: [
      { name: "Input", direction: "in", connector: "XLR3", count: 32 },
      { name: "Output", direction: "out", connector: "XLR3", count: 16 },
      { name: "AES Out", direction: "out", connector: "XLR3", protocol: "AES3" },
      { name: "SLink", direction: "io", connector: "etherCON", protocol: "SLink" },
    ],
  },
  // Allen & Heath stage boxes
  {
    manufacturer: "Allen & Heath",
    model: "AR2412",
    kind: "Stage box",
    ports: [
      { name: "Input", direction: "in", connector: "XLR3", count: 24 },
      { name: "Output", direction: "out", connector: "XLR3", count: 12 },
      { name: "dSNAKE", direction: "io", connector: "etherCON", protocol: "dSNAKE" },
      { name: "Expander", direction: "io", connector: "etherCON", protocol: "dSNAKE" },
    ],
  },
  {
    manufacturer: "Allen & Heath",
    model: "AB168",
    kind: "Stage box",
    ports: [
      { name: "Input", direction: "in", connector: "XLR3", count: 16 },
      { name: "Output", direction: "out", connector: "XLR3", count: 8 },
      { name: "dSNAKE", direction: "io", connector: "etherCON", protocol: "dSNAKE" },
    ],
  },
  {
    manufacturer: "Allen & Heath",
    model: "DX168",
    kind: "Stage box",
    ports: [
      { name: "Input", direction: "in", connector: "XLR3", count: 16 },
      { name: "Output", direction: "out", connector: "XLR3", count: 8 },
      { name: "DX A", direction: "io", connector: "etherCON", protocol: "SLink" },
      { name: "DX B", direction: "io", connector: "etherCON", protocol: "SLink" },
    ],
  },
  {
    manufacturer: "Allen & Heath",
    model: "DT168",
    kind: "Stage box",
    ports: [
      { name: "Input", direction: "in", connector: "XLR3", count: 16 },
      { name: "Output", direction: "out", connector: "XLR3", count: 8 },
      { name: "Dante Primary", direction: "io", connector: "etherCON", protocol: "Dante" },
      { name: "Dante Secondary", direction: "io", connector: "etherCON", protocol: "Dante" },
    ],
  },
  {
    manufacturer: "Allen & Heath",
    model: "GX4816",
    kind: "Stage box",
    ports: [
      { name: "Input", direction: "in", connector: "XLR3", count: 48 },
      { name: "Output", direction: "out", connector: "XLR3", count: 16 },
      { name: "GX Link", direction: "io", connector: "etherCON", protocol: "gigaACE" },
      { name: "DX A", direction: "io", connector: "etherCON", protocol: "SLink" },
      { name: "DX B", direction: "io", connector: "etherCON", protocol: "SLink" },
    ],
  },
  // Behringer / Midas
  {
    manufacturer: "Behringer",
    model: "X32",
    kind: "Console",
    ports: [
      { name: "Input", direction: "in", connector: "XLR3", count: 32 },
      { name: "Output", direction: "out", connector: "XLR3", count: 16 },
      { name: "AES50 A", direction: "io", connector: "etherCON", protocol: "AES50" },
      { name: "AES50 B", direction: "io", connector: "etherCON", protocol: "AES50" },
    ],
  },
  {
    manufacturer: "Midas",
    model: "M32",
    kind: "Console",
    ports: [
      { name: "Input", direction: "in", connector: "XLR3", count: 32 },
      { name: "Output", direction: "out", connector: "XLR3", count: 16 },
      { name: "AES50 A", direction: "io", connector: "etherCON", protocol: "AES50" },
      { name: "AES50 B", direction: "io", connector: "etherCON", protocol: "AES50" },
    ],
  },
  {
    manufacturer: "Behringer",
    model: "S16",
    kind: "Stage box",
    ports: [
      { name: "Input", direction: "in", connector: "XLR3", count: 16 },
      { name: "Output", direction: "out", connector: "XLR3", count: 8 },
      { name: "AES50 A", direction: "io", connector: "etherCON", protocol: "AES50" },
      { name: "AES50 B", direction: "io", connector: "etherCON", protocol: "AES50" },
    ],
  },
  // Microphones and DIs
  { manufacturer: "Shure", model: "SM58", kind: "Mic", ports: [{ name: "Out", direction: "out", connector: "XLR3" }] },
  { manufacturer: "Shure", model: "SM57", kind: "Mic", ports: [{ name: "Out", direction: "out", connector: "XLR3" }] },
  { manufacturer: "Shure", model: "Beta 52A", kind: "Mic", ports: [{ name: "Out", direction: "out", connector: "XLR3" }] },
  { manufacturer: "Shure", model: "Beta 91A", kind: "Mic", ports: [{ name: "Out", direction: "out", connector: "XLR3" }] },
  {
    manufacturer: "Radial",
    model: "J48",
    kind: "DI",
    ports: [
      { name: "In", direction: "in", connector: "TS" },
      { name: "Thru", direction: "out", connector: "TS" },
      { name: "Out", direction: "out", connector: "XLR3" },
    ],
  },
  {
    manufacturer: "Radial",
    model: "ProD2",
    kind: "DI",
    ports: [
      { name: "In L", direction: "in", connector: "TS" },
      { name: "In R", direction: "in", connector: "TS" },
      { name: "Out L", direction: "out", connector: "XLR3" },
      { name: "Out R", direction: "out", connector: "XLR3" },
    ],
  },
];
