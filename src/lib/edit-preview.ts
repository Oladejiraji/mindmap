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
 *
 * Also which of a suggestion's changes you've left out, to accept the rest:
 * its document edits and its branches, each by index. The previews show
 * left-out edits as the document is now, and left-out branches faded.
 */

export type EditPreviewState = State;
type State = {
  /** Suggestions whose preview was turned off. */
  hidden: ReadonlySet<string>;
  /**
   * The suggestion whose preview was last turned back on, for the panel to
   * show it. A new object each time, so turning the same one on twice counts.
   */
  shown: { proposalId: string } | null;
  /** Suggestion → the changes left out of it. */
  skipped: ReadonlyMap<string, ReadonlySet<number>>;
};

let state: State = { hidden: new Set(), shown: null, skipped: new Map() };
const serverState: State = { hidden: new Set(), shown: null, skipped: new Map() };
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
  state = { ...state, hidden, shown: turningOn ? { proposalId } : state.shown };
  listeners.forEach((listener) => listener());
}

const NONE: ReadonlySet<number> = new Set();

/** The changes left out of a suggestion. */
export function skippedEdits(preview: State, proposalId: string): ReadonlySet<number> {
  return preview.skipped.get(proposalId) ?? NONE;
}

/** Leaves a change out of a suggestion, or puts it back. */
export function toggleSkippedEdit(proposalId: string, edit: number) {
  const edits = new Set(skippedEdits(state, proposalId));
  if (!edits.delete(edit)) edits.add(edit);
  const skipped = new Map(state.skipped);
  skipped.set(proposalId, edits);
  state = { ...state, skipped };
  listeners.forEach((listener) => listener());
}

// Branches are kept under their own key, so their indices don't mix with the edits'.
const branchesKey = (proposalId: string) => `${proposalId}#branches`;

/** The branches left out of a suggestion. */
export function skippedBranches(preview: State, proposalId: string): ReadonlySet<number> {
  return skippedEdits(preview, branchesKey(proposalId));
}

/** Leaves a branch out of a suggestion, or puts it back. */
export function toggleSkippedBranch(proposalId: string, branch: number) {
  toggleSkippedEdit(branchesKey(proposalId), branch);
}

/** "Accept", or "Accept 2 of 3" when some changes (edits or branches) are left out. */
export function acceptLabel(skipped: number, total: number) {
  return skipped > 0 ? `Accept ${total - skipped} of ${total}` : "Accept";
}
