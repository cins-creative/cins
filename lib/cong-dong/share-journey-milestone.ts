import "server-only";

import { markEngagementCanTinhLaiForTarget } from "@/lib/cins/feed-scoring-write";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import { ensureDefaultCongDongFilters } from "@/lib/cong-dong/default-filters";
import {
  replaceFiltersOnPost,
  resolveFilterIdsBySlugs,
} from "@/lib/cong-dong/filters";
import { isThanhVien } from "@/lib/cong-dong/membership";
import { congDongRootPath } from "@/lib/cong-dong/routes";
import type { ShareCongDongTarget } from "@/lib/cong-dong/types";
import { attachCongDongPersonalFilter } from "@/lib/filter/cong-dong-personal-filter";
import { CHE_DO_MOC_CONG_DONG } from "@/lib/journey/journey-visible-clause";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type { ShareCongDongTarget };

/** Nhãn mặc định khi đưa bài Journey vào cộng đồng — cùng seed compose. */
const SHARE_FILTER_SLUG = "khoe-tac-pham";

type OrgRow = {
  id: string;
  slug: string;
  ten: string;
  loai_to_chuc: string;
  avatar_id: string | null;
  trang_thai_hoat_dong: string;
};

function mapOrgTarget(org: OrgRow): ShareCongDongTarget {
  return {
    id: org.id,
    slug: org.slug,
    ten: org.ten,
    avatarUrl: getAvatarUrl(org.avatar_id) ?? null,
    href: congDongRootPath(org.slug),
  };
}

/** Cộng đồng user đang là thành viên active — submenu «Chia sẻ vào cộng đồng». */
export async function listMyCongDongTargets(
  userId: string,
): Promise<ShareCongDongTarget[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select(
      "id_to_chuc, org_to_chuc: id_to_chuc ( id, slug, ten, loai_to_chuc, avatar_id, trang_thai_hoat_dong )",
    )
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "active")
    .returns<
      Array<{
        id_to_chuc: string;
        org_to_chuc: OrgRow | OrgRow[] | null;
      }>
    >();

  const seen = new Set<string>();
  const out: ShareCongDongTarget[] = [];
  for (const row of data ?? []) {
    const orgRaw = row.org_to_chuc;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    if (!org?.id || seen.has(org.id)) continue;
    if (org.loai_to_chuc !== "cong_dong") continue;
    if (org.trang_thai_hoat_dong !== "dang_hoat_dong") continue;
    seen.add(org.id);
    out.push(mapOrgTarget(org));
  }
  out.sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  return out;
}

/**
 * Đưa cột mốc Journey sẵn có vào feed cộng đồng — cùng hàng
 * `content_cot_moc` (không nhân bản). Ngược với `graduateCongDongMilestone`.
 */
export async function shareJourneyMilestoneToCongDong(params: {
  milestoneId: string;
  userId: string;
  orgId: string;
}): Promise<
  | { ok: true; org: ShareCongDongTarget }
  | { ok: false; error: string }
> {
  const orgId = params.orgId.trim();
  if (!orgId) return { ok: false, error: "Thiếu cộng đồng." };

  const admin = createServiceRoleClient();
  const { data: moc } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung, che_do_hien_thi, id_to_chuc")
    .eq("id", params.milestoneId)
    .maybeSingle<{
      id: string;
      id_nguoi_dung: string;
      che_do_hien_thi: string;
      id_to_chuc: string | null;
    }>();

  if (!moc) return { ok: false, error: "Không tìm thấy cột mốc." };
  if (moc.id_nguoi_dung !== params.userId) {
    return { ok: false, error: "Bạn không có quyền chỉnh cột mốc này." };
  }

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten, loai_to_chuc, avatar_id, trang_thai_hoat_dong")
    .eq("id", orgId)
    .maybeSingle<OrgRow>();

  if (!org || org.loai_to_chuc !== "cong_dong") {
    return { ok: false, error: "Không tìm thấy cộng đồng." };
  }
  if (org.trang_thai_hoat_dong !== "dang_hoat_dong") {
    return { ok: false, error: "Cộng đồng này đã ngừng hoạt động." };
  }

  if (!(await isThanhVien(params.userId, orgId))) {
    return { ok: false, error: "Chỉ thành viên cộng đồng mới chia sẻ được bài." };
  }

  const target = mapOrgTarget(org);
  const alreadyThere =
    moc.che_do_hien_thi === CHE_DO_MOC_CONG_DONG && moc.id_to_chuc === orgId;
  if (alreadyThere) {
    return { ok: true, org: target };
  }

  const { error: updateErr } = await admin
    .from("content_cot_moc")
    .update({
      che_do_hien_thi: CHE_DO_MOC_CONG_DONG,
      id_to_chuc: orgId,
    })
    .eq("id", params.milestoneId);
  if (updateErr) {
    return { ok: false, error: "Không chia sẻ được: " + updateErr.message };
  }

  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_tac_pham")
    .eq("id_cot_moc", params.milestoneId)
    .returns<Array<{ id_tac_pham: string }>>();
  const tacPhamIds = (links ?? []).map((l) => l.id_tac_pham).filter(Boolean);
  if (tacPhamIds.length > 0) {
    await admin
      .from("content_tac_pham")
      .update({ che_do_hien_thi: CHE_DO_MOC_CONG_DONG })
      .in("id", tacPhamIds);
  }

  await ensureDefaultCongDongFilters(orgId);
  const filterIds = await resolveFilterIdsBySlugs(orgId, [SHARE_FILTER_SLUG]);
  await replaceFiltersOnPost(params.milestoneId, filterIds);

  await attachCongDongPersonalFilter({
    milestoneId: params.milestoneId,
    userId: params.userId,
  });

  await markEngagementCanTinhLaiForTarget(
    SOCIAL_LOAI_DOI_TUONG.COT_MOC,
    params.milestoneId,
  );

  return { ok: true, org: target };
}
