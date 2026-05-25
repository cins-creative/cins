import { NextResponse } from "next/server";

import { getCoverUrl } from "@/lib/articles/cover";
import {
  resolveCatalogThumbnailId,
  resolveMonThiThumbDisplayUrl,
} from "@/lib/truong/mon-thi-thumbnail";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("edu_mon_thi")
      .select("id, ten, loai, ma, thumbnail_id, id_bai_viet")
      .order("ten", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rawRows: {
      id: string;
      ten: string;
      loai: string | null;
      ma: string | null;
      thumbnail_id: string;
      id_bai_viet: string | null;
    }[] = [];

    for (const row of data ?? []) {
      const r = row as {
        id?: string;
        ten?: string;
        loai?: string | null;
        ma?: string | null;
        thumbnail_id?: string | null;
        id_bai_viet?: string | null;
      };
      const rid = r.id?.trim();
      const ten = r.ten?.trim();
      if (!rid || !ten) continue;
      const loai = r.loai ?? null;
      rawRows.push({
        id: rid,
        ten,
        loai,
        ma: r.ma?.trim() || null,
        thumbnail_id: resolveCatalogThumbnailId(r.thumbnail_id, loai),
        id_bai_viet: r.id_bai_viet?.trim() || null,
      });
    }

    const articleIds = [
      ...new Set(rawRows.map((r) => r.id_bai_viet).filter((x): x is string => !!x)),
    ];
    const articleCoverById = new Map<string, string | null>();
    if (articleIds.length) {
      const { data: articles } = await supabase
        .from("article_bai_viet")
        .select("id, cover_id")
        .in("id", articleIds);
      for (const row of articles ?? []) {
        const a = row as { id?: string; cover_id?: string | null };
        const aid = a.id?.trim();
        if (!aid) continue;
        articleCoverById.set(aid, getCoverUrl(a.cover_id) ?? null);
      }
    }

    const items = await Promise.all(
      rawRows.map(async (r) => ({
        id: r.id,
        ten: r.ten,
        loai: r.loai,
        ma: r.ma,
        thumbnail_id: r.thumbnail_id,
        thumbnail_url: await resolveMonThiThumbDisplayUrl({
          thumbnail_id: r.thumbnail_id,
          id_bai_viet: r.id_bai_viet,
          articleCoverById,
        }),
      })),
    );

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Failed to load catalog" }, { status: 500 });
  }
}
