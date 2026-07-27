import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type NenTangAutoNguon = "artstation" | "behance" | "pixiv";

function chuanHoaMaNgoai(
  nenTang: NenTangAutoNguon,
  maNgoai: string,
): string {
  const raw = maNgoai.trim().replace(/^@/, "");
  if (nenTang === "pixiv") {
    if (!/^\d{1,12}$/.test(raw)) {
      throw new Error("maNgoai Pixiv phải là user id số (/users/{id}).");
    }
    return raw;
  }
  const ma = raw.toLowerCase();
  if (!ma || !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(ma)) {
    throw new Error("maNgoai không hợp lệ.");
  }
  return ma;
}

function urlHoSoTuMa(nenTang: NenTangAutoNguon, ma: string): string {
  if (nenTang === "behance") return `https://www.behance.net/${ma}`;
  if (nenTang === "pixiv") return `https://www.pixiv.net/users/${ma}`;
  return `https://www.artstation.com/${ma}`;
}

/**
 * Tìm hoặc tạo auto_nguon từ ma_ngoai (username AS/BH hoặc user id Pixiv).
 */
export async function damBaoNguonTuMaNgoai(
  admin: SupabaseClient,
  params: {
    nenTang: NenTangAutoNguon;
    maNgoai: string;
    niche?: string | null;
  },
): Promise<string> {
  const ma = chuanHoaMaNgoai(params.nenTang, params.maNgoai);
  const urlHoSo = urlHoSoTuMa(params.nenTang, ma);

  const { data: existing, error: findErr } = await admin
    .from("auto_nguon")
    .select("id")
    .eq("nen_tang", params.nenTang)
    .eq("url_ho_so", urlHoSo)
    .maybeSingle<{ id: string }>();

  if (findErr) throw new Error(`Đọc auto_nguon: ${findErr.message}`);
  if (existing?.id) return existing.id;

  const { data: created, error: insErr } = await admin
    .from("auto_nguon")
    .insert({
      nen_tang: params.nenTang,
      url_ho_so: urlHoSo,
      ma_ngoai: ma,
      ten_hien_thi: ma,
      niche: params.niche?.trim() || null,
      dang_bat: true,
    })
    .select("id")
    .single<{ id: string }>();

  if (insErr) {
    /* race: unique → đọc lại */
    const { data: again } = await admin
      .from("auto_nguon")
      .select("id")
      .eq("nen_tang", params.nenTang)
      .eq("url_ho_so", urlHoSo)
      .maybeSingle<{ id: string }>();
    if (again?.id) return again.id;
    throw new Error(`Tạo auto_nguon: ${insErr.message}`);
  }

  return created.id;
}
