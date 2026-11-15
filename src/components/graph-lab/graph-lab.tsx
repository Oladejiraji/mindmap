"use client";
import React, { useEffect, useRef, useState } from "react";
import { LAYOUTS, type LayoutId } from "./layouts";
import { GraphScene, PALETTES, type IStyle, type NodeStyle } from "./scene";

const INITIAL = { seed: 7, count: 48, layout: "radial" as LayoutId };

const INITIAL_STYLE: IStyle = {
  palette: PALETTES[0],
  nodeStyle: "ring",
  curve: 0.25,
  nodeSize: 7,
  lineage: true,
  autoplay: true,
  rotate: true,
};

function Segmented<T extends string>(props: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  const { value, options, onChange } = props;
  return (
    <div className="flex gap-1 rounded-lg bg-[#F1F1F1] p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`h-6 flex-1 rounded-md px-2 text-xs cursor-pointer transition-colors ${
            o.id === value ? "bg-white text-[#0A0A0A] shadow-[0_1px_2px_#0000001a]" : "text-[#737373] hover:text-[#262626]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field(props: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#737373]">{props.label}</span>
        <span className="text-[#262626] tabular-nums">{props.value}</span>
      </div>
      {props.children}
    </div>
  );
}

function Toggle(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-xs text-[#737373] cursor-pointer">
      {props.label}
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="accent-[#106CFB] cursor-pointer"
      />
    </label>
  );
}

const range = "w-full accent-[#106CFB] cursor-pointer";

/**
 * A lab for the graph language: one seeded tree, three layouts it morphs
 * between, and the style knobs a brand would lock or expose.
 */
export function GraphLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<GraphScene | null>(null);

  const [layout, setLayout] = useState<LayoutId>(INITIAL.layout);
  const [count, setCount] = useState(INITIAL.count);
  const [seed, setSeed] = useState(INITIAL.seed);
  const [style, setStyle] = useState<IStyle>(INITIAL_STYLE);

  // Owns the scene and its animation loop: a canvas and rAF are outside React.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const scene = new GraphScene(INITIAL.seed, INITIAL.count, INITIAL.layout, INITIAL_STYLE);
    scene.onLayoutChange = setLayout;
    sceneRef.current = scene;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      scene.step((now - last) / 1000);
      last = now;
      scene.draw(ctx, canvas.width, canvas.height, window.devicePixelRatio || 1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      sceneRef.current = null;
    };
  }, []);

  const updateStyle = (patch: Partial<IStyle>) => {
    const next = { ...style, ...patch };
    setStyle(next);
    if (sceneRef.current) sceneRef.current.style = next;
  };

  const changeLayout = (id: LayoutId) => {
    setLayout(id);
    sceneRef.current?.setLayout(id);
  };

  const changeCount = (n: number) => {
    setCount(n);
    sceneRef.current?.setCount(n);
  };

  const changeSeed = (s: number) => {
    setSeed(s);
    sceneRef.current?.setSeed(s);
  };

  const exportPng = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mindmap-${layout}-${seed}-${count}.png`;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="relative h-screen w-full overflow-hidden" style={{ background: style.palette.bg }}>
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />

      <div className="absolute right-4 top-4 flex w-64 flex-col gap-4 rounded-xl bg-white/95 p-4 shadow-[0_0_0_0.5px_#0000000f,0_8px_32px_-8px_#00000033] backdrop-blur max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-[#0A0A0A]">Graph language</p>
          <p className="text-xs text-[#737373]">One tree, many shapes</p>
        </div>

        <Field label="Layout">
          <Segmented value={layout} options={LAYOUTS} onChange={changeLayout} />
        </Field>

        <Field label="Nodes" value={String(count)}>
          <input type="range" min={6} max={160} value={count} onChange={(e) => changeCount(Number(e.target.value))} className={range} />
        </Field>

        <Field label="Seed" value={String(seed)}>
          <div className="flex gap-1">
            <input
              type="number"
              value={seed}
              onChange={(e) => changeSeed(Number(e.target.value) || 0)}
              className="h-7 min-w-0 flex-1 rounded-md bg-[#F1F1F1] px-2 text-xs text-[#262626] outline-none"
            />
            <button
              type="button"
              onClick={() => changeSeed(Math.floor(Math.random() * 100000))}
              className="h-7 rounded-md bg-[#F1F1F1] px-2 text-xs text-[#262626] cursor-pointer hover:bg-[#E8E8E8]"
            >
              Shuffle
            </button>
          </div>
        </Field>

        <Field label="Curve" value={style.curve.toFixed(2)}>
          <input type="range" min={0} max={1} step={0.01} value={style.curve} onChange={(e) => updateStyle({ curve: Number(e.target.value) })} className={range} />
        </Field>

        <Field label="Node size" value={String(style.nodeSize)}>
          <input type="range" min={2} max={16} step={0.5} value={style.nodeSize} onChange={(e) => updateStyle({ nodeSize: Number(e.target.value) })} className={range} />
        </Field>

        <Field label="Node style">
          <Segmented<NodeStyle>
            value={style.nodeStyle}
            options={[
              { id: "ring", label: "Ring" },
              { id: "dot", label: "Dot" },
            ]}
            onChange={(nodeStyle) => updateStyle({ nodeStyle })}
          />
        </Field>

        <Field label="Palette">
          <div className="flex gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => updateStyle({ palette: p })}
                className={`flex flex-1 flex-col items-center gap-1 rounded-md p-1 text-xs cursor-pointer ${
                  p.id === style.palette.id ? "bg-[#F1F1F1] text-[#0A0A0A]" : "text-[#737373] hover:text-[#262626]"
                }`}
              >
                <span className="size-6 rounded-full shadow-[inset_0_0_0_1px_#0000001a]" style={{ background: p.bg }} />
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex flex-col gap-2">
          <Toggle label="Lineage" checked={style.lineage} onChange={(lineage) => updateStyle({ lineage })} />
          <Toggle label="Cycle layouts" checked={style.autoplay} onChange={(autoplay) => updateStyle({ autoplay })} />
          <Toggle label="Rotate" checked={style.rotate} onChange={(rotate) => updateStyle({ rotate })} />
        </div>

        <button
          type="button"
          onClick={exportPng}
          className="h-8 rounded-lg bg-[#106CFB] text-xs font-medium text-white cursor-pointer hover:bg-[#0A5CE0]"
        >
          Export PNG
        </button>
      </div>
    </div>
  );
}
