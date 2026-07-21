import "server-only";

import {
  buildBunnyEmbedUrl,
  buildBunnyVideoThumbnailUrl,
} from "@/lib/bunny/embed";
import { shopLoaiHref } from "@/lib/shop/cua-hang-href";
import { getShopHienThi, shopImageUrl } from "@/lib/shop/settings";
import type {
  ShopStorefrontItem,
  ShopStorefrontMau,
  ShopStorefrontNhomCard,
  ShopStorefrontNhomDetail,
} from "@/lib/shop/types";
import { SHOP_STOREFRONT_KHAC_SLUG } from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const PUBLIC_CHE_DO = new Set(["public", "feature"]);

type SpRow = {
  id: string;
  ten: string;
  anh_id: string | null;
  phan_loai: string | null;
  phan_loai_2: string | null;
  id_nhom: string | null;
  dang_ban: boolean;
  noi_bat: boolean;
  tao_luc: string;
};

type NhomRow = {
  id: string;
  nhan: string;
  mo_ta: string | null;
};

type BtRow = {
  id: string;
  id_san_pham: string;
  nhan: string;
  so_luong_ton: number;
  anh_id: string | null;
};

type BgRow = {
  id: string;
  tien_te: string;
  tao_luc: string;
};

type DongRow = {
  id_bang_gia: string;
  id_bien_the: string;
  gia: number | string;
  gia_giam: number | string | null;
};

type HangRow = {
  id: string;
  id_cot_moc: string;
  id_bien_the: string;
  thu_tu: number;
};

/**
 * Catalog mặt tiền cửa hàng: mọi sản phẩm đang bán (`dang_ban`),
 * không phụ thuộc gắn bài kiosk. Feature (`noi_bat`) + phân loại 1 để UI layout.
 * Giá lấy từ bảng giá mới nhất còn dòng; `postHref` optional nếu có kiosk public.
 */
