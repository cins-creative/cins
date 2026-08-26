"use client";

import dynamic from "next/dynamic";

import { SidebarBrandStaticLink } from "@/components/cins/SidebarBrandStaticLink";
import { SoftErrorBoundary } from "@/components/cins/SoftErrorBoundary";

const CinsSidebarRiveBrandCanvas = dynamic(
  () =>
    import("@/components/cins/CinsSidebarRiveBrandCanvas")
      .then((mod) => mod.CinsSidebarRiveBrandCanvas)
      .catch(() => SidebarBrandStaticLink),
  {
    ssr: false,
    loading: () => <SidebarBrandStaticLink />,
  },
);

type Props = {
  sidebarId?: string;
};

/** Logo sidebar — Rive (client-only) với fallback SVG khi load / chunk lỗi. */
export function CinsSidebarRiveBrand({ sidebarId = "app-sidebar" }: Props) {
  return (
    <SoftErrorBoundary fallback={<SidebarBrandStaticLink />}>
      <CinsSidebarRiveBrandCanvas sidebarId={sidebarId} />
    </SoftErrorBoundary>
  );
}
