import React from "react";
import BrandingBalls from "@/components/branding/branding-balls";

const SCALE = 0.75;
const CARD_WIDTH = 570 * SCALE;
const CARD_HEIGHT = 861 * SCALE;
const CIRCLE_SIZE = 528 * SCALE;
const BALL_SIZE = 75 * 0.5 * SCALE;
const HEADING_FONT_SIZE = 77 * SCALE;
const HEADER_PADDING_X = 48 * SCALE;
const HEADER_PADDING_TOP = 24 * SCALE;
const HEADER_PADDING_BOTTOM = 40 * SCALE;
const SUB_HEADING_FONT_SIZE = 16 * SCALE;

export default function Page() {
  return (
    <div className="h-screen w-full flex items-center justify-center">
      {/* <div className="w-[576px] h-[866px] bg-[red]"></div> */}
      <div
        className="bg-[#0052FF] flex flex-col"
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          paddingTop: HEADER_PADDING_TOP,
          paddingBottom: HEADER_PADDING_BOTTOM,
        }}
      >
        <div
          className="px-9 flex flex-col gap-1"
          style={{
            padding: `0 ${HEADER_PADDING_X}px`,
          }}
        >
          <h1
            className="font-google-sans leading-none tracking-[-3%] font-medium text-white"
            style={{
              fontSize: HEADING_FONT_SIZE,
            }}
          >
            Outshine the <br /> scatter
          </h1>
          <p
            className="font-diatype leading-none tracking-[-3%] text-white"
            style={{
              fontSize: SUB_HEADING_FONT_SIZE,
            }}
          >
            Ignore the noise, see the clear path
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <BrandingBalls size={CIRCLE_SIZE} ballSize={BALL_SIZE} />
        </div>
        <div
          className="flex justify-between items-end"
          style={{
            padding: `0 ${HEADER_PADDING_X}px`,
          }}
        >
          <p className="text-white font-bricolage leading-5 tracking-[-2.6%] font-semibold text-13">
            mindmap
          </p>
          <div className="flex gap-0.5">
            <div className="w-px bg-white opacity-30 h-8.5"></div>
            <div className="w-px bg-white opacity-35 h-8.5"></div>
            <div className="w-0.5 bg-white opacity-90 h-8.5"></div>
            <div className="w-px bg-white opacity-30 h-8.5"></div>
            <div className="w-0.5 bg-white opacity-65 h-8.5"></div>
            <div className="w-px bg-white opacity-20 h-8.5"></div>
            <div className="w-1 bg-white opacity-70 h-8.5"></div>
            <div className="w-px bg-white opacity-60 h-8.5"></div>
            <div className="w-px bg-white opacity-20 h-8.5"></div>
            <div className="w-0.5 bg-white opacity-80 h-8.5"></div>
            <div className="w-px bg-white opacity-40 h-8.5"></div>
            <div className="w-px bg-white opacity-70 h-8.5"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
