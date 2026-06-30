import "server-only";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

import { getViewerCoSoVaiTro } from "./co-so-membership";
import { canManageKhoaHoc } from "./co-so-vai-tro";
import {
  isLoaiSuKien,
  type LoaiSuKien,
  type CapNhatSuKienInput,
  type SuKienCardData,
  type TaoSuKienInput,
} from "./su-kien-constants";

export type {
  LoaiSuKien,
  SuKienCardData,
  TaoSuKienInput,
  CapNhatSuKienInput,
} from "./su-kien-constants";
export {
  LOAI_SU_KIEN_VALUES,
  LOAI_SU_KIEN_LABELS,
  isLoaiSuKien,
  labelLoaiSuKien,
} from "./su-kien-constants";

type SuKienRow = {
  id: string;
  ten: string;
  loai_su_kien: string;
  mo_ta: string | null;
  cover_id: string | null;
  bat_dau: string;
  ket_thuc: string | null;
  dia_diem: string | null;
  slot_toi_da: number | null;
};

const SU_KIEN_SELECT =
  "id, ten, loai_su_kien, mo_ta, cover_id, bat_dau, ket_thuc, dia_diem, slot_toi_da";

function mapRow(row: SuKienRow, soDangKy: number): SuKienCardData {
  const loai: LoaiSuKien = isLoaiSuKien(row.loai_su_kien)
    ? row.loai_su_kien
    : "meetup";
  return {
    id: row.id,
    ten: row.ten,
    loaiSuKien: loai,
    moTa: row.mo_ta?.trim() || null,
    coverId: row.cover_id ?? null,
    coverSrc: row.cover_id
      ? resolveTruongImageSrcSync(row.cover_id, ["public", "cover", "medium"])
      : null,
    batDau: row.bat_dau,
    ketThuc: row.ket_thuc,
    diaDiem: row.dia_diem?.trim() || null,
    slotToiDa: typeof row.slot_toi_da === "number" ? row.slot_toi_da : null,
    soDangKy,
  };
}

/** Quyền tạo / sửa sự kiện = quyền quản lý nội dung org (owner/admin/quản lý nội dung). */
export async function canViewerManageSuKien(
  profileId: string | null | undefined,
  orgId: string,
): Promise<boolean> {
  if (!profileId) return false;
  if (await getCurrentUserIsCinsAdmin()) return true;
  const vaiTro = await getViewerCoSoVaiTro(profileId, orgId);
  return canManageKhoaHoc(vaiTro);
}

async function orgExists(orgId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id")
    .eq("id", orgId)
    .maybeSingle();
  return Boolean(data?.id);
}

async function demDangKy(suKienIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!suKienIds.length) return counts;
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_dang_ky_su_kien")
    .select("id_su_kien")
    .in("id_su_kien", suKienIds);
  for (const row of data ?? []) {
    const sid = (row as { id_su_kien?: string }).id_su_kien;
    if (!sid) continue;
    counts.set(sid, (counts.get(sid) ?? 0) + 1);
  }
  return counts;
}

export async function listSuKienCuaOrg(
  orgId: string,
): Promise<
  { ok: true; suKien: SuKienCardData[] } | { ok: false; error: string }
