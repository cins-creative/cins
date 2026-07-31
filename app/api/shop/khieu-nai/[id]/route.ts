import { NextResponse } from "next/server";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  adminPhanXuKhieuNai,
  getKhieuNai,
  themBangChungKhieuNai,
} from "@/lib/shop/khieu-nai";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/shop/khieu-nai/[id] */
export async function GET(_request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const kn = await getKhieuNai(id);
  if (!kn) {
    return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  }
  if (
    kn.idNguoiMua !== session.profile.id &&
    kn.idNguoiBan !== session.profile.id
  ) {
    const isAdmin = await getCurrentUserIsCinsAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
    }
  }
  return NextResponse.json({ khieuNai: kn });
}

/** PATCH /api/shop/khieu-nai/[id] — bổ sung bằng chứng hoặc admin phán xử. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  if (body.action === "phan_xu") {
    const isAdmin = await getCurrentUserIsCinsAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Chỉ admin." }, { status: 403 });
    }
    try {
      const kn = await adminPhanXuKhieuNai(session.profile.id, id, {
        nghiengVe:
          body.nghiengVe === "nguoi_mua" ||
          body.nghiengVe === "nguoi_ban" ||
          body.nghiengVe === "khong_ket_luan"
            ? body.nghiengVe
            : "khong_ket_luan",
        phanQuyet: typeof body.phanQuyet === "string" ? body.phanQuyet : "",
        dong: body.dong !== false,
      });
      return NextResponse.json({ khieuNai: kn });
    } catch (e) {
      return mapPatchErr(e);
    }
  }

  try {
    const kn = await themBangChungKhieuNai(session.profile.id, id, {
      anhUrl: typeof body.anhUrl === "string" ? body.anhUrl : null,
      anhId: typeof body.anhId === "string" ? body.anhId : null,
      ghiChu: typeof body.ghiChu === "string" ? body.ghiChu : null,
    });
    return NextResponse.json({ khieuNai: kn });
  } catch (e) {
    return mapPatchErr(e);
  }
}

function mapPatchErr(e: unknown): NextResponse {
  const msg = e instanceof Error ? e.message : "";
  const map: Record<string, [number, string]> = {
    NOT_FOUND: [404, "Không tìm thấy khiếu nại."],
    FORBIDDEN: [403, "Không có quyền."],
    INVALID_STATE: [422, "Không thể cập nhật ở trạng thái này."],
    EVIDENCE_REQUIRED: [422, "Cần ảnh hoặc ghi chú."],
    PHAN_QUYET_REQUIRED: [422, "Nhập nội dung phán quyết."],
    UPDATE_FAILED: [500, "Không cập nhật được."],
  };
  const hit = map[msg];
  if (hit) return NextResponse.json({ error: hit[1] }, { status: hit[0] });
  console.error("[api] khieu-nai patch", e);
  return NextResponse.json({ error: "Không cập nhật được." }, { status: 500 });
}
