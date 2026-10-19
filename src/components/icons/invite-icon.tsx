import type { SVGProps } from "react";

export function InviteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M11 20H7.75C6.09315 20 4.69455 18.6232 5.20302 17.0463C6.12257 14.1946 8.42872 12 12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="7.75" r="4.25" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 14V20M21 17H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
