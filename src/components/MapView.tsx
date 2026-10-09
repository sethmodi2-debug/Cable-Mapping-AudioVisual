import {
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Connection as FlowConnection,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo, useRef, useState } from "react";
import { connectPorts, disconnect, moveDevice, removeDevice } from "../model/edit";
import { addPreset, type Preset } from "../model/presets";
import type { Show } from "../model/types";
import { AddDevicePicker } from "./AddDevicePicker";
import { CableEdge, type CableEdgeType } from "./CableEdge";
import { cableFamily, isBidirectional } from "./cableColors";
import { DeviceNode, leftHandleId, portIdFromHandle, type DeviceNodeType } from "./DeviceNode";
import { Inspector, type Selection } from "./Inspector";
import { Legend } from "./Legend";

const nodeTypes = { device: DeviceNode };
const edgeTypes = { cable: CableEdge };

interface Props {
  show: Show;
  onChange: (show: Show) => void;
}

export function MapView({ show, onChange }: Props) {
  const [selection, setSelection] = useState<Selection>(null);
  const [flow, setFlow] = useState<ReactFlowInstance<DeviceNodeType, CableEdgeType> | null>(null);
  // React Flow measures each node after render; nodes are rebuilt from the
  // show on every change, so the sizes are kept here and passed back in.
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [animate, setAnimate] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const nodes: DeviceNodeType[] = useMemo(() => {
    const connected = new Set(show.connections.flatMap((c) => [c.fromPortId, c.toPortId]));
    return show.devices.map((device, i) => ({
      id: device.id,
      type: "device",
      position: device.position ?? { x: 40 + (i % 4) * 280, y: 40 + Math.floor(i / 4) * 260 },
      data: { device, ports: show.ports.filter((p) => p.deviceId === device.id), connected },
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
      const color = cableFamily(cable?.connector ?? fromPort.connector).color;
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
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
          data: {
            label: cable?.label ?? "no cable",
            detail: cable && cable.channels > 1 && conn.channel !== undefined ? `ch ${conn.channel}` : undefined,
            color,
            bidirectional: isBidirectional(protocol) || (fromPort.direction === "io" && toPort.direction === "io"),
            animate: animate && !exporting,
          },
        },
      ];
    });
  }, [show, selection, animate, exporting]);

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

  function onConnect(params: FlowConnection) {
    if (!params.sourceHandle || !params.targetHandle) return;
    const next = connectPorts(show, portIdFromHandle(params.sourceHandle), portIdFromHandle(params.targetHandle));
    if (next === show) return;
    onChange(next);
    setSelection({ kind: "connection", id: next.connections[next.connections.length - 1].id });
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
      <div className={`map-canvas${exporting ? " exporting" : ""}`} ref={canvasRef}>
        <div className="map-toolbar">
          <AddDevicePicker onPick={addFromPreset} />
          <label className="toggle">
            <input type="checkbox" checked={animate} onChange={(e) => setAnimate(e.target.checked)} />
            Show signal flow
          </label>
          <button onClick={onExport} disabled={exporting}>
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
          {exportError && <span className="issues">{exportError}</span>}
        </div>
        <ReactFlow<DeviceNodeType, CableEdgeType>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setFlow}
          onPaneClick={() => setSelection(null)}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={["Delete", "Backspace"]}
          colorMode="system"
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
        >
          <Background gap={20} />
          <Controls />
          <MiniMap pannable zoomable />
          <Legend show={show} />
        </ReactFlow>
      </div>
      <Inspector show={show} selection={selection} onChange={onChange} onSelect={setSelection} />
    </div>
  );
}
