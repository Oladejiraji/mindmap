"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Node as RFNode } from "@xyflow/react";
import type { MindMapNodeData } from "@/components/canvas/nodes";

export function useSyncConvexToFlow(
  rfNodes: RFNode<MindMapNodeData>[],
  setFlowNodes: React.Dispatch<React.SetStateAction<RFNode<MindMapNodeData>[]>>,
  nodes: { _id: string; parentId: string | null; title: string; position?: { x: number; y: number } | null; content?: string | null }[] | undefined,
) {
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
}
