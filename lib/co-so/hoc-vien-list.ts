import "server-only";

import {
  daysRemaining,
  type KyHocInterval,
  todayYmdVn,
} from "@/lib/co-so/ky-hoc";
import {
  isTrangThaiHienThiFilter,
  resolveTrangThaiHienThi,
  type TrangThaiHocVienHienThi,
} from "@/lib/co-so/hoc-vien-trang-thai";
import {
  getHocVienChoTtlNgay,
  purgeChoXuLyHetHan,
} from "@/lib/co-so/ghi-danh-xoa";
import {
  assertCoTheThemGhiDanh,
  CSDT_PHI_QUA_HAN,
} from "@/lib/co-so/phi-gate";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getAvatarUrl } from "@/lib/journey/profile";

export type HocVienEnrollmentRow = {
  hocVienLopId: string;
  /** Giá trị enum DB (`user_hoc_vien_lop.trang_thai`). */
  trangThai: string;
  /** 3 trạng thái hiển thị: Đang học / Hết kỳ học / Nghỉ. */
  trangThaiHienThi: TrangThaiHocVienHienThi;
  ngayDangKy: string;
  userId: string;
  tenHienThi: string;
  slug: string | null;
  avatarUrl: string | null;
  khoaId: string;
  tenKhoa: string;
  lopId: string | null;
  maLop: string | null;
  ngayCuoiKy: string | null;
  soNgayConLai: number;
  /** @deprecated dùng trangThaiHienThi === 'het_han' | 'nghi' */
  dangFreeze: boolean;
};

const PAGE_SIZE = 20;

/**
 * Tab danh sách:
 * - `hoc_vien`: đã có `org_ky_hoc` (đã đóng / xác nhận HP)
 * - `cho_xu_ly`: ghi danh chưa có kỳ nào — chờ thu học phí
 */
export type HocVienRosterTab = "hoc_vien" | "cho_xu_ly";

