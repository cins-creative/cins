"use client";

import dynamic from "next/dynamic";
import {
  Component,
  useEffect,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import "@/app/[slug]/journey/journey.css";
import "@/app/[slug]/journey/image-grid.css";
import "@/app/[slug]/p/new/editor.css";

import type { EditorInitial } from "@/components/editor/EditorView";
import type { CongDongComposeConfig } from "@/lib/cong-dong/types";
import type { OrgBaiDangComposeConfig } from "@/lib/truong/org-bai-dang-compose";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";
import type { ComposePublishedDetail } from "@/lib/journey/compose-published-sync";
import type {
  ComposeIntent,
  JourneyComposeState,
} from "@/lib/journey/compose-types";
import {
  resolveEditComposeIntent,
  resolveEditEmbedComposeMeta,
} from "@/lib/journey/post-media";

const EditorViewLazy = dynamic(
  () =>
    import("@/components/editor/EditorView").then((mod) => ({
      default: mod.EditorView,
    })),
  {
    loading: () => (
      <ComposeOverlaySkeleton label="Đang mở trình soạn bài viết…" />
    ),
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

type LoadErrorBoundaryProps = {
  onClose: () => void;
  label: string;
  children: ReactNode;
};

type LoadErrorBoundaryState = { error: Error | null };

/** Bắt lỗi import/render EditorView — tránh kẹt skeleton vô hạn che cả app. */
class ComposeLoadErrorBoundary extends Component<
  LoadErrorBoundaryProps,
  LoadErrorBoundaryState
> {
  state: LoadErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): LoadErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[compose-overlay]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="j-compose-error">
          <p>
            Không mở được {this.props.label}. Thử lại hoặc đóng cửa sổ này.
          </p>
          <button
            type="button"
            className="ed-btn ghost"
            onClick={this.props.onClose}
          >
            Đóng
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function JourneyComposeOverlay({
  compose,
  ownerId,
  ownerSlug,
  ownerName,
  congDongCompose,
  orgBaiDangCompose,
  onClose,
  onPublished,
}: Props) {
  const [editInitial, setEditInitial] = useState<EditorInitial | null>(null);
  const [editPostSlug, setEditPostSlug] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(compose.kind === "edit");
  const pendingPhotoFiles =
    compose.kind === "photo" ? compose.pendingFiles : undefined;
  const pendingVideoFile =
    compose.kind === "video" ? compose.pendingFile : undefined;
  const embedPlatform =
    compose.kind === "embed" ? compose.platform : undefined;
  const fileSource =
    compose.kind === "embed"
      ? (compose.fileSource ?? compose.riveSource)
      : undefined;
  const pendingEmbedFile =
    compose.kind === "embed"
      ? (compose.pendingEmbedFile ?? compose.pendingRiveFile)
      : undefined;

  const createEditorIntent = useMemo((): ComposeIntent | undefined => {
    if (compose.kind === "article") {
      return compose.intent ?? "full";
    }
    if (compose.kind === "photo") return "photo";
    if (compose.kind === "video") return "video";
    if (compose.kind === "embed") return "embed";
    return undefined;
  }, [compose]);

  const editEmbedMeta = useMemo(() => {
    if (!editInitial) return null;
    return resolveEditEmbedComposeMeta(editInitial.blocks);
  }, [editInitial]);

  const editEditorIntent = useMemo((): ComposeIntent | undefined => {
    if (!editInitial) return undefined;
    return resolveEditComposeIntent(editInitial.blocks, editInitial.moTa);
  }, [editInitial]);

  const isCreateEditor =
    compose.kind === "article" ||
    compose.kind === "photo" ||
    compose.kind === "video" ||
    compose.kind === "embed";

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
      setEditPostSlug(null);
      setEditError(null);
      setEditLoading(false);
      return;
    }

    let cancelled = false;
    setEditLoading(true);
    setEditError(null);
    setEditInitial(null);

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
        setEditInitial(data.initial);
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

  if (typeof document === "undefined") return null;

  const ariaLabel =
    compose.kind === "edit"
      ? "Chỉnh sửa bài viết"
      : compose.kind === "photo"
        ? "Thêm ảnh"
        : compose.kind === "video"
          ? "Thêm video"
          : compose.kind === "embed"
            ? "Nhúng tác phẩm"
            : compose.kind === "milestone"
            ? "Thêm cột mốc"
            : compose.kind === "milestone-edit"
              ? "Chỉnh sửa yêu cầu cột mốc"
              : compose.intent === "minimal"
                ? "Đăng bài mới"
                : "Tạo bài viết";

  const isMilestoneSheet =
    compose.kind === "milestone" || compose.kind === "milestone-edit";

  return createPortal(
    <div
      className="j-compose-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`j-compose-sheet${isMilestoneSheet ? " j-compose-sheet--milestone" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {isCreateEditor ? (
          <ComposeLoadErrorBoundary onClose={onClose} label="trình soạn bài viết">
            <EditorViewLazy
              ownerId={ownerId}
              ownerSlug={ownerSlug}
              ownerName={ownerName}
              presentation="overlay"
              composeIntent={createEditorIntent}
              embedPlatform={embedPlatform}
              riveSource={fileSource}
              initialPhotoFiles={pendingPhotoFiles}
              initialVideoFile={pendingVideoFile}
              initialRiveFile={
                embedPlatform === "rive" ? pendingEmbedFile : undefined
              }
              initialLottieFile={
                embedPlatform === "lottie" ? pendingEmbedFile : undefined
              }
              congDongCompose={congDongCompose}
              orgBaiDangCompose={orgBaiDangCompose}
              onClose={onClose}
              onPublished={onPublished}
            />
          </ComposeLoadErrorBoundary>
        ) : null}

        {compose.kind === "milestone" || compose.kind === "milestone-edit" ? (
          <ComposeLoadErrorBoundary onClose={onClose} label="trình cột mốc">
            <MilestonePhraseComposerLazy
              ownerSlug={ownerSlug}
              editCotMocId={
                compose.kind === "milestone-edit" ? compose.cotMocId : undefined
              }
              onClose={onClose}
              onPublished={onPublished}
            />
          </ComposeLoadErrorBoundary>
        ) : null}

        {compose.kind === "edit" ? (
          editLoading ? (
            <ComposeOverlaySkeleton
              label="Đang tải bài viết…"
              onClose={onClose}
            />
          ) : editError ? (
            <div className="j-compose-error">
              <p>{editError}</p>
              <button type="button" className="ed-btn ghost" onClick={onClose}>
                Đóng
              </button>
            </div>
          ) : editInitial && editPostSlug ? (
            <ComposeLoadErrorBoundary
              onClose={onClose}
              label="trình soạn bài viết"
            >
              <EditorViewLazy
                ownerId={ownerId}
                ownerSlug={ownerSlug}
                ownerName={ownerName}
                mode="edit"
                initial={editInitial}
                postSlug={editPostSlug}
                presentation="overlay"
                composeIntent={editEditorIntent}
                embedPlatform={editEmbedMeta?.embedPlatform}
                riveSource={editEmbedMeta?.fileSource ?? editEmbedMeta?.riveSource}
                congDongCompose={congDongCompose}
                orgBaiDangCompose={orgBaiDangCompose}
                onClose={onClose}
                onPublished={onPublished}
              />
            </ComposeLoadErrorBoundary>
          ) : null
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function ComposeOverlaySkeleton({
  label,
  onClose,
}: {
  label: string;
  onClose?: () => void;
}) {
  return (
    <div className="j-compose-skeleton" aria-busy="true" aria-live="polite">
      <div className="j-compose-skeleton-bar" />
      <div className="j-compose-skeleton-body" />
      <p className="j-compose-skeleton-label">{label}</p>
      {onClose ? (
        <button type="button" className="ed-btn ghost" onClick={onClose}>
          Đóng
        </button>
      ) : null}
    </div>
  );
}
