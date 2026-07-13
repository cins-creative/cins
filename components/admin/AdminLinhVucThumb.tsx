"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { adminUploadLinhVucThumbnail } from "@/app/admin/actions";
import { rememberCfAccountHashFromDeliveryUrl } from "@/lib/cloudflare/account-hash";

type Props = {
  id: string;
  ten: string;
  thumbnailSrc: string | null;
  /** Tắt khi chưa có id DB (form tạo mới). */
  uploadEnabled?: boolean;
  priority?: boolean;
  onThumbnailChange?: (payload: {
    thumbnail_id: string;
    thumbnail_url: string;
  }) => void;
};

function imageFileFromClipboard(data: DataTransfer | null): File | null {
  if (!data) return null;
  const fromFiles = data.files?.[0];
  if (fromFiles?.type.startsWith("image/")) return fromFiles;
  for (const entry of data.items) {
    if (entry.type.startsWith("image/")) {
      const f = entry.getAsFile();
      if (f) return f;
    }
  }
  return null;
}

export function AdminLinhVucThumb({
  id,
  ten,
  thumbnailSrc,
  uploadEnabled = true,
  priority = false,
  onThumbnailChange,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const blobRef = useRef<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [waitingForUploadedImage, setWaitingForUploadedImage] = useState(false);
  const [previewOverride, setPreviewOverride] = useState<{
    rowId: string;
    url: string;
    uploaded: boolean;
  } | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const canUpload = uploadEnabled && id !== "__new__";
  const title = ten.trim() || "Lĩnh vực";
  const rowPreviewUrl = thumbnailSrc?.trim() || null;
  const thumbSrc =
    previewOverride?.rowId === id ? previewOverride.url : rowPreviewUrl;
  const hasThumb = Boolean(thumbSrc) && failedSrc !== thumbSrc;

  useEffect(() => {
    setPreviewOverride(null);
    setFailedSrc(null);
    setError(null);
    setNotice(null);
    setWaitingForUploadedImage(false);
  }, [id, thumbnailSrc]);

  useEffect(() => {
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = null;
      }
    };
  }, []);

  const showNotice = (message: string) => {
    setNotice(message);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 2600);
  };

  const uploadFile = async (file: File) => {
    if (!canUpload || busy) return;
    setError(null);
    setNotice("Đang upload…");
    setWaitingForUploadedImage(false);
    setBusy(true);

    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
    const objectUrl = URL.createObjectURL(file);
    blobRef.current = objectUrl;
    setFailedSrc(null);
    setPreviewOverride({ rowId: id, url: objectUrl, uploaded: false });

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await adminUploadLinhVucThumbnail(id, fd);
      if (!res.ok) {
        if (blobRef.current) {
          URL.revokeObjectURL(blobRef.current);
          blobRef.current = null;
        }
        setPreviewOverride(null);
        setFailedSrc(null);
        setError(res.message);
        setNotice(null);
        return;
      }

      rememberCfAccountHashFromDeliveryUrl(res.thumbnail_url);
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      setFailedSrc(null);
      setPreviewOverride({
        rowId: id,
        url: res.thumbnail_url,
        uploaded: true,
      });
      setWaitingForUploadedImage(true);
      setNotice("Đang tải ảnh mới…");
      onThumbnailChange?.({
        thumbnail_id: res.thumbnail_id,
        thumbnail_url: res.thumbnail_url,
      });
      router.refresh();
    } catch (e) {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      setPreviewOverride(null);
      setFailedSrc(null);
      setError(e instanceof Error ? e.message : "Lỗi mạng khi upload.");
      setNotice(null);
    } finally {
      setBusy(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void uploadFile(f);
  };

  const openPicker = (e?: React.SyntheticEvent) => {
    if (!canUpload || busy) return;
    e?.preventDefault();
    e?.stopPropagation();
    inputRef.current?.click();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (!canUpload || busy) return;
    const f = imageFileFromClipboard(e.clipboardData);
    if (f) {
      e.preventDefault();
      e.stopPropagation();
      void uploadFile(f);
    }
  };

  const stopRow = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <span
      className={[
        "admin-article-thumb",
        "admin-linh-vuc-thumb",
        canUpload ? "admin-article-thumb--editable" : "",
        hasThumb ? "admin-article-thumb--has-img" : "admin-article-thumb--empty",
      ]
        .filter(Boolean)
        .join(" ")}
      tabIndex={canUpload ? 0 : -1}
      onPaste={canUpload ? onPaste : undefined}
      onClick={stopRow}
      onKeyDown={stopRow}
      aria-label={
        !canUpload
          ? `Thumbnail: ${title}. Lưu lĩnh vực trước rồi tải ảnh.`
          : hasThumb
            ? `Thumbnail: ${title}. Bấm 「Đổi ảnh」 hoặc dán ảnh mới (Ctrl+V).`
            : `Thumbnail: ${title}. Dán ảnh (Ctrl+V) hoặc bấm 「Chọn ảnh」.`
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="admin-sr-only"
        tabIndex={-1}
        aria-hidden
        disabled={!canUpload || busy}
        onChange={onPick}
      />

      {hasThumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbSrc!}
          alt=""
          className="admin-article-thumb__img"
          loading={priority || waitingForUploadedImage ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority || waitingForUploadedImage ? "high" : "auto"}
          width={96}
          height={72}
          onLoad={() => {
            if (waitingForUploadedImage) {
              setWaitingForUploadedImage(false);
              showNotice("Upload hoàn tất");
            }
          }}
          onError={() => {
            setFailedSrc(thumbSrc ?? null);
            setWaitingForUploadedImage(false);
            if (busy || notice) setNotice(null);
          }}
        />
      ) : (
        <span className="admin-article-thumb__ph" aria-hidden>
          <span className="admin-article-thumb__ph-mark">+</span>
          <span className="admin-article-thumb__ph-hint">
            {!canUpload
              ? "Lưu trước"
              : busy
                ? "Đang tải…"
                : "Dán (Ctrl+V)"}
          </span>
        </span>
      )}

      {canUpload ? (
        <span
          className={
            hasThumb
              ? "admin-article-thumb__actions admin-article-thumb__actions--overlay"
              : "admin-article-thumb__actions"
          }
        >
          <button
            type="button"
            className="admin-article-thumb__pick"
            disabled={busy}
            onClick={openPicker}
          >
            {busy ? "Đang tải…" : hasThumb ? "Đổi ảnh" : "Chọn ảnh"}
          </button>
        </span>
      ) : null}

      {error ? (
        <span className="admin-article-thumb__err" role="alert">
          {error}
        </span>
      ) : null}

      {notice ? (
        <span className="admin-article-thumb__ok" role="status" aria-live="polite">
          {notice}
        </span>
      ) : null}

      {failedSrc === thumbSrc && previewOverride?.uploaded ? (
        <span className="admin-article-thumb__err" role="alert">
          Không tải được ảnh
        </span>
      ) : null}
    </span>
  );
}
