import Link from "next/link";
import { GraduationCap } from "lucide-react";

import type { KhoaHocListItem } from "@/lib/to-chuc/khoa-hoc-listing";

export function KhoaHocListingCard({ khoa }: { khoa: KhoaHocListItem }) {
  const orgInitial = khoa.orgTen.trim().charAt(0).toUpperCase() || "?";

  return (
    <Link href={khoa.href} className="tkh-card" prefetch={false}>
      <span className="tkh-card-cover" aria-hidden>
        {khoa.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={khoa.coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="tkh-card-cover-img"
          />
        ) : (
          <span className="tkh-card-cover-fallback">
            <GraduationCap size={26} strokeWidth={1.6} />
          </span>
        )}
        <span className="tkh-card-status" data-tone={khoa.trangThaiTone}>
          <span className="tkh-card-status-dot" aria-hidden />
          {khoa.trangThaiLabel}
        </span>
      </span>

      <span className="tkh-card-body">
        <span className="tkh-card-org">
          <span className="tkh-card-org-avatar">
            {khoa.orgAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={khoa.orgAvatarUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <span>{orgInitial}</span>
            )}
          </span>
          <span className="tkh-card-org-name">{khoa.orgTen}</span>
        </span>

        <span className="tkh-card-title">{khoa.tenKhoaHoc}</span>

        {khoa.moTa ? (
          <span className="tkh-card-snippet">{khoa.moTa}</span>
        ) : null}

        <span className="tkh-card-chips">
          <span className="tkh-chip">{khoa.loaiMoHinhLabel}</span>
          <span className="tkh-chip">{khoa.trinhDoLabel}</span>
        </span>

        <span className="tkh-card-foot">
          <span className="tkh-card-price">{khoa.hocPhiLabel}</span>
          {khoa.thoiLuongLabel !== "—" ? (
            <span className="tkh-card-duration">{khoa.thoiLuongLabel}</span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
