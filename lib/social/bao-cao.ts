import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import {
  LOAI_BAO_CAO_SET,
  labelLoaiBaoCao,
  type LoaiBaoCao,
  type TrangThaiBaoCao,
} from "@/lib/social/bao-cao-constants";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

export type BangChungItem = { loai: "anh" | "url"; value: string };

export type UserBrief = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarSrc: string | null;
};

export type CreateBaoCaoInput = {
  reporterId: string;
  loaiDoiTuong?: string;
  idDoiTuong: string;
  loaiBaoCao: string;
  tieuDe?: string | null;
  noiDung?: string | null;
  bangChung?: BangChungItem[];
};

export type CreateBaoCaoResult =
  | { ok: true; id: string; kenh: "admin" | "cong_dong"; daTonTai: boolean }
  | { ok: false; error: string };

function sanitizeBangChung(input: BangChungItem[] | undefined): BangChungItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((it) => it && it.loai === "anh")
    .map((it) => ({ loai: "anh" as const, value: String(it.value).trim() }))
    .filter((it) => it.value.length > 0)
    .slice(0, 8);
}

/** Tạo báo cáo nội dung. Route kênh dựa trên nguồn nội dung (cộng đồng → owner). */
export async function createBaoCao(
  input: CreateBaoCaoInput,
): Promise<CreateBaoCaoResult> {
  const loaiDoiTuong = (input.loaiDoiTuong ?? "cot_moc").trim();
  const idDoiTuong = input.idDoiTuong?.trim();
  if (!idDoiTuong) return { ok: false, error: "Thiếu nội dung cần báo cáo." };
  if (!LOAI_BAO_CAO_SET.has(input.loaiBaoCao)) {
    return { ok: false, error: "Loại báo cáo không hợp lệ." };
  }
  const noiDung = input.noiDung?.trim() || null;
  const tieuDe = input.tieuDe?.trim() || null;
  const bangChung = sanitizeBangChung(input.bangChung);

  const admin = createServiceRoleClient();

  /* v1 chỉ hỗ trợ báo cáo cột mốc — resolve chủ sở hữu + kênh xử lý. */
  let ownerId: string | null = null;
  let idCongDong: string | null = null;
  let kenh: "admin" | "cong_dong" = "admin";

  if (loaiDoiTuong === "cot_moc") {
    const { data: moc } = await admin
      .from("content_cot_moc")
      .select("id, id_nguoi_dung, id_to_chuc")
      .eq("id", idDoiTuong)
      .maybeSingle<{
        id: string;
        id_nguoi_dung: string;
        id_to_chuc: string | null;
      }>();
    if (!moc) return { ok: false, error: "Không tìm thấy nội dung." };
    ownerId = moc.id_nguoi_dung;
    if (ownerId === input.reporterId) {
      return { ok: false, error: "Bạn không thể báo cáo nội dung của chính mình." };
    }
    if (moc.id_to_chuc) {
      const { data: org } = await admin
        .from("org_to_chuc")
        .select("id, loai_to_chuc")
        .eq("id", moc.id_to_chuc)
        .maybeSingle<{ id: string; loai_to_chuc: string }>();
      if (org?.loai_to_chuc === "cong_dong") {
        kenh = "cong_dong";
        idCongDong = org.id;
      }
    }
  }

  const { data: inserted, error } = await admin
    .from("social_bao_cao")
    .insert({
      nguoi_bao_cao: input.reporterId,
      loai_doi_tuong: loaiDoiTuong,
      id_doi_tuong: idDoiTuong,
      id_chu_so_huu: ownerId,
      loai_bao_cao: input.loaiBaoCao,
      tieu_de: tieuDe,
      noi_dung: noiDung,
      bang_chung: bangChung,
      kenh,
      id_cong_dong: idCongDong,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    /* Unique (nguoi_bao_cao, loai_doi_tuong, id_doi_tuong) → đã báo cáo trước đó. */
    if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
      return { ok: true, id: "", kenh, daTonTai: true };
    }
    return { ok: false, error: error.message };
  }

  /* Cộng đồng → báo cho owner/admin cộng đồng xử lý. */
  if (kenh === "cong_dong" && idCongDong) {
    const { data: managers } = await admin
      .from("user_thanh_vien_to_chuc")
      .select("id_nguoi_dung")
      .eq("id_to_chuc", idCongDong)
      .in("vai_tro", ["owner", "admin"])
      .returns<Array<{ id_nguoi_dung: string }>>();
    for (const m of managers ?? []) {
      await insertSocialThongBao(admin, {
        nguoi_nhan: m.id_nguoi_dung,
        loai: "hanh_dong",
        noi_dung: `Có báo cáo mới (${labelLoaiBaoCao(input.loaiBaoCao)}) về một bài trong cộng đồng của bạn.`,
        loai_doi_tuong: "bao_cao_moi",
        id_doi_tuong: inserted.id,
      });
    }
  }

  return { ok: true, id: inserted.id, kenh, daTonTai: false };
}

