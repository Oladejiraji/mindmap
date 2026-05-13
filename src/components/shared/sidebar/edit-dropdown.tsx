import React, { Dispatch, SetStateAction, useState } from "react";
import { GitBranch, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { routes } from "@/lib/routes";
import { handleError } from "@/lib/handle-error";
import type { Id } from "@convex/dataModel";
import { type FlatNode } from "@/lib/tree";
import { useCreateEmptyBranch } from "@/services/nodes/mutations";

interface INodeItemProps {
  threadId: Id<"threads">;
  node: FlatNode;
  isActive: boolean;
  handleDeleteClick: () => void;
  setDraft: Dispatch<SetStateAction<string>>;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
}

const EditDropdown = ({
  threadId,
  node,
  handleDeleteClick,
  isActive,
  setDraft,
  setIsEditing,
}: INodeItemProps) => {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const createEmptyBranch = useCreateEmptyBranch();

  const canDelete = node.isLeaf || node.parentId === null;

  const handleBranch = async () => {
    try {
      const { childId } = await createEmptyBranch({ parentId: node._id });
      router.push(routes.node(threadId, childId));
    } catch (err) {
      handleError(err, "Failed to create branch");
    }
  };

  return (
    <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <Menu.Trigger
        aria-label="Node options"
        className={cn(
          "absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-sidebar-foreground hover:bg-background-5",
          isActive || menuOpen
            ? "opacity-100"
            : "opacity-0 group-hover/node:opacity-100",
        )}
      >
        <MoreHorizontal size={12} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="end" className="z-50">
          <Menu.Popup className="min-w-32 rounded-md border bg-popover p-1 shadow-md">
            <Menu.Item
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-background-5"
              onClick={() => {
                setDraft(node.title);
                setIsEditing(true);
              }}
            >
              <Pencil className="size-3" />
              Rename
            </Menu.Item>
            <Menu.Item
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-background-5"
              onClick={handleBranch}
            >
              <GitBranch className="size-3" />
              Branch here
            </Menu.Item>
            {canDelete && (
              <Menu.Item
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-background-5"
                onClick={handleDeleteClick}
              >
                <Trash2 className="size-3" />
                Delete
              </Menu.Item>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
};

export default EditDropdown;
