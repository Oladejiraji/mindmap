"use client";

import { Plus } from "lucide-react";
import { ListIcon } from "@/components/icons/list-icon";
import { GridIcon } from "@/components/icons/grid-icon";
import { MotionConfig, motion } from "motion/react";
import { api } from "@convex/api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useHomeLayout } from "@/lib/preferences";
import { routes } from "@/lib/routes";
import { CanvasIcon } from "@/components/icons/canvas-icon";
import { ProjectCard } from "@/components/project/project-card";
import { ProjectRow } from "@/components/project/project-row";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";

export default function Home() {
  const { data: threads, isPending } = useAuthedConvexQuery(
    api.threads.list,
    {},
  );
  // Where you last were in each project; cards link back there.
  const { data: views } = useAuthedConvexQuery(api.projectViews.mine, {});
  // Shared with the account menu's Preferences and the Settings page.
  const [layout, updateLayout] = useHomeLayout();

  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-202 flex-1 px-6 pt-14 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="text-heading-6 font-medium text-fg-primary">
            Recents
          </h1>
          <div className="flex items-center gap-2">
            <Link href={routes.newProject} className={buttonVariants({ size: "sm" })}>
              <Plus className="size-3.5" />
              New
            </Link>
            <MotionConfig reducedMotion="user">
              <div className="relative flex h-8 items-center rounded-xl border border-foreground/8">
                <button
                  onClick={() => updateLayout("grid")}
                  className={cn(
                    "relative z-10 flex w-8 h-full items-center justify-center transition-colors",
                    layout === "grid"
                      ? "text-fg-secondary"
                      : "text-fg-disabled hover:text-fg-tertiary",
                  )}
                >
                  <GridIcon className="size-3.5" />
                  {layout === "grid" && (
                    <motion.div
                      layoutId="layout-toggle"
                      className="absolute inset-0.5 rounded-lg bg-foreground/6"
                      transition={{
                        type: "spring",
                        duration: 0.3,
                        bounce: 0.15,
                      }}
                    />
                  )}
                </button>
                <button
                  onClick={() => updateLayout("list")}
                  className={cn(
                    "relative z-10 flex w-8 h-full items-center justify-center transition-colors",
                    layout === "list"
                      ? "text-fg-secondary"
                      : "text-fg-disabled hover:text-fg-tertiary",
                  )}
                >
                  <ListIcon className="size-3.5" />
                  {layout === "list" && (
                    <motion.div
                      layoutId="layout-toggle"
                      className="absolute inset-0.5 rounded-lg bg-foreground/6"
                      transition={{
                        type: "spring",
                        duration: 0.3,
                        bounce: 0.15,
                      }}
                    />
                  )}
                </button>
              </div>
            </MotionConfig>
          </div>
        </div>
        <div className="mt-8 h-px bg-border-default" />

        {layout === "grid" ? (
          <div className="mt-11 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
            {isPending
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i}>
                    <div className="aspect-4/3 animate-pulse rounded-xl bg-background-5" />
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
                    search={views?.[thread._id]}
                    createdAt={thread._creationTime}
                  />
                ))}
          </div>
        ) : (
          // -mx-2 cancels the rows' hover padding so names start on the title
          // edge and the date columns end on the divider's right edge.
          <div className="mt-11 -mx-2 flex flex-col">
            <div className="grid grid-cols-[1fr_8rem_8rem] gap-3 px-2 pb-2 text-caption-lg text-fg-tertiary">
              <span>Name</span>
              <span className="text-right">Created</span>
              <span className="text-right">Edited</span>
            </div>
            {isPending
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_8rem_8rem] items-center gap-3 px-2 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 animate-pulse rounded-lg bg-background-5" />
                      <div className="h-4 w-1/3 animate-pulse rounded bg-background-5" />
                    </div>
                    <div className="ml-auto h-3 w-16 animate-pulse rounded bg-background-5" />
                    <div className="ml-auto h-3 w-16 animate-pulse rounded bg-background-5" />
                  </div>
                ))
              : threads?.map((thread) => (
                  <ProjectRow
                    key={thread._id}
                    name={thread.name}
                    threadId={thread._id}
                    search={views?.[thread._id]}
                    createdAt={thread._creationTime}
                    updatedAt={thread.updatedAt}
                  />
                ))}
          </div>
        )}

        {!isPending && threads?.length === 0 && (
          <div className="flex flex-col items-center pt-24 text-center">
            <CanvasIcon className="size-10 text-fg-disabled" />
            <p className="mt-3 text-body-base text-fg-tertiary">
              No projects yet
            </p>
            <Link href={routes.newProject} className={buttonVariants({ size: "sm", className: "mt-4" })}>
              <Plus className="size-3.5" />
              Create your first project
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
