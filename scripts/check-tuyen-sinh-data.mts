import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  process.env.SUPABASE_URL?.trim();
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.SUPABASE_ANON_KEY?.trim();

if (!url || !key) {
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const MTS_LIVE = "eb825d71-5ac1-4c9f-934f-870402923b91";
const MTS_SEED = "a1000000-0000-0000-0000-000000000001";

type Row = {
  id: string;
  id_truong_nganh: string;
  nam: number;
  diem_chuan: number | null;
  chi_tieu: number | null;
};

async function auditOrg(orgId: string, label: string) {
  const { data: org, error: orgErr } = await sb
    .from("org_to_chuc")
    .select("slug, ten")
    .eq("id", orgId)
    .maybeSingle();
  if (orgErr) throw orgErr;

  const { data: links, error: linkErr } = await sb
    .from("org_truong_nganh")
    .select("id, article_bai_viet!inner(meta, tieu_de_viet)")
    .eq("id_to_chuc", orgId)
    .eq("trang_thai_chuong_trinh", "dang_tuyen");
  if (linkErr) throw linkErr;

  const programIds = (links ?? [])
    .map((r) => (r as { id?: string }).id?.trim())
    .filter(Boolean) as string[];

  if (!programIds.length) {
    return { label, slug: org?.slug, ten: org?.ten, programs: 0, rows: [] };
  }

  const { data: rows, error } = await sb
    .from("org_tuyen_sinh_nam")
    .select(
      `
      id,
      id_truong_nganh,
      nam,
      diem_chuan,
      chi_tieu,
      org_truong_nganh (
        article_bai_viet ( meta, tieu_de_viet )
      )
    `,
    )
    .in("id_truong_nganh", programIds)
    .order("nam", { ascending: false });
  if (error) throw error;

  const list = (rows ?? []) as Row[];
  const detail = list.map((r) => {
    const embed = r as Row & {
      org_truong_nganh?: {
        article_bai_viet?: { meta?: { ma_nganh?: string }; tieu_de_viet?: string };
      };
    };
    const art = embed.org_truong_nganh?.article_bai_viet;
    const ma =
      art && typeof art.meta === "object" && art.meta
        ? String((art.meta as { ma_nganh?: string }).ma_nganh ?? "")
        : "";
    return {
      nam: r.nam,
      ma_nganh: ma || null,
      nganh: art?.tieu_de_viet?.trim() ?? null,
      diem_chuan: r.diem_chuan,
      chi_tieu: r.chi_tieu,
      status:
        r.diem_chuan != null && r.chi_tieu != null
          ? "đủ"
          : r.diem_chuan != null
            ? "thiếu chỉ tiêu"
            : r.chi_tieu != null
              ? "thiếu điểm chuẩn"
              : "trống",
    };
  });

  return {
    label,
    slug: org?.slug,
    ten: org?.ten,
    programs: programIds.length,
    totalRows: list.length,
    withDiem: list.filter((r) => r.diem_chuan != null).length,
    withChi: list.filter((r) => r.chi_tieu != null).length,
    withBoth: list.filter((r) => r.diem_chuan != null && r.chi_tieu != null)
      .length,
    emptyBoth: list.filter(
      (r) => r.diem_chuan == null && r.chi_tieu == null,
    ).length,
    detail,
  };
}

async function globalSummary() {
  const { count, error: countErr } = await sb
    .from("org_tuyen_sinh_nam")
    .select("*", { count: "exact", head: true });
  if (countErr) throw countErr;

  const { data, error } = await sb
    .from("org_tuyen_sinh_nam")
    .select("nam, diem_chuan, chi_tieu")
    .limit(5000);
  if (error) throw error;

  const all = data ?? [];
  return {
    totalRows: count ?? all.length,
    hasDiem: all.filter((r) => r.diem_chuan != null).length,
    hasChi: all.filter((r) => r.chi_tieu != null).length,
    hasEither: all.filter(
      (r) => r.diem_chuan != null || r.chi_tieu != null,
    ).length,
    emptyBoth: all.filter(
      (r) => r.diem_chuan == null && r.chi_tieu == null,
    ).length,
    years: [...new Set(all.map((r) => r.nam as number))].sort((a, b) => b - a),
  };
}

const [global, live, seed] = await Promise.all([
  globalSummary(),
  auditOrg(MTS_LIVE, "MTS live (web)"),
  auditOrg(MTS_SEED, "MTS seed"),
]);

console.log(JSON.stringify({ global, live, seed }, null, 2));
