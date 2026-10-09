import type { Cable, Connection, Connector, Device, Id, Port, Show } from "./types";

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
