import type { SVGProps } from "react";

export function NewTabIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 21C16.9706 21 21 16.9706 21 12C21 11.3514 20.6952 10.7501 20.2365 10.2915L13.7085 3.76346C13.2499 3.30483 12.6486 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12.9621 3.5C12.8041 7.62558 16.3738 11.1953 20.4994 11.0373" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 6L18 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
