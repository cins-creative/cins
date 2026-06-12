import type { ReactNode } from "react";
import { Suspense } from "react";

import { TruongDetailLoader } from "@/app/co-so-dao-tao/[slug]/_components/TruongDetailLoader";

import TruongDetailLoading from "./loading";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

/** Shell + data fetch một lần; tab đổi URL mà không remount layout. */
export default async function TruongSlugLayout({ children, params }: Props) {
  const { slug } = await params;

  return (
    <>
      <Suspense fallback={<TruongDetailLoading />}>
        <TruongDetailLoader slug={slug} />
      </Suspense>
      {children}
    </>
  );
}
