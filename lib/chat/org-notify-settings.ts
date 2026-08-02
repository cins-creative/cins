import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ORG_ADMIN_ROLES } from "@/lib/truong/org-admin";

const TIN_NHAN_KEY = "tinNhan";

/** Vai trò được đổi cấu hình thông báo dùng chung. */
const ORG_NOTIFY_SETTINGS_ROLES = ["owner", "admin"] as const;

export type OrgThongBaoChungSettings = {
  /** true = một admin xem là đủ (ẩn unread/noti với admin khác). Mặc định false. */
  thongBaoChung: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function parseOrgThongBaoChung(cauHinh: unknown): boolean {
  const root = asRecord(cauHinh);
  const tinNhan = asRecord(root[TIN_NHAN_KEY]);
  return tinNhan.thongBaoChung === true;
}

export async function getOrgThongBaoChung(orgId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", orgId)
    .maybeSingle<{ cau_hinh: unknown }>();
  return parseOrgThongBaoChung(data?.cau_hinh);
}

/** Map orgId → thongBaoChung cho nhiều org (1 query). */
export async function getOrgThongBaoChungByOrgIds(
  orgIds: string[],
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  const unique = [...new Set(orgIds.filter(Boolean))];
  if (unique.length === 0) return result;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id, cau_hinh")
    .in("id", unique)
    .returns<Array<{ id: string; cau_hinh: unknown }>>();

  for (const row of data ?? []) {
    result.set(row.id, parseOrgThongBaoChung(row.cau_hinh));
  }
  return result;
}

async function assertOwnerOrAdmin(
  orgId: string,
  actorId: string,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", actorId)
    .eq("trang_thai", "active")
    .is("den_ngay", null)
    .in("vai_tro", [...ORG_NOTIFY_SETTINGS_ROLES])
    .maybeSingle<{ vai_tro: string }>();
  return Boolean(data?.vai_tro);
}

export async function setOrgThongBaoChung(params: {
  orgId: string;
  actorId: string;
  thongBaoChung: boolean;
}): Promise<
  | { ok: true; thongBaoChung: boolean }
  | { ok: false; error: string }
> {
  if (!(await assertOwnerOrAdmin(params.orgId, params.actorId))) {
    return {
      ok: false,
      error: "Chỉ chủ sở hữu hoặc quản trị viên mới đổi cấu hình này.",
    };
  }

  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", params.orgId)
    .maybeSingle<{ cau_hinh: unknown }>();

  if (!org) {
    return { ok: false, error: "Không tìm thấy tổ chức." };
  }

  const root = asRecord(org.cau_hinh);
  const tinNhan = asRecord(root[TIN_NHAN_KEY]);
  const merged = {
    ...root,
    [TIN_NHAN_KEY]: {
      ...tinNhan,
      thongBaoChung: params.thongBaoChung,
    },
  };

  const { error } = await admin
    .from("org_to_chuc")
    .update({ cau_hinh: merged })
    .eq("id", params.orgId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, thongBaoChung: params.thongBaoChung };
}

/** Admin IDs active của org (dùng cho watermark dùng chung). */
export async function listOrgInboxAdminIdsForNotify(
  orgId: string,
): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_nguoi_dung")
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "active")
    .is("den_ngay", null)
    .in("vai_tro", [...ORG_ADMIN_ROLES]);

  return [
    ...new Set(
      (data ?? [])
        .map((r) => (r as { id_nguoi_dung?: string }).id_nguoi_dung)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

/**
 * Watermark đọc theo phòng.
 * - personal: chỉ `viewerId`
 * - shared: max watermark trong `readerIds` (admin org)
 */
export async function loadReadAtByRoomForStaff(params: {
  roomIds: string[];
  viewerId: string;
  /** Khi set — lấy max watermark của các reader này. */
  sharedReaderIds?: string[];
}): Promise<Map<string, string>> {
  const readAtByRoom = new Map<string, string>();
  if (params.roomIds.length === 0) return readAtByRoom;

  const readerIds =
    params.sharedReaderIds && params.sharedReaderIds.length > 0
      ? [...new Set(params.sharedReaderIds)]
      : [params.viewerId];

  const admin = createServiceRoleClient();
  const { data: reads } = await admin
    .from("chat_da_doc")
    .select("id_phong, id_tin_nhan_cuoi_doc, id_nguoi_dung")
    .in("id_nguoi_dung", readerIds)
    .in("id_phong", params.roomIds)
    .returns<
      Array<{
        id_phong: string;
        id_tin_nhan_cuoi_doc: string;
        id_nguoi_dung: string;
      }>
    >();

  if (!reads?.length) return readAtByRoom;

  const readMessageIds = [
    ...new Set(reads.map((row) => row.id_tin_nhan_cuoi_doc)),
  ];
  const { data: readMessages } = await admin
    .from("chat_tin_nhan")
    .select("id, tao_luc")
    .in("id", readMessageIds)
    .returns<Array<{ id: string; tao_luc: string }>>();

  const readAtByMessageId = new Map(
    (readMessages ?? []).map((row) => [row.id, row.tao_luc]),
  );

  for (const read of reads) {
    const readAt = readAtByMessageId.get(read.id_tin_nhan_cuoi_doc);
    if (!readAt) continue;
    const existing = readAtByRoom.get(read.id_phong);
    if (!existing || readAt > existing) {
      readAtByRoom.set(read.id_phong, readAt);
    }
  }

  return readAtByRoom;
}
