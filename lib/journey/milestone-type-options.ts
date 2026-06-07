import {
  BookOpen,
  Briefcase,
  FolderKanban,
  UserCircle2,
  type LucideIcon,
} from "lucide-react";

import type { MilestoneType } from "@/components/journey/milestone-types";
import type { LoaiMoc } from "@/lib/editor/types";

export type MilestoneTypeOption = {
  ui: Exclude<MilestoneType, "bookmark">;
  db: LoaiMoc;
  label: string;
  Icon: LucideIcon;
};

/** Loại cột mốc trong filter timeline + menu đổi loại (owner / inline). */
export const JOURNEY_MILESTONE_TYPE_OPTIONS: ReadonlyArray<MilestoneTypeOption> = [
  { ui: "hoc", db: "hoc", label: "Học tập", Icon: BookOpen },
  { ui: "lam", db: "lam_viec", label: "Công việc", Icon: Briefcase },
  { ui: "du-an", db: "du_an", label: "Dự án", Icon: FolderKanban },
  { ui: "ca-nhan", db: "ca_nhan", label: "Cá nhân", Icon: UserCircle2 },
];

export const JOURNEY_FILTERABLE_TYPE_UI_KEYS = JOURNEY_MILESTONE_TYPE_OPTIONS.map(
  (o) => o.ui,
);
