import "server-only";

import { MAX_SHOP_CUSTOMER_TAGS } from "@/lib/chat/constants";
import { pickRoomTagColor, slugifyTagName } from "@/lib/chat/tag-colors";
import type {
  ShopKhachHang,
  ShopKhachHangTag,
} from "@/lib/shop/khach-hang-types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type { ShopKhachHang, ShopKhachHangTag };

const DEFAULT_TAGS: Array<{
  ten: string;
  slug: string;
  mau: string;
  thuTu: number;
}> = [
  { ten: "Đã chuyển tiền", slug: "da-chuyen-tien", mau: "#15803d", thuTu: 0 },
  {
    ten: "Chưa chuyển tiền",
    slug: "chua-chuyen-tien",
    mau: "#b45309",
    thuTu: 1,
  },
  { ten: "Ship", slug: "ship", mau: "#1f74c9", thuTu: 2 },
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!/^#([0-9a-fA-F]{6})$/.test(raw)) return null;
  return raw.toLowerCase();
}

type TagRow = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thu_tu: number;
  mac_dinh: boolean;
};

function mapTag(row: TagRow): ShopKhachHangTag {
  return {
    id: row.id,
    ten: row.ten,
    slug: row.slug,
    mau: row.mau,
    thuTu: row.thu_tu,
    macDinh: row.mac_dinh === true,
  };
}

