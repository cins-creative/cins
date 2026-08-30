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

function encodeTusMetadataValue(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function buildStreamTusMetadata(params: {
  title?: string;
  maxDurationSeconds: number;
}): string {
  const parts = [
    `maxdurationseconds ${encodeTusMetadataValue(String(params.maxDurationSeconds))}`,
  ];
  const name = params.title?.trim().slice(0, 200);
  if (name) {
    parts.push(`name ${encodeTusMetadataValue(name)}`);
  }
  return parts.join(",");
}

function uidFromStreamTusLocation(location: string): string | null {
  try {
    const path = new URL(location).pathname;
    const match = path.match(/\/([0-9a-f]{32})(?:\/|$)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Tạo slot TUS direct-creator (`POST /stream?direct_user=true`).
 * `/stream/direct_upload` chỉ dành cho POST multipart ≤200MB — tus-js-client
 * POST lên URL đó sẽ bị Cloudflare 400 Decoding Error.
 * Client PATCH thẳng `uploadURL` (Location), không tạo upload lần nữa.
 */
export async function createStreamDirectUpload(params: {
  uploadLength: number;
  maxDurationSeconds?: number;
  title?: string;
}): Promise<
  { ok: true; uid: string; uploadURL: string } | { ok: false; error: string }
> {
  const config = getCloudflareStreamConfig();
  if (!config) {
    return { ok: false, error: "Cloudflare Stream chưa được cấu hình." };
  }

  const uploadLength = Math.floor(params.uploadLength);
  if (!Number.isFinite(uploadLength) || uploadLength <= 0) {
    return { ok: false, error: "Thiếu kích thước file video." };
  }

  const maxDurationSeconds = params.maxDurationSeconds ?? 3600;
  const res = await fetch(
    `${STREAM_API_BASE}/accounts/${config.accountId}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(uploadLength),
        "Upload-Metadata": buildStreamTusMetadata({
          title: params.title,
          maxDurationSeconds,
        }),
      },
    },
  );

  const locationRaw = res.headers.get("Location")?.trim() ?? "";
  let uploadURL = "";
  if (locationRaw) {
    try {
      uploadURL = new URL(locationRaw, `${STREAM_API_BASE}/`).href;
    } catch {
      uploadURL = "";
    }
  }
  const uid =
    res.headers.get("stream-media-id")?.trim() ||
    uidFromStreamTusLocation(uploadURL);

  if (!res.ok || !uploadURL || !uid) {
    const json = (await res.json().catch(() => null)) as StreamApiResult<{
      uid?: string;
    }> | null;
    return {
      ok: false,
      error: streamApiError(json, "Không tạo được upload trên Cloudflare Stream."),
    };
  }

  return { ok: true, uid, uploadURL };
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
