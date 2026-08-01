/**
 * Tài khoản clone artist — tạo, vault mật khẩu, gán/bàn giao.
 * Plan: docs/PLAN_tai_khoan_clone.md
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { GiaiDoan } from "@/lib/auth/session";
import {
  coVaultMatKhau,
  giaiMaMatKhau,
  maHoaMatKhau,
  sinhMatKhauNgauNhien,
} from "@/lib/admin/mat-khau-vault";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{1,62}$/;
const GIAI_DOAN_OK: GiaiDoan[] = [
  "dang_hoc",
  "dang_lam",
  "tim_viec",
  "freelance",
  "dang_day",
];

function adminDb(): SupabaseClient {
  if (!hasServiceRoleEnv()) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY");
  }
  return createServiceRoleClient();
}

function chuanHoaLienKet(urls: string[] | string | null | undefined): string[] {
  const raw = Array.isArray(urls)
    ? urls
    : typeof urls === "string"
      ? urls.split(/[\n,]+/)
      : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of raw) {
    const s = String(u || "").trim();
    if (!s) continue;
    if (!/^https:\/\//i.test(s)) {
      throw new Error(`URL phải https:// — ${s.slice(0, 80)}`);
    }
    if (s.length > 500) throw new Error("URL quá dài (≤500).");
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length > 12) throw new Error("Tối đa 12 URL nguồn.");
  }
  return out;
}

async function ghiNhatKyMatKhau(
  db: SupabaseClient,
  idTaiKhoan: string,
  hanhDong: "xem" | "dat_lai" | "tao_moi",
  thucHienBoi: string | null,
): Promise<void> {
  await db.from("auto_nhat_ky_mat_khau").insert({
    id_tai_khoan: idTaiKhoan,
    hanh_dong: hanhDong,
    thuc_hien_boi: thucHienBoi,
  });
}

async function choProfileTheoAuth(
  db: SupabaseClient,
  authUserId: string,
  maxThu = 8,
): Promise<{ id: string; slug: string } | null> {
  for (let i = 0; i < maxThu; i++) {
    const { data } = await db
      .from("user_nguoi_dung")
      .select("id, slug")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (data?.id) return { id: data.id as string, slug: data.slug as string };
    await new Promise((r) => setTimeout(r, 150 + i * 50));
  }
  return null;
}

export type TaoCloneInput = {
  /** Bỏ trống → tự sinh từ tên hiển thị. */
  slug?: string;
  tenHienThi: string;
  tenThat?: string | null;
  giaiDoan?: GiaiDoan;
  lienKetNguon?: string[] | string | null;
  lienHe?: string | null;
  trangThaiXinPhep?:
    | "chua_lien_he"
    | "dang_cho"
    | "dong_y"
    | "tu_choi";
  ghiChu?: string | null;
  thucHienBoi?: string | null;
};

/** Slug từ tên: bỏ dấu, chỉ a-z0-9, ≥2 ký tự. */
function slugifyTuTen(ten: string): string {
  const base = ten
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  if (base.length >= 2 && SLUG_RE.test(base)) return base;
  return `nick${Date.now().toString(36).slice(-8)}`;
}

async function damBaoSlugTrong(
  db: SupabaseClient,
  muon: string,
): Promise<string> {
  let slug = muon;
  for (let i = 0; i < 12; i++) {
    const [{ data: u }, { data: t }] = await Promise.all([
      db.from("user_nguoi_dung").select("id").eq("slug", slug).maybeSingle(),
      db.from("auto_tai_khoan").select("id").eq("slug", slug).maybeSingle(),
    ]);
    if (!u && !t) return slug;
    const suffix = Math.random().toString(36).slice(2, 6);
    slug = `${muon.slice(0, 58)}${suffix}`.slice(0, 63);
  }
  throw new Error("Không sinh được slug trống — thử tên khác.");
}

