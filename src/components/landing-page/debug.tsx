"use client";
import React, { Fragment, useEffect, useRef } from "react";
import { useControls } from "leva";
import { cn } from "@/lib/utils";

export function Debug() {
  const verticalRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);

  // const { debug } = useControls({
  //   debug: {
  //     value: false,
  //   },
  // });

  const debug = false;

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (verticalRef.current) {
        verticalRef.current.style.transform = `translateX(${e.clientX}px)`;
      }

      if (horizontalRef.current) {
        horizontalRef.current.style.transform = `translateY(${e.clientY}px)`;
      }
    }
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <Fragment>
      <div
        ref={verticalRef}
        className={cn(
          "absolute top-0 left-0 h-full w-px bg-[red] pointer-events-none opacity-0 z-99",
          debug && "opacity-100",
        )}
      ></div>
      <div
        ref={horizontalRef}
        className={cn(
          "absolute top-0 left-0 w-full h-px bg-[red] pointer-events-none opacity-0",
          debug && "opacity-100 z-99",
        )}
      ></div>
    </Fragment>
  );
}
