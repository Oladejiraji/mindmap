import type { ReactNode } from "react";
import { CanvasPanel } from "@/components/shared/canvas-panel";

export default function ThreadLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full w-full">
      {children}
      <CanvasPanel />
    </div>
  );
}
