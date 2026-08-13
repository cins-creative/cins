"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useState } from "react";

import { StudioPageSettingsModal } from "@/components/to-chuc/StudioPageSettingsModal";
import { stripHtmlToPlainText } from "@/lib/truong/bai-dang-content";
import { studioRootPath } from "@/lib/to-chuc/studio-routes";
import { schoolInitials } from "@/lib/truong/school-avatar";

const FALLBACK_LEAD =
  "Hồ sơ, liên hệ và hiển thị trang studio. Trang công khai phản chiếu những gì bạn đã cấu hình tại đây.";

type Props = {
  orgId: string;
  orgSlug: string;
  orgTen: string;
  orgLogoSrc?: string | null;
  moTa?: string | null;
  gioiThieu?: string | null;
};

function leadFrom(moTa: string | null | undefined, gioiThieu: string | null | undefined): string {
  const short = moTa?.trim();
  if (short) return short;
  if (gioiThieu?.trim()) {
    const plain = stripHtmlToPlainText(gioiThieu);
    if (plain) return plain;
  }
  return FALLBACK_LEAD;
}

/** Hồ sơ + hiển thị + thành viên trên `/manage/info` — layout khớp `/academy/.../manage/facilities`. */
export function StudioThongTinQuanLyClient({
  orgId,
  orgSlug,
  orgTen,
  orgLogoSrc,
  moTa = null,
  gioiThieu = null,
}: Props) {
  const [ten, setTen] = useState(orgTen);
  const [lead, setLead] = useState(() => leadFrom(moTa, gioiThieu));

  const handleDraftChange = useCallback(
    (draft: { ten: string; moTa: string | null; gioiThieu: string | null }) => {
      setTen(draft.ten);
      setLead(leadFrom(draft.moTa, draft.gioiThieu));
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
            <p className="cso-tq-kicker">Studio</p>
            <h2 className="cso-tq-heading">{ten}</h2>
            <p className="cso-tq-lead">{lead}</p>
          </div>
        </div>
        <div className="cso-tq-hero-actions">
          <Link
            href={studioRootPath(orgSlug)}
            className="cso-ql-btn cso-ql-btn--ghost cso-tq-hero-btn"
          >
            Xem trang studio
            <ArrowUpRight size={15} strokeWidth={2.2} aria-hidden />
          </Link>
        </div>
      </header>

      <StudioPageSettingsModal
        open
        orgId={orgId}
        variant="page"
        allowedSections={["identity", "about", "contact", "display", "members"]}
        onClose={() => undefined}
        onSaved={() => undefined}
        onDraftChange={handleDraftChange}
      />
    </div>
  );
}
