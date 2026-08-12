import { NextResponse } from "next/server";

import {
  listHangChoDanhMuc,
  promoteAliasUngVien,
  xuLyYeuCauDanhMuc,
} from "@/lib/shop/danh-muc-dong-gop";
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
    if (msg === "LY_DO_REQUIRED") {
      return NextResponse.json(
        { ok: false, error: "Cần lý do khi từ chối." },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
