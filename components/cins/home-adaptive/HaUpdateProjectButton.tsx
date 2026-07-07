"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";

/**
 * Nút "Cập nhật dự án mới" trong card hồ sơ (World Journey).
 * Owner → mở trình soạn bài viết ngay (overlay), khỏi rời trang.
 * Khách/không có quyền → điều hướng sang Journey như cũ.
 */
export function HaUpdateProjectButton({
  viewerSlug,
  className,
}: {
  viewerSlug: string;
  className?: string;
}) {
  const { openCompose, canCompose } = useJourneyCompose();
  const btnClass = className ? `ha-btn-full ${className}` : "ha-btn-full";

  if (canCompose) {
    return (
      <button
        type="button"
        className={btnClass}
        onClick={() => openCompose({ kind: "article", intent: "minimal" })}
      >
        <Plus size={15} strokeWidth={2} aria-hidden />
        Cập nhật dự án mới
      </button>
    );
  }

  return (
    <Link href={`/${viewerSlug}/journey`} className={btnClass} prefetch={false}>
      <Plus size={15} strokeWidth={2} aria-hidden />
      Cập nhật dự án mới
    </Link>
  );
}
