/**
 * Audit SEO nghề (`article_bai_viet` loai=nghe) — readonly.
 * Usage: node scripts/audit-nghe-seo.mjs
 * Output: scripts/nghe-content/_audit-seo-report.json (+ summary stdout)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, "../supabase/sql/audit_nghe_seo.sql");
const outPath = path.join(__dirname, "nghe-content/_audit-seo-report.json");

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const sqlText = fs.readFileSync(sqlPath, "utf8");
const db = postgres(url, { max: 1 });

try {
  const rows = await db.unsafe(sqlText);
  const list = Array.isArray(rows) ? rows : [];

  const counts = {};
  for (const r of list) {
    const key = String(r.priority_issue ?? "unknown");
    counts[key] = (counts[key] ?? 0) + 1;
  }

  const backlog = list.filter((r) => r.priority_issue !== "ok");
  const report = {
    generatedAt: new Date().toISOString(),
    total: list.length,
    ok: counts.ok ?? 0,
    issueCounts: counts,
    backlog: backlog.map((r) => ({
      id: r.id,
      slug: r.slug,
      ten: r.ten,
      trang_thai_noi_dung: r.trang_thai_noi_dung,
      priority_issue: r.priority_issue,
      meta_desc_len: r.meta_desc_len,
      noi_dung_len: r.noi_dung_len,
      has_bo_phan: r.has_bo_phan,
      has_cover_or_thumb: r.has_cover_or_thumb,
    })),
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log("Nghe SEO audit");
  console.log(`  total: ${report.total}`);
  console.log(`  ok: ${report.ok}`);
  console.log("  issues:", counts);
  console.log(`  backlog: ${backlog.length} → ${outPath}`);
  console.log(
    "  Next: điền theo docs/cins-brief-article-nghe.md — review 1 sample trước bulk.",
  );
} catch (err) {
  console.error("Audit failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
