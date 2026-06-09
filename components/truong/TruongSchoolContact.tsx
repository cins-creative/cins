"use client";

import { useState } from "react";

import { TruongChiNhanhTableModal } from "@/components/truong/TruongChiNhanhTableModal";
import {
  CHI_NHANH_SIDEBAR_PREVIEW,
  formatChiNhanhAddress,
  resolveTruongChiNhanh,
} from "@/lib/truong/chi-nhanh";
import { buildTruongContactLines } from "@/lib/truong/contact";
import type { TruongListItem } from "@/lib/truong/types";

type Props = {
  school: Pick<
    TruongListItem,
    | "website"
    | "facebook"
    | "dia_chi"
    | "chi_nhanh"
    | "dien_thoai"
    | "email_lien_he"
    | "tinh_thanh"
  >;
  isEditing?: boolean;
  variant?: "default" | "sidebar";
};

function ContactIcon({
  kind,
}: {
  kind: "address" | "phone" | "email" | "web" | "facebook";
}) {
  if (kind === "phone") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
        <path
          strokeWidth="2"
          strokeLinecap="round"
          d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"
        />
      </svg>
    );
  }
  if (kind === "email") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="2" />
        <path strokeWidth="2" d="M3 7l9 6 9-6" />
      </svg>
    );
  }
  if (kind === "web") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
        <circle cx="12" cy="12" r="9" strokeWidth="2" />
        <path strokeWidth="2" d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
      </svg>
    );
  }
  if (kind === "facebook") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V11c0-.9.3-1.6 1.7-1.6H16.8V7.2c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6V12H7.2v3.2h3.2V22h3.5z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"
      />
      <circle cx="12" cy="10" r="2.5" strokeWidth="2" />
    </svg>
  );
}

export function TruongSchoolContact({
  school,
  isEditing,
  variant = "default",
}: Props) {
  const [branchesOpen, setBranchesOpen] = useState(false);
  const branches = resolveTruongChiNhanh(school);
  const otherLines = buildTruongContactLines(school, { includeAddress: false });
  const hasBranches = branches.length > 0;
  const hasInfo = hasBranches || otherLines.length > 0;
  const previewBranches = branches.slice(0, CHI_NHANH_SIDEBAR_PREVIEW);
  const hiddenBranchCount = branches.length - previewBranches.length;

  if (!hasInfo && !isEditing) return null;

  if (!hasInfo && isEditing) {
    return (
      <p
        className={
          variant === "sidebar"
            ? "ss-contact-empty"
            : "tdh-identity-contact tdh-identity-contact--empty"
        }
      >
        Chưa có địa chỉ hoặc liên hệ — bấm «Sửa liên hệ & giới thiệu» phía trên để thêm.
      </p>
    );
  }

  if (variant === "sidebar") {
    return (
      <>
        <div className="ss-contact" aria-label="Liên hệ trường">
          {previewBranches.map((branch) => (
            <div
              key={branch.id}
              className="ss-contact-row"
              aria-label={branch.ten}
            >
              <span className="ss-contact-icon" aria-hidden>
                <ContactIcon kind="address" />
              </span>
              <div className="ss-contact-body">
                <div className="ss-contact-branch-name">{branch.ten}</div>
                <div className="ss-contact-val">{formatChiNhanhAddress(branch)}</div>
                {branch.dien_thoai?.trim() ? (
                  <a
                    href={`tel:${branch.dien_thoai.replace(/\s+/g, "")}`}
                    className="ss-contact-branch-phone"
                  >
                    {branch.dien_thoai}
                  </a>
                ) : null}
              </div>
            </div>
          ))}
          {hiddenBranchCount > 0 ? (
            <button
              type="button"
              className="ss-contact-more-branches"
              onClick={() => setBranchesOpen(true)}
            >
              Xem thêm {hiddenBranchCount} chi nhánh
            </button>
          ) : null}
          {otherLines.map((line) => (
            <div
              key={`${line.kind}-${line.value}`}
              className="ss-contact-row"
              aria-label={line.label}
            >
              <span className="ss-contact-icon" aria-hidden>
                <ContactIcon kind={line.kind} />
              </span>
              <div className="ss-contact-body">
                {line.href ? (
                  <a
                    href={line.href}
                    className="ss-contact-val"
                    target={
                      line.kind === "web" || line.kind === "facebook"
                        ? "_blank"
                        : undefined
                    }
                    rel={
                      line.kind === "web" || line.kind === "facebook"
                        ? "noopener noreferrer"
                        : undefined
                    }
                  >
                    {line.value}
                  </a>
                ) : (
                  <div className="ss-contact-val">{line.value}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <TruongChiNhanhTableModal
          open={branchesOpen}
          onClose={() => setBranchesOpen(false)}
          branches={branches}
        />
      </>
    );
  }

  return (
    <ul
      className="tdh-identity-contact tdh-identity-contact--listing tdh-identity-contact--grid"
      aria-label="Liên hệ trường"
    >
      {branches.map((branch) => (
        <li key={branch.id} className="tdh-identity-contact-item--wide">
          <span className="tdh-identity-contact-icon" aria-hidden>
            <ContactIcon kind="address" />
          </span>
          <div className="tdh-identity-contact-body">
            <span className="tdh-identity-contact-label">{branch.ten}</span>
            <span className="tdh-identity-contact-value">
              {formatChiNhanhAddress(branch)}
            </span>
          </div>
        </li>
      ))}
      {otherLines.map((line) => (
        <li
          key={`${line.kind}-${line.value}`}
          className={
            line.kind === "address" ||
            line.kind === "web" ||
            line.kind === "facebook"
              ? "tdh-identity-contact-item--wide"
              : undefined
          }
        >
          <span className="tdh-identity-contact-icon" aria-hidden>
            <ContactIcon kind={line.kind} />
          </span>
          <div className="tdh-identity-contact-body">
            <span className="tdh-identity-contact-label">{line.label}</span>
            {line.href ? (
              <a
                href={line.href}
                className="tdh-identity-contact-value"
                target={
                  line.kind === "web" || line.kind === "facebook"
                    ? "_blank"
                    : undefined
                }
                rel={
                  line.kind === "web" || line.kind === "facebook"
                    ? "noopener noreferrer"
                    : undefined
                }
              >
                {line.value}
              </a>
            ) : (
              <span className="tdh-identity-contact-value">{line.value}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