> {
  if (!(await orgExists(orgId))) {
    return { ok: false, error: "Không tìm thấy tổ chức." };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_su_kien")
    .select(SU_KIEN_SELECT)
    .eq("id_to_chuc", orgId)
    .order("bat_dau", { ascending: true });

  if (error) return { ok: false, error: error.message };

  const rows = (data ?? []) as SuKienRow[];
  const counts = await demDangKy(rows.map((r) => r.id));
  return {
    ok: true,
    suKien: rows.map((row) => mapRow(row, counts.get(row.id) ?? 0)),
  };
}

function parseIsoTimestamp(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

type ValidInsert = {
  ten: string;
  loai_su_kien: LoaiSuKien;
  mo_ta: string | null;
  bat_dau: string;
  ket_thuc: string | null;
  dia_diem: string | null;
  slot_toi_da: number | null;
  cover_id: string | null;
};

function validateInput(
  input: TaoSuKienInput,
): { ok: true; data: ValidInsert } | { ok: false; error: string } {
  const ten = input.ten?.trim();
  if (!ten || ten.length < 2) {
    return { ok: false, error: "Tên sự kiện phải có ít nhất 2 ký tự." };
  }
  if (ten.length > 120) {
    return { ok: false, error: "Tên sự kiện tối đa 120 ký tự." };
  }
  if (!isLoaiSuKien(input.loaiSuKien)) {
    return { ok: false, error: "Loại sự kiện không hợp lệ." };
  }
  const batDau = parseIsoTimestamp(input.batDau);
  if (!batDau) {
    return { ok: false, error: "Cần thời gian bắt đầu hợp lệ." };
  }
  const ketThuc = parseIsoTimestamp(input.ketThuc);
  if (ketThuc && new Date(ketThuc) < new Date(batDau)) {
    return { ok: false, error: "Thời gian kết thúc phải sau thời gian bắt đầu." };
  }
  let slot: number | null = null;
  if (input.slotToiDa != null && input.slotToiDa !== undefined) {
    const n = Number(input.slotToiDa);
    if (!Number.isInteger(n) || n < 0) {
      return { ok: false, error: "Số lượng tối đa không hợp lệ." };
    }
    slot = n > 0 ? n : null;
  }
  return {
    ok: true,
    data: {
      ten,
      loai_su_kien: input.loaiSuKien,
      mo_ta: input.moTa?.trim() || null,
      bat_dau: batDau,
      ket_thuc: ketThuc,
      dia_diem: input.diaDiem?.trim() || null,
      slot_toi_da: slot,
      cover_id: input.coverId?.trim() || null,
    },
  };
}

export async function taoSuKien(
  orgId: string,
  actorId: string,
  input: TaoSuKienInput,
): Promise<
  { ok: true; suKien: SuKienCardData } | { ok: false; error: string }
> {
  if (!(await canViewerManageSuKien(actorId, orgId))) {
    return { ok: false, error: "Bạn không có quyền tạo sự kiện." };
  }
  if (!(await orgExists(orgId))) {
    return { ok: false, error: "Không tìm thấy tổ chức." };
  }

  const validated = validateInput(input);
  if (!validated.ok) return validated;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_su_kien")
    .insert({ id_to_chuc: orgId, ...validated.data })
    .select(SU_KIEN_SELECT)
    .single<SuKienRow>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không tạo được sự kiện." };
  }
  return { ok: true, suKien: mapRow(data, 0) };
}

async function getSuKienOrgId(suKienId: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_su_kien")
    .select("id_to_chuc")
    .eq("id", suKienId)
    .maybeSingle<{ id_to_chuc: string }>();
  return data?.id_to_chuc ?? null;
}

export async function capNhatSuKien(
  suKienId: string,
  actorId: string,
  input: CapNhatSuKienInput,
): Promise<
  { ok: true; suKien: SuKienCardData } | { ok: false; error: string }
> {
  const orgId = await getSuKienOrgId(suKienId);
  if (!orgId) return { ok: false, error: "Không tìm thấy sự kiện." };
  if (!(await canViewerManageSuKien(actorId, orgId))) {
    return { ok: false, error: "Bạn không có quyền sửa sự kiện." };
  }

  const admin = createServiceRoleClient();
  const { data: current, error: curErr } = await admin
    .from("org_su_kien")
    .select(SU_KIEN_SELECT)
    .eq("id", suKienId)
    .maybeSingle<SuKienRow>();
  if (curErr || !current) {
    return { ok: false, error: curErr?.message ?? "Không tìm thấy sự kiện." };
  }

  const merged: TaoSuKienInput = {
    ten: input.ten ?? current.ten,
    loaiSuKien: input.loaiSuKien ?? current.loai_su_kien,
    moTa: input.moTa !== undefined ? input.moTa : current.mo_ta,
    batDau: input.batDau ?? current.bat_dau,
    ketThuc: input.ketThuc !== undefined ? input.ketThuc : current.ket_thuc,
    diaDiem: input.diaDiem !== undefined ? input.diaDiem : current.dia_diem,
    slotToiDa:
      input.slotToiDa !== undefined ? input.slotToiDa : current.slot_toi_da,
    coverId: input.coverId !== undefined ? input.coverId : current.cover_id,
  };

  const validated = validateInput(merged);
  if (!validated.ok) return validated;

  const { data, error } = await admin
    .from("org_su_kien")
    .update(validated.data)
    .eq("id", suKienId)
    .select(SU_KIEN_SELECT)
    .single<SuKienRow>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Không lưu được sự kiện." };
  }
  const counts = await demDangKy([suKienId]);
  return { ok: true, suKien: mapRow(data, counts.get(suKienId) ?? 0) };
}

export async function xoaSuKien(
  suKienId: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const orgId = await getSuKienOrgId(suKienId);
  if (!orgId) return { ok: false, error: "Không tìm thấy sự kiện." };
  if (!(await canViewerManageSuKien(actorId, orgId))) {
    return { ok: false, error: "Bạn không có quyền xóa sự kiện." };
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("org_su_kien")
    .delete()
    .eq("id", suKienId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
