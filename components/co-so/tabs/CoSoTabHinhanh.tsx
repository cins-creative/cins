"use client";

import { HinhAnhTabPanel } from "@/components/truong/HinhAnhTabPanel";
import type { TruongHinhAnh } from "@/lib/truong/types";

type Props = { images: TruongHinhAnh[] };

export function CoSoTabHinhanh({ images }: Props) {
  return (
    <HinhAnhTabPanel
      images={images}
      sectionNum="05"
      sectionTitle="Hình ảnh"
      emptyHint="Gallery sẽ hiển thị khi ảnh được đăng từ cơ sở."
    />
  );
}
