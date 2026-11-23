"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { RenderIf } from "@/components/shared/render-if";

/*
 * How every chat scrolls. One rule: keep the message being answered in
 * view, until the reply needs the room or you take over.
 *
 * The space is CSS, not measured. The scroll area is a size container,
 * and the current turn (your latest message and what follows it) is at
 * least as tall as the area (NodeConversation's `live` box, sized with
 * cqh). Scrolled to the bottom, your message therefore sits at the top
 * with the reply growing under it; once the reply is taller than the
 * area, the box grows past it. The box keeps its height after the reply,
 * so nothing jumps when it ends.
 *
 * The JS is one flag, "stuck" to the bottom:
 *   - while stuck, growth keeps the bottom in view. A short reply doesn't
 *     grow the box, so nothing moves (your message stays pinned); a long
 *     one does, so the view follows the newest text.
 *   - scrolling up (wheel, touch, keys, dragging the scrollbar) unsticks
 *     it: you've taken over. New content arriving below then shows as a
 *     dot on the jump button instead of moving the view.
 *   - reaching the bottom yourself, the jump button, sending a message or
 *     switching conversation sticks it again.
 */

/** How close to the bottom (px) counts as at the bottom. */
const AT_BOTTOM = 4;
/** How far from the bottom (px) before the jump button shows. */
const SHOW_JUMP = 160;
const UP_KEYS = new Set(["ArrowUp", "PageUp", "Home"]);
/** The longest a glide is waited for (ms), if the browser never says it ended. */
const GLIDE_MAX = 800;
/**
 * How far (px) you have to wheel up, in one go, to take over. Small
 * upward deltas also come from the trackpad's bounce at the bottom.
 */
