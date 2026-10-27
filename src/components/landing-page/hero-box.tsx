"use client";
import React, { useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { gridLinesAtom } from "@/lib/atoms/grid-lines";
import { IntegrationLogo } from "./integration-cycle";

export function HeroBox() {
  const ref = useRef<HTMLDivElement>(null);
  const setGridLines = useSetAtom(gridLinesAtom);

  useEffect(() => {
    function measure() {
      const rect = ref.current?.getBoundingClientRect();

      setGridLines((prev) => {
        const updated = {
          ...prev,
          box: {
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
    <div
      ref={ref}
      className="w-148 h-83.25 bg-[#0066FF] p-2.5 rounded-2xl relative"
    >
      <div className="w-full h-full rounded-md flex items-center justify-center border-[1.48] border-[#2E82FF]">
        <div className="w-30 h-30 bg-[#1A76FF] shadow-[inset_1px_1px_0.2px_0px_#FFFFFF21,0px_0px_0px_1px_#0066FF,0px_2px_5px_0px_#093BDC40] rounded-[30px] relative overflow-hidden">
          <IntegrationLogo />
        </div>
      </div>

      <div
        className="absolute top-2.5 bottom-2.5 w-[0.5px] left-[50%] bg-[#3A89FF]"
        style={{ transform: `translateX(calc(-60px - 50%))` }}
      ></div>
      <div
        className="absolute top-2.5 bottom-2.5 w-[0.5px] left-[50%] bg-[#3A89FF]"
        style={{ transform: `translateX(calc(60px - 50%))` }}
      ></div>
    </div>
  );
}
