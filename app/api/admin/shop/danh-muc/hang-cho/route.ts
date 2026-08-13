import { NextResponse } from "next/server";

import {
  ganYeuCauVaoDanhMuc,
  listHangChoDanhMuc,
  promoteAliasUngVien,
  tenAliasXungDot,
  xuLyYeuCauDanhMuc,
} from "@/lib/shop/danh-muc-dong-gop";
import { createShopDanhMuc } from "@/lib/admin/shop-danh-muc-server";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/** GET /api/admin/shop/danh-muc/hang-cho */
export async function GET() {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { ok: false, error: "Thiếu service role." },
      { status: 503 },
    );
  }
  if (!(await getCurrentUserIsCinsAdmin())) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  try {
    const hangCho = await listHangChoDanhMuc();
    return NextResponse.json({ ok: true, ...hangCho });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** POST /api/admin/shop/danh-muc/hang-cho — promote alias hoặc xử lý yêu cầu. */
export async function POST(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { ok: false, error: "Thiếu service role." },
      { status: 503 },
    );
  }
  if (!(await getCurrentUserIsCinsAdmin())) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: {
    action?: unknown;
    tuKhoa?: unknown;
    idDanhMuc?: unknown;
    id?: unknown;
    trangThai?: unknown;
    idDanhMucKetQua?: unknown;
    lyDoTuChoi?: unknown;
    ten?: unknown;
    slug?: unknown;
    moTa?: unknown;
    idCha?: unknown;
    thuTu?: unknown;
    aliasTuKhoa?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body JSON không hợp lệ." },
      { status: 400 },
    );
  }

  const action = typeof body.action === "string" ? body.action : "";

  try {
    if (action === "promote-alias") {
      const tuKhoa = typeof body.tuKhoa === "string" ? body.tuKhoa : "";
      const idDanhMuc =
        typeof body.idDanhMuc === "string" ? body.idDanhMuc : "";
      if (!tuKhoa || !idDanhMuc) {
        return NextResponse.json(
          { ok: false, error: "Thiếu từ khóa hoặc danh mục." },
          { status: 400 },
        );
      }
      const result = await promoteAliasUngVien({ tuKhoa, idDanhMuc });
      if (!result.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: `Từ khóa đã thuộc «${result.conflictTen}» — gộp thủ công.`,
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "tao-danh-muc") {
      const id = typeof body.id === "string" ? body.id : "";
      const ten = typeof body.ten === "string" ? body.ten : "";
      if (!id || !ten.trim()) {
        return NextResponse.json(
          { ok: false, error: "Thiếu yêu cầu hoặc tên danh mục." },
          { status: 400 },
        );
      }
      const aliasTuKhoa =
        typeof body.aliasTuKhoa === "string" ? body.aliasTuKhoa : ten;
      const conflict = await tenAliasXungDot(aliasTuKhoa);
      if (conflict) {
        return NextResponse.json(
          {
            ok: false,
            error: `Từ khóa đã thuộc «${conflict}» — đổi alias hoặc gộp vào mục đó.`,
          },
          { status: 409 },
        );
      }
      const row = await createShopDanhMuc({
        ten,
        slug: typeof body.slug === "string" ? body.slug : undefined,
        moTa: typeof body.moTa === "string" ? body.moTa : null,
        idCha: typeof body.idCha === "string" ? body.idCha : null,
        thuTu: typeof body.thuTu === "number" ? body.thuTu : 100,
        nganhHang: "merch",
      });
      const gan = await ganYeuCauVaoDanhMuc({
        id,
        idDanhMuc: row.id,
        trangThai: "da_tao",
        aliasTuKhoa:
          typeof body.aliasTuKhoa === "string" ? body.aliasTuKhoa : null,
      });
      return NextResponse.json({ ok: true, row, ...gan });
    }

    if (action === "gop-vao") {
      const id = typeof body.id === "string" ? body.id : "";
      const idDanhMuc =
        typeof body.idDanhMuc === "string" ? body.idDanhMuc : "";
      if (!id || !idDanhMuc) {
        return NextResponse.json(
          { ok: false, error: "Thiếu yêu cầu hoặc danh mục đích." },
          { status: 400 },
        );
      }
      const gan = await ganYeuCauVaoDanhMuc({
        id,
        idDanhMuc,
        trangThai: "gop_alias",
        aliasTuKhoa:
          typeof body.aliasTuKhoa === "string" ? body.aliasTuKhoa : null,
      });
      return NextResponse.json({ ok: true, ...gan });
    }

    if (action === "xu-ly-yeu-cau") {
      const id = typeof body.id === "string" ? body.id : "";
      const trangThai = body.trangThai;
      if (
        !id ||
        (trangThai !== "gop_alias" &&
          trangThai !== "da_tao" &&
          trangThai !== "tu_choi")
      ) {
        return NextResponse.json(
          { ok: false, error: "Thiếu id hoặc trạng thái." },
          { status: 400 },
        );
      }
      await xuLyYeuCauDanhMuc({
        id,
        trangThai,
        idDanhMucKetQua:
          typeof body.idDanhMucKetQua === "string"
            ? body.idDanhMucKetQua
            : null,
        lyDoTuChoi:
          typeof body.lyDoTuChoi === "string" ? body.lyDoTuChoi : null,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "Action không hợp lệ." },
      { status: 400 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "YEU_CAU_FAILED") {
      return NextResponse.json(
        { ok: false, error: "Không từ chối được yêu cầu. Thử lại." },
        { status: 500 },
      );
    }
    const clientMsg =
      msg.includes("Từ khóa") ||
      msg.includes("Cấp cha") ||
      msg.includes("Tên") ||
      msg.includes("Slug") ||
      msg.includes("Không tìm") ||
      msg.includes("đã được xử lý") ||
      msg.includes("Không gộp") ||
      msg.includes("Chỉ gán") ||
      msg.includes("đang ẩn");
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: clientMsg ? 422 : 500 },
    );
  }
}
