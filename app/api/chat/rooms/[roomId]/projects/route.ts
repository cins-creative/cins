import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  createProjectRoom,
  listProjectRoomsForParent,
} from "@/lib/chat/project-room";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  const result = await listProjectRoomsForParent(roomId, session.profile.id, {
    includeHidden: true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ projects: result.projects });
}

export async function POST(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;

  let body: { ten_phong?: string; id_thanh_vien?: string[] };
  try {
    body = (await req.json()) as {
      ten_phong?: string;
      id_thanh_vien?: string[];
    };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const result = await createProjectRoom(
    roomId,
    session.profile.id,
    body.ten_phong ?? "",
    Array.isArray(body.id_thanh_vien) ? body.id_thanh_vien : null,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ thread: result.thread });
}
