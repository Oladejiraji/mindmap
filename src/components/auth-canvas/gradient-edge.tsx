import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { SplitIcon } from "@/lib/svg";

export type GradientEdgeData = {
  label?: { name: string };
};

export function GradientEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const gradientId = `auth-edge-gradient-${id}`;
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const label = (data as GradientEdgeData | undefined)?.label;

  return (
    <>
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
          spreadMethod="repeat"
        >
          <stop offset="0%" stopColor="#DFFBFF" />
          <stop offset="16.67%" stopColor="#C2DAF9" />
          <stop offset="33.33%" stopColor="#AEB3E4" />
          <stop offset="50%" stopColor="#E2909C" />
          <stop offset="66.67%" stopColor="#FFA189" />
          <stop offset="83.33%" stopColor="#FFD060" />
          <stop offset="100%" stopColor="#DFFBFF" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            from="0 0"
            to={`${dx} ${dy}`}
            dur="3s"
            repeatCount="indefinite"
            additive="sum"
          />
        </linearGradient>
      </defs>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: `url(#${gradientId})`,
        }}
      />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="font-diatype nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            <div className="inline-flex items-center gap-1.5 rounded-[6px] bg-background-4 px-1.5 py-1.5 text-13 text-zinc-300 border border-background-6">
              <SplitIcon />
              <span className="text-foreground-subtle">
                {label.name} branched
              </span>
            </div>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
