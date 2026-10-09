import type { Category, PortSpec, Preset } from "./presets";
import type { Connector, Protocol } from "./types";

// Real products with their rear-panel I/O, grouped by category and maker.
// Counts cover the sockets you'd patch on a show (no USB, lamp or footswitch
// sockets) and the base configuration with no option cards fitted. They come
// from spec sheets and dealer pages and can be off for a given revision, so
// check them against your own unit and add a port in the side panel if needed.

type NetPort = [name: string, protocol: Protocol, connector?: Connector];

function io(inputs: number, outputs: number, network: NetPort[] = [], extra: PortSpec[] = []): PortSpec[] {
  const ports: PortSpec[] = [];
  if (inputs > 0) ports.push({ name: "Input", direction: "in", connector: "XLR3", count: inputs });
  if (outputs > 0) ports.push({ name: "Output", direction: "out", connector: "XLR3", count: outputs });
  ports.push(...extra);
  for (const [name, protocol, connector] of network) {
    const plug = connector ?? (protocol === "MADI" ? "BNC" : protocol === "Optocore" || protocol === "TWINLANe" ? "Fiber" : "etherCON");
    ports.push({ name, direction: "io", connector: plug, protocol });
  }
  return ports;
}

function item(category: Category, kind: string, manufacturer: string, model: string, ports: PortSpec[]): Preset {
  return { category, kind, manufacturer, model, ports };
}

// Desks and engines all have a network socket for remote control and
// editors, even when their audio runs over another protocol.
const CONTROL: PortSpec = { name: "Network", direction: "io", connector: "RJ45" };
const withControl = (ports: PortSpec[]) => (ports.some((p) => p.name === "Network") ? ports : [...ports, CONTROL]);

const surface = (maker: string, model: string, ports: PortSpec[]) => item("Consoles & surfaces", "Console", maker, model, withControl(ports));
const stagebox = (maker: string, model: string, ports: PortSpec[]) => item("Stage boxes & I/O", "Stage box", maker, model, ports);
const engine = (maker: string, model: string, ports: PortSpec[]) => item("Engines & mix racks", "Mix engine", maker, model, withControl(ports));

const MIC_OUT: PortSpec[] = [{ name: "Out", direction: "out", connector: "XLR3" }];
const dynamic = (maker: string, model: string) => item("Dynamic mics", "Mic", maker, model, MIC_OUT);
const condenser = (maker: string, model: string) => item("Condenser mics", "Mic", maker, model, MIC_OUT);

const AES_OUT: PortSpec = { name: "AES Out", direction: "out", connector: "XLR3", protocol: "AES3" };
const ST_IN: PortSpec[] = [
  { name: "ST1 L/R", direction: "in", connector: "TRS" },
  { name: "ST2 L/R", direction: "in", connector: "TRS" },
];

// Video switchers. Audio often runs into them too (mic and XLR inputs), so
// those are listed alongside the video sockets.
interface SwitcherIo {
  hdmiIn?: number;
  sdiIn?: number;
  hdmiOut?: number;
  sdiOut?: number;
  micIn?: number; // 3.5 mm
  xlrIn?: number;
  xlrOut?: number;
}

function switcher(maker: string, model: string, io: SwitcherIo, network = true): Preset {
  const ports: PortSpec[] = [];
  const add = (count: number | undefined, spec: Omit<PortSpec, "count">) => {
    if (count) ports.push({ ...spec, count: count > 1 ? count : undefined });
  };
  add(io.hdmiIn, { name: "HDMI In", direction: "in", connector: "HDMI", protocol: "HDMI" });
  add(io.sdiIn, { name: "SDI In", direction: "in", connector: "BNC", protocol: "SDI" });
  add(io.micIn, { name: "Mic In", direction: "in", connector: "TRS" });
  add(io.xlrIn, { name: "Audio In", direction: "in", connector: "XLR3" });
  add(io.hdmiOut, { name: "HDMI Out", direction: "out", connector: "HDMI", protocol: "HDMI" });
  add(io.sdiOut, { name: "SDI Out", direction: "out", connector: "BNC", protocol: "SDI" });
  add(io.xlrOut, { name: "Audio Out", direction: "out", connector: "XLR3" });
  if (network) ports.push({ name: "Network", direction: "io", connector: "RJ45" });
  return { ...item("Video switchers", "Video switcher", maker, model, ports), system: "Video" };
}

