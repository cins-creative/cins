import { NextResponse } from "next/server";

import {
  fetchMilestonePostDetail,
  fetchPostCommentsForViewer,
} from "@/lib/journey/post-page-fetch";

type Params = Promise<{ milestoneId: string }>;

/**
 * GET detail cột mốc.
 * - `?lite=1` — bỏ comments + Bunny enrich + html trùng blocks (modal/prefetch nhanh).
 * - `?part=comments` — chỉ trả `{ comments }` để hydrate sau lite.
 */
export async function GET(
  request: Request,
  context: { params: Params },
) {
  const { milestoneId } = await context.params;
  const url = new URL(request.url);
  const part = url.searchParams.get("part");
  const lite = url.searchParams.get("lite") === "1";

  if (part === "comments") {
    try {
      const comments = await fetchPostCommentsForViewer(milestoneId);
      return NextResponse.json({ comments });
    } catch {
      return NextResponse.json(
        { error: "Không tải được bình luận." },
        { status: 500 },
      );
    }
  }

  const res = await fetchMilestonePostDetail(milestoneId, {
    includeComments: !lite,
    enrichVideoRatio: !lite,
    omitDuplicateHtml: lite,
  });

  if (!res.ok) {
    const status =
      res.error === "Cột mốc không tồn tại hoặc đã bị xoá." ||
      res.error === "Thiếu ID cột mốc."
        ? 404
        : 403;
    return NextResponse.json({ error: res.error }, { status });
  }

  return NextResponse.json(res.data);
}
