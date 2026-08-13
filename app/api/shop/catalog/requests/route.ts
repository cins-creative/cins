import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { taoYeuCauDanhMuc } from "@/lib/shop/danh-muc-dong-gop";
import { parseTenNhomMoi } from "@/lib/shop/danh-muc-yeu-cau-text";
import { getNhomById, updateNhom } from "@/lib/shop/nhom";

/**
 * POST /api/shop/danh-muc/yeu-cau — seller báo thiếu danh mục.
 * Gán loại vào `khac`; không tạo row shop_danh_muc.
 */
export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  let body: {
    idNhom?: unknown;
    moTa?: unknown;
    tuKhoa?: unknown;
    idDanhMucGanNhat?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const idNhom = typeof body.idNhom === "string" ? body.idNhom.trim() : "";
  const moTa = typeof body.moTa === "string" ? body.moTa : "";
  if (!idNhom) {
    return NextResponse.json({ error: "Thiếu loại hàng." }, { status: 422 });
  }

  try {
    const { idKhac } = await taoYeuCauDanhMuc({
      ownerId: session.profile.id,
      nhomId: idNhom,
      moTa,
      tuKhoa: typeof body.tuKhoa === "string" ? body.tuKhoa : undefined,
      idDanhMucGanNhat:
        typeof body.idDanhMucGanNhat === "string"
          ? body.idDanhMucGanNhat
          : null,
    });

    const tuKhoa =
      typeof body.tuKhoa === "string" ? body.tuKhoa.trim() : "";
    const idCha =
      typeof body.idDanhMucGanNhat === "string"
        ? body.idDanhMucGanNhat.trim()
        : "";

    let item = null;
    if (idKhac) {
      try {
        item = await updateNhom(session.profile.id, idNhom, {
          idDanhMuc: idKhac,
          danhMucXacNhan: true,
        });
      } catch (attachErr) {
        console.error("[api/shop/danh-muc/yeu-cau] attach", attachErr);
      }
    }
    if (!item) {
      const fallback = await getNhomById(idNhom);
      item = fallback;
    }
    if (item) {
      item = {
        ...item,
        danhMucDeXuat: item.danhMucDeXuat ?? (tuKhoa || null),
        danhMucDeXuatIdCha: item.danhMucDeXuatIdCha ?? (idCha || null),
        danhMucDeXuatChaTen:
          item.danhMucDeXuatChaTen ?? parseTenNhomMoi(moTa),
      };
    }
    if (!item) {
      return NextResponse.json(
        { error: "Đã ghi đề xuất nhưng không tải lại được loại. Tải lại trang." },
        { status: 500 },
      );
    }
    return NextResponse.json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "MO_TA_YEU_CAU") {
      return NextResponse.json(
        { error: "Mô tả đề xuất không hợp lệ. Thử lại." },
        { status: 422 },
      );
    }
    if (msg === "YEU_CAU_LIMIT") {
      return NextResponse.json(
        { error: "Đã gửi đủ 5 yêu cầu trong 24 giờ." },
        { status: 429 },
      );
    }
    if (msg === "NHOM_NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy loại." }, { status: 404 });
    }
    if (msg === "BAN_HANG_OFF") {
      return NextResponse.json(
        { error: "Hãy bật bán hàng trong cài đặt trước." },
        { status: 403 },
      );
    }
    if (msg === "DANH_MUC_INVALID") {
      return NextResponse.json(
        { error: "Không gửi được đề xuất. Thử lại." },
        { status: 422 },
      );
    }
    if (msg === "TAXONOMY_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Phân loại chưa sẵn sàng. Tải lại trang." },
        { status: 503 },
      );
    }
    if (msg === "YEU_CAU_FAILED") {
      return NextResponse.json(
        { error: "Không ghi được đề xuất. Thử lại sau." },
        { status: 500 },
      );
    }
    if (msg === "UPDATE_NHOM_FAILED") {
      return NextResponse.json(
        { error: "Đã gửi đề xuất nhưng chưa gắn loại. Tải lại trang." },
        { status: 500 },
      );
    }
    console.error("[api/shop/danh-muc/yeu-cau]", e);
    return NextResponse.json(
      { error: "Không gửi được yêu cầu." },
      { status: 500 },
    );
  }
}
