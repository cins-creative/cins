"use client";

import { useRef } from "react";

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

  const previewUrl = ctx?.coverDraft?.previewUrl ?? null;
  const avatarPreviewUrl = ctx?.avatarDraft?.previewUrl ?? null;
  const coverUrl = resolveSchoolCoverSrc(school, previewUrl);
  const canEdit = editable && ctx?.isEditing;
  const isSaving = Boolean(ctx?.saving);
  const hasPending = Boolean(ctx?.coverDraft) && !isSaving;

  function openPicker() {
    inputRef.current?.click();
  }

  function onFilePicked(file: File | undefined) {
    if (!file || !ctx) return;
    const previewUrl = URL.createObjectURL(file);
    void (async () => {
      try {
        ctx.setCoverDraft({ file, previewUrl });
        await ctx.commitCoverDraft(file);
      } catch {
        ctx.showToast("Lưu ảnh bìa thất bại — thử lại");
      }
    })();
  }

  const overlay =
    canEdit ? (
      <>
        {hasPending ? (
          <span className="tdh-cover-pending-badge">Ảnh bìa nháp</span>
        ) : isSaving && ctx?.coverDraft ? (
          <span className="tdh-cover-pending-badge" aria-live="polite">
            Đang lưu…
          </span>
        ) : null}
        <button
          type="button"
          className="tdh-cover-edit-btn"
          onClick={openPicker}
          aria-label="Đổi ảnh bìa"
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
    <TruongDetailCoverBanner
      coverUrl={coverUrl}
      coverPending={hasPending}
      overlay={overlay}
      school={school}
      avatarPreviewUrl={avatarPreviewUrl}
      layout={layout}
      editable={canEdit}
    />
  );
}
