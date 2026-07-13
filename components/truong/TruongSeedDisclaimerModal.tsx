"use client";

import { BadgeCheck, MessageCircle, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { useCinsChatContext } from "@/components/cins/CinsChatProvider";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  CINS_OFFICIAL_DISPLAY_NAME,
  getCinsOfficialJourneyHref,
  getCinsOfficialSlug,
  getCinsOfficialUserId,
} from "@/lib/truong/cins-official";

const TITLE_ID = "truong-seed-disclaimer-title";
const AUTH_MESSAGE =
  "Đăng nhập để nhắn tin CINs Official và yêu cầu bàn giao trang trường.";

type Props = {
  /** Nhãn nút mở popup — mặc định copy micro bên cạnh avatar. */
  triggerLabel?: string;
};

/** Minh họa thu nhỏ header trang trường đã có huy hiệu xác thực. */
function VerifiedPageExample() {
  return (
    <figure className="truong-ss-seed-example" aria-label="Ví dụ trang đã xác thực">
      <div className="truong-ss-seed-example-frame" aria-hidden>
        <div className="truong-ss-seed-example-cover" />
        <div className="truong-ss-seed-example-row">
          <div className="truong-ss-seed-example-ava">ĐH</div>
          <div className="truong-ss-seed-example-meta">
            <div className="truong-ss-seed-example-name">
              Đại học ABC
              <span className="truong-ss-seed-example-badge" title="Đã xác thực">
                <BadgeCheck size={15} strokeWidth={2.4} aria-hidden />
              </span>
            </div>
            <div className="truong-ss-seed-example-pills">
              <span>Trường ĐH</span>
              <span>Công lập</span>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="truong-ss-seed-example-cap">
        Ví dụ: trang đã xác thực — huy hiệu xanh cạnh tên trường
      </figcaption>
    </figure>
  );
}

/**
 * Dòng chữ nhỏ + popup giải thích trang trường seed (chưa verified_official).
 * CTA mở chat trực tiếp với tài khoản CINs Official.
 */
export function TruongSeedDisclaimerModal({
  triggerLabel = "Trang do CINs vận hành",
}: Props) {
  const [open, setOpen] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, openAuthModal } = useAuthGate();
  const chat = useCinsChatContext();

  const officialHref = getCinsOfficialJourneyHref();
  const officialSlug = getCinsOfficialSlug();
  const officialUserId = getCinsOfficialUserId();

  async function openOfficialChat() {
    setError(null);
    if (!isAuthenticated) {
      openAuthModal(AUTH_MESSAGE);
      return;
    }
    if (!chat || messaging) return;

    setMessaging(true);
    try {
      await chat.openChat({
        targetUserId: officialUserId,
        peerPreview: {
          name: CINS_OFFICIAL_DISPLAY_NAME,
          slug: officialSlug,
          role: "CINs Official",
          avatarInitial: "C",
        },
      });
      setOpen(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Không mở được hội thoại.",
      );
    } finally {
      setMessaging(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="truong-ss-seed-hint"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {triggerLabel}
      </button>

      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className="truong-ss-seed-modal"
        labelledBy={TITLE_ID}
        closeOnBackdrop
        showClose={false}
      >
        <header className="truong-ss-seed-modal-head">
          <div className="truong-ss-seed-modal-head-top">
            <span className="truong-ss-seed-status">
              <ShieldAlert size={13} strokeWidth={2.2} aria-hidden />
              Chưa xác thực
            </span>
            <button
              type="button"
              className="truong-ss-seed-modal-x"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
            >
              <X size={16} strokeWidth={2.2} aria-hidden />
            </button>
          </div>
          <h2 id={TITLE_ID} className="truong-ss-seed-modal-title">
            Trang trường này do CINs vận hành tạm thời
          </h2>
          <p className="truong-ss-seed-modal-lead">
            Không phải trang chính thức do trường quản lý — xem rõ bên dưới để
            tránh hiểu nhầm.
          </p>
        </header>

        <div className="truong-ss-seed-modal-body">
          <VerifiedPageExample />

          <ol className="truong-ss-seed-points">
            <li>
              <strong>Seeding mô hình.</strong> CINs dựng sẵn trang để mọi người
              thấy cách nền tảng vận hành thật: ngành, thông tin công khai, tương
              tác tổ chức. Mục đích là giúp học sinh / phụ huynh / người làm nghề
              tìm hiểu trường sáng tạo trên CINs sớm, đồng thời có khung sẵn để
              trường nhận bàn giao và tự vận hành khi sẵn sàng — không phải để
              CINs thay thế vai trò của trường lâu dài.
            </li>
            <li>
              <strong>Nguồn tham khảo.</strong> Nội dung được tổng hợp từ nguồn
              công khai của trường, CINs cam kết không thêm bớt nội dung gây tổn
              hại đến trường, không thay mặt trường đưa cam kết tuyển sinh hay
              pháp lý.
            </li>
            <li>
              <strong>Huy hiệu xác thực.</strong> Khi trường nhận bàn giao, tên
              trường sẽ có huy hiệu xanh như ví dụ trên — nghĩa là trường (hoặc
              đơn vị được ủy quyền) đang chủ động vận hành trang.
            </li>
            <li>
              <strong>Bàn giao.</strong> Nhắn{" "}
              <Link
                href={officialHref}
                className="truong-ss-seed-modal-link"
                onClick={() => setOpen(false)}
              >
                @{officialSlug}
              </Link>{" "}
              ({CINS_OFFICIAL_DISPLAY_NAME}) để được hướng dẫn và nhận quyền vận
              hành.
            </li>
          </ol>

          {error ? (
            <p className="truong-ss-seed-modal-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="truong-ss-seed-modal-foot">
          <button
            type="button"
            className="truong-ss-seed-btn-primary"
            disabled={messaging || !chat}
            onClick={() => void openOfficialChat()}
          >
            <MessageCircle size={16} strokeWidth={2.2} aria-hidden />
            {messaging ? "Đang mở…" : "Nhắn tin CINs Official"}
          </button>
          <button
            type="button"
            className="truong-ss-seed-btn-ghost"
            onClick={() => setOpen(false)}
          >
            Đã hiểu
          </button>
        </footer>
      </TruongInlineModal>
    </>
  );
}
