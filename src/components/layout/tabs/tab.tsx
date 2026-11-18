"use client";

import Link from "next/link";
import { useRef } from "react";
import { PreviewCard } from "@base-ui/react/preview-card";
import { ContextMenu } from "@base-ui/react/context-menu";
import { Pencil, Pin, PinOff } from "lucide-react";
import type { Doc } from "@convex/dataModel";
import { CloseIcon } from "@/components/icons/close-icon";
import { NewTabIcon } from "@/components/icons/new-tab-icon";
import { NodeTabIcon } from "@/components/icons/node-tab-icon";
import { RenderIf } from "@/components/shared/render-if";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { TabPreview } from "./tab-preview";

// Must match MAX_TITLE in convex/lib/validation.ts.
const MAX_TITLE = 120;

export type TabData = { href: string; title: string; thread?: Doc<"threads"> };

/** The box every tab sits in: grows to 168px, shrinks to 112px. */
export const tabBox = "group/tab relative flex h-9 max-w-42 min-w-28 flex-1 basis-42 items-center";
/** A pinned tab's box: just the icon. */
export const pinnedTabBox = "w-10 min-w-10 max-w-10 flex-none basis-auto";

const menuItem =
  "corner-squircle flex w-full cursor-pointer items-center gap-2 rounded-[14px] px-2 py-1.5 text-caption-lg text-fg-secondary outline-none transition-colors data-highlighted:bg-foreground/6 data-highlighted:text-fg-primary [&_svg]:size-3.5";

const content = "relative flex h-full min-w-0 flex-1 items-center gap-2 rounded-t-xl pl-4 text-body-sm";

