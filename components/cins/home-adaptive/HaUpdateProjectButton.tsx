"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";

/**
 * Nút "Cập nhật dự án mới" trong card hồ sơ (World Journey).
 * Owner → mở trình soạn bài viết ngay (overlay), khỏi rời trang.
 * Khách/không có quyền → điều hướng sang Journey như cũ.
 */
export function HaUpdateProjectButton({ viewerSlug }: { viewerSlug: string }) {
  const { openCompose, canCompose } = useJourneyCompose();

  if (canCompose) {
    return (
      <button
        type="button"
        className="ha-btn-full"
        onClick={() => openCompose({ kind: "article", intent: "minimal" })}
      >
        <Plus size={15} strokeWidth={2} aria-hidden />
        Cập nhật dự án mới
      </button>
    );
  }

  return (
    <Link href={`/${viewerSlug}/journey`} className="ha-btn-full" prefetch={false}>
      <Plus size={15} strokeWidth={2} aria-hidden />
      Cập nhật dự án mới
    </Link>
  );
}
