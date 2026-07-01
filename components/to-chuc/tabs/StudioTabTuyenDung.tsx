"use client";

import {
  Briefcase,
  CalendarClock,
  CircleDollarSign,
  MapPin,
  Pencil,
  Plus,
} from "lucide-react";
import { useState } from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { StudioJobApplyForm } from "@/components/to-chuc/StudioJobApplyForm";
import { StudioJobEditModal } from "@/components/to-chuc/StudioJobEditModal";
import { labelTinhThanh } from "@/lib/truong/contact";
import { giaiDoanMucTieuLabels } from "@/lib/to-chuc/studio-tuyen-dung-distribution";
import {
  STUDIO_JOB_LOAI_HINH_LABEL,
  STUDIO_JOB_STATUS_LABEL,
  type StudioJob,
} from "@/lib/to-chuc/studio-tuyen-dung-types";

type Props = {
  jobs: StudioJob[];
  orgId: string;
  orgTen: string;
  canEdit: boolean;
  viewerLoggedIn: boolean;
};

const AUTH_MESSAGE = "Đăng nhập để ứng tuyển vị trí này trên CINs.";

function jobPlace(job: StudioJob): string {
  if (job.lamTuXa) return "Remote";
  return labelTinhThanh(job.tinhThanh) ?? "Linh hoạt";
}

function formatSalary(job: StudioJob): string | null {
  if (!job.hienThiLuong) return null;
  const fmt = (n: number) => n.toLocaleString("vi-VN");
  if (job.mucLuongTu && job.mucLuongDen) {
    return `${fmt(job.mucLuongTu)} – ${fmt(job.mucLuongDen)} đ`;
  }
  if (job.mucLuongTu) return `Từ ${fmt(job.mucLuongTu)} đ`;
  if (job.mucLuongDen) return `Đến ${fmt(job.mucLuongDen)} đ`;
  return null;
}

function formatDeadline(hanNop: string | null): string | null {
  if (!hanNop) return null;
  const d = new Date(hanNop);
  if (Number.isNaN(d.getTime())) return null;
  return `Hạn nộp ${d.toLocaleDateString("vi-VN")}`;
}

