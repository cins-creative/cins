import "server-only";

import { countFiltersForUser } from "@/lib/filter/gan";
import type { PersonalFilter } from "@/lib/filter/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type FilterRow = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thu_tu: number;
};

function mapFilter(row: FilterRow, count?: number): PersonalFilter {
  return {
    id: row.id,
    ten: row.ten,
    slug: row.slug,
    mau: row.mau,
    thuTu: row.thu_tu,
    count,
  };
}

/** List nhãn cá nhân của 1 user — dùng filter bar + editor picker. */
export async function listPersonalFiltersForUser(
  userId: string,
  options?: {
    withCounts?: boolean;
    /** Override count theo slug — dùng khi visitor chỉ thấy cột mốc công khai. */
    visibleCountBySlug?: Map<string, number>;
  },
): Promise<PersonalFilter[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("filter_nhan")
    .select("id, ten, slug, mau, thu_tu")
    .eq("id_nguoi_dung", userId)
    .order("thu_tu", { ascending: true })
    .order("ten", { ascending: true })
    .returns<FilterRow[]>();

  const rows = data ?? [];
  if (!options?.withCounts && !options?.visibleCountBySlug) {
    return rows.map((row) => mapFilter(row));
  }

  if (options.visibleCountBySlug) {
    return rows.map((row) =>
      mapFilter(row, options.visibleCountBySlug!.get(row.slug) ?? 0),
    );
  }

  const counts = await countFiltersForUser(userId);
  return rows.map((row) => mapFilter(row, counts.get(row.id) ?? 0));
}
