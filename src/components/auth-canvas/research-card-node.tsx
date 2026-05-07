import { BranchIcon } from "@/lib/svg";
import { Position, type NodeProps } from "@xyflow/react";
import Image, { StaticImageData } from "next/image";
import { useAnimate } from "motion/react";
import { useEffect } from "react";
import { BranchDropdown } from "./branch-dropdown";
import { CustomHandle } from "./custom-handle";
import { EditableTitle } from "./editable-title";
import { usePulseConfig } from "./pulse-config";

export type ResearchCardData = {
  author?: { name: string; role?: string; image: StaticImageData; bg?: string };
  status?: string;
  pages: number;
  title: string;
  body: string;
  width?: number;
  pulseTrigger?: number;
};

const BASE_SHADOW =
  "0px 0px 0px 1px rgba(18, 81, 203, 0.035), 0px 3px 12px 0px rgba(11, 11, 11, 0.064), 0px 8px 24px 0px rgba(0, 0, 0, 0.035)";
const PEAK_SHADOW =
  "0px 0px 0px 1px rgba(18, 81, 203, 0.078), 0px 3px 12px 0px rgba(11, 11, 11, 0.141), 0px 8px 24px 0px rgba(0, 0, 0, 0.078)";

export function ResearchCardNode({ data }: NodeProps) {
  const {
    author,
    pages,
    body,
    width = 280,
    pulseTrigger,
  } = data as ResearchCardData;
  const { duration } = usePulseConfig();
  const [scope, animate] = useAnimate();

  useEffect(() => {
    if (!pulseTrigger || !scope.current) return;
    animate(
      scope.current,
      { boxShadow: [BASE_SHADOW, PEAK_SHADOW, BASE_SHADOW] },
      { duration, times: [0, 0.15, 1], ease: "easeOut" },
    );
  }, [pulseTrigger, duration, animate, scope]);

  return (
    <div className="font-diatype" style={{ width }}>
      {author ? (
        <div className="flex items-center mb-2 gap-1">
          <div
            className=" flex items-center gap-1 border border-black/2 rounded-[5px] px-1 py-0.5 shadow-[0_24px_40px_0_#8C8C8C0A,0_0_2px_0_#0000000A]"
            style={{ backgroundColor: author.bg || "#2D2D2D" }}
          >
            <div className="shrink-0">
              <Image
                src={author.image}
                alt="Auth avatar"
                className="rounded-full"
                width={16}
                height={16}
              />
            </div>
            <span className="text-background text-11 ">{author.name}</span>
          </div>
          {author.role ? (
            <p className="gradient-text-shimmer text-11 opacity-50">
              {author.role}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="relative">
        <div
          ref={scope}
          className="relative rounded-[16px] bg-white p-2 text-white shadow-[0_0_0_1px_#1251CB09,0_3px_12px_0_#0B0B0B10,0_8px_24px_0_#00000009]"
        >
          <div className="h-5  flex items-center justify-between">
            <div className="flex items-center gap-1 text-13 text-foreground/87">
              <div className="size-5 flex items-center justify-center">
                <BranchIcon pathClassName="fill-foreground" />
              </div>
              <EditableTitle initial="Brand Guidelines" />
            </div>
            <BranchDropdown iconClassName="size-2.5 text-foreground" />
          </div>
          <div
            className="mt-3 rounded-[8px] p-[0.5px]"
            style={{
              backgroundImage:
                "linear-gradient(var(--gradient-angle), #DFFBFF 5.2%, #C2DAF9 21.33%, #AEB3E4 37.46%, #E2909C 54.48%, #FFA189 69.71%, #FFD060 94.8%)",
              boxShadow:
                "0px 24px 40px 0px #0000000A, 0px 0px 2px 0px #0000000A",
              animation: "rotate-gradient-angle 6s linear infinite",
            }}
          >
            <div className="bg-background-2 p-2 rounded-[7.5px]">
              <p className="text-xs text-foreground/50 leading-tight">
                {pages} pages of research…
              </p>
              <p className="pt-2 text-13 leading-snug text-foreground">
                {body}
              </p>
            </div>
          </div>

          <CustomHandle type="source" position={Position.Bottom} />
        </div>
      </div>
    </div>
  );
}
