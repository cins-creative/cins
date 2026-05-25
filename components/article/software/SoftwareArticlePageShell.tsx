"use client";

import { SoftwareAdminToolbar } from "@/components/article/software/inline/SoftwareAdminToolbar";
import {
  SoftwareInlineEditProvider,
  useSoftwareInlineEdit,
} from "@/components/article/software/inline/SoftwareInlineEditContext";
import type { ArticleBaiViet } from "@/lib/articles/types";
import type { ReactNode } from "react";

type Props = {
  canEdit: boolean;
  persistEnabled: boolean;
  article: ArticleBaiViet;
  resetKey: string;
  children: ReactNode;
};

export function SoftwareArticlePageShell({
  canEdit,
  persistEnabled,
  article,
  resetKey,
  children,
}: Props) {
  return (
    <SoftwareInlineEditProvider
      article={article}
      canEdit={canEdit}
      persistEnabled={persistEnabled}
      resetKey={resetKey}
    >
      <SoftwarePageRoot canEdit={canEdit}>
        <div className="sw-admin-toolbar-host">
          <SoftwareAdminToolbar />
        </div>
        {children}
      </SoftwarePageRoot>
    </SoftwareInlineEditProvider>
  );
}

function SoftwarePageRoot({
  canEdit,
  children,
}: {
  canEdit: boolean;
  children: ReactNode;
}) {
  const ctx = useSoftwareInlineEdit();
  const editing = Boolean(ctx?.isEditing);
  const className = [
    "sw-page",
    canEdit ? "sw-page--can-edit" : "",
    editing ? "sw-page--editing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} data-can-edit={canEdit ? "1" : undefined}>
      {children}
    </div>
  );
}
