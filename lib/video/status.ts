import "server-only";

import { isStreamUid } from "@/lib/cloudflare/stream-embed";
import { getStreamVideoStatus } from "@/lib/cloudflare/stream";

/** Trạng thái encode Cloudflare Stream. */
export async function getVideoStatus(
  videoId: string,
  provider?: string | null,
): Promise<
  { ok: true; ready: boolean; status: number } | { ok: false; error: string }
> {
  const isStream = provider === "stream" || isStreamUid(videoId);
  if (!isStream) {
    return {
      ok: false,
      error: "Chỉ hỗ trợ Cloudflare Stream.",
    };
  }
  const res = await getStreamVideoStatus(videoId);
  if (!res.ok) return res;
  return { ok: true, ready: res.ready, status: res.ready ? 4 : 2 };
}
