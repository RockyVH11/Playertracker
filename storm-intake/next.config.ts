import type { NextConfig } from "next";

/** Monorepo: do not set `outputFileTracingRoot` here — on Vercel it can make lookups use `/vercel/path0/.next` instead of `./.next`. Parent `middleware.ts` is avoided via `next build --webpack`. */
const nextConfig: NextConfig = {};

export default nextConfig;
