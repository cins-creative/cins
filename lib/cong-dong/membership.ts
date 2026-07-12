import "server-only";

import {
  congDongJoinMode,
  parseCongDongCheDoFromCauHinh,
  type CongDongCheDo,
} from "@/lib/cong-dong/constants";
import {
  pickCommunityVaiTro,
  type CongDongVaiTro,
} from "@/lib/cong-dong/vai-tro";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const PROTECTED_ROLES = new Set(["owner", "admin"]);

export type CongDongMembershipStatus = "none" | "pending" | "active";

export type JoinCongDongResult =
  | { ok: true; status: "active" | "pending" }
  | { ok: false; error: string };

async function loadOrgCheDo(orgId: string): Promise<CongDongCheDo | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ cau_hinh: unknown }>();
  if (!data) return null;
  return parseCongDongCheDoFromCauHinh(data.cau_hinh);
}

export async function getMembershipStatus(
  userId: string,
  orgId: string,
): Promise<CongDongMembershipStatus> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("trang_thai")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", userId)
    .in("trang_thai", ["active", "pending"])
    .returns<Array<{ trang_thai: string }>>();

  const rows = data ?? [];
  if (rows.length === 0) return "none";
  if (rows.some((r) => r.trang_thai === "active")) return "active";
  return "pending";
}

export async function getViewerVaiTroInOrg(
  userId: string,
  orgId: string,
): Promise<CongDongVaiTro | null> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "active");

  if (!rows?.length) return null;
  return pickCommunityVaiTro(rows.map((row) => row.vai_tro as string));
}

export async function loadAuthorOrgRoles(
  orgId: string,
  userIds: string[],
): Promise<Map<string, CongDongVaiTro | null>> {
  const out = new Map<string, CongDongVaiTro | null>();
  if (userIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const uniqueIds = [...new Set(userIds)];
  const { data: rows } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_nguoi_dung, vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "active")
    .in("id_nguoi_dung", uniqueIds);

  const byUser = new Map<string, string[]>();
  for (const row of rows ?? []) {
    const list = byUser.get(row.id_nguoi_dung) ?? [];
    list.push(row.vai_tro as string);
    byUser.set(row.id_nguoi_dung, list);
  }

  for (const userId of uniqueIds) {
    out.set(userId, pickCommunityVaiTro(byUser.get(userId) ?? []));
  }
  return out;
}

/** Thành viên active — pending không tính. */
export async function isThanhVien(
  userId: string,
  orgId: string,
): Promise<boolean> {
  return (await getMembershipStatus(userId, orgId)) === "active";
}

export async function isCongDongAdmin(
  userId: string,
  orgId: string,
): Promise<boolean> {
  // Chỉ membership (trục 2). Admin CINs không can thiệp cộng đồng (L23 hẹp).
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "active")
    .in("vai_tro", ["owner", "admin", "quan_ly_noi_dung"])
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Tham gia cộng đồng theo chế độ phòng (L27).
 * `asInvite: true` → luôn active (bỏ qua invite_only / request).
 */
export async function joinCongDong(
  userId: string,
  orgId: string,
  opts?: { asInvite?: boolean },
): Promise<JoinCongDongResult> {
  const status = await getMembershipStatus(userId, orgId);
  if (status === "active") return { ok: true, status: "active" };
  if (status === "pending" && !opts?.asInvite) {
    return { ok: true, status: "pending" };
  }

  const cheDo = await loadOrgCheDo(orgId);
  if (!cheDo) return { ok: false, error: "Không tìm thấy cộng đồng." };

  const admin = createServiceRoleClient();

  if (opts?.asInvite) {
    if (status === "pending") {
      const { error } = await admin
        .from("user_thanh_vien_to_chuc")
        .update({ trang_thai: "active", vai_tro: "thanh_vien" })
        .eq("id_to_chuc", orgId)
        .eq("id_nguoi_dung", userId)
        .eq("trang_thai", "pending");
      if (error) return { ok: false, error: error.message };
      return { ok: true, status: "active" };
    }
    const { error } = await admin.from("user_thanh_vien_to_chuc").insert({
      id_to_chuc: orgId,
      id_nguoi_dung: userId,
      vai_tro: "thanh_vien",
      trang_thai: "active",
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, status: "active" };
  }

  const mode = congDongJoinMode(cheDo);
  if (mode === "invite_only") {
    return {
      ok: false,
      error: "Cộng đồng bí mật — chỉ vào được qua lời mời.",
    };
  }

  const nextTrangThai = mode === "request" ? "pending" : "active";

  if (status === "pending" && nextTrangThai === "pending") {
    return { ok: true, status: "pending" };
  }

  const { error } = await admin.from("user_thanh_vien_to_chuc").insert({
    id_to_chuc: orgId,
    id_nguoi_dung: userId,
    vai_tro: "thanh_vien",
    trang_thai: nextTrangThai,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, status: nextTrangThai };
}

export async function leaveCongDong(
  userId: string,
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro, trang_thai")
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", userId);

  const list = rows ?? [];
  if (list.length === 0) return { ok: true };

  const activeRoles = list
    .filter((r) => r.trang_thai === "active")
    .map((r) => r.vai_tro as string);
  if (activeRoles.some((role) => PROTECTED_ROLES.has(role))) {
    return {
      ok: false,
      error: "Admin/owner không thể rời cộng đồng theo luồng này.",
    };
  }

  const { error } = await admin
    .from("user_thanh_vien_to_chuc")
    .delete()
    .eq("id_to_chuc", orgId)
    .eq("id_nguoi_dung", userId)
    .eq("vai_tro", "thanh_vien")
    .in("trang_thai", ["active", "pending"]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function countThanhVien(orgId: string): Promise<number> {
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id", { count: "exact", head: true })
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "active");
  return count ?? 0;
}
