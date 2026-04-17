"use client";

import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Menu } from "@base-ui/react/menu";
import { GitBranch, MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MindMapNodeData {
  title: string;
  isRoot: boolean;
  isParent: boolean;
  isStreaming: boolean;
  onDelete?: (nodeId: string) => void;
  onRename?: (nodeId: string, title: string) => void;
  [key: string]: unknown;
}

const focusAndSelect = (el: HTMLInputElement | null) => {
  el?.focus();
  el?.select();
};

export function MindMapNode({ id, data, selected }: NodeProps) {
  const { title, isRoot, isParent, isStreaming, onDelete, onRename } =
    data as MindMapNodeData;
  const isLeaf = !isRoot && !isParent;
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  const commitRename = () => {
    const next = draft.trim();
    if (next && next !== title) {
      onRename?.(id, next);
    }
    setIsEditing(false);
  };

  const cancelRename = () => {
    setDraft(title);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "group relative flex w-50 cursor-default flex-col rounded-lg border bg-background shadow-sm transition-shadow hover:shadow-md",
        selected && "ring-2 ring-ring",
      )}
    >
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="bg-muted-foreground!"
        />
      )}

      <div className="mindmap-drag-handle flex cursor-grab items-center gap-1.5 rounded-t-lg px-3 pt-2.5 pb-1 active:cursor-grabbing">
        {isStreaming && (
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
        )}
        {isEditing ? (
          <input
            ref={focusAndSelect}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelRename();
              }
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="h-6 min-w-0 flex-1 cursor-text rounded border bg-background px-1 text-sm font-medium leading-none outline-none focus:ring-1 focus:ring-ring"
          />
        ) : (
          <span
            title="Double-click to rename"
            className="block h-6 min-w-0 flex-1 cursor-pointer truncate rounded border border-transparent px-1 text-sm font-medium leading-6 hover:bg-muted"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setDraft(title);
              setIsEditing(true);
            }}
          >
            {title}
          </span>
        )}

        {isLeaf && (
          <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Menu.Trigger
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                "flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground",
                menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            >
              <MoreHorizontal className="size-3.5" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={4}>
                <Menu.Popup className="z-50 min-w-32 rounded-md border bg-popover p-1 shadow-md">
                  <Menu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-muted"
                    onClick={() => {
                      onDelete?.(id);
                    }}
                  >
                    <Trash2 className="size-3" />
                    Delete
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 pb-2.5 text-xs text-muted-foreground">
        {isParent && (
          <>
            <GitBranch className="size-3" />
            <span>parent</span>
          </>
        )}
        {isRoot && !isParent && <span>root</span>}
        {isLeaf && <span>leaf</span>}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="bg-muted-foreground!"
      />
    </div>
  );
}
