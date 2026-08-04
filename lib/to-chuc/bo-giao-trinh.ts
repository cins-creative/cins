import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  isLoaiBaiGiaoTrinh,
  type BoGiaoTrinhBaiData,
  type BoGiaoTrinhChiTiet,
  type BoGiaoTrinhData,
  type LoaiBaiGiaoTrinh,
} from "@/lib/to-chuc/khoa-hoc-types";

function normalizeThumbnail(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t || t.startsWith("blob:")) return null;
  return t;
}

async function assertBoInOrg(orgId: string, boId: string) {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_bo_giao_trinh")
    .select("id, ten_bo, mo_ta, thu_tu")
    .eq("id", boId)
    .eq("id_to_chuc", orgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Không tìm thấy bộ giáo trình.");
  return data;
}

export async function listBoGiaoTrinh(
  orgId: string,
): Promise<BoGiaoTrinhData[]> {
  const admin = createServiceRoleClient();
  const { data: bos, error } = await admin
    .from("org_bo_giao_trinh")
    .select("id, ten_bo, mo_ta, thu_tu")
    .eq("id_to_chuc", orgId)
    .order("thu_tu", { ascending: true })
    .order("ten_bo", { ascending: true });
  if (error) throw new Error(error.message);
  if (!bos?.length) return [];

  const boIds = bos.map((b) => b.id as string);

  const [{ data: ganRows }, { data: khoaRows }] = await Promise.all([
    admin.from("org_giao_trinh_bai").select("id_bo").in("id_bo", boIds),
    admin
      .from("org_khoa_hoc")
      .select("id, ten_khoa_hoc, id_bo_giao_trinh")
      .eq("id_to_chuc", orgId)
      .in("id_bo_giao_trinh", boIds),
  ]);

  const soBai = new Map<string, number>();
  for (const row of ganRows ?? []) {
    const id = row.id_bo as string;
    soBai.set(id, (soBai.get(id) ?? 0) + 1);
  }

  const khoaByBo = new Map<string, { id: string; ten: string }[]>();
  for (const k of khoaRows ?? []) {
    const boId = k.id_bo_giao_trinh as string | null;
    if (!boId) continue;
    const list = khoaByBo.get(boId) ?? [];
    list.push({ id: k.id as string, ten: k.ten_khoa_hoc as string });
    khoaByBo.set(boId, list);
  }

  return bos.map((b) => {
    const id = b.id as string;
    const khoas = khoaByBo.get(id) ?? [];
    return {
      id,
      tenBo: b.ten_bo as string,
      moTa: (b.mo_ta as string | null) ?? null,
      thuTu: Number(b.thu_tu ?? 0),
      soBai: soBai.get(id) ?? 0,
      khoaIds: khoas.map((k) => k.id),
      khoaTenList: khoas.map((k) => k.ten),
    };
  });
}

export async function createBoGiaoTrinh(
  orgId: string,
  input: { tenBo: string; moTa?: string | null; thuTu?: number | null },
): Promise<BoGiaoTrinhData> {
  const tenBo = input.tenBo.trim();
  if (!tenBo) throw new Error("Thiếu tên bộ giáo trình.");

  const admin = createServiceRoleClient();
  let thuTu = input.thuTu ?? null;
  if (thuTu == null) {
    const { data: maxRow } = await admin
      .from("org_bo_giao_trinh")
      .select("thu_tu")
      .eq("id_to_chuc", orgId)
      .order("thu_tu", { ascending: false })
      .limit(1)
      .maybeSingle();
    thuTu = Number(maxRow?.thu_tu ?? 0) + 1;
  }

  const { data, error } = await admin
    .from("org_bo_giao_trinh")
    .insert({
      id_to_chuc: orgId,
      ten_bo: tenBo,
      mo_ta: input.moTa?.trim() || null,
      thu_tu: thuTu,
    })
    .select("id, ten_bo, mo_ta, thu_tu")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Đã có bộ giáo trình cùng tên trong cơ sở này.");
    }
    throw new Error(error.message);
  }

  return {
    id: data.id as string,
    tenBo: data.ten_bo as string,
    moTa: (data.mo_ta as string | null) ?? null,
    thuTu: Number(data.thu_tu ?? thuTu),
    soBai: 0,
    khoaIds: [],
    khoaTenList: [],
  };
}

