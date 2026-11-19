"use client";

import Link from "next/link";
import { useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Pin, Plus } from "lucide-react";
import { CloseIcon } from "@/components/icons/close-icon";
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
 * pinned first. Tapping a card opens that project where you left it; ×
 * or a sideways swipe closes it (pinned tabs stay, as in the strip).
 */
export function TabSwitcher({
  open,
  onOpenChange,
  tabs,
  activeId,
  onNewProject,
  unread,
  onClose,
  closed,
  onReopen,
  newProjectHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: OpenTabs;
  /** The project on screen, if any. */
  activeId?: string;
  /** On the New project page, which shows as a tab too. */
  onNewProject: boolean;
  unread: ReadonlySet<string>;
  onClose: (tab: OpenTabs[number]) => void;
  /** Tabs closed this session and not open again, newest first. */
  closed: readonly OpenTabs[number][];
  onReopen: (tab: OpenTabs[number]) => void;
  newProjectHref: string;
}) {
  const count = tabs.length + (onNewProject ? 1 : 0);
  const close = () => onOpenChange(false);

  return (
    // Focus stays inside, but taps outside the grid (the Undo toast) work
    // and don't close it.
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal="trap-focus" disablePointerDismissal>
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
                    onClose={tab.pinned ? undefined : () => onClose(tab)}
                  />
                </li>
              ))}
              <RenderIf condition={onNewProject}>
                <li>
                  <TabCard href={routes.newProject} title="New project" meta="Not started" active newProject onOpen={close} />
                </li>
              </RenderIf>
              {/* On the New project page its card is there already. */}
              <RenderIf condition={!onNewProject}>
                <li>
                  <Link
                    href={newProjectHref}
                    onClick={close}
                    className="flex h-full min-h-16 items-center justify-center gap-1.5 rounded-2xl bg-component p-3 text-body-sm font-medium text-fg-secondary outline-none transition-[scale] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Plus className="size-4" />
                    New project
                  </Link>
                </li>
              </RenderIf>
            </ul>
            <RenderIf condition={closed.length > 0}>
              <section aria-labelledby="recently-closed" className="mt-6">
                <h2 id="recently-closed" className="px-1 pb-1 text-caption-lg text-fg-tertiary">
                  Recently closed
                </h2>
                <ul>
                  {closed.map((tab) => (
                    <li key={tab.thread._id}>
                      <button
                        onClick={() => {
                          close();
                          onReopen(tab);
                        }}
                        className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-xl px-1 text-left text-body-sm text-fg-secondary outline-none active:bg-transparent-hover focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <NodeTabIcon className="size-4 shrink-0 text-fg-tertiary" />
                        <span className="min-w-0 flex-1 truncate">{tab.thread.name || "Untitled"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </RenderIf>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** How far (px) or fast (px/s) a swipe has to go to close the card. */
const SWIPE_DISTANCE = 80;
const SWIPE_SPEED = 500;

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
  onClose,
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
  /** Without it, the card can't be closed. */
  onClose?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  // Fades as it's swiped away.
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0]);
  // A swipe ends with a click on the card; that shouldn't open it.
  const swiped = useRef(false);

  return (
    <motion.div
      drag={onClose ? "x" : false}
      dragDirectionLock
      dragMomentum={false}
      onPointerDown={() => (swiped.current = false)}
      onDragStart={() => (swiped.current = true)}
      onDragEnd={(_, { offset, velocity }) => {
        const far = Math.abs(offset.x) > SWIPE_DISTANCE || Math.abs(velocity.x) > SWIPE_SPEED;
        if (!far || !onClose) {
          animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
          return;
        }
        const away = Math.sign(offset.x || velocity.x) * 400;
        animate(x, away, { duration: reduceMotion ? 0 : 0.15, ease: "easeOut" }).then(onClose);
      }}
      style={{ x, opacity }}
      className={cn(
        "relative touch-pan-y rounded-2xl bg-background shadow-default",
        // The tab you're on.
        active && "ring-2 ring-brand-solid",
      )}
    >
      <Link
        href={href}
        draggable={false}
        onClick={(e) => (swiped.current ? e.preventDefault() : onOpen())}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col gap-1 rounded-2xl p-3 outline-none transition-[scale] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/50",
          onClose && "pr-10",
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
      <RenderIf condition={!!onClose}>
        <button
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-lg text-fg-tertiary outline-none active:bg-transparent-hover focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CloseIcon className="size-3" />
        </button>
      </RenderIf>
    </motion.div>
  );
}
