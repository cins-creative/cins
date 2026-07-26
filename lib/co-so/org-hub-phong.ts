import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isCoSoStaffRole } from "@/lib/to-chuc/co-so-vai-tro";

export const ORG_ROOM = "1_org";
export const CSDT_HUB_CONTEXT = "csdt_hub";
const STAFF_CHAT_ROLE = "admin";
const STUDENT_CHAT_ROLE = "thanh_vien";

type EnsureResult =
  | { ok: true; roomId: string; created: boolean }
  | { ok: false; error: string };

/**
 * Phòng chat chung của CSĐT — mọi staff active + HV `dang_hoc`.
 * `loai_phong=1_org` + `loai_context=csdt_hub` (tách tư vấn `org_student`).
 */
export async function ensureOrgHubPhong(
  orgId: string,
): Promise<EnsureResult> {
  const admin = createServiceRoleClient();

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("id, ten, loai_to_chuc")
    .eq("id", orgId)
    .eq("loai_to_chuc", "co_so_dao_tao")
    .maybeSingle<{ id: string; ten: string; loai_to_chuc: string }>();

  if (!org?.id) {
    return { ok: false, error: "Không tìm thấy cơ sở đào tạo." };
  }

  const existing = await findOrgHubRoomId(admin, orgId);
  let roomId = existing;
  let created = false;

  if (!roomId) {
    const ten = (org.ten?.trim() || "Cơ sở đào tạo").slice(0, 120);
    const { data: room, error } = await admin
      .from("chat_phong")
      .insert({
        loai_phong: ORG_ROOM,
        loai_context: CSDT_HUB_CONTEXT,
        id_org_dai_dien: orgId,
        ten_phong: ten,
        trang_thai: "active",
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !room?.id) {
      // Race: unique index — thử lấy lại
      const again = await findOrgHubRoomId(admin, orgId);
      if (again) {
        roomId = again;
      } else {
        return {
          ok: false,
          error: error?.message ?? "Không tạo được phòng chat cơ sở.",
        };
      }
    } else {
      roomId = room.id;
      created = true;
    }
  } else {
    // Đồng bộ tên phòng với tên org hiện tại
    const ten = (org.ten?.trim() || "Cơ sở đào tạo").slice(0, 120);
    await admin
      .from("chat_phong")
      .update({ ten_phong: ten })
      .eq("id", roomId)
      .neq("ten_phong", ten);
  }

  await syncOrgHubMembership(orgId, roomId);
  return { ok: true, roomId, created };
}

export async function getOrgHubRoomId(
  orgId: string,
): Promise<string | null> {
  const admin = createServiceRoleClient();
  return findOrgHubRoomId(admin, orgId);
}

/** Map orgId → hub roomId cho nhiều org (list threads). */
export async function getOrgHubRoomIdsByOrg(
  orgIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (orgIds.length === 0) return map;
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("chat_phong")
    .select("id, id_org_dai_dien")
    .eq("loai_phong", ORG_ROOM)
    .eq("loai_context", CSDT_HUB_CONTEXT)
    .in("id_org_dai_dien", orgIds);
  for (const row of data ?? []) {
    const orgId = row.id_org_dai_dien as string | null;
    const id = row.id as string | null;
    if (orgId && id) map.set(orgId, id);
  }
  return map;
}

export async function isCsdtHubRoom(roomId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("chat_phong")
    .select("loai_phong, loai_context")
    .eq("id", roomId)
    .maybeSingle<{ loai_phong: string; loai_context: string | null }>();
  return (
    data?.loai_phong === ORG_ROOM && data.loai_context === CSDT_HUB_CONTEXT
  );
}

/**
 * Reconcile toàn bộ membership hub: staff active + HV dang_hoc.
 */
export async function syncOrgHubMembership(
  orgId: string,
  roomId?: string,
): Promise<{ joined: number; left: number }> {
  const admin = createServiceRoleClient();
  const hubId = roomId ?? (await findOrgHubRoomId(admin, orgId));
  if (!hubId) return { joined: 0, left: 0 };

  const [staffIds, studentIds] = await Promise.all([
    listActiveStaffUserIds(admin, orgId),
    listDangHocStudentUserIds(admin, orgId),
  ]);

  const shouldKeep = new Map<string, string>();
  for (const id of staffIds) shouldKeep.set(id, STAFF_CHAT_ROLE);
  for (const id of studentIds) {
    if (!shouldKeep.has(id)) shouldKeep.set(id, STUDENT_CHAT_ROLE);
  }

  const { data: members } = await admin
    .from("chat_thanh_vien")
    .select("id, id_nguoi_dung, vai_tro, roi_luc")
    .eq("id_phong", hubId);

  const activeByUser = new Map<
    string,
    { id: string; vai_tro: string | null }
  >();
  const leftRows: string[] = [];
  for (const m of members ?? []) {
    const uid = m.id_nguoi_dung as string;
    if (m.roi_luc) {
      leftRows.push(m.id as string);
      continue;
    }
    activeByUser.set(uid, {
      id: m.id as string,
      vai_tro: (m.vai_tro as string | null) ?? null,
    });
  }

  const now = new Date().toISOString();
  let left = 0;
  for (const [uid, row] of activeByUser) {
    if (shouldKeep.has(uid)) continue;
    await admin
      .from("chat_thanh_vien")
      .update({ roi_luc: now })
      .eq("id", row.id);
    left += 1;
  }

  const toInsert: Array<{
    id_phong: string;
    id_nguoi_dung: string;
    vai_tro: string;
  }> = [];

  for (const [uid, role] of shouldKeep) {
    const existing = activeByUser.get(uid);
    if (existing) {
      // Nâng HV lên admin nếu vừa thành staff
      if (
        role === STAFF_CHAT_ROLE &&
        existing.vai_tro !== STAFF_CHAT_ROLE
      ) {
        await admin
          .from("chat_thanh_vien")
          .update({ vai_tro: STAFF_CHAT_ROLE })
          .eq("id", existing.id);
      }
      continue;
    }
    // Có thể còn row đã rời — revive
    const { data: leftMem } = await admin
      .from("chat_thanh_vien")
      .select("id")
      .eq("id_phong", hubId)
      .eq("id_nguoi_dung", uid)
      .not("roi_luc", "is", null)
      .maybeSingle<{ id: string }>();
    if (leftMem?.id) {
      await admin
        .from("chat_thanh_vien")
        .update({ roi_luc: null, vai_tro: role })
        .eq("id", leftMem.id);
      continue;
    }
    toInsert.push({
      id_phong: hubId,
      id_nguoi_dung: uid,
      vai_tro: role,
    });
  }

  if (toInsert.length > 0) {
    await insertMembersBatched(admin, toInsert);
  }

  return { joined: toInsert.length, left };
}

/** Sync 1 user vào/ra hub theo quyền hiện tại. */
export async function syncUserOrgHubMembership(
  orgId: string,
  userId: string,
): Promise<void> {
  const ensured = await ensureOrgHubPhong(orgId);
  if (!ensured.ok) return;

  const admin = createServiceRoleClient();
  const role = await resolveHubRoleForUser(admin, orgId, userId);
  const { data: mem } = await admin
    .from("chat_thanh_vien")
    .select("id, roi_luc, vai_tro")
    .eq("id_phong", ensured.roomId)
    .eq("id_nguoi_dung", userId)
    .maybeSingle<{
      id: string;
      roi_luc: string | null;
      vai_tro: string | null;
    }>();

  if (!role) {
    if (mem?.id && !mem.roi_luc) {
      await admin
        .from("chat_thanh_vien")
        .update({ roi_luc: new Date().toISOString() })
        .eq("id", mem.id);
    }
    return;
  }

  if (mem?.id) {
    await admin
      .from("chat_thanh_vien")
      .update({ roi_luc: null, vai_tro: role })
      .eq("id", mem.id);
    return;
  }

  await admin.from("chat_thanh_vien").insert({
    id_phong: ensured.roomId,
    id_nguoi_dung: userId,
    vai_tro: role,
  });
}

async function findOrgHubRoomId(
  admin: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("chat_phong")
    .select("id")
    .eq("loai_phong", ORG_ROOM)
    .eq("loai_context", CSDT_HUB_CONTEXT)
    .eq("id_org_dai_dien", orgId)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

async function listActiveStaffUserIds(
  admin: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
): Promise<string[]> {
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_nguoi_dung, vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "active");
  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (!isCoSoStaffRole(row.vai_tro as string)) continue;
    const uid = row.id_nguoi_dung as string | null;
    if (uid) ids.add(uid);
  }
  return [...ids];
}

