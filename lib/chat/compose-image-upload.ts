import { rememberCfAccountHashFromDeliveryUrl } from "@/lib/cloudflare/account-hash";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import {
  createPendingImageDraft,
  imageFileFingerprint,
  type PendingImageDraft,
} from "@/lib/chat/compose-draft";

export type ComposeImageUploadResult =
  | { ok: true; imageId: string; url?: string }
  | { ok: false; error: string };

export function planPendingImageAdditions(
  files: File[],
  existing: PendingImageDraft[],
): Array<{ file: File; draft: PendingImageDraft }> {
  const seen = new Set(
    existing
      .map((item) => item.fingerprint)
      .filter((value): value is string => Boolean(value)),
  );
  const out: Array<{ file: File; draft: PendingImageDraft }> = [];

  for (const file of files) {
    if (!isAllowedUploadImageFile(file)) continue;
    const fingerprint = imageFileFingerprint(file);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    const localId = crypto.randomUUID();
    out.push({
      file,
      draft: createPendingImageDraft({
        localId,
        fingerprint,
        previewUrl: URL.createObjectURL(file),
        imageId: null,
        uploading: true,
      }),
    });
  }

  return out;
}

export async function fetchChatComposeImageUpload(
  file: File,
): Promise<ComposeImageUploadResult> {
  if (!isAllowedUploadImageFile(file)) {
    return { ok: false, error: "File không phải ảnh." };
  }

  const form = new FormData();
  form.append("file", file);
  try {
    const res = await fetch("/api/post-image/upload", {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as {
      imageId?: string;
      url?: string;
      error?: string;
    };
    if (!res.ok || !data.imageId) {
      return { ok: false, error: data.error || "Upload thất bại." };
    }
    if (data.url) rememberCfAccountHashFromDeliveryUrl(data.url);
    return { ok: true, imageId: data.imageId, url: data.url };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Upload thất bại.",
    };
  }
}

export function patchPendingImageUploadResult(
  images: PendingImageDraft[],
  localId: string,
  result: ComposeImageUploadResult,
): PendingImageDraft[] {
  return images.map((item) => {
    if (item.localId !== localId) return item;
    if (!result.ok) {
      return { ...item, uploading: false, error: result.error };
    }
    if (item.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(item.previewUrl);
    }
    return {
      ...item,
      previewUrl: result.url?.trim() || item.previewUrl,
      imageId: result.imageId,
      uploading: false,
      error: undefined,
    };
  });
}

/** Draft khôi phục khi đổi phòng — upload đang dở không có `File` để tiếp tục. */
export function normalizeRestoredComposeImages(
  images: PendingImageDraft[],
): PendingImageDraft[] {
  return images.map((img) =>
    img.uploading && !img.imageId
      ? {
          ...img,
          uploading: false,
          error: "Upload bị gián đoạn — hãy đính kèm lại ảnh.",
        }
      : img,
  );
}
