import type { ReactNode } from "react";
import { Suspense } from "react";

import { CoSoDetailLoader } from "@/app/co-so/[slug]/_components/CoSoDetailLoader";
import CoSoDetailLoading from "@/app/co-so/[slug]/loading";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

/** Shell + data fetch một lần; tab/khóa đổi URL mà không remount layout. */
export default async function CoSoSlugLayout({ children, params }: Props) {
  const { slug } = await params;

  return (
    <>
      <Suspense fallback={<CoSoDetailLoading />}>
        <CoSoDetailLoader slug={slug} />
      </Suspense>
      {children}
    </>
  );
}
