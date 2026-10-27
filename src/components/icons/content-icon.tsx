import type { SVGProps } from "react";

/* Code brackets with a slash: a node's content. */
export function ContentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 20L14 4M18 8.00004L19.9775 9.75781C21.32 10.9512 21.32 13.0489 19.9775 14.2423L18 16M6 16L4.02251 14.2423C2.67996 13.0489 2.67996 10.9512 4.02251 9.75781L6 8.00004" />
    </svg>
  );
}
