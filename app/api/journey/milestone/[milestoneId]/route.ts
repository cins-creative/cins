import { NextResponse } from "next/server";

import { fetchMilestonePostDetail } from "@/lib/journey/post-page-fetch";

type Params = Promise<{ milestoneId: string }>;

export async function GET(
  _request: Request,
  context: { params: Params },
) {
  const { milestoneId } = await context.params;
  const res = await fetchMilestonePostDetail(milestoneId);

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
