"use client";

import {
  AppWindow,
  Award,
  Bus,
  CalendarDays,
  Clock,
  Dumbbell,
  Gift,
  GraduationCap,
  HeartPulse,
  MonitorSmartphone,
  Plane,
  Receipt,
  ShieldCheck,
  Shirt,
  Sparkles,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import {
  STUDIO_PHUC_LOI_CATALOG,
  studioPhucLoiLabel,
  type StudioJobPhucLoiItem,
} from "@/lib/to-chuc/studio-phuc-loi";

/** Map tên icon (catalog) → component lucide. Dùng chung cho picker + hiển thị. */
export const STUDIO_PERK_ICONS: Record<string, LucideIcon> = {
  ShieldCheck,
  Gift,
  TrendingUp,
  Plane,
  HeartPulse,
  GraduationCap,
  Wallet,
  MonitorSmartphone,
  AppWindow,
  Shirt,
  CalendarDays,
  Clock,
  Receipt,
  Bus,
  Dumbbell,
  Award,
  Sparkles,
};

const ICON_BY_KEY = new Map(
  STUDIO_PHUC_LOI_CATALOG.map((item) => [item.key, item.icon] as const),
);

type Props = {
  items: StudioJobPhucLoiItem[];
};

/** Hiển thị danh sách phúc lợi dạng icon + nhãn (+ ghi chú nếu có). */
export function StudioPerkList({ items }: Props) {
  if (!items.length) return null;
  return (
    <ul className="studio-perk-list">
      {items.map((item) => {
        const Icon = STUDIO_PERK_ICONS[ICON_BY_KEY.get(item.key) ?? ""] ?? Sparkles;
        return (
          <li key={item.key} className="studio-perk-list-item">
            <span className="studio-perk-list-ic" aria-hidden>
              <Icon size={15} strokeWidth={2} />
            </span>
            <span className="studio-perk-list-text">
              <span className="studio-perk-list-label">
                {studioPhucLoiLabel(item.key)}
              </span>
              {item.note ? (
                <span className="studio-perk-list-note">{item.note}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
