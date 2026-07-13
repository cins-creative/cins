import { normalizeNnBoPhanEmbed } from "@/lib/career/boPhanDisplay";
import { cache } from "react";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type {
  KyNangRow,
  LinhVucRow,
  NgheNghiepHubItem,
  NgheNghiepListItem,
  NgheNghiepRow,
  RelatedCareerCard,
} from "@/lib/career/types";

/** Chuẩn hóa hàng từ `linh_vuc` hoặc `lv_linh_vuc` (nhiều kiểu đặt tên cột trong DB). */
function normalizeLinhVucRow(r: Record<string, unknown>): LinhVucRow {
  const pick = (keys: string[]): string | null => {
    for (const k of keys) {
      const v = r[k];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return null;
  };

  const id = String(r.id ?? "");
  const slug = pick(["slug", "ma_slug", "slug_linh_vuc"]) ?? (id.length > 0 ? id : null);
  const tenDisplay = pick([
    "ten",
    "ten_vi",
    "tieu_de",
    "ten_linh_vuc",
    "name",
    "title_vietnam",
  ]);
  const tenEn = pick(["ten_eng", "ten_en", "title_eng", "name_en"]);
  const nhomVi = pick(["nhom_vi", "ten_nhom", "nhom_linh_vuc", "group_name"]);
  const nhomRaw = pick(["nhom", "ma_nhom", "nhom_code"]);
  const isNhomSlug =
    nhomRaw != null &&
    /^[A-Z0-9_]+$/i.test(nhomRaw) &&
    nhomRaw.includes("_");
  const tenColumnOnly = pick(["ten"]);
  const moTa = pick(["mo_ta"]);
  const coverId = pick(["cover_id", "thumbnail_id"]);
  const trangThai =
    r.trang_thai != null && String(r.trang_thai).trim() !== ""
      ? String(r.trang_thai).trim()
      : null;
  let thuTu: number | null = null;
  if (r.thu_tu != null && r.thu_tu !== "") {
    const n = Number(r.thu_tu);
    if (!Number.isNaN(n)) thuTu = n;
  }

  return {
    id,
    slug,
    ten_vi: tenDisplay,
    ten_en: tenEn,
    nhom_vi: nhomVi ?? (nhomRaw && !isNhomSlug ? nhomRaw : null),
    nhom: nhomRaw,
    ten: tenColumnOnly ?? tenDisplay,
    mo_ta: moTa,
    cover_id: coverId,
    trang_thai: trangThai,
    thu_tu: thuTu,
    mau_accent: (r.mau_accent as string | null | undefined) ?? null,
    linh_vuc_id: (r.linh_vuc_id as string | null | undefined) ?? null,
  };
}

function sortLinhVucRowsVi(a: LinhVucRow, b: LinhVucRow): number {
  const na = (a.nhom ?? a.nhom_vi ?? "").localeCompare(b.nhom ?? b.nhom_vi ?? "", "vi", {
    sensitivity: "base",
  });
  if (na !== 0) return na;
  const ta = (a.thu_tu ?? 0) - (b.thu_tu ?? 0);
  if (ta !== 0) return ta;
  return (a.ten_vi ?? a.ten ?? a.ten_en ?? "").localeCompare(
    b.ten_vi ?? b.ten ?? b.ten_en ?? "",
    "vi",
    { sensitivity: "base" },
  );
}

/** PostgREST embed FK → nn_bo_phan */
const NN_NGHE_BO_PHAN_SELECT =
  "id, slug, title_eng, title_vietnam, thumbnail_mascot, bo_phan, nn_bo_phan_id, nn_bo_phan ( id, ten, mo_ta )";

const NN_NGHE_FULL_WITH_BO_PHAN = "*, nn_bo_phan ( id, ten, mo_ta )";

const NN_NGHE_HUB_SELECT =
  "id, slug, title_eng, title_vietnam, thumbnail_mascot, bo_phan, nn_bo_phan_id, nn_bo_phan ( id, ten, mo_ta ), linh_vuc_id, short_description";

export async function getNgheNghiepBySlug(
  slug: string,
): Promise<NgheNghiepRow | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("nn_nghe_nghiep")
      .select(NN_NGHE_FULL_WITH_BO_PHAN)
      .eq("slug", slug)
      .eq("trang_thai", "published")
      .maybeSingle();

    if (error || !data) return null;
    return normalizeNnBoPhanEmbed(data as { nn_bo_phan?: unknown }) as NgheNghiepRow;
  } catch {
    return null;
  }
}

