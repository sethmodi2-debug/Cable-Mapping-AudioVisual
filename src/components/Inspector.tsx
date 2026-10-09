import { useState } from "react";
import {
  addPort,
  disconnect,
  removeDevice,
  removePort,
  updateCable,
  updateConnection,
  updateDevice,
  updatePort,
} from "../model/edit";
import { PROTOCOLS } from "../model/options";
import { CABLE_TYPES, cableType } from "./cableColors";
import { deviceSystem, isNetworkPort, SYSTEMS } from "../model/systems";
import type { Connector, Direction, Id, Protocol, Show, SystemType } from "../model/types";

export type Selection = { kind: "device"; id: Id } | { kind: "connection"; id: Id } | null;

interface Props {
  show: Show;
  selection: Selection;
  onChange: (show: Show) => void;
  onSelect: (selection: Selection) => void;
}

export function Inspector({ show, selection, onChange, onSelect }: Props) {
  if (selection?.kind === "device") {
    const device = show.devices.find((d) => d.id === selection.id);
    if (device) return <DeviceInspector show={show} deviceId={device.id} onChange={onChange} onSelect={onSelect} />;
  }
  if (selection?.kind === "connection") {
    const conn = show.connections.find((c) => c.id === selection.id);
    if (conn) return <ConnectionInspector show={show} connectionId={conn.id} onChange={onChange} onSelect={onSelect} />;
  }
  return (
    <aside className="inspector">
      <h3>Nothing selected</h3>
      <p className="hint">Drag from one port's dot to another to run a cable, then pick its type.</p>
      <p className="hint">To move a cable, grab the dot of the input it's plugged into and drop it on another port. Let go over empty space to unplug it.</p>
      <p className="hint">Plugging into an input that's already in use replaces what was there.</p>
      <p className="hint">Click a device or a cable to edit it. Press Delete to remove what's selected.</p>
    </aside>
  );
}

