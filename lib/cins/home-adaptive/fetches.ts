import "server-only";

import { getAvatarUrl } from "@/lib/journey/profile";
import { loadPendingCoSoStaffInvites } from "@/lib/to-chuc/co-so-staff-invite";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const TEACHER_ROLES = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "quan_ly_tuyen_sinh",
  "giao_vien",
] as const;

export type PendingVerifyItem = {
  requestId: string;
  userName: string;
  userSlug: string | null;
  title: string;
  orgName: string;
  submittedAt: string;
};

export type HocVienItem = {
  userId: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  khoaTen: string;
  milestoneHint: string;
};

export type KhoaHocGoiYItem = {
  id: string;
  slug: string;
  ten: string;
  orgSlug: string;
  orgTen: string;
  sub: string;
  /** Thumbnail khóa học — `avatar_id` (list thumb), fallback `cover_id`. */
  thumbnailUrl: string | null;
};

export type ScoutItem = {
  userId: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  sub: string;
};

export type LoiMoiXacNhanItem = {
  id: string;
  orgName: string;
  orgSlug: string;
  label: string;
  kind: "staff" | "verify";
};

/** Org mà viewer quản lý (dạy / admin). */
async function listManagedOrgIds(viewerId: string): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_to_chuc")
    .eq("id_nguoi_dung", viewerId)
    .eq("trang_thai", "active")
    .in("vai_tro", [...TEACHER_ROLES])
    .returns<Array<{ id_to_chuc: string }>>();

  return [...new Set((data ?? []).map((r) => r.id_to_chuc))];
}

/** DẠY · Hàng đợi verify_yeu_cau chờ org duyệt. */
export async function loadChoBanDuyet(
  viewerId: string,
  limit = 5,
): Promise<PendingVerifyItem[]> {
  const orgIds = await listManagedOrgIds(viewerId);
  if (orgIds.length === 0) return [];

  const admin = createServiceRoleClient();
  const { data: requests } = await admin
    .from("verify_yeu_cau")
    .select("id, tao_luc, id_cot_moc, id_to_chuc, nguoi_yeu_cau")
    .in("id_to_chuc", orgIds)
    .eq("trang_thai", "cho_xu_ly")
    .order("tao_luc", { ascending: false })
    .limit(limit);

  if (!requests?.length) return [];

  const cotIds = [...new Set(requests.map((r) => r.id_cot_moc as string))];
  const userIds = [...new Set(requests.map((r) => r.nguoi_yeu_cau as string))];
  const reqOrgIds = [...new Set(requests.map((r) => r.id_to_chuc as string))];

  const [{ data: cotRows }, { data: userRows }, { data: orgRows }] =
    await Promise.all([
      admin
        .from("content_cot_moc")
        .select("id, tieu_de")
        .in("id", cotIds),
      admin
        .from("user_nguoi_dung")
        .select("id, slug, ten_hien_thi")
        .in("id", userIds),
      admin.from("org_to_chuc").select("id, ten").in("id", reqOrgIds),
    ]);

  const cotById = new Map((cotRows ?? []).map((c) => [c.id as string, c]));
  const userById = new Map((userRows ?? []).map((u) => [u.id as string, u]));
  const orgById = new Map((orgRows ?? []).map((o) => [o.id as string, o]));

  return requests.map((r) => {
    const user = userById.get(r.nguoi_yeu_cau as string);
    const cot = cotById.get(r.id_cot_moc as string);
    const org = orgById.get(r.id_to_chuc as string);
    return {
      requestId: r.id as string,
      userName:
        (user?.ten_hien_thi as string | null)?.trim() ||
        (user?.slug as string | null)?.trim() ||
        "Học viên",
      userSlug: (user?.slug as string | null)?.trim() ?? null,
      title: (cot?.tieu_de as string | null)?.trim() || "Tác phẩm",
      orgName: (org?.ten as string | null)?.trim() || "Tổ chức",
      submittedAt: r.tao_luc as string,
    };
  });
}

