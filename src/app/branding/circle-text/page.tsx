"use client";
import React from "react";

const SCALE = 0.75;
const CARD_WIDTH = 570 * SCALE;
const CARD_HEIGHT = 861 * SCALE;
const CIRCLE_SIZE = 479 * SCALE;
const MAIN_FONT_SIZE = 45 * SCALE;
const TEXT_COUNT = 35;
const MIN_OPACITY = 0.025;
const HEADER_PADDING_X = 48 * SCALE;
const HEADER_PADDING_TOP = 33 * SCALE;
const HEADER_PADDING_BOTTOM = 40 * SCALE;
const HEADING_FONT_SIZE = 50 * SCALE;
const CARD_GAP = 24 * SCALE;
const CONTENT_GAP = 42 * SCALE;
const SUB_TEXT_FONT_SIZE = 14 * SCALE;
const FOOTER_GAP = 50 * SCALE;

export default function Page() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-black">
      <div
        className="bg-[#DFFBFF] flex flex-col"
        style={{
          gap: CARD_GAP,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          paddingTop: HEADER_PADDING_TOP,
          paddingBottom: HEADER_PADDING_BOTTOM,
        }}
      >
        <div
          className="flex justify-between"
          style={{
            padding: `0 ${HEADER_PADDING_X}px`,
          }}
        >
          <h1
            className="font-google-sans tracking-[-3%] leading-none"
            style={{
              fontSize: HEADING_FONT_SIZE,
            }}
          >
            One <br /> Perfect <br /> Route
          </h1>

          <p
            className="text-right font-diatype tracking-[-3%] leading-none mt-2"
            style={{
              fontSize: SUB_TEXT_FONT_SIZE,
            }}
          >
            Fragmented learning leaves <br /> you running in circles.
          </p>
        </div>
        <div
          className="flex flex-col flex-1"
          style={{
            gap: CONTENT_GAP,
          }}
        >
          <div className="flex justify-center flex-1 items-center">
            <div
              className="relative flex items-center justify-center"
              style={{
                width: CIRCLE_SIZE,
                height: CIRCLE_SIZE,
              }}
            >
              {Array.from({ length: TEXT_COUNT }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 flex justify-end origin-left"
                  style={{
                    width: CIRCLE_SIZE / 2,
                    zIndex: i === 0 ? TEXT_COUNT : 0,
                    opacity: i === 0 ? 1 : 0.7,
                    transform: `translateY(-50%) rotate(${(-360 / TEXT_COUNT) * i}deg)`,
                  }}
                >
                  <p
                    className="font-google-sans tracking-[-3%] leading-none whitespace-nowrap font-medium"
                    style={{
                      fontSize: MAIN_FONT_SIZE,
                      color: i === 0 ? "#0052FF" : "#000000",
                      opacity: 1 - ((1 - MIN_OPACITY) / (TEXT_COUNT - 1)) * i,
                    }}
                  >
                    MindMap
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="flex flex-col"
            style={{
              gap: FOOTER_GAP,
              padding: `0 ${HEADER_PADDING_X}px`,
            }}
          >
            <p
              className="font-diatype tracking-[-3%] leading-none"
              style={{
                fontSize: SUB_TEXT_FONT_SIZE,
              }}
            >
              Bridge complex ideas with seamless execution.
            </p>
            <p className="text-black font-bricolage leading-5 tracking-[-2.6%] font-semibold text-13">
              mindmap
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
