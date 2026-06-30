"use client";

import Link from "next/link";
import { Briefcase, MapPin } from "lucide-react";

import { labelTinhThanh } from "@/lib/truong/contact";
import {
  STUDIO_JOB_LOAI_HINH_LABEL,
  type StudioJob,
} from "@/lib/to-chuc/studio-tuyen-dung-types";
import { studioTabPath } from "@/lib/to-chuc/studio-routes";

type Props = {
  jobs: StudioJob[];
  orgSlug: string;
};

function jobPlace(job: StudioJob): string {
  if (job.lamTuXa) return "Remote";
  return labelTinhThanh(job.tinhThanh) ?? "Linh hoạt";
}

export function StudioJobsSidebar({ jobs, orgSlug }: Props) {
  const tuyenDungHref = studioTabPath(orgSlug, "tuyen-dung");

  return (
    <aside className="tdh-admission-side" aria-label="Tin tuyển dụng đang mở">
      <div className="tdh-admission-side-head">
        <div className="tdh-admission-side-year-row">
          <p className="timeline-year-kicker">Tuyển dụng</p>
        </div>
      </div>

      <section className="timeline-section timeline-section--rail">
        {jobs.length === 0 ? (
          <p className="ptxt-empty-text tdh-admission-side-empty">
            Chưa có vị trí nào đang mở. Tin tuyển dụng sẽ hiển thị tại đây.
          </p>
        ) : (
          <div className="studio-jobs-rail">
            {jobs.slice(0, 5).map((job) => (
              <Link key={job.id} href={tuyenDungHref} className="studio-job-mini">
                <span className="studio-job-mini-ic" aria-hidden>
                  <Briefcase size={15} strokeWidth={2} />
                </span>
                <span className="studio-job-mini-body">
                  <span className="studio-job-mini-title">{job.tieuDe}</span>
                  <span className="studio-job-mini-meta">
                    <MapPin size={11} strokeWidth={2} aria-hidden />
                    {jobPlace(job)} · {STUDIO_JOB_LOAI_HINH_LABEL[job.loaiHinh]}
                  </span>
                </span>
              </Link>
            ))}
            {jobs.length > 5 ? (
              <Link href={tuyenDungHref} className="studio-jobs-more">
                Xem tất cả {jobs.length} vị trí
              </Link>
            ) : null}
          </div>
        )}
      </section>
    </aside>
  );
}
