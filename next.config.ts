import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the root to this project. Without it, a stray lockfile in a parent
    // directory (e.g. ~/package-lock.json) makes Turbopack treat that parent
    // as the root, which slows file watching and served stale CSS.
    root: path.join(__dirname),
  },
};

export default nextConfig;
