"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
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

const SURFACE_DURATION = 0.24;
const SURFACE_EASE = [0.2, 0.8, 0.2, 1] as const;

/** The page's card, which the surface grows into and shrinks from. */
const pageCard = () => document.querySelector<HTMLElement>("[data-page-card]");

/** How blurred the map is at the page's size, where it hands over to the page. */
const MAP_BLUR = "blur(12px)";

/**
 * A copy of the card's mini map inside the surface, placed over the
 * card's preview, so it can grow to the page (or shrink from it) with the
 * surface. Null if the card has no map.
 */
function mapCopy(surface: HTMLElement, card: HTMLElement) {
  const box = card.querySelector<HTMLElement>("[data-card-preview]");
  const svg = box?.querySelector("svg");
  if (!box || !svg) return null;
  const layer = document.createElement("div");
  layer.style.cssText = "position:fixed;pointer-events:none";
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.style.cssText = "width:100%;height:100%";
  layer.append(copy);
  surface.append(layer);
  return { layer, from: box.getBoundingClientRect() };
}

/** Position keyframes for a fixed element, from one box to another. */
const between = (a: DOMRect, b: DOMRect) => ({
  left: [a.left, b.left],
  top: [a.top, b.top],
  width: [a.width, b.width],
  height: [a.height, b.height],
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

/** The page's box, inset a little so the map doesn't touch its edges. */
function pageBox(page: HTMLElement) {
  const r = page.getBoundingClientRect();
  return new DOMRect(r.left + 24, r.top + 24, r.width - 48, r.height - 48);
}

/** A clip-path showing only `el`'s box (the surface covers the whole screen), with its rounded corners. */
function clipTo(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const radius = getComputedStyle(el).borderTopLeftRadius;
  return `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px round ${radius})`;
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
      { clipPath: [clipTo(card), clipTo(page)], opacity: [1, 1] },
      { duration: SURFACE_DURATION, ease: SURFACE_EASE },
    );
    // The card's map grows with it and blurs; it stays (blurred) until the
    // switcher fades, so it dissolves into the page's own content.
    const map = mapCopy(surface, card);
    if (map) {
      void animate(
        map.layer,
        { ...between(map.from, pageBox(page)), filter: ["blur(0px)", MAP_BLUR] },
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
          <div ref={contentRef} className="h-full overflow-y-auto px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
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
          {/* The page's stand-in: painted like the page's card, clipped to it or a card. */}
          <div
            ref={surfaceRef}
            aria-hidden
            className="pointer-events-none fixed inset-0 bg-background bg-(image:--gradient-panel) opacity-0"
          />
          <ShrinkIn surfaceRef={surfaceRef} headerRef={headerRef} contentRef={contentRef} />
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
}) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  // Fades as it's swiped away.
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0]);
  // A swipe ends with a click on the card; that shouldn't open it.
  const swiped = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={cardRef}
      data-active-card={active || undefined}
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
        onClick={(e) => (swiped.current ? e.preventDefault() : onOpen(cardRef.current!))}
        aria-current={active ? "page" : undefined}
        className="flex flex-col gap-1 rounded-2xl p-2 pb-2.5 outline-none transition-[scale] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div data-card-preview className="mb-1">
          {preview}
        </div>
        <div className="flex items-center gap-2 px-1">
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
        <span className="pl-7 text-caption-lg text-fg-tertiary">{meta}</span>
      </Link>
      <RenderIf condition={!!onClose}>
        <button
          onClick={onClose}
          aria-label={`Close ${title}`}
          // Over the preview's corner.
          className="absolute top-3 right-3 flex size-6 cursor-pointer items-center justify-center rounded-full bg-background/90 text-fg-secondary shadow-default outline-none active:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CloseIcon className="size-3" />
        </button>
      </RenderIf>
    </motion.div>
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
      { clipPath: [clipTo(page), clipTo(card)], opacity: [1, 1] },
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
          { ...between(pageBox(page), map.from), filter: [MAP_BLUR, "blur(0px)"], opacity: [0, 1, 1] },
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
