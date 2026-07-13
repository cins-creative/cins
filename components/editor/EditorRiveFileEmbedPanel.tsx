"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";

import { ensureRiveRuntime } from "@/lib/cins/rive-runtime";
import { useInteractiveRiveEmbed } from "@/lib/cins/rive-embed";
import { EMBED_PLATFORM_LOGO } from "@/lib/editor/embed-platform-logos";

if (typeof window !== "undefined") {
  ensureRiveRuntime();
}

type Props = {
  /** Upload mới — compose tạo bài. */
  file?: File;
  /** Preview khi sửa bài — URL .riv đã lưu trên R2. */
  previewSrc?: string;
  uploading?: boolean;
  uploadError?: string | null;
  uploadedUrl?: string;
};

export function EditorRiveFileEmbedPanel({
  file,
  previewSrc: previewSrcProp,
  uploading = false,
  uploadError = null,
  uploadedUrl = "",
}: Props) {
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

  const { RiveComponent } = useInteractiveRiveEmbed(
    previewSrc || "about:blank",
  );

  const fileLabel = file?.name.trim() || "animation.riv";
  const fileSizeKb = file ? Math.max(1, Math.round(file.size / 1024)) : null;
  const isSavedAsset = Boolean(previewSrcProp?.trim() || uploadedUrl.trim());

  return (
    <div className="ed-embed-compose">
      <div className="ed-embed-compose-tab" data-platform="rive">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ed-embed-compose-tab-logo"
          src={EMBED_PLATFORM_LOGO.rive}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
        />
        <span className="ed-embed-compose-tab-text">
          <span className="ed-embed-compose-tab-label">Rive</span>
          <span className="ed-embed-compose-tab-hint">
            File .riv — lưu trên Cloudflare R2
          </span>
        </span>
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
            ? "Đang upload file .riv lên CINs — vui lòng đợi hoàn tất."
            : isSavedAsset || uploadedUrl
              ? "File đã sẵn sàng — thử hover/click trên animation."
              : file
                ? "Đang chuẩn bị upload file .riv…"
                : "Đang tải preview animation…"}
        </p>
      )}
      <div className="ed-embed-compose-preview" data-provider="rive">
        {uploading || !previewSrc ? (
          <div className="ed-embed-compose-preview-status">
            <Loader2 size={22} strokeWidth={2} className="ed-spin" aria-hidden />
            <span>
              {uploading ? "Đang tải file .riv…" : "Đang tải preview…"}
            </span>
          </div>
        ) : (
          <RiveComponent style={{ width: "100%", height: "100%" }} />
        )}
      </div>
    </div>
  );
}
