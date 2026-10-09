import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Edge, type EdgeProps } from "@xyflow/react";

export type CableEdgeData = {
  label: string;
  // Where the label goes, worked out so it clears devices and other labels.
  // Undefined puts it at the middle of the cable; null hides it.
  labelAt?: { x: number; y: number } | null;
  snap: boolean; // bend the cable on a grid line
  color: string;
  bidirectional: boolean;
  animate: boolean;
};
export type CableEdgeType = Edge<CableEdgeData, "cable">;

export const GRID = 20;
const DOTS = 3;
const DURATION_S = 2.4;

// A cable on the map: a coloured line, a small label pill, and optional dots
// that travel along it in the direction the signal flows.
export function CableEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps<CableEdgeType>) {
  const snapTo = (v: number) => Math.round(v / GRID) * GRID;
  const [path, midX, midY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: data?.snap ? 0 : 10,
    centerX: data?.snap ? snapTo((sourceX + targetX) / 2) : undefined,
    centerY: data?.snap ? snapTo((sourceY + targetY) / 2) : undefined,
  });
  if (!data) return null;
  const labelX = data.labelAt?.x ?? midX;
  const labelY = data.labelAt?.y ?? midY;
  const { color, animate, bidirectional } = data;

  const dots = (reverse: boolean) =>
    Array.from({ length: DOTS }, (_, i) => (
      <circle key={`${reverse}-${i}`} className="flow-dot" r={3} fill={color}>
        <animateMotion
          dur={`${DURATION_S}s`}
          begin={`${(i * DURATION_S) / DOTS}s`}
          repeatCount="indefinite"
          path={path}
          {...(reverse ? { keyPoints: "1;0", keyTimes: "0;1", calcMode: "linear" } : {})}
        />
      </circle>
    ));

  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke: color, strokeWidth: selected ? 4 : 2.5, opacity: selected ? 1 : 0.85 }} />
      {animate && (
        <g>
          {dots(false)}
          {bidirectional && dots(true)}
        </g>
      )}
      <EdgeLabelRenderer>
        <div
          data-edge={id}
          className={`cable-label${selected ? " selected" : ""}${data.labelAt === null ? " hidden" : ""}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, background: color }}
        >
          {data.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
