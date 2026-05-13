"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateThread } from "@/services/threads/mutations";
import { handleError } from "@/lib/handle-error";
import { routes } from "@/lib/routes";

export default function Home() {
  const router = useRouter();
  const createThread = useCreateThread();
  const [isStarting, setIsStarting] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || isStarting) return;
    setIsStarting(true);
    try {
      const { threadId } = await createThread({ name: trimmed });
      router.push(routes.thread(threadId));
    } catch (err) {
      setIsStarting(false);
      handleError(err, "Failed to create workspace");
    }
  };

  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col items-center justify-center">
      <div className="flex w-full max-w-md flex-col items-center gap-6 px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">What are you researching?</h1>
          <p className="text-sm text-muted-foreground">
            Name your workspace. You&apos;ll land on the canvas where you can
            create nodes and dive into research.
          </p>
        </div>
        <div className="flex w-full gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreate();
              }
            }}
            placeholder="e.g. Auth provider comparison"
            disabled={isStarting}
            className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            onClick={() => void handleCreate()}
            disabled={!name.trim() || isStarting}
            className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
