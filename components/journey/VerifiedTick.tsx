"use client";

import { BadgeCheck } from "lucide-react";

import "./verified-tick.css";

import { useIsUserVerified } from "@/components/cins/VerifiedUsersProvider";

type Props = {
  /** Slug tài khoản — tự tra trạng thái xác minh qua context. */
  slug?: string | null;
  /** Ép trạng thái verified (bỏ qua context) — dùng khi đã có dữ liệu chính xác. */
  verified?: boolean;
  size?: number;
  className?: string;
};

/**
 * Tick xanh cạnh tên tài khoản đã xác minh. Trả về null nếu chưa xác minh
 * → có thể đặt vô điều kiện sau tên.
 */
export function VerifiedTick({ slug, verified, size = 13, className }: Props) {
  const fromContext = useIsUserVerified(slug ?? null);
  const isVerified = verified ?? fromContext;
  if (!isVerified) return null;

  return (
    <span
      className={`cins-verified-tick${className ? ` ${className}` : ""}`}
      title="Tài khoản đã được CINs xác minh"
      aria-label="Đã xác minh"
      role="img"
    >
      <BadgeCheck size={size} strokeWidth={2.4} aria-hidden />
    </span>
  );
}
