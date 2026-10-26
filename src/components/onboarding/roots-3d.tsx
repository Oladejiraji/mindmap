"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/*
 * "Ask then Branch" in 3D (three.js), after a photo of exposed roots: a
 * greyscale trunk (the question) splits into roots that spread in every
 * direction and branch down to fine tips (the answers and their
 * branches). The roots are lit tubes, fading into the dark with distance;
 * the tree turns slowly. Points of light stream through every root, trunk
 * outward, like data feeding each branch. Generated from a fixed seed.
 * Reduced motion renders one still frame (no turning, no particles).
 */

type Segment = { curve: THREE.QuadraticBezierCurve3; radius: number; depth: number; delay: number };

// Small seeded PRNG (mulberry32) so the tree is the same every time
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function growTree(): Segment[] {
  const rand = rng(11);
  const out: Segment[] = [];
  const MAX_DEPTH = 6;

  const grow = (from: THREE.Vector3, dir: THREE.Vector3, len: number, radius: number, depth: number, delay: number) => {
    const end = from.clone().addScaledVector(dir, len);
    // Bend the root a little so it reads as organic
    const mid = from
      .clone()
      .lerp(end, 0.5)
      .add(new THREE.Vector3((rand() - 0.5) * len * 0.35, (rand() - 0.5) * len * 0.2, (rand() - 0.5) * len * 0.35));
    out.push({ curve: new THREE.QuadraticBezierCurve3(from.clone(), mid, end), radius, depth, delay });
    if (depth >= MAX_DEPTH || radius < 0.008) return;
    const kids = depth < 2 ? 3 : 2 + (rand() < 0.45 ? 1 : 0);
    for (let i = 0; i < kids; i++) {
      // Wander off the parent's direction, with a pull downward
      const next = dir
        .clone()
        .add(new THREE.Vector3((rand() - 0.5) * 1.3, -0.25 - rand() * 0.25, (rand() - 0.5) * 1.3))
        .normalize();
      grow(end, next, len * (0.62 + rand() * 0.15), radius * (0.58 + rand() * 0.1), depth + 1, delay + 0.3 + rand() * 0.2);
    }
  };

  // Trunk, then the main roots fanning out around it
  const base = new THREE.Vector3(0, 0.55, 0);
  out.push({ curve: new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 2.6, 0), new THREE.Vector3(0, 1.6, 0), base), radius: 0.17, depth: 0, delay: 0 });
  const mains = 7;
  for (let i = 0; i < mains; i++) {
    const a = (i / mains) * Math.PI * 2 + rand() * 0.5;
    const dir = new THREE.Vector3(Math.cos(a), -0.3 - rand() * 0.45, Math.sin(a)).normalize();
    grow(base, dir, 1.1 + rand() * 0.4, 0.075 + rand() * 0.02, 1, 0.3 + rand() * 0.2);
  }
  return out;
}

// A soft round dot for the data particles
function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function Roots3D() {
  const hostRef = useRef<HTMLDivElement>(null);

  // A WebGL scene is an external system: build it on mount, tear it down on unmount
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      return; // no WebGL: the dark panel stays empty
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050505);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x050505, 5.2, 10);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 0.55, 6.4);
    camera.lookAt(0, 0.15, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2.5, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.7);
    rim.position.set(-3, 1, -2.5);
    scene.add(rim);

    const tree = new THREE.Group();
    scene.add(tree);

    // Roots: one merged mesh of lit tubes
    const segments = growTree();
    const tubes = segments.map((s) => new THREE.TubeGeometry(s.curve, 10, s.radius, 7, false));
    // A sphere at each joint, so a root flows into its branches without a seam
    const joints = segments.map((s) => {
      const ball = new THREE.SphereGeometry(s.radius * 1.02, 8, 6);
      const end = s.curve.getPoint(1);
      ball.translate(end.x, end.y, end.z);
      return ball;
    });
    const rootsGeometry = mergeGeometries([...tubes, ...joints]);
    [...tubes, ...joints].forEach((g) => g.dispose());
    const rootsMaterial = new THREE.MeshStandardMaterial({ color: 0xd6d6d6, roughness: 0.85, metalness: 0 });
    tree.add(new THREE.Mesh(rootsGeometry, rootsMaterial));

    // Data: points of light travelling each root, trunk outward
    const carriers = segments.flatMap((s, i) => (s.depth <= 3 ? [i, i] : [i]).map((seg, k) => ({ seg, phase: k * 0.5 })));
    const positions = new Float32Array(carriers.length * 3);
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const texture = dotTexture();
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.18,
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false, // drawn over the roots so the flow is always visible
      blending: THREE.AdditiveBlending,
      color: 0xffffff,
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    particles.visible = !reduced;
    particles.renderOrder = 1;
    tree.add(particles);
    const point = new THREE.Vector3();

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const render = (time: number) => {
      const t = time / 1000;
      tree.rotation.y = reduced ? 0.4 : 0.4 + t * 0.12;
      if (!reduced) {
        carriers.forEach((c, i) => {
          const s = segments[c.seg];
          const u = ((((t - s.delay) / 1.4 + c.phase) % 1) + 1) % 1;
          s.curve.getPoint(u, point);
          positions.set([point.x, point.y, point.z], i * 3);
        });
        particlesGeometry.attributes.position.needsUpdate = true;
      }
      renderer.render(scene, camera);
    };

    let frame = 0;
    if (reduced) {
      render(0);
    } else {
      const loop = (time: number) => {
        render(time);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      rootsGeometry.dispose();
      rootsMaterial.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} aria-hidden className="absolute inset-0" />;
}
