"use client";

import {
  ArrowRight,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { TaoToChucDevNoticeModal } from "@/components/to-chuc/TaoToChucDevNoticeModal";
import { TaoToChucPageShell } from "@/components/to-chuc/TaoToChucPageShell";

export function TaoToChucTypePicker({ userSlug }: { userSlug: string }) {
  const [studioNoticeOpen, setStudioNoticeOpen] = useState(false);

  return (
    <>
      <TaoToChucDevNoticeModal
        open={studioNoticeOpen}
        onClose={() => setStudioNoticeOpen(false)}
      />
      <TaoToChucPageShell>
        <p className="cins-login-eyebrow">@{userSlug} · tạo tổ chức</p>
        <h1 className="cins-login-title">Tạo tổ chức</h1>
        <p className="cins-login-sub">
          Chọn loại tổ chức bạn muốn tạo. Bạn sẽ là quản trị viên của tổ chức
          này.
        </p>

        <div className="ttc-type-grid">
          <button
            type="button"
            className="ttc-type-card"
            onClick={() => setStudioNoticeOpen(true)}
          >
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
          </button>

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

        <ul className="cins-login-bullets ttc-bullets" aria-label="Lưu ý khi tạo tổ chức">
          <li>
            <span className="cins-login-bullet-ico" aria-hidden>
              ✦
            </span>
            <span>
              <strong>Tạo được ngay</strong> — không cần CINs duyệt trước khi
              bắt đầu quản lý.
            </span>
          </li>
          <li>
            <span className="cins-login-bullet-ico" aria-hidden>
              ✦
            </span>
            <span>
              <strong>Trường đại học</strong> là loại riêng do CINs xác minh —
              không nằm ở đây.
            </span>
          </li>
        </ul>
      </TaoToChucPageShell>
    </>
  );
}
