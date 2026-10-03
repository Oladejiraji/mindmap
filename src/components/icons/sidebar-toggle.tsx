import type { SVGProps } from "react";

export function LogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="12"
      height="8"
      viewBox="0 0 12 8"
      fill="none"
      {...props}
    >
      <path
        fill="currentColor"
        d="M0 8V.112h1.605V1.51H1.8A2.23 2.23 0 0 1 2.698.403Q3.322 0 4.192 0q.882 0 1.477.403.601.403.887 1.108h.092Q6.963.82 7.65.414 8.336 0 9.287 0q1.196 0 1.952.733.76.733.761 2.21V8h-1.64V3.1c0-.582-.234-1.004-.558-1.265a1.8 1.8 0 0 0-1.162-.391q-.835 0-1.3.503c-.309.332-.538.524-.538 1.046L7.186 8H4.79l.381-5.007q0-.699-.446-1.124-.447-.425-1.162-.425-.487 0-.9.251-.406.247-.657.688c-.165.295-.39.636-.39 1.024V8z"
      />
    </svg>
  );
}

interface SidebarToggleIconProps extends SVGProps<SVGSVGElement> {
  open?: boolean;
}

export function SidebarToggleIcon({ open, ...props }: SidebarToggleIconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        d="M3 8C3 6.34315 4.34315 5 6 5H18C19.6569 5 21 6.34315 21 8V16C21 17.6569 19.6569 19 18 19H6C4.34315 19 3 17.6569 3 16V8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M0 9V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="transition-transform duration-200 ease-out"
        style={{
          transformBox: "view-box",
          transform: open ? "translateX(17px)" : "translateX(7px)",
        }}
      />
    </svg>
  );
}

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        d="M9.5 16.5V20H7C5.34315 20 4 18.6569 4 17V10.5383C4 9.57254 4.4649 8.66586 5.24909 8.10222L10.2491 4.50847C11.2953 3.75653 12.7047 3.75653 13.7509 4.50847L18.7509 8.10222C19.5351 8.66586 20 9.57254 20 10.5383V17C20 18.6569 18.6569 20 17 20H14.5V16.5C14.5 15.1193 13.3807 14 12 14C10.6193 14 9.5 15.1193 9.5 16.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path d="M22.0003 12.0001H20.0003C20.0003 10.5427 19.6106 9.1763 18.9297 7.99946L20.6606 7.00012" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.93 16.0008C19.6109 14.824 20.0006 13.4576 20.0006 12.0001H14.0006C14.0006 13.1047 13.1052 14.0001 12.0006 14.0001C11.6363 14.0001 11.2947 13.9027 11.0005 13.7325L8 18.9295C9.17684 19.6104 10.5432 20.0001 12.0006 20.0001C13.4581 20.0001 14.8245 19.6104 16.0013 18.9295C17.2153 18.2271 18.2275 17.2148 18.93 16.0008ZM18.93 16.0008L20.6609 17.0002" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 5.07074C17.214 5.77315 18.2262 6.78543 18.9287 7.99941" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 18.9294L16.9993 20.6603" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 20.0001V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.0001 20.6604L7.99946 18.9295C6.78546 18.227 5.77316 17.2148 5.07074 16.0008C4.38982 14.8239 4.0001 13.4575 4.0001 12.0001C4.0001 10.5427 4.38981 9.17631 5.07071 7.99948L3.33984 7.00018" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.07074 16.0007L3.33984 17.0001" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.99998 12.0001L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.07031 7.99949C5.77273 6.78547 6.78502 5.77317 7.99904 5.07074C9.17588 4.38982 10.5423 4.0001 11.9997 4.0001V2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 3.33984L7.99933 5.07074L10.9998 10.2678C11.294 10.0975 11.6356 10.0001 12 10.0001C13.1046 10.0001 14 10.8955 14 12.0001" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 4.00012C13.4574 4.00012 14.8238 4.38985 16.0007 5.07078" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.9993 3.33997L16 5.07078" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.9998 10.2678C10.4021 10.6136 10 11.2599 10 12.0001C10 12.7403 10.4021 13.3866 10.9998 13.7324" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="3"
      height="6"
      viewBox="0 0 3 6"
      fill="none"
      {...props}
    >
      <path
        fill="currentColor"
        fillOpacity="0.6"
        fillRule="evenodd"
        d="M2.885 2.676c.074.084.115.199.115.318 0 .12-.041.235-.115.32L.673 5.861a.4.4 0 0 1-.127.101.35.35 0 0 1-.303.003.4.4 0 0 1-.128-.098.5.5 0 0 1-.086-.148.51.51 0 0 1 .09-.495l1.937-2.23L.119.763A.5.5 0 0 1 .01.447C.012.329.053.216.125.132A.37.37 0 0 1 .397 0a.37.37 0 0 1 .276.127z"
        clipRule="evenodd"
      />
    </svg>
  );
}
