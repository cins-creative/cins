/**
 * DNS + kiểm tra zone cho manage.cins.vn (Zone:DNS Edit).
 *   node scripts/setup-manage-domain.mjs check
 *   node scripts/setup-manage-domain.mjs dns
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ZONE_NAME = "cins.vn";
const HOST = "manage.cins.vn";
const RECORD_NAME = "manage";
const CF_API = "https://api.cloudflare.com/client/v4";
const ACCOUNT_ID = "2a6e413a7ced7243651c9d476e7d2f25";

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
  /* Token Wrangler (shell) trước — token trong .env.local có thể thiếu Zone:DNS. */
  const local = loadEnvLocal();
  const t =
    process.env.CLOUDFLARE_API_TOKEN?.trim() ||
    local.CLOUDFLARE_API_TOKEN?.trim();
  if (!t) {
    console.error("Thiếu CLOUDFLARE_API_TOKEN");
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

async function findManageRecord(zid) {
  const recs = await cf(
    `/zones/${zid}/dns_records?name=${encodeURIComponent(HOST)}`,
  );
  return recs?.[0] ?? null;
}

async function listWorkerScripts() {
  const scripts = await cf(`/accounts/${ACCOUNT_ID}/workers/scripts`);
  return (scripts ?? []).map((s) => s.id);
}

async function listWorkerDomains() {
  return cf(`/accounts/${ACCOUNT_ID}/workers/domains`);
}

const cmd = process.argv[2] ?? "check";

const zid = await zoneId();
console.log(`zone ${ZONE_NAME} = ${zid}`);

let rec = null;
try {
  rec = await findManageRecord(zid);
  if (rec) {
    console.log(
      `DNS ${HOST}: ${rec.type} → ${rec.content} proxied=${rec.proxied}`,
    );
  } else {
    console.log(`DNS ${HOST}: chưa có`);
  }
} catch (e) {
  console.log(`DNS API: ${e.message} (token thiếu Zone:DNS)`);
}

try {
  const scripts = await listWorkerScripts();
  console.log(`workers: ${scripts.join(", ") || "(trống)"}`);
} catch (e) {
  console.log(`workers list: ${e.message}`);
}

try {
  const domains = await listWorkerDomains();
  const rows = (domains ?? []).map((d) => `${d.hostname} → ${d.service}`);
  console.log(`worker domains:\n${rows.join("\n") || "(trống)"}`);
} catch (e) {
  console.log(`worker domains: ${e.message}`);
}

if (cmd === "attach-cins" || cmd === "attach-manage") {
  const service = cmd === "attach-manage" ? "cins-manage" : "cins";
  const created = await cf(`/accounts/${ACCOUNT_ID}/workers/domains`, {
    method: "PUT",
    body: {
      environment: "production",
      hostname: HOST,
      service,
      zone_id: zid,
    },
  });
  console.log(
    `attached ${HOST} → ${created.service ?? service} (id=${created.id ?? "?"})`,
  );
  process.exit(0);
}

if (cmd === "dns") {
  if (rec) {
    console.log("Bỏ qua tạo DNS — record đã tồn tại.");
    process.exit(0);
  }
  await cf(`/zones/${zid}/dns_records`, {
    method: "POST",
    body: {
      type: "CNAME",
      name: RECORD_NAME,
      content: "cins.vn",
      proxied: true,
      comment: "CINs manage Worker — gắn bằng wrangler custom_domain",
    },
  });
  console.log(`Đã tạo CNAME ${HOST} → cins.vn (proxied)`);
}
