"use client";

import { Eye, EyeOff, ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  isInlineBaiTapThumbnail,
  persistBaiTapThumbnailUrl,
} from "@/lib/to-chuc/bai-tap-thumbnail";
import type {
  BaiTapKhoaData,
  BaiTapKhoaDraft,
  GiaoTrinhBaiData,
} from "@/lib/to-chuc/khoa-hoc-types";

type Props = {
  open: boolean;
  onClose: () => void;
  tenKhoaHoc: string;
  bai?: GiaoTrinhBaiData | null;
  baiIndex?: number;
  /** Khi có — form sửa bài tập đã tạo. */
  editItem?: BaiTapKhoaData | null;
  onSave: (draft: BaiTapKhoaDraft) => void;
};

const BAI_TAP_THUMB_CARD_PX = 72;
const BAI_TAP_THUMB_RECOMMENDED_PX = 288;
const BAI_TAP_THUMB_MAX_BYTES = 5 * 1024 * 1024;
const BAI_TAP_THUMB_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type ThumbStatus = "idle" | "loading" | "ok" | "error";

type ThumbMeta = {
  width: number;
  height: number;
  bytes: number | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readImageDimensions(
  url: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error("Không đọc được file ảnh."));
    img.src = url;
  });
}

function revokeBlob(url: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export function GiaoTrinhBaiTapPanel({
  open,
  onClose,
  bai = null,
  baiIndex,
  tenKhoaHoc,
  editItem = null,
  onSave,
}: Props) {
  const titleId = useId();
  const tenBaiTapId = useId();
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [tenBaiTap, setTenBaiTap] = useState("");
  const [visible, setVisible] = useState(true);
  const [moTa, setMoTa] = useState("");
  const [videoYoutubeUrl, setVideoYoutubeUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbStatus, setThumbStatus] = useState<ThumbStatus>("idle");
  const [thumbMeta, setThumbMeta] = useState<ThumbMeta | null>(null);
  const [thumbError, setThumbError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const baiKey = bai?.id ?? "course";
  const editKey = editItem?.id ?? "new";
  const isEditing = Boolean(editItem);

  function resetThumbState() {
    setThumbStatus("idle");
    setThumbMeta(null);
    setThumbError(null);
  }

  async function loadThumbFromUrl(url: string, bytes: number | null = null) {
    setThumbStatus("loading");
    setThumbError(null);
    try {
      const { width, height } = await readImageDimensions(url);
      setThumbMeta({ width, height, bytes });
      setThumbStatus("ok");
    } catch {
      setThumbMeta(null);
      setThumbStatus("error");
      setThumbError("Không đọc được file ảnh.");
    }
  }

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      setTenBaiTap(editItem.tenBaiTap);
      setVisible(editItem.visible);
      setMoTa(editItem.moTa ?? "");
      setVideoYoutubeUrl(editItem.videoYoutubeUrl ?? "");
      setThumbnailUrl((prev) => {
        revokeBlob(prev);
        return editItem.thumbnailUrl;
      });
      if (editItem.thumbnailUrl) {
        void loadThumbFromUrl(editItem.thumbnailUrl);
      } else {
        resetThumbState();
      }
      return;
    }
    setTenBaiTap("");
    setVisible(true);
    setMoTa("");
    setVideoYoutubeUrl("");
    setThumbnailUrl((prev) => {
      revokeBlob(prev);
      return null;
    });
    resetThumbState();
  }, [open, baiKey, editKey, editItem]);

  useEffect(
    () => () => {
      revokeBlob(thumbnailUrl);
    },
    [thumbnailUrl],
  );

  function handleClose() {
    onClose();
  }

  async function handleThumbPick(file: File) {
    if (
      !BAI_TAP_THUMB_ACCEPT.includes(
        file.type as (typeof BAI_TAP_THUMB_ACCEPT)[number],
      )
    ) {
      setThumbStatus("error");
      setThumbError("Định dạng không hỗ trợ — dùng JPEG, PNG, WebP hoặc GIF.");
      setThumbMeta(null);
      return;
    }
    if (file.size > BAI_TAP_THUMB_MAX_BYTES) {
      setThumbStatus("error");
      setThumbError(
        `Ảnh quá lớn (${formatBytes(file.size)}). Tối đa ${formatBytes(BAI_TAP_THUMB_MAX_BYTES)}.`,
      );
      setThumbMeta(null);
      return;
    }

    setThumbStatus("loading");
    setThumbError(null);
    setThumbMeta(null);

    const localUrl = URL.createObjectURL(file);
    try {
      const { width, height } = await readImageDimensions(localUrl);
      setThumbnailUrl((prev) => {
        revokeBlob(prev);
        return localUrl;
      });
      setThumbMeta({ width, height, bytes: file.size });
      setThumbStatus("ok");
    } catch {
      URL.revokeObjectURL(localUrl);
      setThumbnailUrl((prev) => {
        revokeBlob(prev);
        return null;
      });
      setThumbStatus("error");
      setThumbError("Không đọc được file ảnh — thử file khác.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenBaiTap.trim() || saving) return;
    setSaving(true);
    try {
      const persistedThumb = await persistBaiTapThumbnailUrl(thumbnailUrl);
      onSave({
        tenBaiTap: tenBaiTap.trim(),
        moTa: moTa.trim() || null,
        videoYoutubeUrl: videoYoutubeUrl.trim() || null,
        thumbnailUrl: persistedThumb,
        giaoTrinhBaiId: editItem?.giaoTrinhBaiId ?? bai?.id ?? null,
        visible,
      });
      handleClose();
    } finally {
      setSaving(false);
    }
  }

  const contextLabel = bai
    ? `Bài ${(baiIndex ?? 0) + 1}: ${bai.tieuDe}${tenKhoaHoc ? ` · ${tenKhoaHoc}` : ""}`
    : tenKhoaHoc || null;

  const thumbHint = `Tuỳ chọn · 1:1 · hiển thị ${BAI_TAP_THUMB_CARD_PX}×${BAI_TAP_THUMB_CARD_PX}px trên card · khuyến nghị ≥${BAI_TAP_THUMB_RECOMMENDED_PX}×${BAI_TAP_THUMB_RECOMMENDED_PX}px`;

  const thumbStatusText =
    thumbStatus === "loading"
      ? "Đang tải ảnh…"
      : thumbStatus === "ok" && thumbMeta
        ? `Đã tải ảnh · ${thumbMeta.width}×${thumbMeta.height}px${
            thumbMeta.bytes != null ? ` · ${formatBytes(thumbMeta.bytes)}` : ""
          }${
            thumbMeta.width !== thumbMeta.height
              ? " · ảnh không vuông, sẽ cắt khi hiển thị"
              : ""
          }`
        : thumbStatus === "error" && thumbError
          ? thumbError
          : null;

  return (
    <TruongInlineModal
      open={open}
      onClose={handleClose}
      className="tdh-inline-modal--wide cso-kh-create-modal cso-khd-bt-panel"
      labelledBy={titleId}
      showClose={false}
    >
      <div className="cso-kh-create-head">
        <div>
          <h2 id={titleId} className="tdh-inline-modal-title">
            {isEditing ? "Sửa bài tập" : "Thêm bài tập"}
          </h2>
          <p className="cso-khd-bt-panel-ctx">
            {contextLabel ?? "Khóa học"}
          </p>
        </div>
        <button
          type="button"
          className="cso-kh-create-close"
          aria-label="Đóng"
          onClick={handleClose}
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <form className="cso-kh-create-form" onSubmit={handleSubmit}>
        <div className="cso-kh-create-body">
        <div className="cso-kh-field">
          <div className="cso-kh-label-row">
            <label className="cso-kh-label" htmlFor={tenBaiTapId}>
              Tên bài tập <span className="cso-kh-req">*</span>
            </label>
            <button
              type="button"
              className={`cso-khd-bt-vis-toggle${visible ? " is-on" : ""}`}
              onClick={() => setVisible((v) => !v)}
              aria-label={
                visible
                  ? "Đang hiển thị công khai — bấm để ẩn"
                  : "Đang ẩn — bấm để hiển thị công khai"
              }
              aria-pressed={visible}
              title={visible ? "Công khai" : "Ẩn"}
            >
              {visible ? (
                <Eye size={16} aria-hidden />
              ) : (
                <EyeOff size={16} aria-hidden />
              )}
            </button>
          </div>
          <input
            id={tenBaiTapId}
            type="text"
            className="cso-kh-input"
            value={tenBaiTap}
            onChange={(e) => setTenBaiTap(e.target.value)}
            placeholder="VD: Phác thảo khối cơ bản"
            required
            autoFocus
          />
        </div>

        <div className="cso-kh-field">
          <span className="cso-kh-label">Thumbnail bài tập</span>
          <div className="cso-kh-cover-pick">
            <div className="cso-kh-cover-preview cso-khd-bt-thumb-preview c1">
              {thumbnailUrl ? (
                <Image
                  src={thumbnailUrl}
                  alt=""
                  fill
                  className="cso-kh-cover-preview-img"
                  sizes="128px"
                  unoptimized={isInlineBaiTapThumbnail(thumbnailUrl)}
                />
              ) : thumbStatus !== "loading" ? (
                <span className="cso-kh-cover-preview-ph" aria-hidden>
                  <ImagePlus size={24} strokeWidth={1.5} />
                </span>
              ) : null}
              {thumbStatus === "loading" ? (
                <span className="cso-khd-bt-thumb-loading" aria-hidden>
                  <Loader2 size={22} className="tdh-spin" />
                </span>
              ) : null}
            </div>
            <div className="cso-kh-cover-actions">
              <input
                ref={thumbInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="cso-kh-cover-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleThumbPick(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="cso-kh-cover-btn"
                disabled={thumbStatus === "loading" || saving}
                onClick={() => thumbInputRef.current?.click()}
              >
                {thumbStatus === "loading" ? (
                  <>
                    <Loader2 size={14} className="tdh-spin" aria-hidden />
                    Đang tải…
                  </>
                ) : (
                  <>
                    <ImagePlus size={14} aria-hidden />
                    {thumbnailUrl ? "Đổi thumbnail" : "Chọn thumbnail"}
                  </>
                )}
              </button>
              <p className="cso-kh-cover-hint">{thumbHint}</p>
              {thumbStatusText ? (
                <p
                  className={[
                    "cso-khd-bt-thumb-status",
                    thumbStatus === "ok"
                      ? "is-ok"
                      : thumbStatus === "error"
                        ? "is-err"
                        : "is-loading",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role="status"
                  aria-live="polite"
                >
                  {thumbStatusText}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <label className="cso-kh-field">
          <span className="cso-kh-label">Mô tả / hướng dẫn</span>
          <textarea
            className="cso-kh-input cso-kh-textarea"
            value={moTa}
            onChange={(e) => setMoTa(e.target.value)}
            placeholder="Yêu cầu nộp bài, tiêu chí chấm…"
            rows={4}
          />
        </label>

        <label className="cso-kh-field">
          <span className="cso-kh-label">Video (URL YouTube)</span>
          <input
            type="url"
            className="cso-kh-input"
            value={videoYoutubeUrl}
            onChange={(e) => setVideoYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            inputMode="url"
            autoComplete="off"
          />
        </label>
        </div>

        <div className="cso-kh-create-foot">
          <button
            type="button"
            className="cso-kh-foot-btn cso-kh-foot-btn--ghost"
            onClick={handleClose}
          >
            Huỷ
          </button>
          <button
            type="submit"
            className="cso-kh-foot-btn cso-kh-foot-btn--primary"
            disabled={!tenBaiTap.trim() || saving || thumbStatus === "loading"}
          >
            {isEditing ? "Lưu thay đổi" : "Thêm bài tập"}
          </button>
        </div>
      </form>
    </TruongInlineModal>
  );
}
