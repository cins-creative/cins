/**
 * Chuẩn bị / xác minh custom domain Supabase Auth: auth.cins.vn
 *
 * Usage:
 *   node scripts/setup-auth-custom-domain.mjs dns          # tạo CNAME (DNS only)
 *   node scripts/setup-auth-custom-domain.mjs check        # kiểm tra DNS + HTTPS health
 *   node scripts/setup-auth-custom-domain.mjs dns --force  # cập nhật CNAME nếu đã có
 *
 * Env (.env.local): CLOUDFLARE_API_TOKEN (cần Zone:DNS Edit trên cins.vn)
 *
 * Sau DNS: Supabase Dashboard hoặc CLI:
 *   npx supabase domains create --project-ref ospzzzxcomrmhqrnkoiw --custom-hostname auth.cins.vn
 *   (thêm TXT verify nếu CLI yêu cầu) → domains reverify → domains activate
 * Rồi đổi NEXT_PUBLIC_SUPABASE_URL=https://auth.cins.vn + redeploy.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ZONE_NAME = "cins.vn";
const HOST = "auth.cins.vn";
const RECORD_NAME = "auth";
const PROJECT_REF = "ospzzzxcomrmhqrnkoiw";
const CNAME_TARGET = `${PROJECT_REF}.supabase.co`;
const CF_API = "https://api.cloudflare.com/client/v4";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
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

function token() {
  /* Ưu tiên .env.local — token Workers trên shell thường thiếu Zone:DNS Edit. */
  const local = loadEnvLocal();
  const t =
    local.CLOUDFLARE_API_TOKEN?.trim() ||
    process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!t) {
    console.error("Thiếu CLOUDFLARE_API_TOKEN trong .env.local hoặc môi trường.");
    process.exit(1);
  }
  return t;
}

async function cf(path, { method = "GET", body } = {}) {
  const res = await fetch(`${CF_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) {
    const msg = json.errors?.map((e) => e.message).join("; ") || res.statusText;
    throw new Error(`Cloudflare API: ${msg}`);
  }
  return json.result;
}

async function zoneId() {
  const zones = await cf(`/zones?name=${encodeURIComponent(ZONE_NAME)}`);
  if (!zones?.length) throw new Error(`Không tìm thấy zone ${ZONE_NAME}`);
  return zones[0].id;
}

async function listAuthRecords(zid) {
  return cf(
    `/zones/${zid}/dns_records?name=${encodeURIComponent(HOST)}`,
  );
}

async function ensureCname({ force }) {
  const zid = await zoneId();
  const existing = await listAuthRecords(zid);
  const cname = existing.find((r) => r.type === "CNAME");

  const payload = {
    type: "CNAME",
    name: RECORD_NAME,
    content: CNAME_TARGET,
    ttl: 1, // auto
    proxied: false, // DNS only — bắt buộc cho Supabase SSL
  };

  if (cname) {
    const same =
      cname.content.replace(/\.$/, "") === CNAME_TARGET &&
      cname.proxied === false;
    if (same && !force) {
      console.log(`Đã có CNAME ${HOST} → ${cname.content} (proxied=${cname.proxied})`);
      return;
    }
    if (!force && !same) {
      console.log(
        `Đã có record khác: ${cname.type} ${HOST} → ${cname.content} (proxied=${cname.proxied})`,
      );
      console.log("Chạy lại với --force để cập nhật.");
      process.exit(2);
    }
    await cf(`/zones/${zid}/dns_records/${cname.id}`, {
      method: "PUT",
      body: payload,
    });
    console.log(`Đã cập nhật CNAME ${HOST} → ${CNAME_TARGET} (DNS only)`);
    return;
  }

  await cf(`/zones/${zid}/dns_records`, { method: "POST", body: payload });
  console.log(`Đã tạo CNAME ${HOST} → ${CNAME_TARGET} (DNS only)`);
}

async function check() {
  console.log(`— DNS ${HOST}`);
  try {
    const { lookup } = await import("node:dns/promises");
    const cname = await lookup(HOST).catch(() => null);
    console.log("  A/AAAA resolve:", cname ?? "(chưa resolve)");
    try {
      const { resolveCname } = await import("node:dns/promises");
      const cn = await resolveCname(HOST);
      console.log("  CNAME:", cn.join(", "));
    } catch {
      console.log("  CNAME: (không đọc được — có thể đã flatten)");
    }
  } catch (e) {
    console.log("  DNS error:", e instanceof Error ? e.message : e);
  }

  console.log(`— HTTPS https://${HOST}/auth/v1/health`);
  try {
    const res = await fetch(`https://${HOST}/auth/v1/health`, {
      redirect: "manual",
    });
    console.log(`  status ${res.status}`);
    const text = await res.text().catch(() => "");
    if (text) console.log(`  body: ${text.slice(0, 120)}`);
    if (res.ok) {
      console.log("  → Domain đang phục vụ Auth. Có thể đổi NEXT_PUBLIC_SUPABASE_URL.");
    } else {
      console.log(
        "  → Chưa Active trên Supabase (DNS có thể OK nhưng SSL/add-on chưa xong).",
      );
    }
  } catch (e) {
    console.log("  fetch failed:", e instanceof Error ? e.message : e);
    console.log(
      "  → Cần: add-on Custom Domain + verify/activate trên Supabase.",
    );
  }

  console.log("\nTiếp theo (bạn / CLI):");
  console.log(
    `  npx supabase login`,
  );
  console.log(
    `  npx supabase domains create --project-ref ${PROJECT_REF} --custom-hostname ${HOST}`,
  );
  console.log(
    `  npx supabase domains reverify --project-ref ${PROJECT_REF}`,
  );
  console.log(
    `  npx supabase domains activate --project-ref ${PROJECT_REF}`,
  );
  console.log(
    `  Google OAuth redirect URI thêm: https://${HOST}/auth/v1/callback`,
  );
  console.log(
    `  Env: NEXT_PUBLIC_SUPABASE_URL=https://${HOST} → redeploy`,
  );
}

const [, , cmd, ...rest] = process.argv;
const force = rest.includes("--force");

if (cmd === "dns") {
  await ensureCname({ force });
  console.log("Đợi vài phút rồi chạy: node scripts/setup-auth-custom-domain.mjs check");
} else if (cmd === "check") {
  await check();
} else {
  console.log(`Usage:
  node scripts/setup-auth-custom-domain.mjs dns [--force]
  node scripts/setup-auth-custom-domain.mjs check`);
  process.exit(1);
}
