"use client";

import { Minus, Plus } from "lucide-react";
import { Panel, useReactFlow, useStore } from "@xyflow/react";
import { cn } from "@/lib/utils";

/*
 * Canvas zoom control: a grey well holding a raised white card with + over −
 * split by a hairline. Replaces React Flow's default <Controls>. Buttons
 * disable at the zoom limits and zoom with a short eased animation.
 */
export function ZoomControls({ className }: { className?: string }) {
  const { zoomIn, zoomOut } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  const minZoom = useStore((s) => s.minZoom);
  const maxZoom = useStore((s) => s.maxZoom);

  const button =
    "flex h-8 w-9 cursor-pointer items-center justify-center text-fg-primary outline-none transition-colors hover:bg-transparent-hover focus-visible:bg-transparent-hover active:bg-transparent-active disabled:cursor-default disabled:text-fg-disabled disabled:hover:bg-transparent";

  return (
    <Panel position="bottom-left" className={cn("m-3!", className)}>
      <div className="rounded-2xl bg-component p-1">
        <div role="group" aria-label="Zoom" className="flex flex-col overflow-hidden rounded-xl bg-surface-container shadow-default">
          <button
            type="button"
            aria-label="Zoom in"
            title="Zoom in"
            disabled={zoom >= maxZoom}
            onClick={() => zoomIn({ duration: 200 })}
            className={button}
          >
            <Plus className="size-4" strokeWidth={2} />
          </button>
          <div aria-hidden className="mx-1.5 h-px bg-border-default" />
          <button
            type="button"
            aria-label="Zoom out"
            title="Zoom out"
            disabled={zoom <= minZoom}
            onClick={() => zoomOut({ duration: 200 })}
            className={button}
          >
            <Minus className="size-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </Panel>
  );
}
