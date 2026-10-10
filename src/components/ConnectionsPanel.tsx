import { useState } from "react";
import { addConnection, removeConnection } from "../model/edit";
import { patchList } from "../model/show";
import type { Show } from "../model/types";

interface Props {
  show: Show;
  onChange: (show: Show) => void;
}

export function ConnectionsPanel({ show, onChange }: Props) {
  const [fromPortId, setFrom] = useState("");
  const [toPortId, setTo] = useState("");
  const [cableId, setCable] = useState("");
  const [channel, setChannel] = useState("");

  const deviceName = (id: string) => show.devices.find((d) => d.id === id)?.name ?? "?";
  const portLabel = (p: Show["ports"][number]) => `${deviceName(p.deviceId)} · ${p.name}`;
  const sources = show.ports.filter((p) => p.direction !== "in");
  const destinations = show.ports.filter((p) => p.direction !== "out");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromPortId || !toPortId) return;
    onChange(
      addConnection(show, {
        fromPortId,
        toPortId,
        cableId: cableId || undefined,
        channel: channel === "" ? undefined : Number(channel),
      }),
    );
    setChannel(channel === "" ? "" : String(Number(channel) + 1));
  }

  return (
    <section>
      <h2>Patch</h2>
      <form className="row" onSubmit={submit}>
        <select value={fromPortId} onChange={(e) => setFrom(e.target.value)}>
          <option value="">From…</option>
          {sources.map((p) => (
            <option key={p.id} value={p.id}>
              {portLabel(p)}
            </option>
          ))}
        </select>
        <select value={toPortId} onChange={(e) => setTo(e.target.value)}>
          <option value="">To…</option>
          {destinations.map((p) => (
            <option key={p.id} value={p.id}>
              {portLabel(p)}
            </option>
          ))}
        </select>
        <select value={cableId} onChange={(e) => setCable(e.target.value)}>
          <option value="">No cable</option>
          {show.cables.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} ({c.protocol})
            </option>
          ))}
        </select>
        <input placeholder="Ch" value={channel} onChange={(e) => setChannel(e.target.value)} />
        <button type="submit">Connect</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Cable</th>
            <th>From device</th>
            <th>Plugs out of</th>
            <th>To device</th>
            <th>Plugs into</th>
            <th>Signal</th>
            <th>Channel</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {patchList(show).map((row) => (
            <tr key={row.connectionId}>
              <td>{row.cable}</td>
              <td>{row.fromDevice}</td>
              <td>{row.fromPort}</td>
              <td>{row.toDevice}</td>
              <td>{row.toPort}</td>
              <td>{row.protocol ?? ""}</td>
              <td>{row.channel ?? ""}</td>
              <td>
                <button className="link" onClick={() => onChange(removeConnection(show, row.connectionId))}>
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
