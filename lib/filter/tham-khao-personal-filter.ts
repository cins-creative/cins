import "server-only";

import {
  THAM_KHAO_PERSONAL_FILTER_DEF,
  THAM_KHAO_PERSONAL_FILTER_SLUG,
} from "@/lib/filter/default-personal-filters.shared";
import {
  loadPersonalFilterIdsForCotMoc,
  setMilestonePersonalFilters,
} from "@/lib/filter/gan";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type FilterRow = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thu_tu: number;
};

/**
 * Idempotent — tạo nhãn «Tham khảo» cho nick seeding (không seed cho mọi user).
 */
export async function ensureThamKhaoPersonalFilter(
  userId: string,
): Promise<FilterRow> {
  const admin = createServiceRoleClient();
  const def = THAM_KHAO_PERSONAL_FILTER_DEF;

  const { data: existing } = await admin
    .from("filter_nhan")
    .select("id, ten, slug, mau, thu_tu")
    .eq("id_nguoi_dung", userId)
    .eq("slug", def.slug)
    .maybeSingle<FilterRow>();

  if (existing) return existing;

  const { data: inserted, error } = await admin
    .from("filter_nhan")
    .insert({
      id_nguoi_dung: userId,
      id_to_chuc: null,
      ten: def.ten,
      slug: def.slug,
      mau: def.mau,
      thu_tu: def.thuTu,
    })
    .select("id, ten, slug, mau, thu_tu")
    .single<FilterRow>();

  if (error || !inserted) {
    /* Race: unique (user, slug) — đọc lại. */
    const { data: again } = await admin
      .from("filter_nhan")
      .select("id, ten, slug, mau, thu_tu")
      .eq("id_nguoi_dung", userId)
      .eq("slug", THAM_KHAO_PERSONAL_FILTER_SLUG)
      .maybeSingle<FilterRow>();
    if (again) return again;
    throw new Error(error?.message ?? "Không tạo được nhãn Tham khảo.");
  }

  return inserted;
}

/** Gắn nhãn «Tham khảo» vào cột mốc — giữ các nhãn đã có. */
export async function attachThamKhaoPersonalFilter(params: {
  milestoneId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const filter = await ensureThamKhaoPersonalFilter(params.userId);
    const current = await loadPersonalFilterIdsForCotMoc(
      params.milestoneId,
      params.userId,
    );
    const filterIds = [...new Set([...current, filter.id])];
    const result = await setMilestonePersonalFilters({
      milestoneId: params.milestoneId,
      userId: params.userId,
      filterIds,
    });
    if (!result.ok) return result;
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Không gắn được nhãn Tham khảo.",
    };
  }
}
