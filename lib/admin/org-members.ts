import "server-only";

import { assertDelegationPasswordForMutation } from "@/lib/admin/org-delegation";
import type {
  AdminOrgMember,
  AdminOrgMemberRoleOption,
  AdminOrgMembersPayload,
} from "@/lib/admin/org-members-types";
import {
  assignableRoleLabel as congDongRoleLabel,
  isCongDongCommunityRole,
} from "@/lib/cong-dong/vai-tro";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  coSoAssignableRoleLabel,
  coSoVaiTroLabel,
  isCoSoStaffRole,
  type CoSoStaffVaiTro,
} from "@/lib/to-chuc/co-so-vai-tro";

const LOAI_LABEL: Record<string, string> = {
  truong_dai_hoc: "Trường ĐH",
  co_so_dao_tao: "Cơ sở đào tạo",
  cong_dong: "Cộng đồng",
  studio: "Studio",
  doanh_nghiep: "Studio",
};

const STAFF_ASSIGNABLE: CoSoStaffVaiTro[] = [
  "owner",
  "admin",
  "quan_ly_tuyen_sinh",
  "quan_ly_noi_dung",
  "giao_vien",
  "nhan_vien",
];

const CONG_DONG_ASSIGNABLE = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "thanh_vien",
] as const;

type OrgMeta = {
  id: string;
  ten: string;
  slug: string;
  loai_to_chuc: string;
};

type MemberRow = {
  id: string;
  id_nguoi_dung: string;
  vai_tro: string;
  trang_thai: string;
  user_nguoi_dung:
    | {
        slug: string;
        ten_hien_thi: string | null;
        avatar_id: string | null;
      }
    | {
        slug: string;
        ten_hien_thi: string | null;
        avatar_id: string | null;
      }[]
    | null;
};

function memberProfile(row: MemberRow) {
  const raw = row.user_nguoi_dung;
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function normalizeLoai(loai: string): string {
  return loai === "doanh_nghiep" ? "studio" : loai;
}

function roleLabelForLoai(loai: string, vaiTro: string): string {
  if (loai === "cong_dong" && isCongDongCommunityRole(vaiTro)) {
    if (vaiTro === "owner") return "Chủ sở hữu";
    return congDongRoleLabel(vaiTro);
  }
  if (isCoSoStaffRole(vaiTro)) {
    if (vaiTro === "owner") return "Chủ sở hữu";
    return coSoAssignableRoleLabel(vaiTro);
  }
  return coSoVaiTroLabel(vaiTro);
}

export function getAssignableRolesForLoai(
  loai: string,
): AdminOrgMemberRoleOption[] {
  if (loai === "cong_dong") {
    return CONG_DONG_ASSIGNABLE.map((value) => ({
      value,
      label: roleLabelForLoai(loai, value),
    }));
  }
  return STAFF_ASSIGNABLE.map((value) => ({
    value,
    label: roleLabelForLoai(loai, value),
  }));
}

function isRoleValidForLoai(loai: string, vaiTro: string): boolean {
  return getAssignableRolesForLoai(loai).some((r) => r.value === vaiTro);
}

function mapMember(row: MemberRow, loai: string): AdminOrgMember | null {
  const profile = memberProfile(row);
  if (!profile?.slug) return null;
  return {
    id: row.id,
    userId: row.id_nguoi_dung,
    slug: profile.slug,
    tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
    avatarUrl: getAvatarUrl(profile.avatar_id),
    vaiTro: row.vai_tro,
    vaiTroLabel: roleLabelForLoai(loai, row.vai_tro),
    trangThai: row.trang_thai === "pending" ? "pending" : "active",
  };
}

async function loadOrgMeta(orgId: string): Promise<OrgMeta | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id, ten, slug, loai_to_chuc")
    .eq("id", orgId.trim())
    .neq("trang_thai_hoat_dong", "da_dong_cua")
    .maybeSingle<OrgMeta>();
  return data ?? null;
}

async function fetchMemberRows(orgId: string): Promise<MemberRow[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_thanh_vien_to_chuc")
    .select(
      "id, id_nguoi_dung, vai_tro, trang_thai, user_nguoi_dung: id_nguoi_dung ( slug, ten_hien_thi, avatar_id )",
    )
    .eq("id_to_chuc", orgId)
    .in("trang_thai", ["active", "pending"]);

  if (error) throw new Error(error.message);
  return (data ?? []) as MemberRow[];
}

export async function getAdminOrgMembersPayload(
  orgId: string,
): Promise<
  { ok: true; payload: AdminOrgMembersPayload } | { ok: false; error: string }
