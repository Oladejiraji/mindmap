"use client";

import { Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { BranchIcon } from "@/lib/svg";
import { CustomHandle } from "@/components/auth-canvas/custom-handle";
import { type MindMapNodeData, CANVAS_NODE_WIDTH } from "./types";
import { NodeTitle } from "./node-title";
import { RenderIf } from "@/components/shared/render-if";
import { EditPreviewButton } from "@/components/shared/edit-preview-button";
import { NodePreview } from "./node-preview";
import { NodeMenu } from "./node-menu";
import { BorderBeam } from "border-beam";
import { NodeContent } from "./node-content";

export function LeafNode({ id, data, selected }: NodeProps) {
  const { title, content, onOpen, onDelete, onRename, hasSuggestion, preview } = data as MindMapNodeData;

  return (
    <div className="group" style={{ width: CANVAS_NODE_WIDTH }}>
      <div
        className={cn(
          "relative rounded-3xl bg-white p-2 shadow-node",
          selected && "ring-2 ring-ring",
        )}
      >
        <CustomHandle type="target" position={Position.Top} />

        <div className="mindmap-drag-handle flex h-5 cursor-grab items-center justify-between active:cursor-grabbing">
          <div className="flex min-w-0 flex-1 items-center gap-1 text-fg-primary">
            <div className="flex size-5 shrink-0 items-center justify-center">
              <BranchIcon pathClassName="fill-foreground" />
            </div>
            <NodeTitle
              id={id}
              title={title}
              onRename={onRename}
              className="text-fg-primary focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1 pl-2">
            <RenderIf condition={!!hasSuggestion}>
              <EditPreviewButton nodeId={id} />
            </RenderIf>
            <NodeMenu id={id} onOpen={onOpen} onDelete={onDelete} />
          </div>
        </div>

        {/* Antalik's border beam at 20% strength around the writing area
            (was a static gradient border). */}
        <div className="mt-3">
          <BorderBeam theme="light" strength={0.2}>
            <div className="nowheel max-h-40 overflow-y-auto overscroll-contain rounded-lg bg-background-2 text-fg-primary shadow-default [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* While previewing a suggested edit: the node as it would be. */}
              <RenderIf condition={!!preview}>
                <NodePreview blocks={preview ?? []} />
              </RenderIf>
              <RenderIf condition={!preview}>
                <NodeContent nodeId={id} content={content} />
              </RenderIf>
            </div>
          </BorderBeam>
        </div>

        <CustomHandle type="source" position={Position.Bottom} />
      </div>
    </div>
  );
}
