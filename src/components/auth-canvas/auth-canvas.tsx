"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  addEdge,
  reconnectEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { BrandCardNode } from "./brand-card-node";
import { ResearchCardNode } from "./research-card-node";
import { GradientEdge } from "./gradient-edge";
import AuthAssets from "@/lib/asset-export/auth";

const FIT_VIEW_OPTIONS = { padding: 0.18 };

const nodeTypes: NodeTypes = {
  brandCard: BrandCardNode,
  researchCard: ResearchCardNode,
};

const edgeTypes: EdgeTypes = {
  gradient: GradientEdge,
};

const SAMPLE_BODY =
  "Structuring a brand Guideline can be tricky with the right setup and the right set of tools and partners you can get it as soon as humanly possible.";

const initialNodes: Node[] = [
  {
    id: "top-brand",
    type: "brandCard",
    position: { x: 40, y: 0 },
    data: {
      width: 430,
      handles: ["bottom"],
      handleVariant: "a",
      author: {
        name: "Lex Porto",
        role: "Research Lead",
        image: AuthAssets.AuthAvatar1,
        bg: "#2D2D2D",
      },
      pages: 13,
      body: SAMPLE_BODY,
    },
  },
  {
    id: "research",
    type: "researchCard",
    position: { x: 380, y: 180 },
    data: {
      width: 430,
      author: {
        name: "Oladeji Raji",
        image: AuthAssets.AuthAvatar2,
        role: "is currently researching…",
        bg: "#2D2D2D",
      },
      status: "currently researching…",
      pages: 13,
      title: "How Koto Structures Design briefs",
      body: SAMPLE_BODY,
    },
  },
  {
    id: "middle-brand",
    type: "brandCard",
    position: { x: 60, y: 360 },
    data: {
      width: 315,
      handles: ["top"],
      handleVariant: "a",
      showModel: true,
      author: {
        name: "Felipe Rocha",
        image: AuthAssets.AuthAvatar3,
        bg: "#3476FB",
      },
      pages: 13,
      body: SAMPLE_BODY,
    },
  },
  {
    id: "bottom-brand",
    type: "brandCard",
    position: { x: 100, y: 620 },
    data: {
      width: 315,
      handles: ["top"],
      handleVariant: "a",
      pages: 13,
      body: SAMPLE_BODY,
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e-top-middle",
    source: "top-brand",
    target: "middle-brand",
    type: "gradient",
    style: { strokeWidth: 1.5 },
    data: { label: { name: "Oladeji Raji" } },
  },
  {
    id: "e-research-middle",
    source: "research",
    target: "middle-brand",
    type: "gradient",
    style: { strokeWidth: 1.5 },
  },
];

const NEW_EDGE_DEFAULTS = {
  type: "gradient",
  style: { strokeWidth: 1.5 },
} as const;

export function AuthCanvas() {
  return (
    <ReactFlowProvider>
      <AuthCanvasInner />
    </ReactFlowProvider>
  );
}

function AuthCanvasInner() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { fitView, getViewport, getNode } = useReactFlow();
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const reconnectSuccessful = useRef(true);

  const isValidConnection = useCallback(
    (conn: Connection | Edge) => {
      if (conn.source === conn.target) return false;
      return !edges.some(
        (e) =>
          (e.source === conn.source && e.target === conn.target) ||
          (e.source === conn.target && e.target === conn.source),
      );
    },
    [edges],
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((eds) => addEdge({ ...conn, ...NEW_EDGE_DEFAULTS }, eds));
    },
    [setEdges],
  );

  const onReconnectStart = useCallback(() => {
    reconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      reconnectSuccessful.current = true;
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    [setEdges],
  );

  const onReconnectEnd = useCallback(
    (_: unknown, edge: Edge) => {
      if (!reconnectSuccessful.current) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }
      reconnectSuccessful.current = true;
    },
    [setEdges],
  );

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      fitView(FIT_VIEW_OPTIONS);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitView]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) {
        onNodesChange(changes);
        return;
      }
      const { width: cw, height: ch } = wrapper.getBoundingClientRect();
      const { x: vx, y: vy, zoom } = getViewport();
      const minX = -vx / zoom;
      const minY = -vy / zoom;
      const maxX = (cw - vx) / zoom;
      const maxY = (ch - vy) / zoom;

      const clamped = changes.map((change) => {
        if (change.type !== "position" || !change.position) return change;
        const node = getNode(change.id);
        const w = node?.measured?.width ?? 0;
        const h = node?.measured?.height ?? 0;
        return {
          ...change,
          position: {
            x: Math.max(minX, Math.min(change.position.x, maxX - w)),
            y: Math.max(minY, Math.min(change.position.y, maxY - h)),
          },
        };
      });
      onNodesChange(clamped);
    },
    [getViewport, getNode, onNodesChange],
  );

  return (
    <div
      ref={wrapperRef}
      className="auth-canvas relative h-full w-full overflow-hidden rounded-xl bg-background"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        autoPanOnNodeDrag={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255,255,255,0.06)"
        />
      </ReactFlow>
    </div>
  );
}
