import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { updateNhom } from "@/lib/shop/nhom";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/shop/nhom/[id] — sửa mô tả / nhãn nhóm (seller).
 */
export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Thiếu id nhóm." }, { status: 422 });
  }

  let body: {
    moTa?: unknown;
    nhan?: unknown;
    anhId?: unknown;
    overlayAnhId?: unknown;
    anhPhuIds?: unknown;
    videoPhuId?: unknown;
    giaMacDinh?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  if (
    body.moTa === undefined &&
    body.nhan === undefined &&
    body.anhId === undefined &&
    body.overlayAnhId === undefined &&
    body.anhPhuIds === undefined &&
    body.videoPhuId === undefined &&
    body.giaMacDinh === undefined
  ) {
    return NextResponse.json(
      {
        error:
          "Cần moTa, nhan, anhId, overlayAnhId, anhPhuIds, videoPhuId hoặc giaMacDinh.",
      },
      { status: 422 },
    );
  }

  try {
    const item = await updateNhom(session.profile.id, id.trim(), {
      moTa:
        body.moTa === undefined
          ? undefined
          : typeof body.moTa === "string"
            ? body.moTa
            : body.moTa === null
              ? null
              : undefined,
      nhan: typeof body.nhan === "string" ? body.nhan : undefined,
      anhId:
        body.anhId === undefined
          ? undefined
          : typeof body.anhId === "string"
            ? body.anhId
            : body.anhId === null
              ? null
              : undefined,
      overlayAnhId:
        body.overlayAnhId === undefined
          ? undefined
          : typeof body.overlayAnhId === "string"
            ? body.overlayAnhId
            : body.overlayAnhId === null
              ? null
              : undefined,
      anhPhuIds:
        body.anhPhuIds === undefined
          ? undefined
          : Array.isArray(body.anhPhuIds)
            ? body.anhPhuIds.filter(
                (x): x is string => typeof x === "string",
              )
            : undefined,
      videoPhuId:
        body.videoPhuId === undefined
          ? undefined
          : typeof body.videoPhuId === "string"
            ? body.videoPhuId
            : body.videoPhuId === null
              ? null
              : undefined,
      giaMacDinh:
        body.giaMacDinh === undefined
          ? undefined
          : body.giaMacDinh === null
            ? null
            : typeof body.giaMacDinh === "number"
              ? body.giaMacDinh
              : Number(body.giaMacDinh),
    });
    return NextResponse.json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "BAN_HANG_OFF") {
      return NextResponse.json(
        { error: "Hãy bật bán hàng trong cài đặt trước." },
        { status: 403 },
      );
    }
    if (msg === "NHOM_NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy nhóm." }, { status: 404 });
    }
    if (msg === "NHAN_REQUIRED") {
      return NextResponse.json({ error: "Thiếu tên nhóm." }, { status: 422 });
    }
    if (msg === "NHAN_DUP") {
      return NextResponse.json(
        { error: "Tên nhóm đã tồn tại." },
        { status: 409 },
      );
    }
    if (msg === "GIA_INVALID") {
      return NextResponse.json(
        { error: "Giá mặc định không hợp lệ." },
        { status: 422 },
      );
    }
    console.error("[api/shop/nhom/[id]]", e);
    return NextResponse.json({ error: "Không lưu được nhóm." }, { status: 500 });
  }
}
