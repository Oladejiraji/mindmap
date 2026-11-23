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
  const { title, isRoot, content, onOpen, onDelete, onRename } =
    data as MindMapNodeData;
  const isLeaf = !(data as MindMapNodeData).isParent && !isRoot;

  return (
    <div className="group" style={{ width: CANVAS_NODE_WIDTH }}>
      <div
        className={cn(
          "relative rounded-3xl bg-primary p-2 text-white shadow-node-primary",
          // The leaf's blue ring, set off by a gap so it doesn't merge into
          // the blue node.
          selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
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
              className="text-background/87 focus-visible:ring-1 focus-visible:ring-white/30"
            />
          </div>
          <NodeMenu id={id} onOpen={onOpen} onDelete={isLeaf ? onDelete : undefined} />
        </div>

        <div className="nowheel mt-3 max-h-40 overflow-y-auto overscroll-contain rounded-lg bg-ring p-2 text-background shadow-node-inset [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NodeContent nodeId={id} content={content} editorTheme="dark" />
        </div>

        <CustomHandle type="source" position={Position.Bottom} variant="a" />
      </div>
    </div>
  );
}
