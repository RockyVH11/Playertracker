import type { NextConfig } from "next";
import path from "node:path";

/**
 * In a monorepo, Next may set tracing root to the repo root (`..`) and then compile the
 * *parent* app's `src/middleware.ts`. Pin tracing to this app folder only on Vercel/Linux.
 *
 * Keep `turbopack.root` unset so it stays aligned with this value.
 */
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
