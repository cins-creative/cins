import type { ReactNode } from "react";
import { Suspense } from "react";

import { CoSoDetailLoader } from "@/app/academy/[slug]/_components/CoSoDetailLoader";
import CoSoDetailLoading from "@/app/academy/[slug]/(public)/loading";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

/**
 * Shell trang public cơ sở (tab / khóa / sự kiện…).
 * Không bọc `/manage/*` — nhóm route đó nằm ngoài `(public)`.
 */
export default async function CoSoPublicLayout({ children, params }: Props) {
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
