"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { updateAdminMonThiThumbnail } from "@/app/admin/actions";
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
  onThumbnailChange?: (thumbnail_id: string) => void;
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(() =>
    getAdminMonThiThumbDisplayUrl(row),
  );
  const [imgFailed, setImgFailed] = useState(false);

  const title = row.ten;
  const thumbSrc = previewUrl;
  const hasThumb = Boolean(thumbSrc) && !imgFailed;
  const isPlaceholder = isAdminMonThiPlaceholderThumb(row);
  const fromArticleCover = isAdminMonThiThumbFromArticleCover(row);

  useEffect(() => {
    setPreviewUrl(getAdminMonThiThumbDisplayUrl(row));
    setImgFailed(false);
    setError(null);
  }, [
    row.id,
    row.thumbnail_id,
    row.thumbnail_src,
    row.thumbnail_from_cover,
    row.id_bai_viet,
  ]);

  useEffect(() => {
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, []);

  const uploadFile = async (file: File) => {
    if (!uploadEnabled || busy || row.id === "__new__") return;
    setError(null);
    setBusy(true);

    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
    const objectUrl = URL.createObjectURL(file);
    blobRef.current = objectUrl;
    setPreviewUrl(objectUrl);

    const fd = new FormData();
    fd.append("file", file);

    const res = await updateAdminMonThiThumbnail(row.id, fd);

    if (!res.ok) {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      setPreviewUrl(getAdminMonThiThumbDisplayUrl(row));
      setImgFailed(false);
      setError(res.message);
      setBusy(false);
      return;
    }

    rememberCfAccountHashFromDeliveryUrl(res.thumbnail_url);
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
    setPreviewUrl(res.thumbnail_url);
    onThumbnailChange?.(res.thumbnail_id);
    router.refresh();
    setBusy(false);
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
              openPicker(e);
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
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="admin-sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onPick}
      />

      {hasThumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbSrc!}
          alt=""
          className="admin-article-thumb__img"
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
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

      {imgFailed ? (
        <span className="admin-article-thumb__err" role="alert">
          Không tải được ảnh
        </span>
      ) : null}
    </span>
  );
}
