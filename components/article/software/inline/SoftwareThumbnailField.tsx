"use client";

import { useCallback } from "react";

import { SwInlineField } from "@/components/article/software/inline/SwInlineField";
import { useSoftwareInlineEdit } from "@/components/article/software/inline/SoftwareInlineEditContext";
import { InlineMultiImageGallery } from "@/components/shared/InlineMultiImageGallery";
import { rememberCfAccountHashFromDeliveryUrl } from "@/lib/cloudflare/account-hash";
import { extractCfImageIdFromDeliveryUrl } from "@/lib/cloudflare/image-id-from-url";
import { resolveSoftwareEditingImageUrl } from "@/lib/articles/software-editing-image";
import { uploadNganhInlineImage } from "@/lib/nganh/upload-inline-image";

type Props = {
  fallbackIconUrl?: string | null;
};

function applyThumbnailUrl(
  url: string,
  setThumbnail: (v: string) => void,
  setThumbnailPreviewUrl: (v: string | null) => void,
) {
  const trimmed = url.trim();
  if (!trimmed) {
    setThumbnail("");
    setThumbnailPreviewUrl(null);
    return;
  }
  rememberCfAccountHashFromDeliveryUrl(trimmed);
  const imageId = extractCfImageIdFromDeliveryUrl(trimmed);
  setThumbnailPreviewUrl(trimmed);
  setThumbnail(imageId ?? trimmed);
}

export function SoftwareThumbnailField({ fallbackIconUrl }: Props) {
  const ctx = useSoftwareInlineEdit();
  const setThumbnail = ctx?.setThumbnail;
  const setThumbnailPreviewUrl = ctx?.setThumbnailPreviewUrl;
  const showToast = ctx?.showToast;

  const uploadImage = useCallback(
    (file: File) => uploadNganhInlineImage(file),
    [],
  );

  const handleImagesChange = useCallback(
    (urls: string[]) => {
      if (!setThumbnail || !setThumbnailPreviewUrl) return;
      if (!urls.length) {
        setThumbnail("");
        setThumbnailPreviewUrl(null);
        showToast?.("Đã xóa logo.");
        return;
      }
      applyThumbnailUrl(urls[0]!, setThumbnail, setThumbnailPreviewUrl);
    },
    [setThumbnail, setThumbnailPreviewUrl, showToast],
  );

  if (!ctx?.isEditing) return null;

  const { thumbnail, thumbnail_preview_url, article } = ctx;

  const displayUrl = resolveSoftwareEditingImageUrl(
    thumbnail,
    thumbnail_preview_url,
    article.thumbnail,
    fallbackIconUrl,
  );
  const images = displayUrl ? [displayUrl] : [];

  return (
    <SwInlineField label="Logo phần mềm">
      <InlineMultiImageGallery
        images={images}
        onChange={handleImagesChange}
        onNotify={ctx.showToast}
        uploadImage={uploadImage}
        maxImages={1}
        dropzoneLabel="+ Thêm logo"
        dropzoneHint="Kéo thả hoặc chọn file — dán ảnh (Ctrl+V) khi focus vào vùng này"
      />
    </SwInlineField>
  );
}
