import { Suspense, type ReactNode } from "react";
import { CanvasPanel } from "@/components/shared/canvas-panel";
import { TabStrip } from "@/components/shared/tab-strip";

export default function ThreadLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-svh w-full flex-col bg-sidebar">
      <TabStrip skipOnNodePages />
      <div className="relative min-h-0 w-full flex-1 bg-background bg-(image:--gradient-panel)">
        {children}
        {/* CanvasPanel reads ?view=, so it needs a Suspense boundary */}
        <Suspense>
          <CanvasPanel />
        </Suspense>
      </div>
    </div>
  );
}
