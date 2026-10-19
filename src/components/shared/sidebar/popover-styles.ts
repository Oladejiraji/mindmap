/*
 * Shared sizing for the sidebar's popovers (account menu, search, project
 * "…" menu), so they read as one family:
 *   surface   192px wide, 20px squircle corners, modal surface + large shadow
 *   sections  6px inset; rows 32px, 13px, muted 16px icon, 14px corners
 *             (20 − 6, concentric with the surface)
 *   dividers  full-bleed hairlines at half the usual border opacity
 */
export const popupSurface =
  "corner-squircle w-48 origin-(--transform-origin) overflow-hidden rounded-4xl bg-surface-modal text-fg-primary shadow-large outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0";

export const popupSection = "p-1.5";

export const popupRow =
  "corner-squircle flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-[14px] px-2.5 text-body-sm whitespace-nowrap text-fg-primary outline-none transition-colors select-none data-highlighted:bg-transparent-hover [&>svg:first-child]:size-4 [&>svg:first-child]:shrink-0 [&>svg:first-child]:text-fg-tertiary";

export const popupDivider = "h-px bg-border-default/50";

/** Where sidebar popovers sit: under their trigger row, aligned to the
 * sidebar's 16px content inset. */
export const SIDEBAR_INSET = 16;
