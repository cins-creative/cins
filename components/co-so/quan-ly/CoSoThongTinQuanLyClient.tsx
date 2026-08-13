"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useState } from "react";

import { CoSoPageSettingsModal } from "@/components/co-so/CoSoPageSettingsModal";
import { stripHtmlToPlainText } from "@/lib/truong/bai-dang-content";
import { coSoRootPath } from "@/lib/to-chuc/co-so-routes";
import { schoolInitials } from "@/lib/truong/school-avatar";

const FALLBACK_LEAD =
  "Điều khiển học phí, lớp và học viên tại đây. Trang cơ sở chỉ phản chiếu những gì bạn đã cấu hình.";

type Props = {
  orgId: string;
  orgSlug: string;
  orgTen: string;
  orgLogoSrc?: string | null;
  /** HTML giới thiệu (`gioi_thieu_truong`) — lead hero. */
  gioiThieuTruong?: string | null;
};

function leadFromGioiThieu(html: string | null | undefined): string | null {
  if (!html?.trim()) return null;
  const plain = stripHtmlToPlainText(html);
  return plain || null;
}

/** Settings (gồm bảng chi nhánh) trên `/manage/facilities`. */
export function CoSoThongTinQuanLyClient({
  orgId,
  orgSlug,
  orgTen,
  orgLogoSrc,
  gioiThieuTruong = null,
}: Props) {
  const [ten, setTen] = useState(orgTen);
  const [lead, setLead] = useState(
    () => leadFromGioiThieu(gioiThieuTruong) ?? FALLBACK_LEAD,
  );

  const handleDraftChange = useCallback(
    (draft: {
      ten: string;
      moTa: string | null;
      gioiThieuTruong: string | null;
    }) => {
      setTen(draft.ten);
      setLead(leadFromGioiThieu(draft.gioiThieuTruong) ?? FALLBACK_LEAD);
    },
    [],
  );

  return (
    <div className="cso-co-so-stack">
      <header className="cso-tq-hero">
        <div className="cso-tq-hero-main">
          <div className="cso-tq-hero-logo" aria-hidden={!orgLogoSrc}>
            {orgLogoSrc ? (
              <Image
                src={orgLogoSrc}
                alt=""
                width={64}
                height={64}
                className="cso-tq-hero-logo-img"
                unoptimized={orgLogoSrc.includes("imagedelivery.net")}
              />
            ) : (
              <span className="cso-tq-hero-logo-initials">
                {schoolInitials(ten)}
              </span>
            )}
          </div>
          <div className="cso-tq-hero-copy">
            <p className="cso-tq-kicker">Cơ sở</p>
            <h2 className="cso-tq-heading">{ten}</h2>
            <p className="cso-tq-lead">{lead}</p>
          </div>
        </div>
        <div className="cso-tq-hero-actions">
          <Link
            href={coSoRootPath(orgSlug)}
            className="cso-ql-btn cso-ql-btn--ghost cso-tq-hero-btn"
          >
            Xem trang cơ sở
            <ArrowUpRight size={15} strokeWidth={2.2} aria-hidden />
          </Link>
        </div>
      </header>

      <CoSoPageSettingsModal
        open
        orgId={orgId}
        variant="page"
        chiNhanhExternal
        onClose={() => undefined}
        onSaved={() => undefined}
        onDraftChange={handleDraftChange}
      />
    </div>
  );
}
