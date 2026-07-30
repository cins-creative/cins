/**
 * Backfill: migrate video Bunny Stream cũ → Cloudflare Stream (copy-by-URL).
 *
 * Quét mọi tham chiếu Bunny trong:
 *   - content_tac_pham.noi_dung_blocks / noi_dung_html
 *   - org_bai_dang.noi_dung_blocks
 *   - shop_nhom.video_phu_id
 * Với mỗi video Bunny (guid): Cloudflare Stream **copy-by-URL** từ MP4 fallback
 * của Bunny → poll ready → ghi mapping guid→uid → rewrite blocks + HTML + shop.
 *
 * NGUYÊN TẮC AN TOÀN:
 *   - Mặc định **dry-run**: chỉ liệt kê + tạo bản copy trên Stream (không ghi DB).
 *   - `--confirm`  : ghi lại DB (blocks/html/shop) trỏ sang Stream.
 *   - **KHÔNG** xóa video Bunny (giữ làm nguồn tới khi verify xong — Phase 4).
 *   - Idempotent: dùng file mapping `scripts/.stream-migration-map.json`;
 *     bỏ qua video đã có provider=stream / uid hợp lệ.
 *
 * Usage:
 *   node scripts/migrate-bunny-to-stream.mjs                        # dry-run TOÀN BỘ (copy + poll, không ghi DB)
 *   node scripts/migrate-bunny-to-stream.mjs --user=nguyenthanhtu   # CHỈ Journey của 1 user (bỏ org + shop)
 *   node scripts/migrate-bunny-to-stream.mjs --user=nguyenthanhtu --confirm   # ghi DB cho user đó
 *   node scripts/migrate-bunny-to-stream.mjs --confirm              # ghi DB (toàn bộ)
 *   node scripts/migrate-bunny-to-stream.mjs --copy-only            # chỉ tạo copy + mapping, KHÔNG poll/ghi
 *   node scripts/migrate-bunny-to-stream.mjs --quality=1080p        # chất lượng MP4 nguồn (mặc định 720p)
 *   node scripts/migrate-bunny-to-stream.mjs --limit=5              # giới hạn số video xử lý (staged)
 *
 * Env (.env.local):
 *   DATABASE_URL
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_STREAM_API_TOKEN         (Stream:Edit)
 *   NEXT_PUBLIC_BUNNY_CDN_HOSTNAME | BUNNY_CDN_HOSTNAME | BUNNY_CND_HOSTNAME
 *
 * Cách migrate: tải MP4 từ Bunny với Referer https://cins.vn/ (Allowed Referrers),
 * rồi upload lên Stream — không dùng copy-by-URL (Stream fetch không gửi Referer → 403).
 * Bunny giữ nguyên làm nguồn.
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GUID_G = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const STREAM_UID_RE = /^[0-9a-f]{32}$/i;
const MAP_PATH = path.join(process.cwd(), "scripts", ".stream-migration-map.json");
const POLL_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 6000;

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    if (!process.env[key]) process.env[key] = t.slice(i + 1).trim();
  }
}

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
}
function flag(name) {
  return process.argv.includes(`--${name}`);
}

function loadMap() {
  try {
    return JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  } catch {
    return {};
  }
}
function saveMap(map) {
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2));
}

function bunnyCdnHostname() {
  return (
    process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME?.trim() ||
    process.env.BUNNY_CDN_HOSTNAME?.trim() ||
    process.env.BUNNY_CND_HOSTNAME?.trim() || // typo trong .env.local
    null
  );
}

function bunnyMp4Url(guid, quality) {
  const bunnyCdn = bunnyCdnHostname();
  if (!bunnyCdn) return null;
  /* Không ký token — Bunny library này chặn bằng Referer, không phải Token Auth. */
  return `https://${bunnyCdn}/${guid}/play_${quality}.mp4`;
}
function bunnyOriginalUrl(guid) {
  const bunnyCdn = bunnyCdnHostname();
  if (!bunnyCdn) return null;
  return `https://${bunnyCdn}/${guid}/original`;
}
function streamIframeUrl(uid) {
  return `https://iframe.cloudflarestream.com/${uid}`;
}

