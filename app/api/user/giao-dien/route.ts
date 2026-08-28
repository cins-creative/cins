import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  applyThemePatch,
  emptyGiaoDien,
  isDefaultProfileTheme,
  parseProfileGiaoDien,
  serializeGiaoDien,
  validateThemePatchBody,
} from "@/lib/journey/profile-theme";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ GET    /api/user/giao-dien  → state đã normalize                 ║
   ║ PATCH  /api/user/giao-dien  → merge theme (giữ key nhóm B–F)     ║
   ║ DELETE /api/user/giao-dien  → reset về {}                        ║
   ║ Cột: user_nguoi_dung.giao_dien (jsonb).                          ║
   ║ Không đụng user_nguoi_dung.theme (share OG).                     ║
   ╚══════════════════════════════════════════════════════════════════╝ */

async function loadOwnerGiaoDien(profileId: string) {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_nguoi_dung")
    .select("giao_dien")
    .eq("id", profileId)
    .maybeSingle<{ giao_dien: unknown }>();
  return { data, error, admin };
}

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  const { data, error } = await loadOwnerGiaoDien(session.profile.id);
  if (error) {
    console.error("[giao-dien] read err:", error);
    return NextResponse.json({ error: "Không đọc được hồ sơ." }, { status: 500 });
  }

  const state = parseProfileGiaoDien(data?.giao_dien);
  return NextResponse.json({
    theme: state.theme,
    customs: state.customs,
    isDefault: isDefaultProfileTheme(state),
  });
}

export async function PATCH(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const validated = validateThemePatchBody(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { data: currentRow, error: readErr, admin } = await loadOwnerGiaoDien(
    session.profile.id,
  );
  if (readErr) {
    console.error("[giao-dien] read-before-write err:", readErr);
    return NextResponse.json({ error: "Không đọc được hồ sơ." }, { status: 500 });
  }

  const prev = parseProfileGiaoDien(currentRow?.giao_dien);
  const next = applyThemePatch(prev, validated.patch);

  if (next.theme.background.kind === "image") {
    const allowed = new Set(next.customs.map((c) => c.imageId));
    const id = next.theme.background.imageId;
    if (!id || !allowed.has(id)) {
      return NextResponse.json(
        { error: "background.imageId phải nằm trong ảnh đã tải lên." },
        { status: 400 },
      );
    }
    for (const [device, row] of Object.entries(
      next.theme.background.devices ?? {},
    )) {
      if (row?.imageId && !allowed.has(row.imageId)) {
        return NextResponse.json(
          {
            error: `background.devices.${device}.imageId phải nằm trong ảnh đã tải lên.`,
          },
          { status: 400 },
        );
      }
    }
  }

  const payload = serializeGiaoDien(next);

  const { error: updErr } = await admin
    .from("user_nguoi_dung")
    .update({ giao_dien: payload })
    .eq("id", session.profile.id);

  if (updErr) {
    console.error("[giao-dien] write err:", updErr);
    return NextResponse.json({ error: "Không lưu được giao diện." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    theme: next.theme,
    customs: next.customs,
    isDefault: isDefaultProfileTheme(next),
  });
}

export async function DELETE() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("user_nguoi_dung")
    .update({ giao_dien: {} })
    .eq("id", session.profile.id);

  if (error) {
    console.error("[giao-dien] reset err:", error);
    return NextResponse.json(
      { error: "Không khôi phục được giao diện." },
      { status: 500 },
    );
  }

  const empty = emptyGiaoDien();
  return NextResponse.json({
    ok: true,
    reset: true,
    theme: empty.theme,
    customs: empty.customs,
    isDefault: true,
  });
}
