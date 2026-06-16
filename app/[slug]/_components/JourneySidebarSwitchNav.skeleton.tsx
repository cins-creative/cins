import { Building2, Grid3X3, UserRound } from "lucide-react";

export function JourneySidebarSwitchNavSkeleton() {
  return (
    <nav
      className="j-profile-switch"
      aria-label="Chuyển giao diện hồ sơ"
      aria-busy="true"
    >
      <SwitchRow
        icon={<Grid3X3 size={15} aria-hidden />}
        label="Gallery"
      />
      <SwitchRow
        icon={<UserRound size={15} aria-hidden />}
        label="Friends"
        showCount
      />
      <SwitchRow
        icon={<Building2 size={15} aria-hidden />}
        label="Tổ chức"
        showCount
      />
    </nav>
  );
}

function SwitchRow({
  icon,
  label,
  showCount = false,
}: {
  icon: React.ReactNode;
  label: string;
  showCount?: boolean;
}) {
  return (
    <div className="j-profile-switch-btn j-skel-switch-row" aria-hidden>
      <span className="j-profile-switch-ico">{icon}</span>
      <span className="j-profile-switch-label">
        <span className="j-profile-switch-label-text">{label}</span>
        {showCount ? <span className="j-skel j-skel-count" /> : null}
      </span>
    </div>
  );
}
