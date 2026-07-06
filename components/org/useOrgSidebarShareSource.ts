"use client";

import { useMemo } from "react";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { OrgShareSource } from "@/lib/org/org-profile-share";
import type { TruongListItem } from "@/lib/truong/types";

type SchoolFields = Pick<
  TruongListItem,
  | "slug"
  | "ten"
  | "mo_ta"
  | "avatar_id"
  | "logo_id"
  | "avatar_src"
  | "cover_id"
  | "cover_src"
  | "tinh_thanh"
>;

export function useOrgSidebarShareSource(
  school: SchoolFields,
  extras?: Pick<OrgShareSource, "galleryThumbs" | "stats">,
): OrgShareSource {
  const ctx = useTruongInlineEdit();

  return useMemo(
    () => ({
      slug: school.slug,
      ten: school.ten,
      mo_ta: school.mo_ta,
      avatar_id: school.avatar_id,
      logo_id: school.logo_id,
      avatar_src: school.avatar_src,
      cover_id: school.cover_id,
      cover_src: school.cover_src,
      tinh_thanh: school.tinh_thanh,
      avatarPreviewUrl: ctx?.avatarDraft?.previewUrl ?? null,
      coverPreviewUrl: ctx?.coverDraft?.previewUrl ?? null,
      galleryThumbs: extras?.galleryThumbs,
      stats: extras?.stats,
    }),
    [
      school.slug,
      school.ten,
      school.mo_ta,
      school.avatar_id,
      school.logo_id,
      school.avatar_src,
      school.cover_id,
      school.cover_src,
      school.tinh_thanh,
      ctx?.avatarDraft?.previewUrl,
      ctx?.coverDraft?.previewUrl,
      extras?.galleryThumbs,
      extras?.stats,
    ],
  );
}

/** Studio owner — map camelCase sang OrgShareSource. */
export function useStudioOrgShareSource(
  studio: {
    slug: string;
    ten: string;
    moTa?: string | null;
    avatar_id?: string | null;
    logo_id?: string | null;
    avatar_src?: string | null;
    cover_id?: string | null;
    cover_src?: string | null;
    tinhThanh?: string | null;
  },
  extras?: Pick<OrgShareSource, "galleryThumbs" | "stats">,
): OrgShareSource {
  const ctx = useTruongInlineEdit();

  return useMemo(
    () => ({
      slug: studio.slug,
      ten: studio.ten,
      moTa: studio.moTa,
      avatar_id: studio.avatar_id,
      logo_id: studio.logo_id,
      avatar_src: studio.avatar_src,
      cover_id: studio.cover_id,
      cover_src: studio.cover_src,
      tinhThanh: studio.tinhThanh,
      avatarPreviewUrl: ctx?.avatarDraft?.previewUrl ?? null,
      coverPreviewUrl: ctx?.coverDraft?.previewUrl ?? null,
      galleryThumbs: extras?.galleryThumbs,
      stats: extras?.stats,
    }),
    [
      studio.slug,
      studio.ten,
      studio.moTa,
      studio.avatar_id,
      studio.logo_id,
      studio.avatar_src,
      studio.cover_id,
      studio.cover_src,
      studio.tinhThanh,
      ctx?.avatarDraft?.previewUrl,
      ctx?.coverDraft?.previewUrl,
      extras?.galleryThumbs,
      extras?.stats,
    ],
  );
}
