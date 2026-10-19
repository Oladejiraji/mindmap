import type { SVGProps } from "react";

const s = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
// 3×3 dots at x/y ∈ {5, 12, 19}.
const DOTS = [5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => [x, y] as const));

export function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      {DOTS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1} {...s} />
      ))}
    </svg>
  );
}
