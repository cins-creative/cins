import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  createGhiDanh,
  findUserForGhiDanh,
  listGoiHocPhiOrg,
  listHocVienCuaOrg,
  listLopCuaOrg,
} from "@/lib/co-so/hoc-vien-list";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  const quyen = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-vien");
  if (quyen === "an") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const canThu = quyen === "sua";
  const canXacNhanHp =
    canThu ||
    (await getCoSoModuleQuyen(
      orgId,
      actorId,
      vaiTro,
      "hoc-phi-doi-soat",
    )) === "sua";

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const khoaId = url.searchParams.get("khoaId") ?? undefined;
  const lopId = url.searchParams.get("lopId") ?? undefined;
  const trangThai = url.searchParams.get("trangThai") ?? undefined;
  const page = Number(url.searchParams.get("page") || "1");
  const withMeta = url.searchParams.get("meta") === "1";

  try {
    const list = await listHocVienCuaOrg(orgId, {
      q,
      page,
      khoaId,
      lopId,
      trangThai,
    });
    if (!withMeta) {
      return NextResponse.json({
        ...list,
        canThu,
        canXacNhanHp,
      });
    }
    const [goi, lop] = await Promise.all([
      listGoiHocPhiOrg(orgId),
      listLopCuaOrg(orgId),
    ]);
    return NextResponse.json({
      ...list,
      canThu,
      canXacNhanHp,
      goi,
      lop,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi tải học viên" },
      { status: 500 },
    );
  }
}

/** Thêm ghi danh (+ optional tìm user ?lookup=slug). */
export async function POST(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if ((await getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-vien")) !== "sua") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    lookup?: string;
    userId?: string;
    khoaId?: string;
    lopId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let userId = body.userId?.trim() || "";
  if (!userId && body.lookup?.trim()) {
    const found = await findUserForGhiDanh(body.lookup);
    if (!found) {
      return NextResponse.json(
        { error: "Không tìm thấy user (thử slug chính xác)." },
        { status: 404 },
      );
    }
    userId = found.id;
  }
  if (!userId || !body.khoaId) {
    return NextResponse.json(
      { error: "Thiếu userId/lookup hoặc khoaId." },
      { status: 400 },
    );
  }

  const result = await createGhiDanh({
    orgId,
    userId,
    khoaId: body.khoaId,
    lopId: body.lopId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ hocVienLopId: result.hocVienLopId });
}
