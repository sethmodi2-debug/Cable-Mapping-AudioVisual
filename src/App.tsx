import { useState } from "react";
import { CablesPanel } from "./components/CablesPanel";
import { ConnectionsPanel } from "./components/ConnectionsPanel";
import { DevicesPanel } from "./components/DevicesPanel";
import { MapView } from "./components/MapView";
import { openShowFile, saveShowFile } from "./file";
import { useHistory, useUndoKeys } from "./history";
import { dliveShow } from "./model/dliveSample";
import { emptyShow, pullList, validate } from "./model/show";
import type { Show } from "./model/types";
import "./App.css";

function App() {
  const history = useHistory<Show>(dliveShow);
  const show = history.value;
  useUndoKeys(history.undo, history.redo);
  const [path, setPath] = useState<string | undefined>();
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"map" | "lists">("map");

  const issues = validate(show);

  function edit(next: Show) {
    history.set(next);
    setDirty(true);
  }

  // Loading is undoable too, so New or Sample never loses work for good.
  function load(next: Show, nextPath?: string) {
    history.set(next);
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
    <main className={tab === "map" ? "app app-map" : "app container"}>
      <header className="toolbar">
        <input
          className="show-name"
          value={show.name}
          onChange={(e) => edit({ ...show, name: e.target.value })}
          aria-label="Show name"
        />
        <button onClick={() => load(emptyShow("Untitled show"))}>New</button>
        <button onClick={() => load(dliveShow)}>Sample</button>
        <button onClick={onOpen}>Open…</button>
        <button onClick={() => onSave(false)}>Save</button>
        <button onClick={() => onSave(true)}>Save as…</button>
        <button onClick={history.undo} disabled={!history.canUndo} title="Undo (Ctrl+Z)">
          ↶ Undo
        </button>
        <button onClick={history.redo} disabled={!history.canRedo} title="Redo (Ctrl+Shift+Z)">
          ↷ Redo
        </button>
        <div className="tabs">
          <button className={tab === "map" ? "active" : ""} onClick={() => setTab("map")}>
            Map
          </button>
          <button className={tab === "lists" ? "active" : ""} onClick={() => setTab("lists")}>
            Lists
          </button>
        </div>
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

      {tab === "map" ? (
        <MapView show={show} onChange={edit} />
      ) : (
        <div className="lists">
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
        </div>
      )}
    </main>
  );
}

export default App;
