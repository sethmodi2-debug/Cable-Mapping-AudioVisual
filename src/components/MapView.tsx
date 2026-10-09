import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection as FlowConnection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { connectPorts, disconnect, moveDevice, reconnect, removeDevice, updateDevice } from "../model/edit";
import { addPreset, type Preset } from "../model/presets";
import type { Connector, Direction, Id, Show } from "../model/types";
import { AddDevicePicker } from "./AddDevicePicker";
import { CableEdge, GRID, type CableEdgeType } from "./CableEdge";
import { cableType, isBidirectional } from "./cableColors";
import { CableTypeMenu } from "./CableTypeMenu";
import { DeviceNode, leftHandleId, portIdFromHandle, type DeviceNodeType } from "./DeviceNode";
import { Inspector, type Selection } from "./Inspector";
import { useColorMode } from "../theme";

const nodeTypes = { device: DeviceNode };

// Places tried along a cable for its label, from the middle outwards.
const LABEL_SPOTS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.12, 0.88];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function sameSpots(a: Record<string, { x: number; y: number } | null>, b: Record<string, { x: number; y: number } | null>): boolean {
  const keys = Object.keys(b);
  if (keys.length !== Object.keys(a).length) return false;
  return keys.every((k) => {
    const p = a[k];
    const q = b[k];
    if (!p || !q) return p === q;
    return Math.abs(p.x - q.x) < 0.5 && Math.abs(p.y - q.y) < 0.5;
  });
}

// An on/off setting remembered in this browser between sessions.
function useStoredFlag(key: string): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });
  const set = (value: boolean) => {
    setOn(value);
    try {
      localStorage.setItem(key, value ? "1" : "0");
    } catch {
      // Storage can be unavailable (private windows); the setting just isn't remembered.
    }
  };
  return [on, set];
}
const edgeTypes = { cable: CableEdge };

interface Props {
  show: Show;
  onChange: (show: Show) => void;
}

