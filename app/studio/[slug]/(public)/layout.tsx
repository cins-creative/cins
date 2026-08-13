import type { ReactNode } from "react";
import { Suspense } from "react";

import { StudioDetailLoader } from "@/app/studio/[slug]/_components/StudioDetailLoader";

import StudioDetailLoading from "./loading";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

/**
 * Shell trang public studio (tab / showcase / tuyển dụng…).
 * Không bọc `/manage/*` — nhóm route đó nằm ngoài `(public)`.
 */
export default async function StudioPublicLayout({ children, params }: Props) {
  const { slug } = await params;

  return (
    <>
      <Suspense fallback={<StudioDetailLoading />}>
        <StudioDetailLoader slug={slug} />
      </Suspense>
      {children}
    </>
  );
}
