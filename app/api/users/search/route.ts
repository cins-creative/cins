import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listFollowingUserIds } from "@/lib/social/follow";
import { listFriends } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const profileId = session.profile.id;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const friendsOnly = searchParams.get("friends_only") === "true";
  const mutualOnly = searchParams.get("mutual_only") === "true";
  const orgId = (searchParams.get("org_id") ?? "").trim();
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 50)
    : friendsOnly
      ? 20
      : 40;

  const admin = createServiceRoleClient();
  let allowedIds: string[] | null = null;
  if (friendsOnly || mutualOnly) {
    const friends = await listFriends(profileId);
    if (friendsOnly) {
      allowedIds = friends.filter((id) => id !== profileId);
    } else {
      // mutual_only: bạn bè + người mình đang theo dõi.
      const following = await listFollowingUserIds(profileId);
      allowedIds = [...new Set([...friends, ...following])].filter(
        (id) => id !== profileId,
      );
    }
    if (allowedIds.length === 0) {
      return NextResponse.json({ users: [] });
    }
  }

  let query = admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .limit(limit);

  // Org studio picker — cho phép tìm cả chính mình + owner org (ghim đầu danh sách).
  if (!orgId) {
    query = query.neq("id", profileId);
  }

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

  if (orgId) {
    const { data: ownerMember } = await admin
      .from("user_thanh_vien_to_chuc")
      .select(
        "user_nguoi_dung: id_nguoi_dung ( id, slug, ten_hien_thi, avatar_id )",
      )
      .eq("id_to_chuc", orgId)
      .eq("vai_tro", "owner")
      .maybeSingle<{
        user_nguoi_dung?: {
          id?: string;
          slug?: string;
          ten_hien_thi?: string | null;
          avatar_id?: string | null;
        } | null;
      }>();

    const owner = ownerMember?.user_nguoi_dung;
    if (owner?.id) {
      const ownerUser = {
        id: owner.id,
        slug: owner.slug ?? "",
        ten_hien_thi: owner.ten_hien_thi,
        avatar_id: owner.avatar_id ?? null,
      };
      const rest = users.filter((u) => u.id !== owner.id);
      return NextResponse.json({ users: [ownerUser, ...rest] });
    }
  }

  return NextResponse.json({ users });
}
