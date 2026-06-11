import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createCongDongOrg } from "@/lib/cong-dong/org-create";
import { createCoSoDaoTaoOrg } from "@/lib/to-chuc/co-so-create";

/** POST /api/to-chuc — tạo org (`cong_dong` | `co_so_dao_tao`). */
export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: {
    ten?: string;
    slug?: string;
    mo_ta?: string;
    tinh_thanh?: string;
    avatar_id?: string;
    cover_id?: string;
    che_do?: string;
    loai_to_chuc?: string;
    loai_co_so?: string;
    ten_chinh_thuc?: string;
    dia_chi?: string;
    dien_thoai?: string;
    email_lien_he?: string;
    gioi_thieu_truong?: string;
    nam_thanh_lap?: number | string;
    website?: string;
    giay_phep_dao_tao?: string;
    danh_muc?: string[];
    category_ids?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const loai = body.loai_to_chuc ?? "cong_dong";

  if (loai === "co_so_dao_tao") {
    const result = await createCoSoDaoTaoOrg(session.profile.id, {
      ten: body.ten ?? "",
      slug: body.slug ?? "",
      loaiCoSo: body.loai_co_so ?? "",
      moTa: body.mo_ta,
      tenChinhThuc: body.ten_chinh_thuc,
      tinhThanh: body.tinh_thanh,
      diaChi: body.dia_chi,
      dienThoai: body.dien_thoai,
      emailLienHe: body.email_lien_he,
      avatarId: body.avatar_id,
      gioiThieuTruong: body.gioi_thieu_truong,
      namThanhLap:
        body.nam_thanh_lap !== undefined &&
        body.nam_thanh_lap !== null &&
        String(body.nam_thanh_lap).trim() !== ""
          ? Number(body.nam_thanh_lap)
          : undefined,
      website: body.website,
      giayPhepDaoTao: body.giay_phep_dao_tao,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, field: result.field },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: result.data.id,
      slug: result.data.slug,
      redirect: `/co-so/${result.data.slug}/bai-dang`,
    });
  }

  if (loai !== "cong_dong") {
    return NextResponse.json(
      { error: "Loại tổ chức không được hỗ trợ." },
      { status: 400 },
    );
  }

  const result = await createCongDongOrg(session.profile.id, {
    ten: body.ten ?? "",
    slug: body.slug,
    moTa: body.mo_ta,
    tinhThanh: body.tinh_thanh,
    avatarId: body.avatar_id,
    coverId: body.cover_id,
    cheDo: body.che_do,
    categoryArticleIds: body.danh_muc ?? body.category_ids,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    id: result.data.id,
    slug: result.data.slug,
    redirect: `/cong-dong/${result.data.slug}/nhan`,
  });
}