/* ── Admin: group theo nội dung bị báo cáo ─────────────────────────────── */

export type BaoCaoGroup = {
  loaiDoiTuong: string;
  idDoiTuong: string;
  tongSo: number;
  soMoi: number;
  trangThai: TrangThaiBaoCao;
  breakdown: Array<{ loai: LoaiBaoCao; count: number }>;
  baoCaoMoiNhat: string;
  noiDungTieuDe: string | null;
  chuSoHuu: UserBrief | null;
};

type BaoCaoRow = {
  id: string;
  nguoi_bao_cao: string;
  loai_doi_tuong: string;
  id_doi_tuong: string;
  id_chu_so_huu: string | null;
  loai_bao_cao: LoaiBaoCao;
  tieu_de: string | null;
  noi_dung: string | null;
  bang_chung: BangChungItem[] | null;
  trang_thai: TrangThaiBaoCao;
  ket_qua_xu_ly: string | null;
  tao_luc: string;
  xu_ly_luc: string | null;
};

const STATUS_PRIORITY: Record<TrangThaiBaoCao, number> = {
  moi: 0,
  dang_xu_ly: 1,
  da_xu_ly: 2,
  bo_qua: 3,
};

async function fetchUserBriefs(
  admin: ReturnType<typeof createServiceRoleClient>,
  ids: string[],
): Promise<Map<string, UserBrief>> {
  const map = new Map<string, UserBrief>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return map;
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", unique)
    .returns<
      Array<{ id: string; slug: string; ten_hien_thi: string; avatar_id: string | null }>
    >();
  for (const u of data ?? []) {
    map.set(u.id, {
      id: u.id,
      slug: u.slug,
      tenHienThi: u.ten_hien_thi,
      avatarSrc: resolveTruongImageSrcSync(u.avatar_id, ["public", "avatar", "medium"]),
    });
  }
  return map;
}

/** Danh sách nhóm báo cáo cho admin (kênh 'admin'), sort theo số lượng giảm dần. */
export async function listBaoCaoGroupsForAdmin(): Promise<BaoCaoGroup[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("social_bao_cao")
    .select(
      "id, nguoi_bao_cao, loai_doi_tuong, id_doi_tuong, id_chu_so_huu, loai_bao_cao, trang_thai, tao_luc",
    )
    .eq("kenh", "admin")
    .order("tao_luc", { ascending: false })
    .returns<BaoCaoRow[]>();

  const rows = data ?? [];
  const groups = new Map<string, BaoCaoRow[]>();
  for (const r of rows) {
    const key = `${r.loai_doi_tuong}:${r.id_doi_tuong}`;
    const arr = groups.get(key);
    if (arr) arr.push(r);
    else groups.set(key, [r]);
  }

  const ownerIds = rows.map((r) => r.id_chu_so_huu ?? "").filter(Boolean);
  const cotMocIds = rows
    .filter((r) => r.loai_doi_tuong === "cot_moc")
    .map((r) => r.id_doi_tuong);

  const [ownerMap, mocTitleMap] = await Promise.all([
    fetchUserBriefs(admin, ownerIds),
    (async () => {
      const m = new Map<string, string>();
      const ids = [...new Set(cotMocIds)];
      if (ids.length === 0) return m;
      const { data: mocs } = await admin
        .from("content_cot_moc")
        .select("id, tieu_de")
        .in("id", ids)
        .returns<Array<{ id: string; tieu_de: string | null }>>();
      for (const mc of mocs ?? []) m.set(mc.id, mc.tieu_de ?? "");
      return m;
    })(),
  ]);

  const result: BaoCaoGroup[] = [];
  for (const [, arr] of groups) {
    const breakdownMap = new Map<LoaiBaoCao, number>();
    let soMoi = 0;
    let minStatus: TrangThaiBaoCao = "bo_qua";
    for (const r of arr) {
      breakdownMap.set(r.loai_bao_cao, (breakdownMap.get(r.loai_bao_cao) ?? 0) + 1);
      if (r.trang_thai === "moi") soMoi += 1;
      if (STATUS_PRIORITY[r.trang_thai] < STATUS_PRIORITY[minStatus]) {
        minStatus = r.trang_thai;
      }
    }
    const first = arr[0];
    result.push({
      loaiDoiTuong: first.loai_doi_tuong,
      idDoiTuong: first.id_doi_tuong,
      tongSo: arr.length,
      soMoi,
      trangThai: minStatus,
      breakdown: [...breakdownMap.entries()]
        .map(([loai, count]) => ({ loai, count }))
        .sort((a, b) => b.count - a.count),
      baoCaoMoiNhat: arr
        .map((r) => r.tao_luc)
        .sort()
        .at(-1)!,
      noiDungTieuDe:
        first.loai_doi_tuong === "cot_moc"
          ? mocTitleMap.get(first.id_doi_tuong) ?? null
          : null,
      chuSoHuu: first.id_chu_so_huu
        ? ownerMap.get(first.id_chu_so_huu) ?? null
        : null,
    });
  }

  result.sort(
    (a, b) =>
      b.tongSo - a.tongSo ||
      b.baoCaoMoiNhat.localeCompare(a.baoCaoMoiNhat),
  );
  return result;
}

