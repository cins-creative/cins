import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  SuKienLoaiVe,
  SuKienLoaiVeInput,
} from "@/lib/to-chuc/su-kien-constants";
import { normalizeTruongGioiThieuHtml } from "@/lib/truong/gioi-thieu";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

type LoaiVeRow = {
  id: string;
  id_su_kien: string;
  ten: string;
  mo_ta: string | null;
  gia: number;
  cover_id: string | null;
  thu_tu: number;
};

const LOAI_VE_SELECT =
  "id, id_su_kien, ten, mo_ta, gia, cover_id, thu_tu";

function mapLoaiVe(row: LoaiVeRow): SuKienLoaiVe {
  return {
    id: row.id,
    ten: row.ten,
    moTa: row.mo_ta?.trim() || null,
    gia: row.gia,
    coverId: row.cover_id ?? null,
    coverSrc: row.cover_id
      ? resolveTruongImageSrcSync(row.cover_id, ["public", "cover", "medium"])
      : null,
    thuTu: row.thu_tu,
  };
}

export function validateLoaiVeInputs(
  mienPhi: boolean,
  loaiVe: SuKienLoaiVeInput[] | undefined,
):
  | { ok: true; items: SuKienLoaiVeInput[] }
  | { ok: false; error: string } {
  if (mienPhi) return { ok: true, items: [] };
  const list = loaiVe ?? [];
  if (list.length === 0) {
    return {
      ok: false,
      error: "Sự kiện tính phí cần ít nhất một loại vé.",
    };
  }
  if (list.length > 20) {
    return { ok: false, error: "Tối đa 20 loại vé mỗi sự kiện." };
  }
  const items: SuKienLoaiVeInput[] = [];
  for (let i = 0; i < list.length; i++) {
    const raw = list[i]!;
    const ten = raw.ten?.trim() ?? "";
    if (ten.length < 1) {
      return { ok: false, error: `Loại vé #${i + 1}: cần tên.` };
    }
    if (ten.length > 80) {
      return { ok: false, error: `Loại vé «${ten}»: tên tối đa 80 ký tự.` };
    }
    const gia = Number(raw.gia);
    if (!Number.isInteger(gia) || gia < 0) {
      return { ok: false, error: `Loại vé «${ten}»: giá không hợp lệ.` };
    }
    const moTa = normalizeTruongGioiThieuHtml(raw.moTa);
    if (moTa && moTa.length > 2000) {
      return { ok: false, error: `Loại vé «${ten}»: mô tả tối đa 2000 ký tự.` };
    }
    items.push({
      ten,
      moTa,
      gia,
      coverId: raw.coverId?.trim() || null,
      thuTu: typeof raw.thuTu === "number" ? raw.thuTu : i,
    });
  }
  return { ok: true, items };
}

/** Min giá — denormalize lên org_su_kien.gia_ve. */
export function minGiaTuLoaiVe(items: { gia: number }[]): number | null {
  if (items.length === 0) return null;
  return Math.min(...items.map((i) => i.gia));
}

export async function listLoaiVeBySuKienIds(
  suKienIds: string[],
): Promise<Map<string, SuKienLoaiVe[]>> {
  const out = new Map<string, SuKienLoaiVe[]>();
  if (suKienIds.length === 0) return out;
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_su_kien_loai_ve")
    .select(LOAI_VE_SELECT)
    .in("id_su_kien", suKienIds)
    .order("thu_tu", { ascending: true });
  if (error || !data) return out;
  for (const row of data as LoaiVeRow[]) {
    const list = out.get(row.id_su_kien) ?? [];
    list.push(mapLoaiVe(row));
    out.set(row.id_su_kien, list);
  }
  return out;
}

export async function listLoaiVeCuaSuKien(
  suKienId: string,
): Promise<SuKienLoaiVe[]> {
  const map = await listLoaiVeBySuKienIds([suKienId]);
  return map.get(suKienId) ?? [];
}

/** Replace-all loại vé của một sự kiện. */
export async function replaceLoaiVeCuaSuKien(
  suKienId: string,
  items: SuKienLoaiVeInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { error: delErr } = await admin
    .from("org_su_kien_loai_ve")
    .delete()
    .eq("id_su_kien", suKienId);
  if (delErr) return { ok: false, error: delErr.message };
  if (items.length === 0) return { ok: true };

  const rows = items.map((item, i) => ({
    id_su_kien: suKienId,
    ten: item.ten.trim(),
    mo_ta: item.moTa?.trim() || null,
    gia: item.gia,
    cover_id: item.coverId?.trim() || null,
    thu_tu: typeof item.thuTu === "number" ? item.thuTu : i,
  }));
  const { error: insErr } = await admin
    .from("org_su_kien_loai_ve")
    .insert(rows);
  if (insErr) return { ok: false, error: insErr.message };
  return { ok: true };
}
