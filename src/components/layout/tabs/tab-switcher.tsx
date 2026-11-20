"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ContextMenu } from "@base-ui/react/context-menu";
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
import { TabMiniMap } from "./tab-mini-map";
import type { OpenTabs } from "./tab-strip";

/*
 * The phone's tab switcher: every open tab as a card in a two-column grid,
 * pinned first. Tapping a card opens that project where you left it; ×
 * or a sideways swipe closes it (pinned tabs stay, as in the strip).
 *
 * Opening and leaving it, a stand-in for the page (a surface painted like
 * the page's card) shrinks from the page into the current tab's card, and
 * grows from a tapped card into the page. Navigation starts on the tap, so
 * by the time it has grown the page is there (or blank while it loads).
 */

// Must match MAX_TITLE in convex/lib/validation.ts.
const MAX_TITLE = 120;

const SURFACE_DURATION = 0.24;
const SURFACE_EASE = [0.2, 0.8, 0.2, 1] as const;

/** The page's card, which the surface grows into and shrinks from. */
const pageCard = () => document.querySelector<HTMLElement>("[data-page-card]");

/** How blurred the map is at the page's size, where it hands over to the page. */
const MAP_BLUR = "blur(12px)";

/**
 * A copy of the card's mini map inside the surface, so it can grow to the
 * page (or shrink from it) with the surface. `inCard` is where the
 * card's preview sits within the card. Null if the card has no map.
 */
function mapCopy(surface: HTMLElement, card: HTMLElement) {
  const box = card.querySelector<HTMLElement>("[data-card-preview]");
  const svg = box?.querySelector("svg");
  if (!box || !svg) return null;
  const layer = document.createElement("div");
  layer.style.cssText = "position:absolute;pointer-events:none";
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.style.cssText = "width:100%;height:100%";
  layer.append(copy);
  surface.append(layer);
  const b = box.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  return { layer, inCard: new DOMRect(b.left - c.left, b.top - c.top, b.width, b.height) };
}

/** Where the map sits within the page: inset a little so it doesn't touch the edges. */
function inPage(page: HTMLElement) {
  const r = page.getBoundingClientRect();
  return new DOMRect(24, 24, r.width - 48, r.height - 48);
}

/** Position keyframes, from one box to another. */
const between = (a: DOMRect, b: DOMRect) => ({
  left: [a.left, b.left],
  top: [a.top, b.top],
  width: [a.width, b.width],
  height: [a.height, b.height],
});

/**
 * Keyframes moving the surface from one element's box to another's, with
 * their corner radius. It's a real box rather than a clip-path, so its
 * corners get the same smoothing (corner-shape) as the page's and cards'.
 */
const surfaceBetween = (from: HTMLElement, to: HTMLElement) => ({
  ...between(from.getBoundingClientRect(), to.getBoundingClientRect()),
  borderRadius: [getComputedStyle(from).borderTopLeftRadius, getComputedStyle(to).borderTopLeftRadius],
});

/** How long to wait for the project to draw before revealing the page anyway. */
const DRAW_TIMEOUT = 500;

