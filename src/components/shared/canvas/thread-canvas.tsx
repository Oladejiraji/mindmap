"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeTypes,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import type { Id } from "@convex/dataModel";

import { useNodesByThread } from "@/services/nodes/queries";
import { useUpdatePosition } from "@/services/nodes/mutations";
import { layoutNodes, NODE_WIDTH, NODE_HEIGHT } from "@/lib/layout";
import { MindMapNode, type MindMapNodeData } from "./mind-map-node";

const nodeTypes: NodeTypes = {
  mindmap: MindMapNode,
};

export function ThreadCanvas({ threadId }: { threadId: Id<"threads"> }) {
  const { data: nodes, isLoading } = useNodesByThread(threadId);
  const updatePosition = useUpdatePosition();
  const router = useRouter();

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!nodes) return { rfNodes: [], rfEdges: [] };

    const positions = layoutNodes(nodes);

    // Count children per node
    const childCounts = new Map<string, number>();
    for (const node of nodes) {
      if (node.parentId) {
        childCounts.set(node.parentId, (childCounts.get(node.parentId) ?? 0) + 1);
      }
    }

    const rfNodes: RFNode<MindMapNodeData>[] = nodes.map((node) => {
      const pos = positions.get(node._id) ?? { x: 0, y: 0 };
      return {
        id: node._id,
        type: "mindmap",
        position: pos,
        data: {
          title: node.title,
          isRoot: node.parentId === null,
          isParent: (childCounts.get(node._id) ?? 0) > 0,
          isStreaming: node.isStreaming === true,
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
        animated: false,
      }));

    return { rfNodes, rfEdges };
  }, [nodes]);

  // React Flow owns the state — we only push when Convex data actually changes
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(rfNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(rfEdges);

  // Fingerprint detects real topology/data changes vs identical reactive re-deliveries
  const fingerprint = useMemo(
    () =>
      nodes
        ?.map((n) => `${n._id}:${n.parentId}:${n.title}:${n.position?.x ?? ""}:${n.position?.y ?? ""}:${n.isStreaming ?? ""}`)
        .join("|") ?? "",
    [nodes]
  );
  const lastSyncedRef = useRef(fingerprint);
  if (fingerprint && fingerprint !== lastSyncedRef.current) {
    lastSyncedRef.current = fingerprint;
    setFlowNodes(rfNodes);
    setFlowEdges(rfEdges);
  }

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      updatePosition({
        nodeId: node.id as Id<"nodes">,
        position: { x: node.position.x, y: node.position.y },
      });
    },
    [updatePosition]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: RFNode) => {
      router.push(`/t/${threadId}/n/${node.id}`);
    },
    [router, threadId]
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
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
