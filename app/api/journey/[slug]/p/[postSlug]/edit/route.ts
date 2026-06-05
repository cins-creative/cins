import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { fetchPostEditInitial } from "@/lib/journey/fetch-post-edit-initial";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Params = Promise<{ slug: string; postSlug: string }>;

export async function GET(
  _request: Request,
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
  if (owner.auth_user_id !== session.authUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await fetchPostEditInitial({
    ownerId: owner.id,
    postSlug,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "forbidden" ? 403 : 404 },
    );
  }

  return NextResponse.json(result);
}
