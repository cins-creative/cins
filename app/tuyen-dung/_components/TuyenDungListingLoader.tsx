import { Briefcase, CircleDollarSign, MapPin } from "lucide-react";
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
                <span
                  className="tuyen-dung-status"
                  data-tone={statusTone}
                >
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
    </>
  );
}
