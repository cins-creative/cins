import "server-only";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import { getAvatarUrl } from "@/lib/journey/profile";
import {
  attachSocialState,
  buildMilestoneItemForCotMoc,
} from "@/lib/journey/milestones-fetch";
import {
  notifyShopQuayResolved,
  syncShopQuayPendingAdminNotifications,
} from "@/lib/shop/quay-notify";
import { assertShopReady } from "@/lib/shop/cua-hang";
import { shopImageUrl } from "@/lib/shop/settings";
import type {
  ShopEvidence,
  ShopQuayHangSearch,
  ShopQuaySuKien,
  ShopTrangThaiQuay,
} from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { canViewerManageSuKien } from "@/lib/to-chuc/su-kien";

type QuayRow = {
  id: string;
  id_su_kien: string;
  id_nguoi_dung: string;
  id_cot_moc: string | null;
  bang_chung: unknown;
  trang_thai: ShopTrangThaiQuay;
  ly_do_tu_choi: string | null;
  tao_luc: string;
};

function parseEvidence(raw: unknown): ShopEvidence[] {
  if (!Array.isArray(raw)) return [];
  const out: ShopEvidence[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label : "";
    const kind = o.kind;
    if (!label || (kind !== "link" && kind !== "file" && kind !== "text")) {
      continue;
    }
    const row: ShopEvidence = { label, kind };
    if (typeof o.href === "string") row.href = o.href;
    if (typeof o.detail === "string") row.detail = o.detail;
    out.push(row);
  }
  return out;
}

async function mapQuay(rows: QuayRow[]): Promise<ShopQuaySuKien[]> {
  if (rows.length === 0) return [];
  const admin = createServiceRoleClient();
  const userIds = [...new Set(rows.map((r) => r.id_nguoi_dung))];
  const { data: users } = await admin
    .from("user_nguoi_dung")
    .select("id, ten_hien_thi, slug, avatar_id")
    .in("id", userIds);
  const umap = new Map(
    (
      (users ?? []) as Array<{
        id: string;
        ten_hien_thi: string | null;
        slug: string | null;
        avatar_id: string | null;
      }>
    ).map((u) => [u.id, u]),
  );
  return rows.map((r) => {
    const u = umap.get(r.id_nguoi_dung);
    return {
      id: r.id,
      idSuKien: r.id_su_kien,
      idNguoiDung: r.id_nguoi_dung,
      idCotMoc: r.id_cot_moc,
      bangChung: parseEvidence(r.bang_chung),
      trangThai: r.trang_thai,
      lyDoTuChoi: r.ly_do_tu_choi,
      nguoiDungTen: u?.ten_hien_thi ?? null,
      nguoiDungSlug: u?.slug ?? null,
      nguoiDungAvatarUrl: getAvatarUrl(u?.avatar_id ?? null),
      taoLuc: r.tao_luc,
    };
  });
}

export async function listQuaySuKien(
  suKienId: string,
  opts?: { includePending?: boolean; actorId?: string },
): Promise<ShopQuaySuKien[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("shop_quay_su_kien")
    .select(
      "id, id_su_kien, id_nguoi_dung, id_cot_moc, bang_chung, trang_thai, ly_do_tu_choi, tao_luc",
    )
    .eq("id_su_kien", suKienId)
    .order("tao_luc", { ascending: true })
    .limit(100);

  if (!opts?.includePending) {
    q = q.eq("trang_thai", "da_duyet");
  }

  const { data, error } = await q;
  if (error) {
    console.error("[shop] listQuay", error);
    return [];
  }
  const items = await mapQuay((data ?? []) as QuayRow[]);

  const cotMocIds = [
    ...new Set(
      items.filter((i) => i.idCotMoc).map((i) => i.idCotMoc as string),
    ),
  ];
  if (cotMocIds.length === 0) return items;

  const cotMocById = new Map<string, MilestoneItem>();
  await Promise.all(
    cotMocIds.map(async (id) => {
      const item = await buildMilestoneItemForCotMoc(admin, id);
      if (item) cotMocById.set(id, item);
    }),
  );

  const withSocial = await attachSocialState(
    admin,
    [...cotMocById.values()],
    opts?.actorId ?? null,
  );
  for (const item of withSocial) {
    const id = item.cotMocId?.trim() || item.id.trim();
    if (id) cotMocById.set(id, item);
  }

  const withCotMoc = items.map((i) =>
    i.idCotMoc && cotMocById.has(i.idCotMoc)
      ? { ...i, cotMoc: cotMocById.get(i.idCotMoc)! }
      : i,
  );

  const hangByCotMoc = await loadHangSearchByCotMoc(cotMocIds);
  return withCotMoc.map((i) => {
    if (!i.idCotMoc) return i;
    const hang = hangByCotMoc.get(i.idCotMoc);
    return hang?.length ? { ...i, hangSearch: hang } : i;
  });
}

