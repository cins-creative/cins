"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { TruongCardCoverGeo } from "@/components/truong/TruongCardCoverGeo";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  facebookDisplayLabel,
  normalizeChiNhanhList,
  patchChiNhanhById,
  resolveChiNhanhCoverSrc,
} from "@/lib/truong/chi-nhanh";
import { labelTinhThanh } from "@/lib/truong/contact";
import { truongCoverClass } from "@/lib/truong/display";
import type { SchoolCoverFields } from "@/lib/truong/school-cover";
import type { TruongChiNhanh } from "@/lib/truong/types";

type Props = {
  open: boolean;
  onClose: () => void;
  branches: TruongChiNhanh[];
  schoolTen: string;
  schoolCover?: SchoolCoverFields | null;
  editable?: boolean;
};

type ContactKind = "phone" | "email" | "web" | "facebook";

type ContactField = {
  kind: ContactKind;
  label: string;
  value: string | null;
  href: string | null;
};

const CONTACT_ORDER: ContactKind[] = ["phone", "email", "web", "facebook"];

function webHref(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

function webLabel(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function ContactIcon({ kind }: { kind: ContactKind }) {
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
  if (kind === "facebook") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <path strokeWidth="2" d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
    </svg>
  );
}

function buildContactFields(branch: TruongChiNhanh): ContactField[] {
  const phone = branch.dien_thoai?.trim() || null;
  const email = branch.email?.trim() || null;
  const website = branch.website?.trim() || null;
  const facebook = branch.facebook?.trim() || null;

  return [
    {
      kind: "phone",
      label: "Điện thoại",
      value: phone,
      href: phone ? `tel:${phone.replace(/\s+/g, "")}` : null,
    },
    {
      kind: "email",
      label: "Email",
      value: email,
      href: email ? `mailto:${email}` : null,
    },
    {
      kind: "web",
      label: "Website",
      value: website ? webLabel(website) : null,
      href: website ? webHref(website) : null,
    },
    {
      kind: "facebook",
      label: "Facebook",
      value: facebook ? facebookDisplayLabel(facebook) : null,
      href: facebook ? webHref(facebook) : null,
    },
  ];
}

function BranchCover({
  branch,
  index,
  schoolCover,
  previewUrl,
  editable,
  uploading,
  onPickFile,
  onRemove,
}: {
  branch: TruongChiNhanh;
  index: number;
  schoolCover?: SchoolCoverFields | null;
  previewUrl?: string | null;
  editable?: boolean;
  uploading?: boolean;
  onPickFile?: (file: File) => void;
  onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const coverUrl =
    previewUrl?.trim() ||
    resolveChiNhanhCoverSrc(branch, index, schoolCover);
  const hasOwnCover = Boolean(branch.cover_id?.trim() || previewUrl?.trim());

  return (
    <div className="tdh-chi-nhanh-card-cover">
      {coverUrl ? (
        <>
          <Image
            src={coverUrl}
            alt=""
            fill
            className="tdh-chi-nhanh-card-cover-photo"
            sizes="(max-width: 920px) 100vw, 860px"
            unoptimized={coverUrl.includes("imagedelivery.net")}
          />
          <div className="tdh-chi-nhanh-card-cover-shade" />
        </>
      ) : (
        <div
          className={`tdh-chi-nhanh-card-cover-ph ${truongCoverClass(index)}`}
          aria-hidden
        >
          <TruongCardCoverGeo variant={index} />
        </div>
      )}

      {editable ? (
        <div className="tdh-chi-nhanh-card-cover-tools">
          <button
            type="button"
            className="tdh-inline-media-btn tdh-chi-nhanh-card-cover-btn"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Đang tải…" : hasOwnCover ? "Đổi ảnh bìa" : "Thêm ảnh bìa"}
          </button>
          {hasOwnCover && branch.cover_id ? (
            <button
              type="button"
              className="tdh-inline-media-btn tdh-chi-nhanh-card-cover-btn ghost"
              disabled={uploading}
              onClick={onRemove}
            >
              Xóa ảnh
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="tdh-inline-file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPickFile?.(file);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function ContactRow({ field }: { field: ContactField }) {
  const empty = !field.value;
  const iconClass =
    field.kind === "facebook" ? " tdh-chi-nhanh-card-icon--facebook" : "";

  return (
    <li className={`tdh-chi-nhanh-card-link${empty ? " is-empty" : ""}`}>
      <span className={`tdh-chi-nhanh-card-icon${iconClass}`} aria-hidden>
        <ContactIcon kind={field.kind} />
      </span>
      <span className="tdh-chi-nhanh-card-link-label">{field.label}</span>
      {field.href && field.value ? (
        <a
          href={field.href}
          className="tdh-chi-nhanh-card-link-value"
          target={
            field.kind === "web" || field.kind === "facebook"
              ? "_blank"
              : undefined
          }
          rel={
            field.kind === "web" || field.kind === "facebook"
              ? "noopener noreferrer"
              : undefined
          }
        >
          {field.value}
        </a>
      ) : (
        <span className="tdh-chi-nhanh-card-link-value is-muted">—</span>
      )}
    </li>
  );
}

export function TruongChiNhanhTableModal({
  open,
  onClose,
  branches,
  schoolTen,
  schoolCover,
  editable = false,
}: Props) {
  const ctx = useTruongInlineEdit();
  const canEditCovers = editable && Boolean(ctx?.canEdit && ctx.isEditing);
  const [localBranches, setLocalBranches] = useState(branches);
  const [coverPreviewById, setCoverPreviewById] = useState<
    Record<string, string>
  >({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLocalBranches(branches);
      setCoverPreviewById({});
      setUploadingId(null);
    }
  }, [open, branches]);

  async function persistCover(branchId: string, coverId: string | null) {
    if (!ctx) return false;
    const nextList = normalizeChiNhanhList(
      patchChiNhanhById(ctx.school, branchId, { cover_id: coverId }),
    );
    const ok = await ctx.patchSchool({ chi_nhanh: nextList });
    if (ok) {
      ctx.showToast(coverId ? "Đã cập nhật ảnh bìa chi nhánh" : "Đã xóa ảnh bìa");
      setLocalBranches((prev) =>
        prev.map((branch) =>
          branch.id === branchId ? { ...branch, cover_id: coverId } : branch,
        ),
      );
    } else {
      ctx.showToast("Lưu ảnh bìa thất bại");
    }
    return ok;
  }

  async function handlePickCover(branchId: string, file: File) {
    if (!ctx) return;
    const previewUrl = URL.createObjectURL(file);
    setCoverPreviewById((prev) => ({ ...prev, [branchId]: previewUrl }));
    setUploadingId(branchId);
    const uploaded = await ctx.uploadImage(file);
    setUploadingId(null);
    if (!uploaded) {
      setCoverPreviewById((prev) => {
        const next = { ...prev };
        delete next[branchId];
        return next;
      });
      URL.revokeObjectURL(previewUrl);
      ctx.showToast("Tải ảnh bìa thất bại");
      return;
    }
    const ok = await persistCover(branchId, uploaded.imageId);
    setCoverPreviewById((prev) => {
      const next = { ...prev };
      delete next[branchId];
      return next;
    });
    URL.revokeObjectURL(previewUrl);
    if (!ok) return;
  }

  async function handleRemoveCover(branchId: string) {
    await persistCover(branchId, null);
  }

  const list = canEditCovers ? localBranches : branches;

  return (
    <TruongInlineModal
      open={open}
      onClose={onClose}
      className="tdh-inline-modal--wide tdh-chi-nhanh-modal"
      labelledBy="tdh-chi-nhanh-title"
    >
      <h3 id="tdh-chi-nhanh-title" className="tdh-inline-modal-title tdh-chi-nhanh-modal-title">
        Hệ thống trường thuộc <em>{schoolTen.trim() || "trường"}</em>
      </h3>
      <ul className="tdh-chi-nhanh-list" role="list">
        {list.map((branch, index) => {
          const province = labelTinhThanh(branch.tinh_thanh);
          const contacts = buildContactFields(branch);
          const isPrimary = index === 0;

          return (
            <li
              key={branch.id}
              className={`tdh-chi-nhanh-card${isPrimary ? " is-primary" : ""}`}
            >
              <BranchCover
                branch={branch}
                index={index}
                schoolCover={schoolCover}
                previewUrl={coverPreviewById[branch.id]}
                editable={canEditCovers}
                uploading={uploadingId === branch.id}
                onPickFile={(file) => void handlePickCover(branch.id, file)}
                onRemove={() => void handleRemoveCover(branch.id)}
              />

              <div className="tdh-chi-nhanh-card-body">
                <div className="tdh-chi-nhanh-card-head">
                  <h4 className="tdh-chi-nhanh-card-name">{branch.ten}</h4>
                  {isPrimary ? (
                    <span className="tdh-chi-nhanh-badge">Chính</span>
                  ) : (
                    <span className="tdh-chi-nhanh-card-index">
                      Cơ sở {index + 1}
                    </span>
                  )}
                </div>

                <p className="tdh-chi-nhanh-card-addr">
                  {branch.dia_chi}
                  {province ? (
                    <>
                      <span className="tdh-chi-nhanh-card-addr-sep" aria-hidden>
                        ·
                      </span>
                      {province}
                    </>
                  ) : null}
                </p>

                <ul className="tdh-chi-nhanh-card-links" aria-label="Liên hệ">
                  {CONTACT_ORDER.map((kind) => {
                    const field = contacts.find((item) => item.kind === kind);
                    return field ? (
                      <ContactRow key={field.kind} field={field} />
                    ) : null;
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="tdh-inline-modal-actions">
        <button
          type="button"
          className="tdh-inline-btn primary"
          onClick={onClose}
        >
          Đóng
        </button>
      </div>
    </TruongInlineModal>
  );
}