export async function updateBoGiaoTrinh(
  orgId: string,
  boId: string,
  input: { tenBo?: string; moTa?: string | null; thuTu?: number | null },
): Promise<BoGiaoTrinhData> {
  await assertBoInOrg(orgId, boId);
  const admin = createServiceRoleClient();
  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (input.tenBo !== undefined) {
    const t = input.tenBo.trim();
    if (!t) throw new Error("Thiếu tên bộ giáo trình.");
    patch.ten_bo = t;
  }
  if (input.moTa !== undefined) patch.mo_ta = input.moTa?.trim() || null;
  if (input.thuTu !== undefined && input.thuTu != null) {
    patch.thu_tu = input.thuTu;
  }

  const { error } = await admin
    .from("org_bo_giao_trinh")
    .update(patch)
    .eq("id", boId)
    .eq("id_to_chuc", orgId);
  if (error) {
    if (error.code === "23505") {
      throw new Error("Đã có bộ giáo trình cùng tên trong cơ sở này.");
    }
    throw new Error(error.message);
  }

  const list = await listBoGiaoTrinh(orgId);
  const found = list.find((b) => b.id === boId);
  if (!found) throw new Error("Không tìm thấy bộ giáo trình.");
  return found;
}

export async function deleteBoGiaoTrinh(
  orgId: string,
  boId: string,
): Promise<{ khoaTenList: string[] }> {
  await assertBoInOrg(orgId, boId);
  const admin = createServiceRoleClient();
  const { data: khoas } = await admin
    .from("org_khoa_hoc")
    .select("ten_khoa_hoc")
    .eq("id_to_chuc", orgId)
    .eq("id_bo_giao_trinh", boId);
  const khoaTenList = (khoas ?? []).map((k) => k.ten_khoa_hoc as string);

  const { error } = await admin
    .from("org_bo_giao_trinh")
    .delete()
    .eq("id", boId)
    .eq("id_to_chuc", orgId);
  if (error) throw new Error(error.message);
  return { khoaTenList };
}

export async function fetchBoGiaoTrinhChiTiet(
  orgId: string,
  boId: string,
): Promise<BoGiaoTrinhChiTiet> {
  const list = await listBoGiaoTrinh(orgId);
  const meta = list.find((b) => b.id === boId);
  if (!meta) throw new Error("Không tìm thấy bộ giáo trình.");

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_giao_trinh_bai")
    .select(
      "id_bai_tap, thuoc_tinh, thu_tu, ghi_chu, org_bai_tap!inner(id, ten_bai_tap, mo_ta, yeu_cau, video_youtube_url, thumbnail_url, id_to_chuc)",
    )
    .eq("id_bo", boId)
    .order("thu_tu", { ascending: true });
  if (error) throw new Error(error.message);

  const bai: BoGiaoTrinhBaiData[] = [];
  for (const row of data ?? []) {
    const mod = row.org_bai_tap as unknown as {
      id: string;
      ten_bai_tap: string;
      mo_ta: string | null;
      yeu_cau: string | null;
      video_youtube_url: string | null;
      thumbnail_url: string | null;
      id_to_chuc: string;
    } | null;
    if (!mod || mod.id_to_chuc !== orgId) continue;
    const thuocTinh = isLoaiBaiGiaoTrinh(row.thuoc_tinh)
      ? row.thuoc_tinh
      : "bai_tap";
    bai.push({
      baiTapId: mod.id,
      tenBaiTap: mod.ten_bai_tap,
      moTa: mod.mo_ta,
      yeuCau: mod.yeu_cau,
      videoYoutubeUrl: mod.video_youtube_url,
      thumbnailUrl: normalizeThumbnail(mod.thumbnail_url),
      thuocTinh,
      thuTu: Number(row.thu_tu ?? 0),
      ghiChu: (row.ghi_chu as string | null) ?? null,
    });
  }

  return { ...meta, bai };
}

export type SyncBoBaiItem = {
  baiTapId: string;
  thuocTinh: LoaiBaiGiaoTrinh;
  thuTu?: number;
  ghiChu?: string | null;
};

