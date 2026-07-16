import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createUserFilter } from "@/lib/filter/create";
import { ensureDefaultPersonalFilters } from "@/lib/filter/ensure-default-personal-filters";
import { countPersonalFilterSlugsVisibleToViewer } from "@/lib/filter/count-visible-to-viewer";
import { listPersonalFiltersForUser } from "@/lib/filter/list-cua-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** GET /api/filters — list nhãn (current user hoặc ?userId= read-only). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userIdParam = url.searchParams.get("userId")?.trim();

  const session = await getCurrentSessionAndProfile();
  let targetUserId: string | null = null;

  if (userIdParam) {
    targetUserId = userIdParam;
  } else if (session?.profile) {
    targetUserId = session.profile.id;
  } else {
    return NextResponse.json({ error: "Cần userId hoặc đăng nhập." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: user } = await admin
    .from("user_nguoi_dung")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle<{ id: string }>();

  if (!user) {
    return NextResponse.json({ error: "Không tìm thấy user." }, { status: 404 });
  }

  const viewerId = session?.profile?.id ?? null;
  const isOwnerSession = viewerId === user.id;

  if (isOwnerSession) {
    try {
      await ensureDefaultPersonalFilters(user.id);
    } catch {
      /* List vẫn trả về — UI có fallback nhãn hệ thống. */
    }
  }

  const visibleCountBySlug = isOwnerSession
    ? undefined
    : await countPersonalFilterSlugsVisibleToViewer(user.id, viewerId);

  const filters = await listPersonalFiltersForUser(user.id, {
    withCounts: true,
    visibleCountBySlug,
  });
  return NextResponse.json({ filters });
}

/** POST /api/filters — tạo nhãn (chỉ chủ tài khoản). */
export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { ten?: string; mau?: string; thu_tu?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = await createUserFilter({
    userId: session.profile.id,
    ten: body.ten ?? "",
    mau: body.mau,
    thuTu: body.thu_tu,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, filter: result.filter });
}
