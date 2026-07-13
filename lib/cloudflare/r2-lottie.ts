import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import {
  buildLottieAssetPublicUrl as buildPublicUrl,
  isLottieAssetEmbedUrl,
  isValidLottieObjectKey,
  parseLottieAssetObjectKeyFromUrl,
} from "@/lib/editor/lottie-asset-url";

export {
  CINS_LOTTIE_ASSET_PATH_PREFIX,
  isLottieAssetEmbedUrl,
  isValidLottieObjectKey,
  parseLottieAssetObjectKeyFromUrl,
} from "@/lib/editor/lottie-asset-url";

/** Cùng bucket R2 với Rive — prefix key `lottie/`. */
export const CINS_LOTTIE_R2_BUCKET = "cins-rive-assets";
export const CINS_LOTTIE_R2_BINDING = "CINS_RIVE_ASSETS";
export const MAX_LOTTIE_FILE_BYTES = 15 * 1024 * 1024;

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
  if (process.env.NODE_ENV === "development") {
    return null;
  }
  try {
    const ctx = getCloudflareContext();
    const bucket = (
      ctx?.env as unknown as Record<string, R2BucketBinding | undefined>
    )[CINS_LOTTIE_R2_BINDING];
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

export function buildLottieObjectKey(
  profileId: string,
  ext: "lottie" | "json",
): string {
  return `lottie/${profileId}/${crypto.randomUUID()}.${ext}`;
}

export function buildLottieAssetPublicUrl(
  objectKey: string,
  origin?: string | null,
): string {
  const base =
    origin?.replace(/\/$/, "") ||
    getConfiguredSiteOrigin() ||
    "http://localhost:3001";
  return buildPublicUrl(objectKey, base);
}

function contentTypeForExt(ext: "lottie" | "json"): string {
  return ext === "json" ? "application/json" : "application/zip";
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
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${CINS_LOTTIE_R2_BUCKET}/objects/${encodedKey}`,
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

export async function putLottieObject(
  key: string,
  body: ArrayBuffer,
  contentType?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidLottieObjectKey(key)) {
    return { ok: false, error: "Key Lottie không hợp lệ." };
  }

  const ext = key.toLowerCase().endsWith(".json") ? "json" : "lottie";
  const type = contentType || contentTypeForExt(ext);

  const bucket = getR2Binding();
  if (bucket) {
    try {
      await bucket.put(key, body, {
        httpMetadata: {
          contentType: type,
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

  return putViaApi(key, body, type);
}

export async function getLottieObject(
  key: string,
): Promise<
  | { ok: true; body: ReadableStream; contentType: string; size?: number }
  | { ok: false; error: string }
> {
  if (!isValidLottieObjectKey(key)) {
    return { ok: false, error: "Key Lottie không hợp lệ." };
  }

  const ext = key.toLowerCase().endsWith(".json") ? "json" : "lottie";
  const fallbackType = contentTypeForExt(ext);

  const bucket = getR2Binding();
  if (bucket) {
    try {
      const object = await bucket.get(key);
      if (!object?.body) {
        return { ok: false, error: "Không tìm thấy file Lottie." };
      }
      return {
        ok: true,
        body: object.body,
        contentType: object.httpMetadata?.contentType || fallbackType,
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
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${CINS_LOTTIE_R2_BUCKET}/objects/${encodedKey}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (!res.ok || !res.body) {
    return { ok: false, error: "Không tìm thấy file Lottie." };
  }

  return {
    ok: true,
    body: res.body,
    contentType: res.headers.get("content-type") || fallbackType,
    size: Number(res.headers.get("content-length") || "") || undefined,
  };
}
