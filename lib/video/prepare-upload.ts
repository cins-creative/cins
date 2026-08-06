import "server-only";

import { buildStreamIframeUrl } from "@/lib/cloudflare/stream-embed";
import {
  createStreamDirectUpload,
  getCloudflareStreamConfig,
} from "@/lib/cloudflare/stream";

/**
 * Chuẩn bị upload video (Journey/Shop) lên Cloudflare Stream
 * (direct-creator upload — tus qua uploadURL).
 */

export type VideoUploadPreparePayload = {
  provider: "stream";
  videoId: string;
  uploadURL: string;
  embedUrl: string;
};

export async function prepareVideoUpload(
  title: string,
): Promise<
  { ok: true; data: VideoUploadPreparePayload } | { ok: false; error: string }
> {
  if (!getCloudflareStreamConfig()) {
    return {
      ok: false,
      error: "Cloudflare Stream chưa được cấu hình.",
    };
  }

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
