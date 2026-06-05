import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getBunnyVideoStatus } from "@/lib/bunny/stream";
import type { Block } from "@/lib/editor/types";
import {
  clearVideoProcessingInBlocks,
  extractVideoProcessingMeta,
} from "@/lib/journey/video-processing-meta";
import { notifyVideoReady } from "@/lib/social/video-ready";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/* POST /api/post-video/complete — gỡ cờ processing + thông báo khi Bunny sẵn sàng. */

export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  let tacPhamId = "";
  let bunnyVideoId = "";
  try {
    const body = (await request.json()) as {
      tacPhamId?: unknown;
      bunnyVideoId?: unknown;
    };
    tacPhamId =
      typeof body.tacPhamId === "string" ? body.tacPhamId.trim() : "";
    bunnyVideoId =
      typeof body.bunnyVideoId === "string" ? body.bunnyVideoId.trim() : "";
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  if (!tacPhamId || !bunnyVideoId) {
    return NextResponse.json(
      { error: "Thiếu tacPhamId hoặc bunnyVideoId." },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();
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
  if (!meta?.processing || meta.bunnyVideoId !== bunnyVideoId) {
    return NextResponse.json({ ok: true, alreadyComplete: true });
  }

  const bunnyStatus = await getBunnyVideoStatus(bunnyVideoId);
  if (!bunnyStatus.ok) {
    const status = bunnyStatus.error.includes("cấu hình") ? 503 : 502;
    return NextResponse.json({ error: bunnyStatus.error }, { status });
  }
  if (!bunnyStatus.ready) {
    return NextResponse.json({ ok: false, ready: false });
  }

  const nextBlocks = clearVideoProcessingInBlocks(blocks, bunnyVideoId);
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
