import type { ReactNode } from "react";
import { Suspense } from "react";

import { TruongDetailLoader } from "@/app/university/[slug]/_components/TruongDetailLoader";

import TruongDetailLoading from "./loading";

type Props = {
  children: ReactNode;
  modal: ReactNode;
  params: Promise<{ slug: string }>;
};

/**
 * Shell trang public trường ĐH (tab / ngành / tuyển sinh…).
 * Không bọc `/manage/*` — nhóm route đó nằm ngoài `(public)`.
 */
export default async function TruongPublicLayout({
  children,
  modal,
  params,
}: Props) {
  const { slug } = await params;

  return (
    <>
      <Suspense fallback={<TruongDetailLoading />}>
        <TruongDetailLoader slug={slug} />
      </Suspense>
      {children}
      {modal}
    </>
  );
}
