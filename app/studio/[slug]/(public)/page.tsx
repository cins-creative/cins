import { redirect } from "next/navigation";

import { STUDIO_DEFAULT_TAB, studioTabPath } from "@/lib/to-chuc/studio-routes";

type Props = { params: Promise<{ slug: string }> };

/** `/studio/[slug]` → tab mặc định (Bài đăng). */
export default async function StudioPage({ params }: Props) {
  const { slug } = await params;
  redirect(studioTabPath(slug, STUDIO_DEFAULT_TAB));
}
