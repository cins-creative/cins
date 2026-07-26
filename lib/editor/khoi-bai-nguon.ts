/**
 * Ghép khối Journey chuẩn cho bài curator từ Behance / ArtStation.
 * Không xưng là tác giả gốc — dòng ghi nguồn bắt buộc.
 */

import type { Block } from "@/lib/editor/types";

export type NenTangNguon = "artstation" | "behance" | "khac";

export function doanNenTangTuUrl(url: string): NenTangNguon {
  const u = url.trim().toLowerCase();
  if (u.includes("artstation.com")) return "artstation";
  if (u.includes("behance.net")) return "behance";
  return "khac";
}

export function nhanNenTang(nenTang: NenTangNguon): string {
  if (nenTang === "artstation") return "ArtStation";
  if (nenTang === "behance") return "Behance";
  return "nguồn ngoài";
}

/** Dòng attribution — tránh giọng “tôi vẽ / portfolio của mình”. */
export function taoDongGhiNguon(params: {
  urlNguon: string;
  nenTang?: NenTangNguon;
  tenTacGiaNguon?: string | null;
  dongGhiNguon?: string | null;
}): string {
  const override = params.dongGhiNguon?.trim();
  if (override) return override;

  const nen = params.nenTang ?? doanNenTangTuUrl(params.urlNguon);
  const nhan = nhanNenTang(nen);
  const tacGia = params.tenTacGiaNguon?.trim();
  if (tacGia) {
    return `Giới thiệu từ ${nhan} — ${tacGia}. Xem bản gốc: ${params.urlNguon.trim()}`;
  }
  return `Giới thiệu từ ${nhan}. Xem bản gốc: ${params.urlNguon.trim()}`;
}

/**
 * Khối mặc định Phase 0:
 * 1. body — mô tả ngắn (AI sau)
 * 2. embed — URL nguồn (Behance/ArtStation → card link, không iframe)
 * 3. body — dòng ghi nguồn
 */
export function taoKhoiBaiNguon(params: {
  moTa?: string | null;
  urlNguon: string;
  nenTang?: NenTangNguon;
  tenTacGiaNguon?: string | null;
  dongGhiNguon?: string | null;
}): Block[] {
  const url = params.urlNguon.trim();
  const moTa = params.moTa?.trim() || "";
  const ghiNguon = taoDongGhiNguon({
    urlNguon: url,
    nenTang: params.nenTang,
    tenTacGiaNguon: params.tenTacGiaNguon,
    dongGhiNguon: params.dongGhiNguon,
  });

  const blocks: Block[] = [];
  let i = 0;
  if (moTa) {
    blocks.push({
      id: `b-${i}`,
      loai: "body",
      thu_tu: i,
      config: { html: moTa },
    });
    i += 1;
  }
  blocks.push({
    id: `b-${i}`,
    loai: "embed",
    thu_tu: i,
    config: { url },
  });
  i += 1;
  blocks.push({
    id: `b-${i}`,
    loai: "body",
    thu_tu: i,
    config: { html: ghiNguon },
  });
  return blocks;
}
