import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { revalidateHomeLayout } from "@/lib/cins/home-adaptive/home-layout-store";
import {
  emptyHomeLayout,
  parseHomeLayout,
  resolveHomeLayout,
  validateHomeLayoutBody,
} from "@/lib/cins/home-adaptive/layout-prefs";
import {
  parseHomeLayoutTutorial,
  parseOnboardingIntents,
} from "@/lib/cins/home-adaptive/presets";
import {
  resolvePersona,
  resolveSeeking,
  type GiaiDoan,
} from "@/lib/cins/home-adaptive/persona";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ GET    /api/user/home-layout  → layout đã resolve theo persona  ║
   ║ PUT    /api/user/home-layout  → lưu left/right/hidden (+ feed)  ║
   ║ DELETE /api/user/home-layout  → khôi phục mặc định ({})         ║
   ║ Cột: user_nguoi_dung.home_layout (jsonb).                       ║
   ╚══════════════════════════════════════════════════════════════════╝ */

async function loadOwnerRow(profileId: string) {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_nguoi_dung")
    .select("giai_doan, home_layout")
    .eq("id", profileId)
    .maybeSingle<{
      giai_doan: string | null;
      home_layout: unknown;
    }>();
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

  const { data, error } = await loadOwnerRow(session.profile.id);
  if (error) {
    console.error("[home-layout] read err:", error);
    return NextResponse.json({ error: "Không đọc được hồ sơ." }, { status: 500 });
  }

  const giaiDoan = (data?.giai_doan ?? null) as GiaiDoan | null;
  const persona = resolvePersona(giaiDoan);
  const seeking = resolveSeeking(giaiDoan);
  const resolved = resolveHomeLayout(
    persona,
    seeking,
    data?.home_layout,
    null,
    giaiDoan,
  );
  const stored = parseHomeLayout(data?.home_layout);

  return NextResponse.json({
    persona,
    seeking,
    isDefault: resolved.isDefault,
    left: resolved.left,
    right: resolved.right,
    hidden: resolved.hidden,
    newlyInjected: resolved.newlyInjected,
    feed: resolved.feed,
    presetDaAp: resolved.presetDaAp,
    at: stored?.at ?? null,
  });
}

export async function PUT(request: Request) {
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

  const validated = validateHomeLayoutBody(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 422 });
  }

  const { data: currentRow, error: readErr, admin } = await loadOwnerRow(
    session.profile.id,
  );
  if (readErr) {
    console.error("[home-layout] read-before-write err:", readErr);
    return NextResponse.json({ error: "Không đọc được hồ sơ." }, { status: 500 });
  }

  const stored = parseHomeLayout(currentRow?.home_layout);
  const incoming = body as Record<string, unknown>;
  const tutorial =
    parseHomeLayoutTutorial(incoming.tutorial) ?? stored?.tutorial;
  const intentHintFromBody = parseOnboardingIntents(incoming.intent_hint);
  const intent_hint =
    intentHintFromBody.length > 0
      ? intentHintFromBody
      : stored?.intent_hint;
  const layout = {
    ...validated.layout,
    ...(tutorial ? { tutorial } : {}),
    ...(intent_hint && intent_hint.length > 0 ? { intent_hint } : {}),
  };
  const { error } = await admin
    .from("user_nguoi_dung")
    .update({ home_layout: layout })
    .eq("id", session.profile.id);

  if (error) {
    console.error("[home-layout] write err:", error);
    return NextResponse.json({ error: "Không lưu được bố cục." }, { status: 500 });
  }

  revalidateHomeLayout(session.profile.id);

  const giaiDoan = session.profile.giai_doan as GiaiDoan | null | undefined;
  const persona = resolvePersona(giaiDoan);
  const seeking = resolveSeeking(giaiDoan);
  const resolved = resolveHomeLayout(
    persona,
    seeking,
    layout,
    null,
    giaiDoan,
  );

  return NextResponse.json({
    ok: true,
    left: resolved.left,
    right: resolved.right,
    hidden: resolved.hidden,
    feed: resolved.feed,
    at: validated.layout.at ?? null,
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
    .update({ home_layout: emptyHomeLayout() })
    .eq("id", session.profile.id);

  if (error) {
    console.error("[home-layout] reset err:", error);
    return NextResponse.json(
      { error: "Không khôi phục được bố cục." },
      { status: 500 },
    );
  }

  revalidateHomeLayout(session.profile.id);

  return NextResponse.json({ ok: true, reset: true });
}
