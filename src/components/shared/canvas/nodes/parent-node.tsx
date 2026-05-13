"use client";

import { Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { BranchIcon } from "@/lib/svg";
import { CustomHandle } from "@/components/auth-canvas/custom-handle";
import { type MindMapNodeData, CANVAS_NODE_WIDTH } from "./types";
import { NodeTitle } from "./node-title";
import { NodeMenu } from "./node-menu";
import { NodeContent } from "./node-content";

export function ParentNode({ id, data, selected }: NodeProps) {
  const { title, isRoot, content, onDelete, onRename } =
    data as MindMapNodeData;
  const isLeaf = !(data as MindMapNodeData).isParent && !isRoot;

  return (
    <div className="group font-diatype" style={{ width: CANVAS_NODE_WIDTH }}>
      <div
        className={cn(
          "relative rounded-[16px] bg-primary p-2 text-white shadow-[0_8px_30px_-12px_rgba(37,99,235,0.27)]",
          selected && "ring-2 ring-white/30",
        )}
      >
        {!isRoot && (
          <CustomHandle type="target" position={Position.Top} variant="a" />
        )}

        <div className="mindmap-drag-handle flex h-5 cursor-grab items-center justify-between active:cursor-grabbing">
          <div className="flex min-w-0 flex-1 items-center gap-1 text-background/87">
            <div className="flex size-5 shrink-0 items-center justify-center">
              <BranchIcon />
            </div>
            <NodeTitle
              id={id}
              title={title}
              onRename={onRename}
              className="text-background/87 focus:ring-1 focus:ring-white/30"
            />
          </div>
          {isLeaf && <NodeMenu id={id} onDelete={onDelete} />}
        </div>

        <div className="nowheel mt-3 max-h-40 overflow-y-auto overscroll-contain rounded-[8px] bg-ring p-2 text-background shadow-[0_1px_3px_0_#82A7F121,0_0_0_0.5px_#82A7F1]">
          <NodeContent content={content} />
        </div>

        <CustomHandle type="source" position={Position.Bottom} variant="a" />
      </div>
    </div>
  );
}
