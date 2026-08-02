import { redirect } from "next/navigation";

import { orgQuanLyDefaultSection, orgQuanLyPath } from "@/lib/to-chuc/org-quan-ly-routes";

type Props = { params: Promise<{ slug: string }> };

/** `/studio/[slug]/quan-ly` → thong-tin (Studio). */
export default async function StudioQuanLyIndexPage({ params }: Props) {
  const { slug } = await params;
  redirect(
    orgQuanLyPath("studio", slug, orgQuanLyDefaultSection("studio")),
  );
}
