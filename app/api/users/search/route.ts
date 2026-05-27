import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listMutualFollowUserIds } from "@/lib/social/follow";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const mutualOnly = searchParams.get("mutual_only") === "true";

  const admin = createServiceRoleClient();
  let allowedIds: string[] | null = null;
  if (mutualOnly) {
    allowedIds = await listMutualFollowUserIds(session.profile.id);
    if (allowedIds.length === 0) {
      return NextResponse.json({ users: [] });
    }
  }

  let query = admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .neq("id", session.profile.id)
    .limit(20);

  if (allowedIds) {
    query = query.in("id", allowedIds);
  }

  if (q.length >= 1) {
    query = query.or(`slug.ilike.%${q}%,ten_hien_thi.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (data ?? []).map((u) => ({
    id: u.id,
    slug: u.slug,
    ten_hien_thi: u.ten_hien_thi,
    avatar_id: u.avatar_id,
  }));

  return NextResponse.json({ users });
}
