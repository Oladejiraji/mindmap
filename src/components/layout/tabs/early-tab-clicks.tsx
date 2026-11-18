"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/*
 * Tab clicks before hydration (after ethanniser.com/blog/a-clock-that-doesnt-snap).
 *
 * Until React hydrates, a tab is a plain link, so a click would reload the
 * whole page. An inline script, placed right after the strip so it runs
 * before hydration, catches the click instead: it remembers the tab on
 * window and highlights it. Once the strip hydrates, it opens that tab
 * and removes the script's listener and highlight.
 */

type EarlyTabWindow = Window & {
  __earlyTab?: string;
  __releaseEarlyTabs?: () => void;
};

const STYLE_ID = "early-tab-click";

/**
 * Runs as an inline script, so it must be self-contained: no imports,
 * nothing from outside this function. Plain clicks only; modified clicks
 * still open a new browser tab.
 */
function catchEarlyTabClicks() {
  const strip = document.currentScript?.previousElementSibling;
  if (!strip) return;
  const onClick = (e: Event) => {
    const event = e as MouseEvent;
    const link = (event.target as Element | null)?.closest?.('a[role="tab"]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const href = link.getAttribute("href") ?? "";
    (window as EarlyTabWindow).__earlyTab = href;
    // Highlight it from a head style: React doesn't hydrate injected head
    // nodes, while an attribute on the link would be a hydration mismatch.
    let style = document.getElementById("early-tab-click");
    if (!style) {
      style = document.createElement("style");
      style.id = "early-tab-click";
      document.head.appendChild(style);
    }
    style.textContent = `a[role="tab"][href="${CSS.escape(href)}"]{color:var(--color-fg-primary)}`;
  };
  strip.addEventListener("click", onClick, true);
  (window as EarlyTabWindow).__releaseEarlyTabs = () => strip.removeEventListener("click", onClick, true);
}

/** The inline script. Render it right after the strip's element. */
export function EarlyTabClicksScript() {
  return <script dangerouslySetInnerHTML={{ __html: `(${catchEarlyTabClicks.toString()})()` }} />;
}

/** On hydration: open the tab clicked early, then stop catching clicks. */
export function useEarlyTabClicks() {
  const router = useRouter();
  const pathname = usePathname();
  // Syncs with state from outside React (the pre-hydration script), once.
  useEffect(() => {
    const w = window as EarlyTabWindow;
    w.__releaseEarlyTabs?.();
    delete w.__releaseEarlyTabs;
    const href = w.__earlyTab;
    delete w.__earlyTab;
    document.getElementById(STYLE_ID)?.remove();
    if (href && href !== pathname) router.push(href);
    // Only on mount: later clicks are handled by the tabs themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