/** DẠY · Học viên trong khóa của org viewer quản lý. */
export async function loadHocVienCuaBan(
  viewerId: string,
  limit = 5,
): Promise<HocVienItem[]> {
  const orgIds = await listManagedOrgIds(viewerId);
  if (orgIds.length === 0) return [];

  const admin = createServiceRoleClient();
  const { data: khoaRows } = await admin
    .from("org_khoa_hoc")
    .select("id, ten_khoa_hoc, id_to_chuc")
    .in("id_to_chuc", orgIds)
    .returns<Array<{ id: string; ten_khoa_hoc: string; id_to_chuc: string }>>();

  const khoaIds = (khoaRows ?? []).map((k) => k.id);
  if (khoaIds.length === 0) return [];

  const khoaTenById = new Map(
    (khoaRows ?? []).map((k) => [k.id, k.ten_khoa_hoc]),
  );

  const { data: hvRows } = await admin
    .from("user_hoc_vien_lop")
    .select("id_nguoi_dung, id_khoa_hoc")
    .in("id_khoa_hoc", khoaIds)
    .in("trang_thai", ["da_dang_ky", "dang_hoc"])
    .limit(limit * 3);

  const userIds = [
    ...new Set((hvRows ?? []).map((r) => r.id_nguoi_dung as string)),
  ].slice(0, limit);
  if (userIds.length === 0) return [];

  const { data: users } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", userIds);

  const { data: mocCounts } = await admin
    .from("content_cot_moc")
    .select("id_nguoi_dung")
    .in("id_nguoi_dung", userIds);

  const countByUser = new Map<string, number>();
  for (const row of mocCounts ?? []) {
    const uid = row.id_nguoi_dung as string;
    countByUser.set(uid, (countByUser.get(uid) ?? 0) + 1);
  }

  const khoaByUser = new Map<string, string>();
  for (const row of hvRows ?? []) {
    const uid = row.id_nguoi_dung as string;
    const kid = row.id_khoa_hoc as string;
    if (!khoaByUser.has(uid)) {
      khoaByUser.set(uid, khoaTenById.get(kid) ?? "Khóa học");
    }
  }

  const out: HocVienItem[] = [];
  for (const u of users ?? []) {
    if (!u.slug?.trim()) continue;
    const count = countByUser.get(u.id) ?? 0;
    out.push({
      userId: u.id,
      name: u.ten_hien_thi?.trim() || u.slug.trim(),
      slug: u.slug.trim(),
      avatarUrl: getAvatarUrl(u.avatar_id),
      khoaTen: khoaByUser.get(u.id) ?? "Khóa học",
      milestoneHint: `${count} cột mốc`,
    });
  }
  return out.slice(0, limit);
}

/** HỌC · Khóa học đang mở từ cơ sở đào tạo. */
export async function loadKhoaHocGoiY(limit = 4): Promise<KhoaHocGoiYItem[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_khoa_hoc")
    .select(
      `
      id,
      slug,
      ten_khoa_hoc,
      loai_mo_hinh,
      cover_id,
      avatar_id,
      org_to_chuc!inner(slug, ten, loai_to_chuc)
    `,
    )
    .in("trang_thai_khoa_hoc", ["sap_khai_giang", "dang_mo_don", "dang_hoc"])
    .order("ten_khoa_hoc", { ascending: true })
    .limit(limit);

  const out: KhoaHocGoiYItem[] = [];
  for (const row of data ?? []) {
    const r = row as {
      id: string;
      slug: string;
      ten_khoa_hoc: string;
      loai_mo_hinh: string;
      cover_id?: string | null;
      avatar_id?: string | null;
      org_to_chuc?: { slug?: string; ten?: string } | { slug?: string; ten?: string }[];
    };
    const org = Array.isArray(r.org_to_chuc) ? r.org_to_chuc[0] : r.org_to_chuc;
    if (!org?.slug?.trim()) continue;
    const sub =
      r.loai_mo_hinh === "lien_tuc_theo_thang"
        ? `${org.ten?.trim() ?? "Cơ sở"} · liên tục theo tháng`
        : `${org.ten?.trim() ?? "Cơ sở"} · cohort`;
    /* Khớp với KhoaHocCard: ưu tiên thumbnail (`avatar_id`) rồi mới tới banner
       (`cover_id`), để hình trong aside trùng với cover trên card khóa học. */
    const thumbnailUrl =
      resolveTruongImageSrcSync(r.avatar_id, ["public", "avatar", "medium"]) ??
      resolveTruongImageSrcSync(r.cover_id, ["public", "cover", "medium"]) ??
      null;
    out.push({
      id: r.id,
      slug: r.slug,
      ten: r.ten_khoa_hoc,
      orgSlug: org.slug.trim(),
      orgTen: org.ten?.trim() ?? "Cơ sở",
      sub,
      thumbnailUrl,
    });
  }
  return out;
}

