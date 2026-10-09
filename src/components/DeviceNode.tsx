import { Handle, Position, useUpdateNodeInternals, type Node, type NodeProps } from "@xyflow/react";
import { useEffect } from "react";
import { deviceSystem, systemColor } from "../model/systems";
import type { Device, Direction, Port } from "../model/types";
import { cableType } from "./cableColors";

const LEFT_SUFFIX = ":left";

export function leftHandleId(portId: string): string {
  return portId + LEFT_SUFFIX;
}

export function portIdFromHandle(handleId: string): string {
  return handleId.endsWith(LEFT_SUFFIX) ? handleId.slice(0, -LEFT_SUFFIX.length) : handleId;
}

export type DeviceNodeData = {
  device: Device;
  ports: Port[];
  connected: Set<string>;
  // Called when the user grabs an input that already has a cable in it.
  onPickUp: (portId: string, clientX: number, clientY: number) => void;
  onToggleSection: (deviceId: string, direction: Direction) => void;
};
export type DeviceNodeType = Node<DeviceNodeData, "device">;

interface PortRowProps {
  port: Port;
  side: "left" | "right";
  connected: boolean;
  onPickUp: DeviceNodeData["onPickUp"];
}

// The dot (or dots, for a network port) that cables plug into.
function PortHandles({ port, side, connected, onPickUp }: PortRowProps) {
  const color = cableType(port.connector).color;
  const handleStyle = { background: color, borderColor: color };
  // Grabbing a used input picks up the cable that's plugged into it, so it
  // can be dropped on another port or let go of to unplug it.
  const pickUp =
    port.direction === "in" && connected
      ? (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          onPickUp(port.id, e.clientX, e.clientY);
        }
      : undefined;
  return (
    <>
      <Handle
        id={port.id}
        type={port.direction === "in" ? "target" : "source"}
        position={side === "left" ? Position.Left : Position.Right}
        style={handleStyle}
        onMouseDownCapture={pickUp}
        className={pickUp ? "pick-up" : undefined}
      />
      {port.direction === "io" && (
        // Network ports work both ways, so they get a second dot on the left
        // for links arriving from the left of the map.
        <Handle id={leftHandleId(port.id)} type="source" position={Position.Left} style={handleStyle} />
      )}
    </>
  );
}

function PortRow(props: PortRowProps) {
  const { port, side, connected } = props;
  return (
    <div className={`port port-${side}${connected ? " connected" : ""}`}>
      <PortHandles {...props} />
      <span className="port-name">{port.name}</span>
      <span className="port-connector">{port.protocol ?? cableType(port.connector).short}</span>
    </div>
  );
}

const SECTION_LABELS: Record<Direction, string> = { in: "Inputs", out: "Outputs", io: "Network" };

interface SectionProps {
  direction: Direction;
  ports: Port[];
  side: "left" | "right";
  collapsed: boolean;
  data: DeviceNodeData;
}

// A titled group of ports that can be folded away. Folded, its cables stay
// plugged in and meet at the title row.
function PortSection({ direction, ports, side, collapsed, data }: SectionProps) {
  if (ports.length === 0) return null;
  const used = ports.filter((p) => data.connected.has(p.id));
  const toggle = () => data.onToggleSection(data.device.id, direction);
  return (
    <>
      <div className={`port-group-label${collapsed ? " folded" : ""}`}>
        <button className="section-toggle nodrag" onClick={toggle} aria-expanded={!collapsed}>
          <span className="chevron">{collapsed ? "▸" : "▾"}</span>
          {SECTION_LABELS[direction]} ({used.length > 0 && collapsed ? `${used.length}/${ports.length} used` : ports.length})
        </button>
        {collapsed &&
          used.map((p) => <PortHandles key={p.id} port={p} side={side} connected onPickUp={data.onPickUp} />)}
      </div>
      {!collapsed &&
        ports.map((p) => <PortRow key={p.id} port={p} side={side} connected={data.connected.has(p.id)} onPickUp={data.onPickUp} />)}
    </>
  );
}

export function DeviceNode({ id, data, selected }: NodeProps<DeviceNodeType>) {
  const { device, ports } = data;
  const inputs = ports.filter((p) => p.direction === "in");
  const outputs = ports.filter((p) => p.direction === "out");
  const network = ports.filter((p) => p.direction === "io");
  const meta = [device.model ?? device.kind, device.location].filter(Boolean).join(" · ");
  const system = deviceSystem(device, ports);
  const collapsed = new Set(device.collapsed ?? []);
  const collapsedKey = [...collapsed].sort().join(",");

  // Folding a section moves handles without always resizing the node, so
  // tell React Flow to measure them again.
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => updateNodeInternals(id), [id, collapsedKey, updateNodeInternals]);

  return (
    <div className={`device-node${selected ? " selected" : ""}`}>
      <div className="device-header">
        <div className="device-title">
          <div className="device-name">{device.name}</div>
          <span className="system-tag" style={{ background: systemColor(system) }}>
            {system}
          </span>
        </div>
        <div className="device-meta">{meta}</div>
        {device.ip && <div className="device-ip">{device.ip}</div>}
      </div>
      {(inputs.length > 0 || outputs.length > 0) && (
        <div className="device-ports">
          <div className="port-col">
            <PortSection direction="in" ports={inputs} side="left" collapsed={collapsed.has("in")} data={data} />
          </div>
          <div className="port-col port-col-right">
            <PortSection direction="out" ports={outputs} side="right" collapsed={collapsed.has("out")} data={data} />
          </div>
        </div>
      )}
      {network.length > 0 && (
        <div className="network-ports">
          <PortSection direction="io" ports={network} side="right" collapsed={collapsed.has("io")} data={data} />
        </div>
      )}
    </div>
  );
}
