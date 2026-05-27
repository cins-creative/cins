"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { updateAdminArticleThumbnail } from "@/app/admin/actions";
import {
  getAdminArticleThumbDisplayUrl,
  isAdminThumbFromCoverFallback,
} from "@/lib/admin/article-display";
import type { AdminArticleListRow } from "@/lib/admin/articles-server";
import { rememberCfAccountHashFromDeliveryUrl } from "@/lib/cloudflare/account-hash";

type Props = {
  row: AdminArticleListRow;
  priority?: boolean;
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

export function AdminArticleThumb({ row, priority = false }: Props) {
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

  const title = row.tieu_de?.trim() || row.slug;
  const rowPreviewUrl = getAdminArticleThumbDisplayUrl(row);
  const thumbSrc =
    previewOverride?.rowId === row.id ? previewOverride.url : rowPreviewUrl;
  const hasThumb = Boolean(thumbSrc) && failedSrc !== thumbSrc;
  const fromCoverFallback = isAdminThumbFromCoverFallback(row);
  const hasThumbnailField = Boolean(row.thumbnail?.trim());

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
    if (busy) return;
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
    setPreviewOverride({ rowId: row.id, url: objectUrl, uploaded: false });

    const fd = new FormData();
    fd.append("file", file);

    const res = await updateAdminArticleThumbnail(row.id, fd);

    if (!res.ok) {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      setPreviewOverride(null);
      setFailedSrc(null);
      setError(res.message);
      setNotice(null);
      setBusy(false);
      return;
    }

    rememberCfAccountHashFromDeliveryUrl(res.thumbnail_url);
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
    setFailedSrc(null);
    setPreviewOverride({ rowId: row.id, url: res.thumbnail_url, uploaded: true });
    setWaitingForUploadedImage(true);
    setNotice("Đang tải ảnh mới…");
    router.refresh();
    setBusy(false);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void uploadFile(f);
  };

  const openPicker = (e?: React.SyntheticEvent) => {
    if (busy) return;
    e?.preventDefault();
    e?.stopPropagation();
    inputRef.current?.click();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (busy) return;
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
        "admin-article-thumb--editable",
        hasThumb ? "admin-article-thumb--has-img" : "admin-article-thumb--empty",
        fromCoverFallback && hasThumb ? "admin-article-thumb--from-cover" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      tabIndex={0}
      onPaste={onPaste}
      onClick={(e) => {
        stopRow(e);
        if (hasThumb) openPicker(e);
      }}
      onKeyDown={(e) => {
        stopRow(e);
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      aria-label={
        hasThumb
          ? `Thumbnail: ${title}. Bấm để đổi ảnh hoặc dán ảnh mới (Ctrl+V).`
          : `Thumbnail: ${title}. Dán ảnh (Ctrl+V) hoặc chọn file.`
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="admin-article-thumb__file"
        tabIndex={-1}
        aria-label={hasThumb ? "Đổi ảnh thumbnail" : "Chọn ảnh thumbnail"}
        disabled={busy}
        onClick={(e) => e.stopPropagation()}
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
            {busy
              ? "Đang tải…"
              : hasThumbnailField
                ? "Không load được thumbnail"
                : "Dán (Ctrl+V)"}
          </span>
        </span>
      )}

      <span
        className={
          hasThumb
            ? "admin-article-thumb__actions admin-article-thumb__actions--overlay"
            : "admin-article-thumb__actions"
        }
      >
        <span
          className="admin-article-thumb__pick"
          aria-disabled={busy}
          aria-hidden
        >
          {busy ? "Đang tải…" : hasThumb ? "Đổi ảnh" : "Chọn ảnh"}
        </span>
      </span>

      {fromCoverFallback && hasThumb ? (
        <span className="admin-article-thumb__badge" title="Đang dùng cover_id — dán/chọn để ghi thumbnail">
          cover
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
