import { useEffect, useMemo, useRef, useState } from "react";
import { CATALOG } from "../model/catalog";
import { CATEGORIES, PRESETS, type Category, type Preset } from "../model/presets";

interface Props {
  onPick: (preset: Preset) => void;
}

function portSummary(preset: Preset): string {
  const count = (dir: string) =>
    preset.ports.filter((p) => p.direction === dir).reduce((n, p) => n + (p.count ?? 1), 0);
  const ins = count("in");
  const outs = count("out");
  const network = [...new Set(preset.ports.filter((p) => p.direction === "io").map((p) => p.protocol))].join(", ");
  return [ins && `${ins} in`, outs && `${outs} out`, network].filter(Boolean).join(" · ");
}

const ALL: Preset[] = [...PRESETS.map((p) => ({ ...p, category: "Generic" as const })), ...CATALOG];

// Groups presets as category → maker → items, keeping catalog order.
function group(items: Preset[]): [Category, [string, Preset[]][]][] {
  return CATEGORIES.map((category) => {
    const inCategory = items.filter((p) => (p.category ?? "Generic") === category);
    const makers = [...new Set(inCategory.map((p) => p.manufacturer ?? ""))];
    return [category, makers.map((m) => [m, inCategory.filter((p) => (p.manufacturer ?? "") === m)])] as [Category, [string, Preset[]][]];
  }).filter(([, makers]) => makers.length > 0);
}

// Menu of generic device types and real products: collapsible sections by
// category, then by maker, with a search box that filters across all of them.
export function AddDevicePicker({ onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<Category>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const matches = (p: Preset) =>
      !q || [p.kind, p.manufacturer, p.model, p.category].some((s) => s?.toLowerCase().includes(q));
    return group(ALL.filter(matches));
  }, [q]);

  function toggle(category: Category) {
    const next = new Set(expanded);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    setExpanded(next);
  }

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
            placeholder="Search: Qu-6, SD12, CL5, SM58, condenser…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          />
          <div className="picker-list">
            {groups.map(([category, makers]) => {
              // While searching, every section with a match is open.
              const isOpen = q !== "" || expanded.has(category);
              const total = makers.reduce((n, [, items]) => n + items.length, 0);
              return (
                <div key={category} className="picker-section">
                  <button className="picker-category" onClick={() => toggle(category)} aria-expanded={isOpen}>
                    <span className="chevron">{isOpen ? "▾" : "▸"}</span>
                    {category}
                    <span className="hint">{total}</span>
                  </button>
                  {isOpen &&
                    makers.map(([maker, items]) => (
                      <div key={maker}>
                        {maker && <div className="picker-group">{maker}</div>}
                        {items.map((p) => (
                          <button key={`${maker}-${p.model ?? p.kind}`} className="picker-item" onClick={() => pick(p)}>
                            <span>{p.model ?? p.kind}</span>
                            <span className="hint">{portSummary(p)}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                </div>
              );
            })}
            {groups.length === 0 && <p className="hint">No match. Pick a generic type and rename it.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
