import "server-only";

import { prepareBunnyVideoUpload } from "@/lib/bunny/stream";
import { buildStreamIframeUrl } from "@/lib/cloudflare/stream-embed";
import {
  createStreamDirectUpload,
  getCloudflareStreamConfig,
} from "@/lib/cloudflare/stream";

/**
 * Chuẩn bị upload video (Journey/Shop) — provider-aware:
 *   - Stream đã cấu hình  → tạo direct-creator upload (tus qua uploadURL).
 *   - Ngược lại           → Bunny (giữ nguyên trong lúc migrate).
 *
 * Client phân biệt bằng `provider` để chọn cách tus upload.
 */

export type VideoUploadPreparePayload =
  | {
      provider: "stream";
      videoId: string;
      uploadURL: string;
      embedUrl: string;
    }
  | {
      provider: "bunny";
      videoId: string;
      libraryId: string;
      embedUrl: string;
      authorizationSignature: string;
      authorizationExpire: number;
    };

export async function prepareVideoUpload(
  title: string,
): Promise<
  { ok: true; data: VideoUploadPreparePayload } | { ok: false; error: string }
> {
  if (getCloudflareStreamConfig()) {
    const up = await createStreamDirectUpload({ title });
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

  const bunny = await prepareBunnyVideoUpload(title);
  if (!bunny.ok) return bunny;
  return { ok: true, data: { provider: "bunny", ...bunny.data } };
}
