"use client";

import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Copy, Download, Ellipsis, FolderDown, PanelRightOpen, Trash2 } from "lucide-react";
import type { ExportAction } from "./types";
import { cn } from "@/lib/utils";

const item =
  "corner-squircle flex cursor-pointer items-center gap-2 rounded-[14px] px-2 py-1.5 outline-none hover:bg-background-4";

/** A card's … menu. Delete only shows when the card can be deleted. */
export function NodeMenu({
  id,
  onOpen,
  onDelete,
  onExport,
  hasBranches = false,
}: {
  id: string;
  onOpen?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onExport?: (nodeId: string, how: ExportAction) => void;
  /** Offers downloading the node with everything under it. */
  hasBranches?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <Menu.Trigger
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "nodrag flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md transition-opacity",
          menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <Ellipsis className="size-3" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" className="z-50">
          <Menu.Popup
            className="corner-squircle w-44 rounded-4xl bg-white p-1.5 text-body-sm text-fg-primary shadow-large outline-none"
          >
            {onOpen && (
              <Menu.Item className={item} onClick={() => onOpen(id)}>
                <PanelRightOpen className="size-3" />
                Open panel
              </Menu.Item>
            )}
            {onExport && (
              <>
                <Menu.Item className={item} onClick={() => onExport(id, "copy")}>
                  <Copy className="size-3" />
                  Copy as markdown
                </Menu.Item>
                <Menu.Item className={item} onClick={() => onExport(id, "download")}>
                  <Download className="size-3" />
                  Download
                </Menu.Item>
                {hasBranches && (
                  <Menu.Item className={item} onClick={() => onExport(id, "branch")}>
                    <FolderDown className="size-3" />
                    Download with branches
                  </Menu.Item>
                )}
              </>
            )}
            {onDelete && (
              <Menu.Item className={cn(item, "text-destructive")} onClick={() => onDelete(id)}>
                <Trash2 className="size-3" />
                Delete node
              </Menu.Item>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
