"use client";

import {
  BookOpen,
  Building2,
  FileText,
  GraduationCap,
  Users,
} from "lucide-react";

import type { UserOrgMembershipItem } from "@/lib/journey/user-orgs-fetch";

type Props = {
  item: UserOrgMembershipItem;
};

function formatJoinDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function formatStatCount(count: number): string {
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

function orgCtaLabel(loai: string): string {
  if (loai === "cong_dong") return "Xem cộng đồng";
  if (loai === "co_so_dao_tao") return "Xem cơ sở đào tạo";
  if (loai === "truong_dai_hoc") return "Xem trường";
  return "Xem tổ chức";
}

function orgCardVariant(loai: string): {
  cardClass: string;
  prefix: "jcd" | "jcs";
} {
  if (loai === "co_so_dao_tao") {
    return { cardClass: "jcard jcard--co-so", prefix: "jcs" };
  }
  return { cardClass: "jcard jcard--cong-dong", prefix: "jcd" };
}

function OrgTypeBadge({
  loaiToChuc,
  loaiLabel,
}: {
  loaiToChuc: string;
  loaiLabel: string;
}) {
  if (loaiToChuc === "co_so_dao_tao") {
    return (
      <span className="ctx-badge j-type-co-so">
        <BookOpen size={11} strokeWidth={1.8} aria-hidden />
        {loaiLabel}
      </span>
    );
  }
  if (loaiToChuc === "truong_dai_hoc") {
    return (
      <span className="ctx-badge j-type-cong-dong">
        <GraduationCap size={11} strokeWidth={1.8} aria-hidden />
        {loaiLabel}
      </span>
    );
  }
  if (loaiToChuc === "doanh_nghiep" || loaiToChuc === "studio") {
    return (
      <span className="ctx-badge j-type-cong-dong">
        <Building2 size={11} strokeWidth={1.8} aria-hidden />
        {loaiLabel}
      </span>
    );
  }
  return (
    <span className="ctx-badge j-type-cong-dong">
      <Users size={11} strokeWidth={1.8} aria-hidden />
      {loaiLabel}
    </span>
  );
}

export function JourneyOrgMembershipCard({ item }: Props) {
  const { org } = item;
  const { cardClass, prefix } = orgCardVariant(org.loaiToChuc);
  const pfx = prefix;
  const coverUrl = org.coverUrl;
  const initial = org.ten.charAt(0).toUpperCase();
  const joinDate = formatJoinDate(item.tuNgay);
  const showStats =
    org.loaiToChuc === "cong_dong" &&
    (typeof org.memberCount === "number" || typeof org.postCount === "number");
  const ctaLabel = orgCtaLabel(org.loaiToChuc);

  return (
    <div className={`j-org-membership-card ${cardClass}`}>
      <div className={`${pfx}-hero${coverUrl ? " has-cover-img" : ""}`}>
        <div
          className={`${pfx}-cover${coverUrl ? " has-img" : ""}`}
          aria-hidden
        >
          {coverUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={coverUrl} alt="" />
          ) : null}
        </div>
        <div className={`${pfx}-topbar`}>
          <OrgTypeBadge loaiToChuc={org.loaiToChuc} loaiLabel={org.loaiLabel} />
        </div>
      </div>

      <div className={`${pfx}-body`}>
        <div className={`${pfx}-logo-wrap`} aria-hidden>
          {org.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={org.avatarUrl} alt="" className={`${pfx}-logo`} />
          ) : (
            <span className={`${pfx}-logo ${pfx}-logo--fallback`}>{initial}</span>
          )}
        </div>
        <p className={`${pfx}-kicker`}>{item.vaiTroLabel}</p>
        <time className={`${pfx}-date`} dateTime={item.tuNgay}>
          Tham gia · {joinDate}
        </time>
        <h3 className={`${pfx}-title`}>{org.ten}</h3>
        {showStats ? (
          <div className="jcd-stats" aria-label="Quy mô cộng đồng">
            {typeof org.memberCount === "number" ? (
              <span className="jcd-stat">
                <Users size={14} strokeWidth={2} aria-hidden />
                <strong>{formatStatCount(org.memberCount)}</strong>
                thành viên
              </span>
            ) : null}
            {typeof org.postCount === "number" ? (
              <span className="jcd-stat">
                <FileText size={14} strokeWidth={2} aria-hidden />
                <strong>{formatStatCount(org.postCount)}</strong>
                bài viết
              </span>
            ) : null}
          </div>
        ) : null}
        {org.moTa ? <p className={`${pfx}-desc`}>{org.moTa}</p> : null}
        {org.href ? (
          <span className={`${pfx}-cta`}>{ctaLabel}</span>
        ) : null}
      </div>
    </div>
  );
}

export function JourneyOrgMembershipCardSkeleton() {
  return (
    <div className="j-org-membership-card j-org-membership-card--skel" aria-hidden>
      <div className="j-org-membership-skel-hero" />
      <div className="j-org-membership-skel-body">
        <div className="j-org-membership-skel-logo" />
        <div className="j-org-membership-skel-line j-org-membership-skel-line--sm" />
        <div className="j-org-membership-skel-line j-org-membership-skel-line--md" />
        <div className="j-org-membership-skel-line j-org-membership-skel-line--lg" />
        <div className="j-org-membership-skel-cta" />
      </div>
    </div>
  );
}
