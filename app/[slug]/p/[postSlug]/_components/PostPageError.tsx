import Link from "next/link";

import { PostBackButton } from "@/app/[slug]/p/[postSlug]/PostBackButton";

type Props = {
  error: string;
  ownerSlug: string;
};

export function PostPageError({ error, ownerSlug }: Props) {
  return (
    <>
      <PostBackButton fallbackHref={`/${ownerSlug}`} />
      <div className="j-post-page-error">
        <h1>Bài viết không khả dụng</h1>
        <p>{error}</p>
        <Link href={`/${ownerSlug}`}>Quay lại trang Journey</Link>
      </div>
    </>
  );
}
