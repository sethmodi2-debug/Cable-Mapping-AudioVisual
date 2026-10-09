import { useState } from "react";
import {
  addPort,
  numberedNames,
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
  const [portName, setPortName] = useState("");
  const [direction, setDirection] = useState<Direction>("in");
  const [connector, setConnector] = useState<Connector>("XLR3");
  const [quantity, setQuantity] = useState(1);

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
          Device type
          <input
            value={device.kind}
            placeholder="Console, Stage box, Mic, Projector…"
            onChange={(e) => onChange(updateDevice(show, deviceId, { kind: e.target.value }))}
          />
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

      {ports.some(isNetworkPort) && (
        // One address for the device: its network ports share it.
        <section className="panel-card">
          <label>
            IP address
            <input
              className="ip-input"
              value={device.ip ?? ""}
              placeholder="192.168.1.10"
              inputMode="decimal"
              onChange={(e) => onChange(updateDevice(show, deviceId, { ip: e.target.value.trim() || undefined }))}
            />
            {device.ip && !isValidIp(device.ip) && <span className="field-warning">Not a valid IPv4 address</span>}
          </label>
        </section>
      )}

      <section className="panel-card">
        <h4>Ports ({ports.length})</h4>
        {ports.length === 0 && <p className="hint">No ports yet. Add some below.</p>}
        {PORT_GROUPS.map(({ direction, label }) => {
          const group = ports.filter((p) => p.direction === direction);
          if (group.length === 0) return null;
          return (
            <div key={direction} className="port-group">
              <div className="port-group-title">
                {label} <span className="hint">{group.length}</span>
              </div>
              <ul className="port-list">
                {group.map((p) => (
                  <li key={p.id}>
                    <input value={p.name} onChange={(e) => onChange(updatePort(show, p.id, { name: e.target.value }))} />
                    <span className="hint">{p.protocol ?? cableType(p.connector).short}</span>
                    <button className="link" onClick={() => onChange(removePort(show, p.id))} aria-label={`Remove ${p.name}`}>
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <form
        className="panel-card add-port"
        onSubmit={(e) => {
          e.preventDefault();
          const typed = portName.trim();
          const existing = ports.map((p) => p.name);
          // A single port with a name typed in keeps that name; otherwise ports are numbered.
          const names =
            typed && quantity === 1 && !existing.includes(typed) ? [typed] : numberedNames(existing, typed || DEFAULT_PORT_NAMES[direction], quantity);
          onChange(names.reduce((next, name) => addPort(next, { deviceId, name, direction, connector }), show));
          setPortName("");
        }}
      >
        <h4>+ Add ports</h4>
        <div className="add-port-row">
          <label className="grow">
            Name
            <input placeholder={DEFAULT_PORT_NAMES[direction]} value={portName} onChange={(e) => setPortName(e.target.value)} />
          </label>
          <label>
            How many
            <input
              type="number"
              min={1}
              max={128}
              value={quantity}
              onChange={(e) => setQuantity(Math.min(128, Math.max(1, Number(e.target.value) || 1)))}
            />
          </label>
        </div>
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
        <button type="submit" className="primary">
          Add {quantity > 1 ? `${quantity} ports` : "port"}
        </button>
        <p className="hint">Numbered on from what's there, e.g. {DEFAULT_PORT_NAMES[direction]} 1, 2, 3…</p>
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

const DEFAULT_PORT_NAMES: Record<Direction, string> = { in: "Input", out: "Output", io: "Network" };

function isValidIp(ip: string): boolean {
  const parts = ip.split(".");
  return parts.length === 4 && parts.every((n) => /^\d{1,3}$/.test(n) && Number(n) <= 255);
}

const PORT_GROUPS: { direction: Direction; label: string }[] = [
  { direction: "in", label: "Inputs" },
  { direction: "out", label: "Outputs" },
  { direction: "io", label: "Network" },
];

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
