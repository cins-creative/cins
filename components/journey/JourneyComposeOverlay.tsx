"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { EditorInitial } from "@/components/editor/EditorView";
import type { MediaComposeMode } from "@/components/editor/MediaComposeView";
import type { CongDongComposeConfig } from "@/lib/cong-dong/types";
import type { OrgBaiDangComposeConfig } from "@/lib/truong/org-bai-dang-compose";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";
import type { ComposePublishedDetail } from "@/lib/journey/compose-published-sync";
import type {
  ComposeIntent,
  JourneyComposeState,
} from "@/lib/journey/compose-types";
import {
  buildMediaEditInitial,
  detectMediaPostKind,
  type MediaEditInitial,
} from "@/lib/journey/post-media";

const EditorViewLazy = dynamic(
  () =>
    import("@/components/editor/EditorView").then((mod) => ({
      default: mod.EditorView,
    })),
  {
    loading: () => <ComposeOverlaySkeleton label="Đang mở trình soạn bài viết…" />,
    ssr: false,
  },
);

const MediaComposeViewLazy = dynamic(
  () =>
    import("@/components/editor/MediaComposeView").then((mod) => ({
      default: mod.MediaComposeView,
    })),
  {
    loading: () => <ComposeOverlaySkeleton label="Đang mở trình đăng ảnh/video…" />,
    ssr: false,
  },
);

const MilestonePhraseComposerLazy = dynamic(
  () =>
    import("@/components/journey/MilestonePhraseComposer").then((mod) => ({
      default: mod.MilestonePhraseComposer,
    })),
  {
    loading: () => <ComposeOverlaySkeleton label="Đang mở trình cột mốc…" />,
    ssr: false,
  },
);

type Props = {
  compose: JourneyComposeState;
  ownerId: string;
  ownerSlug: string;
  ownerName: string;
  ownerAvatarId?: string | null;
  congDongCompose?: CongDongComposeConfig;
  orgBaiDangCompose?: OrgBaiDangComposeConfig;
  onClose: () => void;
  onPublished: (detail?: ComposePublishedDetail) => void;
};

