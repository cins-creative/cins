/**
 * Ghép khối Journey chuẩn cho bài curator từ Behance / ArtStation / Pixiv.
 * Không xưng là tác giả gốc — dòng ghi nguồn bắt buộc.
 */

import type { Block } from "@/lib/editor/types";

export type NenTangNguon = "artstation" | "behance" | "pixiv" | "carrd" | "khac";

export function doanNenTangTuUrl(url: string): NenTangNguon {
  const u = url.trim().toLowerCase();
  if (u.includes("artstation.com")) return "artstation";
  if (u.includes("behance.net")) return "behance";
  if (u.includes("pixiv.net")) return "pixiv";
  if (u.includes("carrd.co")) return "carrd";
  return "khac";
}

export function nhanNenTang(nenTang: NenTangNguon): string {
  if (nenTang === "artstation") return "ArtStation";
  if (nenTang === "behance") return "Behance";
  if (nenTang === "pixiv") return "Pixiv";
  if (nenTang === "carrd") return "Carrd";
  return "nguồn ngoài";
}

/**
 * Nhận diện dòng attribution kiểu cũ (trước 42b23a0):
 * «Giới thiệu từ {nền} — {tác giả}. Xem bản gốc: {url}».
 * Các bản thảo cũ còn đóng băng chuỗi này trong `auto_ban_thao.dong_ghi_nguon`
 * → bỏ qua để sinh lại dòng ngắn «Nguồn: …», tránh lặp boilerplate.
 */
export function laDongGhiNguonCu(s: string): boolean {
  return /^Giới thiệu từ\s[\s\S]*Xem bản gốc:/i.test(s.trim());
}

/** Dòng attribution — ngắn: «Nguồn:» + URL. */
export function taoDongGhiNguon(params: {
  urlNguon: string;
  nenTang?: NenTangNguon;
  tenTacGiaNguon?: string | null;
  dongGhiNguon?: string | null;
}): string {
  const override = params.dongGhiNguon?.trim();
  if (override && !laDongGhiNguonCu(override)) return override;
  return `Nguồn: ${params.urlNguon.trim()}`;
}

/** Gộp dòng nguồn vào mô tả ngắn (một khối caption, không tách body). */
export function gopMoTaVoiDongNguon(
  moTa: string | null | undefined,
  dongNguon: string | null | undefined,
): string {
  const a = moTa?.trim() || "";
  const b = dongNguon?.trim() || "";
  if (!b) return a;
  if (!a) return b;
  if (a.includes(b)) return a;
  return `${a}\n\n${b}`;
}

/**
 * Khối mặc định (fallback khi chưa có ảnh CF):
 * 1. embed — URL nguồn (card link)
 * Caption / dòng Nguồn → `mo_ta` (caller dùng `gopMoTaVoiDongNguon`).
 */
export function taoKhoiBaiNguon(params: {
  moTa?: string | null;
  urlNguon: string;
  nenTang?: NenTangNguon;
  tenTacGiaNguon?: string | null;
  dongGhiNguon?: string | null;
}): Block[] {
  void params.moTa;
  void params.nenTang;
  void params.tenTacGiaNguon;
  void params.dongGhiNguon;
  const url = params.urlNguon.trim();
  return [
    {
      id: "b-0",
      loai: "embed",
      thu_tu: 0,
      config: { url },
    },
  ];
}

export type AnhAlbumNguon = {
  /** Cloudflare Images id (ưu tiên) hoặc URL https. */
  seed: string;
  width?: number | null;
  height?: number | null;
};

/**
 * Album ảnh (giống MediaCompose photo):
 * - mỗi ảnh = 1 block `imgs` layout full
 * - mô tả + dòng Nguồn → `mo_ta` (caller `gopMoTaVoiDongNguon`)
 * → resolvePostDisplayKind = album (media caption).
 *
 * `albumLayout`: preset feed (Behance → `stack` xếp dọc như trang gốc;
 * bỏ trống → justified mặc định khi gom grid).
 */
