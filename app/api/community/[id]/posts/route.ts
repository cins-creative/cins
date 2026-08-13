import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  canViewCongDongFeed,
  parseCongDongCheDoFromCauHinh,
} from "@/lib/cong-dong/constants";
import { isThanhVien } from "@/lib/cong-dong/membership";
import { parseFilterSlugsFromSearchParams } from "@/lib/cong-dong/parse-filter-query";
import { createCongDongPost, listCongDongPosts } from "@/lib/cong-dong/posts";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

async function getCongDongOrg(orgId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id, loai_to_chuc, cau_hinh")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ id: string; loai_to_chuc: string; cau_hinh: unknown }>();
  return data;
}

/** GET /api/cong-dong/:id/posts?cursor= */
export async function GET(req: Request, ctx: RouteContext) {
  const { id: orgId } = await ctx.params;
  const org = await getCongDongOrg(orgId);
  if (!org) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  const session = await getCurrentSessionAndProfile();
  const viewerId = session?.profile?.id ?? null;
  const member = viewerId ? await isThanhVien(viewerId, orgId) : false;
  const cheDo = parseCongDongCheDoFromCauHinh(org.cau_hinh);
  if (!canViewCongDongFeed(cheDo, member)) {
    return NextResponse.json(
      { error: "Chỉ thành viên mới xem được bài trong cộng đồng này." },
      { status: 403 },
    );
  }

  const searchParams = new URL(req.url).searchParams;
  const cursor = searchParams.get("cursor");
  const filterSlugs = parseFilterSlugsFromSearchParams(searchParams);

  const feed = await listCongDongPosts({
    orgId,
    cursor,
    viewerId,
    filterSlugs,
  });

  return NextResponse.json(feed);
}

/** POST /api/cong-dong/:id/posts */
export async function POST(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  if (!(await getCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  let body: {
    noi_dung?: string;
    tieu_de?: string;
    media_ids?: string[];
    filter_ids?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = await createCongDongPost({
    orgId,
    authorId: session.profile.id,
    noiDung: body.noi_dung ?? "",
    tieuDe: body.tieu_de,
    mediaIds: Array.isArray(body.media_ids) ? body.media_ids : [],
    filterIds: Array.isArray(body.filter_ids) ? body.filter_ids : [],
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, post: result.data });
}
