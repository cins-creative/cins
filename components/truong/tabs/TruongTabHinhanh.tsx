"use client";

import { HinhAnhTabPanel } from "@/components/truong/HinhAnhTabPanel";
import type { TruongHinhAnh } from "@/lib/truong/types";

type Props = { images: TruongHinhAnh[] };

export function TruongTabHinhanh({ images }: Props) {
  return (
    <HinhAnhTabPanel
      images={images}
      sectionNum="04"
      sectionTitle="Hình ảnh trường"
      emptyHint="Gallery sẽ hiển thị khi ảnh được đăng từ tổ chức."
    />
  );
}
