"use client";

import type { ReactNode } from "react";

import { NganhAdminToolbar } from "@/components/nganh/inline/NganhAdminToolbar";
import {
  NganhInlineEditProvider,
  useNganhInlineEdit,
} from "@/components/nganh/inline/NganhInlineEditContext";
import { NganhChiTietView } from "@/components/nganh/NganhChiTietView";
import type { NganhDetailBundle } from "@/lib/nganh/queries";
import type { CongDongOrgCategoryPreview } from "@/lib/cong-dong/categories";

type Props = Pick<
  NganhDetailBundle,
  | "article"
  | "parsed"
  | "monHoc"
  | "nghe"
  | "truong"
  | "khoiThiLabels"
  | "lienQuan"
  | "soTruong"
> & {
  canEdit: boolean;
  persistEnabled: boolean;
  congDong: CongDongOrgCategoryPreview[];
};

export function NganhChiTietPageShell({
  canEdit,
  persistEnabled,
  article,
  ...rest
}: Props) {
  const resetKey = `${article.id}-${article.cap_nhat_luc}`;

  return (
    <NganhInlineEditProvider
      article={article}
      canEdit={canEdit}
      persistEnabled={persistEnabled}
      resetKey={resetKey}
      initialMonHoc={rest.monHoc}
      initialTruong={rest.truong}
      initialCompareItems={rest.parsed.compareItems}
    >
      <NganhPageRoot canEdit={canEdit}>
        <div className="nct-admin-toolbar-host">
          <NganhAdminToolbar />
        </div>
        <NganhChiTietView article={article} {...rest} />
      </NganhPageRoot>
    </NganhInlineEditProvider>
  );
}

function NganhPageRoot({
  canEdit,
  children,
}: {
  canEdit: boolean;
  children: ReactNode;
}) {
  const ctx = useNganhInlineEdit();
  const editing = Boolean(ctx?.isEditing);
  const className = [
    "nct-page",
    canEdit ? "nct-page--can-edit" : "",
    editing ? "nct-page--editing" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className} data-can-edit={canEdit ? "1" : undefined}>
      {children}
    </div>
  );
}
