import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { reorderGalleryNoiBat } from "@/lib/journey/gallery-noi-bat-order";
import { fetchGalleryForUser } from "@/lib/journey/gallery-page-fetch";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Params = Promise<{ slug: string }>;

async function resolveJourneyOwner(slug: string) {
  const admin = createServiceRoleClient();
  const { data: owner, error } = await admin
    .from("user_nguoi_dung")
    .select("id, giai_doan")
    .eq("slug", slug)
    .maybeSingle<{ id: string; giai_doan: string | null }>();

  if (error || !owner || owner.giai_doan === null) return null;
  return owner;
}

export async function GET(
  _request: Request,
  context: { params: Params },
) {
  const session = await getCurrentSessionAndProfile();
  const { slug } = await context.params;
  const owner = await resolveJourneyOwner(slug);
  if (!owner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const aside = await fetchGalleryForUser({
    userId: owner.id,
    ownerSlug: slug,
    viewerId: session?.profile?.id ?? null,
  });

  return NextResponse.json(aside);
}

/** PATCH — chủ Journey kéo sắp Nội dung nổi bật (cột aside). */
export async function PATCH(
  request: Request,
  context: { params: Params },
) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { slug } = await context.params;
  const owner = await resolveJourneyOwner(slug);
  if (!owner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (owner.id !== session.profile.id) {
    return NextResponse.json(
      { error: "Chỉ chủ Journey được sắp xếp cột nổi bật." },
      { status: 403 },
    );
  }

  let body: { cotMocIds?: unknown };
  try {
    body = (await request.json()) as { cotMocIds?: unknown };
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  if (!Array.isArray(body.cotMocIds)) {
    return NextResponse.json(
      { error: "Thiếu cotMocIds (mảng id theo thứ tự)." },
      { status: 400 },
    );
  }

  const cotMocIds = body.cotMocIds.filter(
    (id): id is string => typeof id === "string",
  );
  const result = await reorderGalleryNoiBat({
    userId: owner.id,
    cotMocIds,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const aside = await fetchGalleryForUser({
    userId: owner.id,
    ownerSlug: slug,
    viewerId: session.profile.id,
  });

  return NextResponse.json({ ok: true, pinned: aside.pinned });
}
