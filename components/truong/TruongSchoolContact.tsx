"use client";

import { buildTruongContactLines } from "@/lib/truong/contact";
import type { TruongListItem } from "@/lib/truong/types";

type Props = {
  school: Pick<
    TruongListItem,
    | "website"
    | "dia_chi"
    | "dien_thoai"
    | "email_lien_he"
    | "tinh_thanh"
  >;
  isEditing?: boolean;
  variant?: "default" | "sidebar";
};

function ContactIcon({ kind }: { kind: "address" | "phone" | "email" | "web" }) {
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
  const lines = buildTruongContactLines(school);
  const hasInfo = lines.length > 0;

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
        Chưa có địa chỉ hoặc liên hệ — bấm Sửa giới thiệu để thêm.
      </p>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className="ss-contact" aria-label="Liên hệ trường">
        {lines.map((line) => (
          <div key={`${line.kind}-${line.value}`} className="ss-contact-row">
            <span className="ss-contact-icon" aria-hidden>
              <ContactIcon kind={line.kind} />
            </span>
            <div className="ss-contact-body">
              <div className="ss-contact-key">{line.label}</div>
              {line.href ? (
                <a
                  href={line.href}
                  className="ss-contact-val"
                  target={line.kind === "web" ? "_blank" : undefined}
                  rel={line.kind === "web" ? "noopener noreferrer" : undefined}
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
    );
  }

  return (
    <ul
      className="tdh-identity-contact tdh-identity-contact--listing tdh-identity-contact--grid"
      aria-label="Liên hệ trường"
    >
      {lines.map((line) => (
        <li
          key={`${line.kind}-${line.value}`}
          className={
            line.kind === "address" || line.kind === "web"
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
                target={line.kind === "web" ? "_blank" : undefined}
                rel={line.kind === "web" ? "noopener noreferrer" : undefined}
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
