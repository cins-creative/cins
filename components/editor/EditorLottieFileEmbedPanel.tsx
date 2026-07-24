"use client";

import { Loader2, X } from "lucide-react";
import { createElement, useEffect, useMemo, useState } from "react";

import { ensureDotLottieWc } from "@/lib/cins/lottie-runtime";
import { EMBED_PLATFORM_LOGO } from "@/lib/editor/embed-platform-logos";

type Props = {
  /** Upload mới — compose tạo bài. */
  file?: File;
  /** Preview khi sửa bài — URL .lottie đã lưu trên R2. */
  previewSrc?: string;
  uploading?: boolean;
  uploadError?: string | null;
  uploadedUrl?: string;
  /** Xóa nền tảng nhúng — quay về toolbar compose mặc định. */
  onClear?: () => void;
};

export function EditorLottieFileEmbedPanel({
  file,
  previewSrc: previewSrcProp,
  uploading = false,
  uploadError = null,
  uploadedUrl = "",
  onClear,
}: Props) {
  const [playerReady, setPlayerReady] = useState(false);

  const previewSrc = useMemo(() => {
    const saved = previewSrcProp?.trim() || uploadedUrl.trim();
    if (saved) return saved;
    if (file) return URL.createObjectURL(file);
    return "";
  }, [previewSrcProp, uploadedUrl, file]);

  useEffect(
    () => () => {
      if (
        file &&
        !uploadedUrl &&
        !previewSrcProp?.trim() &&
        previewSrc.startsWith("blob:")
      ) {
        URL.revokeObjectURL(previewSrc);
      }
    },
    [previewSrc, previewSrcProp, uploadedUrl, file],
  );

  useEffect(() => {
    let cancelled = false;
    setPlayerReady(false);
    if (!previewSrc || uploading) return;
    void ensureDotLottieWc()
      .then(() => {
        if (!cancelled) setPlayerReady(true);
      })
      .catch(() => {
        if (!cancelled) setPlayerReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [previewSrc, uploading]);

  const fileLabel = file?.name.trim() || "animation.lottie";
  const fileSizeKb = file ? Math.max(1, Math.round(file.size / 1024)) : null;
  const isSavedAsset = Boolean(previewSrcProp?.trim() || uploadedUrl.trim());

  return (
    <div className="ed-embed-compose">
      <div className="ed-embed-compose-tab" data-platform="lottie">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ed-embed-compose-tab-logo"
          src={EMBED_PLATFORM_LOGO.lottie}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
        />
        <span className="ed-embed-compose-tab-text">
          <span className="ed-embed-compose-tab-label">LottieFiles</span>
          <span className="ed-embed-compose-tab-hint">
            File .lottie — lưu trên Cloudflare R2
          </span>
        </span>
        {onClear ? (
          <button
            type="button"
            className="ed-embed-compose-tab-clear"
            onClick={onClear}
            aria-label="Xóa nền tảng nhúng"
            title="Xóa nền tảng nhúng"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="ed-embed-compose-field">
        <span className="ed-embed-compose-field-label">File đã chọn</span>
        <p className="ed-embed-compose-help">
          {file && fileSizeKb != null
            ? `${fileLabel} · ${fileSizeKb} KB`
            : fileLabel}
          {uploading
            ? " · đang tải lên…"
            : isSavedAsset
              ? " · đã lưu trên CINs"
              : uploadedUrl
                ? " · đã tải lên"
                : ""}
        </p>
      </div>
      {uploadError ? (
        <p className="ed-embed-compose-error" role="alert">
          {uploadError}
        </p>
      ) : (
        <p className="ed-embed-compose-help">
          {uploading
            ? "Đang upload file Lottie lên CINs — vui lòng đợi hoàn tất."
            : isSavedAsset || uploadedUrl
              ? "File đã sẵn sàng — animation chạy trong khung preview."
              : file
                ? "Đang chuẩn bị upload file Lottie…"
                : "Đang tải preview animation…"}
        </p>
      )}
      <div className="ed-embed-compose-preview" data-provider="lottie">
        {uploading || !previewSrc || !playerReady ? (
          <div className="ed-embed-compose-preview-status">
            <Loader2 size={22} strokeWidth={2} className="ed-spin" aria-hidden />
            <span>
              {uploading
                ? "Đang tải file Lottie…"
                : "Đang tải preview…"}
            </span>
          </div>
        ) : (
          createElement("dotlottie-wc", {
            src: previewSrc,
            autoplay: true,
            loop: true,
            style: { width: "100%", height: "100%" },
          })
        )}
      </div>
    </div>
  );
}