export async function listShopStorefrontItems(opts: {
  sellerId: string;
  ownerSlug: string;
  /** Chủ shop xem preview kể cả khi chưa công khai / tắt bán hàng. */
  asOwner?: boolean;
  limit?: number;
}): Promise<ShopStorefrontItem[]> {
  if (!opts.asOwner) {
    const publicVisible = await getShopHienThi(opts.sellerId);
    if (!publicVisible) return [];
  }
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 200);
  const admin = createServiceRoleClient();

  const { data: spRows, error: spErr } = await admin
    .from("shop_san_pham")
    .select(
      "id, ten, anh_id, phan_loai, phan_loai_2, id_nhom, dang_ban, noi_bat, tao_luc",
    )
    .eq("id_nguoi_dung", opts.sellerId)
    .eq("da_xoa", false)
    .eq("dang_ban", true)
    .order("noi_bat", { ascending: false })
    .order("tao_luc", { ascending: false })
    .limit(limit);
  if (spErr) {
    console.error("[shop] listShopStorefrontItems sp", spErr);
    return [];
  }
  const sps = (spRows ?? []) as SpRow[];
  if (sps.length === 0) return [];

  const nhomIds = [
    ...new Set(
      sps.map((s) => s.id_nhom).filter((id): id is string => Boolean(id)),
    ),
  ];
  const moTaByNhomId = new Map<string, string | null>();
  if (nhomIds.length > 0) {
    const { data: nhomRows } = await admin
      .from("shop_nhom")
      .select("id, nhan, mo_ta")
      .in("id", nhomIds)
      .eq("da_xoa", false);
    for (const n of (nhomRows ?? []) as NhomRow[]) {
      moTaByNhomId.set(n.id, n.mo_ta?.trim() || null);
    }
  }

  const spIds = sps.map((s) => s.id);
  const { data: btRows } = await admin
    .from("shop_bien_the")
    .select("id, id_san_pham, nhan, so_luong_ton, anh_id")
    .in("id_san_pham", spIds)
    .eq("da_xoa", false);
  const bts = (btRows ?? []) as BtRow[];
  const btBySp = new Map<string, BtRow[]>();
  for (const bt of bts) {
    const list = btBySp.get(bt.id_san_pham) ?? [];
    list.push(bt);
    btBySp.set(bt.id_san_pham, list);
  }

  const { data: bgRows } = await admin
    .from("shop_bang_gia")
    .select("id, tien_te, tao_luc")
    .eq("id_nguoi_dung", opts.sellerId)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false })
    .limit(50);
  const bangGias = (bgRows ?? []) as BgRow[];
  const giaByBt = new Map<
    string,
    {
      giaBan: number;
      giaGiam: number | null;
      giaHieuLuc: number;
      tienTe: string;
      bgRank: number;
    }
  >();
  if (bangGias.length > 0) {
    const bgIds = bangGias.map((b) => b.id);
    const bgRank = new Map(bangGias.map((b, i) => [b.id, i]));
    const bgTienTe = new Map(bangGias.map((b) => [b.id, b.tien_te || "VND"]));
    const { data: dongRows } = await admin
      .from("shop_bang_gia_dong")
      .select("id_bang_gia, id_bien_the, gia, gia_giam")
      .in("id_bang_gia", bgIds);
    for (const d of (dongRows ?? []) as DongRow[]) {
      const rank = bgRank.get(d.id_bang_gia);
      if (rank == null) continue;
      const prev = giaByBt.get(d.id_bien_the);
      if (prev && prev.bgRank <= rank) continue;
      const giaBan = Number(d.gia);
      const giaGiam = d.gia_giam == null ? null : Number(d.gia_giam);
      giaByBt.set(d.id_bien_the, {
        giaBan,
        giaGiam,
        giaHieuLuc: giaGiam != null ? giaGiam : giaBan,
        tienTe: bgTienTe.get(d.id_bang_gia) || "VND",
        bgRank: rank,
      });
    }
  }

  /* Optional: bài kiosk public gần nhất cho từng biến thể (giỏ + CTA). */
  const postByBt = new Map<
    string,
    { href: string; hangId: string; cotMocId: string }
  >();
  const btIds = bts.map((b) => b.id);
  if (btIds.length > 0) {
    const { data: hangRows } = await admin
      .from("shop_post_hang")
      .select("id, id_cot_moc, id_bien_the, thu_tu")
      .in("id_bien_the", btIds)
      .order("thu_tu", { ascending: true })
      .limit(400);
    const hangs = (hangRows ?? []) as HangRow[];
    if (hangs.length > 0) {
      const mocIds = [...new Set(hangs.map((h) => h.id_cot_moc))];
      const { data: mocRows } = await admin
        .from("content_cot_moc")
        .select("id, id_nguoi_dung, che_do_hien_thi")
        .in("id", mocIds)
        .eq("id_nguoi_dung", opts.sellerId);
      const mocOk = new Set(
        (
          (mocRows ?? []) as Array<{
            id: string;
            che_do_hien_thi: string | null;
          }>
        )
          .filter((m) =>
            opts.asOwner
              ? true
              : PUBLIC_CHE_DO.has(m.che_do_hien_thi ?? ""),
          )
          .map((m) => m.id),
      );

      const { data: thuocRows } = await admin
        .from("content_tac_pham_thuoc_moc")
        .select(
          "id_cot_moc, thu_tu, content_tac_pham:content_tac_pham!inner(id, slug)",
        )
        .in("id_cot_moc", [...mocOk])
        .order("thu_tu", { ascending: true });

      const slugByMoc = new Map<string, string>();
      for (const row of thuocRows ?? []) {
        const mocId = String(
          (row as { id_cot_moc?: string }).id_cot_moc ?? "",
        );
        if (!mocId || slugByMoc.has(mocId)) continue;
        const rawTp = (row as { content_tac_pham?: unknown }).content_tac_pham;
        const tp = Array.isArray(rawTp) ? rawTp[0] : rawTp;
        if (!tp || typeof tp !== "object") continue;
        const slug =
          typeof (tp as { slug?: unknown }).slug === "string"
            ? (tp as { slug: string }).slug.trim()
            : "";
        if (slug) slugByMoc.set(mocId, slug);
      }

      const ownerSlug = opts.ownerSlug.trim();
      for (const hang of hangs) {
        if (!mocOk.has(hang.id_cot_moc)) continue;
        if (postByBt.has(hang.id_bien_the)) continue;
        const slug = slugByMoc.get(hang.id_cot_moc);
        if (!slug) continue;
        postByBt.set(hang.id_bien_the, {
          hangId: hang.id,
          cotMocId: hang.id_cot_moc,
          href: `/${encodeURIComponent(ownerSlug)}/p/${encodeURIComponent(slug)}`,
        });
      }
    }
  }

  /* Tổng SL đã bán theo biến thể. */
  const soldByBienThe = new Map<string, number>();
  if (btIds.length > 0) {
    const { data: dongBan, error: soldErr } = await admin
      .from("shop_don_hang_dong")
      .select("id_bien_the, so_luong, shop_don_hang!inner(trang_thai)")
      .in("id_bien_the", btIds);
    if (soldErr) {
      console.error("[shop] listShopStorefrontItems sold", soldErr);
    } else {
      for (const row of (dongBan ?? []) as Array<{
        id_bien_the: string | null;
        so_luong: number;
        shop_don_hang:
          | { trang_thai: string }
          | { trang_thai: string }[]
          | null;
      }>) {
        if (!row.id_bien_the) continue;
        const don = Array.isArray(row.shop_don_hang)
          ? row.shop_don_hang[0]
          : row.shop_don_hang;
        if (!don) continue;
        if (
          don.trang_thai !== "cho_xac_nhan" &&
          don.trang_thai !== "da_nhan_tien" &&
          don.trang_thai !== "da_giao_tai_su_kien"
        ) {
          continue;
        }
        const qty = Math.max(0, Math.trunc(Number(row.so_luong) || 0));
        soldByBienThe.set(
          row.id_bien_the,
          (soldByBienThe.get(row.id_bien_the) ?? 0) + qty,
        );
      }
    }
  }

  const out: ShopStorefrontItem[] = [];
  for (const sp of sps) {
    const variants = btBySp.get(sp.id) ?? [];
    let pricedBt: BtRow | null = null;
    let giaHienThi: number | null = null;
    let giaGoc: number | null = null;
    let tienTe = "VND";
    let bestRank = Number.POSITIVE_INFINITY;
    for (const bt of variants) {
      const g = giaByBt.get(bt.id);
      if (!g) continue;
      const betterRank = g.bgRank < bestRank;
      const sameRankCheaper =
        g.bgRank === bestRank &&
        (giaHienThi == null || g.giaHieuLuc < giaHienThi);
      if (!betterRank && !sameRankCheaper) continue;
      bestRank = g.bgRank;
      giaHienThi = g.giaHieuLuc;
      giaGoc = g.giaGiam != null ? g.giaBan : null;
      tienTe = g.tienTe;
      pricedBt = bt;
    }

    const displayBt = pricedBt ?? variants[0] ?? null;
    const post = displayBt ? postByBt.get(displayBt.id) ?? null : null;
    const ton = displayBt?.so_luong_ton ?? 0;
    const nhan =
      variants.length === 1
        ? variants[0].nhan
        : variants.length > 1
          ? `${variants.length} biến thể`
          : null;

    out.push({
      sanPhamId: sp.id,
      idBienThe: displayBt?.id ?? null,
      hangId: post?.hangId ?? null,
      idCotMoc: post?.cotMocId ?? null,
      postHref: post?.href ?? null,
      tenSanPham: sp.ten,
      nhanBienThe: nhan,
      anhUrl: shopImageUrl(displayBt?.anh_id ?? sp.anh_id),
      giaHienThi,
      giaGoc,
      tienTe,
      soLuongTon: ton,
      soLuongBan: displayBt ? (soldByBienThe.get(displayBt.id) ?? 0) : 0,
      hetHang: !displayBt || ton <= 0,
      noiBat: sp.noi_bat === true,
      phanLoai: sp.phan_loai?.trim() || null,
      phanLoai2: sp.phan_loai_2?.trim() || null,
      idNhom: sp.id_nhom,
      phanLoaiMoTa: sp.id_nhom
        ? (moTaByNhomId.get(sp.id_nhom) ?? null)
        : null,
    });
  }
  return out;
}


