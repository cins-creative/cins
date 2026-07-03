"use client";

import { ExternalLink, Loader2, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { StudioJobApplicant } from "@/lib/to-chuc/studio-tuyen-dung-applicants";

const TRANG_THAI_LABEL: Record<string, string> = {
  moi: "Mới",
  da_xem: "Đã xem",
  phu_hop: "Phù hợp",
  tu_choi: "Từ chối",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function StudioJobApplicantsPanel({
  jobId,
  onClose: _onClose,
}: {
  jobId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<StudioJobApplicant[]>([]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/studio/tuyen-dung/${jobId}/ung-vien`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(
            typeof json.error === "string"
              ? json.error
              : "Không tải được danh sách ứng viên.",
          );
          return;
        }
        setApplicants(Array.isArray(json.applicants) ? json.applicants : []);
      })
      .catch(() => {
        if (!cancelled) setError("Không kết nối được máy chủ. Thử lại sau.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [jobId]);

  return (
    <section className="studio-job-applicants">
      <h4 className="studio-job-detail-sec-title">
        <UserRound size={16} strokeWidth={2.2} aria-hidden />
        Ứng viên {applicants.length > 0 ? `(${applicants.length})` : ""}
      </h4>

      {loading ? (
        <p className="studio-job-applicants-status">
          <Loader2 size={14} className="studio-job-spin" aria-hidden />
          Đang tải ứng viên…
        </p>
      ) : error ? (
        <p className="studio-job-applicants-status studio-job-applicants-status--error">
          {error}
        </p>
      ) : applicants.length === 0 ? (
        <p className="studio-job-applicants-status">
          Chưa có ứng viên nào cho vị trí này.
        </p>
      ) : (
        <ul className="studio-job-applicants-list">
          {applicants.map((a) => (
            <li key={a.userId} className="studio-job-applicant">
              <span className="studio-job-applicant-avatar" aria-hidden>
                {a.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.avatarUrl} alt="" />
                ) : (
                  a.hoTen.slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="studio-job-applicant-body">
                <span className="studio-job-applicant-name">
                  {a.hoTen}
                  <span className="studio-job-applicant-status">
                    {TRANG_THAI_LABEL[a.trangThai] ?? a.trangThai}
                  </span>
                </span>
                <span className="studio-job-applicant-meta">
                  {a.giaiDoanLabel ? <span>{a.giaiDoanLabel}</span> : null}
                  <span>Ứng tuyển {formatDate(a.taoLuc)}</span>
                </span>
                {a.thuNgo ? (
                  <span className="studio-job-applicant-note">{a.thuNgo}</span>
                ) : null}
              </span>
              {a.journeyHref ? (
                <Link
                  href={a.journeyHref}
                  className="studio-job-applicant-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={13} strokeWidth={2.2} aria-hidden />
                  Journey
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
