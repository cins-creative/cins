"use client";

import {
  Building2,
  Clock3,
  Lock,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

export type MembershipVerifyCardVariant = "pending" | "approved";

type Props = {
  as?: "article" | "div";
  className?: string;
  cotMocId?: string;
  variant: MembershipVerifyCardVariant;
  orgName: string;
  orgAvatarUrl?: string | null;
  title: string;
  actions?: ReactNode;
};

export function MembershipVerifyCard({
  as: Tag = "article",
  className,
  cotMocId,
  variant,
  orgName,
  orgAvatarUrl,
  title,
  actions,
}: Props) {
  const initial = (orgName.charAt(0) || "?").toUpperCase();
  const isPending = variant === "pending";

  return (
    <Tag
      className={[
        "j-verify-card",
        isPending ? "j-membership-pending" : "j-verify-card--approved",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...(cotMocId ? { "data-cot-moc-id": cotMocId } : {})}
    >
      <div className="j-verify-card-body">
        {orgAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={orgAvatarUrl} alt="" className="j-verify-card-avatar" />
        ) : (
          <span className="j-verify-card-avatar j-verify-card-avatar--empty">
            {initial}
          </span>
        )}

        <div className="j-verify-card-copy">
          <p className="j-verify-card-kicker">
            <ShieldCheck size={14} strokeWidth={2.2} aria-hidden />
            {isPending ? "Cột mốc chờ xác thực" : "Cột mốc đã xác thực"}
          </p>
          <p className="j-verify-card-lead">
            <Building2 size={14} strokeWidth={2} aria-hidden />
            {isPending ? (
              <>
                Đã gửi tới <strong>{orgName}</strong>
              </>
            ) : (
              <>
                Xác nhận bởi <strong>{orgName}</strong>
              </>
            )}
          </p>
          <p className="j-verify-card-title">{title}</p>
          {isPending ? (
            <p className="j-verify-card-note">
              <Clock3 size={13} strokeWidth={2.2} aria-hidden />
              Chờ tổ chức duyệt
              <span className="j-verify-card-note-sep" aria-hidden>
                ·
              </span>
              <Lock size={13} strokeWidth={2.2} aria-hidden />
              Chỉ bạn thấy
            </p>
          ) : null}
        </div>

        {isPending ? (
          <span className="j-verify-card-status">
            <Clock3 size={13} strokeWidth={2.2} aria-hidden />
            Chờ
          </span>
        ) : null}
      </div>

      {actions ? <div className="j-verify-card-actions">{actions}</div> : null}
    </Tag>
  );
}
