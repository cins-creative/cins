import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getVideoStatus } from "@/lib/video/status";
import type { Block } from "@/lib/editor/types";
import {
  clearVideoProcessingInBlocks,
  extractVideoProcessingMeta,
} from "@/lib/journey/video-processing-meta";
import { notifyVideoReady } from "@/lib/social/video-ready";
import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/* POST /api/post-video/complete — gỡ cờ processing + thông báo khi Stream sẵn sàng. */

export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  let tacPhamId = "";
  let orgBaiDangId = "";
  let orgId = "";
  let videoId = "";
  let provider: string | null = null;
  try {
    const body = (await request.json()) as {
      tacPhamId?: unknown;
      orgBaiDangId?: unknown;
      orgId?: unknown;
      bunnyVideoId?: unknown;
      videoId?: unknown;
      provider?: unknown;
    };
    tacPhamId =
      typeof body.tacPhamId === "string" ? body.tacPhamId.trim() : "";
    orgBaiDangId =
      typeof body.orgBaiDangId === "string" ? body.orgBaiDangId.trim() : "";
    orgId = typeof body.orgId === "string" ? body.orgId.trim() : "";
    videoId =
      (typeof body.videoId === "string" ? body.videoId.trim() : "") ||
      (typeof body.bunnyVideoId === "string" ? body.bunnyVideoId.trim() : "");
    provider = typeof body.provider === "string" ? body.provider.trim() : null;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  if (!videoId || (!tacPhamId && !(orgBaiDangId && orgId))) {
    return NextResponse.json(
      { error: "Thiếu tacPhamId hoặc (orgBaiDangId + orgId), hoặc videoId." },
      { status: 400 },
    );
  }

  const videoStatus = await getVideoStatus(videoId, provider);
  if (!videoStatus.ok) {
    const status = videoStatus.error.includes("cấu hình") ? 503 : 502;
    return NextResponse.json({ error: videoStatus.error }, { status });
  }
  if (!videoStatus.ready) {
    return NextResponse.json({ ok: false, ready: false });
  }

  const admin = createServiceRoleClient();

  if (orgBaiDangId && orgId) {
    const denied = await assertTruongOrgWriteApi(request, orgId);
    if (denied) return denied;

    const { data: post, error: fetchError } = await admin
      .from("org_bai_dang")
      .select("id, id_to_chuc, noi_dung_blocks")
      .eq("id", orgBaiDangId)
      .eq("id_to_chuc", orgId)
      .maybeSingle();

    if (fetchError || !post) {
      return NextResponse.json({ error: "Không tìm thấy bài đăng." }, { status: 404 });
    }

    const blocks = (post.noi_dung_blocks ?? []) as Block[];
    const meta = extractVideoProcessingMeta(blocks);
    if (!meta?.processing || meta.videoId !== videoId) {
      return NextResponse.json({ ok: true, alreadyComplete: true });
    }

    const nextBlocks = clearVideoProcessingInBlocks(blocks, videoId);
    const { error: updateError } = await admin
      .from("org_bai_dang")
      .update({ noi_dung_blocks: nextBlocks })
      .eq("id", orgBaiDangId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { data: orgRow } = await admin
      .from("org_to_chuc")
      .select("slug")
      .eq("id", orgId)
      .maybeSingle();
    if (orgRow?.slug) {
      revalidatePath(`/academy/${orgRow.slug}`);
      revalidatePath(`/university/${orgRow.slug}`);
      revalidatePath(`/studio/${orgRow.slug}`);
    }

    return NextResponse.json({ ok: true, ready: true });
  }

  const { data: post, error: fetchError } = await admin
    .from("content_tac_pham")
    .select("id, id_nguoi_dung, noi_dung_blocks")
    .eq("id", tacPhamId)
    .maybeSingle();

  if (fetchError || !post) {
    return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });
  }

  if (post.id_nguoi_dung !== session.profile.id) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const blocks = (post.noi_dung_blocks ?? []) as Block[];
  const meta = extractVideoProcessingMeta(blocks);
  if (!meta?.processing || meta.videoId !== videoId) {
    return NextResponse.json({ ok: true, alreadyComplete: true });
  }

  const nextBlocks = clearVideoProcessingInBlocks(blocks, videoId);
  const { error: updateError } = await admin
    .from("content_tac_pham")
    .update({ noi_dung_blocks: nextBlocks })
    .eq("id", tacPhamId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await notifyVideoReady({
    ownerId: session.profile.id,
    tacPhamId,
  });

  const { data: ownerRow } = await admin
    .from("user_nguoi_dung")
    .select("slug")
    .eq("id", session.profile.id)
    .maybeSingle();
  if (ownerRow?.slug) {
    revalidatePath(`/${ownerRow.slug}`);
  }

  return NextResponse.json({ ok: true, ready: true });
}
