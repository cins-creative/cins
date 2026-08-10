import type { ArticleTagRef } from "@/lib/editor/article-tag";
import { IMG_SLOT_GAP_DEFAULT } from "@/lib/editor/image-layout";
import type { Block as ServerBlock } from "@/lib/editor/types";
import type { ComposePrefillDraft } from "@/lib/journey/compose-types";
import type { ShopBangGia, ShopNhom, ShopSanPham } from "@/lib/shop/types";
import {
  SHOP_GIOI_THIEU_ANH_MAX,
  SHOP_POST_HANG_MAX,
} from "@/lib/shop/types";
import { swapCfImageVariant } from "@/lib/cloudflare/cf-variant-url";

/** Hint nút khi còn trong cooldown 3 ngày. */
export function formatGioiThieuCooldownHint(remainingMs: number): string {
  if (remainingMs <= 0) return "";
  const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  if (days >= 2) {
    return `Còn ${days} ngày nữa mới giới thiệu lại được`;
  }
  const hours = Math.ceil(remainingMs / (60 * 60 * 1000));
  if (hours >= 2) {
    return `Còn ${hours} giờ nữa mới giới thiệu lại được`;
  }
  const mins = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
  return `Còn ${mins} phút nữa mới giới thiệu lại được`;
}

/** Scope draft compose cho một loại hàng — không đè nháp album thường. */
export function shopGioiThieuDraftScope(nhomId: string): string {
  return `shop-nhom:${nhomId.trim()}`;
}

/**
 * Ảnh (imageId) của loại hàng — chỉ ảnh, bỏ video, dedupe, giữ thứ tự:
 * ảnh chính → ảnh phụ loại → ảnh mẫu.
 */
export function thuThapAnhLoaiHang(input: {
  nhom: ShopNhom;
  mau: ShopSanPham[];
  gomAnhBienThe?: boolean;
  max?: number;
}): string[] {
  const max = input.max ?? SHOP_GIOI_THIEU_ANH_MAX;
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (id: string | null | undefined) => {
    const t = id?.trim();
    if (!t || seen.has(t) || out.length >= max) return;
    seen.add(t);
    out.push(t);
  };

  push(input.nhom.anhId);
  for (const id of input.nhom.anhPhuIds ?? []) push(id);

  for (const p of input.mau) {
    if (out.length >= max) break;
    push(p.anhId);
    if (input.gomAnhBienThe) {
      for (const bt of p.bienThe) push(bt.anhId);
    }
  }
  return out;
}

function fandomToTagRef(f: ShopNhom["fandoms"][number]): ArticleTagRef {
  return {
    id: f.id,
    slug: f.slug,
    tieu_de: f.ten,
    loai_bai_viet: "fandom",
    da_verify: f.daVerify,
  };
}

/** Prefill nháp compose = album ảnh + tiêu đề + mô tả + tag fandom. */
export function buildPrefillGioiThieu(input: {
  nhom: ShopNhom;
  imageIds: string[];
  kichThuoc?: Record<string, { width: number; height: number }>;
  gomTagFandom?: boolean;
}): ComposePrefillDraft {
  const gomTag = input.gomTagFandom !== false;
  const blocks: ServerBlock[] = input.imageIds.map((id, i) => {
    const size = input.kichThuoc?.[id];
    return {
      id: `pref-img-${i}`,
      loai: "imgs" as const,
      thu_tu: i,
      config: {
        layout: "full",
        rounded: false,
        gap: IMG_SLOT_GAP_DEFAULT,
        cap: "",
        imgs: [id],
        albumGridCell: true,
        albumLayout: "justified",
        ...(size
          ? { width: size.width, height: size.height }
          : {}),
      },
    };
  });

  return {
    tieuDe: input.nhom.nhan.trim() || "Giới thiệu sản phẩm",
    moTa: input.nhom.moTa?.trim() ?? "",
    coverSeed: input.nhom.anhId?.trim() || input.imageIds[0] || null,
    albumGridCompose: true,
    visibility: "public",
    tags: gomTag
      ? (input.nhom.fandoms ?? []).map(fandomToTagRef)
      : [],
    blocks,
    showCoverInPost: false,
  };
}

