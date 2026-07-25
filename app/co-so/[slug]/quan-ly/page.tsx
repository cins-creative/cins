import { redirect } from "next/navigation";

import { coSoQuanLyPath } from "@/lib/to-chuc/co-so-routes";

type Props = { params: Promise<{ slug: string }> };

export default async function CoSoQuanLyIndexPage({ params }: Props) {
  const { slug } = await params;
  redirect(coSoQuanLyPath(slug, "tong-quan"));
}
