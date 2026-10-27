import type { SVGProps } from "react";

/* A window with a small inset pane: pop the chat out to float, or dock it back. */
export function FloatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M18 5H6C4.34315 5 3 6.34315 3 8V16C3 17.6569 4.34315 19 6 19H18C19.6569 19 21 17.6569 21 16V8C21 6.34315 19.6569 5 18 5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="14" y="10" width="4" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}
