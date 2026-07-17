import { redirect } from "next/navigation";

import {
  legacyViewFromSearchParams,
  pathForNoiDungDangView,
} from "@/lib/admin/noi-dung-dang-views";
import { renderNoiDungDangPage } from "@/lib/admin/render-noi-dung-dang-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Lưới (mặc định). Legacy `?view=` → redirect sang path riêng. */
export default async function AdminNoiDungDangPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const legacy = legacyViewFromSearchParams(sp);
  if (legacy && legacy !== "grid") {
    redirect(pathForNoiDungDangView(legacy));
  }

  return renderNoiDungDangPage("grid");
}
