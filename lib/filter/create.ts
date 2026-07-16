import "server-only";

import { isSystemPersonalFilterSlug } from "@/lib/filter/default-personal-filters.shared";
import {
  DEFAULT_FILTER_MAU,
  MAX_FILTER_NAME,
  MAX_FILTERS_PER_OWNER,
} from "@/lib/filter/constants";
import { slugifyFilterName, uniqueFilterSlugForUser } from "@/lib/filter/slug";
import type { PersonalFilter } from "@/lib/filter/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type FilterRow = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thu_tu: number;
};

function mapFilter(row: FilterRow): PersonalFilter {
  return {
    id: row.id,
    ten: row.ten,
    slug: row.slug,
    mau: row.mau,
    thuTu: row.thu_tu,
  };
}

function normalizeMau(value: string | undefined): string | null {
  const mau = value?.trim();
  if (!mau) return DEFAULT_FILTER_MAU;
  if (!/^#[0-9A-Fa-f]{6}$/.test(mau)) return null;
  return mau.toUpperCase();
}

export async function createUserFilter(params: {
  userId: string;
  ten: string;
  mau?: string;
  thuTu?: number;
}): Promise<{ ok: true; filter: PersonalFilter } | { ok: false; error: string }> {
  const ten = params.ten.trim();
  if (!ten) return { ok: false, error: "Tên nhãn không được trống." };
  if (ten.length > MAX_FILTER_NAME) {
    return { ok: false, error: `Tên nhãn tối đa ${MAX_FILTER_NAME} ký tự.` };
  }

  const mau = normalizeMau(params.mau);
  if (mau === null) return { ok: false, error: "Màu nhãn không hợp lệ (#RRGGBB)." };

  const admin = createServiceRoleClient();
  const { data: existingRows } = await admin
    .from("filter_nhan")
    .select("slug")
    .eq("id_nguoi_dung", params.userId)
    .returns<Array<{ slug: string }>>();

  const userFilterCount = (existingRows ?? []).filter(
    (row) => !isSystemPersonalFilterSlug(row.slug),
  ).length;

  if (userFilterCount >= MAX_FILTERS_PER_OWNER) {
    return {
      ok: false,
      error: `Tối đa ${MAX_FILTERS_PER_OWNER} nhãn mỗi tài khoản.`,
    };
  }

  const baseSlug = slugifyFilterName(ten);
  const slug = await uniqueFilterSlugForUser(params.userId, baseSlug);

  const { data, error } = await admin
    .from("filter_nhan")
    .insert({
      id_nguoi_dung: params.userId,
      id_to_chuc: null,
      ten,
      slug,
      mau,
      thu_tu: params.thuTu ?? 0,
    })
    .select("id, ten, slug, mau, thu_tu")
    .single<FilterRow>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không tạo được nhãn." };
  }

  return { ok: true, filter: mapFilter(data) };
}
