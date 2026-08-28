import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve("."),
  turbopack: {
    root: path.resolve("."),
  },
};

export default nextConfig;