export async function syncBoGiaoTrinhBai(
  orgId: string,
  boId: string,
  items: SyncBoBaiItem[],
): Promise<BoGiaoTrinhChiTiet> {
  await assertBoInOrg(orgId, boId);
  const admin = createServiceRoleClient();

  const seen = new Set<string>();
  const normalized: SyncBoBaiItem[] = [];
  for (const item of items) {
    const id = item.baiTapId.trim();
    if (!id || seen.has(id)) continue;
    if (!isLoaiBaiGiaoTrinh(item.thuocTinh)) {
      throw new Error("Thuộc tính bài không hợp lệ.");
    }
    seen.add(id);
    normalized.push({
      baiTapId: id,
      thuocTinh: item.thuocTinh,
      ghiChu: item.ghiChu ?? null,
    });
  }

  if (normalized.length > 0) {
    const ids = normalized.map((i) => i.baiTapId);
    const { data: mods, error: modErr } = await admin
      .from("org_bai_tap")
      .select("id")
      .eq("id_to_chuc", orgId)
      .in("id", ids);
    if (modErr) throw new Error(modErr.message);
    if ((mods ?? []).length !== ids.length) {
      throw new Error("Có bài tập không thuộc cơ sở này.");
    }
  }

  const { data: existing, error: exErr } = await admin
    .from("org_giao_trinh_bai")
    .select("id_bai_tap")
    .eq("id_bo", boId);
  if (exErr) throw new Error(exErr.message);

  const nextIds = new Set(normalized.map((i) => i.baiTapId));
  const toDelete = (existing ?? [])
    .map((r) => r.id_bai_tap as string)
    .filter((id) => !nextIds.has(id));

  if (toDelete.length > 0) {
    const { error: delErr } = await admin
      .from("org_giao_trinh_bai")
      .delete()
      .eq("id_bo", boId)
      .in("id_bai_tap", toDelete);
    if (delErr) throw new Error(delErr.message);
  }

  if (normalized.length > 0) {
    const rows = normalized.map((item, index) => ({
      id_bo: boId,
      id_bai_tap: item.baiTapId,
      thuoc_tinh: item.thuocTinh,
      thu_tu: index + 1,
      ghi_chu: item.ghiChu?.trim() || null,
    }));
    const { error: upErr } = await admin
      .from("org_giao_trinh_bai")
      .upsert(rows, { onConflict: "id_bo,id_bai_tap" });
    if (upErr) throw new Error(upErr.message);
  }

  await admin
    .from("org_bo_giao_trinh")
    .update({ cap_nhat_luc: new Date().toISOString() })
    .eq("id", boId);

  return fetchBoGiaoTrinhChiTiet(orgId, boId);
}

export async function setKhoaBoGiaoTrinh(
  orgId: string,
  khoaId: string,
  boId: string | null,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: khoa, error: khoaErr } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id", khoaId)
    .eq("id_to_chuc", orgId)
    .maybeSingle();
  if (khoaErr) throw new Error(khoaErr.message);
  if (!khoa) throw new Error("Không tìm thấy khóa học.");

  if (boId) {
    await assertBoInOrg(orgId, boId);
  }

  const { error } = await admin
    .from("org_khoa_hoc")
    .update({ id_bo_giao_trinh: boId })
    .eq("id", khoaId)
    .eq("id_to_chuc", orgId);
  if (error) throw new Error(error.message);
}

/** Tạo bộ tên = tên khóa (nếu chưa có) rồi gắn — dùng khi thêm bài inline trên trang khóa. */
export async function ensureBoForKhoa(
  orgId: string,
  khoaId: string,
): Promise<string> {
  const admin = createServiceRoleClient();
  const { data: khoa, error } = await admin
    .from("org_khoa_hoc")
    .select("id, ten_khoa_hoc, id_bo_giao_trinh")
    .eq("id", khoaId)
    .eq("id_to_chuc", orgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!khoa) throw new Error("Không tìm thấy khóa học.");
  if (khoa.id_bo_giao_trinh) return khoa.id_bo_giao_trinh as string;

  const ten = (khoa.ten_khoa_hoc as string)?.trim() || "Bộ giáo trình";
  let tenBo = ten;
  let suffix = 1;
  for (;;) {
    const { data: clash } = await admin
      .from("org_bo_giao_trinh")
      .select("id")
      .eq("id_to_chuc", orgId)
      .ilike("ten_bo", tenBo)
      .maybeSingle();
    if (!clash) break;
    suffix += 1;
    tenBo = `${ten} (${suffix})`;
  }

  const bo = await createBoGiaoTrinh(orgId, { tenBo });
  await setKhoaBoGiaoTrinh(orgId, khoaId, bo.id);
  return bo.id;
}
