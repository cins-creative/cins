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

  try {
    switch (view) {
      case "tong-quan":
        return NextResponse.json({
          ok: true,
          overview: await layAutopilotOverview(),
        });
      case "nick":
        return NextResponse.json({ ok: true, items: await lietKeNick() });
      case "nguon":
        return NextResponse.json({
          ok: true,
          items: await lietKeNguon({ nenTang, limit }),
        });
      case "muc":
        return NextResponse.json({
          ok: true,
          items: await lietKeMuc({ trangThai, nenTang, limit }),
        });
      case "duyet":
        return NextResponse.json({
          ok: true,
          items: await lietKeBanThao({
            trangThai: trangThai || "cho_duyet",
            limit,
          }),
        });
      case "da-dang":
        return NextResponse.json({
          ok: true,
          items: await lietKeDaDang({ limit }),
        });
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
