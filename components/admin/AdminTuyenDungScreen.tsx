"use client";

import Link from "next/link";
import { Briefcase, ExternalLink, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import {
  TUYEN_DUNG_GIAI_DOAN_OPTIONS,
  giaiDoanMucTieuLabels,
} from "@/lib/to-chuc/studio-tuyen-dung-distribution";
import {
  STUDIO_JOB_STATUS_LABEL,
  type StudioJob,
} from "@/lib/to-chuc/studio-tuyen-dung-types";
import type { GiaiDoan } from "@/lib/cins/home-adaptive/persona";

export type AdminTuyenDungRow = StudioJob & {
  orgTen: string;
  orgSlug: string | null;
};

type Props = { jobs: AdminTuyenDungRow[] };

function toggleGiaiDoan(current: GiaiDoan[], value: GiaiDoan): GiaiDoan[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

function statusClass(status: StudioJob["trangThai"]): string {
  if (status === "dang_mo") return "td-adm-status--open";
  if (status === "nhap") return "td-adm-status--draft";
  return "td-adm-status--closed";
}

export function AdminTuyenDungScreen({ jobs: jobsProp }: Props) {
  const [jobs, setJobs] = useState(jobsProp);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftCoHoi, setDraftCoHoi] = useState(true);
  const [draftGiaiDoan, setDraftGiaiDoan] = useState<GiaiDoan[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openEdit(job: AdminTuyenDungRow) {
    setEditingId(job.id);
    setDraftCoHoi(job.hienThiCoHoi);
    setDraftGiaiDoan([...job.giaiDoanMucTieu]);
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setMsg(null);
  }

  function saveDistribution(jobId: string) {
    if (draftGiaiDoan.length === 0) {
      setMsg("Chọn ít nhất một nhóm đối tượng.");
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/tuyen-dung", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          jobId,
          hienThiCoHoi: draftCoHoi,
          giaiDoanMucTieu: draftGiaiDoan,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        job?: AdminTuyenDungRow;
        error?: string;
      } | null;
      if (!res.ok || !json?.job) {
        setMsg(json?.error ?? "Không lưu được.");
        return;
      }
      const saved = json.job;
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                hienThiCoHoi: saved.hienThiCoHoi,
                giaiDoanMucTieu: saved.giaiDoanMucTieu,
              }
            : j,
        ),
      );
      setEditingId(null);
      setMsg("Đã cập nhật phân phối.");
    });
  }

  const openCount = jobs.filter((j) => j.trangThai === "dang_mo").length;
  const coHoiCount = jobs.filter(
    (j) => j.trangThai === "dang_mo" && j.hienThiCoHoi,
  ).length;

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Tuyển dụng · Phân phối nội dung</h1>
        <p className="page-subtitle">
          Tổng quan tin tuyển dụng từ studio và cấu hình nhóm{" "}
          <strong>giai đoạn</strong> nhìn thấy trên module Cơ hội (cụm LÀM).
        </p>
      </header>

      <div className="td-adm-stats">
        <div className="td-adm-stat">
          <Briefcase size={18} strokeWidth={2} aria-hidden />
          <span>
            <strong>{jobs.length}</strong> tin
          </span>
        </div>
        <div className="td-adm-stat">
          <span>
            <strong>{openCount}</strong> đang mở
          </span>
        </div>
        <div className="td-adm-stat">
          <span>
            <strong>{coHoiCount}</strong> hiện module Cơ hội
          </span>
        </div>
      </div>

      {msg ? <p className="td-adm-msg">{msg}</p> : null}

      {jobs.length === 0 ? (
        <div className="td-adm-empty">
          <Briefcase size={28} strokeWidth={1.6} aria-hidden />
          <p>Chưa có tin tuyển dụng nào.</p>
          <small>Org admin tạo tin tại tab Tuyển dụng trên trang Studio.</small>
        </div>
      ) : (
        <div className="td-adm-table-wrap">
          <table className="td-adm-table">
            <thead>
              <tr>
                <th>Vị trí</th>
                <th>Tổ chức</th>
                <th>Trạng thái</th>
                <th>Module Cơ hội</th>
                <th>Đối tượng (giai đoạn)</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const editing = editingId === job.id;
                const labels = giaiDoanMucTieuLabels(job.giaiDoanMucTieu);
                const studioHref = job.orgSlug
                  ? `/studio/${encodeURIComponent(job.orgSlug)}/tuyen-dung`
                  : null;
                return (
                  <tr key={job.id} className={editing ? "is-editing" : undefined}>
                    <td>
                      <div className="td-adm-job-title">{job.tieuDe}</div>
                      {job.moTaNgan ? (
                        <div className="td-adm-job-sub">{job.moTaNgan}</div>
                      ) : null}
                    </td>
                    <td>
                      <span className="td-adm-org">{job.orgTen}</span>
                      {studioHref ? (
                        <Link
                          href={studioHref}
                          className="td-adm-studio-link"
                          prefetch={false}
                        >
                          Studio
                          <ExternalLink size={12} strokeWidth={2} aria-hidden />
                        </Link>
                      ) : null}
                    </td>
                    <td>
                      <span className={`td-adm-status ${statusClass(job.trangThai)}`}>
                        {STUDIO_JOB_STATUS_LABEL[job.trangThai]}
                      </span>
                    </td>
                    <td>
                      {editing ? (
                        <label className="td-adm-check">
                          <input
                            type="checkbox"
                            checked={draftCoHoi}
                            onChange={(e) => setDraftCoHoi(e.target.checked)}
                          />
                          Hiển thị
                        </label>
                      ) : job.hienThiCoHoi ? (
                        <span className="td-adm-pill td-adm-pill--on">Bật</span>
                      ) : (
                        <span className="td-adm-pill">Tắt</span>
                      )}
                    </td>
                    <td>
                      {editing ? (
                        <div className="td-adm-audience-edit">
                          {TUYEN_DUNG_GIAI_DOAN_OPTIONS.map((opt) => (
                            <label key={opt.value} className="td-adm-check td-adm-check--compact">
                              <input
                                type="checkbox"
                                checked={draftGiaiDoan.includes(opt.value)}
                                onChange={() =>
                                  setDraftGiaiDoan((prev) =>
                                    toggleGiaiDoan(prev, opt.value),
                                  )
                                }
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="td-adm-chips">
                          {labels.map((label) => (
                            <span key={label} className="td-adm-chip">
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="td-adm-actions">
                      {editing ? (
                        <>
                          <button
                            type="button"
                            className="td-adm-btn td-adm-btn--primary"
                            disabled={pending}
                            onClick={() => saveDistribution(job.id)}
                          >
                            {pending ? (
                              <Loader2 size={14} className="td-adm-spin" aria-hidden />
                            ) : (
                              "Lưu"
                            )}
                          </button>
                          <button
                            type="button"
                            className="td-adm-btn"
                            disabled={pending}
                            onClick={cancelEdit}
                          >
                            Hủy
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="td-adm-btn"
                          onClick={() => openEdit(job)}
                        >
                          Phân phối
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
