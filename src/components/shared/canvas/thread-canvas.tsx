"use client";

import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
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
import { useRouter } from "next/navigation";
import type { Id } from "@convex/dataModel";

import { useNodesByThread } from "@/services/nodes/queries";
import {
  useUpdatePosition,
  useCreateEmptyBranch,
  useDeleteLeafNode,
  useRenameNode,
} from "@/services/nodes/mutations";
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
  const { data: nodes, isLoading } = useNodesByThread(threadId);
  const updatePosition = useUpdatePosition();
  const createEmptyBranch = useCreateEmptyBranch();
  const deleteLeafNode = useDeleteLeafNode();
  const renameNode = useRenameNode();
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

  // Sync Convex data → React Flow when topology/data actually changes
  const fingerprint = useMemo(
    () =>
      nodes
        ?.map(
          (n) =>
            `${n._id}:${n.parentId}:${n.title}:${n.position?.x ?? ""}:${n.position?.y ?? ""}:${n.content ?? ""}`,
        )
        .join("|") ?? "",
    [nodes],
  );
  const lastSyncedRef = useRef(fingerprint);
  useEffect(() => {
    if (fingerprint && fingerprint !== lastSyncedRef.current) {
      lastSyncedRef.current = fingerprint;
      setFlowNodes((prev) => {
        const incoming = new Map(rfNodes.map((n) => [n.id, n]));
        const prevIds = new Set(prev.map((n) => n.id));
        const merged = prev
          .filter((n) => incoming.has(n.id))
          .map((existing) => {
            const next = incoming.get(existing.id)!;
            return { ...existing, data: next.data, type: next.type };
          });
        for (const n of rfNodes) {
          if (!prevIds.has(n.id)) merged.push({ ...n, type: n.type ?? "leaf" });
        }
        return merged;
      });
    }
  }, [fingerprint, rfNodes, setFlowNodes]);

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

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[calc(100svh-3.5rem)] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!nodes?.length) {
    return (
      <div className="flex h-full min-h-[calc(100svh-3.5rem)] items-center justify-center">
        <p className="text-sm text-muted-foreground">No nodes in this thread</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100svh-3.5rem)] w-full">
      <ReactFlow
        nodes={flowNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={onNodeDoubleClick}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-muted/50! border! border-border! rounded-lg! shadow-sm!"
        />
      </ReactFlow>
    </div>
  );
}
