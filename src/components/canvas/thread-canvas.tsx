"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ViewToggle } from "@/components/canvas/view-toggle";
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  useNodesState,
  useReactFlow,
  useStoreApi,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeTypes,
  type OnNodeDrag,
  type OnSelectionChangeFunc,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BranchChat } from "@/components/chat/branch-chat";
import { FullNodeChat } from "@/components/chat/full-node-chat";
import { ZoomControls } from "./zoom-controls";
import { CanvasShortcuts } from "./canvas-shortcuts";
import { useSyncConvexToFlow } from "@/hooks/use-sync-convex-to-flow";
import { cn } from "@/lib/utils";
import { RenderIf } from "@/components/shared/render-if";
import type { Id } from "@convex/dataModel";

import { api } from "@convex/api";
import { useMutation } from "convex/react";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  estimatedHeight,
  layoutNodes,
  placeBranch,
  tidyLayout,
  type LayoutPosition,
  type NodeBox,
} from "@/lib/layout";
import { buildNodeMap, walkAncestors } from "@/lib/tree";
import { handleError } from "@/lib/handle-error";
import { getStorageItem, setStorageItem } from "@/lib/storage";
import { routes } from "@/lib/routes";
import {
  ParentNode,
  LeafNode,
  CANVAS_NODE_WIDTH,
  type MindMapNodeData,
} from "./nodes";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";

/** How long Tidy up takes to move the nodes (ms). */
const TIDY_DURATION = 300;

const nodeTypes: NodeTypes = {
  parent: ParentNode,
  leaf: LeafNode,
};

export function ThreadCanvas({ threadId }: { threadId: Id<"threads"> }) {
  return (
    <ReactFlowProvider>
      <ThreadCanvasInner threadId={threadId} />
    </ReactFlowProvider>
  );
}

