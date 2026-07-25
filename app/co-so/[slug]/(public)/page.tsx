import { redirect } from "next/navigation";

import { coSoTabPath, CO_SO_DEFAULT_TAB } from "@/lib/to-chuc/co-so-routes";

type Props = { params: Promise<{ slug: string }> };

/** `/co-so/[slug]` → tab mặc định (Bài đăng). */
export default async function CoSoPage({ params }: Props) {
  const { slug } = await params;
  redirect(coSoTabPath(slug, CO_SO_DEFAULT_TAB));
}
