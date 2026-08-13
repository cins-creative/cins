import { coSoQuanLyPath } from "@/lib/to-chuc/co-so-routes";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** `/academy/[slug]/manage` → co-so. */
export default async function Page({ params }: Props) {
  const { slug } = await params;
  redirect(coSoQuanLyPath(slug, "co-so"));
}
