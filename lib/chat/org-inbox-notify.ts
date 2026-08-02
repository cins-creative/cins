import "server-only";

import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import type { OrgTinNhanMoiNotification } from "@/lib/social/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ORG_ADMIN_ROLES } from "@/lib/truong/org-admin";

import {
  getActiveOrgMembershipVaiTro,
  loadOrgAdvisoryRoom,
} from "@/lib/chat/org-reply-perspective";

export const ORG_TIN_NHAN_MOI_LOAI = "org_tin_nhan_moi";

export type { OrgTinNhanMoiNotification };

type NotifyPayload = {
  orgId: string;
  orgTen: string;
  orgSlug: string;
  orgLoai: string;
  roomId: string;
  preview: string;
  senderName: string;
};

async function listOrgInboxAdminIds(
  admin: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
): Promise<string[]> {
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

async function loadSenderName(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
): Promise<string> {
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("ten_hien_thi, slug")
    .eq("id", userId)
    .maybeSingle<{ ten_hien_thi: string | null; slug: string | null }>();
  return data?.ten_hien_thi?.trim() || data?.slug?.trim() || "Người dùng";
}

/**
 * Coalesce 1 thông báo / admin / phòng khi HV gửi tin vào hộp thư org.
 * Bỏ qua nếu người gửi là staff inbox hoặc không phải phòng tư vấn.
 */
export async function notifyOrgAdminsOfStudentMessage(params: {
  roomId: string;
  senderId: string;
  messagePreview: string;
}): Promise<void> {
  const room = await loadOrgAdvisoryRoom(params.roomId);
  if (!room) return;

  /* Chỉ notify khi người gửi là phía học viên/khách của phòng. */
  if (room.studentUserId) {
    if (params.senderId !== room.studentUserId) return;
  } else {
    /* Không suy ra được student — bỏ qua nếu sender có membership admin. */
    const senderVaiTro = await getActiveOrgMembershipVaiTro(
      room.orgId,
      params.senderId,
    );
    if (
      senderVaiTro &&
      (ORG_ADMIN_ROLES as readonly string[]).includes(senderVaiTro)
    ) {
      return;
    }
  }

  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("id, ten, slug, loai_to_chuc")
    .eq("id", room.orgId)
    .maybeSingle<{
      id: string;
      ten: string | null;
      slug: string | null;
      loai_to_chuc: string | null;
    }>();
  if (!org?.id || !org.slug?.trim()) return;

  const recipients = (await listOrgInboxAdminIds(admin, room.orgId)).filter(
    (id) => id !== params.senderId,
  );
  if (recipients.length === 0) return;

  const senderName = await loadSenderName(admin, params.senderId);
  const preview = params.messagePreview.trim().slice(0, 160) || "Tin nhắn mới";
  const payload: NotifyPayload = {
    orgId: org.id,
    orgTen: org.ten?.trim() || "Tổ chức",
    orgSlug: org.slug.trim(),
    orgLoai: org.loai_to_chuc?.trim() || "studio",
    roomId: params.roomId,
    preview,
    senderName,
  };
  const body = JSON.stringify(payload);
  const ts = new Date().toISOString();

  await Promise.all(
    recipients.map(async (nguoiNhan) => {
      const { data: existing } = await admin
        .from("social_thong_bao")
        .select("id, da_doc")
        .eq("nguoi_nhan", nguoiNhan)
        .eq("loai_doi_tuong", ORG_TIN_NHAN_MOI_LOAI)
        .eq("id_doi_tuong", params.roomId)
        .maybeSingle<{ id: string; da_doc: boolean }>();

      if (existing?.id) {
        const { error } = await admin
          .from("social_thong_bao")
          .update({
            noi_dung: body,
            tao_luc: ts,
            da_doc: false,
          })
          .eq("id", existing.id);
        if (error) {
          console.error("[notifyOrgAdminsOfStudentMessage] update", error);
        }
        return;
      }

      const result = await insertSocialThongBao(admin, {
        nguoi_nhan: nguoiNhan,
        loai: "thong_tin",
        noi_dung: body,
        loai_doi_tuong: ORG_TIN_NHAN_MOI_LOAI,
        id_doi_tuong: params.roomId,
        da_doc: false,
      });
      if (!result.ok) {
        console.error("[notifyOrgAdminsOfStudentMessage]", result.error);
      }
    }),
  );
}

/** Đánh dấu đã đọc thông báo org_tin_nhan_moi của phòng (khi staff mở/đọc phòng). */
export async function markOrgInboxNotifyRead(params: {
  roomId: string;
  viewerId: string;
}): Promise<void> {
  const admin = createServiceRoleClient();
  await admin
    .from("social_thong_bao")
    .update({ da_doc: true })
    .eq("nguoi_nhan", params.viewerId)
    .eq("loai_doi_tuong", ORG_TIN_NHAN_MOI_LOAI)
    .eq("id_doi_tuong", params.roomId)
    .eq("da_doc", false);
}

function parsePayload(raw: string | null): NotifyPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<NotifyPayload>;
    if (
      typeof parsed.orgId !== "string" ||
      typeof parsed.roomId !== "string" ||
      typeof parsed.orgTen !== "string"
    ) {
      return null;
    }
    return {
      orgId: parsed.orgId,
      orgTen: parsed.orgTen,
      orgSlug: typeof parsed.orgSlug === "string" ? parsed.orgSlug : "",
      orgLoai: typeof parsed.orgLoai === "string" ? parsed.orgLoai : "studio",
      roomId: parsed.roomId,
      preview: typeof parsed.preview === "string" ? parsed.preview : "Tin nhắn mới",
      senderName:
        typeof parsed.senderName === "string" ? parsed.senderName : "Người dùng",
    };
  } catch {
    return null;
  }
}

export async function listOrgTinNhanMoiNotifications(
  viewerId: string,
  options: { unreadOnly?: boolean; historyOnly?: boolean; limit?: number } = {},
): Promise<OrgTinNhanMoiNotification[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  let query = admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, noi_dung, tao_luc, da_doc")
    .eq("nguoi_nhan", viewerId)
    .eq("loai_doi_tuong", ORG_TIN_NHAN_MOI_LOAI)
    .order("tao_luc", { ascending: false })
    .limit(rowLimit);

  if (options.unreadOnly) {
    query = query.eq("da_doc", false);
  } else if (options.historyOnly) {
    query = query.eq("da_doc", true);
  }

  const { data: rows } = await query;
  if (!rows?.length) return [];

  const items: OrgTinNhanMoiNotification[] = [];
  for (const row of rows) {
    const roomId = (row.id_doi_tuong as string | null) ?? null;
    const parsed = parsePayload(row.noi_dung as string | null);
    if (!roomId || !parsed) continue;
    items.push({
      notificationId: row.id as string,
      roomId,
      orgId: parsed.orgId,
      orgTen: parsed.orgTen,
      orgSlug: parsed.orgSlug,
      orgLoai: parsed.orgLoai,
      preview: parsed.preview,
      senderName: parsed.senderName,
      taoLuc: (row.tao_luc as string | null) ?? undefined,
      daDoc: Boolean(row.da_doc),
    });
  }
  return items;
}
