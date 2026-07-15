"use client";

import { AlertTriangle, PauseCircle, PlayCircle, UserCog } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { OrgOwnerDangerConfirmModal } from "@/components/to-chuc/OrgOwnerDangerConfirmModal";
import type { CoSoMemberAdmin } from "@/lib/to-chuc/co-so-settings-types";
import type { StudioHoatDongStatus } from "@/lib/to-chuc/studio-lifecycle.shared";

type DangerKind = "transfer" | "pause" | "resume" | "close";

type Props = {
  orgId: string;
  orgTen: string;
  trangThaiHoatDong: StudioHoatDongStatus;
  onStatusChange: (next: StudioHoatDongStatus) => void;
  onError: (message: string | null) => void;
  /** Sau đóng cửa — đóng settings + refresh / redirect. */
  onClosed: () => void;
  /** Sau bàn giao — đóng settings (không còn là owner). */
  onTransferred: () => void;
};

function statusLabel(status: StudioHoatDongStatus): string {
  if (status === "tam_ngung") return "Tạm ngưng";
  if (status === "da_dong_cua") return "Đã đóng cửa";
  return "Đang hoạt động";
}

export function StudioSettingsOrganizationSection({
  orgId,
  orgTen,
  trangThaiHoatDong,
  onStatusChange,
  onError,
  onClosed,
  onTransferred,
}: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<CoSoMemberAdmin[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [transferMemberId, setTransferMemberId] = useState("");
  const [danger, setDanger] = useState<DangerKind | null>(null);
  const [pending, setPending] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch(
        `/api/studio/${encodeURIComponent(orgId)}/members`,
        { credentials: "same-origin" },
      );
      const json = (await res.json().catch(() => null)) as {
        members?: CoSoMemberAdmin[];
        error?: string;
      } | null;
      if (!res.ok) {
        onError(json?.error ?? "Không tải được danh sách thành viên.");
        setMembers([]);
        return;
      }
      setMembers(json?.members ?? []);
    } finally {
      setLoadingMembers(false);
    }
  }, [orgId, onError]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const transferCandidates = useMemo(
    () =>
      members.filter(
        (m) =>
          m.trangThai === "active" &&
          m.vaiTro !== "owner" &&
          !m.isSelf,
      ),
    [members],
  );

  const transferTarget = transferCandidates.find(
    (m) => m.id === transferMemberId,
  );

  function openDanger(kind: DangerKind) {
    onError(null);
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
        `/api/studio/${encodeURIComponent(orgId)}/lifecycle`,
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
        router.push("/studio");
        router.refresh();
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function runTransfer(confirmTen: string) {
    if (!transferTarget) {
      setModalError("Chọn thành viên nhận quyền sở hữu.");
      return;
    }
    setPending(true);
    setModalError(null);
    try {
      const res = await fetch(
        `/api/studio/${encodeURIComponent(orgId)}/transfer-owner`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            membershipId: transferTarget.id,
            confirmTen,
          }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        members?: CoSoMemberAdmin[];
        error?: string;
      } | null;
      if (!res.ok) {
        setModalError(json?.error ?? "Không bàn giao được quyền sở hữu.");
        return;
      }
      setDanger(null);
      onTransferred();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const confirmConfig = (() => {
    if (!danger) return null;
    if (danger === "transfer") {
      return {
        title: "Bàn giao quyền sở hữu",
        confirmButtonLabel: "Bàn giao quyền sở hữu",
        warning: (
          <p style={{ margin: 0 }}>
            Bạn sắp chuyển <strong>quyền sở hữu tối đa</strong> của{" "}
            <strong>{orgTen}</strong>
            {transferTarget ? (
              <>
                {" "}
                cho <strong>{transferTarget.tenHienThi}</strong>
              </>
            ) : null}
            . Sau khi bàn giao, bạn trở thành <strong>quản trị viên</strong> và{" "}
            <strong>không còn quyền sở hữu</strong>.
          </p>
        ),
        onConfirm: runTransfer,
      };
    }
    if (danger === "pause") {
      return {
        title: "Tạm dừng studio",
        confirmButtonLabel: "Tạm dừng studio",
        warning: (
          <p style={{ margin: 0 }}>
            Studio <strong>{orgTen}</strong> sẽ bị ẩn khỏi hub và tìm kiếm. Trang
            vẫn mở được kèm thông báo tạm ngưng. Bạn có thể mở lại bất kỳ lúc
            nào.
          </p>
        ),
        onConfirm: (ten: string) => runLifecycle("pause", ten),
      };
    }
    if (danger === "resume") {
      return {
        title: "Mở lại studio",
        confirmButtonLabel: "Mở lại studio",
        warning: (
          <p style={{ margin: 0 }}>
            Studio <strong>{orgTen}</strong> sẽ hiện lại trên hub và tìm kiếm,
            trạng thái hoạt động bình thường.
          </p>
        ),
        onConfirm: (ten: string) => runLifecycle("resume", ten),
      };
    }
    return {
      title: "Đóng cửa studio",
      confirmButtonLabel: "Đóng cửa studio",
      warning: (
        <p style={{ margin: 0 }}>
          Studio <strong>{orgTen}</strong> sẽ đóng cửa: ẩn khỏi hub/search, khách
          không còn vào được trang. Không thể tự mở lại — chỉ admin CINs khôi
          phục được. Dữ liệu không bị xóa cứng.
        </p>
      ),
      onConfirm: (ten: string) => runLifecycle("close", ten),
    };
  })();

  const isClosed = trangThaiHoatDong === "da_dong_cua";
  const isPaused = trangThaiHoatDong === "tam_ngung";

  return (
    <section className="sps-org" aria-label="Tổ chức">
      <div className="sps-org-status">
        <span className="sps-org-status-label">Trạng thái</span>
        <span
          className={`sps-org-status-badge${
            isClosed ? " is-closed" : isPaused ? " is-paused" : ""
          }`}
        >
          {statusLabel(trangThaiHoatDong)}
        </span>
      </div>

      <div className="sps-org-block">
        <div className="sps-org-block-head">
          <UserCog size={16} strokeWidth={2} aria-hidden />
          <h4 className="sps-org-block-title">Chuyển nhượng</h4>
        </div>
        <p className="sps-org-block-hint">
          Chuyển quyền sở hữu tối đa cho một thành viên đang tham gia. Chỉ chủ
          sở hữu thực hiện được.
        </p>
        {loadingMembers ? (
          <p className="sps-org-muted">Đang tải thành viên…</p>
        ) : transferCandidates.length === 0 ? (
          <p className="sps-org-muted">
            Chưa có thành viên phù hợp để nhận quyền sở hữu. Mời người khác ở
            tab Thành viên trước.
          </p>
        ) : (
          <div className="sps-org-transfer-row">
            <select
              className="sps-org-select"
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
              className="uas-btn ghost sps-org-danger-btn"
              disabled={!transferMemberId || isClosed}
              onClick={() => openDanger("transfer")}
            >
              Chuyển nhượng…
            </button>
          </div>
        )}
      </div>

      <div className="sps-org-block">
        <div className="sps-org-block-head">
          {isPaused ? (
            <PlayCircle size={16} strokeWidth={2} aria-hidden />
          ) : (
            <PauseCircle size={16} strokeWidth={2} aria-hidden />
          )}
          <h4 className="sps-org-block-title">
            {isPaused ? "Mở lại studio" : "Tạm dừng"}
          </h4>
        </div>
        <p className="sps-org-block-hint">
          {isPaused
            ? "Studio đang tạm ngưng — mở lại để hiện trên hub và tìm kiếm."
            : "Ẩn studio khỏi hub và tìm kiếm; trang vẫn xem được kèm thông báo tạm ngưng."}
        </p>
        <button
          type="button"
          className="uas-btn ghost sps-org-danger-btn"
          disabled={isClosed}
          onClick={() => openDanger(isPaused ? "resume" : "pause")}
        >
          {isPaused ? "Mở lại…" : "Tạm dừng…"}
        </button>
      </div>

      <div className="sps-org-block sps-org-block--close">
        <div className="sps-org-block-head">
          <AlertTriangle size={16} strokeWidth={2} aria-hidden />
          <h4 className="sps-org-block-title">Đóng cửa studio</h4>
        </div>
        <p className="sps-org-block-hint">
          Soft đóng cửa — khách không vào trang được. Không xóa dữ liệu cứng.
        </p>
        <button
          type="button"
          className="uas-btn sps-org-close-btn"
          disabled={isClosed}
          onClick={() => openDanger("close")}
        >
          {isClosed ? "Đã đóng cửa" : "Đóng cửa…"}
        </button>
      </div>

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
