import type { SVGProps } from "react";

/* A page with a pencil: a suggested edit to a node's document. */
export function EditDocumentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 21.5H8C6.34315 21.5 5 20.1569 5 18.5V6C5 4.34315 6.34315 3 8 3H16C17.6569 3 19 4.34315 19 6V11" />
      <path
        d="M14 21.0002V18.6668L17.5 15.1668C18.1443 14.5225 19.189 14.5225 19.8333 15.1668C20.4777 15.8112 20.4777 16.8558 19.8333 17.5002L16.3333 21.0002H14Z"
        strokeLinecap="square"
      />
      <path d="M9 7H15" />
      <path d="M9 11H11" />
    </svg>
  );
}
