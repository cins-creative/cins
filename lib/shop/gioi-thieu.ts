import type { ArticleTagRef } from "@/lib/editor/article-tag";
import { IMG_SLOT_GAP_DEFAULT } from "@/lib/editor/image-layout";
import type { Block as ServerBlock } from "@/lib/editor/types";
import type { ComposePrefillDraft } from "@/lib/journey/compose-types";
import { normalizeShopNhomMoTaInput } from "@/lib/shop/nhom-mo-ta";
import type {
  ShopBangGia,
  ShopNhom,
  ShopPostHangItem,
  ShopSanPham,
} from "@/lib/shop/types";
import {
  SHOP_GIOI_THIEU_ANH_MAX,
  SHOP_POST_HANG_MAX,
  shopGiaHieuLuc,
} from "@/lib/shop/types";
import { swapCfImageVariant } from "@/lib/cloudflare/cf-variant-url";

/**
 * @deprecated Cooldown đã gỡ — luôn trả chuỗi rỗng.
 */
export function formatGioiThieuCooldownHint(_remainingMs: number): string {
  return "";
}

/** Scope draft compose cho một loại hàng — không đè nháp album thường. */
export function shopGioiThieuDraftScope(nhomId: string): string {
  return `shop-nhom:${nhomId.trim()}`;
}

/**
 * Ảnh (imageId) của loại hàng — chỉ ảnh chính + ảnh phụ loại.
 * Bỏ video · bỏ ảnh mẫu / biến thể · dedupe · giữ thứ tự.
 */
