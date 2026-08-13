"use client";

import {
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Loader2,
  Paperclip,
  Send,
  Wallet,
  X,
} from "lucide-react";
import { ChatMessageThreadItems } from "@/components/cins/ChatMessageThreadItems";
import { ChatReplyComposeBar } from "@/components/cins/ChatReplyComposeBar";
import { ChatStickerPicker } from "@/components/cins/ChatStickerPicker";
import { importGifToCloudflare } from "@/lib/gif/client";
import { MsIcon } from "@/components/cins/MsIcon";
import { useChatRoomMessageActions } from "@/components/cins/useChatRoomMessageActions";
import { useCinsChat } from "@/components/cins/CinsChatProvider";
import {
  OrgInboxPanel,
  type OrgInboxPanelHandle,
  studentInitials,
} from "@/components/truong/OrgInboxPanel";
import { avatarBg, formatChatTime } from "@/lib/chat/avatar";
import {
  revokeDraftImageUrls,
  type PendingImageDraft,
} from "@/lib/chat/compose-draft";
import {
  fetchChatComposeImageUpload,
  patchPendingImageUploadResult,
  planPendingImageAdditions,
} from "@/lib/chat/compose-image-upload";
import {
  buildChatSendPlan,
  optimisticMessagesFromPlan,
  type ChatSendPayload,
} from "@/lib/chat/compose-send-plan";
import { executeComposeSendPlanInBackground } from "@/lib/chat/execute-compose-send-plan";
import {
  countActiveChildrenByParent,
  nestGroupThreads,
} from "@/lib/chat/nest-group-threads";
import {
  createOptimisticChatMessage,
  messagePreviewText,
} from "@/lib/chat/optimistic-message";
import type { OrgInboxThread } from "@/lib/chat/org-inbox-types";
import {
  mapRealtimeRow,
  reconcileChatMessage,
  type ChatRealtimeRow,
} from "@/lib/chat/realtime";
import { replaceOptimisticAlbumWithRealMessages } from "@/lib/chat/replace-album-batch";
import type {
  ChatMessage,
  ChatMessageReplyPreview,
  ChatThread,
} from "@/lib/chat/types";
import { useChatRealtime } from "@/lib/chat/use-chat-realtime";
import { tinHienVoiViewer } from "@/lib/chat/visibility";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import { userEmojiDeliveryUrl } from "@/lib/user-emoji/delivery-url";
import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import type { UserEmojiMuc } from "@/lib/user-emoji/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ClipboardEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useOrgInboxDeepLink } from "@/lib/chat/use-org-inbox-deep-link";

function toReplyPreview(msg: ChatMessage): ChatMessageReplyPreview {
  return {
    id: msg.id,
    from: msg.from,
    body: msg.body,
    kind: msg.kind,
    imageUrl: msg.imageUrl,
    deleted: msg.deleted,
  };
}

type MainTab = "tu_van" | "co_so";

type Goi = { id: string; ten: string; soNgay: number; giaVnd: number };
type Lop = { id: string; maLop: string; khoaId: string; tenKhoa: string };

type Props = {
  orgId: string;
  orgSlug: string;
  orgTen?: string | null;
  orgAvatarUrl?: string | null;
};

