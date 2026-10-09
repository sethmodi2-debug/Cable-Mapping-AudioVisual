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
import { CONNECTORS, PROTOCOLS } from "../model/options";
import type { Connector, Direction, Id, Protocol, Show } from "../model/types";

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
      <p className="hint">Click a device or a cable to edit its name, label and details.</p>
      <p className="hint">Select something and press Delete to remove it.</p>
    </aside>
  );
}

function DeviceInspector({ show, deviceId, onChange, onSelect }: { show: Show; deviceId: Id } & Omit<Props, "selection" | "show">) {
  const device = show.devices.find((d) => d.id === deviceId)!;
  const ports = show.ports.filter((p) => p.deviceId === deviceId);
  const [portName, setPortName] = useState("");
  const [direction, setDirection] = useState<Direction>("in");
  const [connector, setConnector] = useState<Connector>("XLR3");

  return (
    <aside className="inspector">
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

      <h4>Ports</h4>
      <ul className="port-list">
        {ports.map((p) => (
          <li key={p.id}>
            <input value={p.name} onChange={(e) => onChange(updatePort(show, p.id, { name: e.target.value }))} />
            <span className="hint">
              {p.direction} · {p.protocol ?? p.connector}
            </span>
            <button className="link" onClick={() => onChange(removePort(show, p.id))} aria-label={`Remove ${p.name}`}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!portName.trim()) return;
          onChange(addPort(show, { deviceId, name: portName.trim(), direction, connector }));
          setPortName("");
        }}
      >
        <input placeholder="New port" value={portName} onChange={(e) => setPortName(e.target.value)} />
        <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
          <option value="in">in</option>
          <option value="out">out</option>
          <option value="io">in/out</option>
        </select>
        <select value={connector} onChange={(e) => setConnector(e.target.value as Connector)}>
          {CONNECTORS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button type="submit">Add</button>
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
            Connector
            <select value={cable.connector} onChange={(e) => onChange(updateCable(show, cable.id, { connector: e.target.value as Connector }))}>
              {CONNECTORS.map((c) => (
                <option key={c}>{c}</option>
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