const WHEEL_TAKE_OVER = 24;
/** A pause (ms) longer than this starts a new "one go" of wheeling. */
const WHEEL_GAP = 250;
/** The scrollbar's hit area at the right edge (px), for overlay scrollbars too. */
const SCROLLBAR_WIDTH = 16;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function ChatScroller({
  conversationKey,
  turnKey,
  footer,
  children,
}: {
  /** The conversation shown (a node). Changing it jumps straight to its end. */
  conversationKey: string;
  /** Your latest message, once loaded (undefined until then). A new one scrolls it to the top. */
  turnKey: string | undefined;
  /** Under the conversation: usually the composer. */
  footer: ReactNode;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  // The conversation that had content arrive below while you'd taken over.
  // Kept per conversation, so switching clears it.
  const [newBelowIn, setNewBelowIn] = useState<string | null>(null);
  const newBelow = newBelowIn === conversationKey;
  const conversation = useRef(conversationKey);

  // Stable (they only touch refs), so effects can depend on them.
  const toBottom = useCallback((behavior: ScrollBehavior) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // A smooth scroll to the end is under way: growth leaves it alone
  // (jumping would cut it short) and catches up once it ends.
  const gliding = useRef(false);
  const glideToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prefersReducedMotion()) return toBottom("instant");
    gliding.current = true;
    let timer = 0;
    const done = () => {
      if (!gliding.current) return;
      gliding.current = false;
      el.removeEventListener("scrollend", done);
      window.clearTimeout(timer);
      if (stuck.current) toBottom("instant");
    };
    // scrollend isn't fired everywhere (or when there was nowhere to go).
    el.addEventListener("scrollend", done);
    timer = window.setTimeout(done, GLIDE_MAX);
    toBottom("smooth");
  }, [toBottom]);

  // Your latest message last time: a different one means you sent one.
  const lastTurn = useRef<string | undefined>(undefined);

  // Another conversation: start at its end. Before paint, so it never
  // shows from the top first. Its latest message isn't a new one.
  useLayoutEffect(() => {
    stuck.current = true;
    lastTurn.current = undefined;
    conversation.current = conversationKey;
    toBottom("instant");
  }, [conversationKey, toBottom]);

  // You sent a message: glide it to the top (the end of the scroll, since
  // the current turn fills the area). Not on first load: that's the
  // conversation's end already. A layout effect, so the glide starts
  // before the size observer sees the new message and jumps there.
  useLayoutEffect(() => {
    const previous = lastTurn.current;
    lastTurn.current = turnKey;
    if (previous === undefined || turnKey === undefined || previous === turnKey) return;
    stuck.current = true;
    glideToBottom();
  }, [turnKey, glideToBottom]);

  // While stuck, the bottom stays in view as the content grows, and as the
  // scroll area itself shrinks (the composer growing, a resize). Once
  // you've taken over, growth only marks the jump button. Observing sizes
  // is an external system.
  useEffect(() => {
    const scroller = scrollRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;
    let contentHeight = content.offsetHeight;
    const observer = new ResizeObserver(() => {
      const grew = content.offsetHeight > contentHeight;
      contentHeight = content.offsetHeight;
      if (stuck.current) {
        if (!gliding.current) toBottom("instant");
      } else if (grew) {
        setNewBelowIn(conversation.current);
      }
    });
    observer.observe(content);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [toBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (fromBottom <= AT_BOTTOM) {
      stuck.current = true;
      setNewBelowIn(null);
    }
    setAwayFromBottom(fromBottom > SHOW_JUMP);
  };

  // Only you scrolling up counts as taking over; our own scrolling fires
  // scroll events too, so those can't tell.
  const touchY = useRef(0);
  const takeOver = () => (stuck.current = false);
  // Wheeling up: only a real scroll counts, not the trackpad's bounce.
  const wheelUp = useRef({ total: 0, at: 0 });
  const onWheel = (e: React.WheelEvent) => {
    const now = performance.now();
    const wheel = wheelUp.current;
    if (e.deltaY >= 0 || now - wheel.at > WHEEL_GAP) wheel.total = 0;
    wheel.at = now;
    if (e.deltaY >= 0) return;
    // Lines or pages, not pixels, on some mice.
    const px = e.deltaMode === 0 ? -e.deltaY : -e.deltaY * 16;
    wheel.total += px;
    if (wheel.total >= WHEEL_TAKE_OVER) takeOver();
  };
  // Pressing the scrollbar: a press on the scroll area itself (not its
  // content), at the right edge.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (e.target === el && e.clientX >= el.getBoundingClientRect().right - SCROLLBAR_WIDTH) takeOver();
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
        // A finger moving down scrolls the content up.
        onTouchMove={(e) => e.touches[0].clientY > touchY.current && takeOver()}
        onKeyDown={(e) => UP_KEYS.has(e.key) && takeOver()}
        className={cn(
          // No scroll anchoring: we do all the scrolling. Otherwise, at the
          // bottom, the browser keeps the current-turn box in place as a send
          // pushes it down, jumping your message to the top before the glide.
          "[overflow-anchor:none]",
          // A size container: the current turn's height is set from it (cqh).
          "min-h-0 flex-1 overflow-y-auto overscroll-contain @container-[size]",
          // Messages fade out at the edges instead of meeting a hard line.
          "mask-[linear-gradient(to_bottom,transparent,black_24px,black_calc(100%-32px),transparent)]",
        )}
      >
        <div ref={contentRef} className="flex min-h-full flex-col">
          {children}
        </div>
      </div>
      <div className="relative shrink-0">
        {/* Jump to the end, shown once you've scrolled up */}
        <button
          type="button"
          onClick={() => {
            stuck.current = true;
            setNewBelowIn(null);
            glideToBottom();
          }}
          aria-label={newBelow ? "Scroll to latest, new content below" : "Scroll to latest"}
          tabIndex={awayFromBottom ? 0 : -1}
          className={cn(
            "absolute -top-12 left-1/2 z-10 flex size-9 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-surface-container text-fg-primary shadow-large outline-none transition-[opacity,transform] duration-200 ease-out focus-visible:ring-3 focus-visible:ring-ring/50",
            awayFromBottom ? "opacity-100" : "pointer-events-none translate-y-1 opacity-0",
          )}
        >
          <ArrowDown className="size-4.5" />
          {/* More arrived below while you were reading up the page. */}
          <RenderIf condition={newBelow}>
            <span
              aria-hidden
              className="absolute top-0 right-0 size-2.5 rounded-full bg-brand-solid ring-2 ring-surface-container motion-safe:animate-in motion-safe:zoom-in-50"
            />
          </RenderIf>
        </button>
        {footer}
      </div>
    </div>
  );
}
