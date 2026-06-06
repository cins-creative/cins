"use client";

import { MessageCircle } from "lucide-react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";

type Props = {
  href?: string;
  commentCount?: number | null;
  /** Timeline inline — mở panel bình luận trong card, không navigate popup. */
  onOpenComments?: () => void;
};

export function JourneyCommentLink({
  href,
  commentCount,
  onOpenComments,
}: Props) {
  const { isAuthenticated, openAuthModal } = useAuthGate();

  if (onOpenComments) {
    return (
      <button
        type="button"
        className="action-btn"
        aria-label="Bình luận"
        onClick={(e) => {
          e.stopPropagation();
          if (!isAuthenticated) {
            openAuthModal(
              "Đăng nhập hoặc tạo tài khoản để bình luận bài viết này.",
            );
            return;
          }
          onOpenComments();
        }}
      >
        <MessageCircle size={16} strokeWidth={1.8} aria-hidden />
        {commentCount ? <span>{commentCount}</span> : null}
      </button>
    );
  }

  if (!href) {
    return (
      <button type="button" className="action-btn" aria-label="Bình luận">
        <MessageCircle size={16} strokeWidth={1.8} aria-hidden />
        {commentCount ? <span>{commentCount}</span> : null}
      </button>
    );
  }

  if (isAuthenticated) {
    return (
      <a href={href} className="action-btn" aria-label="Bình luận">
        <MessageCircle size={16} strokeWidth={1.8} aria-hidden />
        {commentCount ? <span>{commentCount}</span> : null}
      </a>
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
