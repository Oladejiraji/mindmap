import { AnthropicIcon, BranchIcon, GptIcon } from "@/lib/svg";
import { Position, type NodeProps } from "@xyflow/react";
import Image, { StaticImageData } from "next/image";
import { BranchDropdown } from "./branch-dropdown";
import { CustomHandle, type HandleVariant } from "./custom-handle";
import { EditableTitle } from "./editable-title";
import { PlusIcon } from "lucide-react";

type HandleSide = "top" | "bottom" | "left" | "right";

export type BrandCardData = {
  author?: { name: string; role?: string; image: StaticImageData; bg?: string };
  pages: number;
  body: string;
  width?: number;
  showModel?: boolean;
  handles?: HandleSide[];
  handleVariant?: HandleVariant;
};

const ALL_HANDLES: HandleSide[] = ["top", "bottom", "left", "right"];

export function BrandCardNode({ data }: NodeProps) {
  const {
    author,
    showModel,
    pages,
    body,
    width = 280,
    handles = ALL_HANDLES,
    handleVariant,
  } = data as BrandCardData;

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
            <p className="text-foreground-3/30 text-11">{author.role}</p>
          ) : null}
        </div>
      ) : null}

      <div className="relative rounded-[16px] bg-primary p-2 text-white shadow-[0_8px_30px_-12px_rgba(37,99,235,0.6)]">
        <div className="h-5  flex items-center justify-between">
          <div className="flex items-center gap-1 text-13 text-background/87">
            <div className="size-5 flex items-center justify-center">
              <BranchIcon />
            </div>
            <EditableTitle initial="Brand Guidelines" />
          </div>
          <BranchDropdown iconClassName="size-2.5 text-background/87" />
        </div>
        <div className="bg-ring p-2 shadow-[0_1px_3px_0_#82A7F121,0_0_0_0.5px_#82A7F1] mt-3 rounded-[8px]">
          <p className="text-sm text-background/50 leading-tight">
            {pages} pages of research…
          </p>
          <p className="pt-2 text-xs leading-snug text-background">{body}</p>
        </div>

        {handles.includes("top") ? (
          <CustomHandle
            type="target"
            position={Position.Top}
            variant={handleVariant}
          />
        ) : null}
        {handles.includes("bottom") ? (
          <CustomHandle
            type="source"
            position={Position.Bottom}
            variant={handleVariant}
          />
        ) : null}
        {handles.includes("right") ? (
          <CustomHandle
            type="source"
            id="right"
            position={Position.Right}
            variant={handleVariant}
          />
        ) : null}
        {handles.includes("left") ? (
          <CustomHandle
            type="target"
            id="left"
            position={Position.Left}
            variant={handleVariant}
          />
        ) : null}
      </div>

      {showModel ? (
        <div className="pt-2 flex items-center gap-1.5">
          <button
            className="px-1 py-px rounded-[5px] border border-black/2 flex items-center text-11 text-foreground-2 bg-background-5"
            style={{
              boxShadow:
                "0px 24px 40px 0px #0000000A, 0px 0px 2px 0px #0000000A",
            }}
          >
            <div className="flex items-center justify-center size-4.5">
              <GptIcon />
            </div>
            <p>Chatgpt 5.5</p>
          </button>
          <button
            className="px-1 py-px rounded-[5px] border border-black/2 flex items-center text-11 text-foreground-2 bg-background-5"
            style={{
              boxShadow:
                "0px 24px 40px 0px #0000000A, 0px 0px 2px 0px #0000000A",
            }}
          >
            <div className="flex items-center justify-center size-4.5">
              <AnthropicIcon />
            </div>
            <p>Anthropic</p>
          </button>
          <button
            className="size-5 justify-center rounded-[5px] border border-black/2 flex items-center text-11 text-foreground-2 bg-background-5"
            style={{
              boxShadow:
                "0px 24px 40px 0px #0000000A, 0px 0px 2px 0px #0000000A",
            }}
          >
            <PlusIcon className="size-3" />
          </button>
          <p className="font-medium text-11 text-foreground-3/30">
            Models in use
          </p>
        </div>
      ) : null}
    </div>
  );
}