/** Bunny Allowed Referrers — fetch không có Referer → 403; Stream copy-by-URL cũng vậy. */
const BUNNY_FETCH_REFERER = "https://cins.vn/";

function streamConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim();
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

/** Tải MP4 từ Bunny CDN với Referer (bypass hotlink). */
async function downloadBunnyMp4(guid, quality) {
  const candidates = [
    bunnyMp4Url(guid, quality),
    quality !== "720p" ? bunnyMp4Url(guid, "720p") : null,
    bunnyMp4Url(guid, "480p"),
    bunnyMp4Url(guid, "360p"),
    bunnyOriginalUrl(guid),
  ].filter(Boolean);

  let lastErr = "không tải được MP4 từ Bunny";
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { Referer: BUNNY_FETCH_REFERER },
        redirect: "follow",
      });
      if (!res.ok) {
        lastErr = `Bunny ${res.status} ${url}`;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 1000) {
        lastErr = `file quá nhỏ (${buf.byteLength}B) từ ${url}`;
        continue;
      }
      return { ok: true, buffer: buf, src: url };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, error: lastErr };
}

/** Upload buffer lên Cloudflare Stream (multipart). */
async function uploadStreamFromBuffer(cfg, buffer, title) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([buffer], { type: "video/mp4" }),
    `${(title || "video").slice(0, 80)}.mp4`,
  );

  const qs = title
    ? `?meta=${encodeURIComponent(JSON.stringify({ name: String(title).slice(0, 200) }))}`
    : "";
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/stream${qs}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiToken}` },
      body: form,
    },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.result?.uid) {
    return {
      ok: false,
      error:
        json?.errors?.[0]?.message ||
        json?.messages?.[0]?.message ||
        `HTTP ${res.status}`,
    };
  }
  return { ok: true, uid: json.result.uid };
}

async function streamStatus(cfg, uid) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/stream/${encodeURIComponent(uid)}`,
    { headers: { Authorization: `Bearer ${cfg.apiToken}` } },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.result) {
    return { ok: false, error: json?.errors?.[0]?.message || `HTTP ${res.status}` };
  }
  const r = json.result;
  return {
    ok: true,
    ready: r.readyToStream === true || r.status?.state === "ready",
    state: r.status?.state ?? "unknown",
    pct: r.status?.pctComplete ?? null,
  };
}

async function pollReady(cfg, uid) {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const s = await streamStatus(cfg, uid);
    if (!s.ok) return s;
    if (s.ready) return { ok: true, ready: true };
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return { ok: false, error: "timeout chờ Stream encode" };
}

/** Download từ Bunny (kèm Referer) → upload Stream. Idempotent qua mapping. */
async function ensureStreamCopy(cfg, guid, quality, title, map, copyOnly) {
  const existing = map[guid];
  if (existing && STREAM_UID_RE.test(existing.uid || "")) {
    if (existing.ready || copyOnly) return { ok: true, uid: existing.uid, reused: true };
    const s = await pollReady(cfg, existing.uid);
    if (s.ok) {
      existing.ready = true;
      return { ok: true, uid: existing.uid, reused: true };
    }
    return { ok: false, error: existing.uid + ": " + s.error };
  }

  if (!bunnyCdnHostname()) {
    return { ok: false, error: "thiếu BUNNY_CDN_HOSTNAME để dựng URL nguồn" };
  }

  const dl = await downloadBunnyMp4(guid, quality);
  if (!dl.ok) return dl;

  const up = await uploadStreamFromBuffer(cfg, dl.buffer, title);
  if (!up.ok) return up;

  map[guid] = {
    uid: up.uid,
    src: dl.src,
    bytes: dl.buffer.byteLength,
    ready: false,
    at: new Date().toISOString(),
  };
  saveMap(map);

  if (copyOnly) return { ok: true, uid: up.uid, reused: false };

  const ready = await pollReady(cfg, up.uid);
  if (!ready.ok) return { ok: false, error: up.uid + ": " + ready.error };
  map[guid].ready = true;
  saveMap(map);
  return { ok: true, uid: up.uid, reused: false };
}

