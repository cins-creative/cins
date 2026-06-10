"use client";

import { useState } from "react";

import { TruongChiNhanhTableModal } from "@/components/truong/TruongChiNhanhTableModal";
import {
  resolvePrimaryChiNhanhDisplay,
  resolveTruongChiNhanh,
} from "@/lib/truong/chi-nhanh";
import {
  buildSchoolSidebarContactLines,
  buildTruongContactLines,
} from "@/lib/truong/contact";
import type { TruongListItem } from "@/lib/truong/types";

type Props = {
  school: Pick<
    TruongListItem,
    | "ten"
    | "website"
    | "facebook"
    | "dia_chi"
    | "chi_nhanh"
    | "dien_thoai"
    | "email_lien_he"
    | "tinh_thanh"
    | "cover_id"
    | "cover_src"
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
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
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
  const primaryBranch = resolvePrimaryChiNhanhDisplay(school);
  const primaryLines = buildSchoolSidebarContactLines(school);
  const otherBranchCount = Math.max(0, branches.length - 1);
  const branchesForModal = branches.map((branch, index) =>
    index === 0 && primaryBranch ? primaryBranch : branch,
  );
  const hasInfo = primaryLines.length > 0 || otherBranchCount > 0;

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
          {primaryLines.map((line) => (
            <div
              key={`${line.kind}-${line.label}-${line.value}`}
              className="ss-contact-row"
              aria-label={line.label}
            >
              <span
                className={`ss-contact-icon${
                  line.kind === "facebook" ? " ss-contact-icon--facebook" : ""
                }`}
                aria-hidden
              >
                <ContactIcon kind={line.kind} />
              </span>
              <div className="ss-contact-body">
                {line.kind === "address" && primaryBranch ? (
                  <div className="ss-contact-branch-name">{primaryBranch.ten}</div>
                ) : null}
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
          {otherBranchCount > 0 ? (
            <button
              type="button"
              className="ss-contact-more-branches"
              onClick={() => setBranchesOpen(true)}
            >
              Xem thêm {otherBranchCount} chi nhánh khác
            </button>
          ) : null}
        </div>
        <TruongChiNhanhTableModal
          open={branchesOpen}
          onClose={() => setBranchesOpen(false)}
          branches={branchesForModal}
          schoolTen={school.ten}
          schoolCover={{
            cover_id: school.cover_id,
            cover_src: school.cover_src,
          }}
          editable={Boolean(isEditing)}
        />
      </>
    );
  }

  const listingLines = buildTruongContactLines(school);

  return (
    <ul
      className="tdh-identity-contact tdh-identity-contact--listing tdh-identity-contact--grid"
      aria-label="Liên hệ trường"
    >
      {listingLines.map((line) => (
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
          <span
            className={`tdh-identity-contact-icon${
              line.kind === "facebook"
                ? " tdh-identity-contact-icon--facebook"
                : ""
            }`}
            aria-hidden
          >
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
