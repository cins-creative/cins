import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { softDeleteNhom, updateNhom } from "@/lib/shop/nhom";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/shop/nhom/[id] — sửa mô tả / nhãn / taxonomy nhóm (seller).
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
    noiBat?: unknown;
    idDanhMuc?: unknown;
    danhMucXacNhan?: unknown;
    giaTriIds?: unknown;
    fandomIds?: unknown;
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
    body.giaMacDinh === undefined &&
    body.noiBat === undefined &&
    body.idDanhMuc === undefined &&
    body.danhMucXacNhan === undefined &&
    body.giaTriIds === undefined &&
    body.fandomIds === undefined
  ) {
    return NextResponse.json(
      {
        error:
          "Cần moTa, nhan, anhId, overlayAnhId, anhPhuIds, videoPhuId, giaMacDinh, noiBat, idDanhMuc, danhMucXacNhan, giaTriIds hoặc fandomIds.",
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
      noiBat: typeof body.noiBat === "boolean" ? body.noiBat : undefined,
      idDanhMuc:
        body.idDanhMuc === undefined
          ? undefined
          : typeof body.idDanhMuc === "string"
            ? body.idDanhMuc
            : body.idDanhMuc === null
              ? null
              : undefined,
      danhMucXacNhan:
        typeof body.danhMucXacNhan === "boolean"
          ? body.danhMucXacNhan
          : undefined,
      giaTriIds:
        body.giaTriIds === undefined
          ? undefined
          : Array.isArray(body.giaTriIds)
            ? body.giaTriIds.filter((x): x is string => typeof x === "string")
            : undefined,
      fandomIds:
        body.fandomIds === undefined
          ? undefined
          : Array.isArray(body.fandomIds)
            ? body.fandomIds.filter((x): x is string => typeof x === "string")
            : undefined,
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
    if (msg === "FEATURE_LIMIT") {
      return NextResponse.json(
        { error: "Đã đủ số loại hàng Feature." },
        { status: 422 },
      );
    }
    if (msg === "FEATURE_TRUC") {
      return NextResponse.json(
        { error: "Chỉ loại hàng (trục 1) mới gắn Feature." },
        { status: 422 },
      );
    }
    if (msg === "DANH_MUC_INVALID") {
      return NextResponse.json(
        { error: "Danh mục không hợp lệ." },
        { status: 422 },
      );
    }
    if (msg === "DANH_MUC_REQUIRED") {
      return NextResponse.json(
        { error: "Chọn danh mục trước khi xác nhận." },
        { status: 422 },
      );
    }
    if (msg === "GIA_TRI_INVALID") {
      return NextResponse.json(
        { error: "Giá trị thuộc tính không hợp lệ." },
        { status: 422 },
      );
    }
    if (msg === "FANDOM_INVALID") {
      return NextResponse.json(
        { error: "Fandom không hợp lệ." },
        { status: 422 },
      );
    }
    if (msg === "FANDOM_SYNC_FAILED") {
      return NextResponse.json(
        { error: "Không lưu được fandom." },
        { status: 500 },
      );
    }
    if (msg === "TAXONOMY_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Chưa áp migration danh mục trên môi trường này." },
        { status: 503 },
      );
    }
    console.error("[api/shop/nhom/[id]]", e);
    return NextResponse.json({ error: "Không lưu được nhóm." }, { status: 500 });
  }
}

/**
 * DELETE /api/shop/nhom/[id] — soft-delete loại hàng khi không còn mẫu.
 */
export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Thiếu id nhóm." }, { status: 422 });
  }

  try {
    await softDeleteNhom(session.profile.id, id.trim());
    return NextResponse.json({ ok: true });
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
    if (msg === "NHOM_HAS_PRODUCTS") {
      const count =
        e instanceof Error && "count" in e
          ? Number((e as Error & { count?: number }).count)
          : undefined;
      return NextResponse.json(
        {
          error:
            count != null && Number.isFinite(count) && count > 0
              ? `Còn ${count} mẫu trong loại này. Xóa hết sản phẩm trước khi xóa loại hàng.`
              : "Còn mẫu trong loại này. Xóa hết sản phẩm trước khi xóa loại hàng.",
          count: count ?? null,
        },
        { status: 409 },
      );
    }
    console.error("[api/shop/nhom/[id]] DELETE", e);
    return NextResponse.json({ error: "Không xóa được loại hàng." }, { status: 500 });
  }
}
