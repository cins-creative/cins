import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type {
  GiaoTrinhBaiData,
  GiaoVienKhoaData,
  HinhThucLop,
  KhoaHocCardData,
  KhoaHocDetailPayload,
  LopHocDetailData,
  VisibilityGiaoTrinh,
} from "./khoa-hoc-types";
import { listKhoaHocCuaOrg } from "./khoa-hoc";

type LopRow = {
  id: string;
  ma_lop: string;
  hinh_thuc: HinhThucLop;
  lich_hoc?: string | null;
  ngay_khai_giang: string;
  slot_toi_da?: number | null;
  trang_thai: string;
  giao_vien_phu_trach?: string | null;
  giao_vien_text?: string | null;
};

type GiaoTrinhRow = {
  id: string;
  tieu_de: string;
  mo_ta_ngan: string | null;
  video_gioi_thieu_url: string | null;
  visibility: VisibilityGiaoTrinh;
  thu_tu?: number | null;
  so_buoi?: number | null;
  cap_nhat_luc: string;
};

type UserRow = {
  id: string;
  slug: string;
  ten_hien_thi: string;
};

const VISIBILITY_SET = new Set<string>(["public", "chi_hoc_vien", "private"]);
const LOP_OPEN = new Set(["sap_khai_giang", "dang_hoc"]);

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function mapGiaoVienText(
  key: string,
  ten: string,
  slug: string | null,
  verified: boolean,
  pendingProfile: boolean,
  vaiTro: string | null = null,
): GiaoVienKhoaData {
  return {
    key,
    ten,
    slug,
    verified,
    initials: initialsFromName(ten),
    vaiTro,
    pendingProfile,
  };
}

function giaoVienFromLop(
  row: LopRow,
  users: Map<string, UserRow>,
  verifiedIds: Set<string>,
): GiaoVienKhoaData {
  const userId = row.giao_vien_phu_trach ?? null;
  if (userId) {
    const user = users.get(userId);
    const ten = user?.ten_hien_thi ?? "Giảng viên";
    return mapGiaoVienText(
      userId,
      ten,
      user?.slug ?? null,
      verifiedIds.has(userId),
      false,
      verifiedIds.has(userId) ? "hồ sơ CINS" : null,
    );
  }
  const text = row.giao_vien_text?.trim();
  if (text) {
    return mapGiaoVienText(`text:${text}`, text, null, false, true, null);
  }
  return mapGiaoVienText(
    `lop:${row.id}`,
    "Đang cập nhật",
    null,
    false,
    false,
    null,
  );
}

function labelTenLop(maLop: string, index: number, tenKhoa: string): string {
  const trimmed = maLop.trim();
  if (trimmed && !/^\w+-\d{8}$/.test(trimmed)) return trimmed;
  return `${tenKhoa}${index > 0 ? ` ${index + 1}` : ""}`.trim();
}

async function fetchVerifiedUserIds(userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_cot_moc")
    .select("id_nguoi_dung")
    .in("id_nguoi_dung", userIds)
    .eq("trang_thai", "da_xac_nhan")
    .limit(500);
  const set = new Set<string>();
  for (const row of data ?? []) {
    const id = row.id_nguoi_dung as string | null;
    if (id) set.add(id);
  }
  return set;
}

async function fetchGiaoTrinh(khoaId: string): Promise<GiaoTrinhBaiData[]> {
  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin
    .from("org_giao_trinh")
    .select(
      "id, tieu_de, mo_ta_ngan, video_gioi_thieu_url, visibility, thu_tu, so_buoi, cap_nhat_luc",
    )
    .eq("id_khoa_hoc", khoaId)
    .order("thu_tu", { ascending: true });

  let list: GiaoTrinhRow[] = (rows ?? []) as GiaoTrinhRow[];

  if (error?.message?.includes("thu_tu")) {
    const fallback = await admin
      .from("org_giao_trinh")
      .select(
        "id, tieu_de, mo_ta_ngan, video_gioi_thieu_url, visibility, cap_nhat_luc",
      )
      .eq("id_khoa_hoc", khoaId)
      .order("cap_nhat_luc", { ascending: true });
    list = (fallback.data ?? []) as GiaoTrinhRow[];
  } else if (error) {
    return [];
  }

  return list
    .filter((row) => {
      const vis = row.visibility;
      return VISIBILITY_SET.has(vis) && vis !== "private";
    })
    .map((row, index) => ({
      id: row.id,
      thuTu: row.thu_tu ?? index + 1,
      tieuDe: row.tieu_de,
      moTaNgan: row.mo_ta_ngan,
      soBuoi: row.so_buoi ?? null,
      visibility: row.visibility,
      hasVideo: Boolean(row.video_gioi_thieu_url?.trim()),
    }));
}

