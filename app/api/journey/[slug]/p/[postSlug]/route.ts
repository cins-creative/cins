import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { fetchPostBySlug } from "@/lib/journey/post-page-fetch";

type Params = Promise<{ slug: string; postSlug: string }>;

export async function GET(
  _request: Request,
  context: { params: Params },
) {
  await getCurrentSessionAndProfile();

  const { slug, postSlug } = await context.params;
  const res = await fetchPostBySlug(slug, postSlug);

  if (!res.ok) {
    const status =
      res.error === "Người dùng không tồn tại." ||
      res.error === "Bài viết không tồn tại." ||
      res.error === "Bài viết chưa gắn vào cột mốc nào." ||
      res.error === "Cột mốc không tồn tại hoặc đã bị xoá."
        ? 404
        : 403;
    return NextResponse.json({ error: res.error }, { status });
  }

  return NextResponse.json(res.data);
}
