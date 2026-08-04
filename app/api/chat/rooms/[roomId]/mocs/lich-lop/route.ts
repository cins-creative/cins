import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  disableLopHocLichMoc,
  enableLopHocLichMoc,
  getLopHocLichMocEnabled,
} from "@/lib/chat/room-moc-lop-lich";
import { listRoomMocs } from "@/lib/chat/room-moc";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  const list = await listRoomMocs(roomId, session.profile.id);
  if (!list.ok) {
    return NextResponse.json({ error: list.error }, { status: 403 });
  }

  const enabled = await getLopHocLichMocEnabled(roomId);
  return NextResponse.json({ enabled, mocs: list.mocs });
}

export async function POST(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  let body: { enabled?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "Thiếu enabled (true/false)." },
      { status: 400 },
    );
  }

  const result = body.enabled
    ? await enableLopHocLichMoc(roomId, session.profile.id)
    : await disableLopHocLichMoc(roomId, session.profile.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const list = await listRoomMocs(roomId, session.profile.id);
  return NextResponse.json({
    ok: true,
    enabled: body.enabled,
    mocs: list.ok ? list.mocs : [],
  });
}
