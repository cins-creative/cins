"use client";

import dynamic from "next/dynamic";

/**
 * Live preview + mock card chỉ xuất hiện trong chế độ tuỳ chỉnh (`?tuy-chinh=1`)
 * hoặc catalog «Thêm khối» — tách chunk để lượt xem trang chủ bình thường không
 * phải tải/hydrate chúng. Payload preview vốn fetch client nên `ssr: false`
 * không mất gì.
 */
function PreviewChunkFallback() {
  return <div className="ha-card ha-card--loading" aria-busy="true" />;
}

export const HomeModuleLivePreview = dynamic(
  () =>
    import("@/components/cins/home-adaptive/HomeModuleLivePreview").then(
      (m) => m.HomeModuleLivePreview,
    ),
  { ssr: false, loading: PreviewChunkFallback },
);

export const HomeModulePreviewSkeleton = dynamic(
  () =>
    import("@/components/cins/home-adaptive/HomeModuleLivePreview").then(
      (m) => m.HomeModulePreviewSkeleton,
    ),
  { ssr: false, loading: PreviewChunkFallback },
);

export const HomeModuleMockCard = dynamic(
  () =>
    import("@/components/cins/home-adaptive/HomeModuleMockCard").then(
      (m) => m.HomeModuleMockCard,
    ),
  { ssr: false, loading: PreviewChunkFallback },
);