/**
 * Card loại hàng (shop_nhom truc=1) cho mặt tiền — không còn list từng SP.
 * SP không gắn nhóm → một card «Khác».
 */
export async function listShopStorefrontNhomCards(opts: {
  sellerId: string;
  ownerSlug: string;
  asOwner?: boolean;
  limit?: number;
}): Promise<ShopStorefrontNhomCard[]> {
  const items = await listShopStorefrontItems(opts);
  if (items.length === 0) return [];

  const admin = createServiceRoleClient();
  const nhomIds = [
    ...new Set(
      items
        .map((i) => i.idNhom)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  type NhomMeta = {
    id: string;
    nhan: string;
    mo_ta: string | null;
    anh_id: string | null;
    thu_tu: number;
  };
  const nhomById = new Map<string, NhomMeta>();
  if (nhomIds.length > 0) {
    const { data } = await admin
      .from("shop_nhom")
      .select("id, nhan, mo_ta, anh_id, thu_tu")
      .in("id", nhomIds)
      .eq("da_xoa", false)
      .eq("truc", 1);
    for (const n of (data ?? []) as NhomMeta[]) {
      nhomById.set(n.id, n);
    }
  }

  type Agg = {
    id: string;
    nhan: string;
    moTa: string | null;
    /** Chỉ ảnh loại (`shop_nhom.anh_id`) — không fallback ảnh mẫu. */
    anhUrl: string | null;
    thuTu: number;
    soMau: number;
    giaTu: number | null;
    giaDen: number | null;
    tienTe: string;
    soLuongBan: number;
    anyInStock: boolean;
  };

  const byKey = new Map<string, Agg>();

  for (const item of items) {
    const key = item.idNhom && nhomById.has(item.idNhom)
      ? item.idNhom
      : SHOP_STOREFRONT_KHAC_SLUG;
    const nhom = key === SHOP_STOREFRONT_KHAC_SLUG ? null : nhomById.get(key);
    let agg = byKey.get(key);
    if (!agg) {
      agg = {
        id: key,
        nhan: nhom?.nhan ?? "Khác",
        moTa: nhom?.mo_ta?.trim() || null,
        anhUrl: shopImageUrl(nhom?.anh_id ?? null),
        thuTu: nhom?.thu_tu ?? 9999,
        soMau: 0,
        giaTu: null,
        giaDen: null,
        tienTe: item.tienTe || "VND",
        soLuongBan: 0,
        anyInStock: false,
      };
      byKey.set(key, agg);
    }
    agg.soMau += 1;
    agg.soLuongBan += item.soLuongBan;
    if (!item.hetHang) agg.anyInStock = true;
    if (item.giaHienThi != null) {
      agg.giaTu =
        agg.giaTu == null
          ? item.giaHienThi
          : Math.min(agg.giaTu, item.giaHienThi);
      agg.giaDen =
        agg.giaDen == null
          ? item.giaHienThi
          : Math.max(agg.giaDen, item.giaHienThi);
      agg.tienTe = item.tienTe || agg.tienTe;
    }
  }

  const ratingByNhom = new Map<string, { sum: number; tong: number }>();
  if (nhomIds.length > 0) {
    const { data: ratingRows } = await admin
      .from("shop_nhom_danh_gia")
      .select("id_nhom, diem")
      .in("id_nhom", nhomIds)
      .eq("da_xoa", false);
    for (const row of (ratingRows ?? []) as Array<{
      id_nhom: string;
      diem: number;
    }>) {
      const cur = ratingByNhom.get(row.id_nhom) ?? { sum: 0, tong: 0 };
      cur.sum += row.diem;
      cur.tong += 1;
      ratingByNhom.set(row.id_nhom, cur);
    }
  }

  return [...byKey.values()]
    .sort((a, b) => {
      if (a.id === SHOP_STOREFRONT_KHAC_SLUG) return 1;
      if (b.id === SHOP_STOREFRONT_KHAC_SLUG) return -1;
      if (a.thuTu !== b.thuTu) return a.thuTu - b.thuTu;
      return a.nhan.localeCompare(b.nhan, "vi");
    })
    .map((a) => {
      const rating = ratingByNhom.get(a.id);
      const diemTrungBinh =
        rating && rating.tong > 0
          ? Math.round((rating.sum / rating.tong) * 10) / 10
          : null;
      return {
        id: a.id,
        nhan: a.nhan,
        moTa: a.moTa,
        anhUrl: a.anhUrl,
        soMau: a.soMau,
        giaTu: a.giaTu,
        giaDen: a.giaDen,
        tienTe: a.tienTe,
        soLuongBan: a.soLuongBan,
        hetHang: !a.anyInStock,
        href: shopLoaiHref(opts.ownerSlug, a.id),
        diemTrungBinh,
        tongDanhGia: rating?.tong ?? 0,
      };
    });
}

async function buildMauFromItems(
  items: ShopStorefrontItem[],
): Promise<ShopStorefrontMau[]> {
  if (items.length === 0) return [];
  const admin = createServiceRoleClient();
  const spIds = items.map((i) => i.sanPhamId);
  const { data: btRows } = await admin
    .from("shop_bien_the")
    .select("id, id_san_pham, nhan, so_luong_ton, anh_id")
    .in("id_san_pham", spIds)
    .eq("da_xoa", false);
  const bts = (btRows ?? []) as Array<{
    id: string;
    id_san_pham: string;
    nhan: string;
    so_luong_ton: number;
    anh_id: string | null;
  }>;
  const btIds = bts.map((b) => b.id);

  const sellerIdFromItems = items[0];
  void sellerIdFromItems;

  const { data: bgRows } = await admin
    .from("shop_bang_gia")
    .select("id, tien_te, tao_luc, id_nguoi_dung")
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false })
    .limit(80);
  /* Filter bang gia by products' seller via san_pham */
  const { data: spOwnerRows } = await admin
    .from("shop_san_pham")
    .select("id, id_nguoi_dung, ten, anh_id")
    .in("id", spIds)
    .eq("da_xoa", false);
  const spMeta = new Map(
    (
      (spOwnerRows ?? []) as Array<{
        id: string;
        id_nguoi_dung: string;
        ten: string;
        anh_id: string | null;
      }>
    ).map((s) => [s.id, s]),
  );
  const sellerId = spMeta.get(spIds[0]!)?.id_nguoi_dung;
  const bangGias = (
    (bgRows ?? []) as Array<{
      id: string;
      tien_te: string;
      tao_luc: string;
      id_nguoi_dung: string;
    }>
  ).filter((b) => !sellerId || b.id_nguoi_dung === sellerId);

  const giaByBt = new Map<
    string,
    {
      giaBan: number;
      giaGiam: number | null;
      giaHieuLuc: number;
      tienTe: string;
      bgRank: number;
    }
  >();
  if (bangGias.length > 0 && btIds.length > 0) {
    const bgIds = bangGias.map((b) => b.id);
    const bgRank = new Map(bangGias.map((b, i) => [b.id, i]));
    const bgTienTe = new Map(bangGias.map((b) => [b.id, b.tien_te || "VND"]));
    const { data: dongRows } = await admin
      .from("shop_bang_gia_dong")
      .select("id_bang_gia, id_bien_the, gia, gia_giam")
      .in("id_bang_gia", bgIds)
      .in("id_bien_the", btIds);
    for (const d of (dongRows ?? []) as DongRow[]) {
      const rank = bgRank.get(d.id_bang_gia);
      if (rank == null) continue;
      const prev = giaByBt.get(d.id_bien_the);
      if (prev && prev.bgRank <= rank) continue;
      const giaBan = Number(d.gia);
      const giaGiam = d.gia_giam == null ? null : Number(d.gia_giam);
      giaByBt.set(d.id_bien_the, {
        giaBan,
        giaGiam,
        giaHieuLuc: giaGiam != null ? giaGiam : giaBan,
        tienTe: bgTienTe.get(d.id_bang_gia) || "VND",
        bgRank: rank,
      });
    }
  }

  const soldByBienThe = new Map<string, number>();
  if (btIds.length > 0) {
    const { data: dongBan } = await admin
      .from("shop_don_hang_dong")
      .select("id_bien_the, so_luong, shop_don_hang!inner(trang_thai)")
      .in("id_bien_the", btIds);
    for (const row of (dongBan ?? []) as Array<{
      id_bien_the: string | null;
      so_luong: number;
      shop_don_hang:
        | { trang_thai: string }
        | { trang_thai: string }[]
        | null;
    }>) {
      if (!row.id_bien_the) continue;
      const don = Array.isArray(row.shop_don_hang)
        ? row.shop_don_hang[0]
        : row.shop_don_hang;
      if (!don) continue;
      if (
        don.trang_thai !== "cho_xac_nhan" &&
        don.trang_thai !== "da_nhan_tien" &&
        don.trang_thai !== "da_giao_tai_su_kien"
      ) {
        continue;
      }
      const qty = Math.max(0, Math.trunc(Number(row.so_luong) || 0));
      soldByBienThe.set(
        row.id_bien_the,
        (soldByBienThe.get(row.id_bien_the) ?? 0) + qty,
      );
    }
  }

  const btBySp = new Map<string, typeof bts>();
  for (const bt of bts) {
    const list = btBySp.get(bt.id_san_pham) ?? [];
    list.push(bt);
    btBySp.set(bt.id_san_pham, list);
  }

  const mau: ShopStorefrontMau[] = [];
  for (const item of items) {
    const meta = spMeta.get(item.sanPhamId);
    const variants = btBySp.get(item.sanPhamId) ?? [];
    mau.push({
      sanPhamId: item.sanPhamId,
      ten: meta?.ten ?? item.tenSanPham,
      anhUrl: shopImageUrl(meta?.anh_id ?? null) ?? item.anhUrl,
      noiBat: item.noiBat === true,
      phanLoai: item.phanLoai,
      phanLoai2: item.phanLoai2,
      bienThe: variants.map((bt) => {
        const g = giaByBt.get(bt.id);
        const ton = bt.so_luong_ton;
        return {
          id: bt.id,
          nhan: bt.nhan,
          anhUrl: shopImageUrl(bt.anh_id),
          soLuongTon: ton,
          soLuongBan: soldByBienThe.get(bt.id) ?? 0,
          giaHienThi: g?.giaHieuLuc ?? null,
          giaGoc: g?.giaGiam != null ? g.giaBan : null,
          tienTe: g?.tienTe ?? item.tienTe,
          hetHang: ton <= 0,
        };
      }),
    });
  }
  /* Feature trước — giữ thứ tự tương đối trong từng nhóm. */
  mau.sort((a, b) => Number(b.noiBat) - Number(a.noiBat));
  return mau;
}

