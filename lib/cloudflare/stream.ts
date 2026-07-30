import "server-only";

/**
 * Cloudflare Stream — server helpers (thay Bunny Stream cho Journey/Shop video).
 *
 * Env cần cấu hình (secret trừ ACCOUNT_ID/CUSTOMER_CODE):
 * - `CLOUDFLARE_ACCOUNT_ID`         — đã có (wrangler vars).
 * - `CLOUDFLARE_STREAM_API_TOKEN`   — token có quyền Stream:Edit (secret).
 * - `CLOUDFLARE_STREAM_CUSTOMER_CODE` — mã customer subdomain phát HLS/thumbnail
 *   (dạng `customer-xxxx`). Không bí mật; cũng expose client qua
 *   `NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE` (xem lib/cloudflare/stream-embed.ts).
 */

export type CloudflareStreamConfig = {
  accountId: string;
  apiToken: string;
  customerCode: string | null;
};

export function getCloudflareStreamConfig(): CloudflareStreamConfig | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim();
  const customerCode =
    process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE?.trim() ||
    process.env.NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE?.trim() ||
    null;

  if (!accountId || !apiToken) return null;
  return { accountId, apiToken, customerCode };
}

const STREAM_API_BASE = "https://api.cloudflare.com/client/v4";

type StreamApiResult<T> = {
  success?: boolean;
  errors?: Array<{ message?: string }>;
  result?: T;
};

function streamApiError(json: StreamApiResult<unknown> | null, fallback: string): string {
  return json?.errors?.[0]?.message?.trim() || fallback;
}

/**
 * Tạo direct-creator upload (tus resumable) — client upload thẳng file lên
 * `uploadURL` bằng tus-js-client, không đi qua server. Trả `uid` để lưu block.
 */
export async function createStreamDirectUpload(params?: {
  maxDurationSeconds?: number;
  title?: string;
}): Promise<
  { ok: true; uid: string; uploadURL: string } | { ok: false; error: string }
> {
  const config = getCloudflareStreamConfig();
  if (!config) {
    return { ok: false, error: "Cloudflare Stream chưa được cấu hình." };
  }

  const res = await fetch(
    `${STREAM_API_BASE}/accounts/${config.accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: params?.maxDurationSeconds ?? 3600,
        requireSignedURLs: false,
        ...(params?.title
          ? { meta: { name: params.title.slice(0, 200) } }
          : {}),
      }),
    },
  );

  const json = (await res.json().catch(() => null)) as StreamApiResult<{
    uid?: string;
    uploadURL?: string;
  }> | null;

  if (!res.ok || !json?.result?.uid || !json.result.uploadURL) {
    return {
      ok: false,
      error: streamApiError(json, "Không tạo được upload trên Cloudflare Stream."),
    };
  }

  return { ok: true, uid: json.result.uid, uploadURL: json.result.uploadURL };
}

/**
 * Copy video từ một URL công khai (dùng cho backfill Bunny → Stream).
 * Stream tự pull + transcode; poll `getStreamVideoStatus` tới ready.
 */
export async function copyStreamFromUrl(
  url: string,
  meta?: { title?: string },
): Promise<{ ok: true; uid: string } | { ok: false; error: string }> {
  const config = getCloudflareStreamConfig();
  if (!config) {
    return { ok: false, error: "Cloudflare Stream chưa được cấu hình." };
  }

  const res = await fetch(
    `${STREAM_API_BASE}/accounts/${config.accountId}/stream/copy`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        ...(meta?.title ? { meta: { name: meta.title.slice(0, 200) } } : {}),
      }),
    },
  );

  const json = (await res.json().catch(() => null)) as StreamApiResult<{
    uid?: string;
  }> | null;

  if (!res.ok || !json?.result?.uid) {
    return {
      ok: false,
      error: streamApiError(json, "Không copy được video sang Cloudflare Stream."),
    };
  }

  return { ok: true, uid: json.result.uid };
}

type StreamVideoRow = {
  readyToStream?: boolean;
  status?: { state?: string; pctComplete?: string };
  duration?: number;
  input?: { width?: number; height?: number };
};

export async function getStreamVideoStatus(uid: string): Promise<
  | { ok: true; ready: boolean; state: string; duration: number | null; width: number | null; height: number | null }
  | { ok: false; error: string }
> {
  const config = getCloudflareStreamConfig();
  if (!config) {
    return { ok: false, error: "Cloudflare Stream chưa được cấu hình." };
  }

  const res = await fetch(
    `${STREAM_API_BASE}/accounts/${config.accountId}/stream/${encodeURIComponent(uid)}`,
    {
      headers: { Authorization: `Bearer ${config.apiToken}` },
      cache: "no-store",
    },
  );

  const json = (await res.json().catch(() => null)) as StreamApiResult<StreamVideoRow> | null;
  if (!res.ok || !json?.result) {
    return { ok: false, error: streamApiError(json, "Không đọc được trạng thái video.") };
  }

  const row = json.result;
  const width = typeof row.input?.width === "number" && row.input.width > 0 ? row.input.width : null;
  const height = typeof row.input?.height === "number" && row.input.height > 0 ? row.input.height : null;
  return {
    ok: true,
    ready: row.readyToStream === true || row.status?.state === "ready",
    state: row.status?.state ?? "unknown",
    duration: typeof row.duration === "number" && row.duration > 0 ? row.duration : null,
    width,
    height,
  };
}

/** Xóa video khỏi Cloudflare Stream (best-effort). */
export async function deleteStreamVideo(
  uid: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = uid.trim();
  const config = getCloudflareStreamConfig();
  if (!id || !config) {
    return { ok: false, error: "Cloudflare Stream chưa được cấu hình." };
  }

  try {
    const res = await fetch(
      `${STREAM_API_BASE}/accounts/${config.accountId}/stream/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${config.apiToken}` },
      },
    );
    if (res.ok || res.status === 404) return { ok: true };
    const json = (await res.json().catch(() => null)) as StreamApiResult<unknown> | null;
    return { ok: false, error: streamApiError(json, "Không xóa được video Stream.") };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không xóa được video Stream.",
    };
  }
}
