import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { Device, Port } from "../model/types";
import { PROTOCOL_COLORS } from "./protocolColors";

const LEFT_SUFFIX = ":left";

export function leftHandleId(portId: string): string {
  return portId + LEFT_SUFFIX;
}

export function portIdFromHandle(handleId: string): string {
  return handleId.endsWith(LEFT_SUFFIX) ? handleId.slice(0, -LEFT_SUFFIX.length) : handleId;
}

export type DeviceNodeData = { device: Device; ports: Port[]; connected: Set<string> };
export type DeviceNodeType = Node<DeviceNodeData, "device">;

function PortRow({ port, side, connected }: { port: Port; side: "left" | "right"; connected: boolean }) {
  const color = port.protocol ? PROTOCOL_COLORS[port.protocol] : undefined;
  return (
    <div className={`port port-${side}${connected ? " connected" : ""}`} title={`${port.name} · ${port.connector}${port.protocol ? ` · ${port.protocol}` : ""}`}>
      <Handle
        id={port.id}
        type={port.direction === "in" ? "target" : "source"}
        position={side === "left" ? Position.Left : Position.Right}
        style={color ? { background: color } : undefined}
      />
      {port.direction === "io" && (
        // Network ports work both ways, so they get a second dot on the left
        // for links arriving from the left of the map.
        <Handle id={leftHandleId(port.id)} type="source" position={Position.Left} style={color ? { background: color } : undefined} />
      )}
      <span className="port-name">{port.name}</span>
      <span className="port-connector">{port.protocol ?? port.connector}</span>
    </div>
  );
}

export function DeviceNode({ data, selected }: NodeProps<DeviceNodeType>) {
  const { device, ports, connected } = data;
  const inputs = ports.filter((p) => p.direction === "in");
  const outputs = ports.filter((p) => p.direction === "out");
  const network = ports.filter((p) => p.direction === "io");
  return (
    <div className={`device-node${selected ? " selected" : ""}`}>
      <div className="device-header">
        <div className="device-name">{device.name}</div>
        <div className="device-meta">
          {device.kind}
          {device.location ? ` · ${device.location}` : ""}
        </div>
      </div>
      <div className="device-ports">
        <div className="port-col">
          {inputs.map((p) => (
            <PortRow key={p.id} port={p} side="left" connected={connected.has(p.id)} />
          ))}
        </div>
        <div className="port-col">
          {outputs.map((p) => (
            <PortRow key={p.id} port={p} side="right" connected={connected.has(p.id)} />
          ))}
        </div>
      </div>
      {network.length > 0 && (
        <div className="network-ports">
          {network.map((p) => (
            <PortRow key={p.id} port={p} side="right" connected={connected.has(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
