"use client";
import React, { useEffect, useRef } from "react";
import Matter from "matter-js";

interface IProps {
  size?: number;
  ballSize?: number;
}

export default function BrandingBalls(props: IProps) {
  const { size = 400, ballSize = 30 } = props;
  const ref = useRef<HTMLDivElement>(null);

  console.log(size);

  useEffect(() => {
    const {
      Engine,
      Render,
      Bodies,
      Mouse,
      MouseConstraint,
      Composite,
      Runner,
    } = Matter;
    const width = size;
    const height = size;
    const cx = width / 2;
    const cy = height / 2;
    const radius = size / 2;

    if (!ref.current) return;

    const engine = Engine.create();
    const render = Render.create({
      element: ref.current,
      engine,
      options: {
        width,
        height,
        wireframes: false,
        background: "#00277A",
      },
    });

    const segments = 64,
      thickness = 20;
    const wall = [];

    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const segLen = (2 * Math.PI * (radius + thickness / 2)) / segments + 2;
      wall.push(
        Bodies.rectangle(
          cx + Math.cos(a) * (radius + thickness / 2),
          cy + Math.sin(a) * (radius + thickness / 2),
          segLen,
          thickness,
          {
            isStatic: true,
            angle: a + Math.PI / 2,
            render: { fillStyle: "transparent" },
          },
        ),
      );
    }

    const balls = Array.from({ length: 17 }, (_, index) =>
      Bodies.circle(
        index === 0 ? 300 : cx + (Math.random() - 0.5) * 200,
        index === 0 ? 100 : cy + (Math.random() - 0.5) * 200,
        ballSize,
        // 10 + Math.random() * 15,
        {
          restitution: 0.8,
          friction: 0.01,
          render: {
            fillStyle: index === 0 ? "#ffffff" : "#0052FF",
          },
        },
      ),
    );

    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });

    Composite.add(engine.world, [...wall, ...balls, mouseConstraint]);
    render.mouse = mouse;

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      render.canvas.remove();
    };
  }, []);

  return (
    <div
      ref={ref}
      className="rounded-full overflow-hidden"
      style={{
        width: size,
        height: size,
      }}
    ></div>
  );
}
