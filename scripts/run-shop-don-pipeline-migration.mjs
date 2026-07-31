/**
 * Chạy migration_shop_don_pipeline.sql (A14 enum + shop_cau_hinh_phi).
 * Usage: npm run migrate:shop-don-pipeline
 *
 * ADD VALUE phải chạy ngoài multi-statement transaction dùng giá trị mới —
 * chạy từng ALTER riêng, rồi khối CREATE TABLE.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const EXPECTED_PROJECT_REF = "ospzzzxcomrmhqrnkoiw";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rawUrl =
  process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
if (!rawUrl) {
  console.error("Missing DATABASE_URL / SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

const parsedUrl = new URL(rawUrl);
const isExpectedProject =
  parsedUrl.hostname.includes(EXPECTED_PROJECT_REF) ||
  parsedUrl.username.includes(EXPECTED_PROJECT_REF);
if (!isExpectedProject) {
  console.error(
    `Refusing migration: target is not CINS ${EXPECTED_PROJECT_REF}.`,
  );
  process.exit(1);
}

const db = postgres(rawUrl, {
  max: 1,
  connect_timeout: 15,
  ssl: "require",
  prepare: false,
});

const ALTERS = [
  `ALTER TYPE public.shop_trang_thai_don_enum ADD VALUE IF NOT EXISTS 'cho_lay_hang'`,
  `ALTER TYPE public.shop_trang_thai_don_enum ADD VALUE IF NOT EXISTS 'dang_giao'`,
  `ALTER TYPE public.shop_trang_thai_don_enum ADD VALUE IF NOT EXISTS 'hoan_tra'`,
];

const TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.shop_cau_hinh_phi (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ty_le         numeric(5, 4) NOT NULL DEFAULT 0.0500
                CHECK (ty_le >= 0 AND ty_le <= 1),
  cap_nhat_boi  uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  cap_nhat_luc  timestamptz NOT NULL DEFAULT now(),
  tao_luc       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shop_cau_hinh_phi IS
  'L33: tỷ lệ phí nền tảng (% GMV). Thường 1 dòng; admin PATCH. Dòng phí đã ghi giữ snapshot ty_le.';

INSERT INTO public.shop_cau_hinh_phi (ty_le)
SELECT 0.0500
WHERE NOT EXISTS (SELECT 1 FROM public.shop_cau_hinh_phi LIMIT 1);

ALTER TABLE public.shop_cau_hinh_phi ENABLE ROW LEVEL SECURITY;
`;

try {
  for (const stmt of ALTERS) {
    await db.unsafe(stmt);
    console.log("OK:", stmt.slice(0, 72), "…");
  }
  await db.unsafe(TABLE_SQL);
  console.log("OK: shop_cau_hinh_phi");
  console.log("OK: shop don pipeline — A14 enum + shop_cau_hinh_phi");
} catch (err) {
  console.error("Migration failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
