import { normalizeNnBoPhanEmbed } from "@/lib/career/boPhanDisplay";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type {
  KyNangRow,
  LinhVucRow,
  NgheNghiepHubItem,
  NgheNghiepListItem,
  NgheNghiepRow,
  RelatedCareerCard,
} from "@/lib/career/types";

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

/** Sidebar lĩnh vực — bảng lv_linh_vuc (ưu tiên có nhom_vi để nhóm sidebar) */
export async function listLinhVucForHub(): Promise<LinhVucRow[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = await createClient();

    const q1 = await supabase
      .from("lv_linh_vuc")
      .select(
        "id, slug, ten_vi, ten_en, mau_accent, nhom_vi, linh_vuc_id",
      )
      .order("ten_en", { ascending: true });
    if (!q1.error && q1.data) return q1.data as LinhVucRow[];

    const q2 = await supabase
      .from("lv_linh_vuc")
      .select("id, slug, ten_vi, ten_en, mau_accent, nhom_vi")
      .order("ten_en", { ascending: true });
    if (!q2.error && q2.data) return q2.data as LinhVucRow[];

    const q3 = await supabase
      .from("lv_linh_vuc")
      .select("id, slug, ten_vi, ten_en, mau_accent, linh_vuc_id")
      .order("ten_en", { ascending: true });
    if (!q3.error && q3.data) return q3.data as LinhVucRow[];

    const q4 = await supabase
      .from("lv_linh_vuc")
      .select("id, slug, ten_vi, ten_en, mau_accent")
      .order("ten_en", { ascending: true });
    if (!q4.error && q4.data) return q4.data as LinhVucRow[];

    return [];
  } catch {
    return [];
  }
}

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
