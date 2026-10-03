import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The enclosing git repo is the home folder; keep Turbopack rooted here.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
