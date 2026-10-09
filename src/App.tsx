import { useState } from "react";
import { CablesPanel } from "./components/CablesPanel";
import { ConnectionsPanel } from "./components/ConnectionsPanel";
import { DevicesPanel } from "./components/DevicesPanel";
import { openShowFile, saveShowFile } from "./file";
import { sampleShow } from "./model/sample";
import { emptyShow, pullList, validate } from "./model/show";
import type { Show } from "./model/types";
import "./App.css";

function App() {
  const [show, setShow] = useState<Show>(sampleShow);
  const [path, setPath] = useState<string | undefined>();
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issues = validate(show);

  function edit(next: Show) {
    setShow(next);
    setDirty(true);
  }

  function load(next: Show, nextPath?: string) {
    setShow(next);
    setPath(nextPath);
    setDirty(false);
    setError(null);
  }

  async function run(action: () => Promise<void>) {
    try {
      setError(null);
      await action();
    } catch (e) {
      setError(String(e));
    }
  }

  const onOpen = () =>
    run(async () => {
      const result = await openShowFile();
      if (result) load(result.show, result.path);
    });

  const onSave = (saveAs: boolean) =>
    run(async () => {
      const saved = await saveShowFile(show, saveAs ? undefined : path);
      if (saved) {
        setPath(saved);
        setDirty(false);
      }
    });

  return (
    <main className="container">
      <header className="toolbar">
        <input
          className="show-name"
          value={show.name}
          onChange={(e) => edit({ ...show, name: e.target.value })}
          aria-label="Show name"
        />
        <button onClick={() => load(emptyShow("Untitled show"))}>New</button>
        <button onClick={() => load(sampleShow)}>Sample</button>
        <button onClick={onOpen}>Open…</button>
        <button onClick={() => onSave(false)}>Save</button>
        <button onClick={() => onSave(true)}>Save as…</button>
        <span className="path">
          {path ?? "Not saved"}
          {dirty ? " •" : ""}
        </span>
      </header>

      {error && <p className="issues">{error}</p>}
      {issues.length > 0 && (
        <ul className="issues">
          {issues.map((issue, i) => (
            <li key={i}>{issue.message}</li>
          ))}
        </ul>
      )}

      <DevicesPanel show={show} onChange={edit} />
      <CablesPanel show={show} onChange={edit} />
      <ConnectionsPanel show={show} onChange={edit} />

      <section>
        <h2>Cable pull list</h2>
        <table>
          <thead>
            <tr>
              <th>Connector</th>
              <th>Length (m)</th>
              <th>Channels</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {pullList(show).map((row) => (
              <tr key={`${row.connector}-${row.lengthM}-${row.channels}`}>
                <td>{row.connector}</td>
                <td>{row.lengthM ?? ""}</td>
                <td>{row.channels}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

export default App;
