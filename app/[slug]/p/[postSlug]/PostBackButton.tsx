"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  fallbackHref: string;
};

export function PostBackButton({ fallbackHref }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="j-post-page-crumb"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
    >
      <ArrowLeft size={14} strokeWidth={2} aria-hidden />
      <span>Quay lại trang trước</span>
    </button>
  );
}
