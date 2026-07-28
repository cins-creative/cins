import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { laTieuDeThoBehance } from "@/lib/autopilot/behance-assets";

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
    .select("id, url_canonic, anh_bia_url, tieu_de_goc, meta")
    .in("url_canonic", urls);

  if (exErr) {
    throw new Error(`Đọc auto_muc: ${exErr.message}`);
  }

  const byUrl = new Map(
    (existing || []).map((r) => [r.url_canonic as string, r]),
  );
  const moi = cleaned.filter((r) => !byUrl.has(r.url_canonic));

  /* Trùng URL nhưng thiếu cover / title thô → bổ sung từ lần quét mới. */
  for (const r of cleaned) {
    const cu = byUrl.get(r.url_canonic);
    if (!cu) continue;
    const patch: Record<string, unknown> = {};
    if (!cu.anh_bia_url && r.anh_bia_url) {
      patch.anh_bia_url = r.anh_bia_url;
    }
    const tieuCu = String(cu.tieu_de_goc || "");
    const tieuMoi = String(r.tieu_de_goc || "");
    let tieuDeGocPatch: string | null = null;
    if (
      tieuMoi &&
      !laTieuDeThoBehance(tieuMoi) &&
      !/^https?:/i.test(tieuMoi) &&
      (laTieuDeThoBehance(tieuCu) || !tieuCu || /^https?:/i.test(tieuCu))
    ) {
      tieuDeGocPatch = tieuMoi.slice(0, 500);
      patch.tieu_de_goc = tieuDeGocPatch;
    }
    /* Bổ sung album ảnh (anhUrls) khi lần quét mới có nhiều ảnh hơn — cho phép
       re-collect từ trang gallery để làm giàu mục đã có. */
    const metaCu =
      cu.meta && typeof cu.meta === "object"
        ? (cu.meta as Record<string, unknown>)
        : {};
    const metaMoi =
      r.meta && typeof r.meta === "object"
        ? (r.meta as Record<string, unknown>)
        : {};
    const anhUrlsCu = Array.isArray(metaCu.anhUrls) ? metaCu.anhUrls : [];
    const anhUrlsMoi = Array.isArray(metaMoi.anhUrls) ? metaMoi.anhUrls : [];
    if (anhUrlsMoi.length > anhUrlsCu.length) {
      patch.meta = { ...metaCu, ...metaMoi, anhUrls: anhUrlsMoi };
    }
    if (Object.keys(patch).length) {
      await admin.from("auto_muc").update(patch).eq("id", cu.id);
      if (tieuDeGocPatch) {
        /* Đồng bộ bản thảo còn tiêu đề thô `Behance {id}`. */
        const { data: banThaos } = await admin
          .from("auto_ban_thao")
          .select("id, tieu_de")
          .eq("id_muc", cu.id);
        for (const bt of banThaos || []) {
          if (!laTieuDeThoBehance(bt.tieu_de as string | null)) continue;
          await admin
            .from("auto_ban_thao")
            .update({ tieu_de: tieuDeGocPatch.slice(0, 200) })
            .eq("id", bt.id);
        }
      }
    }
  }

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
