import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
