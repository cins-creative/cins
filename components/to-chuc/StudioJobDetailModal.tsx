"use client";

import {
  Briefcase,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  Gift,
  ListChecks,
  MapPin,
  MessageCircle,
  Pencil,
  SendHorizonal,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { useCinsChatContext } from "@/components/cins/CinsChatProvider";
import { JourneyBookmarkButton } from "@/components/journey/JourneyBookmarkButton";
import { StudioJobApplicantsPanel } from "@/components/to-chuc/StudioJobApplicantsPanel";
import { StudioJobApplyForm } from "@/components/to-chuc/StudioJobApplyForm";
import { StudioPerkList } from "@/components/to-chuc/StudioPerkList";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  capDoLabels,
  giaiDoanMucTieuLabels,
} from "@/lib/to-chuc/studio-tuyen-dung-distribution";
import {
  formatStudioDeadline,
  formatStudioSalary,
  studioJobPlace,
} from "@/lib/to-chuc/studio-tuyen-dung-format";
import {
  STUDIO_JOB_LOAI_HINH_LABEL,
  STUDIO_JOB_STATUS_LABEL,
  type StudioJob,
} from "@/lib/to-chuc/studio-tuyen-dung-types";

const AUTH_MESSAGE = "Đăng nhập để ứng tuyển vị trí này trên CINs.";
const AUTH_MESSAGE_CHAT = "Đăng nhập để nhắn tin cho tổ chức trên CINs.";
const RELATED_LIMIT = 4;

type Props = {
  job: StudioJob;
  orgId: string;
  orgTen: string;
  canEdit: boolean;
  viewerLoggedIn: boolean;
  onClose: () => void;
  /** Bấm "Sửa tin" (chỉ admin) — đóng chi tiết & mở modal chỉnh sửa. */
  onEdit?: (job: StudioJob) => void;
  /** Các tin tuyển khác của studio (đã lọc bỏ tin hiện tại) — gợi ý ở cuối. */
  relatedJobs?: StudioJob[];
  /** Mở chi tiết một tin gợi ý khác. */
  onOpenJob?: (job: StudioJob) => void;
  /** URL sâu tới tin — dùng cho card ngữ cảnh khi nhắn tin. */
  jobHref?: string;
  /** Avatar org — hiển thị optimistic khi mở chat. */
  orgAvatarUrl?: string | null;
};