/** Chi tiết loại hàng + danh sách mẫu (san_pham + bien_the). */
export async function getShopStorefrontNhomDetail(opts: {
  sellerId: string;
  ownerSlug: string;
  nhomIdOrKhac: string;
  asOwner?: boolean;
}): Promise<ShopStorefrontNhomDetail | null> {
  const items = await listShopStorefrontItems({
    sellerId: opts.sellerId,
    ownerSlug: opts.ownerSlug,
    asOwner: opts.asOwner,
    limit: 200,
  });
  if (items.length === 0) return null;

  const isKhac = opts.nhomIdOrKhac === SHOP_STOREFRONT_KHAC_SLUG;

  let filtered: ShopStorefrontItem[];
  if (isKhac) {
    const linkedIds = [
      ...new Set(
        items
          .map((i) => i.idNhom)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const validNhom = new Set<string>();
    if (linkedIds.length > 0) {
      const admin = createServiceRoleClient();
      const { data } = await admin
        .from("shop_nhom")
        .select("id")
        .in("id", linkedIds)
        .eq("da_xoa", false)
        .eq("truc", 1)
        .eq("id_nguoi_dung", opts.sellerId);
      for (const n of (data ?? []) as Array<{ id: string }>) {
        validNhom.add(n.id);
      }
    }
    filtered = items.filter((i) => !i.idNhom || !validNhom.has(i.idNhom));
  } else {
    filtered = items.filter((i) => i.idNhom === opts.nhomIdOrKhac);
  }

  if (filtered.length === 0) return null;

  let giaTu: number | null = null;
  let giaDen: number | null = null;
  let tienTe = "VND";
  for (const item of filtered) {
    if (item.giaHienThi == null) continue;
    giaTu =
      giaTu == null ? item.giaHienThi : Math.min(giaTu, item.giaHienThi);
    giaDen =
      giaDen == null ? item.giaHienThi : Math.max(giaDen, item.giaHienThi);
    tienTe = item.tienTe || tienTe;
  }

  if (isKhac) {
    const mau = await buildMauFromItems(filtered);
    const cover =
      mau.find((m) => m.anhUrl)?.anhUrl ??
      mau.flatMap((m) => m.bienThe).find((b) => b.anhUrl)?.anhUrl ??
      null;
    return {
      id: SHOP_STOREFRONT_KHAC_SLUG,
      nhan: "Khác",
      moTa: null,
      anhUrl: cover,
      overlayAnhUrl: null,
      anhPhuUrls: [],
      videoPhuId: null,
      videoPhuEmbedUrl: null,
      videoPhuThumbUrl: null,
      giaMacDinh: null,
      giaTu,
      giaDen,
      tienTe,
      sellerId: opts.sellerId,
      ownerSlug: opts.ownerSlug,
      mau,
      isKhac: true,
    };
  }

  const admin = createServiceRoleClient();
  const { data: nhom } = await admin
    .from("shop_nhom")
    .select(
      "id, nhan, mo_ta, anh_id, overlay_anh_id, anh_phu_ids, video_phu_id, gia_mac_dinh, id_nguoi_dung, truc",
    )
    .eq("id", opts.nhomIdOrKhac)
    .eq("id_nguoi_dung", opts.sellerId)
    .eq("da_xoa", false)
    .maybeSingle<{
      id: string;
      nhan: string;
      mo_ta: string | null;
      anh_id: string | null;
      overlay_anh_id: string | null;
      anh_phu_ids: string[] | null;
      video_phu_id: string | null;
      gia_mac_dinh: number | string | null;
      id_nguoi_dung: string;
      truc: number;
    }>();
  if (!nhom || nhom.truc !== 1) return null;

  const mau = await buildMauFromItems(filtered);
  const coverFallback =
    mau.find((m) => m.anhUrl)?.anhUrl ??
    mau.flatMap((m) => m.bienThe).find((b) => b.anhUrl)?.anhUrl ??
    null;
  const anhPhuUrls = (nhom.anh_phu_ids ?? [])
    .filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
    .slice(0, 8)
    .map((id) => shopImageUrl(id))
    .filter((url): url is string => Boolean(url));
  const videoId = nhom.video_phu_id?.trim() || null;
  const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID?.trim();
  const giaMac =
    nhom.gia_mac_dinh == null || nhom.gia_mac_dinh === ""
      ? null
      : Number(nhom.gia_mac_dinh);
  const giaMacDinh =
    giaMac != null && Number.isFinite(giaMac) && giaMac >= 0 ? giaMac : null;

  return {
    id: nhom.id,
    nhan: nhom.nhan,
    moTa: nhom.mo_ta?.trim() || null,
    anhUrl: shopImageUrl(nhom.anh_id) ?? coverFallback,
    overlayAnhUrl: shopImageUrl(nhom.overlay_anh_id),
    anhPhuUrls,
    videoPhuId: videoId,
    videoPhuEmbedUrl:
      videoId && libraryId ? buildBunnyEmbedUrl(libraryId, videoId) : null,
    videoPhuThumbUrl: videoId ? buildBunnyVideoThumbnailUrl(videoId) : null,
    giaMacDinh,
    giaTu: giaMacDinh ?? giaTu,
    giaDen: giaMacDinh ?? giaDen,
    tienTe,
    sellerId: opts.sellerId,
    ownerSlug: opts.ownerSlug,
    mau,
    isKhac: false,
  };
}
