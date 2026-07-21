import "server-only";

import { getShopHienThi, shopImageUrl } from "@/lib/shop/settings";
import type { ShopStorefrontItem } from "@/lib/shop/types";
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
