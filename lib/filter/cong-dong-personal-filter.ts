import "server-only";

import { DEFAULT_FILTER_MAU } from "@/lib/filter/constants";
import {
  CONG_DONG_PERSONAL_FILTER_MAU,
  CONG_DONG_PERSONAL_FILTER_SLUG,
  CONG_DONG_PERSONAL_FILTER_TEN,
} from "@/lib/filter/cong-dong-personal-filter.shared";
import { setMilestonePersonalFilters } from "@/lib/filter/gan";
import type { PersonalFilterRef } from "@/lib/filter/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export {
  CONG_DONG_PERSONAL_FILTER_MAU,
  CONG_DONG_PERSONAL_FILTER_SLUG,
  CONG_DONG_PERSONAL_FILTER_TEN,
  congDongPersonalFilterFallback,
  countUserPersonalFilters,
  filterTimelinePersonalFilters,
  isHiddenPersonalFilterSlug,
  isSystemPersonalFilterSlug,
  orderTimelinePersonalFilters,
} from "@/lib/filter/cong-dong-personal-filter.shared";

type FilterRow = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thu_tu: number;
};

/** Idempotent — tạo nhãn `Cộng đồng` nếu user chưa có (không tính vào giới hạn 5 nhãn). */
export async function ensureCongDongPersonalFilter(
  userId: string,
): Promise<FilterRow> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("filter_nhan")
    .select("id, ten, slug, mau, thu_tu")
    .eq("id_nguoi_dung", userId)
    .eq("slug", CONG_DONG_PERSONAL_FILTER_SLUG)
    .maybeSingle<FilterRow>();

  if (existing) return existing;

  const { data: inserted, error } = await admin
    .from("filter_nhan")
    .insert({
      id_nguoi_dung: userId,
      id_to_chuc: null,
      ten: CONG_DONG_PERSONAL_FILTER_TEN,
      slug: CONG_DONG_PERSONAL_FILTER_SLUG,
      mau: CONG_DONG_PERSONAL_FILTER_MAU,
      thu_tu: -1,
    })
    .select("id, ten, slug, mau, thu_tu")
    .single<FilterRow>();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Không tạo được nhãn Cộng đồng.");
  }

  return inserted;
}

export async function attachCongDongPersonalFilter(params: {
  milestoneId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const filter = await ensureCongDongPersonalFilter(params.userId);
    const result = await setMilestonePersonalFilters({
      milestoneId: params.milestoneId,
      userId: params.userId,
      filterIds: [filter.id],
    });
    if (!result.ok) return result;
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không gắn được nhãn Cộng đồng.",
    };
  }
}

export function toCongDongPersonalFilterRef(row: FilterRow): PersonalFilterRef {
  return {
    id: row.id,
    slug: row.slug,
    ten: row.ten,
    mau: row.mau ?? DEFAULT_FILTER_MAU,
  };
}
