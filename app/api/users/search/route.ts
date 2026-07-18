import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listFollowingUserIds } from "@/lib/social/follow";
import { listFriends } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type UserSearchQuanHe = "ban_be" | "theo_doi" | "nguoi_la";

const QUAN_HE_RANK: Record<UserSearchQuanHe, number> = {
  ban_be: 0,
  theo_doi: 1,
  nguoi_la: 2,
};

function escapeIlike(raw: string): string {
  return raw.replace(/[%_,]/g, "\\$&");
}

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
  const rankRelation = searchParams.get("rank_relation") === "true";
  const orgId = (searchParams.get("org_id") ?? "").trim();
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 50)
    : friendsOnly
      ? 20
      : 40;

  const admin = createServiceRoleClient();

  const needRelationSets = friendsOnly || mutualOnly || rankRelation;
  let friends: string[] = [];
  let following: string[] = [];
  if (needRelationSets) {
    [friends, following] = await Promise.all([
      listFriends(profileId),
      listFollowingUserIds(profileId),
    ]);
  }

  let allowedIds: string[] | null = null;
  if (friendsOnly || mutualOnly) {
    if (friendsOnly) {
      allowedIds = friends.filter((id) => id !== profileId);
    } else {
      // mutual_only: bạn bè + người mình đang theo dõi.
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
    const safe = escapeIlike(q);
    query = query.or(`slug.ilike.%${safe}%,ten_hien_thi.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type UserRow = {
    id: string;
    slug: string;
    ten_hien_thi: string;
    avatar_id: string | null;
    quan_he?: UserSearchQuanHe;
  };

  let users: UserRow[] = (data ?? []).map((u) => ({
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
      const ownerUser: UserRow = {
        id: owner.id,
        slug: owner.slug ?? "",
        ten_hien_thi: owner.ten_hien_thi ?? "",
        avatar_id: owner.avatar_id ?? null,
      };
      const rest = users.filter((u) => u.id !== owner.id);
      users = [ownerUser, ...rest];
    }
  }

  if (rankRelation) {
    const friendSet = new Set(friends);
    const followingSet = new Set(following);
    users = users
      .map((u) => {
        const quan_he: UserSearchQuanHe = friendSet.has(u.id)
          ? "ban_be"
          : followingSet.has(u.id)
            ? "theo_doi"
            : "nguoi_la";
        return { ...u, quan_he };
      })
      .sort((a, b) => {
        const rankA = QUAN_HE_RANK[a.quan_he ?? "nguoi_la"];
        const rankB = QUAN_HE_RANK[b.quan_he ?? "nguoi_la"];
        if (rankA !== rankB) return rankA - rankB;
        const nameA = (a.ten_hien_thi || a.slug).toLocaleLowerCase("vi");
        const nameB = (b.ten_hien_thi || b.slug).toLocaleLowerCase("vi");
        return nameA.localeCompare(nameB, "vi");
      });
  }

  return NextResponse.json({ users });
}
