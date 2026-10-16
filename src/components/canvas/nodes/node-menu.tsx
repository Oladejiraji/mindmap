"use client";

import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Ellipsis, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function NodeMenu({
  id,
  onDelete,
}: {
  id: string;
  onDelete?: (nodeId: string) => void;
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
            className="font-diatype w-44 rounded-lg bg-white p-1.5 text-13 text-foreground-subtle shadow-large outline-none"
          >
            <Menu.Item
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-destructive outline-none hover:bg-background-4"
              onClick={() => onDelete?.(id)}
            >
              <Trash2 className="size-3" />
              Delete node
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
