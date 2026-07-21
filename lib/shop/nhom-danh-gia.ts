import "server-only";

import { shopImageUrl } from "@/lib/shop/settings";
import type { ShopNhomDanhGia } from "@/lib/shop/types";
import {
  SHOP_NHOM_DANH_GIA_ANH_MAX,
  SHOP_NHOM_DANH_GIA_NOI_DUNG_MAX,
} from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type DgRow = {
  id: string;
  id_nhom: string;
  id_nguoi_dung: string;
  id_don_hang: string;
  diem: number;
  noi_dung: string | null;
  anh_ids: string[] | null;
  tao_luc: string;
};

async function resolveEligibleDonHangId(
  buyerId: string,
  nhomId: string,
  sellerId: string,
): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data: donRows, error } = await admin
    .from("shop_don_hang")
    .select("id")
    .eq("id_nguoi_mua", buyerId)
    .eq("id_nguoi_ban", sellerId)
    .in("trang_thai", ["da_nhan_tien", "da_giao_tai_su_kien"])
    .order("tao_luc", { ascending: false })
    .limit(40);
  if (error) {
    console.error("[shop] resolveEligibleDonHangId don", error);
    return null;
  }
  const dons = (donRows ?? []) as Array<{ id: string }>;
  if (dons.length === 0) return null;
  const donIds = dons.map((d) => d.id);

  const { data: dongRows } = await admin
    .from("shop_don_hang_dong")
    .select("id_don_hang, id_bien_the")
    .in("id_don_hang", donIds);
  const lines = (dongRows ?? []) as Array<{
    id_don_hang: string;
    id_bien_the: string | null;
  }>;
  const btIds = [
    ...new Set(
      lines
        .map((l) => l.id_bien_the)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (btIds.length === 0) return null;

  const { data: btRows } = await admin
    .from("shop_bien_the")
    .select("id, id_san_pham")
    .in("id", btIds);
  const bts = (btRows ?? []) as Array<{ id: string; id_san_pham: string }>;
  const spIds = [...new Set(bts.map((b) => b.id_san_pham))];
  if (spIds.length === 0) return null;

  const { data: spRows } = await admin
    .from("shop_san_pham")
    .select("id")
    .in("id", spIds)
    .eq("id_nhom", nhomId)
    .eq("da_xoa", false);
  const okSp = new Set(
    ((spRows ?? []) as Array<{ id: string }>).map((s) => s.id),
  );
  if (okSp.size === 0) return null;

  const okBt = new Set(
    bts.filter((b) => okSp.has(b.id_san_pham)).map((b) => b.id),
  );

  for (const donId of donIds) {
    const hit = lines.some(
      (l) => l.id_don_hang === donId && l.id_bien_the && okBt.has(l.id_bien_the),
    );
    if (hit) return donId;
  }
  return null;
}

/** Buyer đã mua hàng thuộc loại + không phải chủ shop → được review. */
export async function canBuyerReviewNhom(opts: {
  buyerId: string;
  nhomId: string;
  sellerId: string;
}): Promise<{ canReview: boolean; eligibleDonHangId: string | null }> {
  if (opts.buyerId === opts.sellerId) {
    return { canReview: false, eligibleDonHangId: null };
  }
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("shop_nhom_danh_gia")
    .select("id")
    .eq("id_nhom", opts.nhomId)
    .eq("id_nguoi_dung", opts.buyerId)
    .eq("da_xoa", false)
    .maybeSingle();
  if (existing) {
    return { canReview: false, eligibleDonHangId: null };
  }
  const donId = await resolveEligibleDonHangId(
    opts.buyerId,
    opts.nhomId,
    opts.sellerId,
  );
  return { canReview: Boolean(donId), eligibleDonHangId: donId };
}

async function mauLabelsFromDon(
  donHangId: string,
  nhomId: string,
): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data: dong } = await admin
    .from("shop_don_hang_dong")
    .select("id_bien_the")
    .eq("id_don_hang", donHangId);
  const btIds = [
    ...new Set(
      ((dong ?? []) as Array<{ id_bien_the: string | null }>)
        .map((d) => d.id_bien_the)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (btIds.length === 0) return [];
  const { data: btRows } = await admin
    .from("shop_bien_the")
    .select("id, nhan, id_san_pham")
    .in("id", btIds);
  const bts = (btRows ?? []) as Array<{
    id: string;
    nhan: string;
    id_san_pham: string;
  }>;
  const spIds = [...new Set(bts.map((b) => b.id_san_pham))];
  const { data: spRows } = await admin
    .from("shop_san_pham")
    .select("id, ten, id_nhom")
    .in("id", spIds)
    .eq("id_nhom", nhomId);
  const spById = new Map(
    (
      (spRows ?? []) as Array<{ id: string; ten: string; id_nhom: string | null }>
    ).map((s) => [s.id, s]),
  );
  const labels: string[] = [];
  for (const bt of bts) {
    const sp = spById.get(bt.id_san_pham);
    if (!sp) continue;
    const nhan = bt.nhan?.trim();
    if (nhan && nhan !== "Mặc định" && nhan !== sp.ten) {
      labels.push(`${sp.ten} · ${nhan}`);
    } else {
      labels.push(sp.ten);
    }
  }
  return [...new Set(labels)].slice(0, 12);
}

export async function listNhomDanhGia(opts: {
  nhomId: string;
  viewerId?: string | null;
  withMediaOnly?: boolean;
  withCommentOnly?: boolean;
  /** Lọc đúng số sao 1–5. */
  diem?: number | null;
  limit?: number;
}): Promise<{
  items: ShopNhomDanhGia[];
  diemTrungBinh: number | null;
  tong: number;
  boDem: {
    tong: number;
    theoDiem: Record<1 | 2 | 3 | 4 | 5, number>;
    coBinhLuan: number;
    coAnh: number;
  };
}> {
  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 100);
  const admin = createServiceRoleClient();

  const { data: statRows } = await admin
    .from("shop_nhom_danh_gia")
    .select("diem, noi_dung, anh_ids")
    .eq("id_nhom", opts.nhomId)
    .eq("da_xoa", false)
    .limit(500);
  const stats = (statRows ?? []) as Array<{
    diem: number;
    noi_dung: string | null;
    anh_ids: string[] | null;
  }>;
  const theoDiem: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let coBinhLuan = 0;
  let coAnh = 0;
  for (const r of stats) {
    const d = Math.round(Number(r.diem));
    if (d >= 1 && d <= 5) {
      theoDiem[d as 1 | 2 | 3 | 4 | 5] += 1;
    }
    if (r.noi_dung?.trim()) coBinhLuan += 1;
    if ((r.anh_ids ?? []).some(Boolean)) coAnh += 1;
  }
  const diems = stats.map((r) => r.diem);
  const diemTrungBinh =
    diems.length > 0
      ? Math.round(
          (diems.reduce((a, b) => a + b, 0) / diems.length) * 10,
        ) / 10
      : null;
  const tong = stats.length;
  const boDem = { tong, theoDiem, coBinhLuan, coAnh };

  let q = admin
    .from("shop_nhom_danh_gia")
    .select(
      "id, id_nhom, id_nguoi_dung, id_don_hang, diem, noi_dung, anh_ids, tao_luc",
    )
    .eq("id_nhom", opts.nhomId)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false })
    .limit(limit);
  if (opts.withMediaOnly) {
    q = q.not("anh_ids", "eq", "{}");
  }
  if (opts.withCommentOnly) {
    q = q.not("noi_dung", "is", null).neq("noi_dung", "");
  }
  if (opts.diem != null && opts.diem >= 1 && opts.diem <= 5) {
    q = q.eq("diem", opts.diem);
  }
  const { data, error } = await q;
  if (error) {
    console.error("[shop] listNhomDanhGia", error);
    throw new Error("LIST_FAILED");
  }
  const rows = (data ?? []) as DgRow[];

  const userIds = [...new Set(rows.map((r) => r.id_nguoi_dung))];
  const userById = new Map<
    string,
    { ten_hien_thi: string | null; slug: string | null; avatar_id: string | null }
  >();
  if (userIds.length > 0) {
    const { data: users } = await admin
      .from("user_nguoi_dung")
      .select("id, ten_hien_thi, slug, avatar_id")
      .in("id", userIds);
    for (const u of (users ?? []) as Array<{
      id: string;
      ten_hien_thi: string | null;
      slug: string | null;
      avatar_id: string | null;
    }>) {
      userById.set(u.id, u);
    }
  }

  const items: ShopNhomDanhGia[] = [];
  for (const row of rows) {
    const u = userById.get(row.id_nguoi_dung);
    const anhIds = (row.anh_ids ?? []).filter(Boolean).slice(0, SHOP_NHOM_DANH_GIA_ANH_MAX);
    const mauDaMua = await mauLabelsFromDon(row.id_don_hang, opts.nhomId);
    items.push({
      id: row.id,
      idNhom: row.id_nhom,
      idNguoiDung: row.id_nguoi_dung,
      tenHienThi: u?.ten_hien_thi?.trim() || null,
      slug: u?.slug?.trim() || null,
      avatarUrl: shopImageUrl(u?.avatar_id ?? null),
      diem: row.diem,
      noiDung: row.noi_dung?.trim() || null,
      anhUrls: anhIds
        .map((id) => shopImageUrl(id))
        .filter((url): url is string => Boolean(url)),
      mauDaMua,
      taoLuc: row.tao_luc,
      isMine: opts.viewerId != null && opts.viewerId === row.id_nguoi_dung,
    });
  }

  return {
    items,
    diemTrungBinh,
    tong,
    boDem,
  };
}