export function StudioTabTuyenDung({
  jobs: jobsProp,
  orgId,
  orgTen,
  canEdit,
  viewerLoggedIn,
}: Props) {
  const { openAuthModal } = useAuthGate();
  const [jobs, setJobs] = useState<StudioJob[]>(jobsProp);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [editJob, setEditJob] = useState<StudioJob | "new" | null>(null);

  function handleSaved(saved: StudioJob) {
    setJobs((prev) => {
      const has = prev.some((j) => j.id === saved.id);
      return has
        ? prev.map((j) => (j.id === saved.id ? saved : j))
        : [saved, ...prev];
    });
    setEditJob(null);
  }

  function handleApplyClick(jobId: string) {
    if (!viewerLoggedIn) {
      openAuthModal(AUTH_MESSAGE);
      return;
    }
    setApplyingId((prev) => (prev === jobId ? null : jobId));
  }

  const visibleJobs = canEdit
    ? jobs
    : jobs.filter((j) => j.trangThai === "dang_mo");

  return (
    <>
      <div className="sec-hdr studio-jobs-hdr">
        <div className="studio-jobs-hdr-text">
          <span className="sec-num">03</span>
          <h2 className="sec-title">Tuyển dụng</h2>
        </div>
        {canEdit ? (
          <button
            type="button"
            className="studio-job-add-btn"
            onClick={() => setEditJob("new")}
          >
            <Plus size={16} strokeWidth={2.2} aria-hidden />
            Đăng tin mới
          </button>
        ) : null}
      </div>

      {visibleJobs.length === 0 ? (
        <p className="tdh-placeholder">
          {canEdit
            ? "Chưa có tin tuyển dụng. Bấm «Đăng tin mới» để tạo vị trí đầu tiên."
            : `${orgTen} chưa mở vị trí nào. Theo dõi để nhận thông báo khi có tin tuyển dụng mới.`}
        </p>
      ) : (
        <ul className="studio-job-list">
          {visibleJobs.map((job) => {
            const salary = formatSalary(job);
            const deadline = formatDeadline(job.hanNop);
            const isApplying = applyingId === job.id;
            return (
              <li key={job.id} className="studio-job-card">
                <div className="studio-job-card-head">
                  <span className="studio-job-card-ic" aria-hidden>
                    <Briefcase size={18} strokeWidth={2} />
                  </span>
                  <div className="studio-job-card-titles">
                    <h3 className="studio-job-card-title">{job.tieuDe}</h3>
                    <div className="studio-job-card-chips">
                      <span className="studio-job-chip">
                        {STUDIO_JOB_LOAI_HINH_LABEL[job.loaiHinh]}
                      </span>
                      <span className="studio-job-chip">
                        <MapPin size={12} strokeWidth={2} aria-hidden />
                        {jobPlace(job)}
                      </span>
                      {job.linhVucTen ? (
                        <span className="studio-job-chip">{job.linhVucTen}</span>
                      ) : null}
                      {job.capDo ? (
                        <span className="studio-job-chip">{job.capDo}</span>
                      ) : null}
                      {canEdit && job.trangThai !== "dang_mo" ? (
                        <span className="studio-job-chip studio-job-chip--status">
                          {STUDIO_JOB_STATUS_LABEL[job.trangThai]}
                        </span>
                      ) : null}
                      {canEdit && job.hienThiCoHoi ? (
                        <span className="studio-job-chip studio-job-chip--dist">
                          Cơ hội
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      className="studio-job-edit-btn"
                      onClick={() => setEditJob(job)}
                      aria-label="Sửa tin tuyển dụng"
                    >
                      <Pencil size={15} strokeWidth={2} aria-hidden />
                    </button>
                  ) : null}
                </div>

                {salary || deadline ? (
                  <div className="studio-job-card-meta">
                    {salary ? (
                      <span className="studio-job-meta-item">
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
                  </div>
                ) : null}

                {job.moTaNgan?.trim() && !job.moTa?.trim() ? (
                  <p className="studio-job-card-desc studio-job-card-desc--lead">
                    {job.moTaNgan.trim()}
                  </p>
                ) : null}

                {job.moTa?.trim() ? (
                  <p className="studio-job-card-desc">{job.moTa.trim()}</p>
                ) : null}

                {job.yeuCau?.trim() ? (
                  <div className="studio-job-card-block">
                    <h4 className="studio-job-card-block-title">Yêu cầu</h4>
                    <p className="studio-job-card-desc">{job.yeuCau.trim()}</p>
                  </div>
                ) : null}

                {job.quyenLoi?.trim() ? (
                  <div className="studio-job-card-block">
                    <h4 className="studio-job-card-block-title">Quyền lợi</h4>
                    <p className="studio-job-card-desc">{job.quyenLoi.trim()}</p>
                  </div>
                ) : null}

                {canEdit ? (
                  <div className="studio-job-card-dist">
                    <span className="studio-job-card-dist-label">Phân phối:</span>
                    {giaiDoanMucTieuLabels(job.giaiDoanMucTieu).map((label) => (
                      <span key={label} className="studio-job-chip studio-job-chip--dist">
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}

                {!canEdit && job.trangThai === "dang_mo" ? (
                  <div className="studio-job-card-foot">
                    <button
                      type="button"
                      className="studio-job-apply-btn"
                      aria-expanded={isApplying}
                      onClick={() => handleApplyClick(job.id)}
                    >
                      {isApplying ? "Đóng" : "Ứng tuyển"}
                    </button>
                  </div>
                ) : null}

                {isApplying ? (
                  <StudioJobApplyForm
                    jobId={job.id}
                    onDone={() => setApplyingId(null)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && editJob ? (
        <StudioJobEditModal
          orgId={orgId}
          job={editJob === "new" ? null : editJob}
          onClose={() => setEditJob(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </>
  );
}
