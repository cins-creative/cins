import {
  Briefcase,
  Calendar,
  Compass,
  FileText,
  GraduationCap,
  HelpCircle,
  Home,
  LayoutGrid,
  type LucideIcon,
  Newspaper,
  Settings,
  UserCircle,
  Users,
} from "lucide-react";

import type { MainNavIcon } from "@/lib/cins/mainNav";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ Map từ key icon trong `MAIN_NAV_ITEMS` sang component Lucide.    ║
   ║                                                                  ║
   ║ Đồng bộ với design system v2 (`cins-journey-desktop-v2.html` —   ║
   ║ topbar dùng `lucide.js`). Stroke + size đã set ở `.sb-mage-icon` ║
   ║ CSS để giữ kích thước cố định 21px khi sidebar collapse.         ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const ICON_MAP: Record<MainNavIcon, LucideIcon> = {
  home: Home,
  gallery: LayoutGrid,
  career: Compass,
  education: GraduationCap,
  courses: FileText,
  community: Users,
  business: Briefcase,
  events: Calendar,
  blog: Newspaper,
  profile: UserCircle,
  help: HelpCircle,
  settings: Settings,
};

type Props = { name: MainNavIcon };

export function SidebarNavIcon({ name }: Props) {
  const Icon = ICON_MAP[name];
  return (
    <span className="sb-mage-icon" aria-hidden>
      <Icon size={21} strokeWidth={1.6} />
    </span>
  );
}
