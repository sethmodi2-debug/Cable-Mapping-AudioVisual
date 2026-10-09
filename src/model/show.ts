import type { Cable, Device, Id, Port, Show } from "./types";

export const FORMAT_VERSION = 1;

export function emptyShow(name: string): Show {
  return { formatVersion: FORMAT_VERSION, name, devices: [], ports: [], cables: [], connections: [] };
}

export interface Issue {
  connectionId?: Id;
  cableId?: Id;
  message: string;
}

function byId<T extends { id: Id }>(items: T[]): Map<Id, T> {
  return new Map(items.map((item) => [item.id, item]));
}

// Checks references and channel use. Returns an empty list for a valid show.
export function validate(show: Show): Issue[] {
  const issues: Issue[] = [];
  const devices = byId(show.devices);
  const ports = byId(show.ports);
  const cables = byId(show.cables);

  for (const port of show.ports) {
    if (!devices.has(port.deviceId)) {
      issues.push({ message: `Port "${port.name}" belongs to a missing device` });
    }
  }

  for (const cable of show.cables) {
    if (cable.parentCableId && !cables.has(cable.parentCableId)) {
      issues.push({ cableId: cable.id, message: `${cable.label} rides on a missing cable` });
    }
  }

  const sourcesPerInput = new Map<Id, number>();
  for (const conn of show.connections) {
    if (ports.get(conn.toPortId)?.direction === "in") {
      sourcesPerInput.set(conn.toPortId, (sourcesPerInput.get(conn.toPortId) ?? 0) + 1);
    }
  }
  for (const [portId, count] of sourcesPerInput) {
    if (count > 1) {
      const port = ports.get(portId)!;
      const device = devices.get(port.deviceId);
      issues.push({ message: `${device?.name ?? "?"} ${port.name} has ${count} sources plugged in` });
    }
  }

  const usedChannels = new Map<string, Id>();
  for (const conn of show.connections) {
    const from = ports.get(conn.fromPortId);
    const to = ports.get(conn.toPortId);
    if (!from || !to) {
      issues.push({ connectionId: conn.id, message: "Connection points at a missing port" });
      continue;
    }
    if (from.direction === "in") {
      issues.push({ connectionId: conn.id, message: `"${from.name}" is an input but is used as a source` });
    }
    if (to.direction === "out") {
      issues.push({ connectionId: conn.id, message: `"${to.name}" is an output but is used as a destination` });
    }
    if (!conn.cableId) continue;

    const cable = cables.get(conn.cableId);
    if (!cable) {
      issues.push({ connectionId: conn.id, message: "Connection uses a missing cable" });
      continue;
    }
    if (cable.channels > 1 && conn.channel === undefined) {
      issues.push({ connectionId: conn.id, message: `${cable.label} has ${cable.channels} channels but no channel is set` });
      continue;
    }
    const channel = conn.channel ?? 1;
    if (channel < 1 || channel > cable.channels) {
      issues.push({ connectionId: conn.id, message: `${cable.label} has no channel ${channel}` });
      continue;
    }
    const key = `${cable.id}#${channel}`;
    if (usedChannels.has(key)) {
      issues.push({ connectionId: conn.id, message: `${cable.label} channel ${channel} is used twice` });
    } else {
      usedChannels.set(key, conn.id);
    }
  }
  return issues;
}

export interface PatchRow {
  connectionId: Id;
  fromDevice: string;
  fromPort: string;
  toDevice: string;
  toPort: string;
  cable: string;
  channel?: number;
  protocol?: string;
}

// One row per connection, sorted by destination device then port, which is
// how a console input list reads.
export function patchList(show: Show): PatchRow[] {
  const devices = byId<Device>(show.devices);
  const ports = byId<Port>(show.ports);
  const cables = byId<Cable>(show.cables);

  const rows: PatchRow[] = [];
  for (const conn of show.connections) {
    const from = ports.get(conn.fromPortId);
    const to = ports.get(conn.toPortId);
    if (!from || !to) continue;
    const cable = conn.cableId ? cables.get(conn.cableId) : undefined;
    rows.push({
      connectionId: conn.id,
      fromDevice: devices.get(from.deviceId)?.name ?? "?",
      fromPort: from.name,
      toDevice: devices.get(to.deviceId)?.name ?? "?",
      toPort: to.name,
      cable: cable?.label ?? "",
      channel: conn.channel,
      protocol: cable?.protocol,
    });
  }
  return rows.sort(
    (a, b) =>
      a.toDevice.localeCompare(b.toDevice) ||
      a.toPort.localeCompare(b.toPort, undefined, { numeric: true }),
  );
}

export interface PullRow {
  connector: string;
  lengthM?: number;
  channels: number;
  count: number;
}

// Physical cables to pull from stock, grouped by connector, length and
// channel count. Network links that ride on another cable are not pulled.
export function pullList(show: Show): PullRow[] {
  const groups = new Map<string, PullRow>();
  for (const cable of show.cables) {
    if (cable.parentCableId) continue;
    const key = `${cable.connector}|${cable.lengthM ?? ""}|${cable.channels}`;
    const row = groups.get(key);
    if (row) row.count += 1;
    else groups.set(key, { connector: cable.connector, lengthM: cable.lengthM, channels: cable.channels, count: 1 });
  }
  return [...groups.values()].sort(
    (a, b) => a.connector.localeCompare(b.connector) || (a.lengthM ?? 0) - (b.lengthM ?? 0),
  );
}

export function serialize(show: Show): string {
  return JSON.stringify(show, null, 2) + "\n";
}

export function parse(json: string): Show {
  const data = JSON.parse(json) as Partial<Show>;
  if (data.formatVersion !== FORMAT_VERSION) {
    throw new Error(`Unsupported show format version: ${String(data.formatVersion)}`);
  }
  for (const key of ["devices", "ports", "cables", "connections"] as const) {
    if (!Array.isArray(data[key])) throw new Error(`Show file is missing "${key}"`);
  }
  return data as Show;
}
