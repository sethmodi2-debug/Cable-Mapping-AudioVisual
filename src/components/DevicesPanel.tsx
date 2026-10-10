import { useState } from "react";
import { addDevice, removeDevice } from "../model/edit";
import { CONNECTORS } from "../model/options";
import { portNames } from "../model/portList";
import type { Connector, Show } from "../model/types";

interface Props {
  show: Show;
  onChange: (show: Show) => void;
}

export function DevicesPanel({ show, onChange }: Props) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("Mic");
  const [location, setLocation] = useState("");
  const [inputs, setInputs] = useState(0);
  const [outputs, setOutputs] = useState(1);
  const [connector, setConnector] = useState<Connector>("XLR3");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onChange(addDevice(show, { name: name.trim(), kind, location, inputs, outputs, connector }));
    setName("");
  }

  return (
    <section>
      <h2>Devices</h2>
      <form className="row" onSubmit={submit}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Kind" value={kind} onChange={(e) => setKind(e.target.value)} />
        <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <label>
          In <input type="number" min={0} value={inputs} onChange={(e) => setInputs(Number(e.target.value))} />
        </label>
        <label>
          Out <input type="number" min={0} value={outputs} onChange={(e) => setOutputs(Number(e.target.value))} />
        </label>
        <select value={connector} onChange={(e) => setConnector(e.target.value as Connector)}>
          {CONNECTORS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button type="submit">Add device</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Kind</th>
            <th>Location</th>
            <th>Inputs</th>
            <th>Outputs</th>
            <th>Network</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {show.devices.map((d) => {
            const ports = show.ports.filter((p) => p.deviceId === d.id);
            return (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.kind}</td>
                <td>{d.location ?? ""}</td>
                <td>{portNames(ports, "in")}</td>
                <td>{portNames(ports, "out")}</td>
                <td>{portNames(ports, "io")}</td>
                <td>
                  <button className="link" onClick={() => onChange(removeDevice(show, d.id))}>
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
