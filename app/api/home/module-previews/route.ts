import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  loadModulePreview,
  parseModulePreviewId,
} from "@/lib/cins/home-adaptive/module-preview";
import type { ModulePreviewPayload } from "@/lib/cins/home-adaptive/module-preview-types";
import {
  resolveSeeking,
  type GiaiDoan,
  type ModuleId,
} from "@/lib/cins/home-adaptive/persona";

const MAX_IDS = 24;

/**
 * GET /api/home/module-previews?ids=a,b,c
 * Batch preview — mỗi khối tối đa 3 dòng (xem loadModulePreview).
 */
export async function GET(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = [
    ...new Set(
      raw
        .split(",")
        .map((s) => parseModulePreviewId(s.trim()))
        .filter((id): id is ModuleId => id != null),
    ),
  ].slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json({ error: "Thiếu id khối." }, { status: 422 });
  }

  const giaiDoan = (session.profile.giai_doan ?? null) as GiaiDoan | null;
  const ctx = {
    viewerId: session.profile.id,
    viewerSlug: session.profile.slug,
    giaiDoan,
    seeking: resolveSeeking(giaiDoan),
    limit: 3,
  };

  try {
    const settled = await Promise.all(
      ids.map(async (id) => {
        try {
          const payload = await loadModulePreview(id, ctx);
          return [id, payload] as const;
        } catch (err) {
          console.error("[module-previews]", id, err);
          return [id, { id, empty: true } as ModulePreviewPayload] as const;
        }
      }),
    );

    const previews: Record<string, ModulePreviewPayload> = {};
    for (const [id, payload] of settled) {
      previews[id] = payload;
    }
    return NextResponse.json({ previews });
  } catch (err) {
    console.error("[module-previews]", err);
    return NextResponse.json(
      { error: "Không tải được nội dung khối." },
      { status: 500 },
    );
  }
}
