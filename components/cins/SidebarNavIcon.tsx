import type { ReactNode, SVGProps } from "react";

import type { MainNavIcon } from "@/lib/cins/mainNav";

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconSvg({
  children,
  ...props
}: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      aria-hidden
      {...stroke}
      {...props}
    >
      {children}
    </svg>
  );
}

const ICONS: Record<MainNavIcon, () => ReactNode> = {
  home: () => (
    <IconSvg>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
    </IconSvg>
  ),
  gallery: () => (
    <IconSvg>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </IconSvg>
  ),
  career: () => (
    <IconSvg>
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-4 4-2-2" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
    </IconSvg>
  ),
  education: () => (
    <IconSvg>
      <path d="M4 10 12 6l8-4 8 4-8 4-8-4z" />
      <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
    </IconSvg>
  ),
  courses: () => (
    <IconSvg>
      <path d="M5 5h12a2 2 0 0 1 2 2v11H7a2 2 0 0 1-2-2V5z" />
      <path d="M7 5v11a2 2 0 0 0 2 2h10" />
      <path d="M9 9h6M9 13h4" />
    </IconSvg>
  ),
  business: () => (
    <IconSvg>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </IconSvg>
  ),
  events: () => (
    <IconSvg>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </IconSvg>
  ),
  blog: () => (
    <IconSvg>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </IconSvg>
  ),
  help: () => (
    <IconSvg>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4 2c0 2-2 2-2 3.5" />
      <path d="M12 17h.01" strokeWidth={2} />
    </IconSvg>
  ),
  settings: () => (
    <IconSvg>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </IconSvg>
  ),
};

type Props = { name: MainNavIcon };

export function SidebarNavIcon({ name }: Props) {
  const Icon = ICONS[name];
  return (
    <span className="sb-mage-icon">
      <Icon />
    </span>
  );
}
