import "server-only";

import {
  DEFAULT_PERSONAL_FILTER_DEFS,
  type DefaultPersonalFilterDef,
} from "@/lib/filter/default-personal-filters.shared";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type FilterRow = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thu_tu: number;
};

async function ensureOneDefaultPersonalFilter(
  userId: string,
  def: DefaultPersonalFilterDef,
): Promise<FilterRow> {
  const admin = createServiceRoleClient();
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
    throw new Error(error?.message ?? `Không tạo được nhãn ${def.ten}.`);
  }

  return inserted;
}

/** Idempotent — tạo đủ nhãn mặc định Journey nếu user chưa có. */
export async function ensureDefaultPersonalFilters(userId: string): Promise<void> {
  for (const def of DEFAULT_PERSONAL_FILTER_DEFS) {
    await ensureOneDefaultPersonalFilter(userId, def);
  }
}

/** @deprecated Dùng {@link ensureDefaultPersonalFilters}. */
export async function ensureCongDongPersonalFilter(
  userId: string,
): Promise<FilterRow> {
  const def = DEFAULT_PERSONAL_FILTER_DEFS.find((d) => d.slug === "cong-dong")!;
  return ensureOneDefaultPersonalFilter(userId, def);
}