export function JourneyComposeOverlay({
  compose,
  ownerId,
  ownerSlug,
  ownerName,
  ownerAvatarId,
  congDongCompose,
  orgBaiDangCompose,
  onClose,
  onPublished,
}: Props) {
  const [editInitial, setEditInitial] = useState<EditorInitial | null>(null);
  const [mediaEditInitial, setMediaEditInitial] =
    useState<MediaEditInitial | null>(null);
  const [mediaEditMode, setMediaEditMode] = useState<MediaComposeMode | null>(
    null,
  );
  const [editPostSlug, setEditPostSlug] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(compose.kind === "edit");
  const pendingPhotoFiles =
    compose.kind === "photo" ? compose.pendingFiles : undefined;
  const pendingVideoFile =
    compose.kind === "video" ? compose.pendingFile : undefined;

  const createEditorIntent = useMemo((): ComposeIntent | undefined => {
    if (compose.kind === "article") {
      return compose.intent ?? "full";
    }
    if (compose.kind === "photo") return "photo";
    if (compose.kind === "video") return "video";
    return undefined;
  }, [compose]);

  const isCreateEditor =
    compose.kind === "article" ||
    compose.kind === "photo" ||
    compose.kind === "video";

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (compose.kind !== "edit") {
      setEditInitial(null);
      setMediaEditInitial(null);
      setMediaEditMode(null);
      setEditPostSlug(null);
      setEditError(null);
      setEditLoading(false);
      return;
    }

    let cancelled = false;
    setEditLoading(true);
    setEditError(null);
    setEditInitial(null);
    setMediaEditInitial(null);
    setMediaEditMode(null);

    const loadEdit = orgBaiDangCompose
      ? truongInlineFetch(
          orgBaiDangCompose.orgId,
          `/bai-dang/${encodeURIComponent(compose.postSlug)}/edit`,
        ).then(async (res) => {
          if (!res.ok) {
            throw new Error(await readTruongInlineError(res));
          }
          return res.json() as Promise<{
            initial: EditorInitial;
            postSlug: string;
          }>;
        })
      : fetch(
          `/api/journey/${encodeURIComponent(ownerSlug)}/p/${encodeURIComponent(compose.postSlug)}/edit`,
        ).then(async (res) => {
          if (!res.ok) throw new Error("load failed");
          return res.json() as Promise<{
            initial: EditorInitial;
            postSlug: string;
          }>;
        });

    void loadEdit
      .then((data) => {
        if (cancelled) return;
        const mediaKind = detectMediaPostKind(data.initial.blocks);
        if (mediaKind === "photo" || mediaKind === "video") {
          setMediaEditInitial(
            buildMediaEditInitial({
              tacPhamId: data.initial.tacPhamId,
              cotMocId: data.initial.cotMocId,
              postSlug: data.postSlug,
              tieuDe: data.initial.tieuDe,
              visibility: data.initial.visibility,
              loaiMoc: data.initial.loaiMoc,
              thoiDiem: data.initial.thoiDiem,
              blocks: data.initial.blocks,
              kind: mediaKind,
              articleTags: data.initial.tags,
              personalFilterIds: data.initial.personalFilterIds,
              orgBaiDangLoai: data.initial.orgBaiDangLoai,
              orgBaiDangSchedulePublishAt:
                data.initial.orgBaiDangSchedulePublishAt,
            }),
          );
          setMediaEditMode(mediaKind);
          setEditInitial(null);
        } else {
          setEditInitial(data.initial);
          setMediaEditInitial(null);
          setMediaEditMode(null);
        }
        setEditPostSlug(data.postSlug);
        setEditLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setEditError("Không tải được bài viết để chỉnh sửa.");
        setEditLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [compose, ownerSlug, orgBaiDangCompose]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (typeof document === "undefined") return null;

  const ariaLabel =
    compose.kind === "edit"
      ? "Chỉnh sửa bài viết"
      : compose.kind === "photo"
        ? "Thêm ảnh"
        : compose.kind === "video"
          ? "Thêm video"
          : compose.kind === "milestone"
            ? "Thêm cột mốc"
            : compose.kind === "milestone-edit"
              ? "Chỉnh sửa yêu cầu cột mốc"
              : compose.intent === "minimal"
                ? "Đăng bài mới"
                : "Tạo bài viết";

  const isMediaSheet = mediaEditMode !== null;

  const isMilestoneSheet =
    compose.kind === "milestone" || compose.kind === "milestone-edit";

  return createPortal(
    <div
      className="j-compose-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={handleBackdrop}
    >
      <div
        className={`j-compose-sheet${isMediaSheet ? " j-compose-sheet--media" : ""}${isMilestoneSheet ? " j-compose-sheet--milestone" : ""}`}
      >
        {isCreateEditor ? (
          <EditorViewLazy
            ownerId={ownerId}
            ownerSlug={ownerSlug}
            ownerName={ownerName}
            presentation="overlay"
            composeIntent={createEditorIntent}
            initialPhotoFiles={pendingPhotoFiles}
            initialVideoFile={pendingVideoFile}
            congDongCompose={congDongCompose}
            orgBaiDangCompose={orgBaiDangCompose}
            onClose={onClose}
            onPublished={onPublished}
          />
        ) : null}

        {compose.kind === "milestone" || compose.kind === "milestone-edit" ? (
          <MilestonePhraseComposerLazy
            ownerSlug={ownerSlug}
            editCotMocId={
              compose.kind === "milestone-edit" ? compose.cotMocId : undefined
            }
            onClose={onClose}
            onPublished={onPublished}
          />
        ) : null}

        {compose.kind === "edit" ? (
          editLoading ? (
            <ComposeOverlaySkeleton label="Đang tải bài viết…" />
          ) : editError ? (
            <div className="j-compose-error">
              <p>{editError}</p>
              <button type="button" className="ed-btn ghost" onClick={onClose}>
                Đóng
              </button>
            </div>
          ) : mediaEditInitial && mediaEditMode ? (
            <MediaComposeViewLazy
              mode={mediaEditMode}
              ownerId={ownerId}
              ownerSlug={ownerSlug}
              ownerName={ownerName}
              ownerAvatarId={ownerAvatarId}
              editInitial={mediaEditInitial}
              presentation="overlay"
              congDongCompose={congDongCompose}
              orgBaiDangCompose={orgBaiDangCompose}
              onClose={onClose}
              onPublished={onPublished}
            />
          ) : editInitial && editPostSlug ? (
            <EditorViewLazy
              ownerId={ownerId}
              ownerSlug={ownerSlug}
              ownerName={ownerName}
              mode="edit"
              initial={editInitial}
              postSlug={editPostSlug}
              presentation="overlay"
              congDongCompose={congDongCompose}
              orgBaiDangCompose={orgBaiDangCompose}
              onClose={onClose}
              onPublished={onPublished}
            />
          ) : null
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function ComposeOverlaySkeleton({ label }: { label: string }) {
  return (
    <div className="j-compose-skeleton" aria-busy="true" aria-live="polite">
      <div className="j-compose-skeleton-bar" />
      <div className="j-compose-skeleton-body" />
      <p className="j-compose-skeleton-label">{label}</p>
    </div>
  );
}
