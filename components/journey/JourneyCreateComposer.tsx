"use client";

import { FileText, ImagePlus, Video } from "lucide-react";
import { useRouter } from "next/navigation";

import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import type { ComposeCreateKind } from "@/lib/journey/compose-types";

type Props = {
  ownerSlug: string;
};

function composeFallbackHref(ownerSlug: string, kind: ComposeCreateKind): string {
  if (kind === "photo") return `/${ownerSlug}/p/new/photo`;
  if (kind === "video") return `/${ownerSlug}/p/new/video`;
  return `/${ownerSlug}/p/new`;
}

/**
 * Composer tạo nội dung trên Journey — layout kiểu Facebook.
 * Mở overlay lazy-load trên trang Journey (không chuyển route).
 * Route `/p/new*` vẫn tồn tại làm deep-link fallback.
 */
export function JourneyCreateComposer({ ownerSlug }: Props) {
  const router = useRouter();
  const { openCompose, canCompose } = useJourneyCompose();

  const open = (kind: ComposeCreateKind) => {
    if (canCompose) {
      openCompose({ kind });
      return;
    }
    router.push(composeFallbackHref(ownerSlug, kind));
  };

  return (
    <div className="j-create-composer">
      <div className="j-create-composer-actions" role="group" aria-label="Loại nội dung">
        <button
          type="button"
          className="j-create-composer-action j-create-composer-action--article"
          onClick={() => open("article")}
        >
          <FileText size={20} strokeWidth={1.8} aria-hidden />
          <span>Thêm bài viết</span>
        </button>
        <button
          type="button"
          className="j-create-composer-action j-create-composer-action--photo"
          onClick={() => open("photo")}
        >
          <ImagePlus size={20} strokeWidth={1.8} aria-hidden />
          <span>Thêm ảnh</span>
        </button>
        <button
          type="button"
          className="j-create-composer-action j-create-composer-action--video"
          onClick={() => open("video")}
        >
          <Video size={20} strokeWidth={1.8} aria-hidden />
          <span>Thêm video</span>
        </button>
      </div>
    </div>
  );
}
