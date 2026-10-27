"use client";
import React, { useRef, useState, type CSSProperties } from "react";
import {
  animate,
  motion,
  stagger,
  useAnimate,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useTransform,
  type AnimationPlaybackControls,
} from "motion/react";
import { cn } from "@/lib/utils";

const SCALE = 0.75;
const CARD_WIDTH = 570 * SCALE;
const CARD_HEIGHT = 861 * SCALE;
const CIRCLE_SIZE = 479 * SCALE;
const RADIUS = CIRCLE_SIZE / 2;
const MAIN_FONT_SIZE = 45 * SCALE;
const TEXT_COUNT = 35;
const MIN_OPACITY = 0.025;
const STEP_ANGLE = 360 / TEXT_COUNT;
const BLUE = "#0052FF";
const TEXT = "MindMap";
const LETTERS = TEXT.split("");
const LABELS = Array.from({ length: TEXT_COUNT }, (_, i) => i);

const WRAPPER_CLASS =
  "absolute top-1/2 left-1/2 flex justify-end origin-left pointer-events-none";
const TEXT_CLASS =
  "font-google-sans tracking-[-3%] leading-none whitespace-nowrap font-medium";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const mod = (n: number, m: number) => ((n % m) + m) % m;

// Shortest signed distance between two positions on the ring, in label steps.
const ringDiff = (from: number, to: number) =>
  mod(to - from + TEXT_COUNT / 2, TEXT_COUNT) - TEXT_COUNT / 2;

// Labels go counter-clockwise from the blue one at 0°.
const angleOf = (i: number) => -STEP_ANGLE * i;

// `rank` is how many steps behind the head a label is (0 = head, can be fractional).
const isHead = (rank: number) => rank < 1;

const opacityForRank = (rank: number) =>
  Math.max(0, 1 - ((1 - MIN_OPACITY) / (TEXT_COUNT - 1)) * rank);

const baseWrapperStyle = (rank: number, reach = 1): CSSProperties => ({
  width: RADIUS * reach,
  zIndex: isHead(rank) ? TEXT_COUNT : 0,
  opacity: isHead(rank) ? 1 : 0.7,
});

const baseTextStyle = (rank: number): CSSProperties => ({
  fontSize: MAIN_FONT_SIZE,
  color: isHead(rank) ? BLUE : "#000000",
  opacity: opacityForRank(rank),
});

const rotateTransform = (angle: number) =>
  `translateY(-50%) rotate(${angle}deg)`;

// Deterministic pseudo-random in [0, 1) so server and client render the same.
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const pointerAngle = (e: React.PointerEvent, el: HTMLElement) => {
  const rect = el.getBoundingClientRect();
  const dx = e.clientX - (rect.left + rect.width / 2);
  const dy = e.clientY - (rect.top + rect.height / 2);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
};

function Stage({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "h-screen w-full flex items-center justify-center bg-black",
        className,
      )}
      {...props}
    />
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-[#DFFBFF] flex flex-col justify-center items-center"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {children}
    </div>
  );
}

function Ring({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("relative", className)}
      style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, ...style }}
      {...props}
    />
  );
}

type LabelProps = {
  rank: number;
  angle: number;
  reach?: number;
  wrapperStyle?: CSSProperties;
  textStyle?: CSSProperties;
} & Omit<React.ComponentProps<"p">, "style">;

function Label({
  rank,
  angle,
  reach,
  wrapperStyle,
  textStyle,
  className,
  children = TEXT,
  ...props
}: LabelProps) {
  return (
    <div
      className={WRAPPER_CLASS}
      style={{
        ...baseWrapperStyle(rank, reach),
        transform: rotateTransform(angle),
        ...wrapperStyle,
      }}
    >
      <p
        className={cn(TEXT_CLASS, className)}
        style={{ ...baseTextStyle(rank), ...textStyle }}
        {...props}
      >
        {children}
      </p>
    </div>
  );
}

function StaticLabels() {
  return LABELS.map((i) => <Label key={i} rank={i} angle={angleOf(i)} />);
}

