import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";
import {
  deleteBaiTapModule,
  updateBaiTapModule,
} from "@/lib/to-chuc/bai-tap-module";

type Ctx = { params: Promise<{ id: string; baiId: string }> };

async function requireSua(orgId: string) {
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  const quyen = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "khoa-lop");
  if (quyen !== "sua") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { actorId };
}

/** PATCH /api/co-so/:id/bai-tap/:baiId */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id: orgId, baiId } = await ctx.params;
  const auth = await requireSua(orgId);
  if ("error" in auth && auth.error) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const row = await updateBaiTapModule(orgId, baiId, {
      tenBaiTap:
        body.tenBaiTap === undefined ? undefined : String(body.tenBaiTap),
      moTa: body.moTa === undefined ? undefined : String(body.moTa ?? ""),
      yeuCau:
        body.yeuCau === undefined ? undefined : String(body.yeuCau ?? ""),
      videoYoutubeUrl:
        body.videoYoutubeUrl === undefined
          ? undefined
          : String(body.videoYoutubeUrl ?? ""),
      thumbnailUrl:
        body.thumbnailUrl === undefined
          ? undefined
          : String(body.thumbnailUrl ?? ""),
    });
    return NextResponse.json({ row });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không cập nhật được bài tập.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** DELETE /api/co-so/:id/bai-tap/:baiId?force=1 */
export async function DELETE(req: Request, ctx: Ctx) {
  const { id: orgId, baiId } = await ctx.params;
  const auth = await requireSua(orgId);
  if ("error" in auth && auth.error) return auth.error;

  const force = new URL(req.url).searchParams.get("force") === "1";

  try {
    const result = await deleteBaiTapModule(orgId, baiId, { force });
    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Bài tập đang được dùng trong bộ giáo trình.",
          usedIn: result.usedIn,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không xóa được bài tập.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
