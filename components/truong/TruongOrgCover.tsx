"use client";

import { useRef, useState } from "react";

import { TruongCoverCropModal } from "@/components/truong/TruongCoverCropModal";
import { TruongDetailCoverBanner } from "@/components/truong/TruongDetailCoverBanner";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { resolveSchoolCoverSrc } from "@/lib/truong/school-cover";
import type { TruongListItem } from "@/lib/truong/types";

type Props = {
  school: Pick<
    TruongListItem,
    "cover_id" | "cover_src" | "avatar_id" | "logo_id" | "ten" | "avatar_src"
  >;
  editable?: boolean;
  layout?: "legacy" | "v6";
};

export function TruongOrgCover({ school, editable = false, layout = "legacy" }: Props) {
  const ctx = useTruongInlineEdit();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const previewUrl = ctx?.coverDraft?.previewUrl ?? null;
  const avatarPreviewUrl = ctx?.avatarDraft?.previewUrl ?? null;
  const coverUrl = resolveSchoolCoverSrc(school, previewUrl);
  const canEdit = editable && ctx?.isEditing;
  const hasPending = Boolean(ctx?.coverDraft);

  function openPicker() {
    inputRef.current?.click();
  }

  function onFilePicked(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropSrc((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
    setCropOpen(true);
  }

  function closeCrop() {
    setCropOpen(false);
    setCropSrc((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function onApplyPreview(file: File, nextPreview: string) {
    ctx?.setCoverDraft({ file, previewUrl: nextPreview });
    ctx?.showToast(
      "Đã cập nhật xem trước ảnh bìa — bấm «Lưu ảnh bìa» trên thanh công cụ",
    );
    closeCrop();
  }

  const overlay =
    canEdit ? (
      <>
        {hasPending ? (
          <span className="tdh-cover-pending-badge">Ảnh bìa nháp</span>
        ) : null}
        <button
          type="button"
          className="tdh-inline-media-btn tdh-cover-edit"
          onClick={openPicker}
        >
          Đổi ảnh bìa
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="tdh-inline-file"
          onChange={(e) => {
            onFilePicked(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </>
    ) : null;

  return (
    <>
      <TruongDetailCoverBanner
        coverUrl={coverUrl}
        coverPending={hasPending}
        overlay={overlay}
        school={school}
        avatarPreviewUrl={avatarPreviewUrl}
        layout={layout}
      />
      <TruongCoverCropModal
        open={cropOpen}
        imageSrc={cropSrc}
        onClose={closeCrop}
        onApplyPreview={onApplyPreview}
        onPickAnother={() => {
          closeCrop();
          openPicker();
        }}
      />
    </>
  );
}
