import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import type { OrgAttachEvidence } from "@/lib/journey/org-milestone-tag-types";
import {
  listMilestoneOrgTagRequestsForOwner,
  submitOrgMilestoneTagRequest,
} from "@/lib/journey/org-milestone-tag";

type RouteContext = { params: Promise<{ milestoneId: string }> };

/** GET /api/milestone/:milestoneId/org-tag — trạng thái yêu cầu gắn org (chủ bài). */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { milestoneId } = await ctx.params;
  const result = await listMilestoneOrgTagRequestsForOwner({
    cotMocId: milestoneId,
    viewerId: session.profile.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ items: result.items });
}

/** POST /api/milestone/:milestoneId/org-tag — gửi yêu cầu gắn org (chờ duyệt). */
export async function POST(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { milestoneId } = await ctx.params;
  let body: {
    orgId?: string;
    nam?: number;
    khoaHocId?: string | null;
    nganhId?: string | null;
    monHocId?: string | null;
    tacPhamId?: string;
    milestoneTitle?: string;
    milestoneKind?: string;
    projectTitle?: string;
    album?: {
      title?: string;
      href?: string;
      excerpt?: string | null;
      coverSrc?: string | null;
      coverAlt?: string | null;
      photoCount?: number | null;
    };
    evidence?: OrgAttachEvidence[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const orgId = body.orgId?.trim();
  const tacPhamId = body.tacPhamId?.trim();
  if (!orgId || !tacPhamId) {
    return NextResponse.json({ error: "Thiếu orgId hoặc tacPhamId." }, { status: 400 });
  }

  const nam = Number(body.nam);
  const albumHref = body.album?.href?.trim();
  const albumTitle = body.album?.title?.trim();
  if (!albumHref || !albumTitle) {
    return NextResponse.json({ error: "Thiếu thông tin album." }, { status: 400 });
  }

  const result = await submitOrgMilestoneTagRequest({
    viewerId: session.profile.id,
    cotMocId: milestoneId,
    orgId,
    nam,
    khoaHocId: body.khoaHocId ?? null,
    nganhId: body.nganhId ?? null,
    monHocId: body.monHocId ?? null,
    tacPhamId,
    milestoneTitle: body.milestoneTitle?.trim() || "Cột mốc",
    milestoneKind: body.milestoneKind?.trim() || "du_an",
    projectTitle: body.projectTitle?.trim() || body.milestoneTitle?.trim() || "Dự án",
    evidence: Array.isArray(body.evidence) ? body.evidence : [],
    album: {
      title: albumTitle,
      href: albumHref,
      excerpt: body.album?.excerpt ?? null,
      coverSrc: body.album?.coverSrc ?? null,
      coverAlt: body.album?.coverAlt ?? null,
      photoCount: body.album?.photoCount ?? null,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, requestId: result.requestId });
}
