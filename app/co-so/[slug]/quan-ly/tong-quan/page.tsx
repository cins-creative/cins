import { coSoQuanLyPath } from "@/lib/to-chuc/co-so-routes";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** Legacy `/quan-ly/tong-quan` → `/quan-ly/co-so`. */
export default async function Page({ params }: Props) {
  const { slug } = await params;
  redirect(coSoQuanLyPath(slug, "co-so"));
}
