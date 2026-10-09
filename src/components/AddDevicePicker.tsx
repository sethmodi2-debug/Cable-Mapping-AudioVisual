import { useEffect, useMemo, useRef, useState } from "react";
import { CATALOG } from "../model/catalog";
import { PRESETS, type Preset } from "../model/presets";

interface Props {
  onPick: (preset: Preset) => void;
}

function portSummary(preset: Preset): string {
  const count = (dir: string) =>
    preset.ports.filter((p) => p.direction === dir).reduce((n, p) => n + (p.count ?? 1), 0);
  const network = [...new Set(preset.ports.filter((p) => p.direction === "io").map((p) => p.protocol))].join(", ");
  return [`${count("in")} in`, `${count("out")} out`, network].filter(Boolean).join(" · ");
}

// Searchable menu of generic device types and real products, grouped by maker.
export function AddDevicePicker({ onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (p: Preset) =>
      !q || [p.kind, p.manufacturer, p.model].some((s) => s?.toLowerCase().includes(q));
    const result: [string, Preset[]][] = [["Generic", PRESETS.filter(matches)]];
    for (const maker of [...new Set(CATALOG.map((p) => p.manufacturer!))]) {
      result.push([maker, CATALOG.filter((p) => p.manufacturer === maker && matches(p))]);
    }
    return result.filter(([, items]) => items.length > 0);
  }, [query]);

  function pick(preset: Preset) {
    onPick(preset);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="picker" ref={ref}>
      <button className="primary" onClick={() => setOpen(!open)}>
        + Add device
      </button>
      {open && (
        <div className="picker-panel">
          <input
            autoFocus
            placeholder="Search: Qu-6, stage box, SM58…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          />
          <div className="picker-list">
            {groups.map(([group, items]) => (
              <div key={group}>
                <div className="picker-group">{group}</div>
                {items.map((p) => (
                  <button key={`${group}-${p.model ?? p.kind}`} className="picker-item" onClick={() => pick(p)}>
                    <span>{p.model ?? p.kind}</span>
                    <span className="hint">
                      {p.model ? `${p.kind} · ` : ""}
                      {portSummary(p)}
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {groups.length === 0 && <p className="hint">No match. Pick a generic type and rename it.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