export function MapView({ show, onChange }: Props) {
  const [selection, setSelection] = useState<Selection>(null);
  const colorMode = useColorMode();
  const [flow, setFlow] = useState<ReactFlowInstance<DeviceNodeType, CableEdgeType> | null>(null);
  // React Flow measures each node after render; nodes are rebuilt from the
  // show on every change, so the sizes are kept here and passed back in.
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [animate, setAnimate] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  // A cable that has been drawn but whose type hasn't been picked yet.
  const [pending, setPending] = useState<{ a: Id; b: Id; x: number; y: number; suggested: Connector } | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const reconnected = useRef(false);
  // A connection lifted off an input, waiting to be dropped somewhere. Kept
  // in a ref too, because the drag starts before React re-renders.
  const [pickedUp, setPickedUp] = useState<Id | null>(null);
  const pickedUpRef = useRef<Id | null>(null);
  const droppedPickUp = useRef(false);
  const [snapDevices, setSnapDevices] = useStoredFlag("snapDevices");
  const [snapCables, setSnapCables] = useStoredFlag("snapCables");
  const [labelSpots, setLabelSpots] = useState<Record<Id, { x: number; y: number } | null>>({});

  const nodes: DeviceNodeType[] = useMemo(() => {
    const connected = new Set(show.connections.flatMap((c) => [c.fromPortId, c.toPortId]));
    return show.devices.map((device, i) => ({
      id: device.id,
      type: "device",
      position: device.position ?? { x: 40 + (i % 4) * 280, y: 40 + Math.floor(i / 4) * 260 },
      data: { device, ports: show.ports.filter((p) => p.deviceId === device.id), connected, onPickUp: pickUp, onToggleSection: toggleSection },
      selected: selection?.kind === "device" && selection.id === device.id,
      measured: sizes[device.id],
    }));
  }, [show, selection, sizes]);

  const edges: CableEdgeType[] = useMemo(() => {
    const ports = new Map(show.ports.map((p) => [p.id, p]));
    const cables = new Map(show.cables.map((c) => [c.id, c]));
    return show.connections.flatMap((conn) => {
      const fromPort = ports.get(conn.fromPortId);
      const toPort = ports.get(conn.toPortId);
      if (!fromPort || !toPort) return [];
      const cable = conn.cableId ? cables.get(conn.cableId) : undefined;
      const type = cableType(cable?.connector ?? fromPort.connector);
      const protocol = cable?.protocol ?? fromPort.protocol ?? "Analog";
      return [
        {
          id: conn.id,
          type: "cable",
          source: fromPort.deviceId,
          target: toPort.deviceId,
          sourceHandle: fromPort.id,
          // A network port receiving a link uses its left dot, so lines read left to right.
          targetHandle: toPort.direction === "io" ? leftHandleId(toPort.id) : toPort.id,
          selected: selection?.kind === "connection" && selection.id === conn.id,
          hidden: conn.id === pickedUp,
          data: {
            // The cable just says what it is. Its ID and signal are in the side panel and lists.
            label: type.short,
            labelAt: labelSpots[conn.id],
            snap: snapCables,
            color: type.color,
            bidirectional: isBidirectional(protocol) || (fromPort.direction === "io" && toPort.direction === "io"),
            animate: animate && !exporting,
          },
        },
      ];
    });
  }, [show, selection, animate, exporting, pickedUp, labelSpots, snapCables]);

  // After the map draws, place each cable's label on its cable where it
  // clears every device and every label placed before it, or hide it.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const root = canvasRef.current;
      if (!root) return;
      const pad = 4;
      const taken: Rect[] = nodes.map((n) => ({
        x: n.position.x - pad,
        y: n.position.y - pad,
        w: (n.measured?.width ?? 0) + 2 * pad,
        h: (n.measured?.height ?? 0) + 2 * pad,
      }));
      const next: Record<Id, { x: number; y: number } | null> = {};
      // The selected cable gets first pick, so its label always shows if it can.
      const order = [...edges].sort((a, b) => Number(!!b.selected) - Number(!!a.selected));
      for (const edge of order) {
        if (edge.hidden) continue;
        const path = root.querySelector<SVGPathElement>(`.react-flow__edge[data-id="${CSS.escape(edge.id)}"] path.react-flow__edge-path`);
        const label = root.querySelector<HTMLElement>(`.cable-label[data-edge="${CSS.escape(edge.id)}"]`);
        if (!path || !label) continue;
        const w = label.offsetWidth + pad;
        const h = label.offsetHeight + pad;
        const length = path.getTotalLength();
        next[edge.id] = null;
        for (const t of LABEL_SPOTS) {
          const point = path.getPointAtLength(length * t);
          const rect = { x: point.x - w / 2, y: point.y - h / 2, w, h };
          if (taken.some((r) => overlaps(r, rect))) continue;
          taken.push(rect);
          next[edge.id] = { x: point.x, y: point.y };
          break;
        }
      }
      setLabelSpots((prev) => (sameSpots(prev, next) ? prev : next));
    });
    return () => cancelAnimationFrame(frame);
  }, [nodes, edges]);

  // Lifting a cable off an input starts a new drag from the cable's source
  // port, so React Flow draws it following the pointer like a loose cable end.
  function pickUp(portId: Id, clientX: number, clientY: number) {
    const conn = show.connections.find((c) => c.toPortId === portId);
    const from = conn && show.ports.find((p) => p.id === conn.fromPortId);
    const handle =
      from && canvasRef.current?.querySelector<HTMLElement>(`.react-flow__handle[data-nodeid="${from.deviceId}"][data-handleid="${from.id}"]`);
    if (!conn || !handle) return;
    droppedPickUp.current = false;
    pickedUpRef.current = conn.id;
    setPickedUp(conn.id);
    handle.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0, clientX, clientY }));
  }

  function toggleSection(deviceId: Id, direction: Direction) {
    const device = show.devices.find((d) => d.id === deviceId);
    if (!device) return;
    const folded = device.collapsed ?? [];
    const collapsed = folded.includes(direction) ? folded.filter((d) => d !== direction) : [...folded, direction];
    onChange(updateDevice(show, deviceId, { collapsed: collapsed.length ? collapsed : undefined }));
  }

  function onNodesChange(changes: NodeChange<DeviceNodeType>[]) {
    let next = show;
    for (const change of changes) {
      if (change.type === "position" && change.position) next = moveDevice(next, change.id, change.position);
      if (change.type === "remove") next = removeDevice(next, change.id);
      if (change.type === "select" && change.selected) setSelection({ kind: "device", id: change.id });
      if (change.type === "dimensions" && change.dimensions) {
        const { id, dimensions } = change;
        setSizes((prev) => ({ ...prev, [id]: dimensions }));
      }
    }
    if (next !== show) onChange(next);
  }

  function onEdgesChange(changes: EdgeChange<CableEdgeType>[]) {
    let next = show;
    for (const change of changes) {
      if (change.type === "remove") next = disconnect(next, change.id);
      if (change.type === "select" && change.selected) setSelection({ kind: "connection", id: change.id });
    }
    if (next !== show) onChange(next);
  }

  // Drawing a cable asks for its type at the drop point before creating it.
  function onConnect(params: FlowConnection) {
    if (!params.sourceHandle || !params.targetHandle) return;
    const a = portIdFromHandle(params.sourceHandle);
    const b = portIdFromHandle(params.targetHandle);
    const lifted = pickedUpRef.current;
    if (lifted) {
      // A lifted cable keeps its type and label when it lands on a new port.
      droppedPickUp.current = true;
      onChange(reconnect(show, lifted, a, b));
      setSelection({ kind: "connection", id: lifted });
      return;
    }
    const ports = show.ports.filter((p) => p.id === a || p.id === b);
    if (ports.length !== 2) return;
    const source = ports.find((p) => p.direction !== "in") ?? ports[0];
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.min(pointer.current.x - rect.left, rect.width - 200);
    const y = Math.min(pointer.current.y - rect.top, rect.height - 380);
    setPending({ a, b, x: Math.max(8, x), y: Math.max(8, y), suggested: source.connector });
  }

  function finishConnect(connector: Connector) {
    if (!pending) return;
    const next = connectPorts(show, pending.a, pending.b, connector);
    setPending(null);
    if (next === show) return;
    onChange(next);
    setSelection({ kind: "connection", id: next.connections[next.connections.length - 1].id });
  }

  function onConnectEnd() {
    const lifted = pickedUpRef.current;
    if (!lifted) return;
    if (!droppedPickUp.current) onChange(disconnect(show, lifted));
    pickedUpRef.current = null;
    setPickedUp(null);
  }

  // Dragging the end of a cable moves it to another port; dropping it on
  // empty space unplugs it.
  function onReconnect(edge: Edge, params: FlowConnection) {
    if (!params.sourceHandle || !params.targetHandle) return;
    reconnected.current = true;
    onChange(reconnect(show, edge.id, portIdFromHandle(params.sourceHandle), portIdFromHandle(params.targetHandle)));
  }

  function onReconnectEnd(_: unknown, edge: Edge) {
    if (!reconnected.current) {
      onChange(disconnect(show, edge.id));
      if (selection?.kind === "connection" && selection.id === edge.id) setSelection(null);
    }
    reconnected.current = false;
  }

  function addFromPreset(preset: Preset) {
    // Drop new devices near the middle of the view, stepped so they don't stack exactly.
    const rect = canvasRef.current?.getBoundingClientRect();
    const screen = rect ? { x: rect.left + rect.width / 2 - 120, y: rect.top + rect.height / 2 - 100 } : { x: 300, y: 300 };
    const center = flow?.screenToFlowPosition(screen) ?? { x: 80, y: 80 };
    const step = (show.devices.length % 6) * 30;
    const next = addPreset(show, preset, { x: center.x + step, y: center.y + step });
    onChange(next);
    setSelection({ kind: "device", id: next.devices[next.devices.length - 1].id });
  }

  async function onExport() {
    const viewport = canvasRef.current?.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewport || !flow) return;
    setExporting(true);
    setExportError(null);
    setSelection(null);
    try {
      // Let the map re-render without dots and selection before the snapshot.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const background = getComputedStyle(canvasRef.current!).backgroundColor;
      // The PDF libraries are large, so they load only when first used.
      const { exportShowPdf } = await import("../exportShow");
      await exportShowPdf(show, viewport, flow.getNodes(), background);
    } catch (e) {
      setExportError(`PDF export failed: ${String(e)}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="map-layout">
      <div
        className={`map-canvas${exporting ? " exporting" : ""}`}
        ref={canvasRef}
        onPointerMove={(e) => (pointer.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => (pointer.current = { x: e.clientX, y: e.clientY })}
      >
        <div className="map-toolbar">
          <AddDevicePicker onPick={addFromPreset} />
          <label className="toggle">
            <input type="checkbox" checked={animate} onChange={(e) => setAnimate(e.target.checked)} />
            Show signal flow
          </label>
          <label className="toggle">
            <input type="checkbox" checked={snapDevices} onChange={(e) => setSnapDevices(e.target.checked)} />
            Snap devices to grid
          </label>
          <label className="toggle">
            <input type="checkbox" checked={snapCables} onChange={(e) => setSnapCables(e.target.checked)} />
            Snap cables to grid
          </label>
          <button onClick={onExport} disabled={exporting}>
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
          {exportError && <span className="issues">{exportError}</span>}
        </div>
        {pending && (
          <CableTypeMenu x={pending.x} y={pending.y} suggested={pending.suggested} onPick={finishConnect} onCancel={() => setPending(null)} />
        )}
        <ReactFlow<DeviceNodeType, CableEdgeType>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          onReconnect={onReconnect}
          onReconnectStart={() => (reconnected.current = false)}
          onReconnectEnd={onReconnectEnd}
          reconnectRadius={16}
          onInit={setFlow}
          onPaneClick={() => setSelection(null)}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={["Delete", "Backspace"]}
          colorMode={colorMode}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          snapToGrid={snapDevices}
          snapGrid={[GRID, GRID]}
        >
          <Background gap={GRID} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      <Inspector show={show} selection={selection} onChange={onChange} onSelect={setSelection} />
    </div>
  );
}
