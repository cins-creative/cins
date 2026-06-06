import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  followTarget,
  getFollowStatus,
  parseEntityFollowLoai,
  unfollowTarget,
} from "@/lib/social/follow";

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

export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { id_doi_tuong?: string; loai_doi_tuong?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const id_doi_tuong = body.id_doi_tuong?.trim();
  const loai = parseEntityFollowLoai(body.loai_doi_tuong ?? null);
  if (!id_doi_tuong || !loai) {
    return NextResponse.json(
      { error: "Chỉ theo dõi tag hoặc tổ chức — loai_doi_tuong phải là tag hoặc org." },
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

  let body: { id_doi_tuong?: string; loai_doi_tuong?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const id_doi_tuong = body.id_doi_tuong?.trim();
  const loai = parseEntityFollowLoai(body.loai_doi_tuong ?? null);
  if (!id_doi_tuong || !loai) {
    return NextResponse.json(
      { error: "Thiếu id_doi_tuong hoặc loai_doi_tuong (tag/org)." },
      { status: 400 },
    );
  }

  const result = await unfollowTarget(session.profile.id, id_doi_tuong, loai);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const status = await getFollowStatus(session.profile.id, id_doi_tuong, loai);
  return NextResponse.json(status);
}
