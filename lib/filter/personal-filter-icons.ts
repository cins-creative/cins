import {
  BookOpen,
  Briefcase,
  FolderKanban,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Icon Lucide cho nhãn hệ thống — khớp dropdown timeline + badge loại cột mốc. */
const SYSTEM_PERSONAL_FILTER_ICONS: Record<string, LucideIcon> = {
  hoc: BookOpen,
  lam: Briefcase,
  "du-an": FolderKanban,
  "ca-nhan": UserCircle2,
  "cong-dong": Users,
};

export function getSystemPersonalFilterIcon(
  slug: string,
): LucideIcon | null {
  return SYSTEM_PERSONAL_FILTER_ICONS[slug] ?? null;
}
