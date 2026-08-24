import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { markEngagementCanTinhLaiForTarget } from "@/lib/cins/feed-scoring-write";
import { notifyMilestoneComment } from "@/lib/social/follow";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Params = Promise<{ milestoneId: string }>;

const MAX_COMMENT_LEN = 1000;

/**
 * POST bình luận cột mốc — JSON + Bearer (app native).
 * Body: `{ noi_dung: string }`
 */
export async function POST(
  request: Request,
  context: { params: Params },
) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { milestoneId } = await context.params;
  const id = milestoneId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Thiếu ID cột mốc." }, { status: 400 });
  }

  let body: { noi_dung?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const text = (body.noi_dung ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Nội dung bình luận trống." }, { status: 400 });
  }
  if (text.length > MAX_COMMENT_LEN) {
    return NextResponse.json(
      { error: `Bình luận tối đa ${MAX_COMMENT_LEN} ký tự.` },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();
  const { data: cotMoc } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung, che_do_hien_thi")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      id_nguoi_dung: string;
      che_do_hien_thi: string;
    }>();

  if (!cotMoc) {
    return NextResponse.json({ error: "Cột mốc không tồn tại." }, { status: 404 });
  }
  if (
    cotMoc.che_do_hien_thi === "chi_minh" &&
    cotMoc.id_nguoi_dung !== session.profile.id
  ) {
    return NextResponse.json(
      { error: "Cột mốc đang ở chế độ riêng tư." },
      { status: 403 },
    );
  }

  const { data: inserted, error } = await admin
    .from("social_binh_luan")
    .insert({
      nguoi_binh_luan: session.profile.id,
      loai_doi_tuong: "cot_moc",
      id_doi_tuong: id,
      noi_dung: text,
    })
    .select("id, tao_luc, noi_dung")
    .single<{ id: string; tao_luc: string; noi_dung: string }>();

  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message ?? "Không gửi được bình luận." },
      { status: 400 },
    );
  }

  await markEngagementCanTinhLaiForTarget("cot_moc", id);

  const { data: ownerProfile } = await admin
    .from("user_nguoi_dung")
    .select("slug")
    .eq("id", cotMoc.id_nguoi_dung)
    .maybeSingle<{ slug: string }>();
  if (ownerProfile?.slug) {
    revalidatePath(`/${ownerProfile.slug}`);
  }

  await notifyMilestoneComment({
    ownerId: cotMoc.id_nguoi_dung,
    commenterId: session.profile.id,
    commentId: inserted.id,
    milestoneId: id,
  });

  return NextResponse.json({
    ok: true,
    comment: {
      id: inserted.id,
      noiDung: inserted.noi_dung,
      taoLuc: inserted.tao_luc,
      author: {
        id: session.profile.id,
        slug: session.profile.slug,
        tenHienThi: session.profile.ten_hien_thi || session.profile.slug,
        avatarId: session.profile.avatar_id ?? null,
      },
      isOwn: true,
    },
  });
}
