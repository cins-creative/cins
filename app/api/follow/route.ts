import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  followTarget,
  getFollowStatus,
  unfriendUser,
  unfollowTarget,
} from "@/lib/social/follow";
import type { FollowTargetType } from "@/lib/social/types";

const VALID_LOAI = new Set<FollowTargetType>(["user", "tag", "org"]);

function parseLoai(raw: string | null): FollowTargetType | null {
  if (!raw || !VALID_LOAI.has(raw as FollowTargetType)) return null;
  return raw as FollowTargetType;
}

export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  const { searchParams } = new URL(req.url);
  const id_doi_tuong = searchParams.get("id_doi_tuong")?.trim();
  const loai = parseLoai(searchParams.get("loai_doi_tuong"));

  if (!id_doi_tuong || !loai) {
    return NextResponse.json(
      { error: "Thiếu id_doi_tuong hoặc loai_doi_tuong." },
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

export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { id_doi_tuong?: string; loai_doi_tuong?: string; mutual?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const id_doi_tuong = body.id_doi_tuong?.trim();
  const loai = parseLoai(body.loai_doi_tuong ?? null);
  if (!id_doi_tuong || !loai) {
    return NextResponse.json(
      { error: "Thiếu id_doi_tuong hoặc loai_doi_tuong." },
      { status: 400 },
    );
  }

  const result = await followTarget(session.profile.id, id_doi_tuong, loai);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const status = await getFollowStatus(session.profile.id, id_doi_tuong, loai);
  return NextResponse.json(status);
}

export async function DELETE(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { id_doi_tuong?: string; loai_doi_tuong?: string; mutual?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const id_doi_tuong = body.id_doi_tuong?.trim();
  const loai = parseLoai(body.loai_doi_tuong ?? null);
  if (!id_doi_tuong || !loai) {
    return NextResponse.json(
      { error: "Thiếu id_doi_tuong hoặc loai_doi_tuong." },
      { status: 400 },
    );
  }

  const result =
    body.mutual && loai === "user"
      ? await unfriendUser(session.profile.id, id_doi_tuong)
      : await unfollowTarget(session.profile.id, id_doi_tuong, loai);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const status = await getFollowStatus(session.profile.id, id_doi_tuong, loai);
  return NextResponse.json(status);
}
