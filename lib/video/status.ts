import "server-only";

import { getBunnyVideoStatus } from "@/lib/bunny/stream";
import { isStreamUid } from "@/lib/cloudflare/stream-embed";
import { getStreamVideoStatus } from "@/lib/cloudflare/stream";

/** Trạng thái encode — auto route theo provider (uid Stream 32-hex vs Bunny GUID). */
export async function getVideoStatus(
  videoId: string,
  provider?: string | null,
): Promise<
  { ok: true; ready: boolean; status: number } | { ok: false; error: string }
> {
  const isStream = provider === "stream" || isStreamUid(videoId);
  if (isStream) {
    const res = await getStreamVideoStatus(videoId);
    if (!res.ok) return res;
    return { ok: true, ready: res.ready, status: res.ready ? 4 : 2 };
  }
  return getBunnyVideoStatus(videoId);
}
