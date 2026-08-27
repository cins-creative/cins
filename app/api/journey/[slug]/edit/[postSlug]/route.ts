import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  adminCoTheSuaBaiNickSeeding,
} from "@/lib/admin/seeding-nick";
import {
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import { fetchPostEditInitial } from "@/lib/journey/fetch-post-edit-initial";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Params = Promise<{ slug: string; postSlug: string }>;

/**
 * GET /api/journey/:slug/edit/:postSlug — payload chỉnh sửa.
 * Owner hoặc admin (nick seeding).
 */
export async function GET(
  request: Request,
  context: { params: Params },
) {
  const session = await getCurrentSessionAndProfile();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, postSlug } = await context.params;
  const admin = createServiceRoleClient();
  const { data: owner, error } = await admin
    .from("user_nguoi_dung")
    .select("id, auth_user_id, slug")
    .eq("slug", slug)
    .maybeSingle<{ id: string; auth_user_id: string; slug: string }>();

  if (error || !owner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = owner.auth_user_id === session.authUserId;
  if (!isOwner) {
    const role = await getCurrentUserSystemRole();
    const ok = await adminCoTheSuaBaiNickSeeding({
      role,
      idNguoiDung: owner.id,
      client: admin,
    });
    if (!ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const cotMocId = new URL(request.url).searchParams.get("cotMoc");
    const result = await fetchPostEditInitial({
      ownerId: owner.id,
      postSlug,
      cotMocId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "forbidden" ? 403 : 404 },
      );
    }

    return NextResponse.json({
      postSlug: result.postSlug,
      initial: result.initial,
    });
  } catch (err) {
    console.error("[journey edit]", err);
    return NextResponse.json(
      { error: "edit_load_failed" },
      { status: 500 },
    );
  }
}
