import { NextResponse } from "next/server";

import {
  fetchOrgShowcaseAside,
  type OrgShowcaseAsideKind,
} from "@/lib/org/org-showcase-aside-fetch";

const KINDS = new Set<OrgShowcaseAsideKind>([
  "studio",
  "truong",
  "co_so_dao_tao",
]);

function parseKind(raw: string | null): OrgShowcaseAsideKind | null {
  if (!raw) return null;
  const value = raw.trim() as OrgShowcaseAsideKind;
  return KINDS.has(value) ? value : null;
}

/** GET /api/org/showcase-aside?slug=&kind= — preview showcase / bài media org. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim();
  const kind = parseKind(url.searchParams.get("kind"));

  if (!slug || !kind) {
    return NextResponse.json(
      { error: "Thiếu slug hoặc kind (studio|truong|co_so_dao_tao)." },
      { status: 400 },
    );
  }

  const aside = await fetchOrgShowcaseAside({ slug, kind });
  return NextResponse.json(aside);
}
