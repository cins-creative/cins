import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  luuCombo,
  patchComboFlags,
  softDeleteCombo,
} from "@/lib/co-so/combo-hoc-phi";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";

type Ctx = { params: Promise<{ id: string; comboId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id: orgId, comboId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if ((await getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-phi-goi")) !== "sua") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    ten?: string;
    moTa?: string | null;
    loaiGiam?: "phan_tram" | "so_tien";
    giaTriGiam?: number;
    giamToiDaVnd?: number | null;
    apDungTu?: string | null;
    apDungDen?: string | null;
    hienTrangKhoa?: boolean;
    dangBan?: boolean;
    thuTu?: number;
    thanhPhan?: Array<{ khoaId?: string; goiId?: string | null }>;
    /** Chỉ cập nhật cờ khi không gửi thanhPhan. */
    flagsOnly?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    body.flagsOnly ||
    (body.thanhPhan == null &&
      body.ten == null &&
      (body.dangBan !== undefined || body.hienTrangKhoa !== undefined))
  ) {
    const result = await patchComboFlags(orgId, comboId, {
      dangBan: body.dangBan,
      hienTrangKhoa: body.hienTrangKhoa,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ combo: result.combo });
  }

  const result = await luuCombo({
    orgId,
    comboId,
    ten: body.ten ?? "",
    moTa: body.moTa,
    loaiGiam: body.loaiGiam === "so_tien" ? "so_tien" : "phan_tram",
    giaTriGiam: Number(body.giaTriGiam),
    giamToiDaVnd: body.giamToiDaVnd,
    apDungTu: body.apDungTu,
    apDungDen: body.apDungDen,
    hienTrangKhoa: body.hienTrangKhoa,
    dangBan: body.dangBan,
    thuTu: body.thuTu,
    thanhPhan: (body.thanhPhan ?? []).map((t) => ({
      khoaId: t.khoaId ?? "",
      goiId: t.goiId,
    })),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ combo: result.combo });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id: orgId, comboId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if ((await getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-phi-goi")) !== "sua") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await softDeleteCombo(orgId, comboId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
