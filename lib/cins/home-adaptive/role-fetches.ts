import "server-only";

import { getAvatarUrl } from "@/lib/journey/profile";
import { fetchUserOrganizationsPage } from "@/lib/journey/user-orgs-fetch";
import { listOrgStaffInboxThreadsForViewer } from "@/lib/chat/org-message";
import { listPendingReceived } from "@/lib/social/ket-ban";
import {
  listDonHangForUser,
} from "@/lib/shop/don-hang";
import { listQuayCuaToi } from "@/lib/shop/quay";
import {
  SHOP_TRANG_THAI_DON_LABEL,
  SHOP_TRANG_THAI_QUAY_LABEL,
  type ShopTrangThaiDon,
} from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  isOrgQuanLyKind,
  orgQuanLyPath,
} from "@/lib/to-chuc/org-quan-ly-routes";
import { suKienManageHref } from "@/lib/to-chuc/su-kien-routes";
import type { HomeDonHangItem } from "@/lib/cins/home-adaptive/role-types";

export type { HomeDonHangItem } from "@/lib/cins/home-adaptive/role-types";

const STAFF_ROLES = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "quan_ly_tuyen_sinh",
  "giao_vien",
] as const;

const SELLER_ACTIONABLE: ShopTrangThaiDon[] = [
  "cho_xac_nhan",
  "cho_lay_hang",
  "da_nhan_tien",
];

const BUYER_ACTIVE: ShopTrangThaiDon[] = [
  "cho_xac_nhan",
  "da_nhan_tien",
  "cho_lay_hang",
  "dang_giao",
  "da_giao_tai_su_kien",
];

async function listManagedOrgIds(viewerId: string): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_to_chuc")
    .eq("id_nguoi_dung", viewerId)
    .eq("trang_thai", "active")
    .in("vai_tro", [...STAFF_ROLES])
    .returns<Array<{ id_to_chuc: string }>>();
  return [...new Set((data ?? []).map((r) => r.id_to_chuc))];
}

export type HomeQuayItem = {
  id: string;
  suKienTen: string;
  orgTen: string;
  trangThai: string;
  trangThaiLabel: string;
  href: string | null;
};

export type HomeSuKienQuanLyItem = {
  id: string;
  ten: string;
  batDau: string | null;
  soSeThamGia: number;
  soQuanTam: number;
  soChoDuyetQuay: number;
  slotToiDa: number | null;
  href: string;
  orgTen: string;
};

export type HomeOrgItem = {
  id: string;
  ten: string;
  vaiTroLabel: string;
  href: string | null;
  avatarUrl: string | null;
  loaiLabel: string;
};

export type HomeLoiMoiItem = {
  userId: string;
  name: string;
  slug: string | null;
  avatarUrl: string | null;
};

export type HomeSeThamGiaItem = {
  suKienId: string;
  ten: string;
  batDau: string | null;
  href: string;
  orgTen: string;
};

export type HomeUngTuyenItem = {
  jobId: string;
  tieuDe: string;
  orgTen: string;
  trangThai: string;
  trangThaiLabel: string;
  href: string | null;
  taoLuc: string;
};

export type HomeUngVienItem = {
  userId: string;
  name: string;
  slug: string | null;
  avatarUrl: string | null;
  jobTitle: string;
  href: string | null;
  taoLuc: string;
};

export type HomeOrgInboxItem = {
  roomId: string;
  name: string;
  preview: string;
  unread: number;
  orgTen: string | null;
  /** Avatar người nhắn (HV / khách). */
  avatarUrl: string | null;
  /** Avatar tổ chức nhận tin — phân biệt với chatbox cá nhân. */
  orgAvatarUrl: string | null;
  /** Trang QL tin nhắn org + `?room=` — null nếu thiếu slug/loại. */
  href: string | null;
};

export type HomeDaLuuItem = {
  id: string;
  title: string;
  loaiLabel: string;
  href: string | null;
};

