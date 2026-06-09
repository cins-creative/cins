import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/** Trỏ Turbopack về đúng app root — tránh đọc lockfile ở thư mục cha và bỏ qua `.env.local` của repo. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /** Một bản ProseMirror/Tiptap — tránh RangeError gapcursor khi split chunk. */
  transpilePackages: [
    "@tiptap/react",
    "@tiptap/starter-kit",
    "@tiptap/pm",
    "@tiptap/extension-image",
    "@tiptap/extension-link",
    "@tiptap/extension-placeholder",
    "@tiptap/extension-table",
    "@tiptap/extension-youtube",
  ],
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "maac.edu.vn",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ospzzzxcomrmhqrnkoiw.supabase.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "imagedelivery.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
