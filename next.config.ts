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
  async redirects() {
    return [
      /* Hub tổ chức gộp về /to-chuc — chỉ khớp path listing (exact), không đụng /:slug detail. */
      {
        source: "/co-so-dao-tao",
        destination: "/to-chuc",
        permanent: true,
      },
      {
        source: "/studio",
        destination: "/to-chuc",
        permanent: true,
      },
      {
        source: "/truong-dai-hoc",
        destination: "/to-chuc",
        permanent: true,
      },
      {
        source: "/dieu-khoan",
        destination: "/termandservice",
        permanent: true,
      },
      {
        source: "/terms",
        destination: "/termandservice",
        permanent: true,
      },
      {
        source: "/terms-of-service",
        destination: "/termandservice",
        permanent: true,
      },
      {
        source: "/term-and-service",
        destination: "/termandservice",
        permanent: true,
      },
    ];
  },
  /** Client video env — Bunny (đang migrate) + Cloudflare Stream/R2 (đích). */
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
    /** Mã customer subdomain phát Cloudflare Stream (customer-xxxx). */
    NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE: pickEnv(
      "NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE",
      "CLOUDFLARE_STREAM_CUSTOMER_CODE",
    ),
    /** Custom domain công khai gắn vào bucket R2 video chat (vd https://chat-video.cins.vn). */
    NEXT_PUBLIC_CHAT_VIDEO_BASE_URL: pickEnv("NEXT_PUBLIC_CHAT_VIDEO_BASE_URL"),
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
