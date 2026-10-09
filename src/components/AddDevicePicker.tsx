import { useEffect, useMemo, useRef, useState } from "react";
import { CATALOG } from "../model/catalog";
import { openInBrowser } from "../file";
import { CATEGORIES, PRESETS, type Category, type Preset } from "../model/presets";
import { loadApiKey, loadFound, saveApiKey, saveFound } from "../foundDevices";
import type { FoundPreset } from "../lookup";

interface Props {
  onPick: (preset: Preset) => void;
}

function portSummary(preset: Preset): string {
  const count = (dir: string) =>
    preset.ports.filter((p) => p.direction === dir).reduce((n, p) => n + (p.count ?? 1), 0);
  const ins = count("in");
  const outs = count("out");
  const network = [...new Set(preset.ports.filter((p) => p.direction === "io" && p.protocol).map((p) => p.protocol))].join(", ");
  return [ins && `${ins} in`, outs && `${outs} out`, network].filter(Boolean).join(" · ");
}

function webSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} specifications inputs outputs`)}`;
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
  const [found, setFound] = useState<FoundPreset[]>(loadFound);
  const [apiKey, setApiKey] = useState(loadApiKey);
  const [keyDraft, setKeyDraft] = useState("");
  const [askKey, setAskKey] = useState(false);
  const [looking, setLooking] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

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
  const foundMatches = found.filter(
    (p) => !q || [p.kind, p.manufacturer, p.model].some((s) => s?.toLowerCase().includes(q)),
  );

  function keepFound(list: FoundPreset[]) {
    setFound(list);
    saveFound(list);
  }

  // Searches the web for the product and puts what it finds at the top of
  // the list, ready to add.
  async function lookUp(key = apiKey) {
    const name = query.trim();
    if (!name) return;
    if (!key) {
      setAskKey(true);
      return;
    }
    setLooking(name);
    setLookupError(null);
    try {
      // The API client only loads the first time someone looks something up.
      const { lookUpDevice } = await import("../lookup");
      const preset = await lookUpDevice(name, key);
      const same = (p: FoundPreset) => p.manufacturer === preset.manufacturer && p.model === preset.model;
      keepFound([preset, ...found.filter((p) => !same(p))]);
      setQuery(preset.model ?? name);
    } catch (e) {
      const { lookupErrorMessage } = await import("../lookup");
      setLookupError(lookupErrorMessage(e));
    } finally {
      setLooking(null);
    }
  }

  function saveKeyAndLookUp() {
    const key = keyDraft.trim();
    if (!key) return;
    saveApiKey(key);
    setApiKey(key);
    setKeyDraft("");
    setAskKey(false);
    void lookUp(key);
  }

  function forgetKey() {
    saveApiKey("");
    setApiKey("");
    setAskKey(true);
  }

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
            {foundMatches.length > 0 && (
              <div className="picker-section">
                <div className="picker-category static">
                  Found online
                  <span className="hint">{foundMatches.length}</span>
                </div>
                {foundMatches.map((p) => (
                  <div key={`${p.manufacturer}-${p.model}`} className="picker-found">
                    <button className="picker-item" onClick={() => pick(p)}>
                      <span>{[p.manufacturer, p.model].filter(Boolean).join(" ")}</span>
                      <span className="hint">{portSummary(p) || p.kind}</span>
                    </button>
                    <button
                      className="picker-remove"
                      title="Remove from the list"
                      onClick={() => keepFound(found.filter((f) => f !== p))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            {groups.length === 0 && foundMatches.length === 0 && <p className="hint">Not in the list yet.</p>}
          </div>
          {q && (
            // For gear that isn't listed: look it up online, then add it and
            // fill in its ports from the spec sheet.
            <div className="picker-web">
              <button className="picker-lookup" disabled={!!looking} onClick={() => void lookUp()}>
                {looking ? `Looking up “${looking}” online…` : `🌐 Look up “${query.trim()}” online`}
              </button>
              {lookupError && <p className="field-warning">{lookupError}</p>}
              {askKey && (
                <div className="picker-key">
                  <p className="hint">
                    Online lookup uses Claude to search the web and read the spec sheet. Paste an Anthropic API key to turn it on; it's kept on
                    this computer only.
                  </p>
                  <div className="add-port-row">
                    <input
                      type="password"
                      placeholder="sk-ant-…"
                      value={keyDraft}
                      onChange={(e) => setKeyDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveKeyAndLookUp()}
                    />
                    <button onClick={saveKeyAndLookUp} disabled={!keyDraft.trim()}>
                      Save key
                    </button>
                  </div>
                </div>
              )}
              {apiKey && !askKey && (
                <button className="link-button" onClick={forgetKey}>
                  Change API key
                </button>
              )}
              <a
                className="picker-web-link"
                href={webSearchUrl(query.trim())}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => openInBrowser(webSearchUrl(query.trim())) && e.preventDefault()}
              >
                🔍 Search the web for “{query.trim()}”
              </a>
              <button className="picker-item" onClick={() => pick({ kind: "Custom", model: query.trim(), ports: [] })}>
                <span>+ Add “{query.trim()}” as a blank device</span>
                <span className="hint">add ports in the side panel</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