/** One tab's contents: hover tint, divider, link (with a hover preview), × and a right-click menu. */
export function Tab({
  tab,
  active,
  divider,
  onClose,
  onClick,
  editing = false,
  onEditingChange,
  onRename,
  pinned = false,
  onTogglePin,
  replying = false,
  unread = false,
  dragging = false,
  focusable = true,
}: {
  tab: TabData;
  active: boolean;
  /** Hairline on the left, between two inactive tabs. */
  divider: boolean;
  onClose: () => void;
  onClick?: (e: React.MouseEvent) => void;
  /** Shows the title as a text field. */
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  /** Called with the new title. Without it, the tab can't be renamed. */
  onRename?: (title: string) => void;
  /** Icon only, no ×. */
  pinned?: boolean;
  /** Without it, the tab can't be pinned. */
  onTogglePin?: () => void;
  /** A reply is being written in this project: a spinner in place of the icon. */
  replying?: boolean;
  /** A reply finished while you were elsewhere: a dot on the icon. */
  unread?: boolean;
  /** Being dragged: no hover tint, divider or focus ring. */
  dragging?: boolean;
  /** In the Tab order. Only one tab is; arrow keys move between the rest. */
  focusable?: boolean;
}) {
  const Icon = tab.thread ? NodeTabIcon : NewTabIcon;
  // Double-clicking an inactive tab opens it; only a tab that was already
  // active when the double-click began starts renaming.
  const activeAtPress = useRef(false);
  const iconOnly = pinned && !editing;

  const body = (
    <>
      <RenderIf condition={!active && !dragging}>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-1 top-0 bottom-1 rounded-xl bg-transparent-hover opacity-0 transition-opacity duration-150 group-hover/tab:opacity-100"
        />
      </RenderIf>
      {/* Hidden while either neighbour is hovered. */}
      <RenderIf condition={divider && !dragging}>
        <span
          aria-hidden
          className="absolute top-1/2 left-0 h-4 w-px -translate-y-1/2 bg-border-default transition-opacity group-hover/tab:opacity-0 [.group\/tab:hover+.group\/tab>&]:opacity-0"
        />
      </RenderIf>

      <RenderIf condition={editing}>
        <div className={cn(content, "z-10 pr-3 text-fg-primary")}>
          <Icon className="size-4 shrink-0 text-fg-secondary" />
          <TitleField
            title={tab.title}
            onDone={(title) => {
              if (title !== null && title !== tab.title) onRename?.(title);
              onEditingChange?.(false);
            }}
          />
        </div>
      </RenderIf>

      <RenderIf condition={!editing}>
        <PreviewCard.Root>
          <PreviewCard.Trigger
            delay={500}
            closeDelay={100}
            render={
              <Link
                href={tab.href}
                role="tab"
                aria-selected={active}
                // The tab is dragged, not the link.
                draggable={false}
                tabIndex={focusable ? 0 : -1}
                onClick={onClick}
                onPointerDown={(e) => {
                  if (e.detail <= 1) activeAtPress.current = active;
                }}
                onDoubleClick={(e) => {
                  if (!onRename || !activeAtPress.current) return;
                  e.preventDefault();
                  onEditingChange?.(true);
                }}
                aria-label={iconOnly ? tab.title : undefined}
                className={cn(
                  content,
                  iconOnly ? "justify-center px-0" : "pr-9",
                  // Above the surface (z-1). On the content, not the tab box:
                  // Reorder.Item sets its own inline z-index.
                  active && "z-10",
                  "outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50",
                  // The press that starts a drag can leave the link focused; no ring while dragging.
                  dragging && "focus-visible:ring-0",
                  active ? "text-fg-primary" : "text-fg-secondary hover:text-fg-primary",
                )}
              >
                <span className={cn("relative flex size-4 shrink-0 transition-colors duration-200", active ? "text-fg-secondary" : "text-fg-tertiary")}>
                  <RenderIf condition={replying}>
                    <Spinner className="size-3.5 m-px border-[1.5px]" />
                  </RenderIf>
                  <RenderIf condition={!replying}>
                    {/* With a dot, the icon's corner is scooped out around it
                        (corner-shape: scoop, Chromium for now). */}
                    <span className={cn("flex", unread && "overflow-hidden rounded-tr-[6px] [corner-shape:scoop]")}>
                      <Icon className="size-4" />
                    </span>
                  </RenderIf>
                  {/* Without corner-shape support, a ring in the strip's colour fakes the cut. */}
                  <RenderIf condition={unread && !replying}>
                    <span
                      aria-label="New reply"
                      className="absolute -top-[2.2px] -right-[2.2px] size-1.5 rounded-full bg-brand-solid ring-2 ring-sidebar supports-[corner-shape:scoop]:ring-0 motion-safe:animate-in motion-safe:zoom-in-50"
                    />
                  </RenderIf>
                </span>
                <RenderIf condition={!iconOnly}>
                  <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap [mask-image:linear-gradient(to_right,black_calc(100%-16px),transparent)]">
                    {tab.title}
                  </span>
                </RenderIf>
              </Link>
            }
          />
          {!active && tab.thread && (
            <PreviewCard.Portal>
              <PreviewCard.Positioner side="bottom" align="start" sideOffset={8} className="z-50">
                <PreviewCard.Popup className="corner-squircle origin-(--transform-origin) rounded-4xl bg-surface-modal shadow-large outline-none transition-[opacity,scale] duration-150 ease-out data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-100 motion-reduce:transition-opacity">
                  <TabPreview thread={tab.thread} />
                </PreviewCard.Popup>
              </PreviewCard.Positioner>
            </PreviewCard.Portal>
          )}
        </PreviewCard.Root>
        <RenderIf condition={!pinned}>
          <button
            aria-label={tab.thread ? `Close ${tab.title}` : "Close new project"}
            onClick={onClose}
            className={cn(
              "absolute right-2.5 flex size-5 cursor-pointer items-center justify-center rounded-md text-fg-tertiary opacity-0 outline-none transition-opacity group-hover/tab:opacity-100 hover:bg-transparent-hover hover:text-fg-primary focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50",
              active && "z-10",
            )}
          >
            <CloseIcon className="size-3.5" />
          </button>
        </RenderIf>
      </RenderIf>
    </>
  );

  if (!onRename && !onTogglePin) return body;
  return (
    <ContextMenu.Root>
      {/* display: contents, so the tab's layout is untouched. */}
      <ContextMenu.Trigger className="contents">{body}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner sideOffset={4} className="z-50">
          {/* No focus back to the tab on close: Rename's field has it. */}
          <ContextMenu.Popup
            finalFocus={false}
            className="corner-squircle min-w-36 rounded-4xl border border-foreground/8 bg-background p-1.5 shadow-large outline-none"
          >
            <RenderIf condition={!!onRename}>
              <ContextMenu.Item className={menuItem} onClick={() => onEditingChange?.(true)}>
                <Pencil />
                Rename
              </ContextMenu.Item>
            </RenderIf>
            <RenderIf condition={!!onTogglePin}>
              <ContextMenu.Item className={menuItem} onClick={onTogglePin}>
                {pinned ? <PinOff /> : <Pin />}
                {pinned ? "Unpin" : "Pin"}
              </ContextMenu.Item>
            </RenderIf>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

/**
 * Focuses the field with everything selected, scrolled to the start: a
 * long title shows its beginning. The selection runs backwards so the
 * caret sits at the start, and the scroll is reset again after the tab
 * widens to full width (which happens in the same update).
 */
function focusAtStart(input: HTMLInputElement | null) {
  if (!input) return;
  const toStart = () => {
    input.setSelectionRange(0, input.value.length, "backward");
    input.scrollLeft = 0;
  };
  input.focus({ preventScroll: true });
  toStart();
  requestAnimationFrame(toStart);
}

/**
 * The title as a text field, all selected. Enter or clicking away saves;
 * Esc cancels. Calls onDone once: with the trimmed title, or null when
 * cancelled or left empty.
 */
function TitleField({ title, onDone }: { title: string; onDone: (title: string | null) => void }) {
  const done = useRef(false);
  const finish = (value: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(value?.trim() || null);
  };
  return (
    <input
      defaultValue={title}
      maxLength={MAX_TITLE}
      aria-label="Project name"
      ref={focusAtStart}
      onBlur={(e) => finish(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(e.currentTarget.value);
        if (e.key === "Escape") finish(null);
      }}
      className="min-w-0 flex-1 bg-transparent outline-none"
    />
  );
}