export async function taoTaiKhoanClone(
  input: TaoCloneInput,
): Promise<{ id: string; slug: string; matKhau: string; email: string }> {
  if (!coVaultMatKhau()) {
    throw new Error(
      "Thiếu CINS_CLONE_PASSWORD_KEY — không tạo được tài khoản.",
    );
  }

  const tenHienThi = String(input.tenHienThi || "").trim();
  if (!tenHienThi || tenHienThi.length > 80) {
    throw new Error("Tên hiển thị bắt buộc (≤80).");
  }

  const db = adminDb();
  const slugNhap = String(input.slug || "")
    .trim()
    .toLowerCase();
  let slug: string;
  if (slugNhap) {
    if (!SLUG_RE.test(slugNhap)) {
      throw new Error("Slug không hợp lệ (a-z0-9, _, -, 2–63 ký tự).");
    }
    slug = await damBaoSlugTrong(db, slugNhap);
    if (slug !== slugNhap) {
      throw new Error(`Slug @${slugNhap} đã tồn tại.`);
    }
  } else {
    slug = await damBaoSlugTrong(
      db,
      slugifyTuTen(input.tenThat?.trim() || tenHienThi),
    );
  }

  const giaiDoan: GiaiDoan =
    input.giaiDoan && GIAI_DOAN_OK.includes(input.giaiDoan)
      ? input.giaiDoan
      : "dang_lam";
  const lienKet = chuanHoaLienKet(input.lienKetNguon);
  const xinPhep = input.trangThaiXinPhep || "chua_lien_he";

  const email = `${slug}@cins.vn`;

  const matKhau = sinhMatKhauNgauNhien(16);
  const vault = maHoaMatKhau(matKhau);

  const { data: created, error: authErr } = await db.auth.admin.createUser({
    email,
    password: matKhau,
    email_confirm: true,
    user_metadata: { ten_hien_thi: tenHienThi, seeding: true, loai: "clone" },
  });
  if (authErr || !created.user) {
    throw new Error(authErr?.message || "Không tạo được auth user.");
  }
  const authId = created.user.id;

  try {
    const profile = await choProfileTheoAuth(db, authId);
    if (!profile) {
      throw new Error("Profile chưa kịp tạo (trigger handle_new_user).");
    }

    const { error: upErr } = await db
      .from("user_nguoi_dung")
      .update({
        slug,
        ten_hien_thi: tenHienThi,
        giai_doan: giaiDoan,
      })
      .eq("id", profile.id);
    if (upErr) throw new Error(upErr.message);

    const { data: tk, error: tkErr } = await db
      .from("auto_tai_khoan")
      .insert({
        slug,
        id_nguoi_dung: profile.id,
        loai: "clone",
        niche: ["nguon:clone"],
        dang_bat: false,
        tuong_tac_bat: false,
        han_muc_ngay: 3,
        ten_that: input.tenThat?.trim() || null,
        lien_ket_nguon: lienKet,
        lien_he: input.lienHe?.trim() || null,
        trang_thai_xin_phep: xinPhep,
        ghi_chu: input.ghiChu?.trim() || null,
        mat_khau_ma_hoa: vault,
        mat_khau_doi_luc: new Date().toISOString(),
        trang_thai_ban_giao: "dang_van_hanh",
      })
      .select("id")
      .single();
    if (tkErr || !tk) throw new Error(tkErr?.message || "Không tạo roster.");

    await ghiNhatKyMatKhau(
      db,
      tk.id,
      "tao_moi",
      input.thucHienBoi || null,
    );

    return { id: tk.id, slug, matKhau, email };
  } catch (e) {
    await db.auth.admin.deleteUser(authId).catch(() => undefined);
    throw e;
  }
}

export async function capNhatTaiKhoanClone(params: {
  id: string;
  tenThat?: string | null;
  lienKetNguon?: string[] | string | null;
  lienHe?: string | null;
  trangThaiXinPhep?: string;
  bangChungDongY?: string | null;
  kpiNgay?: number | null;
  tamDung?: boolean;
  ghiChu?: string | null;
  tenHienThi?: string | null;
}): Promise<void> {
  const db = adminDb();
  const { data: tk, error } = await db
    .from("auto_tai_khoan")
    .select("id, id_nguoi_dung, loai")
    .eq("id", params.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!tk) throw new Error("Không tìm thấy tài khoản.");

  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (params.tenThat !== undefined) {
    patch.ten_that = params.tenThat?.trim() || null;
  }
  if (params.lienKetNguon !== undefined) {
    patch.lien_ket_nguon = chuanHoaLienKet(params.lienKetNguon);
  }
  if (params.lienHe !== undefined) {
    patch.lien_he = params.lienHe?.trim() || null;
  }
  if (params.trangThaiXinPhep !== undefined) {
    const ok = ["chua_lien_he", "dang_cho", "dong_y", "tu_choi"];
    if (!ok.includes(params.trangThaiXinPhep)) {
      throw new Error("trangThaiXinPhep không hợp lệ.");
    }
    patch.trang_thai_xin_phep = params.trangThaiXinPhep;
  }
  if (params.bangChungDongY !== undefined) {
    patch.bang_chung_dong_y = params.bangChungDongY?.trim() || null;
  }
  if (params.kpiNgay !== undefined) {
    if (params.kpiNgay === null) patch.kpi_ngay = null;
    else {
      patch.kpi_ngay = Math.min(50, Math.max(0, Math.floor(params.kpiNgay)));
    }
  }
  if (typeof params.tamDung === "boolean") patch.tam_dung = params.tamDung;
  if (params.ghiChu !== undefined) {
    patch.ghi_chu = params.ghiChu?.trim() || null;
  }

  const { error: upErr } = await db
    .from("auto_tai_khoan")
    .update(patch)
    .eq("id", params.id);
  if (upErr) throw new Error(upErr.message);

  if (params.tenHienThi?.trim() && tk.id_nguoi_dung) {
    await db
      .from("user_nguoi_dung")
      .update({ ten_hien_thi: params.tenHienThi.trim().slice(0, 80) })
      .eq("id", tk.id_nguoi_dung);
  }
}

