import "server-only";

import { buildStreamIframeUrl } from "@/lib/cloudflare/stream-embed";
import {
  createStreamDirectUpload,
  getCloudflareStreamConfig,
} from "@/lib/cloudflare/stream";

/** Khớp giới hạn client Journey/Shop — Stream TUS cần Upload-Length lúc tạo slot. */
export const MAX_VIDEO_UPLOAD_BYTES = 500 * 1024 * 1024;

/**
 * Chuẩn bị upload video (Journey/Shop) lên Cloudflare Stream
 * (TUS direct-user — Location rồi client PATCH).
 */

export type VideoUploadPreparePayload = {
  provider: "stream";
  videoId: string;
  uploadURL: string;
  embedUrl: string;
};

export async function prepareVideoUpload(
  title: string,
  uploadLength: number,
): Promise<
  { ok: true; data: VideoUploadPreparePayload } | { ok: false; error: string }
> {
  if (!getCloudflareStreamConfig()) {
    return {
      ok: false,
      error: "Cloudflare Stream chưa được cấu hình.",
    };
  }

  if (!Number.isFinite(uploadLength) || uploadLength <= 0) {
    return { ok: false, error: "Thiếu kích thước file video." };
  }
  if (uploadLength > MAX_VIDEO_UPLOAD_BYTES) {
    return { ok: false, error: "Video quá lớn (giới hạn 500MB)." };
  }

  const up = await createStreamDirectUpload({ title, uploadLength });
  if (!up.ok) return { ok: false, error: up.error };
  return {
    ok: true,
    data: {
      provider: "stream",
      videoId: up.uid,
      uploadURL: up.uploadURL,
      embedUrl: buildStreamIframeUrl(up.uid),
    },
  };
}
