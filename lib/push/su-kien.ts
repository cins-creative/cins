import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { guiPushToiUser, type PushPayload } from "@/lib/push/gui";

/** 4 loại được phép push (PLAN app mobile). Không vanity. */
export type PushLoai = "tin_nhan" | "don_hang" | "moc_lop" | "hoa_don";

export type PushSuKienInput = {
  loai: PushLoai;
  title: string;
  body: string;
  deepLink?: string;
  data?: Record<string, string>;
};

/**
 * `loai_doi_tuong` của `social_thong_bao` được phép đẩy FCM.
 * Shop đơn: đẩy từ `lib/shop/don-hang.ts` (tránh double với bump chat).
 * Vanity (follow/like/comment/…) — không có trong set này.
 */
const SOCIAL_THONG_BAO_PUSH_ALLOW = new Set<string>([
  // cố ý trống shop_don_hang — xem don-hang.ts
]);

/** Soft coalesce tin nhắn: cùng user+phòng trong cửa sổ → bỏ qua (Workers: per-isolate). */
const CHAT_COALESCE_MS = 45_000;
const chatLastSent = new Map<string, number>();

function toPayload(input: PushSuKienInput): PushPayload {
  return {
    title: input.title.slice(0, 100),
    body: input.body.slice(0, 240),
    deepLink: input.deepLink,
    data: {
      loai: input.loai,
      ...(input.data ?? {}),
    },
  };
}

/** Fire-and-forget — không throw ra caller nghiệp vụ. */
export function firePush(userId: string, input: PushSuKienInput): void {
  if (!userId.trim()) return;
  void guiPushToiUser(userId, toPayload(input)).catch((e) => {
    console.error(
      "[push/su-kien] firePush",
      input.loai,
      e instanceof Error ? e.message : e,
    );
  });
}

export function firePushMany(
  userIds: string[],
  input: PushSuKienInput,
): void {
  const unique = [...new Set(userIds.filter((id) => id.trim()))];
  for (const id of unique) firePush(id, input);
}

/**
 * Gọi sau `insertSocialThongBao` thành công — chỉ loại trong allowlist.
 * Hiện allowlist hẹp (shop đi qua don-hang.ts).
 */
export function maybePushFromSocialThongBao(row: {
  nguoi_nhan: string;
  noi_dung: string;
  loai_doi_tuong: string;
  id_doi_tuong: string;
}): void {
  if (!SOCIAL_THONG_BAO_PUSH_ALLOW.has(row.loai_doi_tuong)) return;
  firePush(row.nguoi_nhan, {
    loai: "don_hang",
    title: "Thông báo",
    body: row.noi_dung,
    deepLink: undefined,
    data: {
      loai_doi_tuong: row.loai_doi_tuong,
      id_doi_tuong: row.id_doi_tuong,
    },
  });
}

/** Push đơn hàng → một người (seller khi đơn mới / peer khi đổi trạng thái). */
export function firePushDonHang(input: {
  recipientId: string;
  maDon: string;
  title: string;
  body: string;
  donId: string;
  /** Mặc định trang đơn seller; buyer nên truyền deep link chat/đơn mua. */
  deepLink?: string;
}): void {
  firePush(input.recipientId, {
    loai: "don_hang",
    title: input.title,
    body: input.body,
    deepLink:
      input.deepLink ??
      `/seller/orders?id=${encodeURIComponent(input.donId)}`,
    data: { donId: input.donId, maDon: input.maDon },
  });
}

/** Push hoá đơn phí. */
export function firePushHoaDon(input: {
  userId: string;
  title: string;
  body: string;
}): void {
  firePush(input.userId, {
    loai: "hoa_don",
    title: input.title,
    body: input.body,
    deepLink: "/account/billing",
  });
}

/** Push nhắc mốc lớp / phòng. */
export function firePushMocLop(input: {
  userIds: string[];
  title: string;
  body: string;
  roomId: string;
  mocId: string;
}): void {
  firePushMany(input.userIds, {
    loai: "moc_lop",
    title: input.title,
    body: input.body,
    deepLink: `/chat?room=${encodeURIComponent(input.roomId)}`,
    data: { roomId: input.roomId, mocId: input.mocId },
  });
}

/**
 * Push tin nhắn mới tới thành viên khác trong phòng.
 * Gom nhóm mềm: cùng phòng+user trong 45s → bỏ (chống spam khi chat dồn).
 */
export function firePushTinNhanMoi(input: {
  roomId: string;
  senderId: string;
  recipientIds: string[];
  preview: string;
}): void {
  const now = Date.now();
  const preview = input.preview.trim().slice(0, 120) || "Tin nhắn mới";
  for (const uid of input.recipientIds) {
    if (!uid || uid === input.senderId) continue;
    const key = `${uid}:${input.roomId}`;
    const last = chatLastSent.get(key) ?? 0;
    if (now - last < CHAT_COALESCE_MS) continue;
    chatLastSent.set(key, now);
    firePush(uid, {
      loai: "tin_nhan",
      title: "Tin nhắn mới",
      body: preview,
      deepLink: `/chat?room=${encodeURIComponent(input.roomId)}`,
      data: { roomId: input.roomId },
    });
  }
  // dọn map thưa
  if (chatLastSent.size > 2000) {
    for (const [k, t] of chatLastSent) {
      if (now - t > CHAT_COALESCE_MS * 4) chatLastSent.delete(k);
    }
  }
}

/** Thành viên phòng còn active (trừ một id). */
export async function listRoomMemberIdsExcept(
  roomId: string,
  exceptUserId: string,
): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung")
    .eq("id_phong", roomId)
    .neq("id_nguoi_dung", exceptUserId);

  if (error) {
    console.error("[push/su-kien] listRoomMemberIdsExcept", error.message);
    return [];
  }
  return [
    ...new Set(
      (data ?? [])
        .map((r) => (r as { id_nguoi_dung?: string }).id_nguoi_dung)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

export async function listAllRoomMemberIds(roomId: string): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung")
    .eq("id_phong", roomId);

  if (error) {
    console.error("[push/su-kien] listAllRoomMemberIds", error.message);
    return [];
  }
  return [
    ...new Set(
      (data ?? [])
        .map((r) => (r as { id_nguoi_dung?: string }).id_nguoi_dung)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}