/** Seller · đơn cần xử lý + count. */
export async function loadDonCanXuLy(
  viewerId: string,
  _limit = 3,
): Promise<{ items: HomeDonHangItem[]; total: number }> {
  const all = await listDonHangForUser(viewerId, "seller", 40).catch(() => []);
  const filtered = all.filter((d) =>
    SELLER_ACTIONABLE.includes(d.trangThai),
  );
  const mapped = filtered.map((d) => {
    const maDon = d.maDon ?? d.id.slice(0, 8);
    return {
      id: d.id,
      maDon,
      title: d.muaTen?.trim() || d.muaSlug || "Người mua",
      sub: maDon,
      trangThai: d.trangThai,
      trangThaiLabel: shortDonStatusLabel(d.trangThai),
      href: `/ban-hang/don?id=${d.id}`,
      avatarUrl: d.muaAvatarUrl ?? null,
      tongTien: d.tongTien,
      tienTe: d.tienTe,
      tongTienLabel: formatMoney(d.tongTien, d.tienTe),
      loaiDon: d.loaiDon ?? null,
    };
  });
  /* Không slice ở đây — client lọc theo trạng thái rồi mới cắt `limit`. */
  return { items: mapped, total: filtered.length };
}

/** Buyer · đơn đang theo dõi. */
export async function loadDonMuaCuaToi(
  viewerId: string,
  limit = 3,
): Promise<{ items: HomeDonHangItem[]; total: number }> {
  const all = await listDonHangForUser(viewerId, "buyer", 40).catch(() => []);
  const filtered = all.filter((d) => BUYER_ACTIVE.includes(d.trangThai));
  const items = filtered.slice(0, limit).map((d) => {
    const maDon = d.maDon ?? d.id.slice(0, 8);
    return {
      id: d.id,
      maDon,
      title: d.banTen?.trim() || d.banSlug || "Người bán",
      sub: maDon,
      trangThai: d.trangThai,
      trangThaiLabel: shortDonStatusLabel(d.trangThai),
      href: `/ban-hang/don?id=${d.id}`,
      avatarUrl: d.banAvatarUrl ?? null,
      tongTien: d.tongTien,
      tienTe: d.tienTe,
      tongTienLabel: formatMoney(d.tongTien, d.tienTe),
      loaiDon: d.loaiDon ?? null,
    };
  });
  return { items, total: filtered.length };
}

/** Quầy sự kiện tôi đã xin. */
export async function loadQuayCuaToiHome(
  viewerId: string,
  limit = 3,
): Promise<HomeQuayItem[]> {
  const rows = await listQuayCuaToi(viewerId).catch(() => []);
  return rows.slice(0, limit).map((q) => {
    const key = q.suKienSlug?.trim() || q.idSuKien;
    return {
      id: q.id,
      suKienTen: q.suKienTen?.trim() || "Sự kiện",
      orgTen: q.orgTen?.trim() || "",
      trangThai: q.trangThai,
      trangThaiLabel:
        SHOP_TRANG_THAI_QUAY_LABEL[q.trangThai] ?? q.trangThai,
      href: key ? `/su-kien/${encodeURIComponent(key)}` : null,
    };
  });
}

/** Admin · sự kiện sắp tới + stats RSVP/quầy (gộp, không N+1). */
export async function loadSuKienQuanLyTongQuan(
  viewerId: string,
  limit = 3,
): Promise<HomeSuKienQuanLyItem[]> {
  const orgIds = await listManagedOrgIds(viewerId);
  if (orgIds.length === 0) return [];

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: skRows } = await admin
    .from("org_su_kien")
    .select(
      "id, ten, slug, bat_dau, slot_toi_da, id_to_chuc, org_to_chuc(ten, slug, loai_to_chuc)",
    )
    .in("id_to_chuc", orgIds)
    .gte("bat_dau", now)
    .order("bat_dau", { ascending: true })
    .limit(limit);

  if (!skRows?.length) return [];

  const skIds = skRows.map((r) => r.id as string);

  const HUY = new Set(["tu_choi", "huy"]);
  const [{ data: phRows }, { data: quayRows }] = await Promise.all([
    admin
      .from("org_dang_ky_su_kien")
      .select("id_su_kien, loai_phan_hoi, trang_thai")
      .in("id_su_kien", skIds)
      .in("loai_phan_hoi", ["se_tham_gia", "quan_tam"])
      .returns<
        Array<{
          id_su_kien: string;
          loai_phan_hoi: string;
          trang_thai: string | null;
        }>
      >(),
    admin
      .from("shop_quay_su_kien")
      .select("id_su_kien, trang_thai")
      .in("id_su_kien", skIds)
      .eq("trang_thai", "cho_xu_ly")
      .returns<Array<{ id_su_kien: string; trang_thai: string }>>(),
  ]);

  const seBySk = new Map<string, number>();
  const qtBySk = new Map<string, number>();
  for (const r of phRows ?? []) {
    if (HUY.has(r.trang_thai ?? "")) continue;
    if (r.loai_phan_hoi === "se_tham_gia") {
      seBySk.set(r.id_su_kien, (seBySk.get(r.id_su_kien) ?? 0) + 1);
    } else if (r.loai_phan_hoi === "quan_tam") {
      qtBySk.set(r.id_su_kien, (qtBySk.get(r.id_su_kien) ?? 0) + 1);
    }
  }
  const quayBySk = new Map<string, number>();
  for (const r of quayRows ?? []) {
    quayBySk.set(r.id_su_kien, (quayBySk.get(r.id_su_kien) ?? 0) + 1);
  }

  return skRows.map((r) => {
    const orgRaw = r.org_to_chuc as
      | { ten?: string; slug?: string; loai_to_chuc?: string }
      | { ten?: string; slug?: string; loai_to_chuc?: string }[]
      | null;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    const slug = (r.slug as string | null)?.trim() || null;
    return {
      id: r.id as string,
      ten: (r.ten as string | null)?.trim() || "Sự kiện",
      batDau: (r.bat_dau as string | null) ?? null,
      soSeThamGia: seBySk.get(r.id as string) ?? 0,
      soQuanTam: qtBySk.get(r.id as string) ?? 0,
      soChoDuyetQuay: quayBySk.get(r.id as string) ?? 0,
      slotToiDa:
        typeof r.slot_toi_da === "number" && r.slot_toi_da > 0
          ? r.slot_toi_da
          : null,
      href: suKienManageHref(
        org?.loai_to_chuc ?? "",
        org?.slug ?? "",
        r.id as string,
        slug,
      ),
      orgTen: org?.ten?.trim() || "Tổ chức",
    };
  });
}

