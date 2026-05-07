"use client";

import type { Ref } from "react";

import { CursorIcon } from "@/lib/svg";

const CURSOR_LABEL = "You";

export function CustomCursor({ ref }: { ref?: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute left-0 top-0 z-10000 opacity-0"
      style={{
        transition: "opacity 120ms ease-out",
        willChange: "transform",
      }}
    >
      <CursorIcon />
      <div className="absolute left-3.5 top-5 whitespace-nowrap rounded-tl-xs rounded-bl-[18px] rounded-br-[18px] rounded-tr-[18px] bg-[#51AC65] w-14.5 h-7 text-sm font-medium leading-none flex items-center justify-center text-white border-2 border-[#418A51]">
        {CURSOR_LABEL}
      </div>
    </div>
  );
}
