import { NextResponse } from "next/server";

import {
  boQuaMuc,
  capNhatNguon,
  capNhatNick,
  chayDang,
  chuanBiDang,
  dongBoNick,
  duyetBanThao,
  huyBanThao,
  nhapMuc,
  themNguon,
  thuHoiBanThao,
} from "@/lib/admin/autopilot";
import {
  capNhatKpiCauHinh,
  damBaoPhanBoKpiHomNay,
} from "@/lib/admin/kpi-seeding";
import {
  applyBanGiaoTaiKhoan,
  capNhatTaiKhoanClone,
  datLaiMatKhauTaiKhoan,
  ganTaiKhoanDich,
  hienMatKhauTaiKhoan,
  huyGanTaiKhoanDich,
  kiemTraTaiKhoanDichTrong,
  taoTaiKhoanClone,
  xoaTaiKhoanClone,
} from "@/lib/admin/tai-khoan-clone";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import type { GiaiDoan } from "@/lib/auth/session";

export const runtime = "nodejs";

type Body = {
  action?: string;
  id?: string;
  ids?: string[];
  dangBat?: boolean;
  tuongTacBat?: boolean;
  hanMucNgay?: number;
  nenTang?: "artstation" | "behance" | "pixiv" | "khac";
  urlHoSo?: string;
  url?: string;
  maNgoai?: string | null;
  tenHienThi?: string | null;
  niche?: string | null;
  tieuDe?: string | null;
  tacGia?: string | null;
  moTa?: string | null;
  anhBia?: string | null;
  gioiHan?: number;
  slug?: string;
  /* clone */
  tenThat?: string | null;
  lienKetNguon?: string[] | string | null;
  lienHe?: string | null;
  trangThaiXinPhep?: "chua_lien_he" | "dang_cho" | "dong_y" | "tu_choi";
  bangChungDongY?: string | null;
  kpiNgay?: number | null;
  tamDung?: boolean;
  ghiChu?: string | null;
  giaiDoan?: GiaiDoan;
  queryDich?: string;
  xacNhanSlug?: string;
  mucTieuNgay?: number;
  baiMoiLuot?: number;
  epPhanBoLai?: boolean;
};

/**
 * POST /api/admin/autopilot/action
 * Gate: super_admin | admin
 */
