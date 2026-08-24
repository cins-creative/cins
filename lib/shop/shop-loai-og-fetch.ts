import "server-only";

import { cache } from "react";

import { shopSlugFromTen } from "@/lib/shop/cua-hang-href";
import { parseShopNhomMoTa } from "@/lib/shop/nhom-mo-ta";
import { shopImageUrl } from "@/lib/shop/settings";
import type { ShopLoaiOgContext } from "@/lib/shop/shop-loai-og-card";
import { SHOP_STOREFRONT_KHAC_SLUG } from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function isMissingSoMau(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || /so_mau/i.test(error.message ?? "");
}

function truncate(text: string | null | undefined, max: number): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function summaryFromMoTa(moTa: string | null | undefined): string | null {
  if (!moTa?.trim()) return null;
  const blocks = parseShopNhomMoTa(moTa);
  for (const b of blocks) {
    if (b.type === "p" && b.text.trim()) return truncate(b.text, 150);
    if ((b.type === "ul" || b.type === "ol") && b.items[0]?.trim()) {
      return truncate(b.items[0], 150);
    }
  }
  return truncate(moTa.replace(/\s+/g, " "), 150);
}

function formatGiaVnd(gia: number | null): string {
  if (gia == null || !Number.isFinite(gia) || gia < 0) return "Liên hệ";
  return `${Math.round(gia).toLocaleString("vi-VN")} ₫`;
}

/** Min giá gốc niêm yết của mẫu trong loại — khớp card storefront. */
async function minGiaGocNhom(
  admin: ReturnType<typeof createServiceRoleClient>,
  nhomId: string,
): Promise<number | null> {
  const { data: sps } = await admin
    .from("shop_san_pham")
    .select("id")
    .eq("id_nhom", nhomId)
    .eq("da_xoa", false)
    .eq("dang_ban", true)
    .limit(200);
  const spIds = (sps ?? []).map((s) => s.id as string);
  if (spIds.length === 0) return null;

  const { data: bts } = await admin
    .from("shop_bien_the")
    .select("id")
    .in("id_san_pham", spIds)
    .eq("da_xoa", false);
  const btIds = (bts ?? []).map((b) => b.id as string);
  if (btIds.length === 0) return null;

  const { data: dongs } = await admin
    .from("shop_bang_gia_dong")
    .select("gia")
    .in("id_bien_the", btIds);
  let min: number | null = null;
  for (const d of dongs ?? []) {
    const gia = Number(d.gia);
    if (!Number.isFinite(gia) || gia < 0) continue;
    min = min == null ? gia : Math.min(min, gia);
  }
  return min;
}

async function fallbackCoverFromCatalog(
  sellerId: string,
  nhomId: string | null,
): Promise<string | null> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("shop_san_pham")
    .select("anh_id")
    .eq("id_nguoi_dung", sellerId)
    .eq("da_xoa", false)
    .not("anh_id", "is", null)
    .limit(1);
  if (nhomId) {
    q = q.eq("id_nhom", nhomId);
  } else {
    q = q.is("id_nhom", null);
  }
  const { data } = await q.maybeSingle<{ anh_id: string | null }>();
  return shopImageUrl(data?.anh_id ?? null, "medium") ?? shopImageUrl(data?.anh_id);
}

async function countMau(sellerId: string, nhomId: string | null): Promise<number> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("shop_san_pham")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_dung", sellerId)
    .eq("da_xoa", false);
  if (nhomId) q = q.eq("id_nhom", nhomId);
  else q = q.is("id_nhom", null);
  const { count } = await q;
  return count ?? 0;
}