function DeviceInspector({ show, deviceId, onChange, onSelect }: { show: Show; deviceId: Id } & Omit<Props, "selection" | "show">) {
  const device = show.devices.find((d) => d.id === deviceId)!;
  const ports = show.ports.filter((p) => p.deviceId === deviceId);
  const networkPorts = ports.filter(isNetworkPort);
  const [portName, setPortName] = useState("");
  const [direction, setDirection] = useState<Direction>("in");
  const [connector, setConnector] = useState<Connector>("XLR3");

  return (
    <aside className="inspector">
      <section className="panel-card">
        <h3>Device</h3>
        {device.model && <p className="hint">{device.model}</p>}
        <label>
          Name
          <input value={device.name} onChange={(e) => onChange(updateDevice(show, deviceId, { name: e.target.value }))} />
        </label>
        <label>
          Kind
          <input value={device.kind} onChange={(e) => onChange(updateDevice(show, deviceId, { kind: e.target.value }))} />
        </label>
        <label>
          Location
          <input
            value={device.location ?? ""}
            placeholder="Stage left, FOH, Rack 2…"
            onChange={(e) => onChange(updateDevice(show, deviceId, { location: e.target.value || undefined }))}
          />
        </label>
        <label>
          System
          <select value={deviceSystem(device, ports)} onChange={(e) => onChange(updateDevice(show, deviceId, { system: e.target.value as SystemType }))}>
            {SYSTEMS.map((s) => (
              <option key={s.name}>{s.name}</option>
            ))}
          </select>
        </label>
      </section>

      {networkPorts.length > 0 && (
        <section className="panel-card">
          <h4>IP addresses</h4>
          {networkPorts.map((p) => (
            <label key={p.id}>
              {p.name}
              <input
                className="ip-input"
                value={p.ip ?? ""}
                placeholder="192.168.1.10"
                inputMode="decimal"
                onChange={(e) => onChange(updatePort(show, p.id, { ip: e.target.value.trim() || undefined }))}
              />
              {p.ip && !isValidIp(p.ip) && <span className="field-warning">Not a valid IPv4 address</span>}
            </label>
          ))}
        </section>
      )}

      <section className="panel-card">
        <h4>Ports ({ports.length})</h4>
        <ul className="port-list">
          {ports.map((p) => (
            <li key={p.id}>
              <input value={p.name} onChange={(e) => onChange(updatePort(show, p.id, { name: e.target.value }))} />
              <span className="hint">
                {DIRECTION_LABELS[p.direction]} · {p.protocol ?? cableType(p.connector).short}
              </span>
              <button className="link" onClick={() => onChange(removePort(show, p.id))} aria-label={`Remove ${p.name}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>

      <form
        className="panel-card add-port"
        onSubmit={(e) => {
          e.preventDefault();
          if (!portName.trim()) return;
          onChange(addPort(show, { deviceId, name: portName.trim(), direction, connector }));
          setPortName("");
        }}
      >
        <h4>+ Add a port</h4>
        <label>
          Port name
          <input placeholder="Input 17, Aux 3, Dante…" value={portName} onChange={(e) => setPortName(e.target.value)} />
        </label>
        <div className="add-port-row">
          <label>
            Direction
            <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
              <option value="in">Input</option>
              <option value="out">Output</option>
              <option value="io">Network (in/out)</option>
            </select>
          </label>
          <label>
            Connector
            <select value={connector} onChange={(e) => setConnector(e.target.value as Connector)}>
              {CABLE_TYPES.map((t) => (
                <option key={t.connector} value={t.connector}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className="primary" disabled={!portName.trim()}>
          Add port
        </button>
      </form>

      <button
        className="danger"
        onClick={() => {
          onChange(removeDevice(show, deviceId));
          onSelect(null);
        }}
      >
        Delete device
      </button>
    </aside>
  );
}

function isValidIp(ip: string): boolean {
  const parts = ip.split(".");
  return parts.length === 4 && parts.every((n) => /^\d{1,3}$/.test(n) && Number(n) <= 255);
}

const DIRECTION_LABELS: Record<Direction, string> = { in: "input", out: "output", io: "network" };

function ConnectionInspector({ show, connectionId, onChange, onSelect }: { show: Show; connectionId: Id } & Omit<Props, "selection" | "show">) {
  const conn = show.connections.find((c) => c.id === connectionId)!;
  const cable = show.cables.find((c) => c.id === conn.cableId);
  const portLabel = (id: Id) => {
    const port = show.ports.find((p) => p.id === id);
    const device = show.devices.find((d) => d.id === port?.deviceId);
    return `${device?.name ?? "?"} · ${port?.name ?? "?"}`;
  };

  return (
    <aside className="inspector">
      <h3>Cable</h3>
      <p className="route">
        {portLabel(conn.fromPortId)} → {portLabel(conn.toPortId)}
      </p>
      <label>
        Cable
        <select value={conn.cableId ?? ""} onChange={(e) => onChange(updateConnection(show, connectionId, { cableId: e.target.value || undefined }))}>
          <option value="">No cable</option>
          {show.cables.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} ({c.protocol})
            </option>
          ))}
        </select>
      </label>
      {cable && (
        <>
          <label>
            Label
            <input value={cable.label} onChange={(e) => onChange(updateCable(show, cable.id, { label: e.target.value }))} />
          </label>
          <label>
            Cable type
            <select value={cable.connector} onChange={(e) => onChange(updateCable(show, cable.id, { connector: e.target.value as Connector }))}>
              {CABLE_TYPES.map((t) => (
                <option key={t.connector} value={t.connector}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Signal
            <select value={cable.protocol} onChange={(e) => onChange(updateCable(show, cable.id, { protocol: e.target.value as Protocol }))}>
              {PROTOCOLS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Length (m)
            <input
              type="number"
              min={0}
              value={cable.lengthM ?? ""}
              onChange={(e) => onChange(updateCable(show, cable.id, { lengthM: e.target.value === "" ? undefined : Number(e.target.value) }))}
            />
          </label>
          <label>
            Channels on cable
            <input
              type="number"
              min={1}
              value={cable.channels}
              onChange={(e) => onChange(updateCable(show, cable.id, { channels: Math.max(1, Number(e.target.value)) }))}
            />
          </label>
          {cable.channels > 1 && (
            <label>
              This connection's channel
              <input
                type="number"
                min={1}
                max={cable.channels}
                value={conn.channel ?? ""}
                onChange={(e) => onChange(updateConnection(show, connectionId, { channel: e.target.value === "" ? undefined : Number(e.target.value) }))}
              />
            </label>
          )}
        </>
      )}
      <button
        className="danger"
        onClick={() => {
          onChange(disconnect(show, connectionId));
          onSelect(null);
        }}
      >
        Delete connection
      </button>
    </aside>
  );
}
