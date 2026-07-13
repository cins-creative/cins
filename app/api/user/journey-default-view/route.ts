import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  JOURNEY_DEFAULT_VIEW_VALUES,
  normalizeJourneyDefaultView,
  type JourneyDefaultView,
} from "@/lib/journey/journey-default-view";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ GET   /api/user/journey-default-view  → chế độ hiển thị mặc định  ║
   ║ PATCH /api/user/journey-default-view  → lưu lựa chọn (chủ profile)║
   ║                                                                    ║
   ║ Cột: user_nguoi_dung.journey_mac_dinh_view (text).                ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type PatchBody = { view?: unknown; applyToMe?: unknown };

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_nguoi_dung")
    .select("journey_mac_dinh_view, journey_mac_dinh_ap_dung_toi")
    .eq("id", session.profile.id)
    .maybeSingle<{
      journey_mac_dinh_view: string | null;
      journey_mac_dinh_ap_dung_toi: boolean | null;
    }>();

  if (error) {
    console.error("[journey-default-view] read err:", error);
    return NextResponse.json({ error: "Không đọc được hồ sơ." }, { status: 500 });
  }

  return NextResponse.json({
    view: normalizeJourneyDefaultView(data?.journey_mac_dinh_view),
    applyToMe: data?.journey_mac_dinh_ap_dung_toi ?? false,
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

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  if (!JOURNEY_DEFAULT_VIEW_VALUES.includes(body.view as JourneyDefaultView)) {
    return NextResponse.json(
      { error: "Chế độ hiển thị không hợp lệ." },
      { status: 422 },
    );
  }
  if (typeof body.applyToMe !== "boolean") {
    return NextResponse.json(
      { error: "Giá trị 'Áp dụng cho tôi' không hợp lệ." },
      { status: 422 },
    );
  }
  const view = body.view as JourneyDefaultView;
  const applyToMe = body.applyToMe;

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("user_nguoi_dung")
    .update({
      journey_mac_dinh_view: view,
      journey_mac_dinh_ap_dung_toi: applyToMe,
    })
    .eq("id", session.profile.id);

  if (error) {
    console.error("[journey-default-view] write err:", error);
    return NextResponse.json({ error: "Không lưu được lựa chọn." }, { status: 500 });
  }

  return NextResponse.json({ view, applyToMe });
}
