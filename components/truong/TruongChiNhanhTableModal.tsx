"use client";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { facebookDisplayLabel } from "@/lib/truong/chi-nhanh";
import { labelTinhThanh } from "@/lib/truong/contact";
import type { TruongChiNhanh } from "@/lib/truong/types";

type Props = {
  open: boolean;
  onClose: () => void;
  branches: TruongChiNhanh[];
};

function webHref(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

function webLabel(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function TruongChiNhanhTableModal({ open, onClose, branches }: Props) {
  return (
    <TruongInlineModal
      open={open}
      onClose={onClose}
      className="tdh-inline-modal--wide tdh-chi-nhanh-modal"
      labelledBy="tdh-chi-nhanh-title"
    >
      <h3 id="tdh-chi-nhanh-title" className="tdh-inline-modal-title">
        Danh sách chi nhánh
      </h3>
      <p className="tdh-chi-nhanh-modal-lead">
        {branches.length} cơ sở / chi nhánh — mỗi chi nhánh có liên hệ riêng.
      </p>
      <div className="tdh-chi-nhanh-table-wrap">
        <table className="tdh-chi-nhanh-table">
          <thead>
            <tr>
              <th scope="col">Chi nhánh</th>
              <th scope="col">Địa chỉ</th>
              <th scope="col">Tỉnh / TP</th>
              <th scope="col">Điện thoại</th>
              <th scope="col">Email</th>
              <th scope="col">Website</th>
              <th scope="col">Facebook</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch, index) => (
              <tr key={branch.id}>
                <td>
                  {branch.ten}
                  {index === 0 ? (
                    <span className="tdh-chi-nhanh-table-badge">Chính</span>
                  ) : null}
                </td>
                <td>{branch.dia_chi}</td>
                <td>{labelTinhThanh(branch.tinh_thanh) ?? "—"}</td>
                <td>
                  {branch.dien_thoai?.trim() ? (
                    <a href={`tel:${branch.dien_thoai.replace(/\s+/g, "")}`}>
                      {branch.dien_thoai}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {branch.email?.trim() ? (
                    <a href={`mailto:${branch.email.trim()}`}>{branch.email}</a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {branch.website?.trim() ? (
                    <a
                      href={webHref(branch.website.trim())}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {webLabel(branch.website.trim())}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {branch.facebook?.trim() ? (
                    <a
                      href={webHref(branch.facebook.trim())}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {facebookDisplayLabel(branch.facebook.trim())}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
