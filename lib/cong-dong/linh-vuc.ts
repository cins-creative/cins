import "server-only";

import {
  CONG_DONG_LINH_VUC_MAX,
  canDiscoverCongDong,
  parseCongDongCheDoFromCauHinh,
} from "@/lib/cong-dong/constants";
import type { CongDongOrgCategoryPreview } from "@/lib/cong-dong/categories";
import { isCongDongAdmin } from "@/lib/cong-dong/membership";
import type { CongDongLinhVuc } from "@/lib/cong-dong/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export { CONG_DONG_LINH_VUC_MAX };

const LINH_VUC_KEY = "linh_vuc";

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function pickStr(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

function mapLinhVucRow(row: Record<string, unknown>): CongDongLinhVuc | null {
  const id = pickStr(row, ["id"]);
  if (!id) return null;
  const ten = pickStr(row, ["ten", "ten_vi", "tieu_de", "ten_linh_vuc", "name"]);
  const slug = pickStr(row, ["slug", "ma_slug", "slug_linh_vuc"]) ?? id;
  if (!ten) return null;
  const trangThai = pickStr(row, ["trang_thai"]);
  if (trangThai && trangThai !== "active") return null;
  return {
    id,
    slug,
    ten,
    mauAccent: pickStr(row, ["mau_accent"]),
    moTa: pickStr(row, ["mo_ta"]),
    coverId: pickStr(row, ["cover_id", "thumbnail_id"]),
  };
}

export function parseLinhVucIdsFromCauHinh(cauHinh: unknown): string[] {
  const root = asRecord(cauHinh);
  const raw = root[LINH_VUC_KEY] ?? root.linhVuc;
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= CONG_DONG_LINH_VUC_MAX) break;
  }
  return ids;
}

async function hydrateLinhVucIds(ids: string[]): Promise<CongDongLinhVuc[]> {
  if (!ids.length) return [];
  const admin = createServiceRoleClient();
  const { data } = await admin.from("linh_vuc").select("*").in("id", ids);

  const byId = new Map<string, CongDongLinhVuc>();
  for (const row of data ?? []) {
    const mapped = mapLinhVucRow(row as Record<string, unknown>);
    if (mapped) byId.set(mapped.id, mapped);
  }

  const out: CongDongLinhVuc[] = [];
  for (const id of ids) {
    const item = byId.get(id);
    if (item) out.push(item);
  }
  return out;
}

/** Catalog lĩnh vực active — cho picker (~11 mục). */
export async function listCongDongLinhVucCatalog(): Promise<CongDongLinhVuc[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin.from("linh_vuc").select("*");

  const out: CongDongLinhVuc[] = [];
  for (const row of data ?? []) {
    const mapped = mapLinhVucRow(row as Record<string, unknown>);
    if (mapped) out.push(mapped);
  }
  out.sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  return out;
}

export async function loadCongDongLinhVucs(
  orgId: string,
): Promise<CongDongLinhVuc[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ cau_hinh: unknown }>();

  return hydrateLinhVucIds(parseLinhVucIdsFromCauHinh(data?.cau_hinh));
}

export async function validateCongDongLinhVucIds(
  ids: string[],
): Promise<
  | { ok: true; linhVucs: CongDongLinhVuc[] }
  | { ok: false; error: string }
> {
  const unique: string[] = [];
  for (const id of ids) {
    const trimmed = id?.trim();
    if (!trimmed) continue;
    if (!unique.includes(trimmed)) unique.push(trimmed);
  }

  if (unique.length > CONG_DONG_LINH_VUC_MAX) {
    return {
      ok: false,
      error: `Tối đa ${CONG_DONG_LINH_VUC_MAX} lĩnh vực.`,
    };
  }

  if (!unique.length) {
    return { ok: true, linhVucs: [] };
  }

  const linhVucs = await hydrateLinhVucIds(unique);
  if (linhVucs.length !== unique.length) {
    return {
      ok: false,
      error: "Một hoặc nhiều lĩnh vực không hợp lệ.",
    };
  }

  return { ok: true, linhVucs };
}

async function persistLinhVucIds(
  orgId: string,
  ids: string[],
  existingCauHinh: unknown,
) {
  const admin = createServiceRoleClient();
  const merged = {
    ...asRecord(existingCauHinh),
    [LINH_VUC_KEY]: ids,
  };
  await admin
    .from("org_to_chuc")
    .update({ cau_hinh: merged })
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong");
}

export async function updateCongDongLinhVucs(params: {
  orgId: string;
  adminId: string;
  linhVucIds: string[];
}): Promise<
  | { ok: true; linhVucs: CongDongLinhVuc[] }
  | { ok: false; error: string }
> {
  if (!(await isCongDongAdmin(params.adminId, params.orgId))) {
    return { ok: false, error: "Chỉ admin cộng đồng mới cập nhật lĩnh vực." };
  }

  const validated = await validateCongDongLinhVucIds(params.linhVucIds);
  if (!validated.ok) return validated;

  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", params.orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ cau_hinh: unknown }>();

  if (!org) return { ok: false, error: "Không tìm thấy cộng đồng." };

  const ids = validated.linhVucs.map((v) => v.id);
  await persistLinhVucIds(params.orgId, ids, org.cau_hinh);
  return { ok: true, linhVucs: validated.linhVucs };
}

/** Cộng đồng gắn lĩnh vực — discovery từ hub `/nghe-nghiep?linh_vuc=`. */
export async function listCongDongOrgsForLinhVuc(
  linhVucId: string,
  limit = 8,
): Promise<CongDongOrgCategoryPreview[]> {
  const id = linhVucId.trim();
  if (!id) return [];

  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten, avatar_id, cau_hinh")
    .eq("loai_to_chuc", "cong_dong")
    .order("ten", { ascending: true })
    .limit(200);

  if (!rows?.length) return [];

  const matched = rows.filter((row) => {
    const cheDo = parseCongDongCheDoFromCauHinh(row.cau_hinh);
    if (!canDiscoverCongDong(cheDo)) return false;
    return parseLinhVucIdsFromCauHinh(row.cau_hinh).includes(id);
  });
  if (!matched.length) return [];

  const orgIds = matched.map((r) => r.id);
  const { data: memberRows } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_to_chuc")
    .eq("trang_thai", "active")
    .in("id_to_chuc", orgIds);

  const countMap = new Map<string, number>();
  for (const row of memberRows ?? []) {
    countMap.set(row.id_to_chuc, (countMap.get(row.id_to_chuc) ?? 0) + 1);
  }

  return matched
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      ten: row.ten,
      avatarId: row.avatar_id,
      soThanhVien: countMap.get(row.id) ?? 0,
    }))
    .sort((a, b) => b.soThanhVien - a.soThanhVien)
    .slice(0, limit);
}
