import type { SVGProps } from "react";

const stroke = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function FolderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3 7V16C3 17.6569 4.34315 19 6 19H18C19.6569 19 21 17.6569 21 16V10C21 8.34315 19.6569 7 18 7H13.0704C12.4017 7 11.7772 6.6658 11.4063 6.1094L10.5937 4.8906C10.2228 4.3342 9.59834 4 8.92963 4H6C4.34315 4 3 5.34315 3 7Z"
        {...stroke}
      />
    </svg>
  );
}

export function FolderPlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M21 10C21 8.34315 19.6569 7 18 7H13.6056C12.6025 7 11.6658 6.4987 11.1094 5.6641L10.8906 5.3359C10.3342 4.5013 9.39751 4 8.39445 4H6C4.34315 4 3 5.34315 3 7V16C3 17.6569 4.34315 19 6 19H11"
        {...stroke}
      />
      <path d="M18 14V17V20" {...stroke} />
      <path d="M15 17H18H21" {...stroke} />
    </svg>
  );
}
