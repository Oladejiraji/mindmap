"use client";

import { useState } from "react";
import { Plus, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThreads } from "@/services/threads/queries";
import { useCreateThread } from "@/services/threads/mutations";
import { handleError } from "@/lib/handle-error";
import { routes } from "@/lib/routes";
import { CanvasIcon } from "@/components/icons/canvas-icon";
import { ProjectCard } from "@/components/shared/project-card";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const { data: threads, isPending } = useThreads();
  const createThread = useCreateThread();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const { threadId } = await createThread({ name: "Untitled" });
      router.push(routes.thread(threadId));
    } catch (err) {
      setIsCreating(false);
      handleError(err, "Failed to create project");
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium text-foreground">Recents</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => void handleCreate()}
              isLoading={isCreating}
              size="sm"
            >
              <Plus className="size-3.5" />
              New
            </Button>
            <div className="flex h-8 items-center rounded-lg border border-foreground/8">
              <button className="flex size-8 items-center justify-center text-foreground/60">
                <LayoutGrid className="size-3.5" />
              </button>
              <button className="flex size-8 items-center justify-center text-foreground/25">
                <List className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
          {isPending
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-4/3 animate-pulse rounded-lg bg-background-5" />
                  <div className="px-0.5 pt-2.5">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-background-5" />
                    <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-background-5" />
                  </div>
                </div>
              ))
            : threads?.map((thread) => (
                <ProjectCard
                  key={thread._id}
                  name={thread.name}
                  threadId={thread._id}
                  createdAt={thread._creationTime}
                />
              ))}
        </div>

        {!isPending && threads?.length === 0 && (
          <div className="flex flex-col items-center pt-24 text-center">
            <CanvasIcon className="size-10 text-foreground/15" />
            <p className="mt-3 text-sm text-foreground/40">No projects yet</p>
            <Button
              onClick={() => void handleCreate()}
              isLoading={isCreating}
              size="sm"
              className="mt-4"
            >
              <Plus className="size-3.5" />
              Create your first project
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
