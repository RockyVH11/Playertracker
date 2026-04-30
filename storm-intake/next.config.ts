import type { NextConfig } from "next";
import path from "node:path";

/**
 * Monorepo guard: Next.js warns when multiple package-lock.json files exist and picks the repo
 * root as the inferred workspace root, which breaks Vercel’s Next builder (looks for `.next/` at `/vercel/path0/.next`).
 * Pin tracing root to **this app** explicitly. Prod uses `next build --webpack` to avoid compiling the root app’s middleware.
 *
 * Storm Intake commits no package-lock.json; only root `Player tracker/package-lock.json` should remain.
 */
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
