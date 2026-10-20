import type { SVGProps } from "react";

export function ApiIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8.42885 13C6.4564 13 4.85742 11.401 4.85742 9.42857C4.85742 7.61947 6.20253 6.12454 7.94719 5.88935C8.52634 4.20799 10.1222 3 12.0003 3C14.3672 3 16.286 4.91878 16.286 7.28571C17.8639 7.28571 19.1431 8.5649 19.1431 10.1429C19.1431 11.7208 17.8639 13 16.286 13H8.42885Z" />
      <circle cx="12" cy="18.5" r="2.5" />
      <path d="M9.5 18.5H3" />
      <path d="M21 18.5H14.5" />
      <path d="M12 16V13" />
    </svg>
  );
}
