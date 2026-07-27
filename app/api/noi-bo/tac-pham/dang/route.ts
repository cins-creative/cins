import { NextResponse } from "next/server";

import {
  chuanHoaBlocks,
  dangBaiJourneyChoUser,
} from "@/lib/editor/dang-bai-journey";
import {
  doanNenTangTuUrl,
  taoKhoiBaiNguon,
  type NenTangNguon,
} from "@/lib/editor/khoi-bai-nguon";
import type { Block, LoaiMoc, Visibility } from "@/lib/editor/types";
import { VALID_LOAI_MOC, VALID_VIS } from "@/lib/editor/types";
import { laNickSeedChoPhep } from "@/lib/noi-bo/danh-sach-nick-seed";
import { xacThucBearerSecret } from "@/lib/noi-bo/xac-thuc-bearer";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/** Secret Runtime — worker Autopilot gọi API này. */
const ENV_SECRET = "CINS_NOI_BO_DANG_BAI_SECRET";

type BodyDangBai = {
  /** Slug nick seeding (bắt buộc, phải trong allowlist). */
  slugChu?: string;
  tieuDe?: string;
  moTa?: string;
  /** URL Behance / ArtStation — bắt buộc; dùng làm embed + dedup sau. */
  urlNguon?: string;
  nenTang?: NenTangNguon;
  tenTacGiaNguon?: string;
  /** Ghi đè dòng attribution. */
  dongGhiNguon?: string;
  coverId?: string | null;
  loaiMoc?: LoaiMoc;
  cheDoHienThi?: Visibility;
  thoiDiem?: string;
  /** Nếu bỏ trống → tự ghép body + embed + dòng ghi nguồn. */
  blocks?: Block[];
  /** Dry-run: validate + ghép khối, không ghi DB. */
  chiKiemTra?: boolean;
};

function badRequest(message: string, field?: string) {
  return NextResponse.json(
    { ok: false, error: message, field },
    { status: 400 },
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * POST /api/noi-bo/tac-pham/dang
 *
 * Header: `Authorization: Bearer <CINS_NOI_BO_DANG_BAI_SECRET>`
 *
 * Contract Phase 0 — đăng bài Journey curator (link/embed nguồn ngoài).
 */
export async function POST(request: Request) {
  const auth = xacThucBearerSecret(request, ENV_SECRET);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 },
    );
  }

  let body: BodyDangBai;
  try {
    body = (await request.json()) as BodyDangBai;
  } catch {
    return badRequest("JSON không hợp lệ.");
  }

  const slugChu = body.slugChu?.trim().toLowerCase() || "";
  if (!slugChu) {
    return badRequest("Thiếu slugChu.", "slugChu");
  }
  if (!laNickSeedChoPhep(slugChu)) {
    return NextResponse.json(
      {
        ok: false,
        error: "slugChu không nằm trong danh sách nick seeding.",
        field: "slugChu",
      },
      { status: 403 },
    );
  }

  const urlNguon = body.urlNguon?.trim() || "";
  if (!urlNguon || !isHttpUrl(urlNguon)) {
    return badRequest("urlNguon phải là URL http(s) hợp lệ.", "urlNguon");
  }

  const tieuDe = typeof body.tieuDe === "string" ? body.tieuDe : "";
  const moTa = typeof body.moTa === "string" ? body.moTa : "";

  const nenTang: NenTangNguon =
    body.nenTang === "artstation" ||
    body.nenTang === "behance" ||
    body.nenTang === "khac"
      ? body.nenTang
      : doanNenTangTuUrl(urlNguon);

  let blocks: Block[];
  if (Array.isArray(body.blocks) && body.blocks.length > 0) {
    const normalized = chuanHoaBlocks(body.blocks);
    if (!normalized || normalized.length === 0) {
      return badRequest("blocks không hợp lệ.", "blocks");
    }
    blocks = normalized;
  } else {
    blocks = taoKhoiBaiNguon({
      moTa,
      urlNguon,
      nenTang,
      tenTacGiaNguon: body.tenTacGiaNguon,
      dongGhiNguon: body.dongGhiNguon,
    });
  }

  const loaiMoc = body.loaiMoc;
  if (loaiMoc != null && !VALID_LOAI_MOC.includes(loaiMoc)) {
    return badRequest("loaiMoc không hợp lệ.", "loaiMoc");
  }
  const cheDoHienThi = body.cheDoHienThi;
  if (cheDoHienThi != null && !VALID_VIS.includes(cheDoHienThi)) {
    return badRequest("cheDoHienThi không hợp lệ.", "cheDoHienThi");
  }

  const admin = createServiceRoleClient();
  const { data: profile, error: profileErr } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, trang_thai_tai_khoan")
    .eq("slug", slugChu)
    .maybeSingle<{
      id: string;
      slug: string;
      trang_thai_tai_khoan: string | null;
    }>();

  if (profileErr) {
    return NextResponse.json(
      { ok: false, error: "Không đọc được hồ sơ nick." },
      { status: 500 },
    );
  }
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "Không tìm thấy nick.", field: "slugChu" },
      { status: 404 },
    );
  }
  if (
    profile.trang_thai_tai_khoan &&
    profile.trang_thai_tai_khoan !== "dang_hoat_dong"
  ) {
    return NextResponse.json(
      { ok: false, error: "Nick không ở trạng thái hoạt động.", field: "slugChu" },
      { status: 403 },
    );
  }

  const result = await dangBaiJourneyChoUser({
    idNguoiDung: profile.id,
    slugChu: profile.slug,
    tieuDe,
    moTa,
    coverId: body.coverId ?? null,
    loaiMoc: loaiMoc ?? "du_an",
    cheDoHienThi: cheDoHienThi ?? "public",
    thoiDiem: body.thoiDiem,
    blocks,
    chiKiemTra: Boolean(body.chiKiemTra),
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, field: result.field },
      { status: 422 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      slugChu: profile.slug,
      slugBai: result.slugBai,
      idCotMoc: result.idCotMoc,
      idTacPham: result.idTacPham,
      duongDan: result.duongDan,
      nenTang,
      urlNguon,
      chiKiemTra: Boolean(body.chiKiemTra),
    },
    { status: body.chiKiemTra ? 200 : 201 },
  );
}
