import type { Cable, Connection, Connector, Device, Id, Port, Protocol, Show } from "./types";

// Pure edit helpers: each returns a new Show and leaves the input untouched,
// so React state updates stay simple.

export function newId(): Id {
  return crypto.randomUUID();
}

export interface NewDevice {
  name: string;
  kind: string;
  location?: string;
  inputs: number;
  outputs: number;
  connector: Connector;
}

// Adds a device with numbered input and output ports ("Input 1", "Output 1"...).
export function addDevice(show: Show, spec: NewDevice): Show {
  const device: Device = { id: newId(), name: spec.name, kind: spec.kind, location: spec.location || undefined };
  const ports: Port[] = [];
  for (let i = 1; i <= spec.inputs; i++) {
    ports.push({ id: newId(), deviceId: device.id, name: `Input ${i}`, direction: "in", connector: spec.connector });
  }
  for (let i = 1; i <= spec.outputs; i++) {
    ports.push({ id: newId(), deviceId: device.id, name: `Output ${i}`, direction: "out", connector: spec.connector });
  }
  return { ...show, devices: [...show.devices, device], ports: [...show.ports, ...ports] };
}

export function addPort(show: Show, port: Omit<Port, "id">): Show {
  return { ...show, ports: [...show.ports, { ...port, id: newId() }] };
}

export function addCable(show: Show, cable: Omit<Cable, "id">): Show {
  return { ...show, cables: [...show.cables, { ...cable, id: newId() }] };
}

export function addConnection(show: Show, conn: Omit<Connection, "id">): Show {
  return { ...show, connections: [...show.connections, { ...conn, id: newId() }] };
}

// Removing a device also removes its ports and any connections to them.
export function removeDevice(show: Show, deviceId: Id): Show {
  const portIds = new Set(show.ports.filter((p) => p.deviceId === deviceId).map((p) => p.id));
  return {
    ...show,
    devices: show.devices.filter((d) => d.id !== deviceId),
    ports: show.ports.filter((p) => !portIds.has(p.id)),
    connections: show.connections.filter((c) => !portIds.has(c.fromPortId) && !portIds.has(c.toPortId)),
  };
}

// Removing a cable unpatches connections that used it (they stay as plain
// port-to-port connections) and drops links that rode on it.
export function removeCable(show: Show, cableId: Id): Show {
  const removed = new Set([cableId, ...show.cables.filter((c) => c.parentCableId === cableId).map((c) => c.id)]);
  return {
    ...show,
    cables: show.cables.filter((c) => !removed.has(c.id)),
    connections: show.connections.map((c) =>
      c.cableId && removed.has(c.cableId) ? { ...c, cableId: undefined, channel: undefined } : c,
    ),
  };
}

export function removeConnection(show: Show, connectionId: Id): Show {
  return { ...show, connections: show.connections.filter((c) => c.id !== connectionId) };
}

export function moveDevice(show: Show, deviceId: Id, position: { x: number; y: number }): Show {
  return { ...show, devices: show.devices.map((d) => (d.id === deviceId ? { ...d, position } : d)) };
}

export function updateDevice(show: Show, deviceId: Id, patch: Partial<Omit<Device, "id">>): Show {
  return { ...show, devices: show.devices.map((d) => (d.id === deviceId ? { ...d, ...patch } : d)) };
}

export function updatePort(show: Show, portId: Id, patch: Partial<Omit<Port, "id" | "deviceId">>): Show {
  return { ...show, ports: show.ports.map((p) => (p.id === portId ? { ...p, ...patch } : p)) };
}

export function removePort(show: Show, portId: Id): Show {
  return {
    ...show,
    ports: show.ports.filter((p) => p.id !== portId),
    connections: show.connections.filter((c) => c.fromPortId !== portId && c.toPortId !== portId),
  };
}

export function updateCable(show: Show, cableId: Id, patch: Partial<Omit<Cable, "id">>): Show {
  return { ...show, cables: show.cables.map((c) => (c.id === cableId ? { ...c, ...patch } : c)) };
}

export function updateConnection(show: Show, connectionId: Id, patch: Partial<Omit<Connection, "id">>): Show {
  return { ...show, connections: show.connections.map((c) => (c.id === connectionId ? { ...c, ...patch } : c)) };
}

// Typical channel count for a link of each network protocol.
const LINK_CHANNELS: Partial<Record<Protocol, number>> = {
  Dante: 64,
  AES50: 48,
  SLink: 128,
  gigaACE: 128,
  dSNAKE: 40,
  MADI: 64,
  AES3: 2,
};

const CONNECTOR_PREFIX: Record<Connector, string> = {
  XLR3: "XLR",
  XLR5: "XLR",
  TRS: "JACK",
  TS: "JACK",
  speakON: "SPK",
  etherCON: "CAT",
  RJ45: "CAT",
  BNC: "BNC",
  HDMI: "HDMI",
  DisplayPort: "DP",
  Fiber: "FIB",
  Other: "CBL",
};

export function labelPrefix(connector: Connector, protocol: Protocol): string {
  return protocol === "Analog" ? CONNECTOR_PREFIX[connector] : protocol.toUpperCase();
}

// Next free label for a prefix: XLR-01, XLR-02, ...
export function nextLabel(show: Show, prefix: string): string {
  const used = new Set(show.cables.map((c) => c.label));
  for (let n = 1; ; n++) {
    const label = `${prefix}-${String(n).padStart(2, "0")}`;
    if (!used.has(label)) return label;
  }
}

// Connects two ports, as when a cable is drawn on the map. Accepts the ports
// in either order and puts the source first. A new cable is created and
// labeled from the source port's connector and protocol.
export function connectPorts(show: Show, aPortId: Id, bPortId: Id): Show {
  const a = show.ports.find((p) => p.id === aPortId);
  const b = show.ports.find((p) => p.id === bPortId);
  if (!a || !b || a.id === b.id) return show;
  const [from, to] = a.direction === "in" || b.direction === "out" ? [b, a] : [a, b];
  const protocol = from.protocol ?? to.protocol ?? "Analog";
  const channels = LINK_CHANNELS[protocol] ?? 1;
  const cable: Cable = {
    id: newId(),
    label: nextLabel(show, labelPrefix(from.connector, protocol)),
    connector: from.connector,
    protocol,
    channels,
  };
  const connection: Connection = {
    id: newId(),
    fromPortId: from.id,
    toPortId: to.id,
    cableId: cable.id,
    channel: channels > 1 ? 1 : undefined,
  };
  return { ...show, cables: [...show.cables, cable], connections: [...show.connections, connection] };
}

// Removes a connection drawn on the map, and its cable too when nothing else
// uses it, so deleting a line on the map also takes it off the pull list.
export function disconnect(show: Show, connectionId: Id): Show {
  const conn = show.connections.find((c) => c.id === connectionId);
  const next = removeConnection(show, connectionId);
  const cableId = conn?.cableId;
  if (!cableId) return next;
  const stillUsed =
    next.connections.some((c) => c.cableId === cableId) || next.cables.some((c) => c.parentCableId === cableId);
  return stillUsed ? next : { ...next, cables: next.cables.filter((c) => c.id !== cableId) };
}
