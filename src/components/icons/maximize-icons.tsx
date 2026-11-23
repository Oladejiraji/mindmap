import type { SVGProps } from "react";

/** Arrows out to the corners: open full screen. */
export function MaximizeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M10 4H4V10M20 14V20H14M4.75 4.75L10 10M14 14L19.25 19.25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Arrows in from the corners: leave full screen. */
export function MinimizeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M10 4V10M10 10H4M10 10L3.75 3.75M14 20V14M14 14H20M14 14L20.25 20.25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
