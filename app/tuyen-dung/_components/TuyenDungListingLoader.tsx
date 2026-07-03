import { Briefcase, CalendarClock, CircleDollarSign, MapPin } from "lucide-react";
import Link from "next/link";

import { loadTuyenDungListing } from "@/lib/to-chuc/tuyen-dung-listing";

export async function TuyenDungListingLoader() {
  const { items, total } = await loadTuyenDungListing(24, 0);

  if (items.length === 0) {
    return (
      <p className="tuyen-dung-empty">
        Hiện chưa có tin tuyển dụng nào đang mở. Theo dõi studio yêu thích để nhận
        thông báo khi có vị trí mới.
      </p>
    );
  }

  return (
    <>
      <p className="tuyen-dung-count">
        <strong>{total}</strong> vị trí đang tuyển
      </p>

      <ul className="tuyen-dung-grid">
        {items.map((job) => {
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
                  <span className="tuyen-dung-card-org">{job.orgTen}</span>
                </div>
              </div>

              <div className="tuyen-dung-chips">
                <span className="tuyen-dung-chip">
                  <Briefcase size={12} strokeWidth={2} aria-hidden />
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

              {job.salary || job.deadline ? (
                <div className="tuyen-dung-card-meta">
                  {job.salary ? (
                    <span className="tuyen-dung-meta tuyen-dung-meta--sal">
                      <CircleDollarSign size={14} strokeWidth={2} aria-hidden />
                      {job.salary}
                    </span>
                  ) : null}
                  {job.deadline ? (
                    <span className="tuyen-dung-meta">
                      <CalendarClock size={14} strokeWidth={2} aria-hidden />
                      {job.deadline}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </>
          );

          return (
            <li key={job.id} className="tuyen-dung-card">
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
    </>
  );
}
