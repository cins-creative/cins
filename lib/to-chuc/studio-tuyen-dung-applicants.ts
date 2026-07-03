import "server-only";

import { getAvatarUrl, getGiaiDoanLabel } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";
import type { GiaiDoan } from "@/lib/auth/session";

export type StudioJobApplicant = {
  userId: string;
  hoTen: string;
  slug: string | null;
  avatarUrl: string | null;
  giaiDoanLabel: string | null;
  journeyHref: string | null;
  thuNgo: string | null;
  trangThai: string;
  taoLuc: string;
};

type ApplicantRow = {
  id_nguoi_dung: string;
  thu_ngo: string | null;
  trang_thai: string | null;
  tao_luc: string;
};

type ProfileRow = {
  id: string;
  slug: string | null;
  ten_hien_thi: string | null;
  avatar_id: string | null;
  giai_doan: GiaiDoan | null;
};

/**
 * Danh sách ứng viên của 1 tin tuyển dụng — CHỈ admin của org sở hữu tin
 * mới xem được. Trả kèm link tới Journey của ứng viên.
 */
export async function listStudioJobApplicants(
  jobId: string,
  viewerId: string,
): Promise<
  | { ok: true; applicants: StudioJobApplicant[] }
  | { ok: false; error: string; status: number }
> {
  const admin = createServiceRoleClient();

  const { data: job } = await admin
    .from("org_tuyen_dung")
    .select("id, id_to_chuc, da_xoa")
    .eq("id", jobId)
    .maybeSingle<{ id: string; id_to_chuc: string; da_xoa: boolean }>();

  if (!job || job.da_xoa) {
    return { ok: false, error: "Không tìm thấy tin tuyển dụng.", status: 404 };
  }

  if (!(await isTruongOrgAdmin(job.id_to_chuc, viewerId))) {
    return {
      ok: false,
      error: "Bạn không có quyền xem ứng viên của tổ chức này.",
      status: 403,
    };
  }

  const { data: rows } = await admin
    .from("org_tuyen_dung_ung_tuyen")
    .select("id_nguoi_dung, thu_ngo, trang_thai, tao_luc")
    .eq("id_tuyen_dung", jobId)
    .order("tao_luc", { ascending: false })
    .returns<ApplicantRow[]>();

  const applicantRows = rows ?? [];
  if (applicantRows.length === 0) {
    return { ok: true, applicants: [] };
  }

  const userIds = [...new Set(applicantRows.map((r) => r.id_nguoi_dung))];
  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
    .in("id", userIds)
    .returns<ProfileRow[]>();

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const applicants: StudioJobApplicant[] = applicantRows.map((row) => {
    const profile = profileById.get(row.id_nguoi_dung);
    const slug = profile?.slug?.trim() || null;
    return {
      userId: row.id_nguoi_dung,
      hoTen: profile?.ten_hien_thi?.trim() || "Ứng viên",
      slug,
      avatarUrl: getAvatarUrl(profile?.avatar_id ?? null),
      giaiDoanLabel: profile?.giai_doan
        ? getGiaiDoanLabel(profile.giai_doan)
        : null,
      journeyHref: slug ? `/${encodeURIComponent(slug)}/journey` : null,
      thuNgo: row.thu_ngo?.trim() || null,
      trangThai: row.trang_thai || "moi",
      taoLuc: row.tao_luc,
    };
  });

  return { ok: true, applicants };
}
