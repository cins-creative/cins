"use client";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { labelTinhThanh } from "@/lib/truong/contact";
import type { TruongChiNhanh } from "@/lib/truong/types";

type Props = {
  open: boolean;
  onClose: () => void;
  branches: TruongChiNhanh[];
};

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
        {branches.length} cơ sở / chi nhánh của trường.
      </p>
      <div className="tdh-chi-nhanh-table-wrap">
        <table className="tdh-chi-nhanh-table">
          <thead>
            <tr>
              <th scope="col">Chi nhánh</th>
              <th scope="col">Địa chỉ</th>
              <th scope="col">Tỉnh / TP</th>
              <th scope="col">Điện thoại</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => (
              <tr key={branch.id}>
                <td>{branch.ten}</td>
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
