import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** Legacy URL sau tạo cộng đồng — chuyển thẳng vào trang nhóm. */
export default async function CongDongFilterSetupRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/cong-dong/${slug}`);
}