function ThreadCanvasInner({ threadId }: { threadId: Id<"threads"> }) {
  // Hooks first (before any early return): the view lives in the URL.
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { data: nodes, isLoading } = useAuthedConvexQuery(api.nodes.listByThread, { threadId });
  // Zoom and pan per project, in this browser (they depend on screen
  // size). Without one, the map fits the screen. React Flow only mounts
  // once nodes load, on the client, so reading storage here is safe.
  const viewportKey = `viewport:${threadId}`;
  const [savedViewport] = useState(() => getStorageItem<Viewport>(viewportKey));
  const updatePosition = useMutation(api.nodes.updatePosition);
  const setPositions = useMutation(api.nodes.setPositions);
  const createEmptyBranch = useMutation(api.nodes.createEmptyBranch);
  const deleteLeafNode = useMutation(api.nodes.deleteLeafNode);
  const renameNode = useMutation(api.nodes.rename);
  const { screenToFlowPosition, getNodes, fitView, getInternalNode, getViewport, setCenter } = useReactFlow();
  const flowStore = useStoreApi();
  const reduceMotion = useReducedMotion();
  const router = useRouter();

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      deleteLeafNode({ nodeId: nodeId as Id<"nodes"> }).catch((err) =>
        handleError(err, "Failed to delete node"),
      );
    },
    [deleteLeafNode],
  );

  const handleRenameNode = useCallback(
    (nodeId: string, title: string) => {
      renameNode({ nodeId: nodeId as Id<"nodes">, title }).catch((err) =>
        handleError(err, "Failed to rename"),
      );
    },
    [renameNode],
  );

  const handleOpenNode = useCallback(
    (nodeId: string) => router.push(routes.node(threadId, nodeId as Id<"nodes">)),
    [router, threadId],
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Space: the selected node in the side panel, or closed if it's showing.
  const panelNodeId = searchParams.get("panel");
  const togglePanel = useCallback(
    (nodeId: Id<"nodes">) => {
      if (panelNodeId !== nodeId) return handleOpenNode(nodeId);
      const next = new URLSearchParams(searchParams);
      next.delete("panel");
      next.delete("tab");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [panelNodeId, handleOpenNode, searchParams, pathname, router],
  );

  // With the side panel open, clicking another node shows that node in
  // it, on the same tab. A click, not a selection: dragging a node also
  // selects it, and moving one shouldn't swap the chat.
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: RFNode) => {
      if (!panelNodeId || node.id === panelNodeId) return;
      const next = new URLSearchParams(searchParams);
      next.set("panel", node.id);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [panelNodeId, searchParams, pathname, router],
  );


  /**
   * Adds a branch under `parentId`, placed from where the nodes are on
   * screen (with their measured sizes): under the parent, right of its
   * other children, clear of everything else.
   */
  const createBranch = useCallback(
    (parentId: Id<"nodes">) => {
      const parentOf = new Map(nodes?.map((n) => [n._id as string, n.parentId]));
      const boxes: NodeBox[] = getNodes().map((n) => ({
        id: n.id,
        x: n.position.x,
        y: n.position.y,
        width: n.measured?.width ?? NODE_WIDTH,
        height: n.measured?.height ?? NODE_HEIGHT,
      }));
      const parent = boxes.find((b) => b.id === parentId);
      if (!parent) return;
      const siblings = boxes.filter((b) => parentOf.get(b.id) === parentId);
      createEmptyBranch({ parentId, position: placeBranch(parent, siblings, boxes) }).catch((err) =>
        handleError(err, "Failed to create branch"),
      );
    },
    [nodes, getNodes, createEmptyBranch],
  );

  const ancestorEdgeIds = useMemo(() => {
    if (!selectedNodeId || !nodes) return new Set<string>();
    const chain = walkAncestors(
      buildNodeMap(nodes),
      selectedNodeId as Id<"nodes">,
    );
    const edgeIds = new Set<string>();
    for (let i = 1; i < chain.length; i++) {
      edgeIds.add(`${chain[i - 1]._id}-${chain[i]._id}`);
    }
    return edgeIds;
  }, [selectedNodeId, nodes]);

  const rfNodes = useMemo(() => {
    if (!nodes) return [];

    const positions = layoutNodes(nodes);

    const childCounts = new Map<string, number>();
    for (const node of nodes) {
      if (node.parentId) {
        childCounts.set(
          node.parentId,
          (childCounts.get(node.parentId) ?? 0) + 1,
        );
      }
    }

    return nodes.map((node): RFNode<MindMapNodeData> => {
      const pos = positions.get(node._id) ?? { x: 0, y: 0 };
      const isRoot = node.parentId === null;
      const isParent = (childCounts.get(node._id) ?? 0) > 0;
      return {
        id: node._id,
        type: isRoot || isParent ? "parent" : "leaf",
        position: pos,
        dragHandle: ".mindmap-drag-handle",
        data: {
          title: node.title,
          isRoot,
          isParent,
          content: node.content,
          onOpen: handleOpenNode,
          onDelete: handleDeleteNode,
          onRename: handleRenameNode,
        },
        width: CANVAS_NODE_WIDTH,
      };
    });
  }, [nodes, handleOpenNode, handleDeleteNode, handleRenameNode]);

  const rfEdges: RFEdge[] = useMemo(() => {
    if (!nodes) return [];
    return nodes
      .filter((n) => n.parentId !== null)
      .map((node) => {
        const edgeId = `${node.parentId}-${node._id}`;
        const isAncestor = ancestorEdgeIds.has(edgeId);
        return {
          id: edgeId,
          source: node.parentId!,
          target: node._id,
          type: "smoothstep",
          animated: isAncestor,
          style: isAncestor
            ? { stroke: "var(--ring)", strokeWidth: 2 }
            : undefined,
        };
      });
  }, [nodes, ancestorEdgeIds]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(rfNodes);

  useSyncConvexToFlow(rfNodes, setFlowNodes, nodes);

  // The panel's node is the selected one, and in view: however the panel
  // was opened (a click, its menu, Space, a link, a restored tab), the
  // canvas shows which node you're looking at. Syncing React Flow's store
  // (outside React state) to the URL.
  const hasFlowNodes = flowNodes.length > 0;
  useEffect(() => {
    if (!panelNodeId || !hasFlowNodes) return;
    const store = flowStore.getState();
    if (!store.nodeLookup.has(panelNodeId)) return;
    store.addSelectedNodes([panelNodeId]);
    // Off screen (even partly): centre it, at the same zoom.
    const node = getInternalNode(panelNodeId);
    const pane = store.domNode?.getBoundingClientRect();
    if (!node || !pane) return;
    const { x, y, zoom } = getViewport();
    const { x: nx, y: ny } = node.internals.positionAbsolute;
    const width = node.measured.width ?? CANVAS_NODE_WIDTH;
    const height = node.measured.height ?? 0;
    const left = nx * zoom + x;
    const top = ny * zoom + y;
    const visible = left >= 0 && top >= 0 && left + width * zoom <= pane.width && top + height * zoom <= pane.height;
    if (!visible) void setCenter(nx + width / 2, ny + height / 2, { zoom, duration: 300 });
  }, [panelNodeId, hasFlowNodes, flowStore, getInternalNode, getViewport, setCenter]);

  /** Glides the nodes to `targets` (instantly with reduced motion), then fits the view. */
  const moveNodes = useCallback(
    (targets: Map<string, LayoutPosition>) => {
      const from = new Map(getNodes().map((n) => [n.id, n.position]));
      const at = (k: number) =>
        setFlowNodes((ns) =>
          ns.map((n) => {
            const a = from.get(n.id);
            const b = targets.get(n.id);
            if (!a || !b) return n;
            return { ...n, position: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k } };
          }),
        );
      const fit = () => void fitView({ padding: 0.4, duration: reduceMotion ? 0 : 300 });
      if (reduceMotion) {
        at(1);
        requestAnimationFrame(fit);
        return;
      }
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / TIDY_DURATION);
        at(1 - (1 - t) ** 3);
        if (t < 1) requestAnimationFrame(step);
        else fit();
      };
      requestAnimationFrame(step);
    },
    [getNodes, setFlowNodes, fitView, reduceMotion],
  );

  /**
   * Lays the whole map out neatly from the nodes' measured sizes, keeping
   * the root where it is, and saves it. Undo puts every node back.
   */
  const tidyUp = useCallback(() => {
    if (!nodes?.length) return;
    const onScreen = new Map(getNodes().map((n) => [n.id, n]));
    const laidOut = tidyLayout(
      nodes,
      (node) => onScreen.get(node._id)?.measured?.height ?? estimatedHeight(node),
    );
    const root = nodes.find((n) => n.parentId === null);
    const rootNow = root && onScreen.get(root._id)?.position;
    const rootLaidOut = root && laidOut.get(root._id);
    const dx = rootNow && rootLaidOut ? rootNow.x - rootLaidOut.x : 0;
    const dy = rootNow && rootLaidOut ? rootNow.y - rootLaidOut.y : 0;
    const after = new Map([...laidOut].map(([id, p]) => [id, { x: p.x + dx, y: p.y + dy }]));
    const before = new Map([...onScreen].map(([id, n]) => [id, n.position]));

    const save = (positions: Map<string, LayoutPosition>) =>
      setPositions({
        threadId,
        positions: [...positions].map(([nodeId, position]) => ({ nodeId: nodeId as Id<"nodes">, position })),
      }).catch((err) => handleError(err, "Couldn't save the layout"));

    moveNodes(after);
    void save(after);
    const id = toast("Tidied up", {
      action: (
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => {
            moveNodes(before);
            void save(before);
            toast.dismiss(id);
          }}
        >
          Undo
        </Button>
      ),
    });
  }, [nodes, getNodes, moveNodes, setPositions, threadId]);

  // Track which node a connection drag started from
  const connectSourceRef = useRef<string | null>(null);

  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      setSelectedNodeId(
        selectedNodes.length === 1 ? selectedNodes[0].id : null,
      );
    },
    [],
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      updatePosition({
        nodeId: node.id as Id<"nodes">,
        position: { x: node.position.x, y: node.position.y },
      }).catch((err) => handleError(err, "Failed to save position"));
    },
    [updatePosition],
  );


  const onConnectStart = useCallback(
    (_event: unknown, params: { nodeId: string | null }) => {
      connectSourceRef.current = params.nodeId;
    },
    [],
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const sourceId = connectSourceRef.current;
      connectSourceRef.current = null;
      if (!sourceId) return;

      const target = event.target as HTMLElement;
      if (target.closest(".react-flow__handle")) return;

      const clientX =
        "changedTouches" in event
          ? event.changedTouches[0].clientX
          : event.clientX;
      const clientY =
        "changedTouches" in event
          ? event.changedTouches[0].clientY
          : event.clientY;
      const position = screenToFlowPosition({ x: clientX, y: clientY });

      createEmptyBranch({
        parentId: sourceId as Id<"nodes">,
        position,
      }).catch((err) => handleError(err, "Failed to create branch"));
    },
    [createEmptyBranch, screenToFlowPosition],
  );

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-body-base text-fg-secondary"></p>
      </div>
    );
  }

  if (!nodes?.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-body-base text-fg-secondary">No nodes in this thread</p>
      </div>
    );
  }

  const view = searchParams.get("view") === "chat" ? "chat" : "canvas";
  // A node's chat full screen (?chat=), over either view. A stale id shows nothing.
  const fullChatId = searchParams.get("chat");
  const fullChatNode = fullChatId ? nodes.find((n) => n._id === fullChatId) : undefined;
  const replaceQuery = (edit: (q: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    edit(next);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const chatNodeParam = searchParams.get("node");
  const chatNode =
    (chatNodeParam && nodes?.find((n) => n._id === chatNodeParam)) ||
    (selectedNodeId && nodes?.find((n) => n._id === selectedNodeId)) ||
    nodes?.find((n) => n.parentId === null);
  // Same tab, same path: only the query changes, so the tab stays put and
  // a reload keeps the view.
  const setView = (next: "canvas" | "chat") =>
    router.replace(next === "chat" && chatNode ? `${pathname}?view=chat&node=${chatNode._id}` : pathname, { scroll: false });

  return (
    // data-ready-thread: the project has drawn; the phone's tab switcher
    // waits for it before revealing the page.
    <div data-ready-thread={threadId} className="relative h-full w-full overflow-hidden">
      {chatNode && !fullChatNode && (
        <ViewToggle
          active={view}
          canvasHref={pathname}
          chatHref={`${pathname}?view=chat&node=${chatNode._id}`}
          chatLabel={chatNode.title}
          onSelect={setView}
          className="absolute top-3 right-3 z-20 bg-background-5 shadow-default"
        />
      )}

      {/* Canvas layer stays mounted so zoom and position survive the switch. */}
      <div
        inert={view === "chat" || !!fullChatNode}
        className={cn(
          "@container absolute inset-0 transition-[opacity,transform,filter] duration-300 ease-out motion-reduce:transition-none",
          view === "chat" && "pointer-events-none scale-[0.98] opacity-0 blur-[2px]",
        )}
      >
        <ReactFlow
          nodes={flowNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView={!savedViewport}
          fitViewOptions={{ padding: 0.4 }}
          defaultViewport={savedViewport ?? undefined}
          onMoveEnd={(_, viewport) => setStorageItem(viewportKey, viewport)}
          proOptions={{ hideAttribution: true }}
          // Space opens the side panel (see useCanvasShortcuts), so it
          // doesn't pan; dragging the canvas does.
          panActivationKeyCode={null}
        >
          <ZoomControls onTidy={tidyUp} />
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="bg-muted/50! border! border-border! rounded-xl! shadow-default!"
          />
        </ReactFlow>
        {nodes && (
          <CanvasShortcuts
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            createBranch={createBranch}
            onTidy={tidyUp}
            onTogglePanel={togglePanel}
            enabled={view !== "chat" && !fullChatNode}
            expanded={shortcutsOpen}
            onExpandedChange={setShortcutsOpen}
          />
        )}
      </div>

      {/* Chat layer: same tab, rises in over the canvas. */}
      <div
        inert={view !== "chat" || !!fullChatNode}
        className={cn(
          "absolute inset-0 flex justify-center transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
          view === "chat" ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        {chatNode && nodes && view === "chat" && (
          <div className="h-full w-full">
            <BranchChat
              nodes={nodes}
              activeNodeId={chatNode._id}
              onActiveNodeChange={(id) => router.replace(`${pathname}?view=chat&node=${id}`, { scroll: false })}
            />
          </div>
        )}
      </div>

      {/* A node's chat full screen, over both views. */}
      <RenderIf condition={!!fullChatNode}>
        <div className="absolute inset-0 z-30 bg-background bg-(image:--gradient-panel) motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2">
          <FullNodeChat
            nodeId={fullChatNode?._id as Id<"nodes">}
            nodes={nodes}
            onCollapse={() =>
              replaceQuery((q) => {
                q.delete("chat");
                q.set("panel", fullChatId!);
                q.set("tab", "chat");
              })
            }
            onClose={() => replaceQuery((q) => q.delete("chat"))}
            onNodeChange={(id) => replaceQuery((q) => q.set("chat", id))}
          />
        </div>
      </RenderIf>
    </div>
  );
}
