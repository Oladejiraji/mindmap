"use client";
import React, { Fragment } from "react";
import { useAtomValue } from "jotai";
import { gridLinesAtom } from "@/lib/atoms/grid-lines";

interface IGridLine {
  isVertical?: boolean;
  translateX?: number;
  translateY?: number;
  size?: number;
  top?: number;
  left?: number;
}

const BOX_CONTENT_SIZE = 120;

function GridLine(props: IGridLine) {
  const {
    isVertical = false,
    translateX = 0,
    translateY = 0,
    size = 1,
  } = props;

  return (
    <div
      className="absolute top-0 left-0 h-full w-[0.5px] bg-[#3A89FF] pointer-events-none"
      style={{
        width: isVertical ? size : "100%",
        height: isVertical ? "100%" : size,
        transform: `translate(${translateX}px, ${translateY}px)`,
      }}
    ></div>
  );
}

export default function GridLines() {
  const gridLines = useAtomValue(gridLinesAtom);
  const { header, box } = gridLines;

  return (
    <Fragment>
      <GridLine isVertical size={0.5} translateX={header.left} />
      <GridLine isVertical size={0.5} translateX={header.left + header.width} />
      <GridLine
        isVertical
        size={0.5}
        translateX={header.left + header.width - 10}
      />

      <GridLine translateY={box.top} />
      <GridLine translateY={box.top + 10} />

      <GridLine translateY={box.top + box.height} />
      <GridLine translateY={box.top + box.height - 10} />
      <GridLine translateY={box.top + box.height + 218} />

      <GridLine
        translateY={box.top + box.height * 0.5 - BOX_CONTENT_SIZE * 0.5}
      />
      <GridLine
        translateY={box.top + box.height * 0.5 + BOX_CONTENT_SIZE * 0.5}
      />

      <GridLine isVertical translateX={box.left} />
      <GridLine isVertical translateX={box.left + 10} />
    </Fragment>
  );
}
