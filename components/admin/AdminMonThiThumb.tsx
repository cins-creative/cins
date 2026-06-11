"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  getAdminMonThiThumbDisplayUrl,
  isAdminMonThiPlaceholderThumb,
  isAdminMonThiThumbFromArticleCover,
} from "@/lib/admin/mon-thi-display";
import type { AdminMonThiRow } from "@/lib/admin/mon-thi-server";
import { rememberCfAccountHashFromDeliveryUrl } from "@/lib/cloudflare/account-hash";
import { monThiPlaceholderInitials, monThiPlaceholderStyle } from "@/lib/truong/mon-thi-thumbnail";

type Props = {
  row: AdminMonThiRow;
  /** Tắt khi chưa có id DB (form tạo mới). */
  uploadEnabled?: boolean;
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

export function AdminMonThiThumb({
  row,
  uploadEnabled = true,
  onThumbnailChange,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const blobRef = useRef<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewOverride, setPreviewOverride] = useState<{
    rowId: string;
    url: string;
  } | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const title = row.ten;
  const rowPreviewUrl = getAdminMonThiThumbDisplayUrl(row);
  const thumbSrc =
    previewOverride?.rowId === row.id ? previewOverride.url : rowPreviewUrl;
  const hasThumb = Boolean(thumbSrc) && failedSrc !== thumbSrc;
  const isPlaceholder = isAdminMonThiPlaceholderThumb(row);
  const fromArticleCover = isAdminMonThiThumbFromArticleCover(row);

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
    if (!uploadEnabled || busy || row.id === "__new__") return;
    setError(null);
    setNotice("Đang upload…");
    setBusy(true);

    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
    const objectUrl = URL.createObjectURL(file);
    blobRef.current = objectUrl;
    setFailedSrc(null);
    setPreviewOverride({ rowId: row.id, url: objectUrl });

    const fd = new FormData();
    fd.append("file", file);

    try {
      const resp = await fetch(
        `/api/admin/mon-thi/${encodeURIComponent(row.id)}/thumbnail`,
        {
          method: "POST",
          body: fd,
          credentials: "include",
        },
      );

      const json = (await resp.json().catch(() => null)) as {
        ok?: boolean;
        thumbnail_id?: string;
        thumbnail_url?: string;
        error?: string;
      } | null;

      if (!resp.ok || !json?.ok || !json.thumbnail_id || !json.thumbnail_url) {
        if (blobRef.current) {
          URL.revokeObjectURL(blobRef.current);
          blobRef.current = null;
        }
        setPreviewOverride(null);
        setFailedSrc(null);
        setError(
          json?.error ??
            (resp.status === 413
              ? "Ảnh quá lớn (giới hạn 8MB)."
              : `Upload thất bại (${resp.status}).`),
        );
        setNotice(null);
        return;
      }

      rememberCfAccountHashFromDeliveryUrl(json.thumbnail_url);
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      setFailedSrc(null);
      setPreviewOverride({ rowId: row.id, url: json.thumbnail_url });
      onThumbnailChange?.({
        thumbnail_id: json.thumbnail_id,
        thumbnail_url: json.thumbnail_url,
      });
      showNotice("Upload hoàn tất");
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
    if (!uploadEnabled || busy) return;
    e?.preventDefault();
    e?.stopPropagation();
    inputRef.current?.click();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (!uploadEnabled || busy) return;
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

  const phStyle = monThiPlaceholderStyle(row.loai);
  const initials = monThiPlaceholderInitials(row.ten, row.ma);

  return (
    <span
      className={[
        "admin-article-thumb",
        uploadEnabled ? "admin-article-thumb--editable" : "",
        hasThumb ? "admin-article-thumb--has-img" : "admin-article-thumb--empty",
        fromArticleCover && hasThumb ? "admin-article-thumb--from-cover" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      tabIndex={uploadEnabled ? 0 : -1}
      onPaste={uploadEnabled ? onPaste : undefined}
      onClick={
        uploadEnabled
          ? (e) => {
              stopRow(e);
              if (hasThumb) openPicker(e);
            }
          : stopRow
      }
      onKeyDown={
        uploadEnabled
          ? (e) => {
              stopRow(e);
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openPicker();
              }
            }
          : stopRow
      }
      aria-label={
        uploadEnabled
          ? hasThumb
            ? `Ảnh môn ${title}. Bấm để đổi hoặc dán ảnh mới (Ctrl+V).`
            : `Ảnh môn ${title}. Dán ảnh (Ctrl+V) hoặc chọn file.`
          : `Ảnh môn ${title}`
      }
    >
      {uploadEnabled ? (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="admin-article-thumb__file"
          tabIndex={-1}
          aria-label={hasThumb ? "Đổi ảnh môn thi" : "Chọn ảnh môn thi"}
          disabled={busy}
          onClick={(e) => e.stopPropagation()}
          onChange={onPick}
        />
      ) : null}

      {hasThumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbSrc!}
          alt=""
          className="admin-article-thumb__img"
          loading="lazy"
          decoding="async"
          width={96}
          height={72}
          onError={() => setFailedSrc(thumbSrc ?? null)}
        />
      ) : (
        <span
          className="admin-article-thumb__ph admin-mon-thi-thumb__ph"
          style={{
            background: phStyle.bg,
            color: phStyle.fg,
          }}
          aria-hidden
        >
          <span className="admin-article-thumb__ph-mark">{initials}</span>
          <span className="admin-article-thumb__ph-hint">
            {busy ? "Đang tải…" : "Dán (Ctrl+V)"}
          </span>
        </span>
      )}

      {uploadEnabled ? (
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
      ) : null}

      {fromArticleCover && hasThumb ? (
        <span
          className="admin-article-thumb__badge"
          title="Ảnh từ cover bài viết liên kết (id_bai_viet) — dán/chọn để upload ảnh riêng cho môn"
        >
          bài
        </span>
      ) : isPlaceholder && !hasThumb ? (
        <span
          className="admin-article-thumb__badge"
          title="Chưa có ảnh (plh_*) — dán/chọn để upload Cloudflare"
        >
          plh
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

      {failedSrc === thumbSrc && previewOverride?.rowId === row.id ? (
        <span className="admin-article-thumb__err" role="alert">
          Không tải được ảnh
        </span>
      ) : null}
    </span>
  );
}