/** Resolves once the project's page has drawn (or after DRAW_TIMEOUT). Right away without a project. */
function whenDrawn(threadId: string | undefined) {
  return new Promise<void>((resolve) => {
    if (!threadId) return resolve();
    const until = performance.now() + DRAW_TIMEOUT;
    const check = () => {
      const drawn = document.querySelector(`[data-page-card] [data-ready-thread="${CSS.escape(threadId)}"]`);
      if (drawn || performance.now() > until) resolve();
      else requestAnimationFrame(check);
    };
    check();
  });
}

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
  onNavigate,
  onRename,
  onTogglePin,
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
  /** A card was tapped: the page (path) it's going to. */
  onNavigate: (path: string) => void;
  onRename: (tab: OpenTabs[number], name: string) => void;
  onTogglePin: (tab: OpenTabs[number]) => void;
}) {
  const count = tabs.length + (onNewProject ? 1 : 0);
  const close = () => onOpenChange(false);
  const reduceMotion = useReducedMotion();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  /**
   * Grows the surface from a tapped card into the page, then closes once
   * the project (`threadId`) has drawn, so the switcher fades straight onto
   * it. The tap's link navigates meanwhile.
   */
  const growFrom = (card: HTMLElement, threadId?: string) => {
    const page = pageCard();
    const surface = surfaceRef.current;
    if (reduceMotion || !page || !surface) return close();
    // The header goes first, showing the page's own bar; the grid's
    // background stays, so nothing else shows through until the page is there.
    void animate(headerRef.current!, { opacity: 0 }, { duration: 0.1 });
    void animate(contentRef.current!, { opacity: 0 }, { duration: 0.15 });
    // Opacity goes through Motion too: it remembers values it set and
    // writes them back when an animation ends, so an inline write is lost.
    const grow = animate(
      surface,
      { ...surfaceBetween(card, page), opacity: [1, 1] },
      { duration: SURFACE_DURATION, ease: SURFACE_EASE },
    );
    // The card's map grows with it and blurs; it stays (blurred) until the
    // switcher fades, so it dissolves into the page's own content.
    const map = mapCopy(surface, card);
    if (map) {
      void animate(
        map.layer,
        { ...between(map.inCard, inPage(page)), filter: ["blur(0px)", MAP_BLUR] },
        { duration: SURFACE_DURATION, ease: SURFACE_EASE },
      );
    }
    void grow.then(() => whenDrawn(threadId)).then(close);
  };

  return (
    // Focus stays inside, but taps outside the grid (the Undo toast) work
    // and don't close it.
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal="trap-focus" disablePointerDismissal>
      <Dialog.Portal>
        <Dialog.Popup // Fades out on close. Fades in only with reduced motion; otherwise
          // the surface shrinking from the page is the way in.
          className="fixed inset-0 z-50 flex flex-col outline-none transition-opacity duration-150 data-ending-style:opacity-0 motion-reduce:data-starting-style:opacity-0"
        >
          {/* The header and the grid have their own backgrounds, so the header can fade on its own. */}
          <div
            ref={headerRef}
            className="flex h-[calc(48px+env(safe-area-inset-top))] shrink-0 items-center justify-between bg-sidebar pt-[env(safe-area-inset-top)] pr-1 pl-4"
          >
            <Dialog.Title className="text-body-sm font-medium text-fg-primary">
              {count} {count === 1 ? "tab" : "tabs"}
            </Dialog.Title>
            <Dialog.Close className="h-9 cursor-pointer rounded-xl px-3 text-body-sm font-medium text-fg-primary outline-none active:bg-transparent-hover focus-visible:ring-3 focus-visible:ring-ring/50">
              Done
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 bg-sidebar">
          <div ref={contentRef} className="h-full scroll-py-1 overflow-y-auto px-3 pt-1 pb-[max(12px,env(safe-area-inset-bottom))]">
            <ul className="grid grid-cols-2 gap-3">
              {tabs.map((tab) => (
                <li key={tab.thread._id}>
                  <TabCard
                    href={tabHref(tab)}
                    preview={<TabMiniMap threadId={tab.thread._id} />}
                    title={tab.thread.name || "Untitled"}
                    meta={formatRelativeTime(tab.thread.updatedAt ?? tab.thread._creationTime)}
                    active={tab.thread._id === activeId}
                    pinned={tab.pinned}
                    replying={(tab.thread.replying ?? 0) > 0}
                    unread={unread.has(tab.thread._id)}
                    onOpen={(card) => {
                      onNavigate(routes.thread(tab.thread._id));
                      growFrom(card, tab.thread._id);
                    }}
                    onClose={tab.pinned ? undefined : () => onClose(tab)}
                    onRename={(name) => onRename(tab, name)}
                    onTogglePin={() => onTogglePin(tab)}
                  />
                </li>
              ))}
              <RenderIf condition={onNewProject}>
                <li>
                  <TabCard
                    href={routes.newProject}
                    preview={<div className="aspect-4/3 rounded-xl bg-background-2" />}
                    title="New project"
                    meta="Not started"
                    active
                    newProject
                    onOpen={growFrom}
                  />
                </li>
              </RenderIf>
              {/* On the New project page its card is there already. */}
              <RenderIf condition={!onNewProject}>
                <li>
                  <Link
                    href={newProjectHref}
                    onClick={(e) => {
                      onNavigate(routes.newProject);
                      growFrom(e.currentTarget);
                    }}
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
          </div>
          {/* The page's stand-in: painted like the page's card, sized to it or a card. */}
          <div
            ref={surfaceRef}
            aria-hidden
            className="pointer-events-none fixed top-0 left-0 overflow-hidden bg-background bg-(image:--gradient-panel) opacity-0"
          />
          <ShrinkIn surfaceRef={surfaceRef} headerRef={headerRef} contentRef={contentRef} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A row in a card's menu, as in Home's project card menu. */
const menuItem =
  "corner-squircle flex w-full cursor-pointer items-center gap-2 rounded-[14px] px-2 py-1.5 text-caption-lg text-fg-secondary transition-colors data-[highlighted]:bg-foreground/6 data-[highlighted]:text-fg-primary outline-none";

/** How far (px) or fast (px/s) a swipe has to go to close the card. */
const SWIPE_DISTANCE = 80;
const SWIPE_SPEED = 500;

function TabCard({
  href,
  preview,
  title,
  meta,
  active,
  pinned,
  replying,
  unread,
  newProject,
  onOpen,
  onClose,
  onRename,
  onTogglePin,
}: {
  href: string;
  /** What the project looks like, above its title. */
  preview: ReactNode;
  title: string;
  /** When it was last active. */
  meta: string;
  active: boolean;
  pinned?: boolean;
  replying?: boolean;
  unread?: boolean;
  newProject?: boolean;
  /** Called with the card, which the page grows from. */
  onOpen: (card: HTMLElement) => void;
  /** Without it, the card can't be closed. */
  onClose?: () => void;
  /** Without it, the card can't be renamed. */
  onRename?: (name: string) => void;
  /** Without it, the card can't be pinned. */
  onTogglePin?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  // Fades as it's swiped away.
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0]);
  // A swipe, or the press that opened the menu, ends with a click on the
  // card; that shouldn't open it.
  const swiped = useRef(false);
  const menuOpened = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [renaming, setRenaming] = useState(false);
  // Cancelling with Esc mustn't also save on the blur that follows.
  const cancelled = useRef(false);
  const hasMenu = !!(onRename || onTogglePin || onClose);

  const body = (
    <>
      <div data-card-preview className="mb-1">
        {preview}
      </div>
      <div className="flex items-center gap-2 px-1">
        <TabStatusIcon
          icon={newProject ? NewTabIcon : NodeTabIcon}
          replying={replying}
          unread={unread}
          className="text-fg-tertiary"
        />
        <RenderIf condition={renaming}>
          <input
            autoFocus
            defaultValue={title}
            maxLength={MAX_TITLE}
            aria-label="Project name"
            onFocus={(e) => {
              cancelled.current = false;
              e.currentTarget.select();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                // Not the switcher's Esc: just this field's.
                e.stopPropagation();
                cancelled.current = true;
                setRenaming(false);
              }
            }}
            onBlur={(e) => {
              setRenaming(false);
              const name = e.currentTarget.value.trim();
              if (!cancelled.current && name && name !== title) onRename?.(name);
            }}
            className="-mx-1 h-6 min-w-0 flex-1 rounded-md bg-component px-1 text-body-sm font-medium text-fg-primary outline-none"
          />
        </RenderIf>
        <RenderIf condition={!renaming}>
          <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-fg-primary">{title}</span>
        </RenderIf>
        <RenderIf condition={!!pinned}>
          <Pin aria-label="Pinned" className="size-3 shrink-0 text-fg-tertiary" />
        </RenderIf>
      </div>
      <span className="pl-7 text-caption-lg text-fg-tertiary">{meta}</span>
    </>
  );
  const bodyClass = "flex flex-col gap-1 rounded-2xl p-2 pb-2.5 outline-none";

  return (
    // Press and hold (or right-click) for Rename, Pin and Close.
    <ContextMenu.Root disabled={!hasMenu || renaming} onOpenChange={(open) => open && (menuOpened.current = true)}>
      <ContextMenu.Trigger>
        <motion.div
          ref={cardRef}
          data-active-card={active || undefined}
          drag={onClose && !renaming ? "x" : false}
          dragDirectionLock
          dragMomentum={false}
          onPointerDown={() => {
            swiped.current = false;
            menuOpened.current = false;
          }}
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
          <RenderIf condition={renaming}>
            <div className={bodyClass}>{body}</div>
          </RenderIf>
          <RenderIf condition={!renaming}>
            <Link
              href={href}
              draggable={false}
              onClick={(e) =>
                swiped.current || menuOpened.current ? e.preventDefault() : onOpen(cardRef.current!)
              }
              aria-current={active ? "page" : undefined}
              // No text selection or iOS link preview on press and hold: that opens the menu.
              className={cn(
                bodyClass,
                "transition-[scale] select-none [-webkit-touch-callout:none] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/50",
              )}
            >
              {body}
            </Link>
          </RenderIf>
          <RenderIf condition={!!onClose}>
            <button
              onClick={onClose}
              aria-label={`Close ${title}`}
              // Over the preview's corner.
              className="absolute top-3 right-3 flex size-6 cursor-pointer items-center justify-center rounded-full bg-background/90 text-fg-secondary outline-none active:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <CloseIcon className="size-3" />
            </button>
          </RenderIf>
        </motion.div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        {/* Styled like Home's project card menu. Above the switcher (z-50). */}
        <ContextMenu.Positioner sideOffset={4} className="z-60">
          {/* Focus stays put on close, so Rename's field keeps it. */}
          <ContextMenu.Popup
            finalFocus={false}
            className="corner-squircle min-w-40 rounded-4xl border border-foreground/8 bg-background p-1.5 shadow-large outline-none"
          >
            <RenderIf condition={!!onRename}>
              <ContextMenu.Item className={menuItem} onClick={() => setRenaming(true)}>
                Rename
              </ContextMenu.Item>
            </RenderIf>
            <RenderIf condition={!!onTogglePin}>
              <ContextMenu.Item className={menuItem} onClick={onTogglePin}>
                {pinned ? "Unpin" : "Pin"}
              </ContextMenu.Item>
            </RenderIf>
            <RenderIf condition={!!onClose}>
              <ContextMenu.Separator className="my-1 h-px bg-foreground/8" />
              <ContextMenu.Item className={menuItem} onClick={onClose}>
                Close
              </ContextMenu.Item>
            </RenderIf>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

/**
 * On opening, shrinks the surface from the page into the current tab's
 * card while the grid fades in. Runs once the switcher's DOM is there, as
 * it's measured.
 */
function ShrinkIn({
  surfaceRef,
  headerRef,
  contentRef,
}: {
  surfaceRef: RefObject<HTMLDivElement | null>;
  headerRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
}) {
  const reduceMotion = useReducedMotion();
  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const content = contentRef.current;
    const card = content?.querySelector<HTMLElement>("[data-active-card]");
    const page = pageCard();
    if (reduceMotion || !surface || !content || !card || !page) return;
    card.scrollIntoView({ block: "nearest" });
    // Opacity through Motion only (see growFrom).
    const shrink = animate(
      surface,
      { ...surfaceBetween(page, card), opacity: [1, 1] },
      { duration: SURFACE_DURATION, ease: SURFACE_EASE },
    );
    const fadeIn = animate(content, { opacity: [0, 0, 1] }, { duration: 0.26, times: [0, 0.25, 1] });
    // The page's bar shows until the header fades in over it.
    const headerIn = animate(headerRef.current!, { opacity: [0, 1] }, { duration: 0.15 });
    // Then hand over to the card itself.
    // The card's map comes into focus as it shrinks into the card.
    const map = mapCopy(surface, card);
    const mapIn = map
      ? animate(
          map.layer,
          { ...between(inPage(page), map.inCard), filter: [MAP_BLUR, "blur(0px)"], opacity: [0, 1, 1] },
          { duration: SURFACE_DURATION, ease: SURFACE_EASE },
        )
      : null;
    void shrink.then(() => animate(surface, { opacity: 0 }, { duration: 0.12 })).then(() => map?.layer.remove());
    return () => {
      shrink.stop();
      mapIn?.stop();
      map?.layer.remove();
      fadeIn.stop();
      headerIn.stop();
    };
  }, [surfaceRef, headerRef, contentRef, reduceMotion]);
  return null;
}