export function thuThapAnhLoaiHang(input: {
  nhom: ShopNhom;
  /** @deprecated Không còn gom ảnh mẫu — giữ tham số để caller cũ không vỡ. */
  mau?: ShopSanPham[];
  /** @deprecated Không còn dùng. */
  gomAnhBienThe?: boolean;
  max?: number;
}): string[] {
  void input.mau;
  void input.gomAnhBienThe;
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
    moTa: normalizeShopNhomMoTaInput(input.nhom.moTa ?? "").trim(),
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

function resolveNhomGiaMacDinh(
  nhomGiaById: Map<string, number> | Record<string, number> | undefined,
  idNhom: string | null | undefined,
): number | null {
  if (!idNhom) return null;
  if (nhomGiaById instanceof Map) {
    return nhomGiaById.get(idNhom) ?? null;
  }
  if (nhomGiaById && typeof nhomGiaById === "object") {
    const v = nhomGiaById[idNhom];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  return null;
}

export type GioiThieuKioskPick = {
  idBienThe: string;
  idBangGia: string;
  thuTu: number;
  hang: ShopPostHangItem;
};

export type GioiThieuKioskStats = {
  skippedNgungBan: number;
  skippedHetHang: number;
  skippedThieuGia: number;
  biCat: number;
};

/**
 * Chọn biến thể gắn kiosk — bỏ ngừng bán / hết hàng / thiếu giá; cắt SHOP_POST_HANG_MAX.
 * Trả cả `ShopPostHangItem` để preview compose trước khi publish.
 */
export function chonBienTheChoKioskChiTiet(input: {
  mau: ShopSanPham[];
  bangGia: ShopBangGia;
  nhomGiaById?: Map<string, number> | Record<string, number>;
  max?: number;
}): { picks: GioiThieuKioskPick[]; stats: GioiThieuKioskStats } {
  const max = input.max ?? SHOP_POST_HANG_MAX;
  const dongByBt = new Map(
    input.bangGia.dong.map((d) => [d.idBienThe, d] as const),
  );
  const tienTe = input.bangGia.tienTe?.trim() || "VND";

  let skippedNgungBan = 0;
  let skippedHetHang = 0;
  let skippedThieuGia = 0;
  const eligible: GioiThieuKioskPick["hang"][] = [];

  for (const p of input.mau) {
    if (p.dangBan === false) {
      skippedNgungBan += Math.max(1, p.bienThe.length);
      continue;
    }
    for (const bt of p.bienThe) {
      const ton = Math.max(0, bt.soLuongTon ?? 0);
      if (ton <= 0) {
        skippedHetHang += 1;
        continue;
      }
      const dong = dongByBt.get(bt.id);
      const giaNhom = resolveNhomGiaMacDinh(input.nhomGiaById, p.idNhom);
      const gia =
        dong != null
          ? shopGiaHieuLuc(dong)
          : giaNhom != null
            ? giaNhom
            : null;
      if (gia == null || !Number.isFinite(gia) || gia < 0) {
        skippedThieuGia += 1;
        continue;
      }
      eligible.push({
        id: `preview:${bt.id}`,
        idBienThe: bt.id,
        idSanPham: p.id,
        tenSanPham: p.ten,
        nhanBienThe: bt.nhan?.trim() || "Mặc định",
        phanLoai: p.phanLoai,
        phanLoai2: p.phanLoai2 ?? null,
        anhUrl: bt.anhUrl ?? p.anhUrl,
        soLuongTon: ton,
        soLuongBan: 0,
        giaHienThi: gia,
        tienTe,
        idBangGia: input.bangGia.id,
        thuTu: eligible.length,
        hetHang: false,
      });
    }
  }

  const picked = eligible.slice(0, max);
  return {
    picks: picked.map((hang, thuTu) => ({
      idBienThe: hang.idBienThe,
      idBangGia: input.bangGia.id,
      thuTu,
      hang: { ...hang, thuTu },
    })),
    stats: {
      skippedNgungBan,
      skippedHetHang,
      skippedThieuGia,
      biCat: Math.max(0, eligible.length - picked.length),
    },
  };
}

/**
 * Biến thể để gắn kiosk — bỏ mẫu ngừng bán / hết hàng / thiếu giá;
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
  const { picks, stats } = chonBienTheChoKioskChiTiet(input);
  return {
    items: picks.map((p) => ({
      idBienThe: p.idBienThe,
      idBangGia: p.idBangGia,
      thuTu: p.thuTu,
    })),
    biCat: stats.biCat,
  };
}

/** Cảnh báo nhẹ trên hub loại hàng (không cần list mẫu đầy đủ). */
export type NhomGioiThieuCanhBao =
  | "thieu_anh"
  | "chua_co_mau"
  | "chua_co_gia";

export function nhomGioiThieuCanhBao(nhom: ShopNhom): NhomGioiThieuCanhBao[] {
  const out: NhomGioiThieuCanhBao[] = [];
  const hasAnh =
    Boolean(nhom.anhId?.trim()) || (nhom.anhPhuIds?.length ?? 0) > 0;
  if (!hasAnh) out.push("thieu_anh");
  if ((nhom.soMau ?? 0) <= 0) out.push("chua_co_mau");
  if (nhom.giaMacDinh == null) out.push("chua_co_gia");
  return out;
}

export function labelNhomGioiThieuCanhBao(
  code: NhomGioiThieuCanhBao,
): string {
  switch (code) {
    case "thieu_anh":
      return "Thiếu ảnh loại";
    case "chua_co_mau":
      return "Chưa có mẫu";
    case "chua_co_gia":
      return "Chưa có giá mặc định";
  }
}

export type GioiThieuKioskReady =
  | {
      ok: true;
      items: ShopPostHangItem[];
      attach: Array<{ idBienThe: string; idBangGia: string; thuTu: number }>;
      stats: GioiThieuKioskStats;
      hint: string | null;
    }
  | {
      ok: false;
      reason:
        | "no_bang_gia"
        | "no_mau"
        | "no_eligible";
      message: string;
      items: [];
      attach: [];
      stats: GioiThieuKioskStats;
      hint: string;
    };

function emptyStats(): GioiThieuKioskStats {
  return {
    skippedNgungBan: 0,
    skippedHetHang: 0,
    skippedThieuGia: 0,
    biCat: 0,
  };
}

function formatKioskSkipHint(stats: GioiThieuKioskStats): string | null {
  const bits: string[] = [];
  if (stats.skippedHetHang > 0) {
    bits.push(`${stats.skippedHetHang} hết hàng (không hiện)`);
  }
  if (stats.skippedNgungBan > 0) {
    bits.push(`${stats.skippedNgungBan} ngừng bán`);
  }
  if (stats.skippedThieuGia > 0) {
    bits.push(`${stats.skippedThieuGia} thiếu giá`);
  }
  if (stats.biCat > 0) {
    bits.push(`cắt còn ${SHOP_POST_HANG_MAX} (bỏ ${stats.biCat})`);
  }
  return bits.length > 0 ? bits.join(" · ") : null;
}

/** Đánh giá trước khi mở/đăng «Giới thiệu» — dùng cảnh báo Kho + preview kiosk. */
export function danhGiaGioiThieuKiosk(input: {
  mau: ShopSanPham[];
  bangGia: ShopBangGia | null;
  nhomGiaById?: Map<string, number> | Record<string, number>;
  max?: number;
}): GioiThieuKioskReady {
  if (!input.bangGia) {
    return {
      ok: false,
      reason: "no_bang_gia",
      message: "Chưa có bảng giá — bài đăng được nhưng không gắn hàng bán.",
      items: [],
      attach: [],
      stats: emptyStats(),
      hint: "Tạo bảng giá để hiện ticker hàng bán trên bài.",
    };
  }
  if (input.mau.length === 0) {
    return {
      ok: false,
      reason: "no_mau",
      message: "Loại hàng chưa có mẫu — không gắn được hàng bán.",
      items: [],
      attach: [],
      stats: emptyStats(),
      hint: "Thêm mẫu đang bán có tồn kho trước khi giới thiệu.",
    };
  }
  const { picks, stats } = chonBienTheChoKioskChiTiet({
    mau: input.mau,
    bangGia: input.bangGia,
    nhomGiaById: input.nhomGiaById,
    max: input.max,
  });
  const skipHint = formatKioskSkipHint(stats);
  if (picks.length === 0) {
    let message =
      "Chưa gắn được hàng (thiếu giá, hết hàng hoặc mẫu ngừng bán).";
    if (stats.skippedHetHang > 0 && stats.skippedThieuGia === 0) {
      message = "Mọi mẫu đang hết hàng — ticker hàng bán sẽ không hiện.";
    } else if (stats.skippedThieuGia > 0 && stats.skippedHetHang === 0) {
      message = "Mẫu còn hàng nhưng thiếu giá — gắn bảng giá hoặc giá mặc định.";
    }
    return {
      ok: false,
      reason: "no_eligible",
      message,
      items: [],
      attach: [],
      stats,
      hint: skipHint ?? message,
    };
  }
  return {
    ok: true,
    items: picks.map((p) => p.hang),
    attach: picks.map((p) => ({
      idBienThe: p.idBienThe,
      idBangGia: p.idBangGia,
      thuTu: p.thuTu,
    })),
    stats,
    hint: skipHint,
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

/** Map imageId → URL từ nhom (ảnh chính + ảnh phụ) — để đo kích thước. */
export function mapAnhUrlLoaiHang(input: {
  nhom: ShopNhom;
  /** @deprecated Không còn map ảnh mẫu. */
  mau?: ShopSanPham[];
  imageIds: string[];
}): Record<string, string | null> {
  void input.mau;
  const map: Record<string, string | null> = {};
  if (input.nhom.anhId) map[input.nhom.anhId] = input.nhom.anhUrl;
  const phuIds = input.nhom.anhPhuIds ?? [];
  const phuUrls = input.nhom.anhPhuUrls ?? [];
  for (let i = 0; i < phuIds.length; i++) {
    map[phuIds[i]!] = phuUrls[i] ?? null;
  }
  const out: Record<string, string | null> = {};
  for (const id of input.imageIds) out[id] = map[id] ?? null;
  return out;
}
