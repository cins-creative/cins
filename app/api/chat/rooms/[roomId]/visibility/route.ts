import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { setProjectRoomVisibility } from "@/lib/chat/project-room";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;

  let body: { trang_thai?: string };
  try {
    body = (await req.json()) as { trang_thai?: string };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const trangThai = body.trang_thai === "an" ? "an" : body.trang_thai === "active" ? "active" : null;
  if (!trangThai) {
    return NextResponse.json(
      { error: "trang_thai phải là active hoặc an." },
      { status: 400 },
    );
  }

  const result = await setProjectRoomVisibility(
    roomId,
    session.profile.id,
    trangThai,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ thread: result.thread });
}