export async function loadToChucCuaBan(
  viewerId: string,
  limit = 3,
): Promise<HomeOrgItem[]> {
  const page = await fetchUserOrganizationsPage(viewerId).catch(() => ({
    memberships: [],
    totalCount: 0,
  }));
  return page.memberships.slice(0, limit).map((m) => ({
    id: m.org.id,
    ten: m.org.ten,
    vaiTroLabel: m.vaiTroLabel,
    href: m.org.href,
    avatarUrl: m.org.avatarUrl,
    loaiLabel: m.org.loaiLabel,
  }));
}

export async function loadLoiMoiKetBan(
  viewerId: string,
  limit = 3,
): Promise<HomeLoiMoiItem[]> {
  const rows = await listPendingReceived(viewerId, { limit }).catch(() => []);
  return rows.map((r) => ({
    userId: r.idNguoiDung,
    name: r.tenHienThi?.trim() || r.slug || "Người dùng",
    slug: r.slug,
    avatarUrl: r.avatarUrl,
  }));
}

export async function loadSeThamGia(
  viewerId: string,
  limit = 3,
): Promise<HomeSeThamGiaItem[]> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  const HUY = new Set(["tu_choi", "huy"]);
  const { data: rows } = await admin
    .from("org_dang_ky_su_kien")
    .select("id_su_kien, trang_thai")
    .eq("id_nguoi_dung", viewerId)
    .eq("loai_phan_hoi", "se_tham_gia")
    .limit(40)
    .returns<Array<{ id_su_kien: string; trang_thai: string | null }>>();

  const skIds = [
    ...new Set(
      (rows ?? [])
        .filter((r) => !HUY.has(r.trang_thai ?? ""))
        .map((r) => r.id_su_kien),
    ),
  ];
  if (skIds.length === 0) return [];

  const { data: skRows } = await admin
    .from("org_su_kien")
    .select(
      "id, ten, slug, bat_dau, org_to_chuc(ten)",
    )
    .in("id", skIds)
    .gte("bat_dau", now)
    .order("bat_dau", { ascending: true })
    .limit(limit);

  return (skRows ?? []).map((r) => {
    const orgRaw = r.org_to_chuc as
      | { ten?: string }
      | { ten?: string }[]
      | null;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    const key = (r.slug as string | null)?.trim() || (r.id as string);
    return {
      suKienId: r.id as string,
      ten: (r.ten as string | null)?.trim() || "Sự kiện",
      batDau: (r.bat_dau as string | null) ?? null,
      href: `/su-kien/${encodeURIComponent(key)}`,
      orgTen: org?.ten?.trim() || "",
    };
  });
}