export function TinNhanQuanLyClient({
  orgId,
  orgSlug,
  orgTen = null,
  orgAvatarUrl = null,
}: Props) {
  const chat = useCinsChat();
  const viewerId = chat.viewerProfileId;
  const [mainTab, setMainTab] = useState<MainTab>("tu_van");
  const [flash, setFlash] = useState<string | null>(null);
  const inboxRef = useRef<OrgInboxPanelHandle | null>(null);
  const deepLink = useOrgInboxDeepLink({ filter: "open" });

  const [goi, setGoi] = useState<Goi[]>([]);
  const [lop, setLop] = useState<Lop[]>([]);
  const [canThu, setCanThu] = useState(false);

  const [actionThread, setActionThread] = useState<OrgInboxThread | null>(null);
  const [actionOpen, setActionOpen] = useState(false);

  const toast = useCallback((message: string) => {
    setFlash(message);
    window.setTimeout(() => setFlash(null), 4000);
  }, []);

  const orgBrand = useMemo(
    () => ({ ten: orgTen, anh: orgAvatarUrl }),
    [orgTen, orgAvatarUrl],
  );

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/academy/${orgId}/students?page=1&meta=1`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) return;
        setCanThu(Boolean(data.canThu));
        setGoi(data.goi ?? []);
        setLop(data.lop ?? []);
      } catch {
        /* ignore */
      }
    })();
  }, [orgId]);

  return (
    <div className="cso-tin-nhan">
      <div className="cso-tin-nhan-panel cins-chat-panel" role="region" aria-label="Tin nhắn cơ sở">
        <div className="cso-tin-nhan-tabs" role="tablist" aria-label="Loại hội thoại">
          {(
            [
              ["tu_van", "Tư vấn"],
              ["co_so", "Cơ sở"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mainTab === id}
              className={`cso-tin-nhan-tab${mainTab === id ? " is-active" : ""}`}
              onClick={() => setMainTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="cso-tin-nhan-body">
          {mainTab === "co_so" ? (
            <CoSoRoomsPane
              orgId={orgId}
              viewerId={viewerId}
              onToast={toast}
              statusFlash={flash}
              orgBrand={orgBrand}
            />
          ) : (
            <OrgInboxPanel
              key={`tu_van-${deepLink.initialRoomId ?? ""}-${deepLink.initialStudentUserId ?? ""}-${deepLink.initialFilter}`}
              orgId={orgId}
              className="cso-tin-nhan-inbox"
              initialFilter={deepLink.initialFilter}
              initialRoomId={deepLink.initialRoomId}
              initialStudentUserId={deepLink.initialStudentUserId}
              panelRef={inboxRef}
              onToast={toast}
              statusFlash={flash}
              canConfirmHocPhi
              orgBrand={orgBrand}
              renderDetailActions={(thread) => (
                <StaffActionButtons
                  thread={thread}
                  canThu={canThu}
                  onSendInvoice={() => {
                    setActionThread(thread);
                    setActionOpen(true);
                  }}
                  onOpenLop={() => {
                    setMainTab("co_so");
                  }}
                />
              )}
            />
          )}
        </div>
      </div>

      {actionThread && actionOpen ? (
        <StaffActionModal
          orgId={orgId}
          thread={actionThread}
          goi={goi}
          lop={lop}
          onClose={() => {
            setActionThread(null);
            setActionOpen(false);
          }}
          onDone={(msg) => {
            toast(msg);
            setActionThread(null);
            setActionOpen(false);
            inboxRef.current?.reload(true);
          }}
        />
      ) : null}

      <span className="sr-only">{orgSlug}</span>
    </div>
  );
}

function StaffActionButtons({
  thread,
  canThu,
  onSendInvoice,
  onOpenLop,
}: {
  thread: OrgInboxThread;
  canThu: boolean;
  onSendInvoice: () => void;
  onOpenLop: () => void;
}) {
  const hasEnrollment = thread.enrollments.length > 0;
  return (
    <div className="cso-tin-nhan-actions">
      {canThu ? (
        <button
          type="button"
          className="cso-ql-btn cso-ql-btn--primary cso-ql-btn--sm"
          onClick={onSendInvoice}
          title="Gửi VietQR — HV đóng tiền xong mới vào lớp"
        >
          <Wallet size={14} strokeWidth={2.2} aria-hidden />
          {hasEnrollment ? "Gửi đơn HP" : "Gửi đơn QR ghi danh"}
        </button>
      ) : (
        <button
          type="button"
          className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
          disabled
          title="Không có quyền thu học phí"
        >
          <Wallet size={14} strokeWidth={2.2} aria-hidden />
          Gửi đơn QR
        </button>
      )}
      {hasEnrollment ? (
        <button
          type="button"
          className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
          onClick={onOpenLop}
        >
          <GraduationCap size={14} strokeWidth={2.2} aria-hidden />
          Phòng lớp
        </button>
      ) : null}
    </div>
  );
}

function StaffActionModal({
  orgId,
  thread,
  goi,
  lop,
  onClose,
  onDone,
}: {
  orgId: string;
  thread: OrgInboxThread;
  goi: Goi[];
  lop: Lop[];
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const isFirstEnroll = thread.enrollments.length === 0;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addLopId, setAddLopId] = useState(lop[0]?.id ?? "");
  const [hocVienLopId, setHocVienLopId] = useState(
    thread.enrollments[0]?.hocVienLopId ?? "",
  );
  const [useExisting, setUseExisting] = useState(!isFirstEnroll);
  const [goiId, setGoiId] = useState("");
  const [soNgay, setSoNgay] = useState(goi[0]?.soNgay ?? 30);
  const [soTien, setSoTien] = useState(goi[0]?.giaVnd ?? 0);
  const [ghiChu, setGhiChu] = useState("");
  /** Dòng combo thêm (ghi danh khác + gói) — cùng HV. */
  const [extraLines, setExtraLines] = useState<
    Array<{ hocVienLopId: string; goiId: string }>
  >([]);
  const [baoGiaHint, setBaoGiaHint] = useState<string | null>(null);

  useEffect(() => {
    if (goi[0] && !goiId) {
      setGoiId(goi[0].id);
      setSoNgay(goi[0].soNgay);
      setSoTien(goi[0].giaVnd);
    }
  }, [goi, goiId]);

  function onPickGoi(id: string) {
    setGoiId(id);
    const g = goi.find((x) => x.id === id);
    if (g) {
      setSoNgay(g.soNgay);
      setSoTien(g.giaVnd);
    }
  }

  const canCombo =
    useExisting && !isFirstEnroll && thread.enrollments.length >= 2;

  useEffect(() => {
    if (!canCombo || !goiId || !hocVienLopId) {
      setBaoGiaHint(null);
      return;
    }
    const items = [
      { hocVienLopId, goiId },
      ...extraLines.filter((l) => l.hocVienLopId && l.goiId),
    ];
    if (items.length < 2) {
      setBaoGiaHint(null);
      return;
    }
    // Preview client: tổng gói; server sẽ áp combo khi gửi.
    let goc = 0;
    for (const it of items) {
      const g = goi.find((x) => x.id === it.goiId);
      goc += g?.giaVnd ?? 0;
    }
    setBaoGiaHint(
      `Giỏ ${items.length} dòng · gốc ${goc.toLocaleString("vi-VN")}đ (combo trừ trên server nếu khớp)`,
    );
  }, [canCombo, goiId, hocVienLopId, extraLines, goi]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      if (soNgay < 1) throw new Error("Số ngày phải ≥ 1.");
      if (soTien < 0) throw new Error("Số tiền không hợp lệ.");

      let targetHvlId = useExisting ? hocVienLopId : "";

      if (!useExisting || isFirstEnroll) {
        if (!addLopId) throw new Error("Chọn lớp.");
        const selected = lop.find((l) => l.id === addLopId);
        if (!selected) throw new Error("Lớp không hợp lệ.");
        const enrollRes = await fetch(`/api/academy/${orgId}/students`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: thread.studentUserId,
            khoaId: selected.khoaId,
            lopId: selected.id,
          }),
        });
        const enrollData = await enrollRes.json();
        if (!enrollRes.ok) {
          throw new Error(enrollData.error || "Không tạo được hồ sơ ghi danh.");
        }
        targetHvlId = String(enrollData.hocVienLopId);
      }

      if (!targetHvlId) throw new Error("Thiếu ghi danh để gửi đơn.");

      const comboItems = [
        ...(goiId
          ? [{ hocVienLopId: targetHvlId, goiId }]
          : []),
        ...extraLines.filter((l) => l.hocVienLopId && l.goiId),
      ];

      const body =
        comboItems.length >= 1
          ? {
              items: comboItems,
              ghiChu:
                ghiChu.trim() ||
                (isFirstEnroll
                  ? "Đơn ghi danh lần đầu — vào lớp sau khi xác nhận đã nhận tiền."
                  : null),
            }
          : {
              hocVienLopId: targetHvlId,
              soNgayCong: soNgay,
              soTienVnd: soTien,
              goiId: null,
              ghiChu:
                ghiChu.trim() ||
                (isFirstEnroll
                  ? "Đơn ghi danh lần đầu — vào lớp sau khi xác nhận đã nhận tiền."
                  : null),
            };

      const res = await fetch(`/api/academy/${orgId}/tuition/chat-orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không gửi được đơn.");
      const giamNote =
        typeof data.giamVnd === "number" && data.giamVnd > 0
          ? ` · giảm ${Number(data.giamVnd).toLocaleString("vi-VN")}đ`
          : "";
      onDone(
        isFirstEnroll
          ? `Đã gửi VietQR ghi danh · ${soNgay} ngày${giamNote}. HV vào lớp sau khi đóng tiền.`
          : `Đã gửi đơn CK · ${comboItems.length > 1 ? `${comboItems.length} dòng` : `${soNgay} ngày`}${giamNote}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="cso-ql-modal-backdrop"
      role="dialog"
      aria-modal
      aria-labelledby="cso-tin-action-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="cso-ql-modal">
        <h3 id="cso-tin-action-title" className="cso-ql-modal-title">
          {isFirstEnroll ? "Gửi đơn QR ghi danh" : "Gửi đơn học phí"}
        </h3>
        <p className="cso-ql-modal-sub">
          {thread.studentName}
          {thread.studentSlug ? ` · @${thread.studentSlug}` : ""}
          {isFirstEnroll
            ? " — vào lớp sau khi xác nhận đã nhận tiền."
            : ""}
        </p>
        <div className="cso-ql-modal-body">
          {!isFirstEnroll ? (
            <div
              className="cso-tin-action-switch"
              role="tablist"
              aria-label="Áp dụng cho"
            >
              <button
                type="button"
                role="tab"
                aria-selected={useExisting}
                className={`cso-tin-action-switch-btn${useExisting ? " on" : ""}`}
                onClick={() => setUseExisting(true)}
              >
                Gia hạn ghi danh
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!useExisting}
                className={`cso-tin-action-switch-btn${!useExisting ? " on" : ""}`}
                onClick={() => setUseExisting(false)}
              >
                Lớp mới (+ VietQR)
              </button>
            </div>
          ) : null}

          {useExisting && !isFirstEnroll ? (
            <label className="cso-ql-field">
              <span className="cso-ql-label">Ghi danh</span>
              <select
                className="cso-ql-select"
                value={hocVienLopId}
                onChange={(e) => setHocVienLopId(e.target.value)}
              >
                {thread.enrollments.map((en) => (
                  <option key={en.hocVienLopId} value={en.hocVienLopId}>
                    {en.tenKhoa}
                    {en.maLop ? ` · ${en.maLop}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="cso-ql-field">
              <span className="cso-ql-label">Lớp</span>
              <select
                className="cso-ql-select"
                value={addLopId}
                onChange={(e) => setAddLopId(e.target.value)}
              >
                {lop.length === 0 ? (
                  <option value="">Chưa có lớp</option>
                ) : (
                  lop.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.tenKhoa}
                      {l.maLop ? ` · ${l.maLop}` : ""}
                    </option>
                  ))
                )}
              </select>
            </label>
          )}

          {goi.length > 0 ? (
            <label className="cso-ql-field">
              <span className="cso-ql-label">Gói học phí</span>
              <select
                className="cso-ql-select"
                value={goiId}
                onChange={(e) => onPickGoi(e.target.value)}
              >
                <option value="">Tuỳ chỉnh</option>
                {goi.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.ten} — {g.soNgay} ngày —{" "}
                    {g.giaVnd.toLocaleString("vi-VN")}đ
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {canCombo && goiId ? (
            <fieldset className="cso-ql-fieldset">
              <legend className="cso-ql-fieldset-legend">
                Combo — thêm khóa khác
              </legend>
              {extraLines.map((line, idx) => (
                <div key={idx} className="cso-ql-fieldset-row">
                  <label className="cso-ql-field">
                    <span className="cso-ql-label">Ghi danh</span>
                    <select
                      className="cso-ql-select"
                      value={line.hocVienLopId}
                      onChange={(e) =>
                        setExtraLines((rows) =>
                          rows.map((r, i) =>
                            i === idx
                              ? { ...r, hocVienLopId: e.target.value }
                              : r,
                          ),
                        )
                      }
                    >
                      {thread.enrollments
                        .filter((en) => en.hocVienLopId !== hocVienLopId)
                        .map((en) => (
                          <option key={en.hocVienLopId} value={en.hocVienLopId}>
                            {en.tenKhoa}
                            {en.maLop ? ` · ${en.maLop}` : ""}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="cso-ql-field">
                    <span className="cso-ql-label">Gói</span>
                    <select
                      className="cso-ql-select"
                      value={line.goiId}
                      onChange={(e) =>
                        setExtraLines((rows) =>
                          rows.map((r, i) =>
                            i === idx ? { ...r, goiId: e.target.value } : r,
                          ),
                        )
                      }
                    >
                      {goi.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.ten} — {g.giaVnd.toLocaleString("vi-VN")}đ
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                    onClick={() =>
                      setExtraLines((rows) => rows.filter((_, i) => i !== idx))
                    }
                  >
                    Xóa
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                onClick={() => {
                  const other = thread.enrollments.find(
                    (en) =>
                      en.hocVienLopId !== hocVienLopId &&
                      !extraLines.some(
                        (l) => l.hocVienLopId === en.hocVienLopId,
                      ),
                  );
                  if (!other) return;
                  setExtraLines((rows) => [
                    ...rows,
                    {
                      hocVienLopId: other.hocVienLopId,
                      goiId: goi[0]?.id ?? "",
                    },
                  ]);
                }}
              >
                + Thêm dòng combo
              </button>
              {baoGiaHint ? (
                <p className="cso-hp-field-hint">{baoGiaHint}</p>
              ) : null}
            </fieldset>
          ) : null}

          <div className="cso-ql-fieldset-row">
            <label className="cso-ql-field">
              <span className="cso-ql-label">Số ngày</span>
              <input
                type="number"
                min={1}
                className="cso-ql-input"
                value={soNgay}
                disabled={Boolean(goiId)}
                onChange={(e) => setSoNgay(Number(e.target.value) || 1)}
              />
            </label>
            <label className="cso-ql-field">
              <span className="cso-ql-label">Số tiền (VND)</span>
              <input
                type="number"
                min={0}
                className="cso-ql-input"
                value={soTien}
                disabled={Boolean(goiId)}
                onChange={(e) => setSoTien(Number(e.target.value) || 0)}
              />
            </label>
          </div>
          {goiId ? (
            <p className="cso-hp-field-hint">
              Đã chọn gói — giá &amp; số ngày do server lấy từ catalog (không sửa
              tay).
            </p>
          ) : null}

          <label className="cso-ql-field">
            <span className="cso-ql-label">Ghi chú</span>
            <input
              className="cso-ql-input"
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="Tuỳ chọn"
            />
          </label>

          {error ? <p className="cso-ql-error">{error}</p> : null}
        </div>
        <div className="cso-ql-modal-foot">
          <button
            type="button"
            className="cso-ql-btn cso-ql-btn--ghost"
            disabled={submitting}
            onClick={onClose}
          >
            Huỷ
          </button>
          <button
            type="button"
            className="cso-ql-btn cso-ql-btn--primary"
            disabled={submitting || lop.length === 0}
            onClick={() => void submit()}
          >
            {submitting ? "Đang gửi…" : "Gửi VietQR vào chat"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CoSoRoomsPane({
  orgId,
  viewerId,
  onToast,
  statusFlash = null,
  orgBrand = null,
}: {
  orgId: string;
  viewerId: string | null;
  onToast: (m: string) => void;
  statusFlash?: string | null;
  orgBrand?: { ten?: string | null; anh?: string | null } | null;
}) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    () => new Set(),
  );
  const [reply, setReply] = useState("");
  const [pending, startTransition] = useTransition();

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/threads", { cache: "no-store" });
      const json = (await res.json()) as {
        threads?: ChatThread[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Không tải được.");
      const orgThreads = (json.threads ?? []).filter(
        (t) =>
          t.orgId === orgId &&
          (t.isOrgHub || Boolean(t.lopHocId)) &&
          t.roomTrangThai !== "an",
      );
      setThreads(orgThreads);
      setExpandedParents((prev) => {
        const next = new Set(prev);
        for (const t of orgThreads) {
          if (t.isOrgHub) next.add(t.roomId);
        }
        return next;
      });
      setSelectedRoomId((cur) => {
        if (cur && orgThreads.some((t) => t.roomId === cur)) return cur;
        return orgThreads.find((t) => t.isOrgHub)?.roomId ?? orgThreads[0]?.roomId ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải.");
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const loadMessages = useCallback(async (roomId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(
        `/api/chat/rooms/${roomId}/messages?limit=80&mark_read=1`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        messages?: ChatMessage[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Không tải tin.");
      setMessages(
        (json.messages ?? [])
          .slice()
          .sort(
            (a, b) =>
              new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
          ),
      );
      setThreads((list) =>
        list.map((t) =>
          t.roomId === roomId ? { ...t, unread: 0 } : t,
        ),
      );
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Lỗi tải tin.");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [onToast]);

  useEffect(() => {
    if (!selectedRoomId) return;
    void loadMessages(selectedRoomId);
  }, [selectedRoomId, loadMessages]);

  const threadsRef = useRef(threads);
  threadsRef.current = threads;
  const selectedRoomIdRef = useRef(selectedRoomId);
  selectedRoomIdRef.current = selectedRoomId;

  useChatRealtime(
    viewerId,
    (row: ChatRealtimeRow) => {
      if (!viewerId) return;
      if (!tinHienVoiViewer(row.chi_hien_cho, viewerId)) return;
      if (!threadsRef.current.some((t) => t.roomId === row.id_phong)) return;
      const mapped = mapRealtimeRow(row, viewerId);
      const activeRoom = selectedRoomIdRef.current;
      if (row.id_phong === activeRoom) {
        setMessages((prev) => reconcileChatMessage(prev, mapped));
      }
      setThreads((list) =>
        list.map((t) => {
          if (t.roomId !== row.id_phong) return t;
          return {
            ...t,
            preview: messagePreviewText(mapped).slice(0, 80),
            lastAt: mapped.sentAt,
            unread:
              row.id_phong === activeRoom
                ? 0
                : t.unread + (row.id_nguoi_gui !== viewerId ? 1 : 0),
          };
        }),
      );
    },
  );

  const childCounts = useMemo(
    () => countActiveChildrenByParent(threads),
    [threads],
  );

  const nested = useMemo(
    () => nestGroupThreads(threads, { expandedParentIds: expandedParents }),
    [threads, expandedParents],
  );

  const selected = threads.find((t) => t.roomId === selectedRoomId) ?? null;

  async function submitRoomPayload(
    roomId: string,
    payload: ChatSendPayload,
    optimisticId: string,
  ): Promise<boolean> {
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        message?: ChatMessage;
        error?: string;
      };
      if (!res.ok || !json.message) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        onToast(json.error ?? "Không gửi được.");
        return false;
      }
      setMessages((prev) => reconcileChatMessage(prev, json.message!));
      return true;
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      onToast("Lỗi mạng.");
      return false;
    }
  }

  function sendReply(
    text: string,
    images: PendingImageDraft[],
    filesByLocalId: Map<string, File>,
    inFlightUploads: Map<
      string,
      Promise<import("@/lib/chat/compose-image-upload").ComposeImageUploadResult>
    >,
    replyTo: ChatMessage | null,
  ) {
    if (!selectedRoomId || pending) return;
    const plan = buildChatSendPlan({
      text,
      images: images.map((image) => ({
        localId: image.localId,
        imageId: image.imageId,
        previewUrl: image.previewUrl,
      })),
      replyTo: replyTo ? toReplyPreview(replyTo) : null,
    });
    const optimistics = optimisticMessagesFromPlan(plan);
    if (optimistics.length === 0) return;
    setMessages((prev) => {
      let merged = prev;
      for (const msg of optimistics) merged = reconcileChatMessage(merged, msg);
      return merged;
    });
    setReply("");
    const optimisticIds = new Set(optimistics.map((m) => m.id));
    const roomId = selectedRoomId;
    const replyToId = replyTo?.id ?? null;

    startTransition(() => {
      void executeComposeSendPlanInBackground({
        plan,
        imageSnapshots: images,
        filesByLocalId,
        inFlightUploads,
        hasText: Boolean(text.trim()),
        replyToId,
        sendText: plan.text
          ? () =>
              submitRoomPayload(
                roomId,
                plan.text!.payload,
                plan.text!.optimistic.id,
              )
          : undefined,
        sendAlbum: plan.album
          ? async (payloads) => {
              const albumId = plan.album!.optimistic.id;
              const real: ChatMessage[] = [];
              try {
                for (const payload of payloads) {
                  const res = await fetch(
                    `/api/chat/rooms/${roomId}/messages`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    },
                  );
                  const json = (await res.json()) as {
                    message?: ChatMessage;
                    error?: string;
                  };
                  if (!res.ok || !json.message) {
                    throw new Error(json.error ?? "Không gửi ảnh.");
                  }
                  real.push(json.message);
                }
                setMessages((prev) =>
                  replaceOptimisticAlbumWithRealMessages(prev, albumId, real),
                );
                return true;
              } catch (e) {
                setMessages((prev) => prev.filter((m) => m.id !== albumId));
                onToast(e instanceof Error ? e.message : "Lỗi gửi ảnh.");
                return false;
              }
            }
          : undefined,
        onFailure: () => {
          setMessages((prev) =>
            prev.filter((m) => !optimisticIds.has(m.id)),
          );
          setReply(text);
          onToast("Không gửi được tin nhắn.");
        },
      });
    });
  }

  function sendSticker(item: UserEmojiMuc) {
    if (!selectedRoomId || pending) return;
    const optimistic = createOptimisticChatMessage({
      body: "",
      kind: "sticker",
      imageId: item.cloudflareId,
      imageUrl:
        item.url ?? userEmojiDeliveryUrl(item.cloudflareId, "thumbnail"),
    });
    setMessages((prev) => reconcileChatMessage(prev, optimistic));
    startTransition(() => {
      void submitRoomPayload(
        selectedRoomId,
        { id_emoji_muc: item.id },
        optimistic.id,
      );
    });
  }

  function sendGif(payload: {
    previewUrl: string;
    url: string;
    id?: string;
  }) {
    if (!selectedRoomId || pending) return;
    const optimistic = createOptimisticChatMessage({
      body: "",
      kind: "media",
      imageId: null,
      imageUrl: payload.previewUrl,
    });
    setMessages((prev) => reconcileChatMessage(prev, optimistic));
    startTransition(() => {
      void (async () => {
        try {
          const imported = await importGifToCloudflare({
            url: payload.url,
            id: payload.id,
          });
          await submitRoomPayload(
            selectedRoomId,
            { cloudflare_image_id: imported.imageId },
            optimistic.id,
          );
        } catch (error) {
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          onToast(
            error instanceof Error ? error.message : "Không gửi được GIF.",
          );
        }
      })();
    });
  }

  return (
    <div className="tdh-message-inbox-layout cso-tin-nhan-inbox">
      <aside className="tdh-message-inbox-list-pane">
        <ul className="tdh-message-inbox-thread-list cso-tin-nhan-room-list">
          {loading ? (
            <li className="tdh-message-inbox-thread-empty">Đang tải…</li>
          ) : error ? (
            <li className="tdh-message-inbox-thread-empty">{error}</li>
          ) : nested.length === 0 ? (
            <li className="tdh-message-inbox-thread-empty">
              Chưa có hub / phòng lớp. Tạo lớp trên Khóa &amp; lớp.
            </li>
          ) : (
            nested.map((thread) => {
              const isChild = Boolean(thread.parentRoomId);
              const isHub = Boolean(thread.isOrgHub);
              const childCount = childCounts.get(thread.roomId) ?? 0;
              const expanded = expandedParents.has(thread.roomId);
              const roomKind = isHub ? "hub" : thread.lopHocId ? "lop" : "other";
              return (
                <li
                  key={thread.roomId}
                  className={`cso-tin-nhan-room-item${isHub ? " is-hub" : ""}${isChild ? " is-child" : ""}`}
                >
                  <button
                    type="button"
                    className={`tdh-message-inbox-thread cso-tin-nhan-room${selectedRoomId === thread.roomId ? " is-active" : ""}${thread.unread > 0 ? " is-unread" : ""}${isHub ? " is-hub" : ""}${isChild ? " is-nested" : ""}`}
                    onClick={() => setSelectedRoomId(thread.roomId)}
                  >
                    {isHub && childCount > 0 ? (
                      <span
                        className="cso-tin-nhan-expand"
                        role="button"
                        tabIndex={0}
                        aria-label={expanded ? "Thu gọn lớp" : "Mở danh sách lớp"}
                        aria-expanded={expanded}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedParents((prev) => {
                            const next = new Set(prev);
                            if (next.has(thread.roomId)) next.delete(thread.roomId);
                            else next.add(thread.roomId);
                            return next;
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          e.stopPropagation();
                          setExpandedParents((prev) => {
                            const next = new Set(prev);
                            if (next.has(thread.roomId)) next.delete(thread.roomId);
                            else next.add(thread.roomId);
                            return next;
                          });
                        }}
                      >
                        {expanded ? (
                          <ChevronDown size={14} aria-hidden />
                        ) : (
                          <ChevronRight size={14} aria-hidden />
                        )}
                      </span>
                    ) : isChild ? (
                      <span className="cso-tin-nhan-tree-branch" aria-hidden />
                    ) : (
                      <span className="cso-tin-nhan-expand-spacer" aria-hidden />
                    )}
                    <span
                      className={`tdh-message-inbox-thread-avatar cso-tin-nhan-room-avatar${isHub ? " is-hub" : ""}${isChild ? " is-lop" : ""}`}
                      aria-hidden
                    >
                      {isChild ? (
                        <GraduationCap size={16} strokeWidth={2} />
                      ) : thread.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={thread.avatarUrl} alt="" />
                      ) : (
                        <span
                          style={{
                            display: "grid",
                            placeItems: "center",
                            width: "100%",
                            height: "100%",
                            background: avatarBg(thread.avatarHue),
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {thread.avatarInitial || studentInitials(thread.name)}
                        </span>
                      )}
                    </span>
                    <span className="tdh-message-inbox-thread-body">
                      <span className="tdh-message-inbox-thread-top">
                        <span className="tdh-message-inbox-thread-name">
                          {thread.name}
                        </span>
                        <time
                          className="tdh-message-inbox-thread-time"
                          dateTime={thread.lastAt}
                        >
                          {formatChatTime(thread.lastAt)}
                        </time>
                      </span>
                      <span className="cso-tin-nhan-room-meta">
                        <span
                          className={`cso-tin-nhan-room-kind cso-tin-nhan-room-kind--${roomKind}`}
                        >
                          {isHub ? "Cơ sở" : thread.lopHocId ? "Lớp" : thread.role}
                        </span>
                        {isHub && childCount > 0 ? (
                          <span className="cso-tin-nhan-room-count">
                            {childCount} lớp
                          </span>
                        ) : null}
                      </span>
                      <span className="tdh-message-inbox-thread-preview">
                        {thread.preview}
                      </span>
                    </span>
                    {thread.unread > 0 ? (
                      <span className="tdh-message-inbox-thread-dot" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <section className="tdh-message-inbox-detail-pane" aria-label="Phòng chat">
        {selected ? (
          <RoomComposeDetail
            roomId={selected.roomId}
            title={selected.name}
            meta={
              selected.isOrgHub
                ? "Phòng chat cơ sở"
                : selected.lopHocId
                  ? "Phòng học của lớp"
                  : selected.role
            }
            messages={messages}
            setMessages={setMessages}
            loading={loadingMessages}
            reply={reply}
            sending={pending}
            onToast={onToast}
            statusFlash={statusFlash}
            onReplyChange={setReply}
            onSend={sendReply}
            onSendSticker={sendSticker}
            onSendGif={sendGif}
            avatarUrl={selected.avatarUrl}
            avatarHue={selected.avatarHue}
            avatarInitial={selected.avatarInitial}
            orgBrand={orgBrand}
          />
        ) : (
          <p className="tdh-message-inbox-pick">
            Chọn hub hoặc phòng lớp bên trái.
          </p>
        )}
      </section>
    </div>
  );
}

function RoomComposeDetail({
  roomId,
  title,
  meta,
  messages,
  setMessages,
  loading,
  reply,
  sending,
  onToast,
  statusFlash = null,
  onReplyChange,
  onSend,
  onSendSticker,
  onSendGif,
  avatarUrl,
  avatarHue,
  avatarInitial,
  orgBrand = null,
}: {
  roomId: string;
  title: string;
  meta: string;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  loading: boolean;
  reply: string;
  sending: boolean;
  onToast: (message: string) => void;
  statusFlash?: string | null;
  onReplyChange: (v: string) => void;
  onSend: (
    text: string,
    images: PendingImageDraft[],
    filesByLocalId: Map<string, File>,
    inFlightUploads: Map<
      string,
      Promise<import("@/lib/chat/compose-image-upload").ComposeImageUploadResult>
    >,
    replyTo: ChatMessage | null,
  ) => void;
  onSendSticker: (item: UserEmojiMuc) => void;
  onSendGif: (payload: {
    previewUrl: string;
    url: string;
    id?: string;
  }) => void;
  avatarUrl?: string | null;
  avatarHue: number;
  avatarInitial: string;
  orgBrand?: { ten?: string | null; anh?: string | null } | null;
}) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImages, setPendingImages] = useState<PendingImageDraft[]>([]);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const pendingFilesByLocalIdRef = useRef<Map<string, File>>(new Map());
  const inFlightUploadsRef = useRef<
    Map<
      string,
      Promise<import("@/lib/chat/compose-image-upload").ComposeImageUploadResult>
    >
  >(new Map());
  const pendingImagesRef = useRef(pendingImages);
  pendingImagesRef.current = pendingImages;

  const {
    actionHandlers,
    replyTarget,
    setReplyTarget,
    editingMessageId,
    editingDraft,
    setEditingDraft,
    handleSaveEdit,
    handleCancelEdit,
    clearComposeExtras,
  } = useChatRoomMessageActions({
    roomId,
    setMessages,
    onError: onToast,
  });

  useEffect(() => {
    return () => revokeDraftImageUrls(pendingImagesRef.current);
  }, []);

  useEffect(() => {
    revokeDraftImageUrls(pendingImagesRef.current);
    setPendingImages([]);
    pendingFilesByLocalIdRef.current.clear();
    inFlightUploadsRef.current.clear();
    setStickerPickerOpen(false);
    clearComposeExtras();
  }, [roomId, clearComposeExtras]);

  useEffect(() => {
    if (loading || messages.length === 0) return;
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    else messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [loading, messages]);

  const sendableImages = pendingImages.filter((image) => !image.error);
  const canSend = Boolean(reply.trim()) || sendableImages.length > 0;

  function queueUploads(files: File[]) {
    const planned = planPendingImageAdditions(files, pendingImagesRef.current);
    if (planned.length === 0) return;
    setPendingImages((prev) => [...prev, ...planned.map((item) => item.draft)]);
    for (const { file, draft } of planned) {
      pendingFilesByLocalIdRef.current.set(draft.localId, file);
      const promise = fetchChatComposeImageUpload(file).then((result) => {
        setPendingImages((prev) =>
          patchPendingImageUploadResult(prev, draft.localId, result),
        );
        return result;
      });
      inFlightUploadsRef.current.set(draft.localId, promise);
    }
  }

  function handleSend() {
    if (!canSend || sending) return;
    const replyTo = replyTarget;
    onSend(
      reply,
      sendableImages,
      new Map(pendingFilesByLocalIdRef.current),
      new Map(inFlightUploadsRef.current),
      replyTo,
    );
    setReplyTarget(null);
    revokeDraftImageUrls(pendingImages);
    setPendingImages([]);
    pendingFilesByLocalIdRef.current.clear();
    inFlightUploadsRef.current.clear();
    setStickerPickerOpen(false);
  }

  return (
    <>
      <header className="tdh-message-inbox-detail-hdr">
        <div>
          <h4 className="tdh-message-inbox-detail-title">{title}</h4>
          <p className="tdh-message-inbox-detail-meta">{meta}</p>
        </div>
      </header>
      {statusFlash ? (
        <p className="cso-tin-nhan-flash cso-tin-nhan-flash--in-chat" role="status">
          {statusFlash}
        </p>
      ) : null}
      {loading ? (
        <p className="tdh-message-inbox-pick">
          <Loader2 size={16} className="tdh-milestone-tag-org-msg-spin" aria-hidden />
          Đang tải…
        </p>
      ) : (
        <div
          ref={messagesContainerRef}
          className="tdh-message-inbox-messages cins-chat-messages"
        >
          {messages.length === 0 ? (
            <p className="tdh-message-inbox-thread-empty">Chưa có tin nhắn.</p>
          ) : (
            <ChatMessageThreadItems
              messages={messages}
              roomId={roomId}
              actionHandlers={actionHandlers}
              editingMessageId={editingMessageId}
              editingDraft={editingDraft}
              onEditingDraftChange={setEditingDraft}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              orgBrand={orgBrand}
              renderTheirAvatar={() => (
                <span className="cins-chat-avatar-wrap">
                  <span
                    className={`cins-chat-avatar${avatarUrl ? " has-image" : ""}`}
                    style={{
                      width: 28,
                      height: 28,
                      fontSize: 11,
                      background: avatarUrl
                        ? "transparent"
                        : avatarBg(avatarHue),
                    }}
                  >
                    {avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={avatarUrl} alt="" />
                    ) : (
                      avatarInitial
                    )}
                  </span>
                </span>
              )}
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
      <div className="tdh-message-inbox-compose cins-chat-compose">
        {replyTarget ? (
          <ChatReplyComposeBar
            target={replyTarget}
            onCancel={() => setReplyTarget(null)}
          />
        ) : null}
        {pendingImages.length > 0 ? (
          <div className="j-chat-mini-compose-attach-list cins-chat-compose-attach-list">
            {pendingImages.map((image) => (
              <div key={image.localId} className="j-chat-mini-compose-attach">
                <div className="j-chat-mini-compose-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.previewUrl} alt="" />
                  <button
                    type="button"
                    className="j-chat-mini-compose-remove"
                    aria-label="Bỏ ảnh"
                    onClick={() => {
                      setPendingImages((prev) => {
                        const target = prev.find((i) => i.localId === image.localId);
                        if (target) revokeDraftImageUrls([target]);
                        return prev.filter((i) => i.localId !== image.localId);
                      });
                      pendingFilesByLocalIdRef.current.delete(image.localId);
                      inFlightUploadsRef.current.delete(image.localId);
                    }}
                  >
                    <X size={12} strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {stickerPickerOpen ? (
          <ChatStickerPicker
            onClose={() => setStickerPickerOpen(false)}
            disabled={sending}
            onSend={(item) => {
              setStickerPickerOpen(false);
              onSendSticker(item);
            }}
            onSendGif={(payload) => {
              setStickerPickerOpen(false);
              onSendGif(payload);
            }}
          />
        ) : null}
        <div className="tdh-message-inbox-compose-row cins-chat-compose-row">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="j-chat-mini-compose-file"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              if (files.length > 0) queueUploads(files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="cins-chat-attach cins-chat-attach-meme"
            data-sticker-trigger
            aria-label="Meme"
            disabled={sending}
            onClick={() => setStickerPickerOpen((o) => !o)}
          >
            <MsIcon name="comedy_mask" className="cins-chat-attach-meme-icon" />
          </button>
          <button
            type="button"
            className="j-chat-mini-attach"
            aria-label="Đính kèm ảnh"
            disabled={sending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={17} strokeWidth={1.9} aria-hidden />
          </button>
          <textarea
            className="tdh-message-inbox-textarea"
            rows={1}
            placeholder="Nhắn tin…"
            value={reply}
            disabled={sending}
            onChange={(e) => onReplyChange(e.target.value)}
            onPaste={(e: ClipboardEvent<HTMLTextAreaElement>) => {
              const files = imageFilesFromClipboard(e.clipboardData);
              if (files.length === 0) return;
              e.preventDefault();
              queueUploads(files);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            className="tdh-inline-btn primary tdh-message-inbox-send"
            disabled={!canSend || sending}
            onClick={handleSend}
          >
            {sending ? (
              <Loader2 size={16} className="tdh-milestone-tag-org-msg-spin" />
            ) : (
              <Send size={16} strokeWidth={2.2} />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
