"use client";

import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { Pin } from "lucide-react";
import { NodeTabIcon } from "@/components/icons/node-tab-icon";
import { NewTabIcon } from "@/components/icons/new-tab-icon";
import { RenderIf } from "@/components/shared/render-if";
import { formatRelativeTime } from "@/lib/format-time";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { TabStatusIcon } from "./tab";
import { tabHref } from "./tab-href";
import type { OpenTabs } from "./tab-strip";

/*
 * The phone's tab switcher: every open tab as a card in a two-column grid,
 * pinned first. Tapping a card opens that project where you left it.
 */
export function TabSwitcher({
  open,
  onOpenChange,
  tabs,
  activeId,
  onNewProject,
  unread,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: OpenTabs;
  /** The project on screen, if any. */
  activeId?: string;
  /** On the New project page, which shows as a tab too. */
  onNewProject: boolean;
  unread: ReadonlySet<string>;
}) {
  const count = tabs.length + (onNewProject ? 1 : 0);
  const close = () => onOpenChange(false);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col bg-sidebar pt-[env(safe-area-inset-top)] outline-none transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0">
          <div className="flex h-12 shrink-0 items-center justify-between pr-1 pl-4">
            <Dialog.Title className="text-body-sm font-medium text-fg-primary">
              {count} {count === 1 ? "tab" : "tabs"}
            </Dialog.Title>
            <Dialog.Close className="h-9 cursor-pointer rounded-xl px-3 text-body-sm font-medium text-fg-primary outline-none active:bg-transparent-hover focus-visible:ring-3 focus-visible:ring-ring/50">
              Done
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <ul className="grid grid-cols-2 gap-3">
              {tabs.map((tab) => (
                <li key={tab.thread._id}>
                  <TabCard
                    href={tabHref(tab)}
                    title={tab.thread.name || "Untitled"}
                    meta={formatRelativeTime(tab.thread.updatedAt ?? tab.thread._creationTime)}
                    active={tab.thread._id === activeId}
                    pinned={tab.pinned}
                    replying={(tab.thread.replying ?? 0) > 0}
                    unread={unread.has(tab.thread._id)}
                    onOpen={close}
                  />
                </li>
              ))}
              <RenderIf condition={onNewProject}>
                <li>
                  <TabCard href={routes.newProject} title="New project" meta="Not started" active newProject onOpen={close} />
                </li>
              </RenderIf>
            </ul>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TabCard({
  href,
  title,
  meta,
  active,
  pinned,
  replying,
  unread,
  newProject,
  onOpen,
}: {
  href: string;
  title: string;
  /** When it was last active. */
  meta: string;
  active: boolean;
  pinned?: boolean;
  replying?: boolean;
  unread?: boolean;
  newProject?: boolean;
  onOpen: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onOpen}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col gap-1 rounded-2xl bg-background p-3 shadow-default outline-none transition-[scale] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/50",
        // The tab you're on.
        active && "ring-2 ring-brand-solid",
      )}
    >
      <div className="flex items-center gap-2">
        <TabStatusIcon
          icon={newProject ? NewTabIcon : NodeTabIcon}
          replying={replying}
          unread={unread}
          ringClassName="ring-background"
          className="text-fg-tertiary"
        />
        <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-fg-primary">{title}</span>
        <RenderIf condition={!!pinned}>
          <Pin aria-label="Pinned" className="size-3 shrink-0 text-fg-tertiary" />
        </RenderIf>
      </div>
      <span className="pl-6 text-caption-lg text-fg-tertiary">{meta}</span>
    </Link>
  );
}
