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
   ║ PATCH  /api/user/giao-dien  → merge theme/card (giữ key B–F)     ║
   ║ DELETE /api/user/giao-dien  → reset theme+customs, giữ card…     ║
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
    card: state.card,
    avatarFrame: state.avatarFrame,
    popover: state.popover,
    shopSwitch: state.shopSwitch,
    watermark: state.watermark,
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

  if (next.avatarFrame.overlayImageId) {
    const allowed = new Set(next.customs.map((c) => c.imageId));
    if (!allowed.has(next.avatarFrame.overlayImageId)) {
      return NextResponse.json(
        {
          error:
            "avatarFrame.overlayImageId phải nằm trong ảnh đã tải lên.",
        },
        { status: 400 },
      );
    }
  }

  if (
    next.popover.surface.kind === "image" &&
    next.popover.surface.imageId
  ) {
    const allowed = new Set(next.customs.map((c) => c.imageId));
    if (!allowed.has(next.popover.surface.imageId)) {
      return NextResponse.json(
        {
          error:
            "popover.surface.imageId phải nằm trong ảnh đã tải lên.",
        },
        { status: 400 },
      );
    }
  }

  if (next.shopSwitch.imageId) {
    const allowed = new Set(next.customs.map((c) => c.imageId));
    if (!allowed.has(next.shopSwitch.imageId)) {
      return NextResponse.json(
        {
          error: "shopSwitch.imageId phải nằm trong ảnh đã tải lên.",
        },
        { status: 400 },
      );
    }
  }

  if (next.watermark.source === "custom" && next.watermark.imageId) {
    const allowed = new Set(next.customs.map((c) => c.imageId));
    if (!allowed.has(next.watermark.imageId)) {
      return NextResponse.json(
        {
          error: "watermark.imageId phải nằm trong ảnh đã tải lên.",
        },
        { status: 400 },
      );
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
    card: next.card,
    avatarFrame: next.avatarFrame,
    popover: next.popover,
    shopSwitch: next.shopSwitch,
    watermark: next.watermark,
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

  const { data: currentRow, error: readErr, admin } = await loadOwnerGiaoDien(
    session.profile.id,
  );
  if (readErr) {
    console.error("[giao-dien] reset-read err:", readErr);
    return NextResponse.json({ error: "Không đọc được hồ sơ." }, { status: 500 });
  }

  const prev = parseProfileGiaoDien(currentRow?.giao_dien);
  const empty = emptyGiaoDien();
  /* Reset theme + customs; giữ nhóm B–E + shopSwitch + watermark. */
  const next = {
    ...empty,
    card: prev.card,
    avatarFrame: prev.avatarFrame,
    popover: prev.popover,
    shopSwitch: prev.shopSwitch,
    watermark: prev.watermark,
  };

  const { error } = await admin
    .from("user_nguoi_dung")
    .update({ giao_dien: serializeGiaoDien(next) })
    .eq("id", session.profile.id);

  if (error) {
    console.error("[giao-dien] reset err:", error);
    return NextResponse.json(
      { error: "Không khôi phục được giao diện." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    reset: true,
    theme: next.theme,
    customs: next.customs,
    card: next.card,
    avatarFrame: next.avatarFrame,
    popover: next.popover,
    shopSwitch: next.shopSwitch,
    watermark: next.watermark,
    isDefault: isDefaultProfileTheme(next),
  });
}