const BMD = "Blackmagic Design";

const AH = "Allen & Heath";
const AH_SURFACE_NET: NetPort[] = [["gigaACE", "gigaACE"], ["DX A", "SLink"], ["DX B", "SLink"]];
const DIGICO_NET: NetPort[] = [["MADI A", "MADI"], ["MADI B", "MADI"], ["Optocore", "Optocore"]];
const YAMAHA_DANTE: NetPort[] = [["Dante Primary", "Dante", "etherCON"], ["Dante Secondary", "Dante", "etherCON"]];
const AVID_AVB: NetPort[] = [["AVB A", "AVB"], ["AVB B", "AVB"]];

export const CATALOG: Preset[] = [
  // ---- Consoles & surfaces ----
  // Allen & Heath
  surface(AH, "Qu-5", io(16, 12, [["SLink", "SLink"]], [...ST_IN, AES_OUT])),
  surface(AH, "Qu-6", io(24, 16, [["SLink", "SLink"]], [...ST_IN, AES_OUT])),
  surface(AH, "Qu-6D", io(24, 16, [["SLink", "SLink"], ["Dante", "Dante"]], [...ST_IN, AES_OUT])),
  surface(AH, "Qu-7", io(32, 16, [["SLink", "SLink"]], [...ST_IN, AES_OUT])),
  surface(AH, "SQ-5", io(16, 12, [["SLink", "SLink"]], [AES_OUT])),
  surface(AH, "SQ-6", io(24, 14, [["SLink", "SLink"]], [AES_OUT])),
  surface(AH, "SQ-7", io(32, 16, [["SLink", "SLink"]], [AES_OUT])),
  surface(AH, "Avantis", io(12, 12, AH_SURFACE_NET, [AES_OUT])),
  surface(AH, "Avantis Solo", io(12, 12, AH_SURFACE_NET, [AES_OUT])),
  surface(AH, "dLive S3000", io(8, 8, AH_SURFACE_NET)),
  surface(AH, "dLive S5000", io(8, 8, AH_SURFACE_NET)),
  surface(AH, "dLive S7000", io(8, 8, AH_SURFACE_NET)),
  surface(AH, "dLive C1500", io(0, 0, [["gigaACE", "gigaACE"]])),
  surface(AH, "dLive C2500", io(0, 0, [["gigaACE", "gigaACE"]])),
  surface(AH, "dLive C3500", io(0, 0, [["gigaACE", "gigaACE"]])),
  // DiGiCo
  surface("DiGiCo", "SD5 Quantum", io(8, 8, DIGICO_NET, [AES_OUT])),
  surface("DiGiCo", "SD7 Quantum", io(8, 8, DIGICO_NET, [AES_OUT])),
  surface("DiGiCo", "SD9", io(8, 8, [["MADI A", "MADI"], ["MADI B", "MADI"]], [AES_OUT])),
  surface("DiGiCo", "SD10", io(8, 8, DIGICO_NET, [AES_OUT])),
  surface("DiGiCo", "SD12", io(12, 12, DIGICO_NET, [AES_OUT])),
  surface("DiGiCo", "Quantum 225", io(8, 8, DIGICO_NET, [AES_OUT])),
  surface("DiGiCo", "Quantum 338", io(8, 8, DIGICO_NET, [AES_OUT])),
  surface("DiGiCo", "Quantum 7", io(8, 8, DIGICO_NET, [AES_OUT])),
  surface("DiGiCo", "Quantum 852", io(8, 8, DIGICO_NET, [AES_OUT])),
  surface("DiGiCo", "S21", io(10, 10, [["MADI A", "MADI"], ["MADI B", "MADI"]])),
  surface("DiGiCo", "S31", io(16, 16, [["MADI A", "MADI"], ["MADI B", "MADI"]])),
  // Avid
  surface("Avid", "VENUE | S6L-16C", io(8, 8, [["AVB", "AVB"]])),
  surface("Avid", "VENUE | S6L-24C", io(8, 8, [["AVB", "AVB"]])),
  surface("Avid", "VENUE | S6L-24D", io(8, 8, [["AVB", "AVB"]])),
  surface("Avid", "VENUE | S6L-32D", io(8, 8, [["AVB", "AVB"]])),
  surface("Avid", "VENUE | S6L-48D", io(8, 8, [["AVB", "AVB"]])),
  surface("Avid", "VENUE Profile", io(8, 8)),
  surface("Avid", "VENUE SC48", io(48, 16)),
  // Yamaha
  surface("Yamaha", "CL1", io(8, 8, YAMAHA_DANTE)),
  surface("Yamaha", "CL3", io(8, 8, YAMAHA_DANTE)),
  surface("Yamaha", "CL5", io(8, 8, YAMAHA_DANTE)),
  surface("Yamaha", "QL1", io(16, 8, YAMAHA_DANTE)),
  surface("Yamaha", "QL5", io(32, 16, YAMAHA_DANTE)),
  surface("Yamaha", "TF1", io(16, 16)),
  surface("Yamaha", "TF3", io(24, 16)),
  surface("Yamaha", "TF5", io(32, 16)),
  surface("Yamaha", "DM3", io(16, 8)),
  surface("Yamaha", "DM3 Standard", io(16, 8, [["Dante", "Dante", "etherCON"]])),
  surface("Yamaha", "DM7", io(32, 16, YAMAHA_DANTE)),
  surface("Yamaha", "DM7 Compact", io(32, 16, YAMAHA_DANTE)),
  surface("Yamaha", "RIVAGE PM3", io(8, 8, [["TWINLANe", "TWINLANe"]])),
  surface("Yamaha", "RIVAGE PM5", io(8, 8, [["TWINLANe", "TWINLANe"]])),
  surface("Yamaha", "RIVAGE PM7", io(8, 8, [["TWINLANe", "TWINLANe"]])),
  surface("Yamaha", "RIVAGE PM10", io(8, 8, [["TWINLANe", "TWINLANe"]])),
  // Behringer / Midas
  surface("Behringer", "X32", io(32, 16, [["AES50 A", "AES50"], ["AES50 B", "AES50"]])),
  surface("Behringer", "Wing", io(8, 8, [["AES50 A", "AES50"], ["AES50 B", "AES50"], ["AES50 C", "AES50"]])),
  surface("Midas", "M32", io(32, 16, [["AES50 A", "AES50"], ["AES50 B", "AES50"]])),
  surface("Midas", "HD96-24", io(8, 8, [["AES50 A", "AES50"], ["AES50 B", "AES50"]])),

  // ---- Stage boxes & I/O ----
  stagebox(AH, "AR2412", io(24, 12, [["dSNAKE", "dSNAKE"], ["Expander", "dSNAKE"]])),
  stagebox(AH, "AR84", io(8, 4, [["dSNAKE", "dSNAKE"]])),
  stagebox(AH, "AB168", io(16, 8, [["dSNAKE", "dSNAKE"]])),
  stagebox(AH, "DX168", io(16, 8, [["DX A", "SLink"], ["DX B", "SLink"]])),
  stagebox(AH, "DX164-W", io(16, 4, [["DX A", "SLink"], ["DX B", "SLink"]])),
  stagebox(AH, "DT168", io(16, 8, [["Dante Primary", "Dante"], ["Dante Secondary", "Dante"]])),
  stagebox(AH, "GX4816", io(48, 16, [["GX Link", "gigaACE"], ["DX A", "SLink"], ["DX B", "SLink"]])),
  stagebox("DiGiCo", "SD-Rack", io(56, 56, DIGICO_NET)),
  stagebox("DiGiCo", "SD-Mini Rack", io(32, 16, DIGICO_NET)),
  stagebox("DiGiCo", "SD-Nano Rack", io(16, 8, [["MADI A", "MADI"], ["MADI B", "MADI"]])),
  stagebox("DiGiCo", "D2-Rack", io(48, 16, DIGICO_NET)),
  stagebox("Avid", "VENUE | Stage 16", io(16, 8, [["AVB", "AVB"]])),
  stagebox("Avid", "VENUE | Stage 32", io(32, 16, AVID_AVB)),
  stagebox("Avid", "VENUE | Stage 64", io(48, 16, AVID_AVB)),
  stagebox("Yamaha", "Rio3224-D2", io(32, 16, YAMAHA_DANTE, [{ name: "AES Out", direction: "out", connector: "XLR3", protocol: "AES3", count: 4 }])),
  stagebox("Yamaha", "Rio1608-D2", io(16, 8, YAMAHA_DANTE)),
  stagebox("Yamaha", "Tio1608-D", io(16, 8, YAMAHA_DANTE)),
  stagebox("Yamaha", "RPio622", io(0, 0, [["TWINLANe A", "TWINLANe"], ["TWINLANe B", "TWINLANe"]])),
  stagebox("Behringer", "S16", io(16, 8, [["AES50 A", "AES50"], ["AES50 B", "AES50"]])),
  stagebox("Behringer", "S32", io(32, 16, [["AES50 A", "AES50"], ["AES50 B", "AES50"]])),
  stagebox("Midas", "DL16", io(16, 8, [["AES50 A", "AES50"], ["AES50 B", "AES50"]])),
  stagebox("Midas", "DL32", io(32, 16, [["AES50 A", "AES50"], ["AES50 B", "AES50"]])),

  // ---- Engines & mix racks ----
  engine(AH, "dLive DM0", io(0, 0, [["gigaACE", "gigaACE"], ["DX 1/2", "SLink"], ["DX 3/4", "SLink"]])),
  engine(AH, "dLive DM32", io(32, 16, [["gigaACE", "gigaACE"], ["DX 1/2", "SLink"], ["DX 3/4", "SLink"]])),
  engine(AH, "dLive DM48", io(48, 24, [["gigaACE", "gigaACE"], ["DX 1/2", "SLink"], ["DX 3/4", "SLink"]])),
  engine(AH, "dLive DM64", io(64, 32, [["gigaACE", "gigaACE"], ["DX 1/2", "SLink"], ["DX 3/4", "SLink"]])),
  engine(AH, "dLive CDM32", io(32, 16, [["gigaACE", "gigaACE"], ["DX 1/2", "SLink"]])),
  engine(AH, "dLive CDM48", io(48, 24, [["gigaACE", "gigaACE"], ["DX 1/2", "SLink"]])),
  engine(AH, "dLive CDM64", io(64, 32, [["gigaACE", "gigaACE"], ["DX 1/2", "SLink"]])),
  engine("Avid", "VENUE | E6L-112", io(0, 0, AVID_AVB)),
  engine("Avid", "VENUE | E6L-144", io(0, 0, AVID_AVB)),
  engine("Avid", "VENUE | E6L-192", io(0, 0, AVID_AVB)),
  engine("Yamaha", "RIVAGE DSP-RX", io(0, 0, [["TWINLANe A", "TWINLANe"], ["TWINLANe B", "TWINLANe"]])),
  engine("Yamaha", "RIVAGE DSP-RX-EX", io(0, 0, [["TWINLANe A", "TWINLANe"], ["TWINLANe B", "TWINLANe"]])),

  // ---- Dynamic mics ----
  dynamic("Shure", "SM58"),
  dynamic("Shure", "SM57"),
  dynamic("Shure", "Beta 58A"),
  dynamic("Shure", "Beta 57A"),
  dynamic("Shure", "Beta 52A"),
  dynamic("Shure", "Beta 56A"),
  dynamic("Shure", "SM7B"),
  dynamic("Shure", "Super 55"),
  dynamic("Sennheiser", "e835"),
  dynamic("Sennheiser", "e935"),
  dynamic("Sennheiser", "e945"),
  dynamic("Sennheiser", "e604"),
  dynamic("Sennheiser", "e602-II"),
  dynamic("Sennheiser", "e906"),
  dynamic("Sennheiser", "MD 421-II"),
  dynamic("Sennheiser", "MD 441-U"),
  dynamic("Audix", "OM2"),
  dynamic("Audix", "OM5"),
  dynamic("Audix", "i5"),
  dynamic("Audix", "D2"),
  dynamic("Audix", "D4"),
  dynamic("Audix", "D6"),
  dynamic("AKG", "D112 MkII"),
  dynamic("AKG", "D5"),
  dynamic("Electro-Voice", "RE20"),
  dynamic("Electro-Voice", "ND96"),
  dynamic("Electro-Voice", "ND46"),
  dynamic("Telefunken", "M80"),
  dynamic("Heil", "PR 40"),

  // ---- Condenser mics ----
  condenser("Shure", "SM81"),
  condenser("Shure", "Beta 87A"),
  condenser("Shure", "Beta 91A"),
  condenser("Shure", "Beta 98H/C"),
  condenser("Shure", "KSM9"),
  condenser("Shure", "KSM32"),
  condenser("Shure", "KSM137"),
  condenser("Sennheiser", "e914"),
  condenser("Sennheiser", "e965"),
  condenser("Sennheiser", "MKH 416"),
  condenser("Neumann", "KM 184"),
  condenser("Neumann", "KMS 105"),
  condenser("Neumann", "TLM 103"),
  condenser("Neumann", "U 87 Ai"),
  condenser("AKG", "C414 XLS"),
  condenser("AKG", "C451 B"),
  condenser("AKG", "C214"),
  condenser("Audio-Technica", "AT4040"),
  condenser("Audio-Technica", "AT4050"),
  condenser("Audio-Technica", "AE5100"),
  condenser("Audio-Technica", "ATM450"),
  condenser("DPA", "4099"),
  condenser("DPA", "4011"),
  condenser("DPA", "d:facto 4018"),
  condenser("Rode", "NT5"),
  condenser("Rode", "NT1-A"),
  condenser("Audix", "ADX51"),

  // ---- DI boxes ----
  item("DI boxes", "DI", "Radial", "J48", [
    { name: "In", direction: "in", connector: "TS" },
    { name: "Thru", direction: "out", connector: "TS" },
    { name: "Out", direction: "out", connector: "XLR3" },
  ]),
  item("DI boxes", "DI", "Radial", "JDI", [
    { name: "In", direction: "in", connector: "TS" },
    { name: "Thru", direction: "out", connector: "TS" },
    { name: "Out", direction: "out", connector: "XLR3" },
  ]),
  item("DI boxes", "DI", "Radial", "ProDI", [
    { name: "In", direction: "in", connector: "TS" },
    { name: "Thru", direction: "out", connector: "TS" },
    { name: "Out", direction: "out", connector: "XLR3" },
  ]),
  item("DI boxes", "DI", "Radial", "ProD2", [
    { name: "In L", direction: "in", connector: "TS" },
    { name: "In R", direction: "in", connector: "TS" },
    { name: "Out L", direction: "out", connector: "XLR3" },
    { name: "Out R", direction: "out", connector: "XLR3" },
  ]),
  item("DI boxes", "DI", "Countryman", "Type 85", [
    { name: "In", direction: "in", connector: "TS" },
    { name: "Thru", direction: "out", connector: "TS" },
    { name: "Out", direction: "out", connector: "XLR3" },
  ]),
  item("DI boxes", "DI", "BSS", "AR-133", [
    { name: "In", direction: "in", connector: "TS" },
    { name: "Thru", direction: "out", connector: "TS" },
    { name: "Out", direction: "out", connector: "XLR3" },
  ]),

  // ---- Video switchers ----
  // Blackmagic Design ATEM
  switcher(BMD, "ATEM Mini", { hdmiIn: 4, hdmiOut: 1, micIn: 2 }, false),
  switcher(BMD, "ATEM Mini Pro", { hdmiIn: 4, hdmiOut: 1, micIn: 2 }),
  switcher(BMD, "ATEM Mini Pro ISO", { hdmiIn: 4, hdmiOut: 1, micIn: 2 }),
  switcher(BMD, "ATEM Mini Extreme", { hdmiIn: 8, hdmiOut: 2, micIn: 2 }),
  switcher(BMD, "ATEM Mini Extreme ISO", { hdmiIn: 8, hdmiOut: 2, micIn: 2 }),
  switcher(BMD, "ATEM SDI", { sdiIn: 4, sdiOut: 3, micIn: 2 }),
  switcher(BMD, "ATEM SDI Pro ISO", { sdiIn: 4, sdiOut: 3, micIn: 2 }),
  switcher(BMD, "ATEM SDI Extreme ISO", { sdiIn: 8, sdiOut: 6, micIn: 2 }),
  switcher(BMD, "ATEM Television Studio HD8", { sdiIn: 8, sdiOut: 4, xlrIn: 2 }),
  switcher(BMD, "ATEM Television Studio HD8 ISO", { sdiIn: 8, sdiOut: 4, xlrIn: 2 }),
  switcher(BMD, "ATEM Television Studio 4K8", { sdiIn: 8, sdiOut: 4, xlrIn: 2 }),
  switcher(BMD, "ATEM 1 M/E Constellation HD", { sdiIn: 10, sdiOut: 6 }),
  switcher(BMD, "ATEM 2 M/E Constellation HD", { sdiIn: 20, sdiOut: 12 }),
  switcher(BMD, "ATEM 4 M/E Constellation HD", { sdiIn: 40, sdiOut: 24 }),
  switcher(BMD, "ATEM Constellation 8K", { sdiIn: 40, sdiOut: 24 }),
  // Roland
  switcher("Roland", "V-02HD MK II", { hdmiIn: 2, hdmiOut: 2 }, false),
  switcher("Roland", "V-1HD", { hdmiIn: 4, hdmiOut: 2 }, false),
  switcher("Roland", "V-1HD+", { hdmiIn: 4, hdmiOut: 2, xlrIn: 1 }, false),
  switcher("Roland", "V-1SDI", { sdiIn: 3, hdmiIn: 2, sdiOut: 2, hdmiOut: 1, xlrIn: 2 }, false),
  switcher("Roland", "V-8HD", { hdmiIn: 8, hdmiOut: 3, xlrIn: 2 }),
  switcher("Roland", "V-60HD", { sdiIn: 4, hdmiIn: 2, sdiOut: 2, hdmiOut: 2, xlrIn: 2 }),
  switcher("Roland", "V-80HD", { hdmiIn: 8, hdmiOut: 3, xlrIn: 4, xlrOut: 2 }),
  switcher("Roland", "V-160HD", { sdiIn: 8, hdmiIn: 8, sdiOut: 3, hdmiOut: 4, xlrIn: 2, xlrOut: 1 }),
  switcher("Roland", "VR-6HD", { hdmiIn: 6, hdmiOut: 3, xlrIn: 4, xlrOut: 2 }),
  switcher("Roland", "VR-120HD", { sdiIn: 6, hdmiIn: 6, sdiOut: 3, hdmiOut: 3, xlrIn: 6, xlrOut: 2 }),
  // Others
  switcher("Barco", "E2 Gen 2", { hdmiIn: 8, sdiIn: 8, hdmiOut: 4, sdiOut: 4 }),
  switcher("Barco", "S3-4K", { hdmiIn: 4, sdiIn: 4, hdmiOut: 2, sdiOut: 2 }),
  switcher("Ross Video", "Carbonite Black Solo", { sdiIn: 9, hdmiIn: 1, sdiOut: 6 }),
  switcher("Panasonic", "AV-HLC100", { sdiIn: 5, hdmiIn: 2, sdiOut: 3, hdmiOut: 1 }),
  switcher("Magewell", "Director Mini", { hdmiIn: 1, hdmiOut: 1, micIn: 1 }),
];
