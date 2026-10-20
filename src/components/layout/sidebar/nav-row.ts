/*
 * The navigation row, taken from the sidebar's Home row and used for every
 * nav list (app sidebar, Settings nav, the project panel's node tree):
 * 32px, 12px squircle corners, 10px icon gap, 13px semimedium label, muted
 * 16px icon. Active is a pill with a hairline: on the grey sidebar a shade
 * lighter than it; on a white card (no lighter shade) the grey hover tint.
 */
export const navRow =
  "corner-squircle flex h-8 items-center gap-2.5 rounded-2xl px-2 text-body-sm font-semimedium text-fg-secondary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50 [&>svg:first-child]:size-4 [&>svg:first-child]:shrink-0 [&>svg:first-child]:text-fg-tertiary";

/** Active row on the grey sidebar surface. */
export const navRowActive =
  "bg-white/50 text-fg-primary shadow-border hover:bg-white/50 [&>svg:first-child]:text-fg-primary";

/** Active row on a white card. */
export const navRowActiveOnCard = "bg-transparent-hover text-fg-primary shadow-border";
