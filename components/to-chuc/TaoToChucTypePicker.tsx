"use client";

import {
  ArrowRight,
  Briefcase,
  GraduationCap,
  Info,
  User,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

import { TaoToChucPageChrome } from "@/components/to-chuc/TaoToChucPageChrome";

export function TaoToChucTypePicker({ userSlug }: { userSlug: string }) {
  return (
    <>
      <TaoToChucPageChrome />
      <div className="ttc-shell">
      <div className="ttc-ctx">
        <User size={15} aria-hidden />
        <span>@{userSlug}</span>
        <ChevronRight size={15} aria-hidden />
        <b>Tạo tổ chức</b>
      </div>

      <div className="ttc-card">
        <div className="ttc-card-head">
          <h1 className="ttc-card-title">Tạo tổ chức</h1>
          <p className="ttc-card-sub">
            Chọn loại tổ chức bạn muốn tạo. Bạn sẽ là quản trị viên của tổ chức
            này.
          </p>
        </div>
        <div className="ttc-card-body">
          <div className="ttc-type-grid">
            <Link href="/tao-to-chuc/studio" className="ttc-type-card" prefetch={false}>
              <div className="ttc-type-ico studio">
                <Briefcase size={26} aria-hidden />
              </div>
              <div className="ttc-type-name">Studio / Doanh nghiệp</div>
              <div className="ttc-type-desc">
                Studio sáng tạo, công ty, đội nhóm làm dự án &amp; tác phẩm.
              </div>
              <span className="ttc-type-arrow" aria-hidden>
                <ArrowRight size={18} />
              </span>
            </Link>

            <Link href="/tao-to-chuc/co-so" className="ttc-type-card" prefetch={false}>
              <div className="ttc-type-ico edu">
                <GraduationCap size={26} aria-hidden />
              </div>
              <div className="ttc-type-name">Cơ sở đào tạo</div>
              <div className="ttc-type-desc">
                Trung tâm, trường nghề đào tạo sáng tạo có khóa học &amp; học
                viên.
              </div>
              <span className="ttc-type-arrow" aria-hidden>
                <ArrowRight size={18} />
              </span>
            </Link>
          </div>

          <div className="ttc-note">
            <Info size={15} aria-hidden />
            <span>
              Tạo được ngay, không cần CINS duyệt. Trường Đại học là loại riêng
              do CINS xác minh — không nằm ở đây.
            </span>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
