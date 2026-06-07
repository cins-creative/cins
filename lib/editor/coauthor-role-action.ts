"use server";

import {
  extractNgheRoleShort,
  formatNgheRoleLabel,
} from "@/lib/articles/nghe-role-label";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import type { CoAuthorNgheRoleOption } from "@/lib/editor/coauthor-role-types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type NgheRoleRow = {
  slug: string;
  tieu_de: string;
  tieu_de_viet: string | null;
  tieu_de_eng: string | null;
  linh_vuc?: { ten?: string | null } | { ten?: string | null }[] | null;
};

function parseLinhVucTen(raw: NgheRoleRow["linh_vuc"]): string | null {
  const node = Array.isArray(raw) ? raw[0] : raw;
  if (!node || typeof node !== "object") return null;
  const ten = String(node.ten ?? "").trim();
  return ten || null;
}

function rowToOption(row: NgheRoleRow): CoAuthorNgheRoleOption {
  const tieuDe =
    row.tieu_de_viet?.trim() ||
    row.tieu_de_eng?.trim() ||
    row.tieu_de?.trim() ||
    "Không tiêu đề";
  const roleShort = extractNgheRoleShort(tieuDe);
  const linhVucTen = parseLinhVucTen(row.linh_vuc);

  return {
    slug: row.slug,
    tieuDe,
    roleShort,
    linhVucTen,
    roleLabel: formatNgheRoleLabel(linhVucTen, roleShort),
  };
}

/** Danh sách nghề published cho picker vai trò đồng tác giả (có lĩnh vực). */
export async function loadCoAuthorNgheRoleOptions(): Promise<
  CoAuthorNgheRoleOption[]
> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) return [];

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("article_bai_viet")
    .select(
      "slug, tieu_de, tieu_de_viet, tieu_de_eng, linh_vuc:id_linh_vuc(ten)",
    )
    .eq("loai_bai_viet", "nghe")
    .eq("trang_thai_noi_dung", "published")
    .order("tieu_de", { ascending: true })
    .limit(2500);

  if (error || !data) return [];

  return (data as NgheRoleRow[]).map(rowToOption);
}
