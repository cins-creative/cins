"use client";

import { CinsFeedComposer } from "@/components/cins/CinsFeedComposer";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongOrgAvatar } from "@/components/truong/TruongOrgAvatar";
import type { TruongListItem } from "@/lib/truong/types";

type OrgOwner = Pick<
  TruongListItem,
  "avatar_id" | "logo_id" | "avatar_src" | "ten"
>;

type Props = {
  /** Fallback khi không có school trong inline-edit context. */
  owner?: OrgOwner | null;
};

/** Composer tab bài đăng org — cùng UX user, không có cột mốc. */
export function OrgBaiDangCreateComposer({ owner = null }: Props) {
  const ctx = useTruongInlineEdit();
  const school = ctx?.school ?? owner;

  return (
    <CinsFeedComposer
      layout="journey"
      showMilestone={false}
      placeholder="Đăng bài mới cho tổ chức…"
      avatar={
        school ? (
          <TruongOrgAvatar
            school={school}
            size="sm"
            className="org-chip-avatar"
          />
        ) : undefined
      }
    />
  );
}
