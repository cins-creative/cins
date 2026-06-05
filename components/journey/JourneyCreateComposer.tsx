"use client";

import { FileText, ImagePlus, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, type ChangeEvent } from "react";

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
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { openCompose, openComposeWithPhotos, openComposeWithVideo, canCompose } =
    useJourneyCompose();

  const open = (kind: ComposeCreateKind) => {
    if (canCompose) {
      openCompose({ kind });
      return;
    }
    router.push(composeFallbackHref(ownerSlug, kind));
  };

  const openPhotoPicker = () => {
    if (canCompose) {
      photoInputRef.current?.click();
      return;
    }
    router.push(composeFallbackHref(ownerSlug, "photo"));
  };

  const openVideoPicker = () => {
    if (canCompose) {
      videoInputRef.current?.click();
      return;
    }
    router.push(composeFallbackHref(ownerSlug, "video"));
  };

  const onPhotoPicked = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;
    if (canCompose) {
      openComposeWithPhotos(Array.from(files));
      return;
    }
    router.push(composeFallbackHref(ownerSlug, "photo"));
  };

  const onVideoPicked = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (canCompose) {
      openComposeWithVideo(file);
      return;
    }
    router.push(composeFallbackHref(ownerSlug, "video"));
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
          onClick={openPhotoPicker}
        >
          <ImagePlus size={20} strokeWidth={1.8} aria-hidden />
          <span>Thêm ảnh</span>
        </button>
        <button
          type="button"
          className="j-create-composer-action j-create-composer-action--video"
          onClick={openVideoPicker}
        >
          <Video size={20} strokeWidth={1.8} aria-hidden />
          <span>Thêm video</span>
        </button>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        tabIndex={-1}
        aria-hidden
        onChange={onPhotoPicked}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        hidden
        tabIndex={-1}
        aria-hidden
        onChange={onVideoPicked}
      />
    </div>
  );
}
