"use client";

import { FileText, ImagePlus, Video } from "lucide-react";

import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";

export function OrgBaiDangCreateComposer() {
  const { openCompose, canCompose } = useJourneyCompose();
  if (!canCompose) return null;

  return (
    <div className="j-create-composer">
      <div className="j-create-composer-actions" role="group" aria-label="Loại nội dung">
        <button
          type="button"
          className="j-create-composer-action j-create-composer-action--article"
          onClick={() => openCompose({ kind: "article" })}
        >
          <FileText size={20} strokeWidth={1.8} aria-hidden />
          <span>Thêm bài viết</span>
        </button>
        <button
          type="button"
          className="j-create-composer-action j-create-composer-action--photo"
          onClick={() => openCompose({ kind: "photo" })}
        >
          <ImagePlus size={20} strokeWidth={1.8} aria-hidden />
          <span>Thêm ảnh</span>
        </button>
        <button
          type="button"
          className="j-create-composer-action j-create-composer-action--video"
          onClick={() => openCompose({ kind: "video" })}
        >
          <Video size={20} strokeWidth={1.8} aria-hidden />
          <span>Thêm video</span>
        </button>
      </div>
    </div>
  );
}