/**
 * Biến thể để gắn kiosk — bỏ mẫu ngừng bán / thiếu giá trong bảng;
 * cắt tại SHOP_POST_HANG_MAX.
 */
export function chonBienTheChoKiosk(input: {
  mau: ShopSanPham[];
  bangGia: ShopBangGia;
  /** Map id_nhom → giaMacDinh — fallback khi bảng thiếu dòng. */
  nhomGiaById?: Map<string, number> | Record<string, number>;
  max?: number;
}): {
  items: Array<{ idBienThe: string; idBangGia: string; thuTu: number }>;
  biCat: number;
} {
  const max = input.max ?? SHOP_POST_HANG_MAX;
  const dongByBt = new Map(
    input.bangGia.dong.map((d) => [d.idBienThe, d] as const),
  );
  const giaNhom = (idNhom: string | null | undefined): number | null => {
    if (!idNhom) return null;
    if (input.nhomGiaById instanceof Map) {
      return input.nhomGiaById.get(idNhom) ?? null;
    }
    if (input.nhomGiaById && typeof input.nhomGiaById === "object") {
      const v = input.nhomGiaById[idNhom];
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    }
    return null;
  };

  const eligible: string[] = [];
  for (const p of input.mau) {
    if (p.dangBan === false) continue;
    for (const bt of p.bienThe) {
      if (dongByBt.has(bt.id) || giaNhom(p.idNhom) != null) {
        eligible.push(bt.id);
      }
    }
  }

  const picked = eligible.slice(0, max);
  return {
    items: picked.map((idBienThe, thuTu) => ({
      idBienThe,
      idBangGia: input.bangGia.id,
      thuTu,
    })),
    biCat: Math.max(0, eligible.length - picked.length),
  };
}

/** Đo w/h ảnh CF (variant thumbnail) — timeout mềm, bỏ ảnh lỗi. */
export async function doKichThuocAnh(
  imageIds: string[],
  urlsById: Record<string, string | null | undefined>,
  timeoutMs = 1500,
): Promise<Record<string, { width: number; height: number }>> {
  if (typeof window === "undefined" || imageIds.length === 0) return {};
  const out: Record<string, { width: number; height: number }> = {};

  await Promise.allSettled(
    imageIds.map(
      (id) =>
        new Promise<void>((resolve) => {
          const raw = urlsById[id]?.trim();
          if (!raw) {
            resolve();
            return;
          }
          const src = swapCfImageVariant(raw, "thumbnail") || raw;
          const img = new Image();
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            resolve();
          };
          const timer = window.setTimeout(finish, timeoutMs);
          img.onload = () => {
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              out[id] = {
                width: img.naturalWidth,
                height: img.naturalHeight,
              };
            }
            window.clearTimeout(timer);
            finish();
          };
          img.onerror = () => {
            window.clearTimeout(timer);
            finish();
          };
          img.src = src;
        }),
    ),
  );
  return out;
}

/** Map imageId → URL từ nhom + mẫu (để đo kích thước). */
export function mapAnhUrlLoaiHang(input: {
  nhom: ShopNhom;
  mau: ShopSanPham[];
  imageIds: string[];
}): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  if (input.nhom.anhId) map[input.nhom.anhId] = input.nhom.anhUrl;
  const phuIds = input.nhom.anhPhuIds ?? [];
  const phuUrls = input.nhom.anhPhuUrls ?? [];
  for (let i = 0; i < phuIds.length; i++) {
    map[phuIds[i]!] = phuUrls[i] ?? null;
  }
  for (const p of input.mau) {
    if (p.anhId) map[p.anhId] = p.anhUrl;
  }
  const out: Record<string, string | null> = {};
  for (const id of input.imageIds) out[id] = map[id] ?? null;
  return out;
}
