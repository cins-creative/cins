import "server-only";

import { cache } from "react";

import { formatTinhThanh, getAvatarUrl } from "@/lib/journey/profile";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { capDoLabels } from "@/lib/to-chuc/studio-tuyen-dung-distribution";
import { formatStudioDateShort } from "@/lib/to-chuc/studio-tuyen-dung-format";
import {
  STUDIO_JOB_LOAI_HINH_LABEL,
  type StudioJobLoaiHinh,
} from "@/lib/to-chuc/studio-tuyen-dung-types";
import type { JobOgContext } from "@/lib/to-chuc/tuyen-dung-og-card";
import { ORG_COVER_VARIANTS } from "@/lib/truong/org-image-variants";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

type OrgEmbed = {
  ten: string | null;
  slug: string | null;
  avatar_id: string | null;
  cover_id: string | null;
  loai_to_chuc: string | null;
};

type Row = {
  id: string;
  tieu_de: string;
  mo_ta_ngan: string | null;
  loai_hinh: string | null;
  cap_do: string[] | string | null;
  tinh_thanh: string | null;
  lam_tu_xa: boolean | null;
  muc_luong_tu: number | null;
  muc_luong_den: number | null;
  hien_thi_luong: boolean | null;
  han_nop: string | null;
  org_to_chuc: OrgEmbed | OrgEmbed[] | null;
  linh_vuc?: { ten: string | null } | { ten: string | null }[] | null;
};

const JOB_OG_SELECT =
  "id, tieu_de, mo_ta_ngan, loai_hinh, cap_do, tinh_thanh, lam_tu_xa, muc_luong_tu, muc_luong_den, hien_thi_luong, han_nop, org_to_chuc:org_to_chuc!inner(ten, slug, avatar_id, cover_id, loai_to_chuc), linh_vuc:linh_vuc(ten)";

function pickOrg(org: Row["org_to_chuc"]): OrgEmbed | null {
  if (!org) return null;
  return Array.isArray(org) ? org[0] ?? null : org;
}

function pickLinhVuc(linhVuc: Row["linh_vuc"]): string | null {
  if (!linhVuc) return null;
  const row = Array.isArray(linhVuc) ? linhVuc[0] : linhVuc;
  return row?.ten?.trim() || null;
}

function truncate(text: string | null | undefined, max: number): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function isExpired(hanNop: string | null): boolean {
  if (!hanNop) return false;
  const d = new Date(hanNop);
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
}

function salary(row: Row): string | null {
  if (row.hien_thi_luong === false) return null;
  const fmt = (n: number) => n.toLocaleString("vi-VN");
  if (row.muc_luong_tu && row.muc_luong_den) {
    return `${fmt(row.muc_luong_tu)} – ${fmt(row.muc_luong_den)} đ`;
  }
  if (row.muc_luong_tu) return `Từ ${fmt(row.muc_luong_tu)} đ`;
  if (row.muc_luong_den) return `Đến ${fmt(row.muc_luong_den)} đ`;
  return null;
}

function place(row: Row): string {
  if (row.lam_tu_xa) return "Remote";
  return formatTinhThanh(row.tinh_thanh) ?? "Linh hoạt";
}

async function loadJobOgContext(
  orgSlug: string,
  jobId: string,
): Promise<JobOgContext | null> {
  const orgNorm = orgSlug.trim();
  const idNorm = jobId.trim();
  if (!orgNorm || !idNorm) return null;

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("org_tuyen_dung")
      .select(JOB_OG_SELECT)
      .eq("id", idNorm)
      .eq("da_xoa", false)
      .eq("org_to_chuc.slug", orgNorm)
      .maybeSingle<Row>();
    if (error || !data) return null;

    const org = pickOrg(data.org_to_chuc);
    if (!org?.slug) return null;

    const loaiRaw = data.loai_hinh ?? "toan_thoi_gian";
    const loai = (
      loaiRaw in STUDIO_JOB_LOAI_HINH_LABEL ? loaiRaw : "toan_thoi_gian"
    ) as StudioJobLoaiHinh;
    const capDo = capDoLabels(data.cap_do);
    const pathPrefix = org.loai_to_chuc === "co_so_dao_tao" ? "co-so" : "studio";

    return {
      title: data.tieu_de?.trim() || "Vị trí tuyển dụng",
      orgTen: org.ten?.trim() || orgNorm,
      orgAvatarUrl: getAvatarUrl(org.avatar_id),
      coverUrl: resolveTruongImageSrcSync(org.cover_id, ORG_COVER_VARIANTS),
      summary: truncate(data.mo_ta_ngan, 150),
      linhVuc: pickLinhVuc(data.linh_vuc),
      loaiHinhLabel: STUDIO_JOB_LOAI_HINH_LABEL[loai],
      capDoLabel: capDo.length > 0 ? capDo[0] : null,
      place: place(data),
      salary: salary(data),
      deadline: formatStudioDateShort(data.han_nop),
      expired: isExpired(data.han_nop),
      pathPrefix,
      orgSlug: org.slug.trim(),
      jobId: data.id,
    };
  } catch {
    return null;
  }
}

/** OG context nhẹ cho trang chi tiết tin tuyển dụng. */
export const fetchJobOgContext = cache(loadJobOgContext);
