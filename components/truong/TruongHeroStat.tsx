import type { ComponentType, ReactNode, SVGProps } from "react";

type MageIcon = ComponentType<SVGProps<SVGSVGElement>>;

type Props = {
  icon: MageIcon;
  label: string;
  children: ReactNode;
};

export function TruongHeroStat({ icon: Icon, label, children }: Props) {
  return (
    <div className="tdh-stat">
      <div className="tdh-stat-label">
        <span className="tdh-stat-label-icon-wrap" aria-hidden>
          <Icon className="tdh-stat-label-icon" />
        </span>
        <span className="tdh-stat-label-text">{label}</span>
      </div>
      <div className="tdh-stat-value wrap-sm">{children}</div>
    </div>
  );
}
