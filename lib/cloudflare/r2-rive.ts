import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import {
  buildRiveAssetPublicUrl as buildPublicUrl,
  isRiveAssetEmbedUrl,
  isValidRiveObjectKey,
  parseRiveAssetObjectKeyFromUrl,
} from "@/lib/editor/rive-asset-url";

export {
  CINS_RIVE_ASSET_PATH_PREFIX,
  isRiveAssetEmbedUrl,
  isValidRiveObjectKey,
  parseRiveAssetObjectKeyFromUrl,
} from "@/lib/editor/rive-asset-url";

export const CINS_RIVE_R2_BUCKET = "cins-rive-assets";
export const CINS_RIVE_R2_BINDING = "CINS_RIVE_ASSETS";
export const MAX_RIVE_FILE_BYTES = 15 * 1024 * 1024;

type R2BucketBinding = {
  put: (
    key: string,
    value: ArrayBuffer | ReadableStream | Blob | string,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
    },
  ) => Promise<unknown>;
  get: (key: string) => Promise<R2ObjectBody | null>;
};

type R2ObjectBody = {
  body: ReadableStream | null;
  size?: number;
  httpMetadata?: { contentType?: string };
};

function getR2Binding(): R2BucketBinding | null {
  /* `next dev` (Node) — không có R2 binding; tránh gọi getCloudflareContext có thể chậm/treo. */
  if (process.env.NODE_ENV === "development") {
    return null;
  }
  try {
    const ctx = getCloudflareContext();
    const bucket = (
      ctx?.env as unknown as Record<string, R2BucketBinding | undefined>
    )[CINS_RIVE_R2_BINDING];
    return bucket ?? null;
  } catch {
    return null;
  }
}

function getCloudflareAccountId(): string | null {
  return process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || null;
}

function getCloudflareApiToken(): string | null {
  return process.env.CLOUDFLARE_API_TOKEN?.trim() || null;
}

export function buildRiveObjectKey(profileId: string): string {
  return `rive/${profileId}/${crypto.randomUUID()}.riv`;
}

export function buildRiveAssetPublicUrl(
  objectKey: string,
  origin?: string | null,
): string {
  const base =
    origin?.replace(/\/$/, "") ||
    getConfiguredSiteOrigin() ||
    "http://localhost:3001";
  return buildPublicUrl(objectKey, base);
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
      error: "Thiếu CLOUDFLARE_ACCOUNT_ID hoặc CLOUDFLARE_API_TOKEN.",
    };
  }

  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${CINS_RIVE_R2_BUCKET}/objects/${encodedKey}`,
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
    const message =
      json?.errors?.[0]?.message || res.statusText || "Upload R2 thất bại.";
    return { ok: false, error: message };
  }

  return { ok: true };
}

export async function putRiveObject(
  key: string,
  body: ArrayBuffer,
  contentType = "application/octet-stream",
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidRiveObjectKey(key)) {
    return { ok: false, error: "Key Rive không hợp lệ." };
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

export async function getRiveObject(
  key: string,
): Promise<
  | { ok: true; body: ReadableStream; contentType: string; size?: number }
  | { ok: false; error: string }
> {
  if (!isValidRiveObjectKey(key)) {
    return { ok: false, error: "Key Rive không hợp lệ." };
  }

  const bucket = getR2Binding();
  if (bucket) {
    try {
      const object = await bucket.get(key);
      if (!object?.body) {
        return { ok: false, error: "Không tìm thấy file Rive." };
      }
      return {
        ok: true,
        body: object.body,
        contentType:
          object.httpMetadata?.contentType || "application/octet-stream",
        size: object.size,
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Đọc R2 thất bại.",
      };
    }
  }

  const accountId = getCloudflareAccountId();
  const token = getCloudflareApiToken();
  if (!accountId || !token) {
    return {
      ok: false,
      error: "Thiếu CLOUDFLARE_ACCOUNT_ID hoặc CLOUDFLARE_API_TOKEN.",
    };
  }

  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${CINS_RIVE_R2_BUCKET}/objects/${encodedKey}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (!res.ok || !res.body) {
    return { ok: false, error: "Không tìm thấy file Rive." };
  }

  return {
    ok: true,
    body: res.body,
    contentType: res.headers.get("content-type") || "application/octet-stream",
    size: Number(res.headers.get("content-length") || "") || undefined,
  };
}