export type BaoCaoDetailItem = {
  id: string;
  loaiBaoCao: LoaiBaoCao;
  tieuDe: string | null;
  noiDung: string | null;
  bangChung: BangChungItem[];
  trangThai: TrangThaiBaoCao;
  ketQuaXuLy: string | null;
  taoLuc: string;
  nguoiBaoCao: UserBrief | null;
};

/** Chi tiết các báo cáo về 1 nội dung. */
export async function listBaoCaoForTarget(
  loaiDoiTuong: string,
  idDoiTuong: string,
): Promise<BaoCaoDetailItem[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("social_bao_cao")
    .select(
      "id, nguoi_bao_cao, loai_bao_cao, tieu_de, noi_dung, bang_chung, trang_thai, ket_qua_xu_ly, tao_luc",
    )
    .eq("loai_doi_tuong", loaiDoiTuong)
    .eq("id_doi_tuong", idDoiTuong)
    .eq("kenh", "admin")
    .order("tao_luc", { ascending: false })
    .returns<BaoCaoRow[]>();

  const rows = data ?? [];
  const reporterMap = await fetchUserBriefs(
    admin,
    rows.map((r) => r.nguoi_bao_cao),
  );

  return rows.map((r) => ({
    id: r.id,
    loaiBaoCao: r.loai_bao_cao,
    tieuDe: r.tieu_de,
    noiDung: r.noi_dung,
    bangChung: Array.isArray(r.bang_chung) ? r.bang_chung : [],
    trangThai: r.trang_thai,
    ketQuaXuLy: r.ket_qua_xu_ly,
    taoLuc: r.tao_luc,
    nguoiBaoCao: reporterMap.get(r.nguoi_bao_cao) ?? null,
  }));
}

/** Xử lý cả nhóm báo cáo → cập nhật trạng thái + thông báo từng người báo cáo. */
export async function resolveBaoCaoGroup(params: {
  adminId: string;
  loaiDoiTuong: string;
  idDoiTuong: string;
  trangThai: Extract<TrangThaiBaoCao, "da_xu_ly" | "bo_qua" | "dang_xu_ly">;
  ketQua: string;
}): Promise<{ ok: true; soNguoiBaoCao: number } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  const { data: rows, error: selErr } = await admin
    .from("social_bao_cao")
    .select("id, nguoi_bao_cao")
    .eq("loai_doi_tuong", params.loaiDoiTuong)
    .eq("id_doi_tuong", params.idDoiTuong)
    .eq("kenh", "admin")
    .returns<Array<{ id: string; nguoi_bao_cao: string }>>();
  if (selErr) return { ok: false, error: selErr.message };
  if (!rows || rows.length === 0) {
    return { ok: false, error: "Không tìm thấy báo cáo." };
  }

  const xuLyLuc =
    params.trangThai === "dang_xu_ly" ? null : new Date().toISOString();
  const { error: updErr } = await admin
    .from("social_bao_cao")
    .update({
      trang_thai: params.trangThai,
      ket_qua_xu_ly: params.ketQua.trim() || null,
      nguoi_xu_ly: params.adminId,
      xu_ly_luc: xuLyLuc,
    })
    .eq("loai_doi_tuong", params.loaiDoiTuong)
    .eq("id_doi_tuong", params.idDoiTuong)
    .eq("kenh", "admin");
  if (updErr) return { ok: false, error: updErr.message };

  /* Thông báo lại người báo cáo (chỉ khi đã xử lý xong). */
  if (params.trangThai !== "dang_xu_ly") {
    const reporters = [...new Set(rows.map((r) => r.nguoi_bao_cao))];
    const ketQuaText = params.ketQua.trim() || "đã được xem xét";
    for (const r of rows) {
      await insertSocialThongBao(admin, {
        nguoi_nhan: r.nguoi_bao_cao,
        loai: "thong_tin",
        noi_dung: `Báo cáo của bạn đã được xử lý: ${ketQuaText}. Cảm ơn bạn đã góp phần giữ cộng đồng an toàn.`,
        loai_doi_tuong: "bao_cao_xu_ly",
        id_doi_tuong: r.id,
        xu_ly_luc: xuLyLuc,
      });
    }
    return { ok: true, soNguoiBaoCao: reporters.length };
  }

  return { ok: true, soNguoiBaoCao: 0 };
}
