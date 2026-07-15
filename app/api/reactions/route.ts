import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { markEngagementCanTinhLaiForTarget } from "@/lib/cins/feed-scoring-write";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import {
  ALLOWED_REACTION_EMOJIS,
  REACTION_EMOJI,
  counterpartReactionEmoji,
  type ReactionEmoji,
} from "@/lib/social/reaction-emoji";
import { SOCIAL_LOAI_ORG_BAI_DANG } from "@/lib/truong/social-constants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ALLOWED_TARGETS = new Set<string>([
  SOCIAL_LOAI_DOI_TUONG.COT_MOC,
  SOCIAL_LOAI_ORG_BAI_DANG,
]);

type ReactionBody = {
  loai_doi_tuong?: string;
  id_doi_tuong?: string;
  emoji?: string;
  active?: boolean;
};

export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập để thích bài." }, { status: 401 });
  }

  let body: ReactionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const loaiDoiTuong = body.loai_doi_tuong?.trim();
  const idDoiTuong = body.id_doi_tuong?.trim();
  const emojiRaw = body.emoji?.trim() || REACTION_EMOJI.LIKE;
  if (
    !loaiDoiTuong ||
    !ALLOWED_TARGETS.has(loaiDoiTuong) ||
    !idDoiTuong ||
    !ALLOWED_REACTION_EMOJIS.has(emojiRaw)
  ) {
    return NextResponse.json({ error: "Thông tin reaction không hợp lệ." }, { status: 400 });
  }

  const emoji = emojiRaw as ReactionEmoji;
  const admin = createServiceRoleClient();
  const userId = session.profile.id;

  if (body.active) {
    const { error } = await admin.from("social_reaction").upsert(
      {
        id_nguoi_dung: userId,
        loai_doi_tuong: loaiDoiTuong,
        id_doi_tuong: idDoiTuong,
        emoji,
      },
      { onConflict: "id_nguoi_dung,loai_doi_tuong,id_doi_tuong,emoji" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    /* Like và dislike loại trừ lẫn nhau — mỗi user tối đa một trong hai. */
    const other = counterpartReactionEmoji(emoji);
    const { error: clearErr } = await admin
      .from("social_reaction")
      .delete()
      .eq("id_nguoi_dung", userId)
      .eq("loai_doi_tuong", loaiDoiTuong)
      .eq("id_doi_tuong", idDoiTuong)
      .eq("emoji", other);
    if (clearErr) return NextResponse.json({ error: clearErr.message }, { status: 400 });
  } else {
    const { error } = await admin
      .from("social_reaction")
      .delete()
      .eq("id_nguoi_dung", userId)
      .eq("loai_doi_tuong", loaiDoiTuong)
      .eq("id_doi_tuong", idDoiTuong)
      .eq("emoji", emoji);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const [
    { count: likeCount },
    { count: dislikeCount },
    { data: viewerHeart },
    { data: viewerDislike },
  ] = await Promise.all([
    admin
      .from("social_reaction")
      .select("id", { count: "exact", head: true })
      .eq("loai_doi_tuong", loaiDoiTuong)
      .eq("id_doi_tuong", idDoiTuong)
      .eq("emoji", REACTION_EMOJI.LIKE),
    admin
      .from("social_reaction")
      .select("id", { count: "exact", head: true })
      .eq("loai_doi_tuong", loaiDoiTuong)
      .eq("id_doi_tuong", idDoiTuong)
      .eq("emoji", REACTION_EMOJI.DISLIKE),
    admin
      .from("social_reaction")
      .select("id")
      .eq("id_nguoi_dung", userId)
      .eq("loai_doi_tuong", loaiDoiTuong)
      .eq("id_doi_tuong", idDoiTuong)
      .eq("emoji", REACTION_EMOJI.LIKE)
      .maybeSingle(),
    admin
      .from("social_reaction")
      .select("id")
      .eq("id_nguoi_dung", userId)
      .eq("loai_doi_tuong", loaiDoiTuong)
      .eq("id_doi_tuong", idDoiTuong)
      .eq("emoji", REACTION_EMOJI.DISLIKE)
      .maybeSingle(),
  ]);

  await markEngagementCanTinhLaiForTarget(loaiDoiTuong, idDoiTuong);

  const liked = Boolean(viewerHeart);
  const disliked = Boolean(viewerDislike);

  return NextResponse.json({
    ok: true,
    emoji,
    liked,
    disliked,
    likeCount: likeCount ?? 0,
    dislikeCount: dislikeCount ?? 0,
    /* Giữ field cũ cho client chưa cập nhật. */
    count: emoji === REACTION_EMOJI.LIKE ? (likeCount ?? 0) : (dislikeCount ?? 0),
    active: emoji === REACTION_EMOJI.LIKE ? liked : disliked,
  });
}
