import type { SVGProps } from "react";

/* Three nodes, two joined by a link: a project's node tree. */
export function NodesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 7C4 8.65685 5.34315 10 7 10C8.65685 10 10 8.65685 10 7C10 5.34315 8.65685 4 7 4C5.34315 4 4 5.34315 4 7Z" />
      <path d="M4 17C4 18.6569 5.34315 20 7 20C8.65685 20 10 18.6569 10 17C10 15.3431 8.65685 14 7 14C5.34315 14 4 15.3431 4 17Z" />
      <path d="M14 7C14 8.65685 15.3431 10 17 10C18.6569 10 20 8.65685 20 7C20 5.34315 18.6569 4 17 4C15.3431 4 14 5.34315 14 7Z" />
      <path d="M17 10V14C17 15.6569 15.6569 17 14 17H10" strokeLinecap="butt" strokeLinejoin="miter" />
    </svg>
  );
}
