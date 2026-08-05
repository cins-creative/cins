import { NextResponse } from "next/server";

import {
  importPortVaoNick,
  isPortClonePlatform,
} from "@/lib/admin/port-clone";
import {
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import type { PortImportPreview } from "@/lib/port/import";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/admin/port-clone/import
 * Body: { idTaiKhoan | idNguoiDung | idToChuc, platform, url, html?, apply?, preview?, fallbackTitle? }
 */
export async function POST(request: Request) {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  let body: {
    idTaiKhoan?: unknown;
    idNguoiDung?: unknown;
    idToChuc?: unknown;
    platform?: unknown;
    url?: unknown;
    html?: unknown;
    apply?: unknown;
    preview?: unknown;
    fallbackTitle?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const idTaiKhoan =
    typeof body.idTaiKhoan === "string" ? body.idTaiKhoan.trim() : "";
  const idNguoiDung =
    typeof body.idNguoiDung === "string" ? body.idNguoiDung.trim() : "";
  const idToChuc =
    typeof body.idToChuc === "string" ? body.idToChuc.trim() : "";
  const targetCount = [idTaiKhoan, idNguoiDung, idToChuc].filter(Boolean)
    .length;
  if (targetCount === 0) {
    return NextResponse.json(
      {
        error: "Thiếu idTaiKhoan, idNguoiDung hoặc idToChuc.",
        field: "idTaiKhoan",
      },
      { status: 400 },
    );
  }
  if (targetCount > 1) {
    return NextResponse.json(
      { error: "Chỉ chọn một đích: nick seeding, user thật, hoặc ORG." },
      { status: 400 },
    );
  }
  if (!isPortClonePlatform(body.platform)) {
    return NextResponse.json(
      { error: "platform phải là behance | artstation | carrd." },
      { status: 400 },
    );
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Thiếu url." }, { status: 400 });
  }

  try {
    const result = await importPortVaoNick({
      idTaiKhoan: idTaiKhoan || null,
      idNguoiDung: idNguoiDung || null,
      idToChuc: idToChuc || null,
      platform: body.platform,
      url,
      html: typeof body.html === "string" ? body.html : "",
      apply: body.apply === true,
      preview:
        body.preview && typeof body.preview === "object"
          ? (body.preview as PortImportPreview)
          : null,
      fallbackTitle:
        typeof body.fallbackTitle === "string" ? body.fallbackTitle : null,
    });

    if (body.apply === true) {
      return NextResponse.json(
        {
          ok: true,
          duongDan: result.duongDan,
          slugBai: result.slugBai,
          preview: result.preview,
          tomTatBoQua: tomTatBoQua(result.preview),
        },
        { status: 201 },
      );
    }
    return NextResponse.json({
      ok: true,
      preview: result.preview,
      tomTatBoQua: tomTatBoQua(result.preview),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi import.";
    console.error("[api/admin/port-clone/import]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function tomTatBoQua(preview: PortImportPreview): string | null {
  const b = preview.boQua;
  if (!b || b.tongAnhNguon <= 0) return null;
  if (b.quaLon <= 0 && b.vuotTran <= 0 && b.loi <= 0 && (b.daNen ?? 0) <= 0) {
    return `Đã lấy ${b.daLay}/${b.tongAnhNguon} ảnh.`;
  }
  const parts = [`Đã lấy ${b.daLay}/${b.tongAnhNguon} ảnh`];
  if ((b.daNen ?? 0) > 0) parts.push(`${b.daNen} đã nén`);
  if (b.quaLon > 0) parts.push(`${b.quaLon} quá dung lượng (không nén nổi)`);
  if (b.vuotTran > 0) parts.push(`${b.vuotTran} vượt giới hạn số ảnh`);
  if (b.loi > 0) parts.push(`${b.loi} lỗi tải`);
  return parts.join(" · ");
}