> {
  const org = await loadOrgMeta(orgId);
  if (!org) return { ok: false, error: "Không tìm thấy tổ chức." };

  const loai = normalizeLoai(org.loai_to_chuc);
  let rows: MemberRow[];
  try {
    rows = await fetchMemberRows(org.id);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không tải được thành viên.",
    };
  }

  const members = rows
    .map((row) => mapMember(row, loai))
    .filter(Boolean) as AdminOrgMember[];

  members.sort((a, b) => {
    const rank = (v: string) => {
      if (v === "owner") return 0;
      if (v === "admin") return 1;
      return 2;
    };
    const d = rank(a.vaiTro) - rank(b.vaiTro);
    if (d !== 0) return d;
    return a.tenHienThi.localeCompare(b.tenHienThi, "vi");
  });

  return {
    ok: true,
    payload: {
      orgId: org.id,
      orgTen: org.ten,
      orgSlug: org.slug,
      loai,
      loaiLabel: LOAI_LABEL[org.loai_to_chuc] ?? org.loai_to_chuc,
      assignableRoles: getAssignableRolesForLoai(loai),
      members,
    },
  };
}

async function countOwners(orgId: string): Promise<number> {
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id", { count: "exact", head: true })
    .eq("id_to_chuc", orgId)
    .eq("vai_tro", "owner")
    .in("trang_thai", ["active", "pending"]);
  return count ?? 0;
}

export async function addAdminOrgMember(params: {
  orgId: string;
  userId?: string;
  slug?: string;
  vaiTro: string;
  delegationPassword: string;
}): Promise<
  { ok: true; member: AdminOrgMember } | { ok: false; error: string }
> {
  const pwd = assertDelegationPasswordForMutation(params.delegationPassword);
  if (!pwd.ok) return pwd;

  const org = await loadOrgMeta(params.orgId);
  if (!org) return { ok: false, error: "Không tìm thấy tổ chức." };

  const loai = normalizeLoai(org.loai_to_chuc);
  const vaiTro = params.vaiTro.trim();
  if (!isRoleValidForLoai(loai, vaiTro)) {
    return { ok: false, error: "Vai trò không hợp lệ cho loại tổ chức này." };
  }

  if (vaiTro === "owner") {
    const owners = await countOwners(org.id);
    if (owners > 0) {
      return {
        ok: false,
        error: "Tổ chức đã có chủ sở hữu — dùng bàn giao quyền owner.",
      };
    }
  }

  const admin = createServiceRoleClient();
  let userId = params.userId?.trim();
  if (!userId && params.slug?.trim()) {
    const { data: profile } = await admin
      .from("user_nguoi_dung")
      .select("id")
      .eq("slug", params.slug.trim().toLowerCase())
      .maybeSingle<{ id: string }>();
    if (!profile?.id) {
      return { ok: false, error: "Không tìm thấy tài khoản với slug này." };
    }
    userId = profile.id;
  }

  if (!userId) {
    return { ok: false, error: "Thiếu userId hoặc slug." };
  }

  const { data: profile } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .eq("id", userId)
    .maybeSingle<{
      id: string;
      slug: string;
      ten_hien_thi: string | null;
      avatar_id: string | null;
    }>();

  if (!profile?.slug) {
    return { ok: false, error: "Không tìm thấy người dùng." };
  }

  const { data: existingRows } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id, vai_tro, trang_thai")
    .eq("id_to_chuc", org.id)
    .eq("id_nguoi_dung", userId);

  const existing = (existingRows ?? [])[0];
  if (existing) {
    const { error } = await admin
      .from("user_thanh_vien_to_chuc")
      .update({ vai_tro: vaiTro, trang_thai: "active" })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      member: {
        id: existing.id,
        userId: profile.id,
        slug: profile.slug,
        tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
        avatarUrl: getAvatarUrl(profile.avatar_id),
        vaiTro,
        vaiTroLabel: roleLabelForLoai(loai, vaiTro),
        trangThai: "active",
      },
    };
  }

  const { data: inserted, error } = await admin
    .from("user_thanh_vien_to_chuc")
    .insert({
      id_to_chuc: org.id,
      id_nguoi_dung: userId,
      vai_tro: vaiTro,
      trang_thai: "active",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Không thêm được thành viên." };
  }

  return {
    ok: true,
    member: {
      id: inserted.id,
      userId: profile.id,
      slug: profile.slug,
      tenHienThi: profile.ten_hien_thi?.trim() || profile.slug,
      avatarUrl: getAvatarUrl(profile.avatar_id),
      vaiTro,
      vaiTroLabel: roleLabelForLoai(loai, vaiTro),
      trangThai: "active",
    },
  };
}

export async function updateAdminOrgMemberRole(params: {
  orgId: string;
  membershipId: string;
  vaiTro: string;
  delegationPassword: string;
}): Promise<
  { ok: true; member: AdminOrgMember } | { ok: false; error: string }
