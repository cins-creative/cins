import { redirect } from "next/navigation";

import { orgQuanLyDefaultSection, orgQuanLyPath } from "@/lib/to-chuc/org-quan-ly-routes";

type Props = { params: Promise<{ slug: string }> };

/** `/studio/[slug]/quan-ly` → tong-quan. */
export default async function StudioQuanLyIndexPage({ params }: Props) {
  const { slug } = await params;
  redirect(
    orgQuanLyPath("studio", slug, orgQuanLyDefaultSection("studio")),
  );
}
