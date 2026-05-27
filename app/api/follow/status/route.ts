import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getFollowStatus } from "@/lib/social/follow";
import type { FollowTargetType } from "@/lib/social/types";

const VALID_LOAI = new Set<FollowTargetType>(["user", "tag", "org"]);

function parseLoai(raw: string | null): FollowTargetType | null {
  if (!raw || !VALID_LOAI.has(raw as FollowTargetType)) return null;
  return raw as FollowTargetType;
}

export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  const { searchParams } = new URL(req.url);
  const idDoiTuong = searchParams.get("id_doi_tuong")?.trim();
  const loai = parseLoai(searchParams.get("loai_doi_tuong"));

  if (!idDoiTuong || !loai) {
    return NextResponse.json(
      { error: "Thiếu id_doi_tuong hoặc loai_doi_tuong." },
      { status: 400 },
    );
  }

  const status = await getFollowStatus(
    session?.profile?.id ?? null,
    idDoiTuong,
    loai,
  );
  return NextResponse.json(status);
}
