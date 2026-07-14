"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { OrgBaiDangJourneyCard } from "@/components/truong/OrgBaiDangJourneyCard";
import { coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import type { TruongBaiDang, TruongListItem } from "@/lib/truong/types";

type Props = {
  post: TruongBaiDang;
  school: Pick<
    TruongListItem,
    "avatar_id" | "logo_id" | "avatar_src" | "ten" | "slug"
  >;
  orgSlug: string;
  backHref?: string;
};

export function OrgBaiDangPostDetailView({
  post,
  school,
  orgSlug,
  backHref,
}: Props) {
  const router = useRouter();
  const listHref = backHref ?? coSoTabPath(orgSlug, "bai-dang");

  return (
    <div className="org-baidang-post-detail">
      <button
        type="button"
        className="org-baidang-post-page-back"
        onClick={() => router.push(listHref)}
      >
        <ArrowLeft size={18} strokeWidth={2.2} aria-hidden />
        Bài đăng
      </button>

      <div className="tdh-org-baidang-timeline org-baidang-post-detail-feed">
        <OrgBaiDangJourneyCard
          post={post}
          owner={school}
          initialExpanded
        />
      </div>
    </div>
  );
}
