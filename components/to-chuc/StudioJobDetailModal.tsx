"use client";

import {
  CalendarClock,
  CircleDollarSign,
  ExternalLink,
  MapPin,
  Pencil,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { StudioJobApplyForm } from "@/components/to-chuc/StudioJobApplyForm";
import { StudioPerkList } from "@/components/to-chuc/StudioPerkList";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { giaiDoanMucTieuLabels } from "@/lib/to-chuc/studio-tuyen-dung-distribution";
import {
  formatStudioDeadline,
  formatStudioSalary,
  studioJobPlace,
} from "@/lib/to-chuc/studio-tuyen-dung-format";
import {
  STUDIO_JOB_LOAI_HINH_LABEL,
  STUDIO_JOB_STATUS_LABEL,
  type StudioJob,
} from "@/lib/to-chuc/studio-tuyen-dung-types";

const AUTH_MESSAGE = "Đăng nhập để ứng tuyển vị trí này trên CINs.";

type Props = {
  job: StudioJob;
  orgTen: string;
  canEdit: boolean;
  viewerLoggedIn: boolean;
  onClose: () => void;
  /** Bấm "Sửa tin" (chỉ admin) — đóng chi tiết & mở modal chỉnh sửa. */
  onEdit?: (job: StudioJob) => void;
};

export function StudioJobDetailModal({
  job,
  orgTen,
  canEdit,
  viewerLoggedIn,
  onClose,
  onEdit,
}: Props) {
  const { openAuthModal } = useAuthGate();
  const [applying, setApplying] = useState(false);

  const salary = formatStudioSalary(job);
  const deadline = formatStudioDeadline(job.hanNop);
  const isOpen = job.trangThai === "dang_mo";
  const titleId = `studio-job-detail-${job.id}`;

  function handleApply() {
    if (!viewerLoggedIn) {
      openAuthModal(AUTH_MESSAGE);
      return;
    }
    setApplying(true);
  }

  return (
    <TruongInlineModal
      open
      onClose={onClose}
      className="tdh-inline-modal--wide studio-job-detail-modal"
      labelledBy={titleId}
    >
      <div className="studio-job-detail-head">
        <h3 id={titleId} className="tdh-inline-modal-title studio-job-detail-title">
          {job.tieuDe}
        </h3>
        <p className="studio-job-detail-org">{orgTen}</p>
        {canEdit && onEdit ? (
          <button
            type="button"
            className="studio-job-detail-edit"
            onClick={() => onEdit(job)}
          >
            <Pencil size={14} strokeWidth={2.2} aria-hidden />
            Sửa tin
          </button>
        ) : null}
      </div>

      <div className="studio-job-card-chips studio-job-detail-chips">
        <span className="studio-job-chip">
          {STUDIO_JOB_LOAI_HINH_LABEL[job.loaiHinh]}
        </span>
        <span className="studio-job-chip">
          <MapPin size={12} strokeWidth={2} aria-hidden />
          {studioJobPlace(job)}
        </span>
        {job.linhVucTen ? (
          <span className="studio-job-chip">{job.linhVucTen}</span>
        ) : null}
        {job.capDo ? <span className="studio-job-chip">{job.capDo}</span> : null}
        {canEdit && !isOpen ? (
          <span className="studio-job-chip studio-job-chip--status">
            {STUDIO_JOB_STATUS_LABEL[job.trangThai]}
          </span>
        ) : null}
      </div>

      {salary || deadline || job.soLuong ? (
        <div className="studio-job-card-meta studio-job-detail-meta">
          {salary ? (
            <span className="studio-job-meta-item studio-job-meta-item--salary">
              <CircleDollarSign size={14} strokeWidth={2} aria-hidden />
              {salary}
            </span>
          ) : null}
          {deadline ? (
            <span className="studio-job-meta-item">
              <CalendarClock size={14} strokeWidth={2} aria-hidden />
              {deadline}
            </span>
          ) : null}
          {job.soLuong ? (
            <span className="studio-job-meta-item">
              <Users size={14} strokeWidth={2} aria-hidden />
              Cần tuyển {job.soLuong}
            </span>
          ) : null}
        </div>
      ) : null}

      {job.ngheSlug ? (
        <Link
          href={`/huong-nghiep/nghe/${job.ngheSlug}`}
          className="studio-job-detail-nghe-link"
        >
          <ExternalLink size={13} strokeWidth={2.2} aria-hidden />
          Xem trang nghề: {job.ngheTieuDe ?? job.tieuDe}
        </Link>
      ) : null}

      {job.moTaNgan?.trim() ? (
        <p className="studio-job-detail-lead">{job.moTaNgan.trim()}</p>
      ) : null}

      {job.moTa?.trim() ? (
        <section className="studio-job-detail-sec">
          <h4 className="studio-job-detail-sec-title">Mô tả công việc</h4>
          <p className="studio-job-detail-text">{job.moTa.trim()}</p>
        </section>
      ) : null}

      {job.yeuCau?.trim() ? (
        <section className="studio-job-detail-sec">
          <h4 className="studio-job-detail-sec-title">Yêu cầu ứng viên</h4>
          <p className="studio-job-detail-text">{job.yeuCau.trim()}</p>
        </section>
      ) : null}

      {job.phucLoi.length ? (
        <section className="studio-job-detail-sec">
          <h4 className="studio-job-detail-sec-title">Quyền lợi & phúc lợi</h4>
          <StudioPerkList items={job.phucLoi} />
        </section>
      ) : job.quyenLoi?.trim() ? (
        <section className="studio-job-detail-sec">
          <h4 className="studio-job-detail-sec-title">Quyền lợi</h4>
          <p className="studio-job-detail-text">{job.quyenLoi.trim()}</p>
        </section>
      ) : null}

      {canEdit ? (
        <div className="studio-job-card-dist studio-job-detail-dist">
          <span className="studio-job-card-dist-label">Phân phối:</span>
          {giaiDoanMucTieuLabels(job.giaiDoanMucTieu).map((label) => (
            <span key={label} className="studio-job-chip studio-job-chip--dist">
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {!canEdit ? (
        isOpen ? (
          applying ? (
            <StudioJobApplyForm
              jobId={job.id}
              onDone={() => setApplying(false)}
            />
          ) : (
            <div className="studio-job-detail-foot">
              <button
                type="button"
                className="studio-job-apply-btn"
                onClick={handleApply}
              >
                Ứng tuyển vị trí này
              </button>
            </div>
          )
        ) : (
          <p className="studio-job-detail-closed">Vị trí này đã đóng nhận hồ sơ.</p>
        )
      ) : null}
    </TruongInlineModal>
  );
}
