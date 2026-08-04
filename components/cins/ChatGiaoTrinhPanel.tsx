"use client";

import { BookOpen, ChevronDown, Lock, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { LOAI_BAI_GIAO_TRINH_LABEL } from "@/lib/to-chuc/khoa-hoc-types";
import type { LoaiBaiGiaoTrinh } from "@/lib/to-chuc/khoa-hoc-types";

type BaiRow = {
  id: string;
  tenBaiTap: string;
  moTa: string | null;
  yeuCau: string | null;
  videoYoutubeUrl: string | null;
  thuocTinh: LoaiBaiGiaoTrinh;
  thuTu: number;
  daMo: boolean;
  moLuc: string | null;
  nopBai: {
    id: string;
    trangThai: string;
    diem: number | null;
    ghiChu: string | null;
    luuLuc: string | null;
    cotMocId: string | null;
    taoLuc: string;
  } | null;
};

type Props = {
  roomId: string;
  canNop: boolean;
  /** Staff xem theo HV */
  hocVienLopId?: string | null;
  onDangJourney?: (nopId: string, tenBai: string) => void;
  onNopBaiHint?: () => void;
};

function statusLabel(b: BaiRow): string {
  if (!b.daMo) return "Chờ mở";
  if (b.nopBai?.cotMocId) return "Đã đăng Journey";
  if (b.nopBai?.luuLuc) return "Đã lưu — Đăng Journey";
  if (b.nopBai?.trangThai === "dat") return "Đạt";
  if (b.nopBai?.trangThai === "lam_lai") return "Làm lại";
  if (b.nopBai?.trangThai === "cho_duyet") return "Chờ duyệt";
  return "Đã mở";
}

export function ChatGiaoTrinhPanel({
  roomId,
  canNop,
  hocVienLopId,
  onDangJourney,
  onNopBaiHint,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bai, setBai] = useState<BaiRow[]>([]);
  const [dongBo, setDongBo] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = hocVienLopId
        ? `?hocVienLopId=${encodeURIComponent(hocVienLopId)}`
        : "";
      const res = await fetch(`/api/chat/rooms/${roomId}/giao-trinh${q}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Không tải được giáo trình.");
        setBai([]);
        return;
      }
      setBai(Array.isArray(data?.bai) ? data.bai : []);
      setDongBo(Boolean(data?.dongBoTienDo));
    } catch {
      setError("Không tải được giáo trình.");
    } finally {
      setLoading(false);
    }
  }, [roomId, hocVienLopId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="cins-chat-side-empty" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Loader2 size={16} className="animate-spin" aria-hidden />
        Đang tải giáo trình…
      </div>
    );
  }

  if (error) {
    return <p className="cins-chat-side-empty">{error}</p>;
  }

  if (bai.length === 0) {
    return (
      <p className="cins-chat-side-empty">
        Trung tâm chưa thiết lập giáo trình cho khóa này.
      </p>
    );
  }

  return (
    <div className="cins-chat-giao-trinh">
      {dongBo ? (
        <p className="cins-chat-side-empty" style={{ marginBottom: 8 }}>
          Lớp đang đồng bộ cùng một tiến độ.
        </p>
      ) : null}
      <ul className="cins-chat-giao-trinh-list" role="list">
        {bai.map((b) => {
          const expanded = openId === b.id;
          const locked = !b.daMo;
          const label =
            LOAI_BAI_GIAO_TRINH_LABEL[b.thuocTinh] ?? b.thuocTinh;
          return (
            <li key={b.id} className={`cins-chat-giao-trinh-item${locked ? " is-locked" : ""}`}>
              <button
                type="button"
                className="cins-chat-giao-trinh-row"
                aria-expanded={expanded}
                onClick={() => setOpenId(expanded ? null : b.id)}
              >
                <span className="cins-chat-giao-trinh-badge">{label}</span>
                <span className="cins-chat-giao-trinh-ten">
                  {locked ? <Lock size={12} aria-hidden /> : <BookOpen size={12} aria-hidden />}{" "}
                  {b.tenBaiTap}
                </span>
                <span className="cins-chat-giao-trinh-status">{statusLabel(b)}</span>
                <ChevronDown
                  size={14}
                  aria-hidden
                  style={{
                    transform: expanded ? "rotate(180deg)" : undefined,
                    transition: "transform .15s",
                  }}
                />
              </button>
              {expanded && !locked ? (
                <div className="cins-chat-giao-trinh-detail">
                  {b.moTa ? <p>{b.moTa}</p> : null}
                  {b.yeuCau ? (
                    <p>
                      <strong>Yêu cầu:</strong> {b.yeuCau}
                    </p>
                  ) : null}
                  {b.videoYoutubeUrl ? (
                    <p>
                      <a href={b.videoYoutubeUrl} target="_blank" rel="noreferrer">
                        Xem video
                      </a>
                    </p>
                  ) : null}
                  {b.nopBai?.ghiChu ? (
                    <p>
                      <em>GV: {b.nopBai.ghiChu}</em>
                    </p>
                  ) : null}
                  {canNop &&
                  ["bai_tap", "kiem_tra", "du_an", "on_tap"].includes(b.thuocTinh) &&
                  !b.nopBai?.luuLuc ? (
                    <button
                      type="button"
                      className="cins-chat-icon-btn"
                      onClick={() => onNopBaiHint?.()}
                    >
                      Nộp bài qua tin nhắn ảnh
                    </button>
                  ) : null}
                  {b.nopBai?.luuLuc && !b.nopBai.cotMocId && onDangJourney ? (
                    <button
                      type="button"
                      className="cins-chat-icon-btn"
                      onClick={() => onDangJourney(b.nopBai!.id, b.tenBaiTap)}
                    >
                      Đăng Journey
                    </button>
                  ) : null}
                  {b.nopBai?.cotMocId ? (
                    <p className="cins-chat-side-empty">Đã đăng Journey.</p>
                  ) : null}
                </div>
              ) : null}
              {expanded && locked ? (
                <div className="cins-chat-giao-trinh-detail">
                  <p className="cins-chat-side-empty">Chưa được mở — chờ giáo viên.</p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
