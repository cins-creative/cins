import "server-only";

import { DEFAULT_FILTER_MAU, MAX_FILTER_NAME } from "@/lib/filter/constants";
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

function normalizeMau(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const mau = value.trim();
  if (!mau) return DEFAULT_FILTER_MAU;
  if (!/^#[0-9A-Fa-f]{6}$/.test(mau)) return null;
  return mau.toUpperCase();
}

export async function updateUserFilter(params: {
  filterId: string;
  userId: string;
  ten?: string;
  mau?: string;
  thuTu?: number;
}): Promise<{ ok: true; filter: PersonalFilter } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("filter_nhan")
    .select("id, id_nguoi_dung")
    .eq("id", params.filterId)
    .maybeSingle<{ id: string; id_nguoi_dung: string | null }>();

  if (!existing || existing.id_nguoi_dung !== params.userId) {
    return { ok: false, error: "Không tìm thấy nhãn hoặc bạn không có quyền sửa." };
  }

  const patch: Record<string, unknown> = {};
  if (params.ten !== undefined) {
    const ten = params.ten.trim();
    if (!ten) return { ok: false, error: "Tên nhãn không được trống." };
    if (ten.length > MAX_FILTER_NAME) {
      return { ok: false, error: `Tên nhãn tối đa ${MAX_FILTER_NAME} ký tự.` };
    }
    patch.ten = ten;
  }
  if (params.mau !== undefined) {
    const mau = normalizeMau(params.mau);
    if (mau === null) return { ok: false, error: "Màu nhãn không hợp lệ (#RRGGBB)." };
    patch.mau = mau;
  }
  if (params.thuTu !== undefined) {
    patch.thu_tu = params.thuTu;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Không có thay đổi." };
  }

  const { data, error } = await admin
    .from("filter_nhan")
    .update(patch)
    .eq("id", params.filterId)
    .select("id, ten, slug, mau, thu_tu")
    .single<FilterRow>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không cập nhật được nhãn." };
  }

  return { ok: true, filter: mapFilter(data) };
}
