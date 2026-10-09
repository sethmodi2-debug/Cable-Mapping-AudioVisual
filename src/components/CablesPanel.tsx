import { useState } from "react";
import { addCable, removeCable } from "../model/edit";
import { CONNECTORS, PROTOCOLS } from "../model/options";
import type { Connector, Protocol, Show } from "../model/types";

interface Props {
  show: Show;
  onChange: (show: Show) => void;
}

export function CablesPanel({ show, onChange }: Props) {
  const [label, setLabel] = useState("");
  const [connector, setConnector] = useState<Connector>("XLR3");
  const [protocol, setProtocol] = useState<Protocol>("Analog");
  const [lengthM, setLengthM] = useState("");
  const [channels, setChannels] = useState(1);
  const [parentCableId, setParentCableId] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    onChange(
      addCable(show, {
        label: label.trim(),
        connector,
        protocol,
        lengthM: lengthM === "" ? undefined : Number(lengthM),
        channels: Math.max(1, channels),
        parentCableId: parentCableId || undefined,
      }),
    );
    setLabel("");
  }

  const labelOf = (id?: string) => show.cables.find((c) => c.id === id)?.label ?? "";

  return (
    <section>
      <h2>Cables and links</h2>
      <form className="row" onSubmit={submit}>
        <input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <select value={connector} onChange={(e) => setConnector(e.target.value as Connector)}>
          {CONNECTORS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={protocol} onChange={(e) => setProtocol(e.target.value as Protocol)}>
          {PROTOCOLS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <input placeholder="Length (m)" value={lengthM} onChange={(e) => setLengthM(e.target.value)} />
        <label>
          Ch <input type="number" min={1} value={channels} onChange={(e) => setChannels(Number(e.target.value))} />
        </label>
        <select value={parentCableId} onChange={(e) => setParentCableId(e.target.value)}>
          <option value="">Rides on: (own cable)</option>
          {show.cables.map((c) => (
            <option key={c.id} value={c.id}>
              Rides on {c.label}
            </option>
          ))}
        </select>
        <button type="submit">Add cable</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Label</th>
            <th>Connector</th>
            <th>Protocol</th>
            <th>Length (m)</th>
            <th>Ch</th>
            <th>Rides on</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {show.cables.map((c) => (
            <tr key={c.id}>
              <td>{c.label}</td>
              <td>{c.connector}</td>
              <td>{c.protocol}</td>
              <td>{c.lengthM ?? ""}</td>
              <td>{c.channels}</td>
              <td>{labelOf(c.parentCableId)}</td>
              <td>
                <button className="link" onClick={() => onChange(removeCable(show, c.id))}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
