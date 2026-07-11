import type { AccordionItem, PathStep, SkillItem } from "@/lib/article/blocks/types";

/** Mẫu 6 kỹ năng — khớp brief nghề (Material Symbols ligature). */
export const DEFAULT_SKILL_ITEMS: SkillItem[] = [
  { icon: "psychology", label: "Tư duy hệ thống" },
  { icon: "auto_awesome", label: "Sáng tạo có cấu trúc" },
  { icon: "edit_note", label: "Viết tài liệu rõ ràng" },
  { icon: "bolt", label: "Phân tích & giải quyết vấn đề" },
  { icon: "palette", label: "Hiểu tâm lý người chơi" },
  { icon: "settings", label: "Prototype & lần lặp" },
];

export function defaultAccordionFromSkills(
  skills: SkillItem[] = DEFAULT_SKILL_ITEMS,
): AccordionItem[] {
  return skills.map((s, i) => ({
    summary: s.label,
    body:
      i === 0
        ? "Giải thích tại sao kỹ năng này quan trọng với nghề — và cách rèn luyện cụ thể."
        : "Mô tả ngắn: vai trò của kỹ năng này và gợi ý thực hành.",
    open: i === 0,
  }));
}

/** Lộ trình mẫu 4 bước — brief section 04. */
export const DEFAULT_PATH_STEPS: PathStep[] = [
  {
    title: "Nền tảng cốt lõi",
    body: "Học phần mềm / kỹ năng nền trước — mục tiêu của bước này là gì, học ở đâu.",
  },
  {
    title: "Thực hành dự án nhỏ",
    body: "Áp dụng vào 1–2 dự án cá nhân — mô tả loại dự án phù hợp người mới.",
  },
  {
    title: "Kết nối pipeline với nghề khác",
    body: "Làm việc với vai trò liền kề — nhận brief, bàn giao, nhận feedback.",
  },
  {
    title: "Xây dựng portfolio thực tế",
    body: "Portfolio cần có gì — số lượng dự án, đăng ở đâu (ArtStation, GitHub, Behance…).",
  },
];
