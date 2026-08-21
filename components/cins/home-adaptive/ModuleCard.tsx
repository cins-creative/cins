import { type LucideIcon } from "lucide-react";

import { HomeModTitle } from "@/components/cins/home-adaptive/HomeModTitle";
import { CinsArrowIos } from "@/components/icons/CinsArrowIos";
import type { ModuleId } from "@/lib/cins/home-adaptive/persona";
import Link from "next/link";
import type { ReactNode } from "react";

type ModuleCardProps = {
  icon?: LucideIcon;
  title: string;
  /** Khi EN: dùng catalog module, giữ nguyên `title` khi VI. */
  moduleId?: ModuleId;
  /** Pill nhỏ cạnh tiêu đề (vd. «Đang mở»). */
  badge?: string;
  /** Nội dung góc phải header (vd. bộ lọc thẻ) — trước `moreHref` nếu có. */
  headTrailing?: ReactNode;
  /** Link góc phải header — hiện icon mũi tên; `moreLabel` dùng cho aria-label. */
  moreHref?: string;
  moreLabel?: string;
  className?: string;
  children: ReactNode;
};

/** Khung card module chung cho 2 cột adaptive — dùng design tokens. */
export function ModuleCard({
  icon: Icon,
  title,
  moduleId,
  badge,
  headTrailing,
  moreHref,
  moreLabel = "Xem tất cả",
  className,
  children,
}: ModuleCardProps) {
  return (
    <section className={`ha-card${className ? ` ${className}` : ""}`}>
      <div className="ha-card-head">
        {Icon ? <Icon size={16} strokeWidth={2} aria-hidden /> : null}
        <span className="ha-card-title">
          <HomeModTitle moduleId={moduleId} fallback={title} />
        </span>
        {badge ? <span className="ha-card-badge">{badge}</span> : null}
        {headTrailing ? (
          <div className="ha-card-head-trailing">{headTrailing}</div>
        ) : null}
        {moreHref ? (
          <Link
            href={moreHref}
            className="ha-card-more"
            prefetch={false}
            aria-label={moreLabel}
            title={moreLabel}
          >
            <CinsArrowIos size={16} strokeWidth={2.5} aria-hidden />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Empty-state lịch sự bên trong 1 module (module thiếu data / chưa có schema). */
export function ModuleEmpty({ children }: { children: ReactNode }) {
  return <p className="ha-card-empty">{children}</p>;
}
