import { Panel } from "@xyflow/react";
import type { Show } from "../model/types";
import { cableFamily } from "./cableColors";

// Key for the cable colours in use on this map.
export function Legend({ show }: { show: Show }) {
  const families = new Map<string, string>();
  for (const cable of show.cables) {
    const family = cableFamily(cable.connector);
    families.set(family.name, family.color);
  }
  if (families.size === 0) return null;
  return (
    <Panel position="top-right" className="legend">
      {[...families].map(([name, color]) => (
        <div key={name} className="legend-row">
          <span className="legend-swatch" style={{ background: color }} />
          {name}
        </div>
      ))}
      <div className="legend-row hint">Dots show signal direction; both ways on network links.</div>
    </Panel>
  );
}
