"use client";

import { ClipboardPaste, ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  imageFilesFromClipboard,
  readImageFilesFromClipboardDetailed,
} from "@/lib/files/clipboard-images";
import { inferImageMime, isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
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
  /** Context label (tên khóa / «Thư viện bài tập»). */
  tenKhoaHoc?: string;
  bai?: GiaoTrinhBaiData | null;
  baiIndex?: number;
  /** Khi có — form sửa bài tập đã tạo. */
  editItem?: BaiTapKhoaData | null;
  onSave: (draft: BaiTapKhoaDraft) => void;
};

const BAI_TAP_THUMB_RECOMMENDED_PX = 288;
const BAI_TAP_THUMB_MAX_BYTES = 5 * 1024 * 1024;

type ThumbStatus = "idle" | "loading" | "ok" | "error" | "hint";

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
  const pendingClipboardReadRef =
    useRef<ReturnType<typeof readImageFilesFromClipboardDetailed> | null>(null);
  const pasteArmedRef = useRef(false);
  const pickThumbRef = useRef<(file: File) => void>(() => {});
  const [tenBaiTap, setTenBaiTap] = useState("");
  const [moTa, setMoTa] = useState("");
  const [yeuCau, setYeuCau] = useState("");
  const [videoYoutubeUrl, setVideoYoutubeUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbStatus, setThumbStatus] = useState<ThumbStatus>("idle");
  const [thumbMeta, setThumbMeta] = useState<ThumbMeta | null>(null);
  const [thumbError, setThumbError] = useState<string | null>(null);
  const [pasteArmed, setPasteArmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const baiKey = bai?.id ?? "course";
  const editKey = editItem?.id ?? "new";
  const isEditing = Boolean(editItem);

  function resetThumbState() {
    pasteArmedRef.current = false;
    setPasteArmed(false);
    setThumbStatus("idle");
    setThumbMeta(null);
    setThumbError(null);
  }

  function armPasteFallback(message: string) {
    pasteArmedRef.current = true;
    setPasteArmed(true);
    setThumbMeta(null);
    setThumbStatus("hint");
    setThumbError(message);
  }

  function disarmPasteFallback() {
    pasteArmedRef.current = false;
    setPasteArmed(false);
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
      setMoTa(editItem.moTa ?? "");
      setYeuCau(editItem.yeuCau ?? "");
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
    setMoTa("");
    setYeuCau("");
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

  /** Fallback khi Clipboard API bị chặn (vd. Simple Browser Cursor): chờ Ctrl+V. */
  useEffect(() => {
    if (!open || !pasteArmed) return;

    function onPaste(e: ClipboardEvent) {
      if (!pasteArmedRef.current) return;
      const file = imageFilesFromClipboard(e.clipboardData)[0];
      if (!file) return;
      e.preventDefault();
      e.stopPropagation();
      disarmPasteFallback();
      pickThumbRef.current(file);
    }

    window.addEventListener("paste", onPaste, true);
    const timeoutId = window.setTimeout(() => {
      if (!pasteArmedRef.current) return;
      disarmPasteFallback();
      setThumbStatus("error");
      setThumbError("Hết thời gian chờ — bấm Dán rồi Ctrl+V, hoặc dùng Chọn ảnh.");
    }, 20_000);

    return () => {
      window.removeEventListener("paste", onPaste, true);
      window.clearTimeout(timeoutId);
    };
  }, [open, pasteArmed]);

  function handleClose() {
    disarmPasteFallback();
    onClose();
  }

  async function handleThumbPick(file: File) {
    disarmPasteFallback();
    if (!isAllowedUploadImageFile(file)) {
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

    const mime = inferImageMime(file);
    const normalized =
      file.type === mime
        ? file
        : new File([file], file.name || `paste.${mime.split("/")[1] ?? "png"}`, {
            type: mime,
            lastModified: file.lastModified,
          });

    const localUrl = URL.createObjectURL(normalized);
    try {
      const { width, height } = await readImageDimensions(localUrl);
      setThumbnailUrl((prev) => {
        revokeBlob(prev);
        return localUrl;
      });
      setThumbMeta({ width, height, bytes: normalized.size });
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

  pickThumbRef.current = (file) => {
    void handleThumbPick(file);
  };

  function handlePasteButtonPointerDown() {
    if (thumbStatus === "loading" || saving) return;
    if (typeof window === "undefined" || !window.isSecureContext) return;
    if (!navigator.clipboard?.read) return;
    pendingClipboardReadRef.current = readImageFilesFromClipboardDetailed();
  }

  async function handleThumbPasteClick() {
    if (thumbStatus === "loading" || saving) return;
    const pending = pendingClipboardReadRef.current;
    pendingClipboardReadRef.current = null;
    const { files, reason } = await (pending ??
      readImageFilesFromClipboardDetailed());
    const file = files[0];
    if (file) {
      disarmPasteFallback();
      void handleThumbPick(file);
      return;
    }

    // Cursor Simple Browser / iframe: không có UI cấp quyền clipboard.read().
    if (reason === "denied" || reason === "unsupported" || reason === "insecure") {
      armPasteFallback(
        "Trình duyệt này không đọc clipboard bằng nút. Copy ảnh rồi nhấn Ctrl+V — hoặc dùng Chọn ảnh.",
      );
      return;
    }

    setThumbMeta(null);
    setThumbStatus("error");
    setThumbError(
      "Chưa có ảnh trong bộ nhớ tạm — copy ảnh rồi bấm Dán, hoặc dùng Chọn ảnh.",
    );
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
        yeuCau: yeuCau.trim() || null,
        videoYoutubeUrl: videoYoutubeUrl.trim() || null,
        thumbnailUrl: persistedThumb,
        giaoTrinhBaiId: editItem?.giaoTrinhBaiId ?? bai?.id ?? null,
        visible: true,
      });
      handleClose();
    } finally {
      setSaving(false);
    }
  }

  const contextLabel = bai
    ? `Bài ${(baiIndex ?? 0) + 1}: ${bai.tieuDe}${tenKhoaHoc ? ` · ${tenKhoaHoc}` : ""}`
    : tenKhoaHoc || null;

  const thumbHint = `Tuỳ chọn · 1:1 · chọn ảnh hoặc bấm Dán · khuyến nghị ≥${BAI_TAP_THUMB_RECOMMENDED_PX}×${BAI_TAP_THUMB_RECOMMENDED_PX}px`;

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
        : (thumbStatus === "error" || thumbStatus === "hint") && thumbError
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
            {contextLabel ?? "Thư viện bài tập"}
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
            <div
              className="cso-kh-cover-preview cso-khd-bt-thumb-preview c1"
              role="img"
              aria-label="Thumbnail bài tập"
            >
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
              <div className="cso-khd-bt-thumb-btns">
                <button
                  type="button"
                  className="cso-kh-cover-btn cso-kh-cover-btn--icon"
                  disabled={thumbStatus === "loading" || saving}
                  title={thumbnailUrl ? "Đổi thumbnail" : "Chọn thumbnail"}
                  aria-label={
                    thumbnailUrl ? "Đổi thumbnail" : "Chọn thumbnail"
                  }
                  onClick={() => thumbInputRef.current?.click()}
                >
                  {thumbStatus === "loading" ? (
                    <Loader2 size={16} className="tdh-spin" aria-hidden />
                  ) : (
                    <ImagePlus size={16} strokeWidth={2} aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  className="cso-kh-cover-btn cso-kh-cover-btn--icon"
                  disabled={thumbStatus === "loading" || saving}
                  title="Dán ảnh từ clipboard"
                  aria-label="Dán ảnh từ bộ nhớ tạm"
                  onPointerDown={handlePasteButtonPointerDown}
                  onClick={() => void handleThumbPasteClick()}
                >
                  <ClipboardPaste size={16} strokeWidth={2} aria-hidden />
                </button>
              </div>
              <p className="cso-kh-cover-hint">{thumbHint}</p>
              {thumbStatusText ? (
                <p
                  className={[
                    "cso-khd-bt-thumb-status",
                    thumbStatus === "ok"
                      ? "is-ok"
                      : thumbStatus === "error"
                        ? "is-err"
                        : thumbStatus === "hint"
                          ? "is-hint"
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
          <span className="cso-kh-label">Nội dung bài tập</span>
          <textarea
            className="cso-kh-input cso-kh-textarea"
            value={moTa}
            onChange={(e) => setMoTa(e.target.value)}
            placeholder="Nội dung / hướng dẫn làm bài…"
            rows={4}
          />
        </label>

        <label className="cso-kh-field">
          <span className="cso-kh-label">Yêu cầu bài</span>
          <textarea
            className="cso-kh-input cso-kh-textarea"
            value={yeuCau}
            onChange={(e) => setYeuCau(e.target.value)}
            placeholder="Yêu cầu nộp bài, tiêu chí chấm…"
            rows={3}
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
