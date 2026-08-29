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

const cinsSurface = process.env.CINS_SURFACE ?? "";

const nextConfig: NextConfig = {
  async redirects() {
    const redirects = [
      /* Hub tổ chức gộp về /to-chuc — chỉ khớp path listing (exact), không đụng /:slug detail. */
      {
        source: "/university",
        destination: "/organizations",
        permanent: true,
      },
      {
        source: "/studio",
        destination: "/organizations",
        permanent: true,
      },
      {
        source: "/university",
        destination: "/organizations",
        permanent: true,
      },
      {
        source: "/dieu-khoan",
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/terms",
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/terms-of-service",
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/term-and-service",
        destination: "/terms",
        permanent: true,
      },
      /* Hub thư viện nghề gỡ khỏi nav — exact /careers → trang chủ. Giữ /careers/:slug. */
      {
        source: "/careers",
        destination: "/",
        permanent: true,
      },
      /* phan_mem đã gộp vào keyword — URL cũ /software/[slug] → /keyword/[slug] */
      {
        source: "/software/:slug",
        destination: "/keyword/:slug",
        permanent: true,
      },
    ];
    if (cinsSurface === "web") {
      redirects.push(
        {
          source: "/admin",
          destination: "/auth/to-manage?next=/admin",
          permanent: false,
        },
        {
          source: "/admin/:path*",
          destination: "/auth/to-manage?next=/admin/:path*",
          permanent: false,
        },
        {
          source: "/api/admin/:path*",
          destination: "https://manage.cins.vn/api/admin/:path*",
          permanent: false,
        },
        {
          source: "/seller",
          destination: "/auth/to-manage?next=/seller",
          permanent: false,
        },
        {
          source: "/seller/:path*",
          destination: "/auth/to-manage?next=/seller/:path*",
          permanent: false,
        },
        {
          source: "/academy/:slug/manage",
          destination: "/auth/to-manage?next=/academy/:slug",
          permanent: false,
        },
        {
          source: "/academy/:slug/manage/:path*",
          destination: "/auth/to-manage?next=/academy/:slug/:path*",
          permanent: false,
        },
        {
          source: "/studio/:slug/manage",
          destination: "/auth/to-manage?next=/studio/:slug",
          permanent: false,
        },
        {
          source: "/studio/:slug/manage/:path*",
          destination: "/auth/to-manage?next=/studio/:slug/:path*",
          permanent: false,
        },
        {
          source: "/university/:slug/manage",
          destination: "/auth/to-manage?next=/university/:slug",
          permanent: false,
        },
        {
          source: "/university/:slug/manage/:path*",
          destination: "/auth/to-manage?next=/university/:slug/:path*",
          permanent: false,
        },
      );
    }
    return redirects;
  },
  async rewrites() {
    if (cinsSurface !== "manage") return [];
    /* Org pretty URL (`/academy/:slug/students`) do middleware rewrite
     * — next.config không loại được path đã có `/manage`. */
    return [
      { source: "/shop/:slug", destination: "/seller/store" },
      { source: "/shop/:slug/:path*", destination: "/seller/:path*" },
    ];
  },
  /**
   * Build theo bề mặt park `app/` — file ngoài surface vẫn bị tsc quét
   * (import type từ route đã park). Chỉ nới trên deploy:web / deploy:manage.
   */
  typescript: {
    ignoreBuildErrors: cinsSurface === "web" || cinsSurface === "manage",
  },
  /** Client video env — Cloudflare Stream / R2 chat video. */
  env: {
    /** Bề mặt build (`web` | `manage`) — inlined client để `webHref`/`manageHref` khớp SSR. */
    CINS_SURFACE: cinsSurface,
    /** Mã customer subdomain phát Cloudflare Stream (customer-xxxx). */
    NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE: pickEnv(
      "NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE",
      "CLOUDFLARE_STREAM_CUSTOMER_CODE",
    ),
    /** Custom domain công khai gắn vào bucket R2 video chat (vd https://chat-video.cins.vn). */
    NEXT_PUBLIC_CHAT_VIDEO_BASE_URL: pickEnv("NEXT_PUBLIC_CHAT_VIDEO_BASE_URL"),
  },
  /**
   * RealtimeKit chỉ chạy trên browser nhưng webpack vẫn emit ~2.8MB chunk vào
   * `.next/server`, và OpenNext bundle toàn bộ thư mục đó vào Worker → sát trần
   * 10MB gzip. Call site đều `ssr: false` nên server không cần module thật.
   * Chỉ alias ở production build; dev giữ nguyên để HMR/trace không lệch.
   */
  webpack(config, { isServer, dev }) {
    if (isServer && !dev) {
      const stub = path.join(projectRoot, "lib/media/realtimekit-server-stub.cjs");
      config.resolve.alias = {
        ...config.resolve.alias,
        "@cloudflare/realtimekit-react-ui": stub,
        "@cloudflare/realtimekit-react": stub,
        "@cloudflare/realtimekit-ui": stub,
        "@cloudflare/realtimekit": stub,
      };
    }
    return config;
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
