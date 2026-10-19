import type { SVGProps } from "react";

export function BillingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3 10V16C3 17.6569 4.34315 19 6 19H18C19.6569 19 21 17.6569 21 16V10M3 10V8C3 6.34315 4.34315 5 6 5H18C19.6569 5 21 6.34315 21 8V10M3 10H21M7 14H10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
