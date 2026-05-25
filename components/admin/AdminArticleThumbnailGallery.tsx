"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { updateAdminArticleThumbnail } from "@/app/admin/actions";
import { InlineMultiImageGallery } from "@/components/shared/InlineMultiImageGallery";
import {
  clientUrlFromThumbnailValue,
  getAdminArticleThumbDisplayUrl,
} from "@/lib/admin/article-display";
import type { AdminArticleListRow } from "@/lib/admin/articles-server";

type Props = {
  articleId: string;
  thumbnail: string;
  onThumbnailChange: (value: string) => void;
  /** URL preview sau upload / fetch chi tiết. */
  thumbnailSrc?: string | null;
  onThumbnailSrcChange?: (url: string | null) => void;
  listRow?: AdminArticleListRow | null;
  disabled?: boolean;
};

function buildThumbnailGalleryImages(
  thumbnail: string,
  thumbnailSrc: string | null | undefined,
  listRow: AdminArticleListRow | null | undefined,
  hideCoverPreview: boolean,
): string[] {
  const t = thumbnail.trim();
  if (t) {
    const url = clientUrlFromThumbnailValue(t);
    return [url ?? t];
  }
  if (hideCoverPreview) return [];
  const src = thumbnailSrc?.trim() || listRow?.thumbnail_src?.trim();
  if (src) return [src];
  if (listRow) {
    const fallback = getAdminArticleThumbDisplayUrl(listRow);
    if (fallback) return [fallback];
  }
  return [];
}

export function AdminArticleThumbnailGallery({
  articleId,
  thumbnail,
  onThumbnailChange,
  thumbnailSrc,
  onThumbnailSrcChange,
  listRow,
  disabled,
}: Props) {
  const router = useRouter();
  const [hideCoverPreview, setHideCoverPreview] = useState(false);

  useEffect(() => {
    setHideCoverPreview(false);
  }, [articleId, thumbnail, thumbnailSrc, listRow?.thumbnail_src]);

  const images = useMemo(
    () =>
      buildThumbnailGalleryImages(
        thumbnail,
        thumbnailSrc,
        listRow,
        hideCoverPreview,
      ),
    [thumbnail, thumbnailSrc, listRow, hideCoverPreview],
  );

  const uploadImage = useCallback(
    async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await updateAdminArticleThumbnail(articleId, fd);
      if (!res.ok) return { ok: false, message: res.message };
      onThumbnailChange(res.thumbnail);
      onThumbnailSrcChange?.(res.thumbnail_url || null);
      setHideCoverPreview(false);
      router.refresh();
      return { ok: true, url: res.thumbnail_url };
    },
    [articleId, onThumbnailChange, onThumbnailSrcChange, router],
  );

  const onImagesChange = useCallback(
    (next: string[]) => {
      if (next.length > 0) return;
      onThumbnailChange("");
      if (!thumbnail.trim()) setHideCoverPreview(true);
    },
    [onThumbnailChange, thumbnail],
  );

  if (disabled) {
    return (
      <p className="form-hint">Thumbnail sẽ tải sau khi mở xong nội dung bài.</p>
    );
  }

  return (
    <div className="admin-article-thumbnail-gallery">
      <InlineMultiImageGallery
        images={images}
        onChange={onImagesChange}
        uploadImage={uploadImage}
        maxImages={1}
        globalPaste
        dropzoneLabel="Thêm ảnh"
        dropzoneHint="Kéo thả hoặc chọn file — dán ảnh (Ctrl+V) bất kỳ đâu trong hộp thoại"
        resolveImageUrl={(src) => clientUrlFromThumbnailValue(src) ?? src}
      />
    </div>
  );
}
