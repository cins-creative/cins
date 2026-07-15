import "server-only";

import {
  canViewCongDongShell,
  parseCongDongCheDoFromCauHinh,
} from "@/lib/cong-dong/constants";
import { isThanhVien } from "@/lib/cong-dong/membership";
import {
  isCongDongCommunityRole,
  listingRoleLabel,
  type CongDongVaiTro,
} from "@/lib/cong-dong/vai-tro";
import type { CongDongRosterMember } from "@/lib/cong-dong/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const COMMUNITY_ROLES: CongDongVaiTro[] = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "thanh_vien",
];

const ROLE_RANK = new Map(
  COMMUNITY_ROLES.map((role, index) => [role, index] as const),
);

export const CONG_DONG_ROSTER_PAGE_SIZE = 40;

type MembershipRow = {
  id_nguoi_dung: string;
  vai_tro: string;
};

type UserRow = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

async function assertCanViewRoster(
  orgId: string,
  viewerId: string | null,
): Promise<{ ok: true } | { ok: false; status: 403 | 404; error: string }> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id, cau_hinh")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ id: string; cau_hinh: unknown }>();

  if (!data) {
    return { ok: false, status: 404, error: "Không tìm thấy cộng đồng." };
  }

  const cheDo = parseCongDongCheDoFromCauHinh(data.cau_hinh);
  const isActiveMember = viewerId
    ? await isThanhVien(viewerId, orgId)
    : false;

  if (!canViewCongDongShell(cheDo, isActiveMember)) {
    return {
      ok: false,
      status: 403,
      error: "Bạn không xem được danh sách thành viên.",
    };
  }

  return { ok: true };
}

function pickHighestRole(
  current: CongDongVaiTro | undefined,
  next: CongDongVaiTro,
): CongDongVaiTro {
  if (!current) return next;
  return (ROLE_RANK.get(next) ?? 99) < (ROLE_RANK.get(current) ?? 99)
    ? next
    : current;
}

/**
 * Danh sách thành viên active của cộng đồng (xem công khai theo shell).
 * Không gồm pending; không trả quyền chỉnh sửa.
 */
export async function listCongDongMemberRoster(params: {
  orgId: string;
  viewerId: string | null;
  limit?: number;
  offset?: number;
}): Promise<
  | {
      ok: true;
      members: CongDongRosterMember[];
      total: number;
      nextOffset: number | null;
    }
  | { ok: false; status: 403 | 404; error: string }
> {
  const access = await assertCanViewRoster(params.orgId, params.viewerId);
  if (!access.ok) return access;

  const limit = Math.min(
    Math.max(params.limit ?? CONG_DONG_ROSTER_PAGE_SIZE, 1),
    80,
  );
  const offset = Math.max(params.offset ?? 0, 0);

  const admin = createServiceRoleClient();
  const { data: memberRows, error } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_nguoi_dung, vai_tro")
    .eq("id_to_chuc", params.orgId)
    .eq("trang_thai", "active")
    .in("vai_tro", COMMUNITY_ROLES)
    .returns<MembershipRow[]>();

  if (error) {
    return { ok: false, status: 404, error: error.message };
  }

  const roleByUser = new Map<string, CongDongVaiTro>();
  for (const row of memberRows ?? []) {
    if (!isCongDongCommunityRole(row.vai_tro)) continue;
    const userId = row.id_nguoi_dung;
    if (!userId) continue;
    roleByUser.set(userId, pickHighestRole(roleByUser.get(userId), row.vai_tro));
  }

  const sortedIds = [...roleByUser.entries()]
    .sort((a, b) => {
      const roleDiff =
        (ROLE_RANK.get(a[1]) ?? 99) - (ROLE_RANK.get(b[1]) ?? 99);
      if (roleDiff !== 0) return roleDiff;
      return a[0].localeCompare(b[0]);
    })
    .map(([id]) => id);

  const total = sortedIds.length;
  const pageIds = sortedIds.slice(offset, offset + limit);
  if (pageIds.length === 0) {
    return { ok: true, members: [], total, nextOffset: null };
  }

  const { data: users } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", pageIds)
    .returns<UserRow[]>();

  const byId = new Map(
    (users ?? []).map((user) => [user.id, user] as const),
  );

  const members: CongDongRosterMember[] = [];
  for (const id of pageIds) {
    const user = byId.get(id);
    const vaiTro = roleByUser.get(id);
    if (!user?.slug || !vaiTro) continue;
    const name = user.ten_hien_thi?.trim() || user.slug;
    members.push({
      id: user.id,
      slug: user.slug,
      tenHienThi: name,
      avatarId: user.avatar_id,
      initial: name.charAt(0).toUpperCase(),
      vaiTro,
      vaiTroLabel: listingRoleLabel(vaiTro) ?? "Thành viên",
    });
  }

  members.sort((a, b) => {
    const roleDiff =
      (ROLE_RANK.get(a.vaiTro) ?? 99) - (ROLE_RANK.get(b.vaiTro) ?? 99);
    if (roleDiff !== 0) return roleDiff;
    return a.tenHienThi.localeCompare(b.tenHienThi, "vi");
  });

  const nextOffset = offset + limit < total ? offset + limit : null;
  return { ok: true, members, total, nextOffset };
}
