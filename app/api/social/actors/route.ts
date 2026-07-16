import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { fetchSocialActorsPage } from "@/lib/social/actors-fetch";
import type { SocialInteractionKind } from "@/lib/social/actors-types";

export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") as SocialInteractionKind | null;
  const loaiDoiTuong = searchParams.get("loai_doi_tuong")?.trim() ?? "";
  const idDoiTuong = searchParams.get("id_doi_tuong")?.trim() ?? "";
  const emoji = searchParams.get("emoji")?.trim() || null;
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);

  if (!kind || !loaiDoiTuong || !idDoiTuong) {
    return NextResponse.json({ error: "Thiếu tham số." }, { status: 400 });
  }

  const result = await fetchSocialActorsPage({
    kind,
    loaiDoiTuong,
    idDoiTuong,
    emoji,
    offset,
    viewerId: session?.profile?.id ?? null,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
