"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";

export interface MindMapNodeData {
  title: string;
  isRoot: boolean;
  isParent: boolean;
  isStreaming: boolean;
  [key: string]: unknown;
}

export function MindMapNode({ data }: NodeProps) {
  const { title, isRoot, isParent, isStreaming } = data as MindMapNodeData;

  return (
    <div className="group relative flex w-[200px] flex-col gap-1 rounded-lg border bg-background px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md">
      {!isRoot && <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />}

      <div className="flex items-center gap-1.5">
        {isStreaming && (
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
        )}
        <span className="truncate text-sm font-medium">{title}</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isParent && (
          <>
            <GitBranch className="size-3" />
            <span>parent</span>
          </>
        )}
        {isRoot && !isParent && <span>root</span>}
        {!isRoot && !isParent && <span>leaf</span>}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  );
}