> {
  const pwd = assertDelegationPasswordForMutation(params.delegationPassword);
  if (!pwd.ok) return pwd;

  const org = await loadOrgMeta(params.orgId);
  if (!org) return { ok: false, error: "Không tìm thấy tổ chức." };

  const loai = normalizeLoai(org.loai_to_chuc);
  const vaiTro = params.vaiTro.trim();
  if (!isRoleValidForLoai(loai, vaiTro)) {
    return { ok: false, error: "Vai trò không hợp lệ cho loại tổ chức này." };
  }

  if (vaiTro === "owner") {
    return {
      ok: false,
      error: "Không đổi trực tiếp thành owner — dùng bàn giao quyền.",
    };
  }

  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("user_thanh_vien_to_chuc")
    .select(
      "id, id_nguoi_dung, vai_tro, trang_thai, user_nguoi_dung: id_nguoi_dung ( slug, ten_hien_thi, avatar_id )",
    )
    .eq("id", params.membershipId)
    .eq("id_to_chuc", org.id)
    .maybeSingle<MemberRow>();

  if (!row) return { ok: false, error: "Không tìm thấy thành viên." };
  if (row.vai_tro === "owner") {
    return { ok: false, error: "Không thể đổi vai trò chủ sở hữu tại đây." };
  }

  const { error } = await admin
    .from("user_thanh_vien_to_chuc")
    .update({ vai_tro: vaiTro, trang_thai: "active" })
    .eq("id", row.id);

  if (error) return { ok: false, error: error.message };

  const member = mapMember({ ...row, vai_tro: vaiTro, trang_thai: "active" }, loai);
  if (!member) return { ok: false, error: "Không tải lại được thành viên." };
  return { ok: true, member };
}

export async function removeAdminOrgMember(params: {
  orgId: string;
  membershipId: string;
  delegationPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const pwd = assertDelegationPasswordForMutation(params.delegationPassword);
  if (!pwd.ok) return pwd;

  const org = await loadOrgMeta(params.orgId);
  if (!org) return { ok: false, error: "Không tìm thấy tổ chức." };

  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id, vai_tro")
    .eq("id", params.membershipId)
    .eq("id_to_chuc", org.id)
    .maybeSingle<{ id: string; vai_tro: string }>();

  if (!row) return { ok: false, error: "Không tìm thấy thành viên." };
  if (row.vai_tro === "owner") {
    return {
      ok: false,
      error: "Không gỡ chủ sở hữu — bàn giao cho người khác trước.",
    };
  }

  const { error } = await admin
    .from("user_thanh_vien_to_chuc")
    .delete()
    .eq("id", row.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function transferAdminOrgOwner(params: {
  orgId: string;
  membershipId: string;
  delegationPassword: string;
}): Promise<
  { ok: true; members: AdminOrgMember[] } | { ok: false; error: string }
> {
  const pwd = assertDelegationPasswordForMutation(params.delegationPassword);
  if (!pwd.ok) return pwd;

  const org = await loadOrgMeta(params.orgId);
  if (!org) return { ok: false, error: "Không tìm thấy tổ chức." };

  const loai = normalizeLoai(org.loai_to_chuc);
  const admin = createServiceRoleClient();

  const { data: target } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id, id_nguoi_dung, vai_tro, trang_thai")
    .eq("id", params.membershipId)
    .eq("id_to_chuc", org.id)
    .maybeSingle<{
      id: string;
      id_nguoi_dung: string;
      vai_tro: string;
      trang_thai: string;
    }>();

  if (!target) return { ok: false, error: "Không tìm thấy thành viên." };
  if (target.vai_tro === "owner") {
    return { ok: false, error: "Thành viên này đã là chủ sở hữu." };
  }
  if (target.trang_thai !== "active") {
    return { ok: false, error: "Chỉ bàn giao cho thành viên đang hoạt động." };
  }

  const demoteTo =
    loai === "cong_dong"
      ? "admin"
      : ("admin" as const);

  const { error: demoteError } = await admin
    .from("user_thanh_vien_to_chuc")
    .update({ vai_tro: demoteTo })
    .eq("id_to_chuc", org.id)
    .eq("vai_tro", "owner");
  if (demoteError) return { ok: false, error: demoteError.message };

  const { error: promoteError } = await admin
    .from("user_thanh_vien_to_chuc")
    .update({ vai_tro: "owner", trang_thai: "active" })
    .eq("id", target.id);
  if (promoteError) return { ok: false, error: promoteError.message };

  const payload = await getAdminOrgMembersPayload(org.id);
  if (!payload.ok) return payload;
  return { ok: true, members: payload.payload.members };
}

/** Owner hiện tại (membership) — dùng cột bảng admin. */
export async function fetchOrgOwnerSummaries(
  orgIds: string[],
): Promise<Map<string, { ten: string; slug: string | null }>> {
  const out = new Map<string, { ten: string; slug: string | null }>();
  if (orgIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select(
      "id_to_chuc, user_nguoi_dung: id_nguoi_dung ( slug, ten_hien_thi )",
    )
    .in("id_to_chuc", orgIds)
    .eq("vai_tro", "owner")
    .eq("trang_thai", "active")
    .limit(orgIds.length);

  for (const row of data ?? []) {
    const r = row as {
      id_to_chuc?: string;
      user_nguoi_dung?:
        | { slug: string | null; ten_hien_thi: string | null }
        | { slug: string | null; ten_hien_thi: string | null }[]
        | null;
    };
    if (!r.id_to_chuc) continue;
    const profile = Array.isArray(r.user_nguoi_dung)
      ? r.user_nguoi_dung[0]
      : r.user_nguoi_dung;
    if (!profile) continue;
    out.set(r.id_to_chuc, {
      ten: profile.ten_hien_thi?.trim() || profile.slug || "—",
      slug: profile.slug,
    });
  }

  return out;
}
