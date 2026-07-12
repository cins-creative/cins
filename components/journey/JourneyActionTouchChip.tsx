"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useMemo, useState } from "react";

import {
  JourneyActionTouchSheet,
  type JourneyActionSheetItem,
} from "@/components/journey/JourneyActionTouchSheet";
import { useLongPress } from "@/lib/ui/use-long-press";

import "./journey-action-touch.css";

type Props = {
  className: string;
  ariaLabel: string;
  ariaPressed?: boolean;
  disabled?: boolean;
  onPress: () => void;
  /**
   * Giữ lâu — ưu tiên hơn sheet. Dùng để mở thẳng danh sách người
   * thích / bình luận / lưu (không qua bước chọn).
   */
  onLongPress?: () => void;
  /** Gợi ý trong aria khi có long-press (vd. "Giữ để xem người thích"). */
  longPressHint?: string;
  sheetTitle?: string;
  sheetItems?: JourneyActionSheetItem[];
  children: ReactNode;
  buttonProps?: Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "type" | "className" | "aria-label" | "disabled" | "onClick"
  > & {
    [key: `data-${string}`]: string | boolean | undefined;
  };
};

/** Nút hành động mobile — tap ngắn = hành động chính; giữ = long-press hoặc sheet phụ. */
export function JourneyActionTouchChip({
  className,
  ariaLabel,
  ariaPressed,
  disabled = false,
  onPress,
  onLongPress,
  longPressHint,
  sheetTitle,
  sheetItems = [],
  children,
  buttonProps,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const useSheet = !onLongPress && sheetItems.length > 0;
  const canLongPress = Boolean(onLongPress) || useSheet;

  const longPress = useLongPress({
    disabled: disabled || !canLongPress,
    onLongPress: () => {
      if (onLongPress) {
        onLongPress();
        return;
      }
      setSheetOpen(true);
    },
    onPress,
  });

  const items = useMemo(
    () =>
      sheetItems.map((item) => ({
        ...item,
        onSelect: item.onSelect,
      })),
    [sheetItems],
  );

  const resolvedAria = canLongPress
    ? `${ariaLabel}. ${longPressHint ?? "Giữ để xem thêm tùy chọn"}`
    : ariaLabel;

  return (
    <>
      <button
        type="button"
        className={`${className} action-btn--touch`}
        aria-label={resolvedAria}
        aria-pressed={ariaPressed}
        disabled={disabled}
        {...buttonProps}
        {...(canLongPress ? longPress : { onClick: () => onPress() })}
      >
        {children}
      </button>
      {useSheet ? (
        <JourneyActionTouchSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={sheetTitle}
          items={items}
        />
      ) : null}
    </>
  );
}
