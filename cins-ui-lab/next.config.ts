import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const labRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Isolate from monorepo parent lockfile / middleware / postcss
  turbopack: {
    root: labRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imagedelivery.net",
      },
    ],
  },
};

export default nextConfig;
