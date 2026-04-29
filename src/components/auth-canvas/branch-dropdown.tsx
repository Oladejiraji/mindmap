"use client";

import { BranchIcon, MergeIcon, SplitIcon } from "@/lib/svg";
import { Menu } from "@base-ui/react/menu";
import { Ellipsis } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  branchCount?: number;
  triggerClassName?: string;
  iconClassName?: string;
  triggerIcon?: ReactNode;
};

export function BranchDropdown({
  branchCount = 26,
  triggerClassName,
  iconClassName = "size-2.5",
  triggerIcon,
}: Props) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Branch options"
        className={`nodrag ${
          triggerClassName ??
          "size-5 flex items-center justify-center rounded-sm outline-none cursor-pointer focus-visible:ring-1 focus-visible:ring-white/20"
        }`}
      >
        {triggerIcon ?? <Ellipsis className={iconClassName} />}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" className="z-50">
          <Menu.Popup
            className="font-diatype w-48 rounded-[8px] bg-white p-1.5 text-13 text-foreground-subtle ring-1 ring-white/10 backdrop-blur outline-none"
            style={{
              boxShadow:
                "0px 0px 0px 1px #11111105, 0px 24px 40px 0px #0000000A, 0px 16px 28px 0px #0000000A, 0px 0px 2px 0px #0000000A",
            }}
          >
            <Menu.Item className="flex hover:bg-background-4! rounded-[6px] cursor-pointer items-center gap-2  px-2 h-8.5  outline-none data-highlighted:bg-white/5">
              <div className="rotate-180">
                <BranchIcon pathClassName="fill-foreground-subtle" />
              </div>
              Delete research branch
            </Menu.Item>
            <Menu.Item className="flex cursor-pointer hover:bg-background-4! rounded-[6px] items-center gap-2 px-2 py-1.5 text-foreground-subtle outline-none data-highlighted:bg-white/5">
              <SplitIcon />
              Add new branch
            </Menu.Item>
            <Menu.Item className="flex cursor-pointer hover:bg-background-4! border-t-[0.5px] border-foreground-subtle/10 rounded-[6px] items-center justify-between px-2 py-1.5 text-foreground-subtle outline-none data-highlighted:bg-white/5">
              <span className="flex items-center gap-2">
                <MergeIcon />
                All Branches
              </span>
              <span className="text-zinc-500">{branchCount}</span>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