async function uniqueTagSlug(
  sellerId: string,
  baseSlug: string,
): Promise<string> {
  const admin = createServiceRoleClient();
  let candidate = baseSlug.slice(0, 48);
  let n = 2;
  while (n < 100) {
    const { data } = await admin
      .from("shop_the_khach")
      .select("id")
      .eq("id_nguoi_ban", sellerId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    const suffix = `-${n}`;
    candidate = baseSlug.slice(0, 48 - suffix.length) + suffix;
    n += 1;
  }
  return `${baseSlug.slice(0, 40)}-${Date.now().toString(36)}`;
}

/**
 * Seed 3 thẻ mặc định nếu seller chưa có thẻ nào.
 * Gọi từ write path (`setBanHangEnabled`) — KHÔNG gọi ở read path.
 */
export async function seedShopKhachHangTagsIfEmpty(
  sellerId: string,
): Promise<void> {
  if (!isUuid(sellerId)) return;
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("shop_the_khach")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_ban", sellerId);
  if ((count ?? 0) > 0) return;

  const { error } = await admin.from("shop_the_khach").insert(
    DEFAULT_TAGS.map((t) => ({
      id_nguoi_ban: sellerId,
      ten: t.ten,
      slug: t.slug,
      mau: t.mau,
      thu_tu: t.thuTu,
      mac_dinh: true,
    })),
  );
  if (error) {
    console.error("[shop] seedShopKhachHangTagsIfEmpty", error);
  }
}

export async function listShopKhachHangTags(
  sellerId: string,
): Promise<ShopKhachHangTag[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_the_khach")
    .select("id, ten, slug, mau, thu_tu, mac_dinh")
    .eq("id_nguoi_ban", sellerId)
    .order("thu_tu", { ascending: true })
    .order("tao_luc", { ascending: true });
  if (error) {
    console.error("[shop] listShopKhachHangTags", error);
    return [];
  }
  return (data ?? []).map((row) => mapTag(row as TagRow));
}

export async function createShopKhachHangTag(
  sellerId: string,
  ten: string,
  mau?: string | null,
): Promise<{ ok: true; tag: ShopKhachHangTag } | { ok: false; error: string }> {
  const name = ten.trim();
  if (!name) return { ok: false, error: "Nhập tên thẻ." };
  if (name.length > 40) return { ok: false, error: "Tên thẻ tối đa 40 ký tự." };

  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("shop_the_khach")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_ban", sellerId);

  if ((count ?? 0) >= MAX_SHOP_CUSTOMER_TAGS) {
    return {
      ok: false,
      error: `Tối đa ${MAX_SHOP_CUSTOMER_TAGS} thẻ.`,
    };
  }

  const slug = await uniqueTagSlug(sellerId, slugifyTagName(name));
  let color = normalizeHex(mau);
  if (!color) {
    const { data: existing } = await admin
      .from("shop_the_khach")
      .select("mau")
      .eq("id_nguoi_ban", sellerId);
    color = pickRoomTagColor((existing ?? []).map((row) => row.mau));
  }

  const { data, error } = await admin
    .from("shop_the_khach")
    .insert({
      id_nguoi_ban: sellerId,
      ten: name,
      slug,
      mau: color,
      thu_tu: count ?? 0,
      mac_dinh: false,
    })
    .select("id, ten, slug, mau, thu_tu, mac_dinh")
    .single();

  if (error || !data) {
    console.error("[shop] createShopKhachHangTag", error);
    return { ok: false, error: "Không tạo được thẻ." };
  }
  return { ok: true, tag: mapTag(data as TagRow) };
}

export async function updateShopKhachHangTag(
  sellerId: string,
  tagId: string,
  patch: { ten?: string; mau?: string | null },
): Promise<{ ok: true; tag: ShopKhachHangTag } | { ok: false; error: string }> {
  if (!isUuid(tagId)) return { ok: false, error: "Thẻ không hợp lệ." };

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("shop_the_khach")
    .select("id, ten, slug, mau, thu_tu, mac_dinh")
    .eq("id", tagId)
    .eq("id_nguoi_ban", sellerId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Không tìm thấy thẻ." };

  const updates: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };

  if (typeof patch.ten === "string") {
    const name = patch.ten.trim();
    if (!name) return { ok: false, error: "Nhập tên thẻ." };
    if (name.length > 40) return { ok: false, error: "Tên thẻ tối đa 40 ký tự." };
    updates.ten = name;
    if (name !== existing.ten) {
      updates.slug = await uniqueTagSlug(sellerId, slugifyTagName(name));
    }
  }

  if (patch.mau !== undefined) {
    const color = normalizeHex(patch.mau);
    if (patch.mau && !color) {
      return { ok: false, error: "Màu không hợp lệ." };
    }
    updates.mau = color;
  }

  const { data, error } = await admin
    .from("shop_the_khach")
    .update(updates)
    .eq("id", tagId)
    .eq("id_nguoi_ban", sellerId)
    .select("id, ten, slug, mau, thu_tu, mac_dinh")
    .single();

  if (error || !data) {
    console.error("[shop] updateShopKhachHangTag", error);
    return { ok: false, error: "Không cập nhật được thẻ." };
  }
  return { ok: true, tag: mapTag(data as TagRow) };
}

export async function deleteShopKhachHangTag(
  sellerId: string,
  tagId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isUuid(tagId)) return { ok: false, error: "Thẻ không hợp lệ." };

  const admin = createServiceRoleClient();
  const { data: tag } = await admin
    .from("shop_the_khach")
    .select("id")
    .eq("id", tagId)
    .eq("id_nguoi_ban", sellerId)
    .maybeSingle();

  if (!tag) return { ok: false, error: "Không tìm thấy thẻ." };

  const { error } = await admin
    .from("shop_the_khach")
    .delete()
    .eq("id", tagId)
    .eq("id_nguoi_ban", sellerId);

  if (error) {
    console.error("[shop] deleteShopKhachHangTag", error);
    return { ok: false, error: "Không xóa được thẻ." };
  }
  return { ok: true };
}

