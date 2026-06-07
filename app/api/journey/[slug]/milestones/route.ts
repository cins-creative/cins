import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { fetchMilestoneTimelinePage } from "@/lib/journey/milestones-page-fetch";
import { loadPendingCoAuthorInvites } from "@/lib/social/co-author";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Params = Promise<{ slug: string }>;

export async function GET(
  request: Request,
  context: { params: Params },
) {
  const session = await getCurrentSessionAndProfile();

  const { slug } = await context.params;
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);
  const personalFilterSlug = searchParams.get("label")?.trim() || null;

  const admin = createServiceRoleClient();
  const { data: owner, error } = await admin
    .from("user_nguoi_dung")
    .select("id, auth_user_id, giai_doan")
    .eq("slug", slug)
    .maybeSingle<{
      id: string;
      auth_user_id: string;
      giai_doan: string | null;
    }>();

  if (error || !owner || owner.giai_doan === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = session
    ? owner.auth_user_id === session.authUserId
    : false;
  const page = await fetchMilestoneTimelinePage({
    userId: owner.id,
    isOwner,
    viewerId: session?.profile?.id ?? null,
    offset,
    personalFilterSlug,
  });

  const coAuthorPendingInvites =
    isOwner && offset === 0 && session?.profile?.id
      ? await loadPendingCoAuthorInvites(session.profile.id)
      : [];

  return NextResponse.json({ ...page, coAuthorPendingInvites });
}
