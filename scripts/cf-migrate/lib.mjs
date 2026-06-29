/**
 * Shared helpers for the Cloudflare Images account migration
 * (old account nguyenthanhtu.nkl@gmail.com -> new account info.cins.vn@gmail.com).
 *
 * Strategy: mirror every image from the OLD Cloudflare Images account into the
 * NEW account while PRESERVING the image id (Cloudflare lets you set a custom
 * `id` on upload). Because ids are preserved:
 *   - columns that store only the Cloudflare image id need no change;
 *   - columns / HTML / jsonb that store full imagedelivery.net URLs only need
 *     the account-hash segment swapped (old hash -> new hash).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");

/** Parse a dotenv-style file into a plain object (no interpolation). */
function parseEnvFile(absPath) {
  const out = {};
  let text;
  try {
    text = readFileSync(absPath, "utf8");
  } catch {
    return out;
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function loadConfig() {
  const cinsEnvPath = path.join(repoRoot, ".env.local");
  const cinsEnv = parseEnvFile(cinsEnvPath);

  // The new account credentials live in the sineart project env.
  const sineEnvPath = path.join(
    repoRoot,
    "..",
    "..",
    "Sine Art new",
    "sineart-web-v2",
    ".env.local",
  );
  const sineEnv = parseEnvFile(sineEnvPath);

  const cfg = {
    repoRoot,
    cinsEnvPath,
    sineEnvPath,
    databaseUrl: cinsEnv.DATABASE_URL,
    old: {
      accountId: cinsEnv.CLOUDFLARE_ACCOUNT_ID,
      token: cinsEnv.CLOUDFLARE_IMAGES_API_TOKEN,
      hash: cinsEnv.NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH,
    },
    new: {
      accountId: sineEnv.CF_R2_ACCOUNT_ID,
      token: sineEnv.CF_IMAGE_SINEART_V2,
      hash: sineEnv.SINE_ART_CF_ACCOUNT,
    },
  };
  return cfg;
}

const CF_API = "https://api.cloudflare.com/client/v4";

export async function cfListImages({ accountId, token }, { page, perPage }) {
  const url = `${CF_API}/accounts/${accountId}/images/v1?page=${page}&per_page=${perPage}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(
      `cfListImages failed (HTTP ${res.status}): ${JSON.stringify(
        json?.errors ?? res.statusText,
      )}`,
    );
  }
  return json.result; // { images: [...], ... }
}

/** Stats endpoint: total image count for the account. */
export async function cfImageStats({ accountId, token }) {
  const url = `${CF_API}/accounts/${accountId}/images/v1/stats`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(
      `cfImageStats failed (HTTP ${res.status}): ${JSON.stringify(
        json?.errors ?? res.statusText,
      )}`,
    );
  }
  return json.result;
}

/** Get details for a single image (variants, meta) in an account. */
export async function cfGetImage({ accountId, token }, id) {
  const url = `${CF_API}/accounts/${accountId}/images/v1/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => null);
  if (res.status === 404) return { exists: false };
  if (!res.ok || !json?.success) {
    throw new Error(
      `cfGetImage failed (HTTP ${res.status}): ${JSON.stringify(
        json?.errors ?? res.statusText,
      )}`,
    );
  }
  return { exists: true, result: json.result };
}

/**
 * Download the ORIGINAL uploaded bytes of an image via the CF API blob endpoint.
 * GET /accounts/{id}/images/v1/{id}/blob  -> raw original image.
 */
export async function cfDownloadBlob({ accountId, token }, id) {
  const url = `${CF_API}/accounts/${accountId}/images/v1/${encodeURIComponent(id)}/blob`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return { ok: false, error: `blob HTTP ${res.status}` };
  }
  const arrayBuf = await res.arrayBuffer();
  const contentType =
    res.headers.get("content-type") || "application/octet-stream";
  return { ok: true, bytes: Buffer.from(arrayBuf), contentType };
}

/**
 * Download the original bytes of an image from the OLD account.
 * Cloudflare delivery: https://imagedelivery.net/{hash}/{id}/{variant}
 * We try a list of variants until one returns 2xx.
 */
export async function downloadImageBlob(hash, id, variants = ["public"]) {
  let lastErr = null;
  for (const variant of variants) {
    const url = `https://imagedelivery.net/${hash}/${id}/${variant}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const contentType =
          res.headers.get("content-type") || "application/octet-stream";
        return { ok: true, bytes: Buffer.from(arrayBuf), contentType, variant };
      }
      lastErr = `HTTP ${res.status} on variant ${variant}`;
    } catch (err) {
      lastErr = String(err?.message ?? err);
    }
  }
  return { ok: false, error: lastErr };
}

/**
 * Upload bytes to the NEW account with a custom id (preserving the original id).
 * Returns { ok, alreadyExists?, result? , error? }.
 */
export async function uploadImageWithId({ accountId, token }, id, bytes, contentType, metadata) {
  const form = new FormData();
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : contentType.includes("gif")
        ? "gif"
        : "jpg";
  const blob = new Blob([bytes], { type: contentType });
  const fileName = id ? `${id}.${ext}` : `upload.${ext}`;
  form.append("file", blob, fileName);
  if (id) form.append("id", id);
  if (metadata && Object.keys(metadata).length > 0) {
    form.append("metadata", JSON.stringify(metadata));
  }

  const res = await fetch(`${CF_API}/accounts/${accountId}/images/v1`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => null);
  if (res.ok && json?.success) {
    return { ok: true, result: json.result };
  }
  // Cloudflare returns an error if the id already exists (code 5409 / "already exists").
  const errStr = JSON.stringify(json?.errors ?? res.statusText);
  if (/already exists|5409|ERROR_ID_EXISTS/i.test(errStr)) {
    return { ok: true, alreadyExists: true };
  }
  return { ok: false, error: `HTTP ${res.status}: ${errStr}` };
}
