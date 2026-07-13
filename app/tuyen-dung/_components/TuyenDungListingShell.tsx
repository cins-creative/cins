"use client";

import { Briefcase, CircleDollarSign, MapPin } from "lucide-react";
import Link from "next/link";

import { TuyenDungFilterBar } from "@/app/tuyen-dung/_components/TuyenDungFilterBar";
import { useTuyenDungFilters } from "@/app/tuyen-dung/_components/tuyen-dung-filters";
import type { TuyenDungListItem } from "@/lib/to-chuc/tuyen-dung-listing";

type Props = {
  items: TuyenDungListItem[];
  total: number;
};

export function TuyenDungListingShell({ items, total }: Props) {
  const filters = useTuyenDungFilters(items);
  const { filtered } = filters;

  return (
    <>
      <header className="td-hub-header">
        <div className="td-hub-header__glass" aria-hidden="true" />
        <span className="j-tlb-streak-slow" aria-hidden="true" />
        <div className="td-hub-header__inner">
          <TuyenDungFilterBar {...filters} total={total} />
        </div>
      </header>

      <div className="tuyen-dung-body">
        {filtered.length === 0 ? (
          <p className="tuyen-dung-empty">
            {filters.filtersActive
              ? "Không có tin nào khớp bộ lọc — thử nới mức lương hoặc bỏ bớt điều kiện."
              : "Hiện chưa có tin tuyển dụng nào đang mở. Theo dõi studio yêu thích để nhận thông báo khi có vị trí mới."}
          </p>
        ) : (
          <ul className="tuyen-dung-grid">
            {filtered.map((job) => {
              const statusTone = job.expired ? "expired" : "open";
              const statusLabel = job.expired ? "Hết hạn nộp" : "Đang tuyển";
              const inner = (
                <>
                  <div className="tuyen-dung-card-head">
                    <span className="tuyen-dung-logo" aria-hidden>
                      {job.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={job.avatarUrl} alt="" loading="lazy" />
                      ) : (
                        job.orgTen.slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <div className="tuyen-dung-card-titles">
                      <h2 className="tuyen-dung-card-title">{job.tieuDe}</h2>
                      <span className="tuyen-dung-card-org">
                        <Briefcase size={12} strokeWidth={2} aria-hidden />
                        {job.orgTen}
                      </span>
                    </div>
                    <span className="tuyen-dung-status" data-tone={statusTone}>
                      <span className="tuyen-dung-status-dot" aria-hidden />
                      {statusLabel}
                    </span>
                  </div>

                  <div className="tuyen-dung-chips">
                    <span className="tuyen-dung-chip tuyen-dung-chip--type">
                      {job.loaiHinhLabel}
                    </span>
                    <span className="tuyen-dung-chip">
                      <MapPin size={12} strokeWidth={2} aria-hidden />
                      {job.place}
                    </span>
                    {job.linhVucTen ? (
                      <span className="tuyen-dung-chip">{job.linhVucTen}</span>
                    ) : null}
                    {job.capDo.map((cd) => (
                      <span key={cd} className="tuyen-dung-chip">
                        {cd}
                      </span>
                    ))}
                  </div>

                  {job.moTaNgan ? (
                    <p className="tuyen-dung-card-desc">{job.moTaNgan}</p>
                  ) : null}

                  <div className="tuyen-dung-card-foot">
                    <span className="tuyen-dung-salary">
                      <CircleDollarSign size={15} strokeWidth={2} aria-hidden />
                      {job.salary ?? "Thỏa thuận"}
                    </span>
                    <span className="tuyen-dung-card-dates">
                      <span>Hạn: {job.deadline ?? "Không giới hạn"}</span>
                      {job.posted ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>Đăng {job.posted}</span>
                        </>
                      ) : null}
                    </span>
                  </div>
                </>
              );

              return (
                <li key={job.id} className="tuyen-dung-card" data-status={statusTone}>
                  {job.href ? (
                    <Link href={job.href} className="tuyen-dung-card-hit" prefetch={false}>
                      {inner}
                    </Link>
                  ) : (
                    <div className="tuyen-dung-card-hit">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