export async function hienMatKhauTaiKhoan(params: {
  id: string;
  thucHienBoi: string | null;
}): Promise<{ matKhau: string; slug: string }> {
  if (!coVaultMatKhau()) {
    throw new Error("Thiếu CINS_CLONE_PASSWORD_KEY.");
  }
  const db = adminDb();
  const { data, error } = await db
    .from("auto_tai_khoan")
    .select("id, slug, mat_khau_ma_hoa")
    .eq("id", params.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Không tìm thấy tài khoản.");
  if (!data.mat_khau_ma_hoa) {
    throw new Error(
      "Chưa có mật khẩu trong vault — bấm «Đặt lại mật khẩu».",
    );
  }
  const matKhau = giaiMaMatKhau(data.mat_khau_ma_hoa);
  await ghiNhatKyMatKhau(db, data.id, "xem", params.thucHienBoi);
  return { matKhau, slug: data.slug };
}

export async function datLaiMatKhauTaiKhoan(params: {
  id: string;
  thucHienBoi: string | null;
}): Promise<{ matKhau: string; slug: string }> {
  if (!coVaultMatKhau()) {
    throw new Error("Thiếu CINS_CLONE_PASSWORD_KEY.");
  }
  const db = adminDb();
  const { data: tk, error } = await db
    .from("auto_tai_khoan")
    .select("id, slug, id_nguoi_dung")
    .eq("id", params.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!tk?.id_nguoi_dung) throw new Error("Tài khoản chưa map user.");

  const { data: profile } = await db
    .from("user_nguoi_dung")
    .select("auth_user_id")
    .eq("id", tk.id_nguoi_dung)
    .maybeSingle();
  if (!profile?.auth_user_id) throw new Error("Thiếu auth_user_id.");

  const matKhau = sinhMatKhauNgauNhien(16);
  const vault = maHoaMatKhau(matKhau);

  const { error: authErr } = await db.auth.admin.updateUserById(
    profile.auth_user_id,
    { password: matKhau },
  );
  if (authErr) throw new Error(authErr.message);

  const { error: upErr } = await db
    .from("auto_tai_khoan")
    .update({
      mat_khau_ma_hoa: vault,
      mat_khau_doi_luc: new Date().toISOString(),
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", tk.id);
  if (upErr) throw new Error(upErr.message);

  await ghiNhatKyMatKhau(db, tk.id, "dat_lai", params.thucHienBoi);
  return { matKhau, slug: tk.slug };
}

export type KiemTraTrongResult = {
  trong: boolean;
  vuong: string[];
  profile: {
    id: string;
    slug: string;
    tenHienThi: string | null;
    email: string | null;
  };
};

export async function kiemTraTaiKhoanDichTrong(
  query: string,
): Promise<KiemTraTrongResult> {
  const q = String(query || "").trim();
  if (!q) throw new Error("Nhập email hoặc slug tài khoản đích.");

  const db = adminDb();
  let profile: {
    id: string;
    slug: string;
    ten_hien_thi: string | null;
    auth_user_id: string | null;
  } | null = null;

  if (q.includes("@")) {
    const { data: list } = await db.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const auth = (list?.users || []).find(
      (u) => u.email?.toLowerCase() === q.toLowerCase(),
    );
    if (!auth) throw new Error(`Không tìm thấy auth user ${q}.`);
    const { data } = await db
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, auth_user_id")
      .eq("auth_user_id", auth.id)
      .maybeSingle();
    profile = data;
  } else {
    const slug = q.replace(/^@/, "").toLowerCase();
    const { data } = await db
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, auth_user_id")
      .eq("slug", slug)
      .maybeSingle();
    profile = data;
  }

  if (!profile) throw new Error("Không tìm thấy profile đích.");

  const id = profile.id;
  const vuong: string[] = [];

  const checks: Array<{
    label: string;
    p: PromiseLike<{ count: number | null }>;
  }> = [
      {
        label: "content_cot_moc",
        p: db
          .from("content_cot_moc")
          .select("id", { count: "exact", head: true })
          .eq("id_nguoi_dung", id)
          .then((r) => ({ count: r.count })),
      },
      {
        label: "content_tac_pham",
        p: db
          .from("content_tac_pham")
          .select("id", { count: "exact", head: true })
          .eq("id_nguoi_dung", id)
          .then((r) => ({ count: r.count })),
      },
      {
        label: "shop_cua_hang",
        p: db
          .from("shop_cua_hang")
          .select("id", { count: "exact", head: true })
          .eq("id_nguoi_dung", id)
          .then((r) => ({ count: r.count })),
      },
      {
        label: "user_thanh_vien_to_chuc",
        p: db
          .from("user_thanh_vien_to_chuc")
          .select("id", { count: "exact", head: true })
          .eq("id_nguoi_dung", id)
          .then((r) => ({ count: r.count })),
      },
      {
        label: "org_to_chuc.nguoi_tao",
        p: db
          .from("org_to_chuc")
          .select("id", { count: "exact", head: true })
          .eq("nguoi_tao", id)
          .then((r) => ({ count: r.count })),
      },
    ];

  const results = await Promise.all(checks.map((c) => c.p));
  for (let i = 0; i < checks.length; i++) {
    const n = results[i]?.count ?? 0;
    if (n > 0) vuong.push(`${checks[i]!.label} (${n})`);
  }

  const { data: quyen } = await db
    .from("user_quyen_he_thong")
    .select("vai_tro")
    .eq("id_nguoi_dung", id)
    .maybeSingle();
  if (
    quyen?.vai_tro &&
    ["admin", "super_admin", "curator"].includes(String(quyen.vai_tro))
  ) {
    vuong.push(`user_quyen_he_thong (${quyen.vai_tro})`);
  }

  let email: string | null = null;
  if (profile.auth_user_id) {
    const { data: authUser } = await db.auth.admin.getUserById(
      profile.auth_user_id,
    );
    email = authUser.user?.email ?? null;
  }

  return {
    trong: vuong.length === 0,
    vuong,
    profile: {
      id: profile.id,
      slug: profile.slug,
      tenHienThi: profile.ten_hien_thi,
      email,
    },
  };
}

export async function ganTaiKhoanDich(params: {
  idTaiKhoan: string;
  queryDich: string;
}): Promise<{
  idNguoiDungDich: string;
  slugDich: string;
  emailDich: string | null;
  soCotMoc: number;
}> {
  const db = adminDb();
  const { data: tk, error } = await db
    .from("auto_tai_khoan")
    .select("id, loai, id_nguoi_dung, slug")
    .eq("id", params.idTaiKhoan)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!tk) throw new Error("Không tìm thấy tài khoản.");
  /* Mọi nick seeding đều bàn giao được (up tay, không bot). */
  if (!tk.id_nguoi_dung) throw new Error("Nick chưa map user.");

  const check = await kiemTraTaiKhoanDichTrong(params.queryDich);
  if (!check.trong) {
    throw new Error(
      `Tài khoản đích chưa trống: ${check.vuong.join(", ")}`,
    );
  }
  if (check.profile.id === tk.id_nguoi_dung) {
    throw new Error("Không thể gán chính tài khoản clone.");
  }

  const { count } = await db
    .from("content_cot_moc")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_dung", tk.id_nguoi_dung);

  const { error: upErr } = await db
    .from("auto_tai_khoan")
    .update({
      id_nguoi_dung_dich: check.profile.id,
      trang_thai_ban_giao: "cho_ban_giao",
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", tk.id);
  if (upErr) throw new Error(upErr.message);

  return {
    idNguoiDungDich: check.profile.id,
    slugDich: check.profile.slug,
    emailDich: check.profile.email,
    soCotMoc: count ?? 0,
  };
}

export async function huyGanTaiKhoanDich(idTaiKhoan: string): Promise<void> {
  const db = adminDb();
  const { error } = await db
    .from("auto_tai_khoan")
    .update({
      id_nguoi_dung_dich: null,
      trang_thai_ban_giao: "dang_van_hanh",
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", idTaiKhoan)
    .eq("trang_thai_ban_giao", "cho_ban_giao");
  if (error) throw new Error(error.message);
}

export async function applyBanGiaoTaiKhoan(params: {
  idTaiKhoan: string;
  xacNhanSlug: string;
  thucHienBoi: string | null;
}): Promise<{
  slug: string;
  soCotMoc: number;
  canhBaoXoaAuth?: string;
}> {
  const db = adminDb();
  const { data: tk, error } = await db
    .from("auto_tai_khoan")
    .select("id, slug, loai, trang_thai_ban_giao, id_nguoi_dung_dich")
    .eq("id", params.idTaiKhoan)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!tk) throw new Error("Không tìm thấy tài khoản.");
  if (tk.trang_thai_ban_giao !== "cho_ban_giao") {
    throw new Error("Chưa gán tài khoản đích.");
  }
  if (params.xacNhanSlug.trim().toLowerCase() !== tk.slug.toLowerCase()) {
    throw new Error("Slug xác nhận không khớp — gõ đúng slug clone.");
  }

  let emailDich: string | null = null;
  if (tk.id_nguoi_dung_dich) {
    const { data: dich } = await db
      .from("user_nguoi_dung")
      .select("auth_user_id")
      .eq("id", tk.id_nguoi_dung_dich)
      .maybeSingle();
    if (dich?.auth_user_id) {
      const { data: au } = await db.auth.admin.getUserById(dich.auth_user_id);
      emailDich = au.user?.email ?? null;
    }
  }

  const { data: rpcData, error: rpcErr } = await db.rpc(
    "ban_giao_tai_khoan_clone",
    {
      p_id_tai_khoan: tk.id,
      p_thuc_hien_boi: params.thucHienBoi,
      p_email_dich: emailDich,
    },
  );
  if (rpcErr) throw new Error(rpcErr.message);

  const result = rpcData as {
    ok?: boolean;
    slug?: string;
    soCotMoc?: number;
    authCloneCu?: string;
  };

  let canhBaoXoaAuth: string | undefined;
  if (result.authCloneCu) {
    const { error: delErr } = await db.auth.admin.deleteUser(
      result.authCloneCu,
    );
    if (delErr) {
      canhBaoXoaAuth = `Bàn giao OK nhưng chưa xóa auth cũ: ${delErr.message}`;
    }
  }

  return {
    slug: result.slug || tk.slug,
    soCotMoc: result.soCotMoc ?? 0,
    canhBaoXoaAuth,
  };
}

/**
 * Xóa nick seeding khỏi roster. Chỉ khi 0 content_cot_moc (public/feature).
 * Xóa auto_tai_khoan → profile → auth user @cins.vn.
 */
export async function xoaTaiKhoanClone(params: {
  id: string;
}): Promise<{ slug: string }> {
  const db = adminDb();
  const { data: tk, error } = await db
    .from("auto_tai_khoan")
    .select("id, slug, id_nguoi_dung, trang_thai_ban_giao")
    .eq("id", params.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!tk) throw new Error("Không tìm thấy tài khoản.");
  if (tk.trang_thai_ban_giao === "cho_ban_giao") {
    throw new Error("Đang gán bàn giao — hủy gán trước khi xóa.");
  }
  if (tk.trang_thai_ban_giao === "da_ban_giao") {
    throw new Error("Đã bàn giao — không xóa từ roster seeding.");
  }

  let authId: string | null = null;
  if (tk.id_nguoi_dung) {
    const { count, error: cErr } = await db
      .from("content_cot_moc")
      .select("id", { count: "exact", head: true })
      .eq("id_nguoi_dung", tk.id_nguoi_dung)
      .in("che_do_hien_thi", ["public", "feature"]);
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) {
      throw new Error(
        `@${tk.slug} còn ${count} nội dung — xóa bài hoặc bàn giao trước.`,
      );
    }

    const { data: profile } = await db
      .from("user_nguoi_dung")
      .select("id, auth_user_id")
      .eq("id", tk.id_nguoi_dung)
      .maybeSingle();
    authId = (profile?.auth_user_id as string | null) || null;
  }

  const { error: delTk } = await db
    .from("auto_tai_khoan")
    .delete()
    .eq("id", tk.id);
  if (delTk) throw new Error(delTk.message);

  if (tk.id_nguoi_dung) {
    const { error: delP } = await db
      .from("user_nguoi_dung")
      .delete()
      .eq("id", tk.id_nguoi_dung);
    if (delP) {
      throw new Error(
        `Đã gỡ roster nhưng chưa xóa profile: ${delP.message}`,
      );
    }
  }

  if (authId) {
    const { error: delA } = await db.auth.admin.deleteUser(authId);
    if (delA) {
      throw new Error(
        `Đã gỡ nick nhưng chưa xóa auth: ${delA.message}`,
      );
    }
  }

  return { slug: tk.slug as string };
}
