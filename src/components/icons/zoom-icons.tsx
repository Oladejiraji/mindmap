import type { SVGProps } from "react";

export function ZoomInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 5.5V12M12 12V18.5M12 12H5.5M12 12H18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ZoomOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M5.5 12H18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
