import { Fragment, type ReactNode } from "react";

import { JourneyMilestoneCard } from "@/components/journey/JourneyMilestoneCard";
import type { MilestoneItem } from "@/components/journey/milestone-types";

type Props = {
  year: number;
  /** Milestones thuộc năm này — đã sort theo tháng giảm dần (mới → cũ). */
  milestones: ReadonlyArray<MilestoneItem>;
  /** Tag mô tả ở year-meta — VD "Năm hiện tại", "Năm motion-heavy". Tự sinh từ adapter. */
  metaLeft?: string | null;
  /** Tổng verified trong năm — hiển thị nếu > 0. */
  verifiedCount?: number;
  /** Owner đang xem → forward sang Card để render kebab menu. */
  isOwner?: boolean;
  /** Slug owner cho menu — bắt buộc khi `isOwner=true`. */
  ownerSlug?: string;
  /** Avatar + tên user — forward để badge "Cá nhân" render Avatar + Name. */
  authorAvatarUrl?: string | null;
  authorName?: string | null;
  /**
   * Slot tuỳ chọn render NGAY SAU cột mốc đầu tiên (cột mốc gần nhất khi
   * sort desc). Dùng để chèn CTA "Thêm cột mốc mới" cho owner — luôn nằm
   * dưới milestone mới nhất, dễ thấy mà không đẩy nội dung cũ xuống.
   */
  afterFirstSlot?: ReactNode;
};

/**
 * 1 block năm — header diamond + label `Fraunces 30px` + meta line + children milestones.
 *
 * Diamond ở year-header dùng class `.j-year-diamond` (absolute trên rail dọc). Cha của
 * year-header phải là `.j-year-block` (relative) để rail align đúng.
 */
export function JourneyYearBlock({
  year,
  milestones,
  metaLeft,
  verifiedCount = 0,
  isOwner = false,
  ownerSlug,
  authorAvatarUrl,
  authorName,
  afterFirstSlot,
}: Props) {
  /* Year header (label "2026 · Năm hiện tại · 1 mốc") đã bỏ theo brief mới
     — header bar phía trên timeline đã cover thông tin năm hiện tại, đỡ
     trùng lặp visual. `metaLeft` / `verifiedCount` giữ làm props (để callsite
     không phải đổi), chỉ không render. */
  void metaLeft;
  void verifiedCount;

  return (
    <section className="j-year-block" data-year={year}>
      {milestones.map((m, idx) => (
        <Fragment key={m.id}>
          <JourneyMilestoneCard
            milestone={m}
            isOwner={isOwner}
            ownerSlug={ownerSlug}
            authorAvatarUrl={authorAvatarUrl}
            authorName={authorName}
          />
          {idx === 0 && afterFirstSlot ? afterFirstSlot : null}
        </Fragment>
      ))}
    </section>
  );
}