async function fetchLopHocDetail(
  khoaId: string,
  tenKhoa: string,
  diaChiFallback: string | null,
): Promise<LopHocDetailData[]> {
  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin
    .from("org_lop_hoc")
    .select(
      "id, ma_lop, hinh_thuc, lich_hoc, ngay_khai_giang, slot_toi_da, trang_thai, giao_vien_phu_trach, giao_vien_text",
    )
    .eq("id_khoa_hoc", khoaId)
    .in("trang_thai", ["sap_khai_giang", "dang_hoc"])
    .order("ngay_khai_giang", { ascending: true });

  let list: LopRow[] = (rows ?? []) as LopRow[];

  if (error?.message?.includes("lich_hoc")) {
    const fallback = await admin
      .from("org_lop_hoc")
      .select(
        "id, ma_lop, hinh_thuc, ngay_khai_giang, slot_toi_da, trang_thai, giao_vien_phu_trach",
      )
      .eq("id_khoa_hoc", khoaId)
      .in("trang_thai", ["sap_khai_giang", "dang_hoc"])
      .order("ngay_khai_giang", { ascending: true });
    list = (fallback.data ?? []) as LopRow[];
  } else if (error) {
    return [];
  }

  const userIds = [
    ...new Set(
      list
        .map((r) => r.giao_vien_phu_trach)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const users = new Map<string, UserRow>();
  if (userIds.length) {
    const { data: userRows } = await admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi")
      .in("id", userIds);
    for (const u of userRows ?? []) {
      users.set(u.id as string, u as UserRow);
    }
  }

  const verifiedIds = await fetchVerifiedUserIds(userIds);

  return list.map((row, index) => {
    const conCho = LOP_OPEN.has(row.trang_thai);
    return {
      id: row.id,
      tenLop: labelTenLop(row.ma_lop, index, tenKhoa),
      hinhThuc: row.hinh_thuc,
      lichHoc: row.lich_hoc?.trim() || null,
      ngayKhaiGiang: row.ngay_khai_giang,
      slotToiDa: row.slot_toi_da ?? null,
      trangThaiLop: row.trang_thai,
      conCho,
      giaoVien: giaoVienFromLop(row, users, verifiedIds),
      diaChiHoc: diaChiFallback,
    };
  });
}

function distinctGiaoVien(lopHoc: LopHocDetailData[]): GiaoVienKhoaData[] {
  const seen = new Set<string>();
  const out: GiaoVienKhoaData[] = [];
  for (const lop of lopHoc) {
    if (seen.has(lop.giaoVien.key)) continue;
    if (lop.giaoVien.ten === "Đang cập nhật") continue;
    seen.add(lop.giaoVien.key);
    out.push(lop.giaoVien);
  }
  return out;
}

export async function fetchKhoaHocDetail(
  orgId: string,
  khoaId: string,
): Promise<
  { ok: true; detail: KhoaHocDetailPayload } | { ok: false; error: string }
> {
  const listResult = await listKhoaHocCuaOrg(orgId);
  if (!listResult.ok) {
    return { ok: false, error: listResult.error };
  }

  const khoa = listResult.khoaHoc.find((k) => k.id === khoaId);
  if (!khoa) {
    return { ok: false, error: "Không tìm thấy khóa học." };
  }

  const admin = createServiceRoleClient();
  const { data: orgRow } = await admin
    .from("org_to_chuc")
    .select("ten")
    .eq("id", orgId)
    .maybeSingle();

  const [giaoTrinh, lopHoc] = await Promise.all([
    fetchGiaoTrinh(khoaId),
    fetchLopHocDetail(khoaId, khoa.tenKhoaHoc, khoa.diaChiHoc),
  ]);

  return {
    ok: true,
    detail: {
      khoa,
      orgTen: (orgRow?.ten as string | undefined) ?? "",
      giaoTrinh,
      lopHoc,
      giaoVien: distinctGiaoVien(lopHoc),
    },
  };
}
