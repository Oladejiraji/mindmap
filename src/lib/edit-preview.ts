"use client";

import { useSyncExternalStore } from "react";

/*
 * Which node the canvas is showing a suggested edit on: the node changes
 * to how it would look after the edit. Turned on and off by the Preview
 * buttons (on the chat's card and on the node), and shown by the canvas,
 * so it lives outside React. One node at a time.
 */

let previewed: string | null = null;
const listeners = new Set<() => void>();

function set(next: string | null) {
  previewed = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The node being previewed, if any. */
export function useEditPreview() {
  return useSyncExternalStore(
    subscribe,
    () => previewed,
    () => null,
  );
}

/** Previews a node's edit, or stops if it's previewed already. */
export function toggleEditPreview(nodeId: string) {
  set(previewed === nodeId ? null : nodeId);
}

/** Stops the preview of a node: its edit was answered. */
export function clearEditPreview(nodeId: string) {
  if (previewed === nodeId) set(null);
}
