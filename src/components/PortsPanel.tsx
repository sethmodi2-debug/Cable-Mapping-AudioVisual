import type { Show } from "../model/types";

interface Props {
  show: Show;
}

const DIRECTION = { in: "Input", out: "Output", io: "Network" } as const;

// Every port on every device and what's plugged into it, device by device.
export function PortsPanel({ show }: Props) {
  const ports = new Map(show.ports.map((p) => [p.id, p]));
  const devices = new Map(show.devices.map((d) => [d.id, d]));
  const cables = new Map(show.cables.map((c) => [c.id, c]));
  const otherEnd = (portId: string) => {
    const conn = show.connections.find((c) => c.fromPortId === portId || c.toPortId === portId);
    if (!conn) return null;
    const other = ports.get(conn.fromPortId === portId ? conn.toPortId : conn.fromPortId);
    return {
      device: other ? (devices.get(other.deviceId)?.name ?? "?") : "?",
      port: other?.name ?? "?",
      cable: conn.cableId ? (cables.get(conn.cableId)?.label ?? "") : "",
    };
  };

  return (
    <section>
      <h2>Where everything plugs in</h2>
      <table>
        <thead>
          <tr>
            <th>Device</th>
            <th>Port</th>
            <th>Type</th>
            <th>Connected to</th>
            <th>On its</th>
            <th>Cable</th>
          </tr>
        </thead>
        <tbody>
          {show.devices.flatMap((d) =>
            show.ports
              .filter((p) => p.deviceId === d.id)
              .map((p, i) => {
                const end = otherEnd(p.id);
                return (
                  <tr key={p.id} className={i === 0 ? "group-start" : undefined}>
                    <td>{i === 0 ? d.name : ""}</td>
                    <td>{p.name}</td>
                    <td>{DIRECTION[p.direction]}</td>
                    <td>{end?.device ?? <span className="hint">Not connected</span>}</td>
                    <td>{end?.port ?? ""}</td>
                    <td>{end?.cable ?? ""}</td>
                  </tr>
                );
              }),
          )}
        </tbody>
      </table>
    </section>
  );
}