/** Buyer có ≥1 đơn (không phải nháp) với seller? */
export async function isShopCustomer(
  sellerId: string,
  buyerId: string,
): Promise<boolean> {
  if (!isUuid(sellerId) || !isUuid(buyerId) || sellerId === buyerId) {
    return false;
  }
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("shop_don_hang")
    .select("id")
    .eq("id_nguoi_ban", sellerId)
    .eq("id_nguoi_mua", buyerId)
    .neq("trang_thai", "nhap")
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Map buyerId → thông tin khách của seller.
 * Loại đơn `nhap` và tự-mua (`id_nguoi_mua = seller`).
 */
export async function listShopKhachHang(
  sellerId: string,
): Promise<Map<string, ShopKhachHang>> {
  const result = new Map<string, ShopKhachHang>();
  if (!isUuid(sellerId)) return result;

  const admin = createServiceRoleClient();
  const { data: orders, error } = await admin
    .from("shop_don_hang")
    .select("id_nguoi_mua, trang_thai, tao_luc")
    .eq("id_nguoi_ban", sellerId)
    .neq("trang_thai", "nhap");

  if (error) {
    console.error("[shop] listShopKhachHang orders", error);
    return result;
  }

  type Agg = {
    soDon: number;
    donGanNhatLuc: string;
    soDonHuy: number;
  };
  const agg = new Map<string, Agg>();

  for (const row of orders ?? []) {
    const buyerId = row.id_nguoi_mua as string;
    if (!buyerId || buyerId === sellerId) continue;
    const taoLuc =
      typeof row.tao_luc === "string" ? row.tao_luc : String(row.tao_luc);
    const cur = agg.get(buyerId);
    if (!cur) {
      agg.set(buyerId, {
        soDon: 1,
        donGanNhatLuc: taoLuc,
        soDonHuy: row.trang_thai === "huy" ? 1 : 0,
      });
      continue;
    }
    cur.soDon += 1;
    if (row.trang_thai === "huy") cur.soDonHuy += 1;
    if (new Date(taoLuc).getTime() > new Date(cur.donGanNhatLuc).getTime()) {
      cur.donGanNhatLuc = taoLuc;
    }
  }

  if (agg.size === 0) return result;

  const buyerIds = [...agg.keys()];
  const tagsByBuyer = new Map<string, string[]>();

  // Batch in chunks of 200 to avoid huge IN lists.
  for (let i = 0; i < buyerIds.length; i += 200) {
    const chunk = buyerIds.slice(i, i + 200);
    const { data: gans, error: ganErr } = await admin
      .from("shop_the_khach_gan")
      .select("id_nguoi_mua, id_the")
      .eq("id_nguoi_ban", sellerId)
      .in("id_nguoi_mua", chunk);
    if (ganErr) {
      console.error("[shop] listShopKhachHang tags", ganErr);
      continue;
    }
    for (const gan of gans ?? []) {
      const list = tagsByBuyer.get(gan.id_nguoi_mua) ?? [];
      list.push(gan.id_the);
      tagsByBuyer.set(gan.id_nguoi_mua, list);
    }
  }

  for (const [buyerId, a] of agg) {
    result.set(buyerId, {
      buyerId,
      soDon: a.soDon,
      donGanNhatLuc: a.donGanNhatLuc,
      chiDonHuy: a.soDonHuy === a.soDon,
      tagIds: tagsByBuyer.get(buyerId) ?? [],
    });
  }
  return result;
}

export async function setShopKhachHangTags(
  sellerId: string,
  buyerId: string,
  tagIds: string[],
): Promise<{ ok: true; tagIds: string[] } | { ok: false; error: string }> {
  if (!isUuid(buyerId)) return { ok: false, error: "Khách hàng không hợp lệ." };
  if (sellerId === buyerId) {
    return { ok: false, error: "Không gắn thẻ cho chính mình." };
  }

  const isCustomer = await isShopCustomer(sellerId, buyerId);
  if (!isCustomer) {
    return { ok: false, error: "Người này chưa mua hàng của bạn." };
  }

  const uniqueTagIds = [
    ...new Set(tagIds.map((id) => id.trim()).filter((id) => isUuid(id))),
  ];

  const admin = createServiceRoleClient();

  if (uniqueTagIds.length > 0) {
    const { data: tags } = await admin
      .from("shop_the_khach")
      .select("id")
      .eq("id_nguoi_ban", sellerId)
      .in("id", uniqueTagIds);
    if ((tags ?? []).length !== uniqueTagIds.length) {
      return { ok: false, error: "Có thẻ không thuộc shop này." };
    }
  }

  await admin
    .from("shop_the_khach_gan")
    .delete()
    .eq("id_nguoi_ban", sellerId)
    .eq("id_nguoi_mua", buyerId);

  if (uniqueTagIds.length > 0) {
    const { error } = await admin.from("shop_the_khach_gan").insert(
      uniqueTagIds.map((id_the) => ({
        id_the,
        id_nguoi_ban: sellerId,
        id_nguoi_mua: buyerId,
      })),
    );
    if (error) {
      console.error("[shop] setShopKhachHangTags", error);
      return { ok: false, error: "Không gắn được thẻ." };
    }
  }

  return { ok: true, tagIds: uniqueTagIds };
}
