import type { SVGProps } from "react";

/*
 * The app's chevron (2px stroke, round caps and joins). Drawn pointing down; the
 * other directions rotate the same path about the centre.
 */
function Chevron({ turn, ...props }: Omit<SVGProps<SVGSVGElement>, "rotate"> & { turn: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M6 9.5L12 15.5L18 9.5"
        transform={turn ? `rotate(${turn} 12 12)` : undefined}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const ChevronDownIcon = (props: SVGProps<SVGSVGElement>) => <Chevron turn={0} {...props} />;
export const ChevronUpIcon = (props: SVGProps<SVGSVGElement>) => <Chevron turn={180} {...props} />;
export const ChevronRightIcon = (props: SVGProps<SVGSVGElement>) => <Chevron turn={-90} {...props} />;
export const ChevronLeftIcon = (props: SVGProps<SVGSVGElement>) => <Chevron turn={90} {...props} />;
