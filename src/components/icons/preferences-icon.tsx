import type { SVGProps } from "react";

const s = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function PreferencesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M5.95117 20.004V14.0015" {...s} />
      <path d="M5.95117 9.99999V3.99707" {...s} />
      <path d="M12 20.0038V13.0005" {...s} />
      <path d="M12 8.99915V3.99707" {...s} />
      <path d="M18.0488 20.0036V16.002" {...s} />
      <path d="M18.0488 12.0008V3.99707" {...s} />
      <path d="M10.0449 8.99902H13.9553" {...s} />
      <path d="M16.0938 16.002H20.0041" {...s} />
      <path d="M3.99609 14.0015H7.90643" {...s} />
    </svg>
  );
}
