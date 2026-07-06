/**
 * Migrate org_bai_dang (truong_dai_hoc) → cấu trúc nội dung Phase 1–3.
 *
 * Usage:
 *   node scripts/migrate-truong-bai-dang-structure.mjs          # dry-run
 *   node scripts/migrate-truong-bai-dang-structure.mjs --apply  # ghi DB
 */
const SUPABASE_URL = "https://ospzzzxcomrmhqrnkoiw.supabase.co";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcHp6enhjb21ybWhxcm5rb2l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ2MTE3MSwiZXhwIjoyMDkxMDM3MTcxfQ.QKK61-D-vmy9RMWW59zha5ogvrtB31GSPE5pMIdsaeY";

const APPLY = process.argv.includes("--apply");
const MAX_MOTA = 280;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

function htmlToPlain(html) {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeCompare(s) {
  return htmlToPlain(s).replace(/\s+/g, " ").trim().slice(0, MAX_MOTA);
}

function textsDuplicate(tomTat, bodyHtml) {
  const a = normalizeCompare(tomTat);
  const b = normalizeCompare(bodyHtml);
  if (!a || !b) return false;
  if (a === b) return true;
  const minLen = Math.min(a.length, b.length, 80);
  if (minLen >= 40 && a.slice(0, minLen) === b.slice(0, minLen)) return true;
  return false;
}

function isValidImageSeed(seed) {
  if (typeof seed !== "string") return false;
  const t = seed.trim();
  if (!t) return false;
  if (UUID_RE.test(t)) return true;
  return /^https?:\/\//i.test(t);
}

function parseBlocks(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const loai = item.loai;
    if (typeof loai !== "string") continue;
    out.push({
      id: typeof item.id === "string" ? item.id : `b-mig-${out.length}`,
      loai,
      thu_tu: typeof item.thu_tu === "number" ? item.thu_tu : out.length,
      config:
        item.config && typeof item.config === "object"
          ? { ...item.config }
          : {},
    });
  }
  return out.sort((a, b) => a.thu_tu - b.thu_tu);
}

function meaningfulBlocks(blocks) {
  return blocks.filter((b) => b.loai !== "spacer");
}

function sanitizeImgsBlock(block) {
  const raw = block.config?.imgs;
  if (!Array.isArray(raw)) return null;
  const imgs = raw
    .filter((s) => isValidImageSeed(s))
    .map((s) => s.trim())
    .slice(0, 24);
  if (imgs.length === 0) return null;
  return {
    ...block,
    config: {
      ...block.config,
      layout: block.config?.layout === "mosaic" ? "mosaic" : "full",
      rounded: Boolean(block.config?.rounded),
      cap: String(block.config?.cap ?? "").slice(0, 280),
      imgs,
    },
  };
}

function migratePost(post) {
  const changes = [];
  let tomTat = (post.tom_tat ?? "").trim().slice(0, MAX_MOTA);
  let blocks = parseBlocks(post.noi_dung_blocks);

  const beforeBlockCount = blocks.length;

  // Drop empty/invalid imgs blocks
  blocks = blocks
    .map((b) => (b.loai === "imgs" ? sanitizeImgsBlock(b) : b))
    .filter(Boolean);

  if (blocks.length !== beforeBlockCount) {
    changes.push(`removed ${beforeBlockCount - blocks.length} empty imgs block(s)`);
  }

  // Derive tom_tat from first body if missing
  if (!tomTat) {
    const firstBody = meaningfulBlocks(blocks).find((b) => b.loai === "body");
    const plain = htmlToPlain(firstBody?.config?.html);
    if (plain) {
      tomTat = plain.slice(0, MAX_MOTA);
      changes.push("derived tom_tat from first body");
    }
  }

  // Remove first body duplicated in tom_tat
  const meaningful = meaningfulBlocks(blocks);
  const first = meaningful[0];
  if (first?.loai === "body" && tomTat && textsDuplicate(tomTat, first.config?.html)) {
    blocks = blocks.filter((b) => b.id !== first.id);
    changes.push("removed duplicate tom_tat body block");
  }

  // Renumber thu_tu
  blocks = blocks.map((b, i) => ({ ...b, thu_tu: i }));

  const payload = {
    tom_tat: tomTat || null,
    noi_dung_blocks: blocks,
    noi_dung: null,
    cap_nhat_luc: new Date().toISOString(),
  };

  const changed =
    changes.length > 0 ||
    (post.tom_tat ?? "").trim() !== (payload.tom_tat ?? "") ||
    JSON.stringify(post.noi_dung_blocks) !== JSON.stringify(blocks) ||
    post.noi_dung !== null;

  return { changed, changes, payload, blocks };
}

const orgRes = await fetch(
  `${SUPABASE_URL}/rest/v1/org_to_chuc?loai_to_chuc=eq.truong_dai_hoc&select=id,ten,slug`,
  { headers },
);
const orgs = await orgRes.json();
const orgMap = new Map(orgs.map((o) => [o.id, o]));
const orgIds = orgs.map((o) => o.id);

if (orgIds.length === 0) {
  console.log("No truong orgs.");
  process.exit(0);
}

const postsRes = await fetch(
  `${SUPABASE_URL}/rest/v1/org_bai_dang?id_to_chuc=in.(${orgIds.join(",")})&select=id,id_to_chuc,tieu_de,tom_tat,cover_id,noi_dung,noi_dung_blocks,trang_thai&order=tao_luc.asc`,
  { headers },
);
const posts = await postsRes.json();

const toUpdate = [];
for (const post of posts) {
  const { changed, changes, payload } = migratePost(post);
  if (changed) {
    toUpdate.push({
      id: post.id,
      org: orgMap.get(post.id_to_chuc)?.ten ?? post.id_to_chuc,
      tieu_de: post.tieu_de,
      changes,
      payload,
    });
  }
}

console.log(`Posts scanned: ${posts.length}`);
console.log(`Need update: ${toUpdate.length}`);
console.log(APPLY ? "MODE: APPLY" : "MODE: dry-run");

for (const item of toUpdate) {
  console.log(`\n• ${item.id}`);
  console.log(`  org: ${item.org}`);
  console.log(`  title: ${item.tieu_de?.slice(0, 70)}`);
  console.log(`  changes: ${item.changes.join("; ") || "normalize"}`);
}

if (!APPLY) {
  console.log("\nRun with --apply to write changes.");
  process.exit(0);
}

let ok = 0;
let fail = 0;
for (const item of toUpdate) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/org_bai_dang?id=eq.${item.id}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(item.payload),
    },
  );
  if (res.ok) {
    ok++;
  } else {
    fail++;
    console.error(`FAIL ${item.id}:`, await res.text());
  }
}

console.log(`\nDone: ${ok} updated, ${fail} failed.`);