export async function listPublishedNghe(): Promise<NgheNghiepListItem[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("nn_nghe_nghiep")
      .select(NN_NGHE_BO_PHAN_SELECT)
      .eq("trang_thai", "published")
      .order("title_eng", { ascending: true });

    if (error || !data) return [];
    return data.map((r: unknown) =>
      normalizeNnBoPhanEmbed(r as { nn_bo_phan?: unknown }) as NgheNghiepListItem,
    );
  } catch {
    return [];
  }
}

/** Hub /nghe-nghiep — đủ field để lọc theo lĩnh vực + nhóm bộ phận */
export async function listPublishedNgheForHub(): Promise<NgheNghiepHubItem[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("nn_nghe_nghiep")
      .select(NN_NGHE_HUB_SELECT)
      .eq("trang_thai", "published")
      .order("title_eng", { ascending: true });

    if (error || !data) return [];
    return data.map((r: unknown) =>
      normalizeNnBoPhanEmbed(r as { nn_bo_phan?: unknown }) as NgheNghiepHubItem,
    );
  } catch {
    return [];
  }
}

/** Sidebar lĩnh vực — ưu tiên bảng `linh_vuc` (ten, nhom), sau đó `lv_linh_vuc`. */
export const listLinhVucForHub = cache(async (): Promise<LinhVucRow[]> => {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();

    const fromLinhVuc = await supabase.from("linh_vuc").select("*");

    if (!fromLinhVuc.error && fromLinhVuc.data && fromLinhVuc.data.length > 0) {
      const rows = (fromLinhVuc.data as Record<string, unknown>[])
        .map(normalizeLinhVucRow)
        .filter((r) => (r.trang_thai ?? "active") === "active");
      rows.sort(sortLinhVucRowsVi);
      return rows;
    }
    /* Bảng `linh_vuc` chưa có, lỗi RLS, hoặc rỗng → dùng `lv_linh_vuc` để sidebar vẫn có dữ liệu */
    const q1 = await supabase
      .from("lv_linh_vuc")
      .select(
        "id, slug, ten_vi, ten_en, mau_accent, nhom_vi, linh_vuc_id",
      )
      .order("ten_en", { ascending: true });
    if (!q1.error && q1.data)
      return (q1.data as Record<string, unknown>[]).map(normalizeLinhVucRow);

    const q2 = await supabase
      .from("lv_linh_vuc")
      .select("id, slug, ten_vi, ten_en, mau_accent, nhom_vi")
      .order("ten_en", { ascending: true });
    if (!q2.error && q2.data)
      return (q2.data as Record<string, unknown>[]).map(normalizeLinhVucRow);

    const q3 = await supabase
      .from("lv_linh_vuc")
      .select("id, slug, ten_vi, ten_en, mau_accent, linh_vuc_id")
      .order("ten_en", { ascending: true });
    if (!q3.error && q3.data)
      return (q3.data as Record<string, unknown>[]).map(normalizeLinhVucRow);

    const q4 = await supabase
      .from("lv_linh_vuc")
      .select("id, slug, ten_vi, ten_en, mau_accent")
      .order("ten_en", { ascending: true });
    if (!q4.error && q4.data)
      return (q4.data as Record<string, unknown>[]).map(normalizeLinhVucRow);

    return [];
  } catch {
    return [];
  }
});

export async function getRelatedCareers(
  ids: string[],
): Promise<RelatedCareerCard[]> {
  if (!hasSupabaseEnv() || ids.length === 0) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("nn_nghe_nghiep")
      .select(NN_NGHE_BO_PHAN_SELECT)
      .in("id", ids)
      .eq("trang_thai", "published");

    if (error || !data) return [];
    return data.map((r: unknown) =>
      normalizeNnBoPhanEmbed(r as { nn_bo_phan?: unknown }) as RelatedCareerCard,
    );
  } catch {
    return [];
  }
}

export async function getKyNangByIds(ids: string[]): Promise<KyNangRow[]> {
  if (!hasSupabaseEnv() || ids.length === 0) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("kn_ky_nang")
      .select("id, title_vietnam, icon, loai")
      .in("id", ids);

    if (error || !data) return [];
    return data as KyNangRow[];
  } catch {
    return [];
  }
}

export async function getLinhVucByIds(ids: string[]): Promise<LinhVucRow[]> {
  if (!hasSupabaseEnv() || ids.length === 0) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("lv_linh_vuc").select("*").in(
      "id",
      ids,
    );

    if (error || !data) return [];
    return data as LinhVucRow[];
  } catch {
    return [];
  }
}
