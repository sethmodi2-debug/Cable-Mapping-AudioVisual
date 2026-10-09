import { patchList, pullList, validate } from "./model/show";
import { sampleShow } from "./model/sample";
import "./App.css";

function App() {
  const show = sampleShow;
  const issues = validate(show);

  return (
    <main className="container">
      <h1>{show.name}</h1>

      {issues.length > 0 && (
        <ul className="issues">
          {issues.map((issue, i) => (
            <li key={i}>{issue.message}</li>
          ))}
        </ul>
      )}

      <h2>Patch list</h2>
      <table>
        <thead>
          <tr>
            <th>From</th>
            <th>To</th>
            <th>Cable</th>
            <th>Ch</th>
            <th>Protocol</th>
          </tr>
        </thead>
        <tbody>
          {patchList(show).map((row) => (
            <tr key={row.connectionId}>
              <td>{row.fromDevice} · {row.fromPort}</td>
              <td>{row.toDevice} · {row.toPort}</td>
              <td>{row.cable}</td>
              <td>{row.channel ?? ""}</td>
              <td>{row.protocol ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
    </main>
  );
}

export default App;
