import { useEffect } from "react";
import type { Connector } from "../model/types";
import { CABLE_TYPES } from "./cableColors";

interface Props {
  x: number;
  y: number;
  suggested: Connector;
  onPick: (connector: Connector) => void;
  onCancel: () => void;
}

// Pops up where a cable was dropped to ask what kind of cable it is.
export function CableTypeMenu({ x, y, suggested, onPick, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onPick(suggested);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [suggested, onPick, onCancel]);

  return (
    <div className="cable-menu" style={{ left: x, top: y }} role="menu" aria-label="Cable type">
      <div className="cable-menu-title">Cable type</div>
      {CABLE_TYPES.map((t) => (
        <button
          key={t.connector}
          role="menuitem"
          className={`cable-menu-item${t.connector === suggested ? " suggested" : ""}`}
          onClick={() => onPick(t.connector)}
        >
          <span className="cable-swatch" style={{ background: t.color }} />
          {t.name}
        </button>
      ))}
      <button className="cable-menu-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
