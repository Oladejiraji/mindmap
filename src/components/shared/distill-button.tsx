"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { handleError } from "@/lib/handle-error";

export function DistillButton() {
  const pathname = usePathname();
  const match = pathname.match(/^\/t\/[^/]+\/n\/([^/]+)/);
  if (!match) return null;

  const nodeId = match[1] as Id<"nodes">;
  return <DistillButtonInner nodeId={nodeId} />;
}

function DistillButtonInner({ nodeId }: { nodeId: Id<"nodes"> }) {
  const distill = useAction(api.chat.distillContent);
  const [isDistilling, setIsDistilling] = useState(false);

  const handleDistill = async () => {
    if (isDistilling) return;
    setIsDistilling(true);
    try {
      await distill({ nodeId });
    } catch (err) {
      handleError(err, "Failed to distill content");
    } finally {
      setIsDistilling(false);
    }
  };

  return (
    <button
      onClick={() => void handleDistill()}
      disabled={isDistilling}
      aria-label="Distill chat into node content"
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      <Sparkles className={`size-4 ${isDistilling ? "animate-pulse" : ""}`} />
    </button>
  );
}
