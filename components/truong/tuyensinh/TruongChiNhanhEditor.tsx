"use client";

import { useRef, useState } from "react";
import Image from "next/image";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import {
  CHI_NHANH_MAX,
  emptyChiNhanh,
  formatChiNhanhAddress,
} from "@/lib/truong/chi-nhanh";
import { truongCoverClass } from "@/lib/truong/display";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { TINH_THANH_OPTIONS } from "@/lib/truong/contact";
import type { TruongChiNhanh } from "@/lib/truong/types";

import { TruongCardCoverGeo } from "@/components/truong/TruongCardCoverGeo";

type Props = {
  branches: TruongChiNhanh[];
  onChange: (next: TruongChiNhanh[]) => void;
};

function branchTitle(branch: TruongChiNhanh, index: number): string {
  const ten = branch.ten?.trim();
  return ten || `Chi nhánh ${index + 1}`;
}

function branchSummary(branch: TruongChiNhanh): string {
  const diaChi = branch.dia_chi?.trim();
  if (!diaChi) return "Chưa có địa chỉ";
  return formatChiNhanhAddress(branch);
}

function BranchCoverField({
  branch,
  index,
  onChange,
}: {
  branch: TruongChiNhanh;
  index: number;
  onChange: (coverId: string | null) => void;
}) {
  const ctx = useTruongInlineEdit();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const coverUrl = branch.cover_id
    ? resolveTruongImageSrcSync(branch.cover_id, ["public", "cover", "medium"])
    : null;

  async function onFilePicked(file: File | undefined) {
    if (!file || !ctx) return;
    setUploading(true);
    const uploaded = await ctx.uploadImage(file);
    setUploading(false);
    if (!uploaded) {
      ctx.showToast("Tải ảnh bìa thất bại");
      return;
    }
    onChange(uploaded.imageId);
    ctx.showToast("Đã thêm ảnh bìa — bấm Lưu để giữ");
  }

  return (
    <div className="tdh-inline-field tdh-chi-nhanh-editor-cover">
      <span>Ảnh bìa cơ sở</span>
      <div className="tdh-chi-nhanh-editor-cover-row">
        <div className="tdh-chi-nhanh-editor-cover-preview" aria-hidden>
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt=""
              fill
              className="tdh-chi-nhanh-editor-cover-photo"
              sizes="160px"
              unoptimized={coverUrl.includes("imagedelivery.net")}
            />
          ) : (
            <div
              className={`tdh-chi-nhanh-editor-cover-ph ${truongCoverClass(index)}`}
            >
              <TruongCardCoverGeo variant={index} />
            </div>
          )}
        </div>
        <div className="tdh-chi-nhanh-editor-cover-actions">
          <button
            type="button"
            className="tdh-inline-chip-btn"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Đang tải…" : coverUrl ? "Đổi ảnh" : "Thêm ảnh bìa"}
          </button>
          {branch.cover_id ? (
            <button
              type="button"
              className="tdh-inline-text-btn"
              disabled={uploading}
              onClick={() => onChange(null)}
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
              void onFilePicked(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`tdh-chi-nhanh-editor-chevron${expanded ? " is-open" : ""}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function TruongChiNhanhEditor({ branches, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function updateAt(index: number, patch: Partial<TruongChiNhanh>) {
    onChange(
      branches.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    );
  }

  function removeAt(index: number) {
    const removed = branches[index];
    const next = branches.filter((_, i) => i !== index);
    onChange(next);
    if (expandedId === removed.id) {
      setExpandedId(null);
    }
    if (confirmDeleteId === removed.id) {
      setConfirmDeleteId(null);
    }
  }

  function requestDelete(id: string) {
    setConfirmDeleteId(id);
  }

  function cancelDelete() {
    setConfirmDeleteId(null);
  }

  function addBranch() {
    if (branches.length >= CHI_NHANH_MAX) return;
    setConfirmDeleteId(null);
    const branch = emptyChiNhanh();
    onChange([...branches, branch]);
    setExpandedId(branch.id);
  }

  function toggleExpanded(id: string) {
    setConfirmDeleteId(null);
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="tdh-chi-nhanh-editor">
      <p className="tdh-chi-nhanh-editor-hint">
        Bấm chi nhánh để sửa. Chi nhánh <strong>Chính</strong> hiển thị ở sidebar;
        các chi nhánh phụ có liên hệ riêng — xem bảng «Xem thêm chi nhánh».
      </p>
      <ul className="tdh-chi-nhanh-editor-list">
        {branches.map((branch, index) => {
          const expanded = expandedId === branch.id;
          const confirmingDelete = confirmDeleteId === branch.id;
          const title = branchTitle(branch, index);
          return (
            <li
              key={branch.id}
              className={`tdh-chi-nhanh-editor-card${expanded ? " is-expanded" : ""}`}
            >
              <div className="tdh-chi-nhanh-editor-card-hdr">
                <button
                  type="button"
                  className="tdh-chi-nhanh-editor-toggle"
                  onClick={() => toggleExpanded(branch.id)}
                  aria-expanded={expanded}
                >
                  <span className="tdh-chi-nhanh-editor-toggle-main">
                    <span className="tdh-chi-nhanh-editor-title">{title}</span>
                    {index === 0 ? (
                      <span className="tdh-chi-nhanh-editor-badge">Chính</span>
                    ) : null}
                  </span>
                  {!expanded ? (
                    <span className="tdh-chi-nhanh-editor-summary">
                      {branchSummary(branch)}
                    </span>
                  ) : null}
                  <ChevronIcon expanded={expanded} />
                </button>
                {!confirmingDelete ? (
                  <button
                    type="button"
                    className="tdh-chi-nhanh-editor-del"
                    disabled={branches.length <= 1}
                    onClick={() => requestDelete(branch.id)}
                    aria-label={`Xóa ${title}`}
                  >
                    Xóa
                  </button>
                ) : null}
              </div>
              {confirmingDelete ? (
                <div
                  className="tdh-chi-nhanh-editor-delete-confirm"
                  role="alert"
                >
                  <div className="tdh-inline-modal-warning tdh-chi-nhanh-editor-delete-warning">
                    <p>
                      Xóa <strong>«{title}»</strong>? Chi nhánh sẽ bị gỡ khỏi
                      danh sách sau khi bạn bấm <strong>Lưu thông tin trường</strong>.
                    </p>
                    {index === 0 ? (
                      <p>
                        Đây là chi nhánh <strong>chính</strong> — địa chỉ hiển thị
                        trên hub cũng sẽ thay đổi theo chi nhánh đầu tiên còn lại.
                      </p>
                    ) : null}
                  </div>
                  <div className="tdh-chi-nhanh-editor-delete-actions">
                    <button
                      type="button"
                      className="tdh-inline-btn ghost"
                      onClick={cancelDelete}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      className="tdh-inline-btn danger"
                      onClick={() => removeAt(index)}
                    >
                      Xóa chi nhánh
                    </button>
                  </div>
                </div>
              ) : null}
              {expanded && !confirmingDelete ? (
                <div className="tdh-chi-nhanh-editor-fields">
                  <BranchCoverField
                    branch={branch}
                    index={index}
                    onChange={(cover_id) => updateAt(index, { cover_id })}
                  />
                  <label className="tdh-inline-field">
                    <span>Tên chi nhánh</span>
                    <input
                      value={branch.ten}
                      onChange={(e) => updateAt(index, { ten: e.target.value })}
                      placeholder="Cơ sở chính, Chi nhánh Q.3…"
                    />
                  </label>
                  <label className="tdh-inline-field">
                    <span>Địa chỉ</span>
                    <input
                      value={branch.dia_chi}
                      onChange={(e) =>
                        updateAt(index, { dia_chi: e.target.value })
                      }
                      placeholder="Số nhà, đường, quận…"
                    />
                  </label>
                  <label className="tdh-inline-field">
                    <span>Tỉnh / thành phố</span>
                    <select
                      value={branch.tinh_thanh ?? ""}
                      onChange={(e) =>
                        updateAt(index, {
                          tinh_thanh: e.target.value || null,
                        })
                      }
                    >
                      {TINH_THANH_OPTIONS.map((opt) => (
                        <option key={opt.value || "none"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="tdh-inline-field">
                    <span>Điện thoại</span>
                    <input
                      value={branch.dien_thoai ?? ""}
                      onChange={(e) =>
                        updateAt(index, { dien_thoai: e.target.value })
                      }
                      placeholder="028…"
                      inputMode="tel"
                    />
                  </label>
                  <label className="tdh-inline-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={branch.email ?? ""}
                      onChange={(e) =>
                        updateAt(index, { email: e.target.value })
                      }
                      placeholder="tuyensinh@…"
                    />
                  </label>
                  <label className="tdh-inline-field">
                    <span>Website</span>
                    <input
                      value={branch.website ?? ""}
                      onChange={(e) =>
                        updateAt(index, { website: e.target.value })
                      }
                      placeholder="https://"
                    />
                  </label>
                  <label className="tdh-inline-field">
                    <span>Facebook / fanpage</span>
                    <input
                      value={branch.facebook ?? ""}
                      onChange={(e) =>
                        updateAt(index, { facebook: e.target.value })
                      }
                      placeholder="facebook.com/…"
                    />
                  </label>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="tdh-inline-chip-btn tdh-chi-nhanh-editor-add"
        disabled={branches.length >= CHI_NHANH_MAX}
        onClick={addBranch}
      >
        + Thêm chi nhánh
      </button>
    </div>
  );
}
