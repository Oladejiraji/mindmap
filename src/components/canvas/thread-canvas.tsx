"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ViewToggle } from "@/components/canvas/view-toggle";
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  useNodesState,
  useReactFlow,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeTypes,
  type OnNodeDrag,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BranchChat } from "@/components/chat/branch-chat";
import { ZoomControls } from "./zoom-controls";
import { CanvasShortcuts } from "./canvas-shortcuts";
import { useSyncConvexToFlow } from "@/hooks/use-sync-convex-to-flow";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/dataModel";

import { api } from "@convex/api";
import { useNodesByThread } from "@/services/nodes/queries";
import { useMutation } from "convex/react";
import { layoutNodes } from "@/lib/layout";
import { buildNodeMap, walkAncestors } from "@/lib/tree";
import { handleError } from "@/lib/handle-error";
import { routes } from "@/lib/routes";
import {
  ParentNode,
  LeafNode,
  CANVAS_NODE_WIDTH,
  type MindMapNodeData,
} from "./nodes";

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
  const { data: nodes, isLoading } = useNodesByThread(threadId);
  const updatePosition = useMutation(api.nodes.updatePosition);
  const createEmptyBranch = useMutation(api.nodes.createEmptyBranch);
  const deleteLeafNode = useMutation(api.nodes.deleteLeafNode);
  const renameNode = useMutation(api.nodes.rename);
  const { screenToFlowPosition } = useReactFlow();
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

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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
          onDelete: handleDeleteNode,
          onRename: handleRenameNode,
        },
        width: CANVAS_NODE_WIDTH,
      };
    });
  }, [nodes, handleDeleteNode, handleRenameNode]);

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

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: RFNode) => {
      router.push(routes.node(threadId, node.id as Id<"nodes">));
    },
    [router, threadId],
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
    <div className="relative h-full w-full overflow-hidden">
      {chatNode && (
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
        inert={view === "chat"}
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
          // onNodeDoubleClick={onNodeDoubleClick}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.4 }}
          proOptions={{ hideAttribution: true }}
        >
          <ZoomControls />
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
            createEmptyBranch={createEmptyBranch}
            enabled={view !== "chat"}
            expanded={shortcutsOpen}
            onExpandedChange={setShortcutsOpen}
          />
        )}
      </div>

      {/* Chat layer: same tab, rises in over the canvas. */}
      <div
        inert={view !== "chat"}
        className={cn(
          "absolute inset-0 flex justify-center transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
          view === "chat" ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        {chatNode && nodes && view === "chat" && (
          <div className="h-full w-full">
            <BranchChat
              threadId={threadId}
              nodes={nodes}
              activeNodeId={chatNode._id}
              onActiveNodeChange={(id) => router.replace(`${pathname}?view=chat&node=${id}`, { scroll: false })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
