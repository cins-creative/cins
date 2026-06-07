import "server-only";

import type { LoaiMoc, Visibility } from "@/lib/editor/types";
import { VALID_LOAI_MOC, VALID_VIS } from "@/lib/editor/types";
import { setMilestonePersonalFilters } from "@/lib/filter/gan";
import { CHE_DO_MOC_CONG_DONG } from "@/lib/journey/journey-visible-clause";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type GraduateCongDongParams = {
  milestoneId: string;
  userId: string;
  visibility?: Visibility;
  loaiMoc?: LoaiMoc;
  /** Slug nhãn Journey sau khi rời cộng đồng — bỏ trống = không gắn nhãn. */
  personalFilterSlug?: string | null;
};

/** Rời feed cộng đồng → cột mốc Journey thường; giữ comment/reaction trên cột mốc. */
export async function graduateCongDongMilestone(
  params: GraduateCongDongParams,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const visibility = params.visibility ?? "public";
  if (!VALID_VIS.includes(visibility)) {
    return { ok: false, error: "Chế độ hiển thị không hợp lệ." };
  }
  if (params.loaiMoc && !VALID_LOAI_MOC.includes(params.loaiMoc)) {
    return { ok: false, error: "Nhóm filter không hợp lệ." };
  }

  const admin = createServiceRoleClient();
  const { data: moc } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung, che_do_hien_thi, loai_moc")
    .eq("id", params.milestoneId)
    .maybeSingle<{
      id: string;
      id_nguoi_dung: string;
      che_do_hien_thi: string;
      loai_moc: string;
    }>();

  if (!moc) return { ok: false, error: "Không tìm thấy cột mốc." };
  if (moc.id_nguoi_dung !== params.userId) {
    return { ok: false, error: "Bạn không có quyền chỉnh cột mốc này." };
  }
  if (moc.che_do_hien_thi !== CHE_DO_MOC_CONG_DONG) {
    return { ok: false, error: "Cột mốc không còn trong cộng đồng." };
  }

  const { error: detachErr } = await admin
    .from("cong_dong_filter_gan")
    .delete()
    .eq("id_cot_moc", params.milestoneId);
  if (detachErr) {
    return { ok: false, error: "Không gỡ được khỏi nhãn cộng đồng: " + detachErr.message };
  }

  const updatePayload: { che_do_hien_thi: Visibility; loai_moc?: LoaiMoc } = {
    che_do_hien_thi: visibility,
  };
  if (params.loaiMoc) updatePayload.loai_moc = params.loaiMoc;

  const { error: updateErr } = await admin
    .from("content_cot_moc")
    .update(updatePayload)
    .eq("id", params.milestoneId);
  if (updateErr) {
    return { ok: false, error: "Không đổi được cột mốc: " + updateErr.message };
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
      .update({ che_do_hien_thi: visibility })
      .in("id", tacPhamIds);
  }

  let filterIds: string[] = [];
  const slug = params.personalFilterSlug?.trim();
  if (slug) {
    const { data: filter } = await admin
      .from("filter_nhan")
      .select("id")
      .eq("id_nguoi_dung", params.userId)
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();
    if (!filter) return { ok: false, error: "Nhãn riêng không hợp lệ." };
    filterIds = [filter.id];
  }

  const pfResult = await setMilestonePersonalFilters({
    milestoneId: params.milestoneId,
    userId: params.userId,
    filterIds,
  });
  if (!pfResult.ok) return pfResult;

  return { ok: true };
}
