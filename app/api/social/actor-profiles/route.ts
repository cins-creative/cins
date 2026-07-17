import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { fetchSocialActorProfilesByIds } from "@/lib/social/actors-fetch";

export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const rawIds =
    body &&
    typeof body === "object" &&
    Array.isArray((body as { ids?: unknown }).ids)
      ? ((body as { ids: unknown[] }).ids)
      : null;

  if (!rawIds) {
    return NextResponse.json({ error: "Thiếu danh sách id." }, { status: 400 });
  }

  const userIds = rawIds
    .filter((id): id is string => typeof id === "string")
    .map((id) => id.trim())
    .filter(Boolean);

  const result = await fetchSocialActorProfilesByIds({
    userIds,
    viewerId: session?.profile?.id ?? null,
  });

  return NextResponse.json(result);
}
