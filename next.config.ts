import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/** Trỏ Turbopack về đúng app root — tránh đọc lockfile ở thư mục cha và bỏ qua `.env.local` của repo. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

function pickEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

const nextConfig: NextConfig = {
  /** Client Journey video — fallback tên env server / typo CND trong `.env.local`. */
  env: {
    NEXT_PUBLIC_BUNNY_LIBRARY_ID: pickEnv(
      "NEXT_PUBLIC_BUNNY_LIBRARY_ID",
      "BUNNY_LIBRARY_ID",
    ),
    NEXT_PUBLIC_BUNNY_CDN_HOSTNAME: pickEnv(
      "NEXT_PUBLIC_BUNNY_CDN_HOSTNAME",
      "BUNNY_CDN_HOSTNAME",
      "BUNNY_CND_HOSTNAME",
    ),
  },
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
