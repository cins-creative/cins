import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  publishPost,
  type PublishPostInput,
} from "@/lib/editor/post-publish-action";
import { VALID_LOAI_MOC, VALID_VIS, type Block } from "@/lib/editor/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/posts/publish — JSON + Bearer (app native).
 * Bọc `publishPost` (cùng server action web EditorView). Không đổi schema.
 */
export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: Partial<PublishPostInput> & { blocks?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body JSON không hợp lệ." },
      { status: 400 },
    );
  }

  const ownerSlug =
    (typeof body.ownerSlug === "string" && body.ownerSlug.trim()) ||
    session.profile.slug;
  if (!ownerSlug) {
    return NextResponse.json({ error: "Thiếu slug chủ bài." }, { status: 400 });
  }

  const visibility = VALID_VIS.includes(body.visibility as never)
    ? body.visibility
    : "public";
  const loaiMoc = VALID_LOAI_MOC.includes(body.loaiMoc as never)
    ? body.loaiMoc
    : "ca_nhan";

  const today = new Date();
  const thoiDiem =
    typeof body.thoiDiem === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.thoiDiem)
      ? body.thoiDiem
      : `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const blocks = Array.isArray(body.blocks) ? (body.blocks as Block[]) : [];

  const result = await publishPost({
    ownerSlug,
    ownerId:
      typeof body.ownerId === "string" && body.ownerId.trim()
        ? body.ownerId.trim()
        : session.profile.id,
    tieuDe: typeof body.tieuDe === "string" ? body.tieuDe : "",
    moTa: typeof body.moTa === "string" ? body.moTa : "",
    coverSeed: body.coverSeed ?? null,
    visibility,
    loaiMoc,
    thoiDiem,
    blocks,
    tags: body.tags,
    visibilityCustom: body.visibilityCustom,
    coAuthors: body.coAuthors,
    personalFilterIds: body.personalFilterIds,
    schedulePublishAt: body.schedulePublishAt,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, field: result.field },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    slug: result.slug,
    cotMocId: result.cotMocId,
    tacPhamId: result.tacPhamId,
  });
}