async function loadShopLoaiOgContext(
  ownerSlug: string,
  shopSlug: string,
  nhomId: string,
): Promise<ShopLoaiOgContext | null> {
  const slug = ownerSlug.trim();
  const shopSeg = shopSlug.trim();
  const nhom = nhomId.trim();
  if (!slug || !shopSeg || !nhom) return null;

  try {
    const admin = createServiceRoleClient();
    const { data: owner } = await admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id, ban_hang_bat, shop_hien_thi")
      .eq("slug", slug)
      .maybeSingle<{
        id: string;
        slug: string;
        ten_hien_thi: string | null;
        avatar_id: string | null;
        ban_hang_bat: boolean | null;
        shop_hien_thi: boolean | null;
      }>();
    if (!owner) return null;
    if (owner.ban_hang_bat !== true || owner.shop_hien_thi !== true) return null;

    const { data: shop } = await admin
      .from("shop_cua_hang")
      .select("ten, avatar_id")
      .eq("id_nguoi_dung", owner.id)
      .eq("da_xoa", false)
      .maybeSingle<{ ten: string | null; avatar_id: string | null }>();

    const resolvedShopSlug = shopSlugFromTen(shop?.ten, owner.slug);
    if (resolvedShopSlug !== shopSeg) return null;

    const shopTen = shop?.ten?.trim() || `${owner.ten_hien_thi?.trim() || owner.slug} — cửa hàng`;
    const shopAvatarUrl =
      shopImageUrl(shop?.avatar_id ?? null, "avatar") ??
      shopImageUrl(owner.avatar_id, "avatar");
    const sellerTen = owner.ten_hien_thi?.trim() || owner.slug;

    if (nhom === SHOP_STOREFRONT_KHAC_SLUG) {
      const coverUrl = await fallbackCoverFromCatalog(owner.id, null);
      const mau = await countMau(owner.id, null);
      return {
        title: "Khác",
        shopTen,
        shopAvatarUrl,
        sellerTen,
        coverUrl,
        summary: "Sản phẩm chưa gắn loại trên cửa hàng.",
        giaLabel: "Liên hệ",
        mauCountLabel: mau > 0 ? `${mau} mẫu` : null,
        ownerSlug: owner.slug,
        shopSlug: resolvedShopSlug,
        nhomId: SHOP_STOREFRONT_KHAC_SLUG,
      };
    }

    type NhomOgRow = {
      id: string;
      nhan: string;
      mo_ta: string | null;
      anh_id: string | null;
      so_mau?: number | null;
      truc: number;
    };

    let { data: row, error: nhomErr } = await admin
      .from("shop_nhom")
      .select("id, nhan, mo_ta, anh_id, so_mau, truc")
      .eq("id", nhom)
      .eq("id_nguoi_dung", owner.id)
      .eq("da_xoa", false)
      .maybeSingle<NhomOgRow>();

    if (isMissingSoMau(nhomErr)) {
      const fallback = await admin
        .from("shop_nhom")
        .select("id, nhan, mo_ta, anh_id, truc")
        .eq("id", nhom)
        .eq("id_nguoi_dung", owner.id)
        .eq("da_xoa", false)
        .maybeSingle<NhomOgRow>();
      row = fallback.data;
      nhomErr = fallback.error;
    }

    if (nhomErr || !row || row.truc !== 1) return null;

    const coverUrl =
      shopImageUrl(row.anh_id, "medium") ??
      shopImageUrl(row.anh_id) ??
      (await fallbackCoverFromCatalog(owner.id, row.id));

    const giaTu = await minGiaGocNhom(admin, row.id);
    const soMau =
      row.so_mau != null && Number.isFinite(Number(row.so_mau))
        ? Math.max(0, Math.round(Number(row.so_mau)))
        : await countMau(owner.id, row.id);

    return {
      title: row.nhan?.trim() || "Loại hàng",
      shopTen,
      shopAvatarUrl,
      sellerTen,
      coverUrl,
      summary: summaryFromMoTa(row.mo_ta),
      giaLabel: formatGiaVnd(giaTu),
      mauCountLabel: soMau > 0 ? `${soMau} mẫu` : null,
      ownerSlug: owner.slug,
      shopSlug: resolvedShopSlug,
      nhomId: row.id,
    };
  } catch {
    return null;
  }
}

/** OG context nhẹ cho trang chi tiết loại hàng. */
export const fetchShopLoaiOgContext = cache(loadShopLoaiOgContext);