/** LÀM · Lời mời xác nhận / tham gia org. */
export async function loadLoiMoiXacNhan(
  viewerId: string,
  limit = 4,
): Promise<LoiMoiXacNhanItem[]> {
  const out: LoiMoiXacNhanItem[] = [];

  const staffInvites = await loadPendingCoSoStaffInvites(viewerId, { limit });
  for (const inv of staffInvites) {
    out.push({
      id: inv.membershipId,
      orgName: inv.orgTen,
      orgSlug: inv.orgSlug,
      label: `${inv.inviterName} mời bạn — ${inv.vaiTroLabel}`,
      kind: "staff",
    });
  }

  const admin = createServiceRoleClient();
  const { data: verifyRows } = await admin
    .from("verify_xac_nhan")
    .select(
      `
      id,
      id_cot_moc,
      content_cot_moc:content_cot_moc!inner(tieu_de, id_nguoi_dung)
    `,
    )
    .eq("id_nguoi_xac_nhan", viewerId)
    .eq("trang_thai", "cho_duyet")
    .limit(limit);

  for (const row of verifyRows ?? []) {
    const r = row as {
      id: string;
      content_cot_moc?: { tieu_de?: string } | { tieu_de?: string }[];
    };
    const cm = Array.isArray(r.content_cot_moc)
      ? r.content_cot_moc[0]
      : r.content_cot_moc;
    out.push({
      id: r.id,
      orgName: "Xác nhận tác phẩm",
      orgSlug: "",
      label: cm?.tieu_de?.trim() || "Yêu cầu xác nhận",
      kind: "verify",
    });
    if (out.length >= limit) break;
  }

  return out.slice(0, limit);
}

/** DẠY · Scout tài năng — học viên nổi bật trong org viewer quản lý. */
export async function loadScoutTaiNang(
  viewerId: string,
  limit = 4,
): Promise<ScoutItem[]> {
  const orgIds = await listManagedOrgIds(viewerId);
  if (orgIds.length === 0) return [];

  const admin = createServiceRoleClient();
  const { data: khoaRows } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .in("id_to_chuc", orgIds);

  const khoaIds = (khoaRows ?? []).map((k) => k.id as string);
  if (khoaIds.length === 0) return [];

  const { data: hvRows } = await admin
    .from("user_hoc_vien_lop")
    .select("id_nguoi_dung")
    .in("id_khoa_hoc", khoaIds)
    .in("trang_thai", ["da_dang_ky", "dang_hoc"]);

  const userIds = [...new Set((hvRows ?? []).map((r) => r.id_nguoi_dung as string))];
  if (userIds.length === 0) return [];

  const { data: mocRows } = await admin
    .from("content_cot_moc")
    .select("id_nguoi_dung")
    .in("id_nguoi_dung", userIds)
    .neq("che_do_hien_thi", "cong_dong");

  const countByUser = new Map<string, number>();
  for (const row of mocRows ?? []) {
    const uid = row.id_nguoi_dung as string;
    countByUser.set(uid, (countByUser.get(uid) ?? 0) + 1);
  }

  const ranked = [...countByUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([uid]) => uid);

  if (ranked.length === 0) return [];

  const { data: users } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
    .in("id", ranked);

  const userById = new Map((users ?? []).map((u) => [u.id as string, u]));
  const out: ScoutItem[] = [];
  for (const uid of ranked) {
    const u = userById.get(uid);
    if (!u?.slug?.trim()) continue;
    const count = countByUser.get(uid) ?? 0;
    out.push({
      userId: uid,
      name: u.ten_hien_thi?.trim() || u.slug.trim(),
      slug: u.slug.trim(),
      avatarUrl: getAvatarUrl(u.avatar_id),
      sub: `${count} tác phẩm · ${u.giai_doan?.replace(/_/g, " ") ?? "học viên"}`,
    });
  }
  return out;
}