export async function POST(req: Request) {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const session = await getCurrentSessionAndProfile();
  const thucHienBoi = session?.profile?.id ?? null;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const action = String(body.action || "").trim();
  if (!action) {
    return NextResponse.json(
      { error: "Thiếu action.", field: "action" },
      { status: 400 },
    );
  }

  try {
    switch (action) {
      case "dong_bo_nick": {
        const result = await dongBoNick();
        return NextResponse.json({ ok: true, ...result });
      }
      case "cap_nhat_nick": {
        if (!body.id) {
          return NextResponse.json(
            { error: "Thiếu id.", field: "id" },
            { status: 400 },
          );
        }
        await capNhatNick({
          id: body.id,
          dangBat: body.dangBat,
          tuongTacBat: body.tuongTacBat,
          hanMucNgay: body.hanMucNgay,
        });
        return NextResponse.json({ ok: true });
      }
      case "them_nguon": {
        if (
          body.nenTang !== "artstation" &&
          body.nenTang !== "behance" &&
          body.nenTang !== "pixiv"
        ) {
          return NextResponse.json(
            { error: "nenTang không hợp lệ.", field: "nenTang" },
            { status: 400 },
          );
        }
        if (!body.urlHoSo?.trim()) {
          return NextResponse.json(
            { error: "Thiếu urlHoSo.", field: "urlHoSo" },
            { status: 400 },
          );
        }
        const result = await themNguon({
          nenTang: body.nenTang,
          urlHoSo: body.urlHoSo,
          maNgoai: body.maNgoai,
          tenHienThi: body.tenHienThi,
          niche: body.niche,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      case "cap_nhat_nguon": {
        if (!body.id) {
          return NextResponse.json(
            { error: "Thiếu id.", field: "id" },
            { status: 400 },
          );
        }
        await capNhatNguon({
          id: body.id,
          dangBat: body.dangBat,
          niche: body.niche,
          tenHienThi: body.tenHienThi,
        });
        return NextResponse.json({ ok: true });
      }
      case "bo_qua_muc": {
        if (!body.id) {
          return NextResponse.json(
            { error: "Thiếu id.", field: "id" },
            { status: 400 },
          );
        }
        await boQuaMuc(body.id);
        return NextResponse.json({ ok: true });
      }
      case "nhap_muc": {
        if (!body.url?.trim()) {
          return NextResponse.json(
            { error: "Thiếu url.", field: "url" },
            { status: 400 },
          );
        }
        const result = await nhapMuc({
          url: body.url,
          nenTang: body.nenTang,
          tieuDe: body.tieuDe,
          tacGia: body.tacGia,
          moTa: body.moTa,
          anhBia: body.anhBia,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      case "chuan_bi": {
        const result = await chuanBiDang({ gioiHan: body.gioiHan });
        return NextResponse.json({ ok: true, ...result });
      }
      case "duyet_ban_thao": {
        const ids = Array.isArray(body.ids)
          ? body.ids
          : body.id
            ? [body.id]
            : [];
        const result = await duyetBanThao(ids);
        return NextResponse.json({ ok: true, ...result });
      }
      case "huy_ban_thao": {
        const ids = Array.isArray(body.ids)
          ? body.ids
          : body.id
            ? [body.id]
            : [];
        const result = await huyBanThao(ids);
        return NextResponse.json({ ok: true, ...result });
      }
      case "thu_hoi_ban_thao": {
        const ids = Array.isArray(body.ids)
          ? body.ids
          : body.id
            ? [body.id]
            : [];
        const result = await thuHoiBanThao(ids);
        return NextResponse.json({ ok: true, ...result });
      }
      case "chay_dang": {
        const result = await chayDang({
          gioiHan: body.gioiHan,
          slug: body.slug,
        });
        return NextResponse.json({ ok: true, ...result });
      }

      /* ── Clone / vault / KPI / bàn giao ── */
      case "tao_clone": {
        if (!body.tenHienThi?.trim()) {
          return NextResponse.json(
            { error: "Thiếu tenHienThi." },
            { status: 400 },
          );
        }
        const result = await taoTaiKhoanClone({
          slug: body.slug,
          tenHienThi: body.tenHienThi,
          tenThat: body.tenThat,
          giaiDoan: body.giaiDoan,
          lienKetNguon: body.lienKetNguon,
          lienHe: body.lienHe,
          trangThaiXinPhep: body.trangThaiXinPhep,
          ghiChu: body.ghiChu,
          thucHienBoi,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      case "cap_nhat_clone": {
        if (!body.id) {
          return NextResponse.json(
            { error: "Thiếu id.", field: "id" },
            { status: 400 },
          );
        }
        await capNhatTaiKhoanClone({
          id: body.id,
          tenThat: body.tenThat,
          lienKetNguon: body.lienKetNguon,
          lienHe: body.lienHe,
          trangThaiXinPhep: body.trangThaiXinPhep,
          bangChungDongY: body.bangChungDongY,
          kpiNgay: body.kpiNgay,
          tamDung: body.tamDung,
          ghiChu: body.ghiChu,
          tenHienThi: body.tenHienThi,
        });
        return NextResponse.json({ ok: true });
      }
      case "xoa_clone": {
        if (!body.id) {
          return NextResponse.json(
            { error: "Thiếu id.", field: "id" },
            { status: 400 },
          );
        }
        const result = await xoaTaiKhoanClone({ id: body.id });
        return NextResponse.json({ ok: true, ...result });
      }
      case "hien_mat_khau": {
        if (!body.id) {
          return NextResponse.json(
            { error: "Thiếu id.", field: "id" },
            { status: 400 },
          );
        }
        const result = await hienMatKhauTaiKhoan({
          id: body.id,
          thucHienBoi,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      case "dat_lai_mat_khau": {
        if (!body.id) {
          return NextResponse.json(
            { error: "Thiếu id.", field: "id" },
            { status: 400 },
          );
        }
        const result = await datLaiMatKhauTaiKhoan({
          id: body.id,
          thucHienBoi,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      case "kiem_tra_dich": {
        if (!body.queryDich?.trim()) {
          return NextResponse.json(
            { error: "Thiếu queryDich." },
            { status: 400 },
          );
        }
        const result = await kiemTraTaiKhoanDichTrong(body.queryDich);
        return NextResponse.json({ ok: true, ...result });
      }
      case "gan_dich": {
        if (!body.id || !body.queryDich?.trim()) {
          return NextResponse.json(
            { error: "Thiếu id hoặc queryDich." },
            { status: 400 },
          );
        }
        const result = await ganTaiKhoanDich({
          idTaiKhoan: body.id,
          queryDich: body.queryDich,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      case "huy_gan_dich": {
        if (!body.id) {
          return NextResponse.json(
            { error: "Thiếu id.", field: "id" },
            { status: 400 },
          );
        }
        await huyGanTaiKhoanDich(body.id);
        return NextResponse.json({ ok: true });
      }
      case "apply_ban_giao": {
        if (!body.id || !body.xacNhanSlug?.trim()) {
          return NextResponse.json(
            { error: "Thiếu id hoặc xacNhanSlug." },
            { status: 400 },
          );
        }
        const result = await applyBanGiaoTaiKhoan({
          idTaiKhoan: body.id,
          xacNhanSlug: body.xacNhanSlug,
          thucHienBoi,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      case "cap_nhat_kpi_cau_hinh": {
        const result = await capNhatKpiCauHinh({
          mucTieuNgay: body.mucTieuNgay,
          baiMoiLuot: body.baiMoiLuot,
          capNhatBoi: thucHienBoi,
        });
        if (body.epPhanBoLai) {
          await damBaoPhanBoKpiHomNay({ epPhanBoLai: true });
        }
        return NextResponse.json({ ok: true, ...result });
      }
      case "phan_bo_kpi_lai": {
        const result = await damBaoPhanBoKpiHomNay({ epPhanBoLai: true });
        return NextResponse.json({ ok: true, ...result });
      }
      default:
        return NextResponse.json(
          { error: `action không hỗ trợ: ${action}` },
          { status: 400 },
        );
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi Autopilot." },
      { status: 500 },
    );
  }
}
