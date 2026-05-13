"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const focusAndSelect = (el: HTMLInputElement | null) => {
  el?.focus();
  el?.select();
};

export function NodeTitle({
  id,
  title,
  onRename,
  className,
}: {
  id: string;
  title: string;
  onRename?: (nodeId: string, title: string) => void;
  className?: string;
}) {
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

  if (isEditing) {
    return (
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
        className={cn(
          "h-5 min-w-0 flex-1 cursor-text rounded bg-transparent px-0.5 text-13 font-medium leading-5 outline-none",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "block h-5 min-w-0 flex-1 cursor-pointer truncate text-13 font-medium leading-5",
        className,
      )}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(title);
        setIsEditing(true);
      }}
    >
      {title}
    </span>
  );
}
