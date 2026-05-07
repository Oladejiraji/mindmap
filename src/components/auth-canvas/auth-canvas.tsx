"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  ViewportPortal,
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
import { motion } from "motion/react";

import { BrandCardNode } from "./brand-card-node";
import { ResearchCardNode } from "./research-card-node";
import { GradientEdge } from "./gradient-edge";
import { CustomCursor } from "./custom-cursor";
import { usePulseConfig } from "./pulse-config";
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
      width: 315,
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

const PERFECT_CIRCLE_RADIUS = "50% 50% 50% 50%";

const DISTORT_SHAPES: number[][] = [
  [25, 75, 35, 65],
  [70, 30, 75, 25],
  [40, 65, 75, 30],
];

const DISTORT_ROTATIONS = [28, -24, 18];

const RING_COLORS = ["#ff5fa2", "#ffb155", "#5fb8ff"];

function buildDistortRadius(nums: number[], intensity: number): string {
  const lerp = (a: number) => 50 + (a - 50) * intensity;
  const [a, b, c, d] = nums;
  return `${lerp(a)}% ${lerp(b)}% ${lerp(c)}% ${lerp(d)}%`;
}

export function AuthCanvas() {
  return (
    <ReactFlowProvider>
      <AuthCanvasInner />
    </ReactFlowProvider>
  );
}

type Pulse = {
  id: string;
  nodeId: string;
  cx: number;
  cy: number;
  nodeWidth: number;
};

const NODE_INSET_PX = 8;

