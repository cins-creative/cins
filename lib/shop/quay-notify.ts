import "server-only";

import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import type {
  ShopQuayPendingNotification,
  ShopQuayResolvedNotification,
} from "@/lib/social/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  suKienDetailPath,
  suKienManageHref,
} from "@/lib/to-chuc/su-kien-routes";

export const SHOP_QUAY_APPROVED_LOAI = "shop_quay_approved" as const;
export const SHOP_QUAY_REJECTED_LOAI = "shop_quay_rejected" as const;
export const SHOP_QUAY_PENDING_LOAI = "shop_quay_pending" as const;

type ResolvedPayload = {
  suKienTen: string;
  suKienHref: string;
  orgTen: string;
  action: "approved" | "rejected";
  lyDoTuChoi?: string | null;
};

type PendingPayload = {
  suKienTen: string;
  manageHref: string;
  orgTen: string;
  pendingCount: number;
};

function parseResolvedPayload(
  raw: string | null | undefined,
): ResolvedPayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as ResolvedPayload;
    if (!parsed?.suKienTen || !parsed?.suKienHref || !parsed?.orgTen) {
      return null;
    }
    if (parsed.action !== "approved" && parsed.action !== "rejected") return null;
    return parsed;
  } catch {
    return null;
  }
}

function parsePendingPayload(
  raw: string | null | undefined,
): PendingPayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as PendingPayload;
    if (!parsed?.suKienTen || !parsed?.manageHref || !parsed?.orgTen) {
      return null;
    }
    if (typeof parsed.pendingCount !== "number" || parsed.pendingCount < 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function loaiFromAction(action: ResolvedPayload["action"]): string {
  return action === "approved"
    ? SHOP_QUAY_APPROVED_LOAI
    : SHOP_QUAY_REJECTED_LOAI;
}

async function countPendingQuay(
  admin: ReturnType<typeof createServiceRoleClient>,
  suKienId: string,
): Promise<number> {
  const { count } = await admin
    .from("shop_quay_su_kien")
    .select("id", { count: "exact", head: true })
    .eq("id_su_kien", suKienId)
    .eq("trang_thai", "cho_xu_ly");
  return count ?? 0;
}

async function listOrgSuKienAdminIds(
  admin: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
): Promise<string[]> {
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_nguoi_dung")
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "active")
    .in("vai_tro", ["owner", "admin", "quan_ly_noi_dung"]);
  return [
    ...new Set(
      (data ?? [])
        .map((r) => (r as { id_nguoi_dung?: string }).id_nguoi_dung)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

async function loadSuKienNotifyContext(
  admin: ReturnType<typeof createServiceRoleClient>,
  suKienId: string,
): Promise<{
  orgId: string;
  suKienTen: string;
  orgTen: string;
  orgSlug: string;
  orgLoai: string;
} | null> {
  const { data: sk } = await admin
    .from("org_su_kien")
    .select("id_to_chuc, ten")
    .eq("id", suKienId)
    .maybeSingle<{ id_to_chuc: string; ten: string | null }>();
  if (!sk?.id_to_chuc) return null;

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("ten, slug, loai_to_chuc")
    .eq("id", sk.id_to_chuc)
    .maybeSingle<{
      ten: string | null;
      slug: string | null;
      loai_to_chuc: string | null;
    }>();
  if (!org?.slug?.trim()) return null;

  return {
    orgId: sk.id_to_chuc,
    suKienTen: sk.ten?.trim() || "Sự kiện",
    orgTen: org.ten?.trim() || "Ban tổ chức",
    orgSlug: org.slug.trim(),
    orgLoai: org.loai_to_chuc?.trim() || "studio",
  };
}

/**
 * Upsert 1 thông báo / admin / sự kiện — cập nhật số chờ duyệt, không spam tin mới.
 * Gọi khi xin quầy hoặc sau duyệt/từ chối.
 */
export async function syncShopQuayPendingAdminNotifications(params: {
  suKienId: string;
  /** Không gửi cho người vừa xin quầy (nếu họ cũng là admin). */
  excludeUserId?: string | null;
}): Promise<void> {
  const admin = createServiceRoleClient();
  const ctx = await loadSuKienNotifyContext(admin, params.suKienId);
  if (!ctx) return;

  const pendingCount = await countPendingQuay(admin, params.suKienId);
  const recipients = (await listOrgSuKienAdminIds(admin, ctx.orgId)).filter(
    (id) => id !== params.excludeUserId,
  );
  if (recipients.length === 0) return;

  const manageHref = suKienManageHref(ctx.orgLoai, ctx.orgSlug, params.suKienId);
  const body = JSON.stringify({
    suKienTen: ctx.suKienTen,
    manageHref,
    orgTen: ctx.orgTen,
    pendingCount,
  } satisfies PendingPayload);
  const ts = new Date().toISOString();

  await Promise.all(
    recipients.map(async (nguoiNhan) => {
      const { data: existing } = await admin
        .from("social_thong_bao")
        .select("id")
        .eq("nguoi_nhan", nguoiNhan)
        .eq("loai_doi_tuong", SHOP_QUAY_PENDING_LOAI)
        .eq("id_doi_tuong", params.suKienId)
        .maybeSingle<{ id: string }>();

      if (existing?.id) {
        const { error } = await admin
          .from("social_thong_bao")
          .update({
            noi_dung: body,
            tao_luc: ts,
            da_doc: pendingCount === 0,
          })
          .eq("id", existing.id);
        if (error) {
          console.error("[syncShopQuayPendingAdminNotifications] update", error);
        }
        return;
      }

      if (pendingCount === 0) return;

      const result = await insertSocialThongBao(admin, {
        nguoi_nhan: nguoiNhan,
        loai: "hanh_dong",
        noi_dung: body,
        loai_doi_tuong: SHOP_QUAY_PENDING_LOAI,
        id_doi_tuong: params.suKienId,
        da_doc: false,
      });
      if (!result.ok) {
        console.error("[syncShopQuayPendingAdminNotifications]", result.error);
      }
    }),
  );
}

export async function notifyShopQuayResolved(params: {
  sellerId: string;
  quayId: string;
  suKienId: string;
  action: "approved" | "rejected";
  suKienTen: string;
  orgTen: string;
  lyDoTuChoi?: string | null;
}): Promise<void> {
  const admin = createServiceRoleClient();
  const loaiDoiTuong = loaiFromAction(params.action);

  const { data: existing } = await admin
    .from("social_thong_bao")
    .select("id")
    .eq("nguoi_nhan", params.sellerId)
    .eq("loai_doi_tuong", loaiDoiTuong)
    .eq("id_doi_tuong", params.quayId)
    .maybeSingle();

  if (existing?.id) return;

  const body: ResolvedPayload = {
    suKienTen: params.suKienTen,
    suKienHref: suKienDetailPath(params.suKienId),
    orgTen: params.orgTen,
    action: params.action,
    lyDoTuChoi: params.action === "rejected" ? params.lyDoTuChoi ?? null : null,
  };

  const result = await insertSocialThongBao(admin, {
    nguoi_nhan: params.sellerId,
    loai: "thong_tin",
    noi_dung: JSON.stringify(body),
    loai_doi_tuong: loaiDoiTuong,
    id_doi_tuong: params.quayId,
  });

  if (!result.ok) {
    console.error("[notifyShopQuayResolved]", result.error);
  }
}

export async function listShopQuayResolvedNotifications(
  viewerId: string,
  options: { unreadOnly?: boolean; historyOnly?: boolean; limit?: number } = {},
): Promise<ShopQuayResolvedNotification[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  let query = admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, loai_doi_tuong, noi_dung, tao_luc, da_doc")
    .eq("nguoi_nhan", viewerId)
    .in("loai_doi_tuong", [SHOP_QUAY_APPROVED_LOAI, SHOP_QUAY_REJECTED_LOAI])
    .order("tao_luc", { ascending: false })
    .limit(rowLimit);

  if (options.unreadOnly) {
    query = query.eq("da_doc", false);
  } else if (options.historyOnly) {
    query = query.eq("da_doc", true);
  }

  const { data: rows } = await query;
  if (!rows?.length) return [];

  const items: ShopQuayResolvedNotification[] = [];
  for (const row of rows) {
    const quayId = row.id_doi_tuong as string | null;
    if (!quayId) continue;
    const parsed = parseResolvedPayload(row.noi_dung as string | null);
    if (!parsed) continue;
    items.push({
      notificationId: row.id as string,
      quayId,
      suKienTen: parsed.suKienTen,
      suKienHref: parsed.suKienHref,
      orgTen: parsed.orgTen,
      action: parsed.action,
      lyDoTuChoi: parsed.lyDoTuChoi ?? null,
      taoLuc: (row.tao_luc as string | null) ?? undefined,
      daDoc: Boolean(row.da_doc),
    });
  }
  return items;
}

export async function listShopQuayPendingNotifications(
  viewerId: string,
  options: { unreadOnly?: boolean; historyOnly?: boolean; limit?: number } = {},
): Promise<ShopQuayPendingNotification[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  let query = admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, noi_dung, tao_luc, da_doc")
    .eq("nguoi_nhan", viewerId)
    .eq("loai_doi_tuong", SHOP_QUAY_PENDING_LOAI)
    .order("tao_luc", { ascending: false })
    .limit(rowLimit);

  if (options.unreadOnly) {
    query = query.eq("da_doc", false);
  } else if (options.historyOnly) {
    query = query.eq("da_doc", true);
  }

  const { data: rows } = await query;
  if (!rows?.length) return [];

  const items: ShopQuayPendingNotification[] = [];
  for (const row of rows) {
    const suKienId = row.id_doi_tuong as string | null;
    if (!suKienId) continue;
    const parsed = parsePendingPayload(row.noi_dung as string | null);
    if (!parsed || parsed.pendingCount <= 0) continue;
    items.push({
      notificationId: row.id as string,
      suKienId,
      suKienTen: parsed.suKienTen,
      manageHref: parsed.manageHref,
      orgTen: parsed.orgTen,
      pendingCount: parsed.pendingCount,
      taoLuc: (row.tao_luc as string | null) ?? undefined,
      daDoc: Boolean(row.da_doc),
    });
  }
  return items;
}
