"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useState } from "react";

import { InboxContactRoleBadge } from "@/components/truong/InboxContactRoleBadge";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import type { OrgMembershipMilestoneRequestItem } from "@/lib/journey/membership-milestone-types";
import type { OrgAttachEvidence } from "@/lib/journey/org-milestone-tag-types";
import {
  formatTaggedAt,
  milestoneKindLabel,
} from "@/lib/truong/milestone-tag-notify-mock";

function membershipStatusLabel(
  status: OrgMembershipMilestoneRequestItem["status"],
): string {
  switch (status) {
    case "pending":
      return "Chờ duyệt";
    case "approved":
      return "Đã xác thực";
    case "rejected":
      return "Từ chối";
    default:
      return status;
  }
}

function StatusBadge({ status }: { status: OrgMembershipMilestoneRequestItem["status"] }) {
  const Icon =
    status === "approved" ? CheckCircle2 : status === "rejected" ? XCircle : Clock3;
  return (
    <span
      className={`tdh-message-inbox-verify-badge tdh-message-inbox-verify-badge--${status}`}
    >
      <Icon size={12} strokeWidth={2.4} aria-hidden />
      {membershipStatusLabel(status)}
    </span>
  );
}

function EvidenceItem({ item }: { item: OrgAttachEvidence }) {
  const isImageFile = item.kind === "file" && Boolean(item.href?.trim());

  if (isImageFile && item.href) {
    return (
      <li className="tdh-milestone-tag-evidence-item tdh-milestone-tag-evidence-item--image">
        <span className="tdh-milestone-tag-evidence-label">{item.label}</span>
        <a
          href={item.href}
          className="tdh-milestone-tag-evidence-image-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.href} alt={item.label} />
        </a>
      </li>
    );
  }

  const icon =
    item.kind === "file" ? "📎" : item.kind === "link" ? "🔗" : "ℹ️";

  if (item.href) {
    return (
      <li className="tdh-milestone-tag-evidence-item">
        <span className="tdh-milestone-tag-evidence-icon" aria-hidden>
          {icon}
        </span>
        <a
          href={item.href}
          className="tdh-milestone-tag-evidence-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {item.label}
        </a>
        {item.detail ? (
          <span className="tdh-milestone-tag-evidence-detail">{item.detail}</span>
        ) : null}
      </li>
    );
  }

  return (
    <li className="tdh-milestone-tag-evidence-item">
      <span className="tdh-milestone-tag-evidence-icon" aria-hidden>
        {icon}
      </span>
      <span className="tdh-milestone-tag-evidence-label">{item.label}</span>
      {item.detail ? (
        <span className="tdh-milestone-tag-evidence-detail">{item.detail}</span>
      ) : null}
    </li>
  );
}

type InboxVerificationCardProps = {
  request: OrgMembershipMilestoneRequestItem;
  studentContactLabel: string;
  studentContactRole: string;
  responding?: boolean;
  onApprove: () => void;
  onReject: () => void;
};

export function InboxVerificationCard({
  request,
  studentContactLabel,
  studentContactRole,
  responding = false,
  onApprove,
  onReject,
}: InboxVerificationCardProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const kindLabel = milestoneKindLabel(
    request.loaiMoc as "du_an" | "hoc" | "lam_viec" | "thanh_tuu",
  );
  const profileHref = request.studentSlug.trim()
    ? `/${encodeURIComponent(request.studentSlug.trim())}`
    : null;
  const metaParts = [
    kindLabel,
    request.contextLabel,
    formatTaggedAt(request.submittedAt),
  ].filter(Boolean);

  return (
    <>
      <section
        className={`tdh-message-inbox-verify-panel tdh-message-inbox-verify-panel--${request.status}`}
        aria-label="Yêu cầu xác thực cột mốc"
      >
        <div className="tdh-message-inbox-verify-panel-head">
          <div className="tdh-message-inbox-verify-panel-who">
            {profileHref ? (
              <Link
                href={profileHref}
                className="tdh-message-inbox-verify-name"
                target="_blank"
                rel="noopener noreferrer"
              >
                {request.studentName}
              </Link>
            ) : (
              <span className="tdh-message-inbox-verify-name">{request.studentName}</span>
            )}
            {studentContactLabel ? (
              <InboxContactRoleBadge
                label={studentContactLabel}
                roleKey={studentContactRole}
                className="tdh-message-inbox-verify-role-badge"
              />
            ) : null}
          </div>
          <StatusBadge status={request.status} />
        </div>

        <h4 className="tdh-message-inbox-verify-panel-title">{request.title}</h4>

        {request.body ? (
          <p className="tdh-message-inbox-verify-panel-body">{request.body}</p>
        ) : null}

        {metaParts.length > 0 ? (
          <p className="tdh-message-inbox-verify-panel-meta">{metaParts.join(" · ")}</p>
        ) : null}

        {request.status === "pending" ? (
          <div className="tdh-message-inbox-verify-panel-actions">
            <button
              type="button"
              className="tdh-inline-btn ghost tdh-message-inbox-verify-evidence-btn"
              onClick={() => setEvidenceOpen(true)}
            >
              Bằng chứng xác thực
            </button>
            <div className="tdh-message-inbox-verify-panel-actions-end">
              <button
                type="button"
                className="tdh-inline-btn danger tdh-message-inbox-verify-reject"
                disabled={responding}
                onClick={onReject}
              >
                Từ chối
              </button>
              <button
                type="button"
                className="tdh-inline-btn tdh-message-inbox-verify-approve"
                disabled={responding}
                onClick={onApprove}
              >
                {responding ? "Đang xử lý…" : "Xác thực"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <TruongInlineModal
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        className="tdh-message-inbox-evidence-modal"
        labelledBy="tdh-inbox-evidence-title"
        showClose={false}
      >
        <div className="tdh-message-inbox-evidence-modal-hdr">
          <h3 id="tdh-inbox-evidence-title" className="tdh-inline-modal-title">
            Bằng chứng xác thực
          </h3>
          <button
            type="button"
            className="tdh-inline-btn ghost"
            onClick={() => setEvidenceOpen(false)}
          >
            Đóng
          </button>
        </div>
        <p className="tdh-message-inbox-evidence-modal-lead">
          {request.studentName}
          {studentContactLabel ? ` · ${studentContactLabel}` : ""} — {request.title}
        </p>
        {request.evidence.length > 0 ? (
          <ul className="tdh-milestone-tag-evidence-list tdh-message-inbox-evidence-modal-list">
            {request.evidence.map((ev, i) => (
              <EvidenceItem key={`${request.id}-ev-${i}`} item={ev} />
            ))}
          </ul>
        ) : (
          <p className="tdh-message-inbox-evidence-modal-empty">
            Học viên chưa đính kèm bằng chứng.
          </p>
        )}
      </TruongInlineModal>
    </>
  );
}
