/**
 * Survey org_bai_dang for truong_dai_hoc orgs.
 */
const SUPABASE_URL = "https://ospzzzxcomrmhqrnkoiw.supabase.co";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcHp6enhjb21ybWhxcm5rb2l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ2MTE3MSwiZXhwIjoyMDkxMDM3MTcxfQ.QKK61-D-vmy9RMWW59zha5ogvrtB31GSPE5pMIdsaeY";

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

// Get truong org ids
const orgRes = await fetch(
  `${SUPABASE_URL}/rest/v1/org_to_chuc?loai_to_chuc=eq.truong_dai_hoc&select=id,ten,slug&order=ten.asc`,
  { headers },
);
const orgs = await orgRes.json();
console.log("Truong orgs:", orgs.length);

const orgIds = orgs.map((o) => o.id);
if (orgIds.length === 0) process.exit(0);

const postsRes = await fetch(
  `${SUPABASE_URL}/rest/v1/org_bai_dang?id_to_chuc=in.(${orgIds.join(",")})&select=id,id_to_chuc,tieu_de,tom_tat,cover_id,noi_dung,noi_dung_blocks,trang_thai,tao_luc&order=tao_luc.desc`,
  { headers },
);
const posts = await postsRes.json();
console.log("Total posts:", posts.length);

function htmlToPlain(html) {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(s) {
  return htmlToPlain(s).slice(0, 280);
}

let withBlocks = 0;
let duplicateTomTat = 0;
let emptyImgs = 0;
let legacyHtml = 0;
let noBlocksNoHtml = 0;

for (const p of posts) {
  const blocks = Array.isArray(p.noi_dung_blocks) ? p.noi_dung_blocks : [];
  if (blocks.length > 0) {
    withBlocks++;
    const first = blocks.find((b) => b.loai !== "spacer");
    if (first?.loai === "body" && p.tom_tat?.trim()) {
      const a = normalize(p.tom_tat);
      const b = normalize(first.config?.html);
      if (a && b && (a === b || a.startsWith(b.slice(0, 80)) || b.startsWith(a.slice(0, 80)))) {
        duplicateTomTat++;
      }
    }
    for (const b of blocks) {
      if (b.loai === "imgs") {
        const imgs = b.config?.imgs;
        if (!Array.isArray(imgs) || imgs.length === 0) emptyImgs++;
      }
    }
  } else if (p.noi_dung?.trim()) {
    legacyHtml++;
  } else {
    noBlocksNoHtml++;
  }
}

console.log({
  withBlocks,
  duplicateTomTat,
  emptyImgs,
  legacyHtml,
  noBlocksNoHtml,
});

// Sample duplicates
const samples = posts.filter((p) => {
  const blocks = p.noi_dung_blocks ?? [];
  const first = blocks.find((b) => b.loai !== "spacer");
  if (first?.loai !== "body" || !p.tom_tat?.trim()) return false;
  const a = normalize(p.tom_tat);
  const b = normalize(first.config?.html);
  return a && b && (a === b || a.slice(0, 60) === b.slice(0, 60));
}).slice(0, 5);

console.log(
  "Sample duplicates:",
  samples.map((p) => ({ id: p.id, tieu_de: p.tieu_de?.slice(0, 50), blocks: p.noi_dung_blocks?.length })),
);
