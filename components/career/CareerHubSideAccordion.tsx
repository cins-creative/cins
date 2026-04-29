"use client";

import { useState, type ReactNode } from "react";

type Props = {
  heading: string;
  /** Mở sẵn khi nhóm chứa lĩnh vực đang chọn */
  defaultOpen: boolean;
  children: ReactNode;
};

export function CareerHubSideAccordion({
  heading,
  defaultOpen,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className="career-hub-side-details"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="career-hub-side-group-title">{heading}</summary>
      <div className="career-hub-side-details-body">
        <div className="career-hub-side-details-inner">{children}</div>
      </div>
    </details>
  );
}
