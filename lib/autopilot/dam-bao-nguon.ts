import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tìm hoặc tạo auto_nguon từ ma_ngoai (username Behance/ArtStation).
 */
export async function damBaoNguonTuMaNgoai(
  admin: SupabaseClient,
  params: {
    nenTang: "artstation" | "behance";
    maNgoai: string;
    niche?: string | null;
  },
): Promise<string> {
  const ma = params.maNgoai.trim().toLowerCase().replace(/^@/, "");
  if (!ma || !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(ma)) {
    throw new Error("maNgoai không hợp lệ.");
  }

  const urlHoSo =
    params.nenTang === "behance"
      ? `https://www.behance.net/${ma}`
      : `https://www.artstation.com/${ma}`;

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
