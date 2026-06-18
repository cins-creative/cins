import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getMembershipMilestoneForEdit,
  updateMembershipMilestone,
} from "@/lib/journey/membership-milestone";
import type { SubmitMembershipMilestoneInput } from "@/lib/journey/membership-milestone-types";
import { MILESTONE_PHRASE_RECIPES } from "@/lib/journey/milestone-phrase-recipes";
import type { PhraseRecipeId } from "@/lib/journey/milestone-phrase-recipes";

type Params = Promise<{ slug: string; cotMocId: string }>;

function isRecipeId(v: string): v is PhraseRecipeId {
  return v in MILESTONE_PHRASE_RECIPES;
}

/** GET — load yêu cầu chờ duyệt để edit. */
export async function GET(_req: Request, context: { params: Params }) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, cotMocId } = await context.params;
  if (session.profile.slug !== slug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await getMembershipMilestoneForEdit(slug, cotMocId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result.data);
}

/** PATCH — cập nhật yêu cầu chờ duyệt. */
export async function PATCH(req: Request, context: { params: Params }) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, cotMocId } = await context.params;
  if (session.profile.slug !== slug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Omit<SubmitMembershipMilestoneInput, "ownerSlug">;
  try {
    body = (await req.json()) as Omit<SubmitMembershipMilestoneInput, "ownerSlug">;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isRecipeId(body.recipeId)) {
    return NextResponse.json({ error: "Loại cột mốc không hợp lệ." }, { status: 400 });
  }

  const result = await updateMembershipMilestone(slug, cotMocId, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, field: result.field }, { status: 422 });
  }

  return NextResponse.json({
    cotMocId: result.cotMocId,
    milestone: result.milestone ?? null,
  });
}
