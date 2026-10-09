import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Edge, type EdgeProps } from "@xyflow/react";

export type CableEdgeData = {
  label: string;
  detail?: string; // channel, shown small after the label
  color: string;
  bidirectional: boolean;
  animate: boolean;
};
export type CableEdgeType = Edge<CableEdgeData, "cable">;

const DOTS = 3;
const DURATION_S = 2.4;

// A cable on the map: a coloured line, a small label pill, and optional dots
// that travel along it in the direction the signal flows.
export function CableEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps<CableEdgeType>) {
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 10 });
  if (!data) return null;
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
          className={`cable-label${selected ? " selected" : ""}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, background: color }}
        >
          {data.label}
          {data.detail && <span className="cable-label-detail">{data.detail}</span>}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
