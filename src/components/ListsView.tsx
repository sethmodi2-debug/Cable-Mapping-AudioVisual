import { patchList, pullList } from "../model/show";
import { deviceSystem, systemColor } from "../model/systems";
import type { Cable, Direction, Port, Show } from "../model/types";
import { cableType, isBidirectional } from "./cableColors";

interface Props {
  show: Show;
}

const SECTIONS = [
  { id: "lists-devices", title: "Devices" },
  { id: "lists-patch", title: "Patch list" },
  { id: "lists-cables", title: "Cable schedule" },
  { id: "lists-pull", title: "Pull list" },
];

const GROUPS: { direction: Direction; title: string }[] = [
  { direction: "in", title: "Inputs" },
  { direction: "out", title: "Outputs" },
  { direction: "io", title: "Network" },
];

function CableTag({ cable }: { cable?: Cable }) {
  if (!cable) return null;
  const type = cableType(cable.connector);
  return (
    <span className="cable-tag">
      <span className="swatch" style={{ background: type.color }} />
      {cable.label}
    </span>
  );
}

// The paperwork for a show, built from the map: what each device has and
// where it's plugged, the patch by destination, every cable, and what to pull.
export function ListsView({ show }: Props) {
  const devices = new Map(show.devices.map((d) => [d.id, d]));
  const ports = new Map(show.ports.map((p) => [p.id, p]));
  const cables = new Map(show.cables.map((c) => [c.id, c]));

  // For any port, the far end of its connection and the cable between.
  const links = new Map<string, { port: Port; cable?: Cable }>();
  for (const conn of show.connections) {
    const from = ports.get(conn.fromPortId);
    const to = ports.get(conn.toPortId);
    if (!from || !to) continue;
    const cable = conn.cableId ? cables.get(conn.cableId) : undefined;
    links.set(from.id, { port: to, cable });
    links.set(to.id, { port: from, cable });
  }
  const deviceName = (id: string) => devices.get(id)?.name ?? "?";
  // A channel number matters on a multicore; a network link carries everything.
  const showChannel = (cableId: string | undefined, channel: number | undefined) => {
    const cable = cableId ? cables.get(cableId) : undefined;
    return !!cable && channel !== undefined && cable.channels > 1 && !isBidirectional(cable.protocol);
  };

  // Patch grouped by the device it plugs into, the way an input list reads.
  const patch = patchList(show);
  const patchByDevice = [...new Set(patch.map((r) => r.toDevice))].map((name) => ({
    name,
    rows: patch.filter((r) => r.toDevice === name),
  }));

  // Each cable with the two ends it runs between.
  const cableEnds = new Map<string, string>();
  for (const conn of show.connections) {
    const from = ports.get(conn.fromPortId);
    const to = ports.get(conn.toPortId);
    if (!conn.cableId || !from || !to || cableEnds.has(conn.cableId)) continue;
    cableEnds.set(conn.cableId, `${deviceName(from.deviceId)} ${from.name} → ${deviceName(to.deviceId)} ${to.name}`);
  }

  const pull = pullList(show);
  const totalLength = show.cables.filter((c) => !c.parentCableId).reduce((m, c) => m + (c.lengthM ?? 0), 0);
  const used = show.ports.filter((p) => links.has(p.id)).length;

  return (
    <div className="lists">
      <div className="lists-summary">
        <div>
          <strong>{show.devices.length}</strong> devices
        </div>
        <div>
          <strong>{show.connections.length}</strong> connections
        </div>
        <div>
          <strong>
            {used}/{show.ports.length}
          </strong>{" "}
          ports in use
        </div>
        <div>
          <strong>{show.cables.filter((c) => !c.parentCableId).length}</strong> cables, <strong>{totalLength} m</strong> total
        </div>
      </div>

      <nav className="lists-nav">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => (e.preventDefault(), document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }))}
          >
            {s.title}
          </a>
        ))}
      </nav>

      <section id="lists-devices">
        <h2>Devices</h2>
        <p className="hint">Every device with each of its ports and what's plugged into it.</p>
        <div className="device-cards">
          {show.devices.map((d) => {
            const mine = show.ports.filter((p) => p.deviceId === d.id);
            const system = deviceSystem(d, mine);
            const meta = [d.kind, d.model, d.location].filter(Boolean).join(" · ");
            return (
              <article key={d.id} className="device-card">
                <header>
                  <div className="device-card-title">
                    <h3>{d.name}</h3>
                    <span className="system-tag" style={{ background: systemColor(system) }}>
                      {system}
                    </span>
                  </div>
                  <div className="hint">{meta}</div>
                  {d.ip && <div className="device-ip">{d.ip}</div>}
                </header>
                {mine.length === 0 && <p className="hint">No ports.</p>}
                {GROUPS.map(({ direction, title }) => {
                  const group = mine.filter((p) => p.direction === direction);
                  if (group.length === 0) return null;
                  return (
                    <table key={direction} className="port-table">
                      <thead>
                        <tr>
                          <th colSpan={3}>
                            {title} ({group.length})
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.map((p) => {
                          const link = links.get(p.id);
                          return (
                            <tr key={p.id} className={link ? undefined : "unused"}>
                              <td className="port-cell">{p.name}</td>
                              <td>
                                {link ? (
                                  <>
                                    {direction === "in" ? "← " : direction === "out" ? "→ " : "↔ "}
                                    {deviceName(link.port.deviceId)} <span className="hint">{link.port.name}</span>
                                  </>
                                ) : (
                                  <span className="hint">Not connected</span>
                                )}
                              </td>
                              <td className="cable-cell">
                                <CableTag cable={link?.cable} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })}
              </article>
            );
          })}
        </div>
      </section>

      <section id="lists-patch">
        <h2>Patch list</h2>
        <p className="hint">What plugs into each device, input by input.</p>
        {patchByDevice.map((group) => (
          <table key={group.name} className="grouped">
            <thead>
              <tr className="group-title">
                <th colSpan={5}>{group.name}</th>
              </tr>
              <tr>
                <th>Plugs into</th>
                <th>From</th>
                <th>Its port</th>
                <th>Cable</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((r) => {
                const conn = show.connections.find((c) => c.id === r.connectionId);
                return (
                  <tr key={r.connectionId}>
                    <td className="port-cell">{r.toPort}</td>
                    <td>{r.fromDevice}</td>
                    <td>{r.fromPort}</td>
                    <td>
                      <CableTag cable={conn?.cableId ? cables.get(conn.cableId) : undefined} />
                      {showChannel(conn?.cableId, r.channel) ? (
                        <span className="hint"> ch {r.channel}</span>
                      ) : null}
                    </td>
                    <td>{r.protocol ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}
        {patch.length === 0 && <p className="hint">Nothing is connected yet. Draw cables on the map.</p>}
      </section>

      <section id="lists-cables">
        <h2>Cable schedule</h2>
        <p className="hint">Every cable and network link, with where it runs.</p>
        <table>
          <thead>
            <tr>
              <th>Cable</th>
              <th>Type</th>
              <th>Signal</th>
              <th>Length</th>
              <th>Runs from → to</th>
            </tr>
          </thead>
          <tbody>
            {show.cables.map((c) => (
              <tr key={c.id}>
                <td>
                  <CableTag cable={c} />
                </td>
                <td>{cableType(c.connector).name}</td>
                <td>
                  {c.protocol}
                  {c.channels > 1 && <span className="hint"> · {c.channels} ch</span>}
                </td>
                <td>{c.lengthM !== undefined ? `${c.lengthM} m` : ""}</td>
                <td>{cableEnds.get(c.id) ?? <span className="hint">Not plugged in</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section id="lists-pull">
        <h2>Pull list</h2>
        <p className="hint">What to take off the truck, grouped by type and length.</p>
        <table>
          <thead>
            <tr>
              <th>Qty</th>
              <th>Type</th>
              <th>Length</th>
              <th>Channels</th>
            </tr>
          </thead>
          <tbody>
            {pull.map((row) => {
              const type = cableType(row.connector as Cable["connector"]);
              return (
                <tr key={`${row.connector}-${row.lengthM}-${row.channels}`}>
                  <td>
                    <strong>{row.count}×</strong>
                  </td>
                  <td>
                    <span className="cable-tag">
                      <span className="swatch" style={{ background: type.color }} />
                      {type.name}
                    </span>
                  </td>
                  <td>{row.lengthM !== undefined ? `${row.lengthM} m` : ""}</td>
                  <td>{row.channels > 1 ? row.channels : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