async function listDangHocStudentUserIds(
  admin: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
): Promise<string[]> {
  const { data: khoaRows } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id_to_chuc", orgId);
  const khoaIds = (khoaRows ?? []).map((k) => k.id as string);
  if (khoaIds.length === 0) return [];

  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id_nguoi_dung")
    .in("id_khoa_hoc", khoaIds)
    .eq("trang_thai", "dang_hoc");

  return [
    ...new Set(
      (hvl ?? [])
        .map((r) => r.id_nguoi_dung as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

async function resolveHubRoleForUser(
  admin: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
  userId: string,
): Promise<string | null> {
  const { data: membership } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "active");
  if ((membership ?? []).some((m) => isCoSoStaffRole(m.vai_tro as string))) {
    return STAFF_CHAT_ROLE;
  }

  const { data: khoaRows } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id_to_chuc", orgId);
  const khoaIds = (khoaRows ?? []).map((k) => k.id as string);
  if (khoaIds.length === 0) return null;

  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id")
    .eq("id_nguoi_dung", userId)
    .in("id_khoa_hoc", khoaIds)
    .eq("trang_thai", "dang_hoc")
    .limit(1)
    .maybeSingle();

  return hvl?.id ? STUDENT_CHAT_ROLE : null;
}

async function insertMembersBatched(
  admin: ReturnType<typeof createServiceRoleClient>,
  rows: Array<{ id_phong: string; id_nguoi_dung: string; vai_tro: string }>,
): Promise<void> {
  const CHUNK = 80;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await admin.from("chat_thanh_vien").insert(rows.slice(i, i + CHUNK));
  }
}
