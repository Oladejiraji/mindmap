import type { ReactNode } from "react";
import { AuthCanvas } from "@/components/auth-canvas/auth-canvas";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh grid-cols-1 md:grid-cols-2 p-1">
      <div className="flex flex-col">{children}</div>
      <div className="hidden md:block">
        <AuthCanvas />
      </div>
    </div>
  );
}
