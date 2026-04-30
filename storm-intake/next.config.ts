import type { NextConfig } from "next";
import path from "node:path";

const appRoot = path.join(__dirname);

/**
 * Monorepo: Next otherwise treats the *repo* root as the Turbopack/tracing root on Vercel and
 * compiles the parent `src/middleware.ts`. Both values must match (Next 16 enforces this).
 */
const nextConfig: NextConfig = {
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
  },
};

export default nextConfig;
