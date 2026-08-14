import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { buildSupabaseOrIlike } from "@/lib/search/ilike-patterns";
import { listFollowingUserIds } from "@/lib/social/follow";
import { listFriends } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type UserSearchQuanHe = "ban_be" | "theo_doi" | "nguoi_la";

const QUAN_HE_RANK: Record<UserSearchQuanHe, number> = {
  ban_be: 0,
  theo_doi: 1,
  nguoi_la: 2,
};

const SELECT_COLS = "id, slug, ten_hien_thi, avatar_id";

type UserRow = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
  quan_he?: UserSearchQuanHe;
};

function mapRows(
  data: Array<{
    id: string;
    slug: string;
    ten_hien_thi: string;
    avatar_id: string | null;
  }> | null,
): UserRow[] {
  return (data ?? []).map((u) => ({
    id: u.id,
    slug: u.slug,
    ten_hien_thi: u.ten_hien_thi,
    avatar_id: u.avatar_id,
  }));
}

export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const profileId = session.profile.id;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const friendsOnly = searchParams.get("friends_only") === "true";
  const mutualOnly = searchParams.get("mutual_only") === "true";
  const rankRelation = searchParams.get("rank_relation") === "true";
  const orgId = (searchParams.get("org_id") ?? "").trim();
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 50)
    : 50;

  const admin = createServiceRoleClient();
  const ilike =
    q.length >= 1
      ? buildSupabaseOrIlike(["slug", "ten_hien_thi"], q, {
          phraseOnly: true,
          minTokenLength: 1,
        })
      : "";

  const needRelationSets = friendsOnly || mutualOnly || rankRelation;
  let friends: string[] = [];
  let following: string[] = [];
  if (needRelationSets) {
    [friends, following] = await Promise.all([
      listFriends(profileId),
      listFollowingUserIds(profileId),
    ]);
  }

  const circleIds = [...new Set([...friends, ...following])].filter(
    (id) => id !== profileId,
  );

  let allowedIds: string[] | null = null;
  if (friendsOnly || mutualOnly) {
    allowedIds = friendsOnly
      ? friends.filter((id) => id !== profileId)
      : circleIds;
    if (allowedIds.length === 0) {
      return NextResponse.json({ users: [] });
    }
  }

  async function fetchUsers(opts: {
    ids?: string[] | null;
    excludeIds?: string[];
    take: number;
  }): Promise<{ users: UserRow[]; error: string | null }> {
    if (opts.ids && opts.ids.length === 0) return { users: [], error: null };
    if (opts.take <= 0) return { users: [], error: null };

    let query = admin.from("user_nguoi_dung").select(SELECT_COLS);
    if (!orgId) query = query.neq("id", profileId);
    if (opts.ids) query = query.in("id", opts.ids.slice(0, 200));
    if (opts.excludeIds && opts.excludeIds.length > 0) {
      query = query.not("id", "in", `(${opts.excludeIds.join(",")})`);
    }
    if (ilike) query = query.or(ilike);
    query = query.order("ten_hien_thi", { ascending: true }).limit(opts.take);

    const { data, error } = await query;
    if (error) return { users: [], error: error.message };
    return { users: mapRows(data), error: null };
  }

  let users: UserRow[] = [];

  /* Gõ tên: ưu tiên bạn bè / đang theo dõi trước — tránh `%mon%` lấy 40
     user lạ (common, simon, monday…) rồi cắt mất bạn tên Mon. */
  if (ilike && rankRelation && !allowedIds) {
    const circle = await fetchUsers({ ids: circleIds, take: limit });
    if (circle.error) {
      return NextResponse.json({ error: circle.error }, { status: 500 });
    }
    const remain = limit - circle.users.length;
    const rest =
      remain > 0
        ? await fetchUsers({
            excludeIds: circle.users.map((u) => u.id),
            take: remain,
          })
        : { users: [], error: null };
    if (rest.error) {
      return NextResponse.json({ error: rest.error }, { status: 500 });
    }
    users = [...circle.users, ...rest.users];
  } else {
    const loaded = await fetchUsers({
      ids: allowedIds,
      take: limit,
    });
    if (loaded.error) {
      return NextResponse.json({ error: loaded.error }, { status: 500 });
    }
    users = loaded.users;
  }

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
