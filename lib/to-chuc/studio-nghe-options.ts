import "server-only";

import { extractNgheRoleShort } from "@/lib/articles/nghe-role-label";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { StudioNgheOption } from "@/lib/to-chuc/studio-tuyen-dung-types";

type NgheRow = {
  id: string;
  slug: string;
  tieu_de: string | null;
  tieu_de_viet: string | null;
  tieu_de_eng: string | null;
  linh_vuc?: { ten?: string | null } | { ten?: string | null }[] | null;
};

function parseLinhVucTen(raw: NgheRow["linh_vuc"]): string | null {
  const node = Array.isArray(raw) ? raw[0] : raw;
  if (!node || typeof node !== "object") return null;
  const ten = String(node.ten ?? "").trim();
  return ten || null;
}

function rowToOption(row: NgheRow): StudioNgheOption {
  const tieuDe =
    row.tieu_de_viet?.trim() ||
    row.tieu_de_eng?.trim() ||
    row.tieu_de?.trim() ||
    "Không tiêu đề";
  const roleShort = extractNgheRoleShort(tieuDe);
  const engShort = row.tieu_de_eng?.trim()
    ? extractNgheRoleShort(row.tieu_de_eng)
    : null;
  const roleEng =
    engShort && engShort.toLowerCase() !== roleShort.toLowerCase()
      ? engShort
      : null;

  return {
    id: row.id,
    slug: row.slug,
    tieuDe,
    roleShort,
    roleEng,
    linhVucTen: parseLinhVucTen(row.linh_vuc),
  };
}

/** Danh sách nghề (published) cho picker "vị trí công việc" trong tin tuyển dụng. */
export async function loadStudioNgheOptions(): Promise<StudioNgheOption[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("article_bai_viet")
    .select("id, slug, tieu_de, tieu_de_viet, tieu_de_eng, linh_vuc:id_linh_vuc(ten)")
    .eq("loai_bai_viet", "nghe")
    .eq("trang_thai_noi_dung", "published")
    .order("tieu_de", { ascending: true })
    .limit(2500);

  if (error || !data) return [];
  return (data as NgheRow[]).map(rowToOption);
}
