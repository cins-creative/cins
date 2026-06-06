import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getFollowStatus, parseEntityFollowLoai } from "@/lib/social/follow";

export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  const { searchParams } = new URL(req.url);
  const id_doi_tuong = searchParams.get("id_doi_tuong")?.trim();
  const loai = parseEntityFollowLoai(searchParams.get("loai_doi_tuong"));

  if (!id_doi_tuong || !loai) {
    return NextResponse.json(
      { error: "Thiếu id_doi_tuong hoặc loai_doi_tuong (tag/org)." },
      { status: 400 },
    );
  }

  const status = await getFollowStatus(
    session?.profile?.id ?? null,
    id_doi_tuong,
    loai,
  );
  return NextResponse.json(status);
}