export function taoKhoiBaiAlbumNguon(params: {
  anh: AnhAlbumNguon[];
  moTa?: string | null;
  urlNguon: string;
  nenTang?: NenTangNguon;
  tenTacGiaNguon?: string | null;
  dongGhiNguon?: string | null;
  albumLayout?: "justified" | "masonry" | "columns2" | "square" | "stack" | null;
}): Block[] {
  void params.moTa;
  void params.urlNguon;
  void params.tenTacGiaNguon;
  void params.dongGhiNguon;
  const anh = params.anh.filter((a) => a.seed?.trim());
  if (!anh.length) {
    return taoKhoiBaiNguon(params);
  }

  const albumLayout = params.albumLayout
    ? params.albumLayout
    : params.nenTang === "behance"
      ? "stack"
      : null;

  const blocks: Block[] = [];
  let i = 0;

  for (const item of anh) {
    const seed = item.seed.trim();
    const cfg: Record<string, unknown> = {
      layout: "full",
      rounded: false,
      /* Seed bài curator (Behance/ArtStation/Pixiv) → album liền mạch: gap 0.
         User vẫn chỉnh riêng qua nút gap-toggle sau khi seed. */
      gap: 0,
      cap: "",
      imgs: [seed],
      albumGridCell: true,
    };
    if (albumLayout) cfg.albumLayout = albumLayout;
    if (item.width && item.width > 0) cfg.width = item.width;
    if (item.height && item.height > 0) cfg.height = item.height;
    blocks.push({
      id: `b-${i}`,
      loai: "imgs",
      thu_tu: i,
      config: cfg,
    });
    i += 1;
  }

  return blocks;
}

/**
 * Behance: giữ thứ tự module (chữ → ảnh → video embed…).
 * Dòng Nguồn → `mo_ta` (caller `gopMoTaVoiDongNguon`), không tách body.
 * Video (YouTube/Vimeo) → block `embed` tự nhúng.
 */
export function taoKhoiBaiBehanceNguon(params: {
  modules: Array<
    | { kind: "text"; text: string }
    | {
        kind: "image";
        seed: string;
        width?: number | null;
        height?: number | null;
      }
    | { kind: "video"; url: string }
  >;
  urlNguon: string;
  tenTacGiaNguon?: string | null;
  dongGhiNguon?: string | null;
}): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  let coMedia = false;

  for (const mod of params.modules) {
    if (mod.kind === "text") {
      const text = mod.text.trim();
      if (!text) continue;
      blocks.push({
        id: `b-${i}`,
        loai: "body",
        thu_tu: i,
        config: { html: text.slice(0, 8000) },
      });
      i += 1;
      continue;
    }
    if (mod.kind === "video") {
      const url = mod.url.trim();
      if (!url) continue;
      coMedia = true;
      blocks.push({
        id: `b-${i}`,
        loai: "embed",
        thu_tu: i,
        config: { url },
      });
      i += 1;
      continue;
    }
    const seed = mod.seed.trim();
    if (!seed) continue;
    coMedia = true;
    const cfg: Record<string, unknown> = {
      layout: "full",
      rounded: false,
      /* Seed Behance (module order) → album liền mạch: gap 0. */
      gap: 0,
      cap: "",
      imgs: [seed],
      albumGridCell: true,
      albumLayout: "stack",
    };
    if (mod.width && mod.width > 0) cfg.width = mod.width;
    if (mod.height && mod.height > 0) cfg.height = mod.height;
    blocks.push({
      id: `b-${i}`,
      loai: "imgs",
      thu_tu: i,
      config: cfg,
    });
    i += 1;
  }

  if (!coMedia) {
    return taoKhoiBaiNguon({
      moTa: params.modules
        .filter((m): m is { kind: "text"; text: string } => m.kind === "text")
        .map((m) => m.text)
        .join("\n\n"),
      urlNguon: params.urlNguon,
      nenTang: "behance",
      tenTacGiaNguon: params.tenTacGiaNguon,
      dongGhiNguon: params.dongGhiNguon,
    });
  }

  return blocks;
}
