import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { duyetQuay, rutQuay } from "@/lib/shop/quay";

type Ctx = { params: Promise<{ suKienId: string; quayId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { quayId } = await ctx.params;
  let body: { action?: unknown; lyDoTuChoi?: unknown; lyDo?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const lyDoRaw =
    typeof body.lyDo === "string"
      ? body.lyDo
      : typeof body.lyDoTuChoi === "string"
        ? body.lyDoTuChoi
        : null;

  if (body.action === "withdraw") {
    try {
      const item = await rutQuay(
        session.profile.id,
        quayId,
        lyDoRaw?.trim() || "",
      );
      return NextResponse.json({ item });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "LY_DO_REQUIRED") {
        return NextResponse.json(
          { error: "Nhập lý do rút khỏi sự kiện." },
          { status: 422 },
        );
      }
      if (msg === "FORBIDDEN") {
        return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
      }
      if (msg === "NOT_FOUND") {
        return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
      }
      if (msg === "INVALID_STATE") {
        return NextResponse.json(
          { error: "Không thể rút ở trạng thái này." },
          { status: 422 },
        );
      }
      return NextResponse.json({ error: "Không rút được." }, { status: 500 });
    }
  }

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "action không hợp lệ." }, { status: 422 });
  }

  if (body.action === "reject" && !lyDoRaw?.trim()) {
    return NextResponse.json(
      { error: "Nhập lý do từ chối / gỡ quầy." },
      { status: 422 },
    );
  }

  try {
    const item = await duyetQuay(
      session.profile.id,
      quayId,
      body.action,
      lyDoRaw,
    );
    return NextResponse.json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "LY_DO_REQUIRED") {
      return NextResponse.json(
        { error: "Nhập lý do từ chối / gỡ quầy." },
        { status: 422 },
      );
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền duyệt." }, { status: 403 });
    }
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
    }
    return NextResponse.json({ error: "Không cập nhật được." }, { status: 500 });
  }
}
