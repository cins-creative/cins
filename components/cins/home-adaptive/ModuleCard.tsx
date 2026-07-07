import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type ModuleCardProps = {
  icon?: LucideIcon;
  title: string;
  /** Pill nhỏ cạnh tiêu đề (vd. «Đang mở»). */
  badge?: string;
  /** Link "xem tất cả" góc phải header. */
  moreHref?: string;
  moreLabel?: string;
  className?: string;
  children: ReactNode;
};

/** Khung card module chung cho 2 cột adaptive — dùng design tokens. */
export function ModuleCard({
  icon: Icon,
  title,
  badge,
  moreHref,
  moreLabel = "Xem tất cả",
  className,
  children,
}: ModuleCardProps) {
  return (
    <section className={`ha-card${className ? ` ${className}` : ""}`}>
      <div className="ha-card-head">
        {Icon ? <Icon size={16} strokeWidth={2} aria-hidden /> : null}
        <span className="ha-card-title">{title}</span>
        {badge ? <span className="ha-card-badge">{badge}</span> : null}
        {moreHref ? (
          <Link href={moreHref} className="ha-card-more" prefetch={false}>
            {moreLabel}
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
