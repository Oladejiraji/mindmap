# Canvas view

The canvas renders a thread's node tree as a draggable mindmap using React Flow. The entry point is `ThreadCanvas` in `thread-canvas.tsx`, mounted by the `/t/[threadId]` route.

## Data flow

1. **Query.** `useNodesByThread(threadId)` subscribes to all nodes in the thread via Convex. This is reactive — any mutation (new branch, position update, title rename) triggers a re-delivery.

2. **Layout.** The node list is passed to `layoutNodes()` (`src/lib/layout.ts`), which runs dagre in top-to-bottom mode over the parent-child topology. Every node gets a computed `(x, y)`. If a node has a stored `position` (meaning the user has dragged it before), the stored value wins — this is the hybrid model described in SPEC.md.

3. **React Flow state.** `useNodesState` and `useEdgesState` give React Flow ownership of node/edge arrays. This is critical — React Flow tracks internal state per node (measured dimensions, drag position, selection) that gets destroyed if you replace the array externally mid-interaction.

4. **Fingerprint sync.** A string fingerprint is built from every node's id, parentId, title, and stored position. A ref tracks the last fingerprint we synced. When Convex re-delivers and the fingerprint differs (real change — new branch, renamed node, persisted drag), we push the new `rfNodes`/`rfEdges` into React Flow. When it's identical (same data re-delivered, or mid-drag before persist), we skip the push, so React Flow's internal drag state stays untouched.

5. **Drag persist.** On drag end, `onNodeDragStop` calls the `updatePosition` mutation to write the node's new `(x, y)` to Convex. This causes a reactive re-delivery, which changes the fingerprint (position field changed), so the sync fires — but by then the drag is over and React Flow's state is stable.

6. **Navigation.** Clicking a node navigates to `/t/[threadId]/n/[nodeId]` (the chat view).

## Why not fully controlled mode

The first implementation passed computed nodes directly to `<ReactFlow nodes={...}>` and handled `onNodesChange` manually. This caused nodes and edges to flash during drag — every Convex reactive tick rebuilt the node array, resetting React Flow's measured dimensions and drag coordinates. The fingerprint approach avoids this by letting React Flow own state and only syncing on meaningful data changes.

## Files

| File | Role |
|---|---|
| `src/app/t/[threadId]/page.tsx` | Route — unwraps params and renders `ThreadCanvas` |
| `src/components/shared/canvas/thread-canvas.tsx` | Main canvas component — data fetching, layout, React Flow |
| `src/components/shared/canvas/mind-map-node.tsx` | Custom node renderer — title, root/branch label, child count |
| `src/lib/layout.ts` | Dagre auto-layout + hybrid position merge |
