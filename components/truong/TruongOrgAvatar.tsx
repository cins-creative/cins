"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { TruongAvatarCropModal } from "@/components/truong/TruongAvatarCropModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import {
  resolveSchoolAvatarSrc,
  schoolInitials,
} from "@/lib/truong/school-avatar";
import type { TruongListItem } from "@/lib/truong/types";

export type TruongOrgAvatarSize = "lg" | "md" | "sm";

const SIZE_CLASS: Record<TruongOrgAvatarSize, string> = {
  lg: "school-avatar-lg tdh-org-avatar--lg",
  md: "tdh-org-avatar--md",
  sm: "tdh-org-avatar--sm",
};

type Props = {
  school: Pick<TruongListItem, "avatar_id" | "logo_id" | "avatar_src" | "ten">;
  size?: TruongOrgAvatarSize;
  className?: string;
  editable?: boolean;
};

export function TruongOrgAvatar({
  school,
  size = "lg",
  className,
  editable = false,
}: Props) {
  const ctx = useTruongInlineEdit();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const previewUrl = ctx?.avatarDraft?.previewUrl ?? null;
  const src = resolveSchoolAvatarSrc(school, previewUrl);

  useEffect(() => {
    setImgError(false);
  }, [src]);
  const isBlob = src?.startsWith("blob:") ?? false;
  const canEdit = editable && ctx?.isEditing;
  const initials = schoolInitials(school.ten);
  const hasPending = Boolean(ctx?.avatarDraft);

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
    ctx?.setAvatarDraft({ file, previewUrl: nextPreview });
    ctx?.showToast("Đã cập nhật xem trước logo — bấm «Lưu logo» trên thanh công cụ");
    closeCrop();
  }

  const wrapClass = [
    "tdh-org-avatar",
    SIZE_CLASS[size],
    className,
    canEdit ? "tdh-org-avatar--editable" : "",
    hasPending ? "tdh-org-avatar--pending" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={wrapClass}>
        {src && !imgError ? (
          <Image
            key={src}
            src={src}
            alt=""
            width={size === "lg" ? 112 : size === "md" ? 80 : 48}
            height={size === "lg" ? 112 : size === "md" ? 80 : 48}
            className="tdh-org-avatar-img"
            unoptimized={isBlob || src.includes("imagedelivery.net")}
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="tdh-org-avatar-initials" aria-hidden>
            {initials}
          </span>
        )}
        {hasPending ? (
          <span className="tdh-org-avatar-pending-badge" title="Chưa lưu lên máy chủ">
            Nháp
          </span>
        ) : null}
        {canEdit ? (
          <button
            type="button"
            className="tdh-org-avatar-edit-btn"
            onClick={openPicker}
            aria-label="Đổi logo trường"
          >
            Đổi logo
          </button>
        ) : null}
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
      </div>

      <TruongAvatarCropModal
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
