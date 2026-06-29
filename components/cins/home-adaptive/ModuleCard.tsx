import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type ModuleCardProps = {
  icon?: LucideIcon;
  title: string;
  /** Link "xem tất cả" góc phải header. */
  moreHref?: string;
  moreLabel?: string;
  /** Nhãn "luôn có" (brief §2 — su_kien + goi_y_theo_doi). */
  constant?: boolean;
  className?: string;
  children: ReactNode;
};

/** Khung card module chung cho 2 cột adaptive — dùng design tokens. */
export function ModuleCard({
  icon: Icon,
  title,
  moreHref,
  moreLabel = "Xem tất cả",
  constant = false,
  className,
  children,
}: ModuleCardProps) {
  return (
    <section className={`ha-card${className ? ` ${className}` : ""}`}>
      <div className="ha-card-head">
        {Icon ? <Icon size={16} strokeWidth={2} aria-hidden /> : null}
        <span className="ha-card-title">{title}</span>
        {constant ? <span className="ha-card-flag">luôn có</span> : null}
        {moreHref && !constant ? (
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
