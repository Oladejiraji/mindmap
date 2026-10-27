import type { SVGProps } from "react";

export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M10 10.5H11C11.5523 10.5 12 10.9477 12 11.5V19M12 19H10M12 19H14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="5.5" r="1.5" fill="currentColor" />
    </svg>
  );
}
