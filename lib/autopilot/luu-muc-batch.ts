import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type MucNhapVao = {
  urlCanonic: string;
  tieuDeGoc?: string | null;
  moTaGoc?: string | null;
  tenTacGia?: string | null;
  anhBiaUrl?: string | null;
  meta?: Record<string, unknown>;
};

export type LuuMucBatchResult = {
  them: number;
  boQua: number;
  loi: number;
};

function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Insert batch vào auto_muc — bỏ qua url_canonic đã có.
 */
export async function luuMucBatch(
  admin: SupabaseClient,
  params: {
    idNguon?: string | null;
    nenTang: "artstation" | "behance" | "pixiv" | "khac";
    items: MucNhapVao[];
  },
): Promise<LuuMucBatchResult> {
  const cleaned = params.items
    .map((it) => {
      const url = String(it.urlCanonic || "")
        .trim()
        .split("?")[0];
      if (!isHttpsUrl(url)) return null;
      return {
        id_nguon: params.idNguon || null,
        url_canonic: url,
        nen_tang: params.nenTang,
        tieu_de_goc: (it.tieuDeGoc || url).trim().slice(0, 500),
        mo_ta_goc: it.moTaGoc?.trim() || null,
        ten_tac_gia: it.tenTacGia?.trim() || null,
        anh_bia_url: it.anhBiaUrl?.trim() || null,
        meta: it.meta && typeof it.meta === "object" ? it.meta : {},
        trang_thai: "moi" as const,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  if (!cleaned.length) return { them: 0, boQua: 0, loi: 0 };

  const urls = cleaned.map((r) => r.url_canonic);
  const { data: existing, error: exErr } = await admin
    .from("auto_muc")
    .select("url_canonic")
    .in("url_canonic", urls);

  if (exErr) {
    throw new Error(`Đọc auto_muc: ${exErr.message}`);
  }

  const daCo = new Set((existing || []).map((r) => r.url_canonic as string));
  const moi = cleaned.filter((r) => !daCo.has(r.url_canonic));

  let them = 0;
  let loi = 0;

  for (let i = 0; i < moi.length; i += 50) {
    const chunk = moi.slice(i, i + 50);
    const { data, error } = await admin
      .from("auto_muc")
      .insert(chunk)
      .select("id");
    if (error) {
      loi += chunk.length;
    } else {
      them += data?.length ?? chunk.length;
    }
  }

  return { them, boQua: cleaned.length - moi.length, loi };
}
