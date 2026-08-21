import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Tab Hàng đã gỡ — chuyển về Mặt hàng, giữ query. */
export default async function CuaHangHangRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (typeof val === "string") params.set(key, val);
    else if (Array.isArray(val)) {
      for (const v of val) params.append(key, v);
    }
  }
  const qs = params.toString();
  redirect(qs ? `/shopping/category?${qs}` : "/shopping/category");
}