/** Rewrite embed blocks: bunny → stream. Trả {blocks, changed}. */
function rewriteBlocks(blocks, map) {
  if (!Array.isArray(blocks)) return { blocks, changed: false };
  let changed = false;
  const out = blocks.map((block) => {
    if (!block || block.loai !== "embed" || !block.config) return block;
    const cfg = block.config;
    const url = typeof cfg.url === "string" ? cfg.url : "";
    let guid =
      (typeof cfg.bunnyVideoId === "string" && GUID_RE.test(cfg.bunnyVideoId.trim())
        ? cfg.bunnyVideoId.trim()
        : null) || null;
    if (!guid) {
      const m = url.match(GUID_G);
      if (m && GUID_RE.test(m[0])) guid = m[0];
    }
    if (!guid || !map[guid]?.uid) return block;

    const uid = map[guid].uid;
    changed = true;
    const nextCfg = { ...cfg };
    // Giữ tham chiếu Bunny để rollback tới khi Phase 4 xác nhận.
    if (cfg.bunnyVideoId && !cfg.legacyBunnyVideoId) {
      nextCfg.legacyBunnyVideoId = cfg.bunnyVideoId;
    }
    if (url && !cfg.legacyBunnyUrl) nextCfg.legacyBunnyUrl = url;
    nextCfg.videoProvider = "stream";
    nextCfg.videoId = uid;
    nextCfg.url = streamIframeUrl(uid);
    delete nextCfg.bunnyVideoId;
    delete nextCfg.videoProcessing;
    return { ...block, config: nextCfg };
  });
  return { blocks: out, changed };
}

/** Rewrite HTML tĩnh: thay iframe/URL Bunny của từng guid bằng iframe Stream. */
function rewriteHtml(html, map) {
  if (typeof html !== "string" || !html) return { html, changed: false };
  let changed = false;
  let out = html;
  for (const [guid, entry] of Object.entries(map)) {
    if (!entry?.uid || !html.includes(guid)) continue;
    const uid = entry.uid;
    // iframe.mediadelivery.net/embed/{lib}/{guid} → iframe.cloudflarestream.com/{uid}
    const embedRe = new RegExp(
      `https?://(?:iframe|player)\\.mediadelivery\\.net/embed/[^/"']+/${guid}`,
      "gi",
    );
    // {cdn}.b-cdn.net/{guid}(/...)? → iframe stream
    const cdnRe = new RegExp(
      `https?://[a-z0-9.-]+\\.b-cdn\\.net/${guid}[^"'\\s)]*`,
      "gi",
    );
    const before = out;
    out = out
      .replace(embedRe, streamIframeUrl(uid))
      .replace(cdnRe, streamIframeUrl(uid));
    if (out !== before) {
      changed = true;
      out = out.replace(/data-provider="bunny"/gi, 'data-provider="stream"');
    }
  }
  return { html: out, changed };
}

// ── Chạy ──────────────────────────────────────────────────────────────────
loadEnv();

const confirm = flag("confirm");
const copyOnly = flag("copy-only");
const quality = arg("quality", "720p");
const limit = Number(arg("limit", "0")) || 0;
const userSlug = arg("user", null)?.trim() || null;

const cfg = streamConfig();
if (!cfg) {
  console.error(
    "Thiếu CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_STREAM_API_TOKEN — không thể copy sang Stream.",
  );
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("Thiếu DATABASE_URL.");
  process.exit(1);
}

const db = postgres(process.env.DATABASE_URL, { max: 1 });
const map = loadMap();

/* Nếu giới hạn theo user: resolve id + CHỈ migrate Journey (content_tac_pham) của user đó,
   bỏ qua org_bai_dang & shop_nhom (không thuộc tài khoản cá nhân). */
