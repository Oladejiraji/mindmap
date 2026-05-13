"use client";

import { Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { BranchIcon } from "@/lib/svg";
import { CustomHandle } from "@/components/auth-canvas/custom-handle";
import { type MindMapNodeData, CANVAS_NODE_WIDTH } from "./types";
import { NodeTitle } from "./node-title";
import { NodeMenu } from "./node-menu";
import { NodeContent } from "./node-content";

export function LeafNode({ id, data, selected }: NodeProps) {
  const { title, content, onDelete, onRename } = data as MindMapNodeData;

  return (
    <div className="group font-diatype" style={{ width: CANVAS_NODE_WIDTH }}>
      <div
        className={cn(
          "relative rounded-[16px] bg-white p-2 shadow-[0_0_0_1px_#1251CB09,0_3px_12px_0_#0B0B0B10,0_8px_24px_0_#00000009]",
          selected && "ring-2 ring-ring",
        )}
      >
        <CustomHandle type="target" position={Position.Top} />

        <div className="mindmap-drag-handle flex h-5 cursor-grab items-center justify-between active:cursor-grabbing">
          <div className="flex min-w-0 flex-1 items-center gap-1 text-foreground/87">
            <div className="flex size-5 shrink-0 items-center justify-center">
              <BranchIcon pathClassName="fill-foreground" />
            </div>
            <NodeTitle
              id={id}
              title={title}
              onRename={onRename}
              className="text-foreground/87 focus:ring-1 focus:ring-ring"
            />
          </div>
          <NodeMenu id={id} onDelete={onDelete} />
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
          <div className="nowheel max-h-40 overflow-y-auto overscroll-contain rounded-[7.5px] bg-background-2 p-2 text-foreground">
            <NodeContent content={content} />
          </div>
        </div>

        <CustomHandle type="source" position={Position.Bottom} />
      </div>
    </div>
  );
}
