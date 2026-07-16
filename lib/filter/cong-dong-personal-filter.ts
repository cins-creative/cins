import "server-only";

import { DEFAULT_FILTER_MAU } from "@/lib/filter/constants";
import {
  CONG_DONG_PERSONAL_FILTER_MAU,
  CONG_DONG_PERSONAL_FILTER_SLUG,
  CONG_DONG_PERSONAL_FILTER_TEN,
} from "@/lib/filter/default-personal-filters.shared";
import { ensureCongDongPersonalFilter } from "@/lib/filter/ensure-default-personal-filters";
import { setMilestonePersonalFilters } from "@/lib/filter/gan";
import type { PersonalFilterRef } from "@/lib/filter/types";

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
} from "@/lib/filter/default-personal-filters.shared";

export { ensureDefaultPersonalFilters } from "@/lib/filter/ensure-default-personal-filters";

type FilterRow = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thu_tu: number;
};

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
