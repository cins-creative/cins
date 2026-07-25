import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type GoiHocPhi = {
  id: string;
  ten: string;
  soNgay: number;
  giaVnd: number;
  moTa: string | null;
  dangBan: boolean;
  thuTu: number;
  khoaId: string | null;
};

function mapGoi(row: {
  id: string;
  ten: string;
  so_ngay: number;
  gia_vnd: number | string;
  mo_ta: string | null;
  dang_ban: boolean;
  thu_tu: number;
  id_khoa_hoc: string | null;
}): GoiHocPhi {
  return {
    id: row.id,
    ten: row.ten,
    soNgay: Number(row.so_ngay),
    giaVnd: Number(row.gia_vnd) || 0,
    moTa: row.mo_ta,
    dangBan: Boolean(row.dang_ban),
    thuTu: Number(row.thu_tu) || 0,
    khoaId: row.id_khoa_hoc,
  };
}

export async function listGoiHocPhi(
  orgId: string,
  opts?: { includeHidden?: boolean },
): Promise<GoiHocPhi[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("org_goi_hoc_phi")
    .select(
      "id, ten, so_ngay, gia_vnd, mo_ta, dang_ban, thu_tu, id_khoa_hoc",
    )
    .eq("id_to_chuc", orgId)
    .order("thu_tu", { ascending: true })
    .order("tao_luc", { ascending: true });
  if (!opts?.includeHidden) {
    q = q.eq("dang_ban", true);
  }
  const { data } = await q;
  return (data ?? []).map((r) => mapGoi(r as Parameters<typeof mapGoi>[0]));
}

export async function createGoiHocPhi(input: {
  orgId: string;
  ten: string;
  soNgay: number;
  giaVnd: number;
  moTa?: string | null;
  khoaId?: string | null;
  thuTu?: number;
}): Promise<{ ok: true; goi: GoiHocPhi } | { ok: false; error: string }> {
  const ten = input.ten.trim();
  if (!ten) return { ok: false, error: "Thiếu tên gói." };
  if (input.soNgay < 1) return { ok: false, error: "Số ngày phải ≥ 1." };
  if (input.giaVnd < 0) return { ok: false, error: "Giá không hợp lệ." };

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_goi_hoc_phi")
    .insert({
      id_to_chuc: input.orgId,
      ten,
      so_ngay: input.soNgay,
      gia_vnd: input.giaVnd,
      mo_ta: input.moTa?.trim() || null,
      id_khoa_hoc: input.khoaId || null,
      thu_tu: input.thuTu ?? 0,
      dang_ban: true,
    })
    .select(
      "id, ten, so_ngay, gia_vnd, mo_ta, dang_ban, thu_tu, id_khoa_hoc",
    )
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không tạo gói." };
  }
  return { ok: true, goi: mapGoi(data as Parameters<typeof mapGoi>[0]) };
}

export async function updateGoiHocPhi(input: {
  orgId: string;
  goiId: string;
  ten?: string;
  soNgay?: number;
  giaVnd?: number;
  moTa?: string | null;
  dangBan?: boolean;
  thuTu?: number;
}): Promise<{ ok: true; goi: GoiHocPhi } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (input.ten !== undefined) {
    const ten = input.ten.trim();
    if (!ten) return { ok: false, error: "Thiếu tên gói." };
    patch.ten = ten;
  }
  if (input.soNgay !== undefined) {
    if (input.soNgay < 1) return { ok: false, error: "Số ngày phải ≥ 1." };
    patch.so_ngay = input.soNgay;
  }
  if (input.giaVnd !== undefined) {
    if (input.giaVnd < 0) return { ok: false, error: "Giá không hợp lệ." };
    patch.gia_vnd = input.giaVnd;
  }
  if (input.moTa !== undefined) patch.mo_ta = input.moTa?.trim() || null;
  if (input.dangBan !== undefined) patch.dang_ban = input.dangBan;
  if (input.thuTu !== undefined) patch.thu_tu = input.thuTu;

  const { data, error } = await admin
    .from("org_goi_hoc_phi")
    .update(patch)
    .eq("id", input.goiId)
    .eq("id_to_chuc", input.orgId)
    .select(
      "id, ten, so_ngay, gia_vnd, mo_ta, dang_ban, thu_tu, id_khoa_hoc",
    )
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không cập nhật gói." };
  }
  return { ok: true, goi: mapGoi(data as Parameters<typeof mapGoi>[0]) };
}