export async function loadUngTuyenCuaToi(
  viewerId: string,
  limit = 3,
): Promise<HomeUngTuyenItem[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("org_tuyen_dung_ung_tuyen")
    .select(
      "id_tuyen_dung, trang_thai, tao_luc, org_tuyen_dung(id, tieu_de, slug, da_xoa, org_to_chuc(ten, slug, loai_to_chuc))",
    )
    .eq("id_nguoi_dung", viewerId)
    .order("tao_luc", { ascending: false })
    .limit(limit);

  const TRANG_THAI_LABEL: Record<string, string> = {
    moi: "Mới nộp",
    dang_xem: "Đang xem",
    phu_hop: "Phù hợp",
    tu_choi: "Từ chối",
    da_nhan: "Đã nhận",
  };

  return (rows ?? [])
    .map((r) => {
      const jobRaw = r.org_tuyen_dung as
        | {
            id?: string;
            tieu_de?: string;
            slug?: string | null;
            da_xoa?: boolean;
            org_to_chuc?:
              | { ten?: string; slug?: string; loai_to_chuc?: string }
              | { ten?: string; slug?: string; loai_to_chuc?: string }[]
              | null;
          }
        | {
            id?: string;
            tieu_de?: string;
            slug?: string | null;
            da_xoa?: boolean;
            org_to_chuc?:
              | { ten?: string; slug?: string; loai_to_chuc?: string }
              | { ten?: string; slug?: string; loai_to_chuc?: string }[]
              | null;
          }[]
        | null;
      const job = Array.isArray(jobRaw) ? jobRaw[0] : jobRaw;
      if (!job || job.da_xoa) return null;
      const orgRaw = job.org_to_chuc;
      const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
      const tt = (r.trang_thai as string) || "moi";
      const orgSlug = org?.slug?.trim();
      const jobSlug = job.slug?.trim() || job.id;
      let href: string | null = null;
      if (orgSlug && jobSlug) {
        const loai = org?.loai_to_chuc ?? "studio";
        if (loai === "studio" || loai === "doanh_nghiep") {
          href = `/studio/${encodeURIComponent(orgSlug)}/tuyen-dung/${encodeURIComponent(jobSlug)}`;
        } else {
          href = `/co-so/${encodeURIComponent(orgSlug)}`;
        }
      }
      return {
        jobId: (job.id as string) || (r.id_tuyen_dung as string),
        tieuDe: job.tieu_de?.trim() || "Tin tuyển dụng",
        orgTen: org?.ten?.trim() || "Tổ chức",
        trangThai: tt,
        trangThaiLabel: TRANG_THAI_LABEL[tt] ?? tt,
        href,
        taoLuc: r.tao_luc as string,
      };
    })
    .filter((x): x is HomeUngTuyenItem => x != null);
}

export async function loadUngVienMoi(
  viewerId: string,
  limit = 3,
): Promise<HomeUngVienItem[]> {
  const orgIds = await listManagedOrgIds(viewerId);
  if (orgIds.length === 0) return [];

  const admin = createServiceRoleClient();
  const { data: jobs } = await admin
    .from("org_tuyen_dung")
    .select("id, tieu_de, slug, id_to_chuc, org_to_chuc(slug, loai_to_chuc)")
    .in("id_to_chuc", orgIds)
    .eq("trang_thai", "dang_mo")
    .eq("da_xoa", false)
    .limit(30);

  if (!jobs?.length) return [];
  const jobIds = jobs.map((j) => j.id as string);
  const jobById = new Map(jobs.map((j) => [j.id as string, j]));

  const { data: apps } = await admin
    .from("org_tuyen_dung_ung_tuyen")
    .select("id_nguoi_dung, id_tuyen_dung, tao_luc")
    .in("id_tuyen_dung", jobIds)
    .eq("trang_thai", "moi")
    .order("tao_luc", { ascending: false })
    .limit(limit);

  if (!apps?.length) return [];

  const userIds = [...new Set(apps.map((a) => a.id_nguoi_dung as string))];
  const { data: users } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", userIds);

  const userById = new Map((users ?? []).map((u) => [u.id as string, u]));

  return apps.map((a) => {
    const u = userById.get(a.id_nguoi_dung as string);
    const job = jobById.get(a.id_tuyen_dung as string);
    const orgRaw = job?.org_to_chuc as
      | { slug?: string; loai_to_chuc?: string }
      | { slug?: string; loai_to_chuc?: string }[]
      | null
      | undefined;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    const name =
      (u?.ten_hien_thi as string | null)?.trim() ||
      (u?.slug as string | null)?.trim() ||
      "Ứng viên";
    let href: string | null = null;
    const orgSlug = org?.slug?.trim();
    const jobSlug = (job?.slug as string | null)?.trim() || (job?.id as string);
    if (orgSlug && jobSlug) {
      href = `/studio/${encodeURIComponent(orgSlug)}/quan-ly/tuyen-dung/${encodeURIComponent(jobSlug)}`;
    }
    return {
      userId: a.id_nguoi_dung as string,
      name,
      slug: (u?.slug as string | null)?.trim() ?? null,
      avatarUrl: getAvatarUrl(
        (u?.avatar_id as string | null | undefined) ?? null,
      ),
      jobTitle: (job?.tieu_de as string | null)?.trim() || "Tin tuyển dụng",
      href,
      taoLuc: a.tao_luc as string,
    };
  });
}

