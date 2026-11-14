import type { NextConfig } from "next";

// Ojo: no activar `cacheComponents` ni `partialPrefetching` (vienen en el template de Next 16):
// con @opennextjs/cloudflare 1.20 cuelgan el Worker. Ver obsidian/Stack.md.
const nextConfig: NextConfig = {};

export default nextConfig;

import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
