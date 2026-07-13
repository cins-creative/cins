import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  createRoomTag,
  listRoomResources,
  listRoomTags,
} from "@/lib/chat/room-tags";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export async function GET(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  const url = new URL(req.url);
  const withResources = url.searchParams.get("resources") === "1";
  const filterTagId = url.searchParams.get("tag")?.trim() || null;

  if (withResources) {
    const result = await listRoomResources(
      roomId,
      session.profile.id,
      filterTagId,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }
    return NextResponse.json({
      tags: result.tags,
      items: result.items,
    });
  }

  const result = await listRoomTags(roomId, session.profile.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json({ tags: result.tags });
}

export async function POST(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;

  let body: { ten?: string; mau?: string | null };
  try {
    body = (await req.json()) as { ten?: string; mau?: string | null };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const result = await createRoomTag(
    roomId,
    session.profile.id,
    body.ten ?? "",
    body.mau,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ tag: result.tag });
}