export async function createNhomDanhGia(opts: {
  buyerId: string;
  nhomId: string;
  sellerId: string;
  diem: number;
  noiDung?: string | null;
  anhIds?: string[];
}): Promise<ShopNhomDanhGia> {
  if (opts.buyerId === opts.sellerId) throw new Error("OWNER_FORBIDDEN");
  if (!Number.isInteger(opts.diem) || opts.diem < 1 || opts.diem > 5) {
    throw new Error("DIEM_INVALID");
  }

  const gate = await canBuyerReviewNhom({
    buyerId: opts.buyerId,
    nhomId: opts.nhomId,
    sellerId: opts.sellerId,
  });
  if (!gate.canReview || !gate.eligibleDonHangId) {
    throw new Error("NOT_ELIGIBLE");
  }

  const anhIds = (opts.anhIds ?? [])
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, SHOP_NHOM_DANH_GIA_ANH_MAX);
  let noiDung: string | null = null;
  if (opts.noiDung != null) {
    const t = opts.noiDung.trim();
    noiDung = t
      ? t.slice(0, SHOP_NHOM_DANH_GIA_NOI_DUNG_MAX)
      : null;
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_nhom_danh_gia")
    .insert({
      id_nhom: opts.nhomId,
      id_nguoi_dung: opts.buyerId,
      id_don_hang: gate.eligibleDonHangId,
      diem: opts.diem,
      noi_dung: noiDung,
      anh_ids: anhIds,
    })
    .select(
      "id, id_nhom, id_nguoi_dung, id_don_hang, diem, noi_dung, anh_ids, tao_luc",
    )
    .single<DgRow>();
  if (error || !data) {
    console.error("[shop] createNhomDanhGia", error);
    if (error?.code === "23505") throw new Error("ALREADY_REVIEWED");
    throw new Error("CREATE_FAILED");
  }

  const list = await listNhomDanhGia({
    nhomId: opts.nhomId,
    viewerId: opts.buyerId,
    limit: 1,
  });
  const mine = list.items.find((i) => i.id === data.id);
  if (!mine) throw new Error("CREATE_FAILED");
  return mine;
}

export async function softDeleteNhomDanhGia(opts: {
  buyerId: string;
  danhGiaId: string;
}): Promise<void> {
  const admin = createServiceRoleClient();
  const { error, count } = await admin
    .from("shop_nhom_danh_gia")
    .update(
      { da_xoa: true, cap_nhat_luc: new Date().toISOString() },
      { count: "exact" },
    )
    .eq("id", opts.danhGiaId)
    .eq("id_nguoi_dung", opts.buyerId)
    .eq("da_xoa", false);
  if (error || !count) {
    console.error("[shop] softDeleteNhomDanhGia", error);
    throw new Error("DELETE_FAILED");
  }
}
