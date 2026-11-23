"use client";

import { useState } from "react";
import { Check, Copy, GitBranch } from "lucide-react";
import { handleError } from "@/lib/handle-error";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/ui/tooltip";

// Icon swap (interfaces.dev): the incoming icon grows from 0.25 and
// unblurs as the outgoing one does the reverse
const iconSwap =
  "absolute transition-[opacity,scale,filter] duration-200 ease-out motion-reduce:transition-opacity";
const iconIn = "scale-100 opacity-100 blur-0";
const iconOut = "scale-[0.25] opacity-0 blur-[4px]";

const replyAction =
  "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-body-sm text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4";

/* Under each finished reply: Branch from here, then icon actions. Copy
 * confirms with a check for a moment. */
export function ReplyActions({ content, onBranch }: { content: string; onBranch: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch((err) => handleError(err, "Couldn't copy"));
  };
  return (
    <div className="mt-2 -ml-2 flex items-center gap-1">
      <button type="button" onClick={onBranch} className={replyAction}>
        <GitBranch />
        Branch from here
      </button>
      <span aria-hidden className="mx-1 h-4 w-px bg-border-default" />
      <Tip label={copied ? "Copied" : "Copy"}>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy"}
          className={cn(replyAction, "w-7 justify-center px-0")}
        >
          <span className="relative flex size-4 items-center justify-center">
            <Check className={cn(iconSwap, copied ? iconIn : iconOut)} />
            <Copy className={cn(iconSwap, copied ? iconOut : iconIn)} />
          </span>
        </button>
      </Tip>
    </div>
  );
}
