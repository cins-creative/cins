"use client";

import dynamic from "next/dynamic";

import { SidebarBrandStaticLink } from "@/components/cins/SidebarBrandStaticLink";

const CinsSidebarRiveBrandCanvas = dynamic(
  () =>
    import("@/components/cins/CinsSidebarRiveBrandCanvas").then(
      (mod) => mod.CinsSidebarRiveBrandCanvas,
    ),
  {
    ssr: false,
    loading: () => <SidebarBrandStaticLink />,
  },
);

type Props = {
  sidebarId?: string;
};

/** Logo sidebar — Rive (client-only) với fallback SVG khi load. */
export function CinsSidebarRiveBrand({ sidebarId = "app-sidebar" }: Props) {
  return <CinsSidebarRiveBrandCanvas sidebarId={sidebarId} />;
}
