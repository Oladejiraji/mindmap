import type { SVGProps } from "react";

/* Up-and-down chevrons for dropdown triggers. */
export function SelectorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 8.99981L11.1161 5.88369C11.6043 5.39554 12.3957 5.39554 12.8839 5.8837L16 8.99981" />
      <path d="M8 15L11.1161 18.1161C11.6043 18.6043 12.3957 18.6043 12.8839 18.1161L16 15" />
    </svg>
  );
}
