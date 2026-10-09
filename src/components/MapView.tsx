import {
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Connection as FlowConnection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo, useState } from "react";
import { connectPorts, moveDevice, disconnect, removeDevice } from "../model/edit";
import { PRESETS, addPreset } from "../model/presets";
import type { Show } from "../model/types";
import { DeviceNode, leftHandleId, portIdFromHandle, type DeviceNodeType } from "./DeviceNode";
import { Inspector, type Selection } from "./Inspector";
import { PROTOCOL_COLORS } from "./protocolColors";

const nodeTypes = { device: DeviceNode };

interface Props {
  show: Show;
  onChange: (show: Show) => void;
}

export function MapView({ show, onChange }: Props) {
  const [selection, setSelection] = useState<Selection>(null);
  const [flow, setFlow] = useState<ReactFlowInstance<DeviceNodeType, Edge> | null>(null);
  // React Flow measures each node after render; nodes are rebuilt from the
  // show on every change, so the sizes are kept here and passed back in.
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});

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

  const edges: Edge[] = useMemo(() => {
    const ports = new Map(show.ports.map((p) => [p.id, p]));
    const cables = new Map(show.cables.map((c) => [c.id, c]));
    return show.connections.flatMap((conn) => {
      const fromPort = ports.get(conn.fromPortId);
      const toPort = ports.get(conn.toPortId);
      if (!fromPort || !toPort) return [];
      const source = fromPort.deviceId;
      const target = toPort.deviceId;
      const cable = conn.cableId ? cables.get(conn.cableId) : undefined;
      const color = PROTOCOL_COLORS[cable?.protocol ?? "Analog"];
      const label = cable
        ? `${cable.label}${conn.channel !== undefined && cable.channels > 1 ? ` · ch ${conn.channel}` : ""}${cable.lengthM ? ` · ${cable.lengthM} m` : ""}`
        : "no cable";
      const selected = selection?.kind === "connection" && selection.id === conn.id;
      return [
        {
          id: conn.id,
          source,
          target,
          sourceHandle: conn.fromPortId,
          // A network port receiving a link uses its left dot, so lines read left to right.
          targetHandle: toPort.direction === "io" ? leftHandleId(toPort.id) : toPort.id,
          type: "smoothstep",
          label,
          selected,
          style: { stroke: color, strokeWidth: selected ? 4 : 2.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color },
          labelStyle: { fontWeight: 600, fontSize: 12, fill: color },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 4,
        },
      ];
    });
  }, [show, selection]);

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

  function onEdgesChange(changes: EdgeChange<Edge>[]) {
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

  function addDeviceFromPreset(kind: string) {
    const preset = PRESETS.find((p) => p.kind === kind);
    if (!preset) return;
    // Drop new devices near the middle of the view, stepped so they don't stack exactly.
    const center = flow?.screenToFlowPosition({ x: window.innerWidth / 2 - 250, y: window.innerHeight / 2 - 150 }) ?? { x: 80, y: 80 };
    const step = (show.devices.length % 6) * 30;
    const next = addPreset(show, preset, { x: center.x + step, y: center.y + step });
    onChange(next);
    setSelection({ kind: "device", id: next.devices[next.devices.length - 1].id });
  }

  return (
    <div className="map-layout">
      <div className="map-canvas">
        <div className="map-toolbar">
          <select value="" onChange={(e) => addDeviceFromPreset(e.target.value)} aria-label="Add device">
            <option value="">+ Add device…</option>
            {PRESETS.map((p) => (
              <option key={p.kind} value={p.kind}>
                {p.kind}
              </option>
            ))}
          </select>
          <span className="hint">Drag from a port dot to another port to run a cable.</span>
        </div>
        <ReactFlow<DeviceNodeType, Edge>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setFlow}
          onPaneClick={() => setSelection(null)}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={["Delete", "Backspace"]}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
        >
          <Background gap={20} />
          <Controls />
          <MiniMap pannable zoomable nodeColor="#9ca3af" />
        </ReactFlow>
      </div>
      <Inspector show={show} selection={selection} onChange={onChange} onSelect={setSelection} />
    </div>
  );
}