let scopedUserId = null;
if (userSlug) {
  const [u] = await db`SELECT id, slug FROM user_nguoi_dung WHERE slug = ${userSlug}`;
  if (!u) {
    console.error(`Không tìm thấy user slug: ${userSlug}`);
    await db.end();
    process.exit(1);
  }
  scopedUserId = u.id;
  console.log(`Scope: chỉ Journey của user '${userSlug}' (${scopedUserId}).`);
}

/** Thu thập guid Bunny từ tất cả nguồn (hoặc chỉ user khi --user). */
const guidSet = new Set();

const tacRows = scopedUserId
  ? await db`
      SELECT id, tieu_de, noi_dung_blocks, noi_dung_html
      FROM content_tac_pham
      WHERE id_nguoi_dung = ${scopedUserId}
        AND noi_dung_blocks::text ~* 'mediadelivery|b-cdn|bunnyVideoId'
    `
  : await db`
      SELECT id, tieu_de, noi_dung_blocks, noi_dung_html
      FROM content_tac_pham
      WHERE noi_dung_blocks::text ~* 'mediadelivery|b-cdn|bunnyVideoId'
    `;
const orgRows = scopedUserId
  ? []
  : await db`
      SELECT id, tieu_de, noi_dung_blocks
      FROM org_bai_dang
      WHERE noi_dung_blocks::text ~* 'mediadelivery|b-cdn|bunnyVideoId'
    `;
const shopRows = scopedUserId
  ? []
  : await db`
      SELECT id, nhan, video_phu_id
      FROM shop_nhom
      WHERE video_phu_id IS NOT NULL AND video_phu_id ~* '^[0-9a-f-]{36}$'
    `;