export function StudioJobDetailModal({
  job,
  orgId,
  orgTen,
  canEdit,
  viewerLoggedIn,
  onClose,
  onEdit,
  relatedJobs = [],
  onOpenJob,
  jobHref,
  orgAvatarUrl,
}: Props) {
  const { openAuthModal } = useAuthGate();
  const chat = useCinsChatContext();
  const [applying, setApplying] = useState(false);
  const [viewingApplicants, setViewingApplicants] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const salary = formatStudioSalary(job);
  const deadline = formatStudioDeadline(job.hanNop);
  const isOpen = job.trangThai === "dang_mo";
  const titleId = `studio-job-detail-${job.id}`;

  // Ưu tiên tin cùng lĩnh vực, rồi tới các tin còn lại.
  const related = [...relatedJobs]
    .sort((a, b) => {
      const sameA = a.idLinhVuc && a.idLinhVuc === job.idLinhVuc ? 0 : 1;
      const sameB = b.idLinhVuc && b.idLinhVuc === job.idLinhVuc ? 0 : 1;
      return sameA - sameB;
    })
    .slice(0, RELATED_LIMIT);

  function handleApply() {
    if (!viewerLoggedIn) {
      openAuthModal(AUTH_MESSAGE);
      return;
    }
    setApplying(true);
  }

  async function handleMessage() {
    if (!viewerLoggedIn) {
      openAuthModal(AUTH_MESSAGE_CHAT);
      return;
    }
    if (!chat || messaging) return;
    setMessaging(true);
    // Mở bảng chat (overlay mở ngay, đồng bộ) rồi ĐÓNG modal tuyển dụng liền —
    // tránh 2 bảng chồng nhau / bảng chat bị che phía sau.
    const opening = chat.openChat({
      orgId,
      orgPreview: { name: orgTen, avatarUrl: orgAvatarUrl ?? null },
      nguCanh: {
        loai: "tuyen_dung",
        id: job.id,
        tieuDe: job.tieuDe,
        moTa: job.moTaNgan?.trim() || job.moTa?.trim() || null,
        href: jobHref ?? null,
        orgTen,
      },
    });
    onClose();
    try {
      await opening;
    } catch {
      /* provider tự xử lý lỗi mở hội thoại */
    }
  }

  return (
    <TruongInlineModal
      open
      onClose={onClose}
      className="tdh-inline-modal--wide studio-job-detail-modal"
      labelledBy={titleId}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="studio-job-detail-head">
        <div className="studio-job-detail-head-main">
          <h3 id={titleId} className="tdh-inline-modal-title studio-job-detail-title">
            {job.tieuDe}
          </h3>
          <p className="studio-job-detail-org">
            <Briefcase size={14} strokeWidth={2.2} aria-hidden />
            {orgTen}
          </p>
        </div>
        {canEdit && onEdit ? (
          <button
            type="button"
            className="studio-job-detail-edit"
            onClick={() => onEdit(job)}
          >
            <Pencil size={14} strokeWidth={2.2} aria-hidden />
            Sửa tin
          </button>
        ) : null}

        <div className="studio-job-card-chips studio-job-detail-chips">
          <span className="studio-job-chip">
            {STUDIO_JOB_LOAI_HINH_LABEL[job.loaiHinh]}
          </span>
          <span className="studio-job-chip">
            <MapPin size={12} strokeWidth={2} aria-hidden />
            {studioJobPlace(job)}
          </span>
          {job.linhVucTen ? (
            <span className="studio-job-chip">{job.linhVucTen}</span>
          ) : null}
          {capDoLabels(job.capDo).map((cd) => (
            <span key={cd} className="studio-job-chip">
              {cd}
            </span>
          ))}
          {canEdit && !isOpen ? (
            <span className="studio-job-chip studio-job-chip--status">
              {STUDIO_JOB_STATUS_LABEL[job.trangThai]}
            </span>
          ) : null}
        </div>
      </header>

      {/* ── Mức lương — khối riêng, nổi bật (thông tin quan trọng nhất) ── */}
      {salary ? (
        <div className="studio-job-detail-salary">
          <span className="studio-job-detail-salary-ic" aria-hidden>
            <CircleDollarSign size={22} strokeWidth={2} />
          </span>
          <span className="studio-job-detail-salary-body">
            <span className="studio-job-detail-salary-label">Mức lương</span>
            <span className="studio-job-detail-salary-value">{salary}</span>
          </span>
        </div>
      ) : null}

      {/* ── Thông tin nhanh: hạn nộp · số lượng ─────────────────── */}
      {deadline || job.soLuong ? (
        <div className="studio-job-card-meta studio-job-detail-meta">
          {deadline ? (
            <span className="studio-job-meta-item">
              <CalendarClock size={14} strokeWidth={2} aria-hidden />
              {deadline}
            </span>
          ) : null}
          {job.soLuong ? (
            <span className="studio-job-meta-item">
              <Users size={14} strokeWidth={2} aria-hidden />
              Cần tuyển {job.soLuong}
            </span>
          ) : null}
        </div>
      ) : null}

      {job.diaChi?.trim() ? (
        <p className="studio-job-detail-address">
          <MapPin size={14} strokeWidth={2} aria-hidden />
          {job.diaChi.trim()}
        </p>
      ) : null}

      {job.moTaNgan?.trim() ? (
        <p className="studio-job-detail-lead">{job.moTaNgan.trim()}</p>
      ) : null}

      {job.ngheSlug ? (
        <Link
          href={`/huong-nghiep/nghe/${job.ngheSlug}`}
          className="studio-job-detail-nghe-link"
        >
          <ExternalLink size={12} strokeWidth={2.2} aria-hidden />
          Xem trang nghề: {job.ngheTieuDe ?? job.tieuDe}
        </Link>
      ) : null}

      {/* ── Quyền lợi & phúc lợi — khối đóng khung, highlight ────── */}
      {job.phucLoi.length ? (
        <section className="studio-job-detail-sec studio-job-detail-sec--perks">
          <h4 className="studio-job-detail-sec-title">
            <Gift size={16} strokeWidth={2.2} aria-hidden />
            Quyền lợi &amp; phúc lợi
          </h4>
          <StudioPerkList items={job.phucLoi} />
        </section>
      ) : job.quyenLoi?.trim() ? (
        <section className="studio-job-detail-sec studio-job-detail-sec--perks">
          <h4 className="studio-job-detail-sec-title">
            <Gift size={16} strokeWidth={2.2} aria-hidden />
            Quyền lợi &amp; phúc lợi
          </h4>
          <p className="studio-job-detail-text">{job.quyenLoi.trim()}</p>
        </section>
      ) : null}

      {job.moTa?.trim() ? (
        <section className="studio-job-detail-sec">
          <h4 className="studio-job-detail-sec-title">
            <Briefcase size={16} strokeWidth={2.2} aria-hidden />
            Mô tả công việc
          </h4>
          <p className="studio-job-detail-text">{job.moTa.trim()}</p>
        </section>
      ) : null}

      {job.yeuCau?.trim() ? (
        <section className="studio-job-detail-sec">
          <h4 className="studio-job-detail-sec-title">
            <ListChecks size={16} strokeWidth={2.2} aria-hidden />
            Yêu cầu ứng viên
          </h4>
          <p className="studio-job-detail-text">{job.yeuCau.trim()}</p>
        </section>
      ) : null}

      {canEdit ? (
        <div className="studio-job-card-dist studio-job-detail-dist">
          <span className="studio-job-card-dist-label">Phân phối:</span>
          {giaiDoanMucTieuLabels(job.giaiDoanMucTieu).map((label) => (
            <span key={label} className="studio-job-chip studio-job-chip--dist">
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {/* ── Footer ─────────────────────────────────────────────── */}
      {canEdit ? (
        <>
          {viewingApplicants ? (
            <StudioJobApplicantsPanel
              jobId={job.id}
              onClose={() => setViewingApplicants(false)}
            />
          ) : null}
          <footer className="studio-job-detail-foot studio-job-detail-foot--sticky">
            <div className="studio-job-detail-foot-info">
              {!isOpen ? (
                <span className="studio-job-detail-foot-deadline">
                  {STUDIO_JOB_STATUS_LABEL[job.trangThai]}
                </span>
              ) : deadline ? (
                <span className="studio-job-detail-foot-deadline">{deadline}</span>
              ) : null}
            </div>
            <button
              type="button"
              className="studio-job-apply-btn"
              onClick={() => setViewingApplicants((v) => !v)}
            >
              <Users size={16} strokeWidth={2.2} aria-hidden />
              {viewingApplicants ? "Ẩn ứng viên" : "Xem ứng viên"}
            </button>
          </footer>
        </>
      ) : applying ? (
        <StudioJobApplyForm jobId={job.id} onDone={() => setApplying(false)} />
      ) : (
        <footer className="studio-job-detail-foot studio-job-detail-foot--sticky studio-job-detail-foot--actions">
          <div className="studio-job-detail-foot-info">
            {salary ? (
              <span className="studio-job-detail-foot-salary">{salary}</span>
            ) : null}
            {isOpen ? (
              deadline ? (
                <span className="studio-job-detail-foot-deadline">{deadline}</span>
              ) : null
            ) : (
              <span className="studio-job-detail-foot-deadline">
                Đã đóng nhận hồ sơ
              </span>
            )}
          </div>
          <div className="studio-job-detail-actions">
            <button
              type="button"
              className="studio-job-act-btn studio-job-act-btn--ghost"
              onClick={handleMessage}
              disabled={messaging || !chat}
            >
              <MessageCircle size={16} strokeWidth={2.2} aria-hidden />
              {messaging ? "Đang mở…" : "Nhắn tin"}
            </button>
            <JourneyBookmarkButton
              milestoneId={job.id}
              title={job.tieuDe}
              buttonClassName="studio-job-act-btn studio-job-act-btn--ghost studio-job-act-btn--save"
              label="Lưu về"
              iconSize={16}
              saveEndpoint={({ visibility, privateNote }) => ({
                url: "/api/luu-bai",
                body: {
                  loai_doi_tuong: "org_tuyen_dung",
                  id_doi_tuong: job.id,
                  visibility,
                  ghi_chu_rieng: privateNote,
                },
              })}
            />
            {isOpen ? (
              <button
                type="button"
                className="studio-job-act-btn studio-job-act-btn--primary"
                onClick={handleApply}
              >
                <SendHorizonal size={16} strokeWidth={2.2} aria-hidden />
                Ứng tuyển
              </button>
            ) : null}
          </div>
        </footer>
      )}

      {/* ── Gợi ý tin tuyển khác ───────────────────────────────── */}
      {related.length > 0 ? (
        <section className="studio-job-detail-related">
          <h4 className="studio-job-detail-sec-title">
            Vị trí khác tại {orgTen}
          </h4>
          <ul className="studio-job-detail-related-list">
            {related.map((rj) => {
              const rjSalary = formatStudioSalary(rj);
              return (
                <li key={rj.id}>
                  <button
                    type="button"
                    className="studio-job-detail-related-item"
                    onClick={() => onOpenJob?.(rj)}
                  >
                    <span className="studio-job-detail-related-ic" aria-hidden>
                      <Briefcase size={16} strokeWidth={2} />
                    </span>
                    <span className="studio-job-detail-related-meta">
                      <span className="studio-job-detail-related-title">
                        {rj.tieuDe}
                      </span>
                      <span className="studio-job-detail-related-sub">
                        {STUDIO_JOB_LOAI_HINH_LABEL[rj.loaiHinh]}
                        {" · "}
                        {studioJobPlace(rj)}
                        {rjSalary ? ` · ${rjSalary}` : ""}
                      </span>
                    </span>
                    <ChevronRight
                      size={16}
                      strokeWidth={2}
                      className="studio-job-detail-related-arrow"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </TruongInlineModal>
  );
}
