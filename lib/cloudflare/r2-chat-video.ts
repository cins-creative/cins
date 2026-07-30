import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * R2 lưu video chat (clip ngắn đã nén client). Mirror lib/cloudflare/r2-rive.ts.
 *
 * Phát công khai qua custom domain gắn vào bucket (Range/streaming + egress free),
 * KHÔNG stream qua Worker. Base URL công khai đặt ở `NEXT_PUBLIC_CHAT_VIDEO_BASE_URL`
 * (xem lib/chat/video-url.ts).
 */

export const CINS_CHAT_VIDEO_R2_BUCKET = "cins-chat-video";
export const CINS_CHAT_VIDEO_R2_BINDING = "CINS_CHAT_VIDEO";
/** Trần dung lượng sau nén client (đề phòng bypass) — 80MB. */
export const MAX_CHAT_VIDEO_BYTES = 80 * 1024 * 1024;

const KEY_RE = /^chat-video\/[0-9a-f]{2}\/[0-9a-f]{16,64}\.mp4$/i;

export function isValidChatVideoKey(key: string): boolean {
  return KEY_RE.test(key.trim());
}

/** Key theo content hash → dedup: cùng file chỉ lưu 1 object. */
export function buildChatVideoObjectKey(sha256Hex: string): string {
  const hash = sha256Hex.trim().toLowerCase();
  const shard = hash.slice(0, 2);
  return `chat-video/${shard}/${hash}.mp4`;
}

type R2BucketBinding = {
  put: (
    key: string,
    value: ArrayBuffer | ReadableStream | Blob | string,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
    },
  ) => Promise<unknown>;
  head: (key: string) => Promise<{ size?: number } | null>;
  delete: (key: string) => Promise<void>;
};

function getR2Binding(): R2BucketBinding | null {
  if (process.env.NODE_ENV === "development") return null;
  try {
    const ctx = getCloudflareContext();
    const bucket = (
      ctx?.env as unknown as Record<string, R2BucketBinding | undefined>
    )[CINS_CHAT_VIDEO_R2_BINDING];
    return bucket ?? null;
  } catch {
    return null;
  }
}

function getCloudflareAccountId(): string | null {
  return process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || null;
}

function getCloudflareApiToken(): string | null {
  return (
    process.env.CLOUDFLARE_R2_API_TOKEN?.trim() ||
    process.env.CLOUDFLARE_API_TOKEN?.trim() ||
    null
  );
}

function encodeKey(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function putViaApi(
  key: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const accountId = getCloudflareAccountId();
  const token = getCloudflareApiToken();
  if (!accountId || !token) {
    return {
      ok: false,
      error: "Thiếu CLOUDFLARE_ACCOUNT_ID hoặc token R2.",
    };
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${CINS_CHAT_VIDEO_R2_BUCKET}/objects/${encodeKey(key)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
      },
      body,
    },
  );

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as {
      errors?: Array<{ message?: string }>;
    } | null;
    return {
      ok: false,
      error: json?.errors?.[0]?.message || res.statusText || "Upload R2 thất bại.",
    };
  }
  return { ok: true };
}

/** true nếu object đã tồn tại (dedup theo hash) — chỉ khả dụng qua binding. */
export async function chatVideoObjectExists(key: string): Promise<boolean> {
  if (!isValidChatVideoKey(key)) return false;
  const bucket = getR2Binding();
  if (!bucket) return false;
  try {
    const head = await bucket.head(key);
    return Boolean(head);
  } catch {
    return false;
  }
}

export async function putChatVideoObject(
  key: string,
  body: ArrayBuffer,
  contentType = "video/mp4",
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidChatVideoKey(key)) {
    return { ok: false, error: "Key video chat không hợp lệ." };
  }
  if (body.byteLength > MAX_CHAT_VIDEO_BYTES) {
    return { ok: false, error: "Video vượt giới hạn dung lượng." };
  }

  const bucket = getR2Binding();
  if (bucket) {
    try {
      await bucket.put(key, body, {
        httpMetadata: {
          contentType,
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Upload R2 thất bại.",
      };
    }
  }

  return putViaApi(key, body, contentType);
}

export async function deleteChatVideoObject(
  key: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidChatVideoKey(key)) {
    return { ok: false, error: "Key video chat không hợp lệ." };
  }

  const bucket = getR2Binding();
  if (bucket) {
    try {
      await bucket.delete(key);
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Xóa R2 thất bại.",
      };
    }
  }

  const accountId = getCloudflareAccountId();
  const token = getCloudflareApiToken();
  if (!accountId || !token) {
    return { ok: false, error: "Thiếu CLOUDFLARE_ACCOUNT_ID hoặc token R2." };
  }
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${CINS_CHAT_VIDEO_R2_BUCKET}/objects/${encodeKey(key)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  if (res.ok || res.status === 404) return { ok: true };
  return { ok: false, error: "Xóa R2 thất bại." };
}
