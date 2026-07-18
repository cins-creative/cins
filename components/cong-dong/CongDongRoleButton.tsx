"use client";

import { PenSquare, Share2, UserPlus } from "lucide-react";
import {
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";

import { useCongDongAuthGate } from "@/components/cong-dong/useCongDongAuthGate";
import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import { JourneyProfileShareModal } from "@/components/journey/JourneyProfileShareModal";
import { dispatchJourneyShareOpen } from "@/lib/journey/gallery-filter-share";
import type { JourneyShareMenuStep } from "@/lib/journey/profile-share";
import {
  buildOrgShareBundle,
  type OrgShareSource,
} from "@/lib/org/org-profile-share";
import {
  roleButtonLabel,
  type CongDongVaiTro,
} from "@/lib/cong-dong/vai-tro";
import {
  congDongJoinMode,
  type CongDongCheDo,
} from "@/lib/cong-dong/constants";

type Props = {
  orgId: string;
  cheDo: CongDongCheDo;
  shareSource: OrgShareSource;
  isThanhVien: boolean;
  joinPending?: boolean;
  viewerVaiTro: CongDongVaiTro | null;
  /** Quyền admin CINs — không hiện CTA join (quản trị ở topbar). */
  isCinsAdmin?: boolean;
  /** CINS system owner — ẩn CTA membership; vai trò/cài đặt ở topbar. */
  hideForOwner: boolean;
  onJoined: (vaiTro: CongDongVaiTro) => void;
  onJoinPending?: () => void;
  onLeft: () => void;
};

/**
 * Sidebar CTA: khách = tham gia / chờ duyệt + chia sẻ;
 * thành viên = đăng bài + mời bạn + chia sẻ.
 * Vai trò + cài đặt → `CongDongTopbarToolbar` (app topbar).
 */
export function CongDongRoleButton({
  orgId,
  cheDo,
  shareSource,
  isThanhVien,
  joinPending = false,
  viewerVaiTro,
  isCinsAdmin = false,
  hideForOwner,
  onJoined,
  onJoinPending,
  onLeft,
}: Props) {
  const { requireCongDongAuth } = useCongDongAuthGate();
  const { openCompose, canCompose } = useJourneyCompose();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStep, setShareStep] = useState<JourneyShareMenuStep>("menu");
  const [joinBusy, startJoin] = useTransition();
  const [leavePending, startLeave] = useTransition();

  const { profile: shareProfile, orgShare } = useMemo(
    () => buildOrgShareBundle("cong_dong", shareSource),
    [shareSource],
  );

  const joinMode = congDongJoinMode(cheDo);

  const isMemberChrome =
    (hideForOwner && viewerVaiTro === "owner") ||
    (isThanhVien && Boolean(viewerVaiTro)) ||
    isCinsAdmin;

  const showMemberActions = isThanhVien && Boolean(viewerVaiTro);

  const join = useCallback(() => {
    requireCongDongAuth(() => {
      startJoin(async () => {
        const res = await fetch(`/api/cong-dong/${orgId}/tham-gia`, {
          method: "POST",
        });
        const json = (await res.json().catch(() => null)) as {
          viewerVaiTro?: CongDongVaiTro | null;
          isThanhVien?: boolean;
          joinPending?: boolean;
          error?: string;
        } | null;
        if (!res.ok) return;
        if (json?.joinPending) {
          onJoinPending?.();
          return;
        }
        if (json?.isThanhVien !== false) {
          onJoined(json?.viewerVaiTro ?? "thanh_vien");
        }
      });
    });
  }, [orgId, onJoined, onJoinPending, requireCongDongAuth]);

  const cancelPending = useCallback(() => {
    startLeave(async () => {
      const res = await fetch(`/api/cong-dong/${orgId}/tham-gia`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      onLeft();
    });
  }, [orgId, onLeft]);

  const openShare = useCallback((step: JourneyShareMenuStep = "menu") => {
    dispatchJourneyShareOpen();
    setShareStep(step);
    setShareOpen(true);
  }, []);

  const openInvite = useCallback(() => {
    requireCongDongAuth(() => openShare("invite-friends"));
  }, [openShare, requireCongDongAuth]);

  const startPost = useCallback(() => {
    openCompose({ kind: "article", intent: "minimal" });
  }, [openCompose]);

  const shareModal = (
    <JourneyProfileShareModal
      open={shareOpen}
      onClose={() => setShareOpen(false)}
      profile={shareProfile}
      orgShare={orgShare}
      presentation="modal"
      initialStep={shareStep}
      requireAuth={(then) => {
        requireCongDongAuth(then);
      }}
    />
  );

  const shareButton = (
    <button
      type="button"
      className="cd-v4-btn cd-v4-btn--ghost cd-v4-btn--icon"
      title="Chia sẻ"
      aria-label="Chia sẻ"
      aria-expanded={shareOpen && shareStep === "menu"}
      aria-haspopup="dialog"
      onClick={() => openShare("menu")}
    >
      <Share2 size={16} strokeWidth={2} aria-hidden />
    </button>
  );

  const inviteButton = (
    <button
      type="button"
      className="cd-v4-btn cd-v4-btn--ghost cd-v4-btn--icon"
      title="Mời bạn"
      aria-label="Mời bạn"
      aria-expanded={shareOpen && shareStep === "invite-friends"}
      aria-haspopup="dialog"
      onClick={openInvite}
    >
      <UserPlus size={16} strokeWidth={2} aria-hidden />
    </button>
  );

  const postButton = canCompose ? (
    <button
      type="button"
      className="cd-v4-btn cd-v4-btn--primary cd-v4-btn--grow"
      onClick={startPost}
    >
      <PenSquare size={15} strokeWidth={2} aria-hidden />
      Đăng bài
    </button>
  ) : null;

  if (showMemberActions) {
    return (
      <>
        <div className="cd-v4-id-actions">
          {postButton}
          {inviteButton}
          {shareButton}
        </div>
        {shareModal}
      </>
    );
  }

  /* CINs admin / system owner chưa là member: chỉ chia sẻ. */
  if (isMemberChrome) {
    return (
      <>
        <div className="cd-v4-id-actions">{shareButton}</div>
        {shareModal}
      </>
    );
  }

  return (
    <>
      <div className="cd-v4-id-actions">
        {joinPending ? (
          <div className="cd-v4-role-wrap cd-v4-role-wrap--grow">
            <button
              type="button"
              className="cd-v4-btn cd-v4-btn--ghost cd-v4-btn--grow"
              disabled
            >
              Đang chờ duyệt
            </button>
            <button
              type="button"
              className="cd-v4-btn cd-v4-btn--ghost"
              onClick={cancelPending}
              disabled={leavePending}
            >
              {leavePending ? "Đang huỷ…" : "Huỷ"}
            </button>
          </div>
        ) : joinMode === "invite_only" ? (
          <button
            type="button"
            className="cd-v4-btn cd-v4-btn--ghost cd-v4-btn--grow"
            disabled
          >
            Chỉ vào qua lời mời
          </button>
        ) : (
          <button
            type="button"
            className="cd-v4-btn cd-v4-btn--primary cd-v4-btn--grow"
            onClick={join}
            disabled={joinBusy}
          >
            {joinBusy
              ? joinMode === "request"
                ? "Đang gửi…"
                : "Đang tham gia…"
              : joinMode === "request"
                ? "Xin tham gia"
                : roleButtonLabel(null)}
          </button>
        )}

        {shareButton}
      </div>
      {shareModal}
    </>
  );
}
