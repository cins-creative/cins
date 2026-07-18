"use client";

import { AlertTriangle, PauseCircle, PlayCircle, UserCog } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { OrgOwnerDangerConfirmModal } from "@/components/to-chuc/OrgOwnerDangerConfirmModal";
import { TransferOwnerModal } from "@/components/to-chuc/TransferOwnerModal";
import type { CongDongMemberAdmin } from "@/lib/cong-dong/types";
import type { StudioHoatDongStatus } from "@/lib/to-chuc/studio-lifecycle.shared";

type DangerKind = "pause" | "resume" | "close";

type Props = {
  orgId: string;
  orgSlug: string;
  orgTen: string;
  trangThaiHoatDong: StudioHoatDongStatus;
  onStatusChange: (next: StudioHoatDongStatus) => void;
  onTransferred: () => void;
  onClosed: () => void;
};

function statusLabel(status: StudioHoatDongStatus): string {
  if (status === "tam_ngung") return "Tạm ngưng";
  if (status === "da_dong_cua") return "Đã xóa";
  return "Đang hoạt động";
}

export function CongDongOrganizationSection({
  orgId,
  orgSlug,
  orgTen,
  trangThaiHoatDong,
  onStatusChange,
  onTransferred,
  onClosed,
}: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<CongDongMemberAdmin[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [transferMemberId, setTransferMemberId] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferPending, setTransferPending] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [danger, setDanger] = useState<DangerKind | null>(null);
  const [pending, setPending] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    setSectionError(null);
    try {
      const res = await fetch(
        `/api/cong-dong/${encodeURIComponent(orgId)}/members`,
        { credentials: "same-origin" },
      );
      const json = (await res.json().catch(() => null)) as {
        members?: CongDongMemberAdmin[];
        error?: string;
      } | null;
      if (!res.ok) {
        setSectionError(json?.error ?? "Không tải được danh sách thành viên.");
        setMembers([]);
        return;
      }
      setMembers(json?.members ?? []);
    } finally {
      setLoadingMembers(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const transferCandidates = useMemo(
    () =>
      members.filter(
        (m) => m.vaiTro !== "owner" && m.trangThai !== "pending",
      ),
    [members],
  );

  const transferTarget = transferCandidates.find(
    (m) => m.id === transferMemberId,
  );

  function openDanger(kind: DangerKind) {
    setSectionError(null);
    setModalError(null);
    setDanger(kind);
  }

  function closeDanger() {
    if (pending) return;
    setDanger(null);
    setModalError(null);
  }

  async function runLifecycle(
    action: "pause" | "resume" | "close",
    confirmTen: string,
  ) {
    setPending(true);
    setModalError(null);
    try {
      const res = await fetch(
        `/api/cong-dong/${encodeURIComponent(orgId)}/lifecycle`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action, confirmTen }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        trangThaiHoatDong?: StudioHoatDongStatus;
        error?: string;
      } | null;
      if (!res.ok || !json?.trangThaiHoatDong) {
        setModalError(json?.error ?? "Không cập nhật được trạng thái.");
        return;
      }
      onStatusChange(json.trangThaiHoatDong);
      setDanger(null);
      if (action === "close") {
        onClosed();
        router.push("/cong-dong");
        router.refresh();
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function runTransfer(confirmSlug: string) {
    if (!transferTarget) {
      setTransferError("Chọn thành viên nhận quyền sở hữu.");
      return;
    }
    setTransferPending(true);
    setTransferError(null);
    try {
      const res = await fetch(
        `/api/cong-dong/${encodeURIComponent(orgId)}/transfer-owner`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            membershipId: transferTarget.id,
            confirmSlug,
          }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setTransferError(json?.error ?? "Không bàn giao được quyền sở hữu.");
        return;
      }
      setTransferOpen(false);
      setTransferMemberId("");
      onTransferred();
      router.refresh();
    } finally {
      setTransferPending(false);
    }
  }

  const confirmConfig = (() => {
    if (!danger) return null;
    if (danger === "pause") {
      return {
        title: "Tạm dừng cộng đồng",
        confirmButtonLabel: "Tạm dừng cộng đồng",
        warning: (
          <p style={{ margin: 0 }}>
            Cộng đồng <strong>{orgTen}</strong> sẽ bị ẩn khỏi danh sách và tìm
            kiếm. Thành viên vẫn vào được trang kèm trạng thái tạm ngưng. Bạn có
            thể mở lại bất kỳ lúc nào.
          </p>
        ),
        onConfirm: (ten: string) => runLifecycle("pause", ten),
      };
    }
    if (danger === "resume") {
      return {
        title: "Mở lại cộng đồng",
        confirmButtonLabel: "Mở lại cộng đồng",
        warning: (
          <p style={{ margin: 0 }}>
            Cộng đồng <strong>{orgTen}</strong> sẽ hiện lại trên danh sách và tìm
            kiếm, trạng thái hoạt động bình thường.
          </p>
        ),
        onConfirm: (ten: string) => runLifecycle("resume", ten),
      };
    }
    return {
      title: "Xóa cộng đồng",
      confirmButtonLabel: "Xóa cộng đồng",
      warning: (
        <p style={{ margin: 0 }}>
          Cộng đồng <strong>{orgTen}</strong> sẽ bị xóa và biến mất khỏi CINs —
          không còn trên danh sách, tìm kiếm hay trang công khai. Hành động này
          không thể hoàn tác.
        </p>
      ),
      onConfirm: (ten: string) => runLifecycle("close", ten),
    };
  })();

  const isClosed = trangThaiHoatDong === "da_dong_cua";
  const isPaused = trangThaiHoatDong === "tam_ngung";

  return (
    <section className="cd-manage-org" aria-label="Tổ chức">
      {sectionError ? (
        <p className="cd-manage-org-err" role="alert">
          {sectionError}
        </p>
      ) : null}

      <div className="cd-manage-org-status">
        <span className="cd-manage-org-status-label">Trạng thái</span>
        <span
          className={`cd-manage-org-status-badge${
            isClosed ? " is-closed" : isPaused ? " is-paused" : ""
          }`}
        >
          {statusLabel(trangThaiHoatDong)}
        </span>
      </div>

      <div className="cd-manage-org-block">
        <div className="cd-manage-org-block-head">
          <UserCog size={16} strokeWidth={2} aria-hidden />
          <h4 className="cd-manage-org-block-title">Chuyển nhượng</h4>
        </div>
        <p className="cd-manage-org-block-hint">
          Chuyển quyền sở hữu tối đa cho một thành viên đang tham gia. Chỉ chủ sở
          hữu thực hiện được.
        </p>
        {loadingMembers ? (
          <p className="cd-manage-org-muted">Đang tải thành viên…</p>
        ) : transferCandidates.length === 0 ? (
          <p className="cd-manage-org-muted">
            Chưa có thành viên phù hợp để nhận quyền sở hữu. Thêm thành viên ở
            tab Thành viên trước.
          </p>
        ) : (
          <div className="cd-manage-org-transfer-row">
            <select
              className="cd-manage-org-select"
              value={transferMemberId}
              onChange={(e) => setTransferMemberId(e.target.value)}
              aria-label="Thành viên nhận quyền sở hữu"
            >
              <option value="">Chọn thành viên…</option>
              {transferCandidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.tenHienThi} (@{m.slug})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="cd-v4-btn cd-v4-btn--ghost cd-manage-org-danger-btn"
              disabled={!transferMemberId || isClosed}
              onClick={() => {
                setTransferError(null);
                setTransferOpen(true);
              }}
            >
              Chuyển nhượng…
            </button>
          </div>
        )}
      </div>

      <div className="cd-manage-org-block">
        <div className="cd-manage-org-block-head">
          {isPaused ? (
            <PlayCircle size={16} strokeWidth={2} aria-hidden />
          ) : (
            <PauseCircle size={16} strokeWidth={2} aria-hidden />
          )}
          <h4 className="cd-manage-org-block-title">
            {isPaused ? "Mở lại cộng đồng" : "Tạm dừng"}
          </h4>
        </div>
        <p className="cd-manage-org-block-hint">
          {isPaused
            ? "Cộng đồng đang tạm ngưng — mở lại để hiện trên danh sách và tìm kiếm."
            : "Ẩn cộng đồng khỏi danh sách và tìm kiếm; thành viên vẫn xem được kèm thông báo tạm ngưng."}
        </p>
        <button
          type="button"
          className="cd-v4-btn cd-v4-btn--ghost cd-manage-org-danger-btn"
          disabled={isClosed}
          onClick={() => openDanger(isPaused ? "resume" : "pause")}
        >
          {isPaused ? "Mở lại…" : "Tạm dừng…"}
        </button>
      </div>

      <div className="cd-manage-org-block cd-manage-org-block--close">
        <div className="cd-manage-org-block-head">
          <AlertTriangle size={16} strokeWidth={2} aria-hidden />
          <h4 className="cd-manage-org-block-title">Xóa cộng đồng</h4>
        </div>
        <p className="cd-manage-org-block-hint">
          Xóa vĩnh viễn khỏi CINs. Không thể khôi phục.
        </p>
        <button
          type="button"
          className="cd-v4-btn cd-manage-org-close-btn"
          disabled={isClosed}
          onClick={() => openDanger("close")}
        >
          {isClosed ? "Đã xóa" : "Xóa cộng đồng…"}
        </button>
      </div>

      <TransferOwnerModal
        open={transferOpen}
        orgSlug={orgSlug}
        orgLabel={orgTen}
        targetName={transferTarget?.tenHienThi ?? ""}
        pending={transferPending}
        error={transferError}
        onConfirm={runTransfer}
        onClose={() => {
          if (!transferPending) {
            setTransferOpen(false);
            setTransferError(null);
          }
        }}
      />

      {confirmConfig ? (
        <OrgOwnerDangerConfirmModal
          open={Boolean(danger)}
          title={confirmConfig.title}
          warning={confirmConfig.warning}
          confirmTen={orgTen}
          confirmButtonLabel={confirmConfig.confirmButtonLabel}
          pending={pending}
          error={modalError}
          onConfirm={confirmConfig.onConfirm}
          onClose={closeDanger}
        />
      ) : null}
    </section>
  );
}
