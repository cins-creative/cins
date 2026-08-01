import { NextResponse } from "next/server";

import {
  layAutopilotOverview,
  lietKeBanThao,
  lietKeDaDang,
  lietKeMuc,
  lietKeNguon,
  lietKeNick,
} from "@/lib/admin/autopilot";
import {
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

export const runtime = "nodejs";

/**
 * GET /api/admin/autopilot?view=tong-quan|nick|nguon|muc|duyet|da-dang
 * Gate: super_admin | admin
 */
export async function GET(req: Request) {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "tong-quan";
  const trangThai = url.searchParams.get("trangThai") || undefined;
  const nenTang = url.searchParams.get("nenTang") || undefined;
  const limit = Number(url.searchParams.get("limit") || 0) || undefined;
  const offsetRaw = Number(url.searchParams.get("offset") || 0);
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;

  try {
    switch (view) {
      case "tong-quan":
        return NextResponse.json({
          ok: true,
          overview: await layAutopilotOverview(),
        });
      case "nick":
        return NextResponse.json({
          ok: true,
          items: await lietKeNick({ loai: "ai" }),
        });
      case "clone":
        return NextResponse.json({
          ok: true,
          items: await lietKeNick({ loai: "clone" }),
        });
      case "roster":
        return NextResponse.json({ ok: true, items: await lietKeNick() });
      case "nguon":
        return NextResponse.json({
          ok: true,
          items: await lietKeNguon({ nenTang, limit }),
        });
      case "muc": {
        const muc = await lietKeMuc({ trangThai, nenTang, limit, offset });
        return NextResponse.json({
          ok: true,
          items: muc.items,
          total: muc.total,
        });
      }
      case "duyet": {
        const duyet = await lietKeBanThao({
          trangThai: trangThai || "cho_duyet",
          limit,
          offset,
        });
        return NextResponse.json({
          ok: true,
          items: duyet.items,
          total: duyet.total,
        });
      }
      case "da-dang": {
        const daDang = await lietKeDaDang({ limit, offset });
        return NextResponse.json({
          ok: true,
          items: daDang.items,
          total: daDang.total,
        });
      }
      default:
        return NextResponse.json(
          { error: "view không hợp lệ." },
          { status: 400 },
        );
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi đọc Autopilot." },
      { status: 500 },
    );
  }
}
