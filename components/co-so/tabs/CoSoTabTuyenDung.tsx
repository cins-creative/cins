"use client";

import {
  Briefcase,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { StudioJobDetailModal } from "@/components/to-chuc/StudioJobDetailModal";
import { StudioJobEditModal } from "@/components/to-chuc/StudioJobEditModal";
import { coSoJobPath, coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import {
  formatStudioDateShort,
  formatStudioSalary,
  studioJobPlace,
  studioJobStatusBadge,
} from "@/lib/to-chuc/studio-tuyen-dung-format";
import { capDoLabels } from "@/lib/to-chuc/studio-tuyen-dung-distribution";
import {
  STUDIO_JOB_LOAI_HINH_LABEL,
  type StudioJob,
} from "@/lib/to-chuc/studio-tuyen-dung-types";

type Props = {
  jobs: StudioJob[];
  orgId: string;
  orgSlug: string;
  orgTen: string;
  canEdit: boolean;
  viewerLoggedIn: boolean;
  /** jobId từ URL `/co-so/:slug/tuyen-dung/:jobId` — mở popup chi tiết. */
  activeJobId: string | null;
  num?: string;
};

export function CoSoTabTuyenDung({
  jobs: jobsProp,
  orgId,
  orgSlug,
  orgTen,
  canEdit,
  viewerLoggedIn,
  activeJobId,
}: Props) {
  const router = useRouter();
  const [jobs, setJobs] = useState<StudioJob[]>(jobsProp);
  const [editJob, setEditJob] = useState<StudioJob | "new" | null>(null);

  const visibleJobs = canEdit
    ? jobs
    : jobs.filter((j) => j.trangThai === "dang_mo");

  const detailJob = useMemo(
    () =>
      activeJobId ? visibleJobs.find((j) => j.id === activeJobId) ?? null : null,
    [activeJobId, visibleJobs],
  );

  function openDetail(job: StudioJob) {
    router.push(coSoJobPath(orgSlug, job.id), { scroll: false });
  }

  function closeDetail() {
    router.push(coSoTabPath(orgSlug, "tuyen-dung"), { scroll: false });
  }

  function handleSaved(saved: StudioJob) {
    setJobs((prev) => {
      const has = prev.some((j) => j.id === saved.id);
      return has
        ? prev.map((j) => (j.id === saved.id ? saved : j))
        : [saved, ...prev];
    });
    setEditJob(null);
  }

  return (
    <>
      {canEdit ? (
        <div className="sec-hdr studio-jobs-hdr studio-jobs-hdr--no-title">
          <button
            type="button"
            className="studio-job-add-btn"
            onClick={() => setEditJob("new")}
          >
            <Plus size={16} strokeWidth={2.2} aria-hidden />
            Đăng tin mới
          </button>
        </div>
      ) : null}

      {visibleJobs.length === 0 ? (
        <p className="tdh-placeholder">
          {canEdit
            ? "Chưa có tin tuyển dụng. Bấm «Đăng tin mới» để tuyển giảng viên, trợ giảng hoặc nhân sự."
            : `${orgTen} chưa mở vị trí nào. Theo dõi để nhận thông báo khi có tin tuyển dụng mới.`}
        </p>
      ) : (
        <ul className="studio-job-list">
          {visibleJobs.map((job) => {
            const salary = formatStudioSalary(job);
            const deadline = formatStudioDateShort(job.hanNop);
            const posted = formatStudioDateShort(job.taoLuc);
            const lead = job.moTaNgan?.trim() || job.moTa?.trim() || null;
            const status = studioJobStatusBadge(job);
            return (
              <li
                key={job.id}
                className="studio-job-card"
                data-status={status.tone}
              >
                <button
                  type="button"
                  className="studio-job-card-hit"
                  onClick={() => openDetail(job)}
                  aria-label={`Xem chi tiết tin tuyển dụng ${job.tieuDe}`}
                >
                  <div className="studio-job-card-head">
                    <span className="studio-job-card-ic" aria-hidden>
                      <Briefcase size={18} strokeWidth={2} />
                    </span>
                    <div className="studio-job-card-titles">
                      <div className="studio-job-card-title-row">
                        <h3 className="studio-job-card-title">{job.tieuDe}</h3>
                        <span
                          className="studio-job-status-badge"
                          data-tone={status.tone}
                        >
                          <span
                            className="studio-job-status-dot"
                            aria-hidden
                          />
                          {status.label}
                        </span>
                      </div>
                      <div className="studio-job-card-chips">
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
                        {capDoLabels(job.capDo).map((cd) => (
                          <span key={cd} className="studio-job-chip">
                            {cd}
                          </span>
                        ))}
                        {canEdit && job.hienThiCoHoi ? (
                          <span className="studio-job-chip studio-job-chip--dist">
                            Cơ hội
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {canEdit ? null : (
                      <ChevronRight
                        size={18}
                        strokeWidth={2}
                        className="studio-job-card-arrow"
                        aria-hidden
                      />
                    )}
                  </div>

                  <dl className="studio-job-facts">
                    <div className="studio-job-fact studio-job-fact--salary">
                      <dt className="studio-job-fact-label">Mức lương</dt>
                      <dd className="studio-job-fact-value">
                        {salary ?? "Thỏa thuận"}
                      </dd>
                    </div>
                    <div className="studio-job-fact">
                      <dt className="studio-job-fact-label">Cần tuyển</dt>
                      <dd className="studio-job-fact-value">
                        {job.soLuong ? `${job.soLuong} người` : "—"}
                      </dd>
                    </div>
                  </dl>

                  {lead ? (
                    <p className="studio-job-card-desc studio-job-card-desc--lead">
                      {lead}
                    </p>
                  ) : null}

                  <p className="studio-job-card-dates">
                    <span>Hạn nộp: {deadline ?? "Không giới hạn"}</span>
                    {posted ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>Đăng {posted}</span>
                      </>
                    ) : null}
                  </p>
                </button>

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
              </li>
            );
          })}
        </ul>
      )}

      {detailJob ? (
        <StudioJobDetailModal
          key={detailJob.id}
          job={detailJob}
          orgId={orgId}
          orgTen={orgTen}
          jobHref={coSoJobPath(orgSlug, detailJob.id)}
          canEdit={canEdit}
          viewerLoggedIn={viewerLoggedIn}
          onClose={closeDetail}
          onEdit={
            canEdit
              ? (job) => {
                  closeDetail();
                  setEditJob(job);
                }
              : undefined
          }
        />
      ) : null}

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