function collectBunnyGuids(raw, into) {
  if (!raw) return;
  if (Array.isArray(raw)) {
    for (const block of raw) {
      if (!block || block.loai !== "embed" || !block.config) continue;
      const cfg = block.config;
      /* Đã migrate → Stream: bỏ qua (kể cả còn legacyBunny*). */
      if (cfg.videoProvider === "stream") continue;
      if (
        typeof cfg.bunnyVideoId === "string" &&
        GUID_RE.test(cfg.bunnyVideoId.trim())
      ) {
        into.add(cfg.bunnyVideoId.trim().toLowerCase());
      }
      const url = typeof cfg.url === "string" ? cfg.url : "";
      if (
        /mediadelivery\.net|b-cdn\.net/i.test(url) ||
        cfg.videoProvider === "bunny"
      ) {
        const m = url.match(GUID_G);
        if (m?.[0] && GUID_RE.test(m[0])) into.add(m[0].toLowerCase());
      }
    }
    return;
  }
  /* Fallback string scrape — chỉ khi có dấu hiệu Bunny và chưa stream. */
  const s = typeof raw === "string" ? raw : JSON.stringify(raw);
  if (!/mediadelivery|b-cdn|"bunnyVideoId"/i.test(s)) return;
  if (/"videoProvider"\s*:\s*"stream"/i.test(s) && !/"bunnyVideoId"\s*:/i.test(s)) {
    return;
  }
  for (const m of s.matchAll(/(?<![A-Za-z])"bunnyVideoId"\s*:\s*"([0-9a-f-]{36})"/gi)) {
    if (GUID_RE.test(m[1])) into.add(m[1].toLowerCase());
  }
  for (const m of s.matchAll(
    /(?:iframe|player)\.mediadelivery\.net\/embed\/[^/"']+\/([0-9a-f-]{36})/gi,
  )) {
    if (GUID_RE.test(m[1])) into.add(m[1].toLowerCase());
  }
  for (const m of s.matchAll(
    /[a-z0-9.-]+\.b-cdn\.net\/([0-9a-f-]{36})/gi,
  )) {
    if (GUID_RE.test(m[1])) into.add(m[1].toLowerCase());
  }
}

for (const r of tacRows) collectBunnyGuids(r.noi_dung_blocks, guidSet);
for (const r of orgRows) collectBunnyGuids(r.noi_dung_blocks, guidSet);
for (const r of shopRows) {
  if (GUID_RE.test(String(r.video_phu_id).trim())) {
    guidSet.add(String(r.video_phu_id).trim().toLowerCase());
  }
}

let guids = [...guidSet];
if (limit > 0) guids = guids.slice(0, limit);

console.log(
  JSON.stringify(
    {
      mode: confirm ? "CONFIRM (ghi DB)" : copyOnly ? "COPY-ONLY" : "DRY-RUN",
      scope: userSlug ? `user:${userSlug}` : "ALL",
      quality,
      sources: {
        content_tac_pham: tacRows.length,
        org_bai_dang: orgRows.length,
        shop_nhom: shopRows.length,
      },
      uniqueBunnyVideos: guidSet.size,
      willProcess: guids.length,
    },
    null,
    2,
  ),
);

// 1) Copy + poll từng video (ghi mapping).
const results = [];
for (const guid of guids) {
  process.stdout.write(`\n[copy] ${guid} … `);
  const res = await ensureStreamCopy(cfg, guid, quality, `CINS ${guid}`, map, copyOnly);
  if (res.ok) {
    process.stdout.write(`→ ${res.uid}${res.reused ? " (reuse)" : ""}`);
  } else {
    process.stdout.write(`LỖI: ${res.error}`);
  }
  results.push({ guid, ...res });
}
console.log("\n");

const copied = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
console.log(`Copy xong: ${copied}/${guids.length} ok, ${failed.length} lỗi.`);
if (failed.length) console.log(JSON.stringify(failed, null, 2));

if (copyOnly) {
  console.log("\n[COPY-ONLY] Đã tạo bản copy + mapping. Chưa poll/ghi DB.");
  await db.end();
  process.exit(0);
}
if (!confirm) {
  console.log(
    "\n[DRY-RUN] Đã copy sang Stream + poll ready. KHÔNG ghi DB. Thêm --confirm để rewrite blocks/html/shop.",
  );
  await db.end();
  process.exit(0);
}

// 2) Rewrite DB (chỉ với video đã ready trong mapping).
console.log("\nĐang rewrite DB (blocks/html/shop) → Stream…");
const readyMap = Object.fromEntries(
  Object.entries(map).filter(([, v]) => v?.ready && v?.uid),
);

let tacUpdated = 0;
let orgUpdated = 0;
let shopUpdated = 0;

await db.begin(async (tx) => {
  for (const r of tacRows) {
    const rb = rewriteBlocks(r.noi_dung_blocks, readyMap);
    const rh = rewriteHtml(r.noi_dung_html, readyMap);
    if (rb.changed || rh.changed) {
      await tx`
        UPDATE content_tac_pham
        SET noi_dung_blocks = ${tx.json(rb.blocks)},
            noi_dung_html = ${rh.html ?? r.noi_dung_html}
        WHERE id = ${r.id}
      `;
      tacUpdated++;
    }
  }

  for (const r of orgRows) {
    const rb = rewriteBlocks(r.noi_dung_blocks, readyMap);
    if (rb.changed) {
      await tx`
        UPDATE org_bai_dang
        SET noi_dung_blocks = ${tx.json(rb.blocks)}
        WHERE id = ${r.id}
      `;
      orgUpdated++;
    }
  }

  for (const r of shopRows) {
    const guid = String(r.video_phu_id).trim().toLowerCase();
    const uid = readyMap[guid]?.uid;
    if (uid) {
      await tx`UPDATE shop_nhom SET video_phu_id = ${uid} WHERE id = ${r.id}`;
      shopUpdated++;
    }
  }
});

console.log(
  JSON.stringify(
    {
      done: true,
      rewritten: {
        content_tac_pham: tacUpdated,
        org_bai_dang: orgUpdated,
        shop_nhom: shopUpdated,
      },
      note: "Video Bunny vẫn còn (nguồn) — chỉ xóa ở Phase 4 sau khi verify.",
    },
    null,
    2,
  ),
);

await db.end();