export async function listHocVienCuaOrg(
  orgId: string,
  opts?: {
    q?: string;
    page?: number;
    /** Lọc 1 khóa (quản lý catalog). */
    khoaId?: string;
    /** Lọc 1 lớp. */
    lopId?: string;
    /**
     * Lọc trạng thái — ưu tiên 3 trạng thái hiển thị
     * (`dang_hoc` | `het_han` | `nghi`); cũng nhận giá trị enum DB cũ.
     */
    trangThai?: string | string[];
    pageSize?: number;
    /** Tab đang xem (mặc định `hoc_vien`). */
    roster?: HocVienRosterTab;
  },
): Promise<{
  rows: HocVienEnrollmentRow[];
  total: number;
  page: number;
  /** Đếm 2 tab (sau filter khóa/lớp/tìm kiếm) để render nhãn tab. */
  totalHocVien: number;
  totalChoXuLy: number;
  /** TTL tự gỡ chờ xử lý (ngày); 0 = tắt. */
  choTtlNgay: number;
  /** Số ghi danh vừa bị lazy-purge trong lần gọi này. */
  purgedChoXuLy?: number;
}> {
  const choTtlNgay = await getHocVienChoTtlNgay(orgId);
  let purgedChoXuLy = 0;
  // Lazy-purge khi mở tab chờ xử lý (hoặc meta load) — không cần cron.
  if (opts?.roster === "cho_xu_ly" && choTtlNgay > 0) {
    purgedChoXuLy = await purgeChoXuLyHetHan(orgId, choTtlNgay);
  }

  const admin = createServiceRoleClient();
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(Math.max(opts?.pageSize ?? PAGE_SIZE, 1), 200);
  const q = opts?.q?.trim().toLowerCase() ?? "";
  const filterKhoaId = opts?.khoaId?.trim() || null;
  const filterLopId = opts?.lopId?.trim() || null;
  const trangThaiFilter = Array.isArray(opts?.trangThai)
    ? opts!.trangThai!.map((s) => s.trim()).filter(Boolean)
    : opts?.trangThai?.trim()
      ? [opts.trangThai.trim()]
      : [];
  const hienThiFilter = trangThaiFilter.filter(isTrangThaiHienThiFilter);
  const dbTrangThaiFilter = trangThaiFilter.filter(
    (s) => !isTrangThaiHienThiFilter(s),
  );

  let khoaQuery = admin
    .from("org_khoa_hoc")
    .select("id, ten_khoa_hoc")
    .eq("id_to_chuc", orgId);
  if (filterKhoaId) khoaQuery = khoaQuery.eq("id", filterKhoaId);

  const { data: khoaRows } = await khoaQuery;

  const khoaIds = (khoaRows ?? []).map((k) => k.id as string);
  if (khoaIds.length === 0) {
    return {
      rows: [],
      total: 0,
      page,
      totalHocVien: 0,
      totalChoXuLy: 0,
      choTtlNgay,
      purgedChoXuLy,
    };
  }

  const khoaTenById = new Map(
    (khoaRows ?? []).map((k) => [k.id as string, k.ten_khoa_hoc as string]),
  );

  let hvlQuery = admin
    .from("user_hoc_vien_lop")
    .select(
      "id, id_nguoi_dung, id_khoa_hoc, id_lop_hoc, trang_thai, ngay_dang_ky",
    )
    .in("id_khoa_hoc", khoaIds)
    .order("ngay_dang_ky", { ascending: false });
  // Chỉ lọc DB khi filter là enum cũ (không phải 3 trạng thái hiển thị).
  if (hienThiFilter.length === 0) {
    if (dbTrangThaiFilter.length === 1) {
      hvlQuery = hvlQuery.eq("trang_thai", dbTrangThaiFilter[0]!);
    } else if (dbTrangThaiFilter.length > 1) {
      hvlQuery = hvlQuery.in("trang_thai", dbTrangThaiFilter);
    }
  }
  if (filterLopId) {
    hvlQuery = hvlQuery.eq("id_lop_hoc", filterLopId);
  }

  const { data: hvlRows, error } = await hvlQuery;

  if (error) throw new Error(error.message);

  const all = hvlRows ?? [];
  const userIds = [...new Set(all.map((r) => r.id_nguoi_dung as string))];
  const lopIds = [
    ...new Set(
      all
        .map((r) => r.id_lop_hoc as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const hvlIds = all.map((r) => r.id as string);

  const [usersRes, lopRes, kyRes] = await Promise.all([
    userIds.length
      ? admin
          .from("user_nguoi_dung")
          .select("id, ten_hien_thi, slug, avatar_id")
          .in("id", userIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    lopIds.length
      ? admin.from("org_lop_hoc").select("id, ma_lop").in("id", lopIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    hvlIds.length
      ? admin
          .from("org_ky_hoc")
          .select("id, id_hoc_vien_lop, ngay_dau, ngay_cuoi")
          .in("id_hoc_vien_lop", hvlIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const userById = new Map(
    (usersRes.data ?? []).map((u) => [
      u.id as string,
      {
        ten: (u.ten_hien_thi as string) || "Học viên",
        slug: (u.slug as string | null) ?? null,
        avatarUrl: getAvatarUrl((u.avatar_id as string | null) ?? null),
      },
    ]),
  );
  const lopById = new Map(
    (lopRes.data ?? []).map((l) => [
      l.id as string,
      (l.ma_lop as string | null) ?? null,
    ]),
  );

  const kyByHvl = new Map<string, KyHocInterval[]>();
  for (const ky of kyRes.data ?? []) {
    const hvlId = ky.id_hoc_vien_lop as string;
    const list = kyByHvl.get(hvlId) ?? [];
    list.push({
      id: ky.id as string,
      ngayDau: ky.ngay_dau as string,
      ngayCuoi: ky.ngay_cuoi as string,
    });
    kyByHvl.set(hvlId, list);
  }

  const today = todayYmdVn();
  let mapped: HocVienEnrollmentRow[] = all.map((r) => {
    const hvlId = r.id as string;
    const userId = r.id_nguoi_dung as string;
    const user = userById.get(userId);
    const intervals = kyByHvl.get(hvlId) ?? [];
    const trangThaiDb = r.trang_thai as string;
    const trangThaiHienThi = resolveTrangThaiHienThi(
      trangThaiDb,
      intervals,
      today,
    );
    let ngayCuoiKy: string | null = null;
    for (const k of intervals) {
      if (!ngayCuoiKy || k.ngayCuoi > ngayCuoiKy) ngayCuoiKy = k.ngayCuoi;
    }
    return {
      hocVienLopId: hvlId,
      trangThai: trangThaiDb,
      trangThaiHienThi,
      ngayDangKy: r.ngay_dang_ky as string,
      userId,
      tenHienThi: user?.ten ?? "Học viên",
      slug: user?.slug ?? null,
      avatarUrl: user?.avatarUrl ?? null,
      khoaId: r.id_khoa_hoc as string,
      tenKhoa: khoaTenById.get(r.id_khoa_hoc as string) ?? "Khóa học",
      lopId: (r.id_lop_hoc as string | null) ?? null,
      maLop: r.id_lop_hoc
        ? (lopById.get(r.id_lop_hoc as string) ?? null)
        : null,
      ngayCuoiKy,
      soNgayConLai: daysRemaining(intervals, today),
      dangFreeze: trangThaiHienThi !== "dang_hoc",
    };
  });

  if (q) {
    mapped = mapped.filter(
      (row) =>
        row.tenHienThi.toLowerCase().includes(q) ||
        (row.slug?.toLowerCase().includes(q) ?? false) ||
        row.tenKhoa.toLowerCase().includes(q) ||
        (row.maLop?.toLowerCase().includes(q) ?? false),
    );
  }

  // Tab "Học viên" = đã có org_ky_hoc; tab "Chờ xử lý" = ghi danh chưa thu HP.
  const daCoKy = mapped.filter((row) => row.ngayCuoiKy != null);
  const choXuLy = mapped.filter((row) => row.ngayCuoiKy == null);

  let selected = opts?.roster === "cho_xu_ly" ? choXuLy : daCoKy;
  // Lọc 3 trạng thái hiển thị chỉ có nghĩa với HV đã có kỳ.
  if (hienThiFilter.length > 0 && opts?.roster !== "cho_xu_ly") {
    const want = new Set(hienThiFilter);
    selected = selected.filter((row) => want.has(row.trangThaiHienThi));
  }

  const total = selected.length;
  const from = (page - 1) * pageSize;
  const rows = selected.slice(from, from + pageSize);
  return {
    rows,
    total,
    page,
    totalHocVien: daCoKy.length,
    totalChoXuLy: choXuLy.length,
    choTtlNgay,
    purgedChoXuLy,
  };
}

export async function listGoiHocPhiOrg(orgId: string): Promise<
  Array<{ id: string; ten: string; soNgay: number; giaVnd: number }>
> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_goi_hoc_phi")
    .select("id, ten, so_ngay, gia_vnd")
    .eq("id_to_chuc", orgId)
    .eq("dang_ban", true)
    .order("thu_tu");
  return (data ?? []).map((g) => ({
    id: g.id as string,
    ten: g.ten as string,
    soNgay: g.so_ngay as number,
    giaVnd: Number(g.gia_vnd),
  }));
}

export async function listLopCuaOrg(orgId: string): Promise<
  Array<{
    id: string;
    maLop: string;
    khoaId: string;
    tenKhoa: string;
  }>
> {
  const admin = createServiceRoleClient();
  const { data: khoaRows } = await admin
    .from("org_khoa_hoc")
    .select("id, ten_khoa_hoc")
    .eq("id_to_chuc", orgId);
  const khoaIds = (khoaRows ?? []).map((k) => k.id as string);
  if (khoaIds.length === 0) return [];
  const tenById = new Map(
    (khoaRows ?? []).map((k) => [k.id as string, k.ten_khoa_hoc as string]),
  );
  const { data: lopRows } = await admin
    .from("org_lop_hoc")
    .select("id, ma_lop, id_khoa_hoc, trang_thai")
    .in("id_khoa_hoc", khoaIds)
    .in("trang_thai", ["sap_khai_giang", "dang_hoc"])
    .order("ngay_khai_giang", { ascending: false });
  return (lopRows ?? []).map((l) => ({
    id: l.id as string,
    maLop: (l.ma_lop as string) || "Lớp",
    khoaId: l.id_khoa_hoc as string,
    tenKhoa: tenById.get(l.id_khoa_hoc as string) ?? "Khóa",
  }));
}

/** Tìm user theo slug hoặc email (chính xác). */
export async function findUserForGhiDanh(
  query: string,
): Promise<{ id: string; tenHienThi: string; slug: string | null } | null> {
  const q = query.trim();
  if (!q) return null;
  const admin = createServiceRoleClient();
  const { data: bySlug } = await admin
    .from("user_nguoi_dung")
    .select("id, ten_hien_thi, slug")
    .ilike("slug", q)
    .maybeSingle();
  if (bySlug?.id) {
    return {
      id: bySlug.id as string,
      tenHienThi: bySlug.ten_hien_thi as string,
      slug: (bySlug.slug as string | null) ?? null,
    };
  }
  const { data: byEmail } = await admin
    .from("user_nguoi_dung")
    .select("id, ten_hien_thi, slug")
    .ilike("email_lien_he", q)
    .maybeSingle();
  if (!byEmail?.id) return null;
  return {
    id: byEmail.id as string,
    tenHienThi: byEmail.ten_hien_thi as string,
    slug: (byEmail.slug as string | null) ?? null,
  };
}

export async function createGhiDanh(input: {
  orgId: string;
  userId: string;
  khoaId: string;
  lopId?: string | null;
}): Promise<
  | { ok: true; hocVienLopId: string }
  | { ok: false; error: string; code?: typeof CSDT_PHI_QUA_HAN }
> {
  const admin = createServiceRoleClient();
  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id", input.khoaId)
    .eq("id_to_chuc", input.orgId)
    .maybeSingle();
  if (!khoa?.id) return { ok: false, error: "Khóa không thuộc cơ sở này." };

  if (input.lopId) {
    const { data: lop } = await admin
      .from("org_lop_hoc")
      .select("id")
      .eq("id", input.lopId)
      .eq("id_khoa_hoc", input.khoaId)
      .maybeSingle();
    if (!lop?.id) return { ok: false, error: "Lớp không thuộc khóa này." };
  }

  let existingId: string | null = null;
  if (input.lopId) {
    const { data: existing } = await admin
      .from("user_hoc_vien_lop")
      .select("id")
      .eq("id_nguoi_dung", input.userId)
      .eq("id_khoa_hoc", input.khoaId)
      .eq("id_lop_hoc", input.lopId)
      .maybeSingle();
    existingId = (existing?.id as string | undefined) ?? null;
  } else {
    const { data: existing } = await admin
      .from("user_hoc_vien_lop")
      .select("id")
      .eq("id_nguoi_dung", input.userId)
      .eq("id_khoa_hoc", input.khoaId)
      .is("id_lop_hoc", null)
      .maybeSingle();
    existingId = (existing?.id as string | undefined) ?? null;
  }

  if (existingId) {
    return { ok: true, hocVienLopId: existingId };
  }

  try {
    await assertCoTheThemGhiDanh(input.orgId);
  } catch (e) {
    if (e instanceof Error && e.message === CSDT_PHI_QUA_HAN) {
      return {
        ok: false,
        error:
          "Cơ sở đang nợ phí nền tảng quá hạn — không thể thêm ghi danh mới. Thanh toán tại Thanh toán (Cài đặt tài khoản).",
        code: CSDT_PHI_QUA_HAN,
      };
    }
    throw e;
  }

  const { data: inserted, error } = await admin
    .from("user_hoc_vien_lop")
    .insert({
      id_nguoi_dung: input.userId,
      id_khoa_hoc: input.khoaId,
      id_lop_hoc: input.lopId ?? null,
      trang_thai: "da_dang_ky",
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    // DB có UNIQUE (id_nguoi_dung, id_khoa_hoc): đua tạo ghi danh trùng khóa trả
    // 23505 → đổi thành thông báo tử tế thay vì lỗi thô lên UI.
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "23505") {
      return { ok: false, error: "Học viên đã được ghi danh khóa này." };
    }
    return { ok: false, error: error.message };
  }
  if (!inserted) {
    return { ok: false, error: "Không tạo ghi danh." };
  }
  return { ok: true, hocVienLopId: inserted.id };
}

/**
 * TV gán thủ công Nghỉ (`tam_nghi`), hoặc bỏ Nghỉ về `dang_hoc`
 * (hiển thị sẽ là Đang học / Hết kỳ học tùy còn ngày).
 * Đang học tự động khi xác nhận học phí — không gán tay qua API này.
 */
export async function updateHocVienTrangThaiManual(
  orgId: string,
  hvlId: string,
  next: "nghi" | "bo_nghi",
): Promise<{ ok: true; trangThai: string } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id, trang_thai, id_khoa_hoc")
    .eq("id", hvlId)
    .maybeSingle();
  if (!hvl?.id) return { ok: false, error: "Không tìm thấy ghi danh." };

  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id", hvl.id_khoa_hoc as string)
    .eq("id_to_chuc", orgId)
    .maybeSingle();
  if (!khoa?.id) return { ok: false, error: "Ghi danh không thuộc cơ sở này." };

  const trangThai = next === "nghi" ? "tam_nghi" : "dang_hoc";
  const { error } = await admin
    .from("user_hoc_vien_lop")
    .update({ trang_thai: trangThai })
    .eq("id", hvlId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, trangThai };
}
