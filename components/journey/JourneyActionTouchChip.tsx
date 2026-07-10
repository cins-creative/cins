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
  sheetTitle?: string;
  sheetItems: JourneyActionSheetItem[];
  children: ReactNode;
  buttonProps?: Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "type" | "className" | "aria-label" | "disabled" | "onClick"
  >;
};

/** Nút hành động mobile — tap ngắn = hành động chính; giữ = sheet phụ. */
export function JourneyActionTouchChip({
  className,
  ariaLabel,
  ariaPressed,
  disabled = false,
  onPress,
  sheetTitle,
  sheetItems,
  children,
  buttonProps,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const canLongPress = sheetItems.length > 0;

  const longPress = useLongPress({
    disabled: disabled || !canLongPress,
    onLongPress: () => setSheetOpen(true),
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

  return (
    <>
      <button
        type="button"
        className={`${className} action-btn--touch`}
        aria-label={
          canLongPress ? `${ariaLabel}. Giữ để xem thêm tùy chọn` : ariaLabel
        }
        aria-pressed={ariaPressed}
        disabled={disabled}
        {...buttonProps}
        {...(canLongPress ? longPress : { onClick: () => onPress() })}
      >
        {children}
      </button>
      {canLongPress ? (
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
