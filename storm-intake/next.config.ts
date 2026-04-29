import type { NextConfig } from "next";

/** Avoid custom `turbopack.root` — mismatched tracing root breaks Vercel monorepo builds (pulls repo-root `src/middleware`). */
const nextConfig: NextConfig = {};

export default nextConfig;
