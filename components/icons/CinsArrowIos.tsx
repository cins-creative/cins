import { ChevronRight, type LucideProps } from "lucide-react";

/**
 * Chevron «Arrow Forward iOS» — affordance điều hướng / «xem thêm».
 * Dùng thay Lucide `ArrowRight` (có thân mũi tên) trên toàn UI CINs.
 */
export function CinsArrowIos({
  strokeWidth = 2.5,
  absoluteStrokeWidth,
  ...props
}: LucideProps) {
  return (
    <ChevronRight
      strokeWidth={strokeWidth}
      absoluteStrokeWidth={absoluteStrokeWidth}
      {...props}
    />
  );
}
