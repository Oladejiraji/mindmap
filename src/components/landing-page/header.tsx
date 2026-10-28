"use client";
import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { Search } from "../icons";
import { useSetAtom } from "jotai";
import { gridLinesAtom } from "@/lib/atoms/grid-lines";
import { NavArea } from "./nav/nav-area";

export function Header() {
  const ref = useRef<HTMLDivElement>(null);
  const setGridLines = useSetAtom(gridLinesAtom);

  useEffect(() => {
    function measure() {
      const rect = ref.current?.getBoundingClientRect();

      setGridLines((prev) => {
        const updated = {
          ...prev,
          header: {
            top: rect?.top || 0,
            left: rect?.left || 0,
            width: rect?.width || 0,
            height: rect?.height || 0,
          },
        };
        return updated;
      });
    }

    const observer = new ResizeObserver(measure);
    if (ref.current) observer.observe(ref.current);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [setGridLines]);

  return (
    <div ref={ref} className="h-18 flex items-center justify-between gap-2.25">
      <div className="w-95">
        <p className="text-white font-bricolage leading-5 tracking-[-2.6%] font-semibold text-13">
          mindmap
        </p>
      </div>
      <div className="flex items-center flex-1 justify-between">
        <div className="flex gap-1 items-center">
          <NavArea />

          <div className="w-7 h-7 flex items-center justify-center">
            <Search />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link href="#">
            <div className="h-7 flex items-center px-2">
              <p className="font-inter-display text-[#A0C4FD] font-medium text-13 leading-5 tracking-[0.4%] text-shadow-[0px_1px_1px_#0000001F]">
                Sign in
              </p>
            </div>
          </Link>

          <Link href="#">
            <div className="h-7 flex items-center px-2">
              <p className="font-inter-display text-white font-medium text-13 leading-5 tracking-[0.4%] text-shadow-[0px_1px_1px_#0000001F]">
                Get Started
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
