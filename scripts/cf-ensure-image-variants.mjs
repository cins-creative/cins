/**
 * Đảm bảo Cloudflare Images variants cho CINs (feed portrait 9:16, avatar @2x).
 *
 * Usage: node scripts/cf-ensure-image-variants.mjs
 * Env (.env.local): CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_IMAGES_API_TOKEN
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

function parseEnvFile(absPath) {
  const out = {};
  try {
    for (const rawLine of readFileSync(absPath, "utf8").split(/\r?\n/)) {
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
  } catch {
    /* ignore */
  }
  return out;
}

const env = parseEnvFile(path.join(repoRoot, ".env.local"));
const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = env.CLOUDFLARE_IMAGES_API_TOKEN?.trim();

if (!accountId || !token) {
  console.error("Thiếu CLOUDFLARE_ACCOUNT_ID hoặc CLOUDFLARE_IMAGES_API_TOKEN trong .env.local");
  process.exit(1);
}

const CF_API = "https://api.cloudflare.com/client/v4";

/** @type {Array<{ id: string; create?: boolean; options: { fit: string; width: number; height: number; metadata: string } }>} */
const TARGET_VARIANTS = [
  {
    id: "avatar",
    create: false,
    options: {
      fit: "cover",
      width: 256,
      height: 256,
      metadata: "none",
    },
  },
  {
    id: "public",
    create: false,
    options: {
      fit: "scale-down",
      width: 1920,
      height: 1080,
      metadata: "none",
    },
  },
  {
    id: "feed",
    create: true,
    options: {
      fit: "scale-down",
      width: 1366,
      height: 2430,
      metadata: "none",
    },
  },
  {
    id: "feedsm",
    create: true,
    options: {
      fit: "scale-down",
      width: 720,
      height: 1280,
      metadata: "none",
    },
  },
];

async function cfFetch(method, pathSuffix, body) {
  const res = await fetch(`${CF_API}${pathSuffix}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function listVariants() {
  const { res, json } = await cfFetch("GET", `/accounts/${accountId}/images/v1/variants`);
  if (!res.ok || !json?.success) {
    throw new Error(`list variants failed: ${JSON.stringify(json?.errors ?? res.status)}`);
  }
  const raw = json.result?.variants ?? json.result ?? {};
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "object" && raw
      ? Object.values(raw)
      : [];
  return new Map(list.map((v) => [v.id, v]));
}

async function upsertVariant(spec, existing) {
  const payload = {
    options: spec.options,
    neverRequireSignedURLs: true,
  };

  if (existing) {
    const { res, json } = await cfFetch(
      "PATCH",
      `/accounts/${accountId}/images/v1/variants/${encodeURIComponent(spec.id)}`,
      payload,
    );
    if (!res.ok || !json?.success) {
      throw new Error(
        `PATCH ${spec.id} failed: ${JSON.stringify(json?.errors ?? res.status)}`,
      );
    }
    return "updated";
  }

  if (!spec.create) {
    throw new Error(`Variant ${spec.id} chưa tồn tại — bật create hoặc tạo thủ công trên Dashboard`);
  }

  const { res, json } = await cfFetch(
    "POST",
    `/accounts/${accountId}/images/v1/variants`,
    { id: spec.id, ...payload },
  );
  if (!res.ok || !json?.success) {
    throw new Error(
      `POST ${spec.id} failed: ${JSON.stringify(json?.errors ?? res.status)}`,
    );
  }
  return "created";
}

async function main() {
  console.log("Cloudflare Images — ensure variants (account:", accountId, ")");
  const existing = await listVariants();
  console.log("Hiện có:", [...existing.keys()].sort().join(", ") || "(none)");

  for (const spec of TARGET_VARIANTS) {
    const hit = existing.get(spec.id);
    const action = await upsertVariant(spec, hit);
    const o = spec.options;
    console.log(
      `✓ ${spec.id}: ${action} → ${o.width}×${o.height} ${o.fit}`,
    );
  }

  console.log("\nXong. Cache variant sẽ được purge tự động khi PATCH.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
