"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";

import { useAuthGate } from "@/components/auth/AuthGateProvider";

type Props = {
  href: string;
  commentCount?: number | null;
};

export function JourneyCommentLink({ href, commentCount }: Props) {
  const { isAuthenticated, openAuthModal } = useAuthGate();

  if (isAuthenticated) {
    return (
      <Link
        href={href}
        scroll={false}
        prefetch
        className="action-btn"
        aria-label="Bình luận"
      >
        <MessageCircle size={16} strokeWidth={1.8} aria-hidden />
        {commentCount ? <span>{commentCount}</span> : null}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="action-btn"
      aria-label="Bình luận — cần đăng nhập"
      onClick={() =>
        openAuthModal("Đăng nhập hoặc tạo tài khoản để bình luận bài viết này.")
      }
    >
      <MessageCircle size={16} strokeWidth={1.8} aria-hidden />
      {commentCount ? <span>{commentCount}</span> : null}
    </button>
  );
}
