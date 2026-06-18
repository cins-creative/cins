import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  searchOrgsForMembershipMilestone,
  submitMembershipMilestone,
} from "@/lib/journey/membership-milestone";
import type { PhraseRecipeId } from "@/lib/journey/milestone-phrase-recipes";
import { MILESTONE_PHRASE_RECIPES } from "@/lib/journey/milestone-phrase-recipes";
import type { SubmitMembershipMilestoneInput } from "@/lib/journey/membership-milestone-types";

type Params = Promise<{ slug: string }>;

function isRecipeId(v: string): v is PhraseRecipeId {
  return v in MILESTONE_PHRASE_RECIPES;
}

/** POST /api/journey/:slug/membership-milestone — tạo cột mốc danh tính + gửi org duyệt. */
export async function POST(req: Request, context: { params: Params }) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  if (session.profile.slug !== slug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: SubmitMembershipMilestoneInput;
  try {
    body = (await req.json()) as SubmitMembershipMilestoneInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  body.ownerSlug = slug;

  if (!isRecipeId(body.recipeId)) {
    return NextResponse.json({ error: "Loại cột mốc không hợp lệ." }, { status: 400 });
  }

  const result = await submitMembershipMilestone(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, field: result.field }, { status: 422 });
  }

  return NextResponse.json({
    cotMocId: result.cotMocId,
    milestone: result.milestone ?? null,
  });
}

/** GET — tìm org theo recipe (debounce client). */
export async function GET(req: Request, context: { params: Params }) {
  const session = await getCurrentSessionAndProfile();
  const { slug } = await context.params;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const recipeRaw = url.searchParams.get("recipe")?.trim() ?? "";

  if (!isRecipeId(recipeRaw)) {
    return NextResponse.json({ orgs: [] });
  }

  if (session?.profile?.slug !== slug) {
    return NextResponse.json({ orgs: [] });
  }

  const orgs = await searchOrgsForMembershipMilestone(
    q,
    recipeRaw,
    session?.profile?.id ?? null,
  );
  return NextResponse.json({ orgs });
}
