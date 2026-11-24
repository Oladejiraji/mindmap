"use client";

import { useSyncExternalStore } from "react";

/*
 * Whether a suggested edit is previewed: its node shows how it would look
 * after the edit, on the canvas and in the Content tab. On by default for
 * every waiting edit; the Preview buttons (on the chat's card, the canvas
 * node and the Content tab's bar) turn it off and on again. Shared by all
 * of them, so it lives outside React.
 *
 * Kept per suggestion, not per node, so a new suggestion starts previewed.
 */

type State = {
  /** Suggestions whose preview was turned off. */
  hidden: ReadonlySet<string>;
  /**
   * The suggestion whose preview was last turned back on, for the panel to
   * show it. A new object each time, so turning the same one on twice counts.
   */
  shown: { proposalId: string } | null;
};

let state: State = { hidden: new Set(), shown: null };
const serverState: State = { hidden: new Set(), shown: null };
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Which suggestions are previewed. */
export function useEditPreview() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
}

/** Whether a waiting suggestion is previewed. */
export function isPreviewed(preview: State, proposalId: string) {
  return !preview.hidden.has(proposalId);
}

/** Turns a suggestion's preview off, or back on. */
export function toggleEditPreview(proposalId: string) {
  const hidden = new Set(state.hidden);
  const turningOn = hidden.delete(proposalId);
  if (!turningOn) hidden.add(proposalId);
  state = { hidden, shown: turningOn ? { proposalId } : state.shown };
  listeners.forEach((listener) => listener());
}
