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

export function AdminArticleThumb({ row }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const blobRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(() =>
    getAdminArticleThumbDisplayUrl(row),
  );
  const [imgFailed, setImgFailed] = useState(false);

  const title = row.tieu_de?.trim() || row.slug;
  const thumbSrc = previewUrl;
  const hasThumb = Boolean(thumbSrc) && !imgFailed;
  const fromCoverFallback = isAdminThumbFromCoverFallback(row);
  const hasThumbnailField = Boolean(row.thumbnail?.trim());

  useEffect(() => {
    setPreviewUrl(getAdminArticleThumbDisplayUrl(row));
    setImgFailed(false);
    setError(null);
  }, [row.id, row.thumbnail, row.cover_id, row.thumbnail_src, row.thumbnail_from_cover]);

  useEffect(() => {
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, []);

  const uploadFile = async (file: File) => {
    if (busy) return;
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

    const res = await updateAdminArticleThumbnail(row.id, fd);

    if (!res.ok) {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      setPreviewUrl(getAdminArticleThumbDisplayUrl(row));
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
        <button
          type="button"
          className="admin-article-thumb__pick"
          disabled={busy}
          onClick={openPicker}
        >
          {busy ? "Đang tải…" : hasThumb ? "Đổi ảnh" : "Chọn ảnh"}
        </button>
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

      {imgFailed ? (
        <span className="admin-article-thumb__err" role="alert">
          Không tải được ảnh
        </span>
      ) : null}
    </span>
  );
}
