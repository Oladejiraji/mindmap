import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev badge has no free corner (account control bottom-left,
  // Agentation bottom-right, page actions top-right). Errors still show the
  // full-screen dev overlay.
  devIndicators: false,
  turbopack: {
    // Pin the root to this project. Without it, a stray lockfile in a parent
    // directory (e.g. ~/package-lock.json) makes Turbopack treat that parent
    // as the root, which slows file watching and served stale CSS.
    root: path.join(__dirname),
  },
};

export default nextConfig;
