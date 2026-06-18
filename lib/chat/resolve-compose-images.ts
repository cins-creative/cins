import {
  fetchChatComposeImageUpload,
  type ComposeImageUploadResult,
} from "@/lib/chat/compose-image-upload";
import type { PendingImageDraft } from "@/lib/chat/compose-draft";

export type ResolvedComposeImage = {
  localId: string;
  imageId: string;
  previewUrl: string;
};

export async function waitForComposeUploadResult(
  localId: string,
  inFlight: Map<string, Promise<ComposeImageUploadResult>>,
): Promise<ComposeImageUploadResult | null> {
  const pending = inFlight.get(localId);
  if (!pending) return null;
  return pending;
}

/** Upload / chờ upload xong — dùng sau khi UI đã hiện album optimistic. */
export async function resolvePendingImagesForSend(params: {
  snapshots: PendingImageDraft[];
  filesByLocalId: Map<string, File>;
  inFlightUploads: Map<string, Promise<ComposeImageUploadResult>>;
}): Promise<ResolvedComposeImage[]> {
  const resolved: ResolvedComposeImage[] = [];

  for (const snapshot of params.snapshots) {
    if (snapshot.error) {
      throw new Error(snapshot.error);
    }

    if (snapshot.imageId) {
      resolved.push({
        localId: snapshot.localId,
        imageId: snapshot.imageId,
        previewUrl: snapshot.previewUrl,
      });
      continue;
    }

    const inFlight = await waitForComposeUploadResult(
      snapshot.localId,
      params.inFlightUploads,
    );
    if (inFlight?.ok) {
      resolved.push({
        localId: snapshot.localId,
        imageId: inFlight.imageId,
        previewUrl: inFlight.url?.trim() || snapshot.previewUrl,
      });
      continue;
    }
    if (inFlight && !inFlight.ok) {
      throw new Error(inFlight.error);
    }

    const file = params.filesByLocalId.get(snapshot.localId);
    if (!file) {
      throw new Error("Ảnh chưa sẵn sàng — hãy thử gửi lại.");
    }

    const upload = await fetchChatComposeImageUpload(file);
    if (!upload.ok) {
      throw new Error(upload.error);
    }

    resolved.push({
      localId: snapshot.localId,
      imageId: upload.imageId,
      previewUrl: upload.url?.trim() || snapshot.previewUrl,
    });
  }

  return resolved;
}
