import { notFound } from "next/navigation";

import { viewFromSegment } from "@/lib/admin/noi-dung-dang-views";
import { renderNoiDungDangPage } from "@/lib/admin/render-noi-dung-dang-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = Promise<{ view: string }>;

export default async function AdminNoiDungDangViewPage({
  params,
}: {
  params: Params;
}) {
  const { view: segment } = await params;
  const view = viewFromSegment(segment);
  if (!view) notFound();

  return renderNoiDungDangPage(view);
}