/** Batch `shop_post_hang` → card catalog (giá / ảnh / bán / phân loại). */
async function loadHangSearchByCotMoc(
  cotMocIds: string[],
): Promise<Map<string, ShopQuayHangSearch[]>> {
  const out = new Map<string, ShopQuayHangSearch[]>();
  if (cotMocIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: hangs, error } = await admin
    .from("shop_post_hang")
    .select(
      "id, id_cot_moc, id_bien_the, gia_hien_thi, tien_te, thu_tu",
    )
    .in("id_cot_moc", cotMocIds)
    .order("thu_tu", { ascending: true })
    .limit(500);
  if (error) {
    console.error("[shop] listQuay hangSearch", error);
    return out;
  }
  const hangRows = (hangs ?? []) as Array<{
    id: string;
    id_cot_moc: string;
    id_bien_the: string;
    gia_hien_thi: number | string;
    tien_te: string;
    thu_tu: number;
  }>;
  if (hangRows.length === 0) return out;

  const btIds = [...new Set(hangRows.map((h) => h.id_bien_the))];
  const { data: bts } = await admin
    .from("shop_bien_the")
    .select("id, id_san_pham, nhan, so_luong_ton, anh_id, da_xoa")
    .in("id", btIds);
  const btMap = new Map(
    (
      (bts ?? []) as Array<{
        id: string;
        id_san_pham: string;
        nhan: string;
        so_luong_ton: number;
        anh_id: string | null;
        da_xoa: boolean;
      }>
    ).map((b) => [b.id, b]),
  );

  const spIds = [
    ...new Set(
      [...btMap.values()]
        .filter((b) => !b.da_xoa)
        .map((b) => b.id_san_pham)
        .filter(Boolean),
    ),
  ];
  if (spIds.length === 0) return out;

  const { data: sps } = await admin
    .from("shop_san_pham")
    .select("id, ten, anh_id, phan_loai, phan_loai_2, da_xoa, dang_ban")
    .in("id", spIds);
  const spMap = new Map(
    (
      (sps ?? []) as Array<{
        id: string;
        ten: string;
        anh_id: string | null;
        phan_loai: string | null;
        phan_loai_2: string | null;
        da_xoa: boolean;
        dang_ban: boolean;
      }>
    ).map((s) => [s.id, s]),
  );

  const soldByBienThe = new Map<string, number>();
  {
    const { data: dongBan, error: soldErr } = await admin
      .from("shop_don_hang_dong")
      .select("id_bien_the, so_luong, shop_don_hang!inner(trang_thai)")
      .in("id_bien_the", btIds);
    if (soldErr) {
      console.error("[shop] listQuay hangSearch sold", soldErr);
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

  for (const h of hangRows) {
    const bt = btMap.get(h.id_bien_the);
    if (!bt || bt.da_xoa) continue;
    const sp = spMap.get(bt.id_san_pham);
    if (!sp || sp.da_xoa || !sp.dang_ban) continue;
    const ton = bt.so_luong_ton;
    const card: ShopQuayHangSearch = {
      hangId: h.id,
      idBienThe: bt.id,
      idSanPham: sp.id,
      tenSanPham: sp.ten,
      nhanBienThe: bt.nhan,
      phanLoai: sp.phan_loai?.trim() || null,
      phanLoai2: sp.phan_loai_2?.trim() || null,
      anhUrl: shopImageUrl(bt.anh_id ?? sp.anh_id),
      soLuongTon: ton,
      soLuongBan: soldByBienThe.get(bt.id) ?? 0,
      giaHienThi: Number(h.gia_hien_thi),
      tienTe: h.tien_te,
      hetHang: ton <= 0,
    };
    const list = out.get(h.id_cot_moc) ?? [];
    list.push(card);
    out.set(h.id_cot_moc, list);
  }
  return out;
}

export async function xinLamQuay(
  userId: string,
  input: {
    suKienId: string;
    cotMocId?: string | null;
    bangChung: ShopEvidence[];
  },
): Promise<ShopQuaySuKien> {
  await assertShopReady(userId);

  const admin = createServiceRoleClient();
  const { data: sk } = await admin
    .from("org_su_kien")
    .select("id")
    .eq("id", input.suKienId)
    .maybeSingle();
  if (!sk) throw new Error("SU_KIEN_NOT_FOUND");

  if (input.cotMocId) {
    const { data: moc } = await admin
      .from("content_cot_moc")
      .select("id, id_nguoi_dung")
      .eq("id", input.cotMocId)
      .maybeSingle<{ id: string; id_nguoi_dung: string }>();
    if (!moc || moc.id_nguoi_dung !== userId) throw new Error("FORBIDDEN");
  }

  const payload = {
    id_su_kien: input.suKienId,
    id_nguoi_dung: userId,
    id_cot_moc: input.cotMocId ?? null,
    bang_chung: input.bangChung,
    trang_thai: "cho_xu_ly" as const,
    ly_do_tu_choi: null,
    cap_nhat_luc: new Date().toISOString(),
  };

  let existingQ = admin
    .from("shop_quay_su_kien")
    .select("id")
    .eq("id_su_kien", input.suKienId)
    .eq("id_nguoi_dung", userId);
  existingQ = input.cotMocId
    ? existingQ.eq("id_cot_moc", input.cotMocId)
    : existingQ.is("id_cot_moc", null);
  const { data: existing } = await existingQ.maybeSingle<{ id: string }>();

  const { data, error } = existing
    ? await admin
        .from("shop_quay_su_kien")
        .update(payload)
        .eq("id", existing.id)
        .select(
          "id, id_su_kien, id_nguoi_dung, id_cot_moc, bang_chung, trang_thai, ly_do_tu_choi, tao_luc",
        )
        .single<QuayRow>()
    : await admin
        .from("shop_quay_su_kien")
        .insert(payload)
        .select(
          "id, id_su_kien, id_nguoi_dung, id_cot_moc, bang_chung, trang_thai, ly_do_tu_choi, tao_luc",
        )
        .single<QuayRow>();

  if (error || !data) {
    console.error("[shop] xinLamQuay", error);
    throw new Error("CREATE_FAILED");
  }

  await syncShopQuayPendingAdminNotifications({
    suKienId: input.suKienId,
    excludeUserId: userId,
  });

  const [mapped] = await mapQuay([data]);
  return mapped!;
}

export async function duyetQuay(
  actorId: string,
  quayId: string,
  action: "approve" | "reject",
  lyDoTuChoi?: string | null,
): Promise<ShopQuaySuKien> {
  const admin = createServiceRoleClient();
  const { data: quay } = await admin
    .from("shop_quay_su_kien")
    .select(
      "id, id_su_kien, id_nguoi_dung, id_cot_moc, bang_chung, trang_thai, ly_do_tu_choi, tao_luc",
    )
    .eq("id", quayId)
    .maybeSingle<QuayRow>();
  if (!quay) throw new Error("NOT_FOUND");

  const { data: sk } = await admin
    .from("org_su_kien")
    .select("id_to_chuc, ten")
    .eq("id", quay.id_su_kien)
    .maybeSingle<{ id_to_chuc: string; ten: string | null }>();
  if (!sk) throw new Error("SU_KIEN_NOT_FOUND");
  if (!(await canViewerManageSuKien(actorId, sk.id_to_chuc))) {
    throw new Error("FORBIDDEN");
  }

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("ten")
    .eq("id", sk.id_to_chuc)
    .maybeSingle<{ ten: string | null }>();

  const rejectReason =
    action === "reject" ? lyDoTuChoi?.trim() || null : null;
  if (action === "reject" && !rejectReason) {
    throw new Error("LY_DO_REQUIRED");
  }
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("shop_quay_su_kien")
    .update({
      trang_thai: action === "approve" ? "da_duyet" : "tu_choi",
      ly_do_tu_choi: rejectReason,
      duyet_boi: actorId,
      duyet_luc: now,
      cap_nhat_luc: now,
    })
    .eq("id", quayId)
    .select(
      "id, id_su_kien, id_nguoi_dung, id_cot_moc, bang_chung, trang_thai, ly_do_tu_choi, tao_luc",
    )
    .single<QuayRow>();
  if (error || !data) throw new Error("UPDATE_FAILED");

  await notifyShopQuayResolved({
    sellerId: quay.id_nguoi_dung,
    quayId: quay.id,
    suKienId: quay.id_su_kien,
    action: action === "approve" ? "approved" : "rejected",
    suKienTen: sk.ten?.trim() || "Sự kiện",
    orgTen: org?.ten?.trim() || "Ban tổ chức",
    lyDoTuChoi: rejectReason,
  });

  await syncShopQuayPendingAdminNotifications({
    suKienId: quay.id_su_kien,
  });

  const [mapped] = await mapQuay([data]);
  return mapped!;
}

/** Quầy đang / đã tham gia của seller — không gồm `tu_choi`. */
export async function listQuayCuaToi(
  userId: string,
): Promise<ShopQuaySuKien[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_quay_su_kien")
    .select(
      "id, id_su_kien, id_nguoi_dung, id_cot_moc, bang_chung, trang_thai, ly_do_tu_choi, tao_luc",
    )
    .eq("id_nguoi_dung", userId)
    .in("trang_thai", ["cho_xu_ly", "da_duyet"])
    .order("tao_luc", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[shop] listQuayCuaToi", error);
    return [];
  }
  const rows = (data ?? []) as QuayRow[];
  const items = await mapQuay(rows);
  if (items.length === 0) return [];

  const suKienIds = [...new Set(items.map((i) => i.idSuKien))];
  const { data: skRows } = await admin
    .from("org_su_kien")
    .select("id, ten, bat_dau, id_to_chuc")
    .in("id", suKienIds)
    .returns<
      Array<{
        id: string;
        ten: string | null;
        bat_dau: string | null;
        id_to_chuc: string;
      }>
    >();
  const skMap = new Map((skRows ?? []).map((s) => [s.id, s]));
  const orgIds = [
    ...new Set((skRows ?? []).map((s) => s.id_to_chuc).filter(Boolean)),
  ];
  const { data: orgRows } = orgIds.length
    ? await admin
        .from("org_to_chuc")
        .select("id, ten")
        .in("id", orgIds)
        .returns<Array<{ id: string; ten: string | null }>>()
    : { data: [] as Array<{ id: string; ten: string | null }> };
  const orgMap = new Map((orgRows ?? []).map((o) => [o.id, o.ten]));

  return items.map((i) => {
    const sk = skMap.get(i.idSuKien);
    return {
      ...i,
      suKienTen: sk?.ten?.trim() || null,
      suKienBatDau: sk?.bat_dau ?? null,
      orgTen: sk ? orgMap.get(sk.id_to_chuc)?.trim() || null : null,
    };
  });
}

/**
 * Seller rút quầy (chờ duyệt hoặc đã duyệt) — set `tu_choi` + lý do bắt buộc.
 */
export async function rutQuay(
  userId: string,
  quayId: string,
  lyDo: string,
): Promise<ShopQuaySuKien> {
  const reason = lyDo.trim();
  if (!reason) throw new Error("LY_DO_REQUIRED");

  const admin = createServiceRoleClient();
  const { data: quay } = await admin
    .from("shop_quay_su_kien")
    .select(
      "id, id_su_kien, id_nguoi_dung, id_cot_moc, bang_chung, trang_thai, ly_do_tu_choi, tao_luc",
    )
    .eq("id", quayId)
    .maybeSingle<QuayRow>();
  if (!quay) throw new Error("NOT_FOUND");
  if (quay.id_nguoi_dung !== userId) throw new Error("FORBIDDEN");
  if (quay.trang_thai !== "cho_xu_ly" && quay.trang_thai !== "da_duyet") {
    throw new Error("INVALID_STATE");
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("shop_quay_su_kien")
    .update({
      trang_thai: "tu_choi",
      ly_do_tu_choi: reason,
      duyet_boi: null,
      duyet_luc: null,
      cap_nhat_luc: now,
    })
    .eq("id", quayId)
    .eq("id_nguoi_dung", userId)
    .select(
      "id, id_su_kien, id_nguoi_dung, id_cot_moc, bang_chung, trang_thai, ly_do_tu_choi, tao_luc",
    )
    .single<QuayRow>();
  if (error || !data) throw new Error("UPDATE_FAILED");

  await syncShopQuayPendingAdminNotifications({
    suKienId: quay.id_su_kien,
  });

  const [mapped] = await mapQuay([data]);
  return mapped!;
}