function orgInboxThreadHref(t: {
  roomId: string;
  orgSlug?: string;
  orgKind?: string;
}): string | null {
  const slug = t.orgSlug?.trim();
  if (!slug || !t.orgKind || !isOrgQuanLyKind(t.orgKind)) return null;
  const base = orgQuanLyPath(t.orgKind, slug, "tin-nhan");
  return `${base}?room=${encodeURIComponent(t.roomId)}`;
}

export async function loadOrgInboxHome(
  viewerId: string,
  limit = 3,
): Promise<HomeOrgInboxItem[]> {
  const threads = await listOrgStaffInboxThreadsForViewer(viewerId).catch(
    () => [],
  );
  return threads.slice(0, limit).map((t) => ({
    roomId: t.roomId,
    name: t.name,
    preview: t.preview,
    unread: t.unread,
    orgTen: t.orgTen ?? null,
    avatarUrl: t.avatarUrl ?? null,
    orgAvatarUrl: t.orgAvatarUrl ?? null,
    href: orgInboxThreadHref(t),
  }));
}

export async function loadDaLuu(
  viewerId: string,
  limit = 3,
): Promise<HomeDaLuuItem[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_luu")
    .select("id, id_doi_tuong, loai_doi_tuong, tao_luc")
    .eq("id_nguoi_dung", viewerId)
    .order("tao_luc", { ascending: false })
    .limit(limit)
    .returns<
      Array<{
        id: string;
        id_doi_tuong: string;
        loai_doi_tuong: string;
        tao_luc: string;
      }>
    >();

  if (!rows?.length) return [];

  const cotIds = rows
    .filter((r) => r.loai_doi_tuong === "cot_moc")
    .map((r) => r.id_doi_tuong);
  const titleByCot = new Map<string, string>();
  if (cotIds.length > 0) {
    const { data: cot } = await admin
      .from("content_cot_moc")
      .select("id, tieu_de")
      .in("id", cotIds);
    for (const c of cot ?? []) {
      titleByCot.set(
        c.id as string,
        (c.tieu_de as string | null)?.trim() || "Cột mốc",
      );
    }
  }

  const LOAI_LABEL: Record<string, string> = {
    cot_moc: "Cột mốc",
    org_bai_dang: "Bài đăng",
    org_tuyen_dung: "Tuyển dụng",
    org_khoa_hoc: "Khóa học",
  };

  return rows.map((r) => {
    const loaiLabel = LOAI_LABEL[r.loai_doi_tuong] ?? "Đã lưu";
    const title =
      r.loai_doi_tuong === "cot_moc"
        ? titleByCot.get(r.id_doi_tuong) || "Cột mốc"
        : loaiLabel;
    return {
      id: r.id,
      title,
      loaiLabel,
      href: null,
    };
  });
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency || "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("vi-VN")} ${currency || "đ"}`;
  }
}

/** Nhãn ngắn cho module home (sidebar hẹp). */
function shortDonStatusLabel(trangThai: ShopTrangThaiDon): string {
  switch (trangThai) {
    case "cho_xac_nhan":
      return "Chờ xác nhận";
    case "da_nhan_tien":
      return "Đã nhận tiền";
    case "cho_lay_hang":
      return "Chờ lấy hàng";
    case "dang_giao":
      return "Đang giao";
    case "da_giao_tai_su_kien":
      return "Giao tại SK";
    default:
      return SHOP_TRANG_THAI_DON_LABEL[trangThai] ?? trangThai;
  }
}