function AuthCanvasInner() {
  const PULSE_CONFIG = usePulseConfig();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const { fitView, getViewport, getNode } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [pulses, setPulses] = useState<Pulse[]>([]);

  const reconnectSuccessful = useRef(true);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (cursorRef.current) cursorRef.current.style.opacity = "1";
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (cursorRef.current) cursorRef.current.style.opacity = "0";
  }, []);

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

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const w = node.measured?.width ?? 0;
      const h = node.measured?.height ?? 0;
      if (!w || !h) return;
      const trigger = Date.now();
      const offsetY =
        node.type === "brandCard"
          ? PULSE_CONFIG.originOffsetY - 0.15
          : PULSE_CONFIG.originOffsetY;
      setPulses((prev) => [
        ...prev.filter((p) => p.nodeId !== node.id),
        {
          id: `${node.id}-${trigger}`,
          nodeId: node.id,
          cx: node.position.x + w / 2,
          cy: node.position.y + h * offsetY,
          nodeWidth: w,
        },
      ]);
      setNodes((ns) =>
        ns.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, pulseTrigger: trigger } }
            : n,
        ),
      );
    },
    [PULSE_CONFIG.originOffsetY, setNodes],
  );

  const removePulse = useCallback((id: string) => {
    setPulses((prev) => prev.filter((p) => p.id !== id));
  }, []);

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
      className="auth-canvas relative h-full w-full cursor-none overflow-hidden rounded-xl bg-background"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
        onNodeDragStop={onNodeDragStop}
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
        <ViewportPortal>
          {pulses.map((p) => {
            const endWidth = Math.max(
              PULSE_CONFIG.startDiameter,
              p.nodeWidth - NODE_INSET_PX * 2,
            );
            return (
              <div
                key={p.id}
                className="auth-pulse"
                style={{ left: p.cx, top: p.cy }}
              >
                {PULSE_CONFIG.ringDelays.map((delay, i) => {
                  const isLast = i === PULSE_CONFIG.ringDelays.length - 1;
                  const shape = DISTORT_SHAPES[i % DISTORT_SHAPES.length];
                  const rot =
                    DISTORT_ROTATIONS[i % DISTORT_ROTATIONS.length] *
                    PULSE_CONFIG.distortion;
                  const distortedRadius = buildDistortRadius(
                    shape,
                    PULSE_CONFIG.distortion,
                  );
                  const distortTimes = [
                    0,
                    PULSE_CONFIG.distortionStart,
                    1,
                  ] as const;
                  const filterId = `vstreak-${p.id}-${i}`;
                  return (
                    <Fragment key={i}>
                      <svg
                        style={{
                          position: "absolute",
                          width: 0,
                          height: 0,
                          pointerEvents: "none",
                        }}
                        aria-hidden
                      >
                        <defs>
                          <filter
                            id={filterId}
                            x="-50%"
                            y="-200%"
                            width="200%"
                            height="500%"
                            colorInterpolationFilters="sRGB"
                          >
                            <motion.feGaussianBlur
                              initial={{ stdDeviation: "0 0" }}
                              animate={{
                                stdDeviation: `${PULSE_CONFIG.blurX} ${PULSE_CONFIG.blur}`,
                              }}
                              transition={{
                                duration: PULSE_CONFIG.duration,
                                delay,
                                ease: "easeIn",
                              }}
                            />
                          </filter>
                        </defs>
                      </svg>
                      <motion.div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          translateX: "-50%",
                          translateY: "-50%",
                          border: `${PULSE_CONFIG.strokeWidth}px solid ${RING_COLORS[i % RING_COLORS.length]}`,
                          pointerEvents: "none",
                          filter: `url(#${filterId})`,
                          maskImage:
                            "linear-gradient(to bottom, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 1) 50%, rgb(0 0 0 / 0.05) 50%, rgb(0 0 0 / 0.05) 100%)",
                          WebkitMaskImage:
                            "linear-gradient(to bottom, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 1) 50%, rgb(0 0 0 / 0.05) 50%, rgb(0 0 0 / 0.05) 100%)",
                        }}
                        initial={{
                          width: PULSE_CONFIG.startDiameter,
                          height: PULSE_CONFIG.startDiameter,
                          opacity: 0,
                          borderRadius: PERFECT_CIRCLE_RADIUS,
                          rotate: 0,
                        }}
                        animate={{
                          width: endWidth,
                          height: PULSE_CONFIG.endDiameter,
                          opacity: [...PULSE_CONFIG.opacityKeyframes],
                          borderRadius: [
                            PERFECT_CIRCLE_RADIUS,
                            PERFECT_CIRCLE_RADIUS,
                            distortedRadius,
                          ],
                          rotate: [0, 0, rot],
                        }}
                        transition={{
                          duration: PULSE_CONFIG.duration,
                          delay,
                          ease: [...PULSE_CONFIG.ease],
                          opacity: {
                            duration: PULSE_CONFIG.duration,
                            delay,
                            ease: PULSE_CONFIG.opacityEase,
                            times: [...PULSE_CONFIG.opacityTimes],
                          },
                          borderRadius: {
                            duration: PULSE_CONFIG.duration,
                            delay,
                            ease: "easeIn",
                            times: [...distortTimes],
                          },
                          rotate: {
                            duration: PULSE_CONFIG.duration,
                            delay,
                            ease: "easeIn",
                            times: [...distortTimes],
                          },
                        }}
                        onAnimationComplete={
                          isLast ? () => removePulse(p.id) : undefined
                        }
                      />
                      <motion.div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          translateX: "-50%",
                          translateY: "-50%",
                          borderStyle: "solid",
                          borderColor: RING_COLORS[i % RING_COLORS.length],
                          pointerEvents: "none",
                          filter: `url(#${filterId})`,
                          maskImage:
                            "linear-gradient(to bottom, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 1) 50%, rgb(0 0 0 / 0.05) 50%, rgb(0 0 0 / 0.05) 100%)",
                          WebkitMaskImage:
                            "linear-gradient(to bottom, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 1) 50%, rgb(0 0 0 / 0.05) 50%, rgb(0 0 0 / 0.05) 100%)",
                        }}
                        initial={{
                          width: PULSE_CONFIG.startDiameter,
                          height: PULSE_CONFIG.startDiameter,
                          borderWidth: 2,
                          opacity: 1,
                          borderRadius: PERFECT_CIRCLE_RADIUS,
                          rotate: 0,
                        }}
                        animate={{
                          width: endWidth,
                          height: PULSE_CONFIG.endDiameter,
                          borderWidth: PULSE_CONFIG.strokeWidth,
                          opacity: 0,
                          borderRadius: [
                            PERFECT_CIRCLE_RADIUS,
                            PERFECT_CIRCLE_RADIUS,
                            distortedRadius,
                          ],
                          rotate: [0, 0, rot],
                        }}
                        transition={{
                          duration: PULSE_CONFIG.duration,
                          delay,
                          ease: [...PULSE_CONFIG.ease],
                          borderWidth: {
                            duration: PULSE_CONFIG.duration,
                            delay,
                            ease: "easeIn",
                          },
                          opacity: {
                            duration: PULSE_CONFIG.duration,
                            delay,
                            ease: "easeIn",
                          },
                          borderRadius: {
                            duration: PULSE_CONFIG.duration,
                            delay,
                            ease: "easeIn",
                            times: [...distortTimes],
                          },
                          rotate: {
                            duration: PULSE_CONFIG.duration,
                            delay,
                            ease: "easeIn",
                            times: [...distortTimes],
                          },
                        }}
                      />
                    </Fragment>
                  );
                })}
              </div>
            );
          })}
        </ViewportPortal>
      </ReactFlow>
      <CustomCursor ref={cursorRef} />
    </div>
  );
}
