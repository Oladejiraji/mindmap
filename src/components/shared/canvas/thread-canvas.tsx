"use client";

import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
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
import { layoutNodes, NODE_WIDTH, NODE_HEIGHT } from "@/lib/layout";
import { MindMapNode, type MindMapNodeData } from "./mind-map-node";

const nodeTypes: NodeTypes = {
  mindmap: MindMapNode,
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
      deleteLeafNode({ nodeId: nodeId as Id<"nodes"> });
    },
    [deleteLeafNode],
  );

  const handleRenameNode = useCallback(
    (nodeId: string, title: string) => {
      renameNode({ nodeId: nodeId as Id<"nodes">, title });
    },
    [renameNode],
  );

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!nodes) return { rfNodes: [], rfEdges: [] };

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

    const rfNodes: RFNode<MindMapNodeData>[] = nodes.map((node) => {
      const pos = positions.get(node._id) ?? { x: 0, y: 0 };
      return {
        id: node._id,
        type: "mindmap",
        position: pos,
        dragHandle: ".mindmap-drag-handle",
        data: {
          title: node.title,
          isRoot: node.parentId === null,
          isParent: (childCounts.get(node._id) ?? 0) > 0,
          isStreaming: node.isStreaming === true,
          onDelete: handleDeleteNode,
          onRename: handleRenameNode,
        },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      };
    });

    const rfEdges: RFEdge[] = nodes
      .filter((n) => n.parentId !== null)
      .map((node) => ({
        id: `${node.parentId}-${node._id}`,
        source: node.parentId!,
        target: node._id,
        type: "smoothstep",
      }));

    return { rfNodes, rfEdges };
  }, [nodes, handleDeleteNode, handleRenameNode]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(rfNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(rfEdges);

  // Sync Convex data → React Flow when topology/data actually changes
  const fingerprint = useMemo(
    () =>
      nodes
        ?.map(
          (n) =>
            `${n._id}:${n.parentId}:${n.title}:${n.position?.x ?? ""}:${n.position?.y ?? ""}:${n.isStreaming ?? ""}`,
        )
        .join("|") ?? "",
    [nodes],
  );
  const lastSyncedRef = useRef(fingerprint);
  useEffect(() => {
    if (fingerprint && fingerprint !== lastSyncedRef.current) {
      lastSyncedRef.current = fingerprint;
      setFlowNodes(rfNodes);
      setFlowEdges(rfEdges);
    }
  }, [fingerprint, rfNodes, rfEdges, setFlowNodes, setFlowEdges]);

  // Ancestor path highlighting on selection
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Walk parent chain to build set of edge IDs on the ancestor path
  const ancestorEdgeIds = useMemo(() => {
    if (!selectedNodeId || !nodes) return new Set<string>();
    const nodeMap = new Map(nodes.map((n) => [n._id as string, n]));
    const edgeIds = new Set<string>();
    let current = nodeMap.get(selectedNodeId);
    while (current?.parentId) {
      edgeIds.add(`${current.parentId}-${current._id}`);
      current = nodeMap.get(current.parentId);
    }
    return edgeIds;
  }, [selectedNodeId, nodes]);

  // Apply animated state to edges on the ancestor path
  useEffect(() => {
    setFlowEdges((edges) =>
      edges.map((e) => ({
        ...e,
        animated: ancestorEdgeIds.has(e.id),
        style: ancestorEdgeIds.has(e.id)
          ? { stroke: "var(--ring)", strokeWidth: 2 }
          : undefined,
      })),
    );
  }, [ancestorEdgeIds, setFlowEdges]);

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
      });
    },
    [updatePosition],
  );

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: RFNode) => {
      router.push(`/t/${threadId}/n/${node.id}`);
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

      createEmptyBranch({ parentId: sourceId as Id<"nodes">, position });
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
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
