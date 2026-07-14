import Link from "next/link";
import {
  AppWindow,
  ArrowRight,
  BookMarked,
  BookOpen,
  Briefcase,
  GraduationCap,
  Tag,
  type LucideIcon,
} from "lucide-react";

import { hubLoaiDeptTheme } from "@/lib/bai-viet/hub-loai";
import type { SearchHit } from "@/lib/search/types";

function knowledgeKickerIcon(loai: string | null): LucideIcon {
  switch (loai) {
    case "nghe":
      return Briefcase;
    case "nganh_dao_tao":
      return BookOpen;
    case "mon_hoc":
      return GraduationCap;
    case "phan_mem":
      return AppWindow;
    case "keyword":
      return Tag;
    default:
      return BookMarked;
  }
}

function knowledgeFootLabel(loai: string | null): string {
  switch (loai) {
    case "nghe":
      return "Xem nghề";
    case "nganh_dao_tao":
      return "Xem ngành";
    case "mon_hoc":
      return "Xem môn";
    case "phan_mem":
      return "Xem phần mềm";
    case "keyword":
      return "Xem từ khóa";
    default:
      return "Xem bài";
  }
}

export function TimKiemArticleCard({ hit }: { hit: SearchHit }) {
  const hasImg = Boolean(hit.avatarUrl?.trim());
  const dept = hubLoaiDeptTheme(hit.entityLoai);
  const KickerIcon = knowledgeKickerIcon(hit.entityLoai);
  const initial = hit.title.trim().charAt(0).toUpperCase() || "?";
  const ariaParts = [hit.badge, hit.title, hit.subtitle, hit.snippet].filter(
    Boolean,
  );

  return (
    <Link
      href={hit.href}
      className={`tk-knowledge-card tk-knowledge-card--${dept}`}
      aria-label={ariaParts.join(" — ")}
    >
      <div className="tk-knowledge-media" aria-hidden>
        <div
          className={`tk-knowledge-media-bg${hasImg ? " tk-knowledge-media-bg--photo" : ""}`}
        >
          {hasImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hit.avatarUrl!}
              alt=""
              className="tk-knowledge-media-img"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="tk-knowledge-media-ph">{initial}</span>
          )}
        </div>
        <div className="tk-knowledge-media-shade" />
        {hit.badge ? (
          <span className="tk-knowledge-kicker">
            <KickerIcon size={13} strokeWidth={2.2} aria-hidden />
            {hit.badge}
          </span>
        ) : null}
      </div>

      <div className="tk-knowledge-body">
        <div className="tk-knowledge-head">
          <h3 className="tk-knowledge-title">{hit.title}</h3>
          {hit.subtitle ? (
            <p className="tk-knowledge-subtitle">{hit.subtitle}</p>
          ) : null}
        </div>

        {hit.snippet ? (
          <p className="tk-knowledge-desc">{hit.snippet}</p>
        ) : null}

        <div className="tk-knowledge-foot">
          <span className="tk-knowledge-foot-label">
            {knowledgeFootLabel(hit.entityLoai)}
          </span>
          <span className="tk-knowledge-foot-arrow" aria-hidden>
            <ArrowRight size={17} strokeWidth={2.2} />
          </span>
        </div>
      </div>
    </Link>
  );
}
