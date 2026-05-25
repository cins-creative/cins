"use client";

import type { ReactNode } from "react";

export function SwInlineField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="nct-inline-field">
      <span className="nct-inline-field-label">{label}</span>
      {children}
    </label>
  );
}
