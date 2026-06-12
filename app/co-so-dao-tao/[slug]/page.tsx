import { redirect } from "next/navigation";

import {
  TRUONG_DEFAULT_TAB,
  truongTabPath,
} from "@/lib/truong/truong-routes";

type Props = { params: Promise<{ slug: string }> };

/** `/co-so-dao-tao/[slug]` → tab mặc định (Bài đăng). */
export default async function TruongDaiHocDetailPage({ params }: Props) {
  const { slug } = await params;
  redirect(truongTabPath(slug, TRUONG_DEFAULT_TAB));
}