// ---------------------------------------------------------------------------
// Original
// ---------------------------------------------------------------------------

function Original() {
  return (
    <Stage>
      <Card>
        <Ring>
          <StaticLabels />
        </Ring>
      </Card>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 1. Radar sweep — the opacity gradient rotates, labels stay put
// ---------------------------------------------------------------------------

const SWEEP_MS = 4000;

function RadarSweep() {
  const [head, setHead] = useState(0);
  useAnimationFrame((time) => setHead(-(time / SWEEP_MS) * TEXT_COUNT));

  return (
    <Stage>
      <Card>
        <Ring>
          {LABELS.map((i) => (
            <Label
              key={i}
              rank={mod(i - head, TEXT_COUNT)}
              angle={angleOf(i)}
            />
          ))}
        </Ring>
      </Card>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 2. Slow drift — whole ring rotates once a minute
// ---------------------------------------------------------------------------

function SlowDrift() {
  return (
    <Stage>
      <Card>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, ease: "linear", repeat: Infinity }}
        >
          <Ring>
            <StaticLabels />
          </Ring>
        </motion.div>
      </Card>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 3. Breathing radius — labels pull in and out, staggered from the head
// ---------------------------------------------------------------------------

const BREATH_MS = 3200;
const BREATH_MIN_REACH = 0.82;

function Breathing() {
  const [time, setTime] = useState(0);
  useAnimationFrame((t) => setTime(t));

  return (
    <Stage>
      <Card>
        <Ring>
          {LABELS.map((i) => {
            const phase =
              (time / BREATH_MS) * Math.PI * 2 - (i / TEXT_COUNT) * Math.PI * 0.6;
            const breath = 0.5 + 0.5 * Math.cos(phase);
            const reach = BREATH_MIN_REACH + (1 - BREATH_MIN_REACH) * breath;
            return (
              <Label key={i} rank={i} angle={angleOf(i)} reach={reach} />
            );
          })}
        </Ring>
      </Card>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 4. Fan-out intro — all stacked at 0°, spring out to their angles
// ---------------------------------------------------------------------------

function FanOut() {
  return (
    <Stage>
      <Card>
        <Ring>
          {LABELS.map((i) => (
            <motion.div
              key={i}
              className={WRAPPER_CLASS}
              style={{ ...baseWrapperStyle(i), y: "-50%" }}
              initial={{ rotate: 0 }}
              animate={{ rotate: angleOf(i) }}
              transition={{
                type: "spring",
                stiffness: 110,
                damping: 14,
                delay: 0.4 + i * 0.015,
              }}
            >
              <p className={TEXT_CLASS} style={baseTextStyle(i)}>
                {TEXT}
              </p>
            </motion.div>
          ))}
        </Ring>
      </Card>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 5. Ink-in — labels appear one by one around the ring
// ---------------------------------------------------------------------------

function InkIn() {
  return (
    <Stage>
      <Card>
        <Ring>
          {LABELS.map((i) => (
            <div
              key={i}
              className={WRAPPER_CLASS}
              style={{ ...baseWrapperStyle(i), transform: rotateTransform(angleOf(i)) }}
            >
              <motion.p
                className={TEXT_CLASS}
                style={baseTextStyle(i)}
                initial={{ opacity: 0 }}
                animate={{ opacity: opacityForRank(i) }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 + i * 0.04 }}
              >
                {TEXT}
              </motion.p>
            </div>
          ))}
        </Ring>
      </Card>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 6. Snap-in — scattered and blurred, snap into place and focus
// ---------------------------------------------------------------------------

function SnapIn() {
  return (
    <Stage>
      <Card>
        <Ring>
          {LABELS.map((i) => (
            <motion.div
              key={i}
              className={WRAPPER_CLASS}
              style={{ ...baseWrapperStyle(i), y: "-50%" }}
              initial={{ rotate: angleOf(i) + (hash(i) * 2 - 1) * 180 }}
              animate={{ rotate: angleOf(i) }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 18,
                delay: 0.3 + hash(i + 100) * 0.4,
              }}
            >
              <motion.p
                className={TEXT_CLASS}
                style={baseTextStyle(i)}
                initial={{ opacity: 0, filter: "blur(10px)" }}
                animate={{ opacity: opacityForRank(i), filter: "blur(0px)" }}
                transition={{
                  duration: 0.7,
                  ease: "easeOut",
                  delay: 0.3 + hash(i + 100) * 0.4,
                }}
              >
                {TEXT}
              </motion.p>
            </motion.div>
          ))}
        </Ring>
      </Card>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 7. Cursor follows the head — the blue label points at the pointer
// ---------------------------------------------------------------------------

const FOLLOW_SMOOTHING_MS = 120;

function CursorFollow() {
  const ringRef = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const [head, setHead] = useState(0);

  useAnimationFrame((_, delta) => {
    setHead((current) => {
      const diff = ringDiff(current, target.current);
      if (Math.abs(diff) < 0.001) return current;
      return current + diff * Math.min(1, delta / FOLLOW_SMOOTHING_MS);
    });
  });

  return (
    <Stage
      onPointerMove={(e) => {
        if (!ringRef.current) return;
        target.current = -pointerAngle(e, ringRef.current) / STEP_ANGLE;
      }}
      onPointerLeave={() => {
        target.current = 0;
      }}
    >
      <Card>
        <Ring ref={ringRef}>
          {LABELS.map((i) => (
            <Label
              key={i}
              rank={mod(i - head, TEXT_COUNT)}
              angle={angleOf(i)}
            />
          ))}
        </Ring>
      </Card>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 8. Hover highlight — hovered label lights up and slides out
// ---------------------------------------------------------------------------

const HOVER_TRANSITION =
  "opacity 200ms ease, transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1)";

function HoverHighlight() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <Stage>
      <Card>
        <Ring onPointerLeave={() => setHovered(null)}>
          {LABELS.map((i) => {
            const distance =
              hovered === null ? Infinity : Math.abs(ringDiff(hovered, i));
            const base = opacityForRank(i);
            const boost = distance === 0 ? 1 : distance === 1 ? 0.35 : distance === 2 ? 0.15 : 0;
            const offset = distance === 0 ? 10 : distance === 1 ? 5 : distance === 2 ? 2 : 0;
            return (
              <Label
                key={i}
                rank={i}
                angle={angleOf(i)}
                className="pointer-events-auto cursor-default"
                onPointerEnter={() => setHovered(i)}
                wrapperStyle={
                  distance === 0 ? { opacity: 1, zIndex: TEXT_COUNT + 1 } : undefined
                }
                textStyle={{
                  opacity: Math.min(1, base + boost),
                  transform: `translateX(${offset}px)`,
                  transition: HOVER_TRANSITION,
                }}
              />
            );
          })}
        </Ring>
      </Card>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 9. Drag to spin — fling it, it coasts, then settles with blue back at 0°
// ---------------------------------------------------------------------------

const COAST_FRICTION = 0.998; // per ms
const SETTLE_THRESHOLD = 0.08; // deg per ms
const SETTLE_STIFFNESS = 0.0001;
const SETTLE_DAMPING = 0.016;

function DragSpin() {
  const ringRef = useRef<HTMLDivElement>(null);
  const rotation = useMotionValue(0);
  const mode = useRef<"drag" | "coast" | "settle">("settle");
  const velocity = useRef(0); // deg per ms
  const last = useRef({ angle: 0, time: 0 });

  useAnimationFrame((_, delta) => {
    if (mode.current === "drag") return;
    const dt = Math.min(delta, 32);
    let v = velocity.current;
    const r = rotation.get();

    if (mode.current === "coast") {
      v *= Math.pow(COAST_FRICTION, dt);
      if (Math.abs(v) < SETTLE_THRESHOLD) mode.current = "settle";
    } else {
      const target = Math.round(r / 360) * 360;
      v += (SETTLE_STIFFNESS * (target - r) - SETTLE_DAMPING * v) * dt;
    }

    velocity.current = v;
    rotation.set(r + v * dt);
  });

  return (
    <Stage>
      <Card>
        <div
          ref={ringRef}
          className="touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => {
            if (!ringRef.current) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            mode.current = "drag";
            velocity.current = 0;
            last.current = { angle: pointerAngle(e, ringRef.current), time: e.timeStamp };
          }}
          onPointerMove={(e) => {
            if (mode.current !== "drag" || !ringRef.current) return;
            const angle = pointerAngle(e, ringRef.current);
            const delta = mod(angle - last.current.angle + 180, 360) - 180;
            const dt = Math.max(1, e.timeStamp - last.current.time);
            rotation.set(rotation.get() + delta);
            velocity.current = velocity.current * 0.5 + (delta / dt) * 0.5;
            last.current = { angle, time: e.timeStamp };
          }}
          onPointerUp={(e) => {
            if (mode.current !== "drag") return;
            // Holding still before releasing shouldn't fling.
            if (e.timeStamp - last.current.time > 80) velocity.current = 0;
            mode.current = "coast";
          }}
          onPointerCancel={() => {
            mode.current = "coast";
          }}
        >
          <motion.div style={{ rotate: rotation }}>
            <Ring>
              <StaticLabels />
            </Ring>
          </motion.div>
        </div>
      </Card>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 10. Scroll-linked — page scroll turns the ring like a dial
// ---------------------------------------------------------------------------

function ScrollLinked() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 720]);

  return (
    <div ref={scrollRef} className="h-screen overflow-y-auto bg-black">
      <div style={{ height: "400vh" }}>
        <Stage className="sticky top-0">
          <Card>
            <motion.div style={{ rotate }}>
              <Ring>
                <StaticLabels />
              </Ring>
            </motion.div>
          </Card>
        </Stage>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 11. Click burst — labels shoot outward and spring back
// ---------------------------------------------------------------------------

function ClickBurst() {
  const [scope, animateScope] = useAnimate<HTMLDivElement>();

  const burst = async () => {
    await animateScope(
      "[data-label]",
      { x: 40 },
      { duration: 0.16, ease: "easeOut", delay: stagger(0.004) },
    );
    animateScope(
      "[data-label]",
      { x: 0 },
      { type: "spring", stiffness: 380, damping: 11 },
    );
  };

  return (
    <Stage onClick={burst} className="cursor-pointer">
      <Card>
        <Ring ref={scope}>
          {LABELS.map((i) => (
            <Label key={i} rank={i} angle={angleOf(i)} data-label />
          ))}
        </Ring>
      </Card>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 12. Shuffle — click picks a new head, the gradient sweeps to it
// ---------------------------------------------------------------------------

function Shuffle() {
  const [head, setHead] = useState(0);
  const controls = useRef<AnimationPlaybackControls | null>(null);

  const shuffle = () => {
    const current = mod(Math.round(head), TEXT_COUNT);
    let next = Math.floor(Math.random() * (TEXT_COUNT - 1));
    if (next >= current) next += 1;

    controls.current?.stop();
    controls.current = animate(head, head + ringDiff(head, next), {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setHead,
    });
  };

  return (
    <Stage onClick={shuffle} className="cursor-pointer">
      <Card>
        <Ring>
          {LABELS.map((i) => (
            <Label
              key={i}
              rank={mod(i - head, TEXT_COUNT)}
              angle={angleOf(i)}
            />
          ))}
        </Ring>
      </Card>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 13. Letter wave — a lift-and-tint ripple travels letter by letter around the ring
// ---------------------------------------------------------------------------

const WAVE_MS = 5000;
const WAVE_WIDTH = 0.7; // in label steps
const WAVE_LIFT = 6;

const waveBump = (distance: number) =>
  Math.exp(-(distance * distance) / (2 * WAVE_WIDTH * WAVE_WIDTH));

function LetterWave() {
  const [time, setTime] = useState(0);
  useAnimationFrame((t) => setTime(t));
  const wave = ((time / WAVE_MS) % 1) * TEXT_COUNT;

  return (
    <Stage>
      <Card>
        <Ring>
          {LABELS.map((i) => {
            const labelIntensity = waveBump(ringDiff(wave, i + 0.5));
            const base = opacityForRank(i);
            return (
              <Label
                key={i}
                rank={i}
                angle={angleOf(i)}
                wrapperStyle={labelIntensity > 0.05 ? { opacity: 1 } : undefined}
                textStyle={{ opacity: base + (1 - base) * labelIntensity * 0.8 }}
              >
                {LETTERS.map((letter, j) => {
                  const intensity = waveBump(
                    ringDiff(wave, i + j / LETTERS.length),
                  );
                  return (
                    <span
                      key={j}
                      className="inline-block"
                      style={{
                        transform: `translateY(${-WAVE_LIFT * intensity}px)`,
                        color: `color-mix(in srgb, ${BLUE} ${Math.round(intensity * 100)}%, currentColor)`,
                      }}
                    >
                      {letter}
                    </span>
                  );
                })}
              </Label>
            );
          })}
        </Ring>
      </Card>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// Picker
// ---------------------------------------------------------------------------

type Variant = {
  id: string;
  label: string;
  hint?: string;
  replayable?: boolean;
  Component: () => React.ReactNode;
};

const VARIANTS: Variant[] = [
  { id: "original", label: "Original", Component: Original },
  { id: "radar", label: "1. Radar sweep", Component: RadarSweep },
  { id: "drift", label: "2. Slow drift", Component: SlowDrift },
  { id: "breathing", label: "3. Breathing radius", Component: Breathing },
  { id: "fan-out", label: "4. Fan-out intro", replayable: true, Component: FanOut },
  { id: "ink-in", label: "5. Ink-in intro", replayable: true, Component: InkIn },
  { id: "snap-in", label: "6. Snap-in intro", replayable: true, Component: SnapIn },
  { id: "cursor", label: "7. Cursor follows head", hint: "Move your pointer around", Component: CursorFollow },
  { id: "hover", label: "8. Hover highlight", hint: "Hover over the labels", Component: HoverHighlight },
  { id: "drag", label: "9. Drag to spin", hint: "Grab the circle and fling it", Component: DragSpin },
  { id: "scroll", label: "10. Scroll-linked", hint: "Scroll down", Component: ScrollLinked },
  { id: "burst", label: "11. Click burst", hint: "Click anywhere", Component: ClickBurst },
  { id: "shuffle", label: "12. Shuffle", hint: "Click anywhere", Component: Shuffle },
  { id: "wave", label: "13. Letter wave", Component: LetterWave },
];

export default function Page() {
  const [variantId, setVariantId] = useState(VARIANTS[0].id);
  const [runId, setRunId] = useState(0);
  const variant = VARIANTS.find((v) => v.id === variantId) ?? VARIANTS[0];
  const { Component } = variant;

  return (
    <>
      <Component key={`${variant.id}-${runId}`} />

      <div
        className="fixed left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5"
        style={{ bottom: `calc(50% + ${CARD_HEIGHT / 2 + 12}px)` }}
      >
        <div className="flex items-center gap-2">
          {variant.replayable && (
            <button
              type="button"
              onClick={() => setRunId((n) => n + 1)}
              className="h-8 rounded-md px-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              Replay
            </button>
          )}
          <select
            value={variant.id}
            onChange={(e) => {
              setVariantId(e.target.value);
              setRunId(0);
            }}
            className="h-8 rounded-md bg-white/10 px-2.5 text-sm text-white outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/40"
          >
            {VARIANTS.map((v) => (
              <option key={v.id} value={v.id} className="bg-neutral-900">
                {v.label}
              </option>
            ))}
          </select>
        </div>
        {variant.hint && <p className="text-xs text-white/50">{variant.hint}</p>}
      </div>
    </>
  );
}
