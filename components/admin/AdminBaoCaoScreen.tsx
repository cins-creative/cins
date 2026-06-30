"use client";

import { AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import {
  adminLoadBaoCaoDetail,
  adminResolveBaoCao,
} from "@/app/admin/bao-cao/actions";
import {
  KET_QUA_XU_LY_OPTIONS,
  labelLoaiBaoCao,
  TRANG_THAI_BAO_CAO_LABEL,
  type TrangThaiBaoCao,
} from "@/lib/social/bao-cao-constants";
import type { BaoCaoDetailItem, BaoCaoGroup } from "@/lib/social/bao-cao";

type Props = { groups: BaoCaoGroup[] };

const HOT_THRESHOLD = 3;

function groupKey(g: { loaiDoiTuong: string; idDoiTuong: string }) {
  return `${g.loaiDoiTuong}:${g.idDoiTuong}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminBaoCaoScreen({ groups }: Props) {
  const [selected, setSelected] = useState<BaoCaoGroup | null>(null);
  const [detail, setDetail] = useState<BaoCaoDetailItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [ketQua, setKetQua] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function openGroup(g: BaoCaoGroup) {
    setSelected(g);
    setDetail([]);
    setMsg(null);
    setKetQua("");
    setLoadingDetail(true);
    startTransition(async () => {
      const res = await adminLoadBaoCaoDetail(g.loaiDoiTuong, g.idDoiTuong);
      setLoadingDetail(false);
      if (res.ok) setDetail(res.items);
      else setMsg(res.message);
    });
  }

  function resolve(trangThai: Extract<TrangThaiBaoCao, "da_xu_ly" | "bo_qua">) {
    if (!selected) return;
    setMsg(null);
    startTransition(async () => {
      const res = await adminResolveBaoCao({
        loaiDoiTuong: selected.loaiDoiTuong,
        idDoiTuong: selected.idDoiTuong,
        trangThai,
        ketQua,
      });
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      setMsg(
        `Đã xử lý. Đã gửi thông báo tới ${res.soNguoiBaoCao} người báo cáo.`,
      );
    });
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Báo cáo nội dung</h1>
        <p className="page-subtitle">
          Gom theo nội dung bị báo cáo, sắp xếp theo số lượt báo cáo.
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="bc-empty">
          <AlertTriangle size={28} strokeWidth={1.6} aria-hidden />
          <p>Chưa có báo cáo nào.</p>
        </div>
      ) : (
        <div className="bc-layout">
          <div className="bc-list" role="list">
            {groups.map((g) => {
              const active =
                selected && groupKey(selected) === groupKey(g);
              const hot = g.tongSo >= HOT_THRESHOLD;
              return (
                <button
                  type="button"
                  key={groupKey(g)}
                  role="listitem"
                  className={`bc-card${active ? " is-active" : ""}${hot ? " is-hot" : ""}`}
                  onClick={() => openGroup(g)}
                >
                  <span className={`bc-count${hot ? " is-hot" : ""}`}>
                    {g.tongSo}
                    <small>báo cáo</small>
                  </span>
                  <span className="bc-card-main">
                    <span className="bc-card-title">
                      {g.noiDungTieuDe || "(Không có tiêu đề)"}
                    </span>
                    <span className="bc-card-meta">
                      {g.chuSoHuu ? `@${g.chuSoHuu.slug}` : "—"} ·{" "}
                      {g.soMoi > 0 ? `${g.soMoi} mới` : TRANG_THAI_BAO_CAO_LABEL[g.trangThai]}
                    </span>
                    <span className="bc-card-chips">
                      {g.breakdown.map((b) => (
                        <span key={b.loai} className="bc-chip">
                          {labelLoaiBaoCao(b.loai)} · {b.count}
                        </span>
                      ))}
                    </span>
                  </span>
                  <ChevronRight size={16} className="bc-card-chev" aria-hidden />
                </button>
              );
            })}
          </div>

          <div className="bc-detail">
            {!selected ? (
              <div className="bc-detail-empty">
                <p>Chọn một nội dung để xem chi tiết các báo cáo.</p>
              </div>
            ) : (
              <>
                <div className="bc-detail-head">
                  <h2>{selected.noiDungTieuDe || "(Không có tiêu đề)"}</h2>
                  <span className="bc-detail-status">
                    Trạng thái: {TRANG_THAI_BAO_CAO_LABEL[selected.trangThai]}
                  </span>
                </div>

                {loadingDetail ? (
                  <p className="admin-panel-loading">
                    <Loader2 size={14} className="bc-spin" aria-hidden /> Đang tải…
                  </p>
                ) : (
                  <ul className="bc-report-list">
                    {detail.map((it) => (
                      <li key={it.id} className="bc-report">
                        <div className="bc-report-top">
                          <span className="bc-report-loai">
                            {labelLoaiBaoCao(it.loaiBaoCao)}
                          </span>
                          <span className="bc-report-who">
                            {it.nguoiBaoCao
                              ? `${it.nguoiBaoCao.tenHienThi} (@${it.nguoiBaoCao.slug})`
                              : "Ẩn danh"}
                          </span>
                          <span className="bc-report-time">{fmtDate(it.taoLuc)}</span>
                        </div>
                        {it.tieuDe ? (
                          <p className="bc-report-tieude">{it.tieuDe}</p>
                        ) : null}
                        {it.noiDung ? (
                          <p className="bc-report-noidung">{it.noiDung}</p>
                        ) : null}
                        {it.bangChung.length > 0 ? (
                          <div className="bc-report-evidence">
                            {it.bangChung.map((ev, i) =>
                              ev.loai === "anh" ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <a
                                  key={i}
                                  href={ev.value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img src={ev.value} alt="" className="bc-evidence-thumb" />
                                </a>
                              ) : (
                                <a
                                  key={i}
                                  href={ev.value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bc-evidence-link"
                                >
                                  {ev.value}
                                </a>
                              ),
                            )}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="bc-resolve">
                  <label className="bc-resolve-label">Kết quả xử lý (gửi cho người báo cáo)</label>
                  <div className="bc-resolve-presets">
                    {KET_QUA_XU_LY_OPTIONS.map((o) => (
                      <button
                        type="button"
                        key={o.value}
                        className="bc-preset"
                        onClick={() => setKetQua(o.label)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="bc-resolve-text"
                    rows={2}
                    value={ketQua}
                    placeholder="Mô tả kết quả xử lý…"
                    onChange={(e) => setKetQua(e.target.value)}
                  />
                  {msg ? <p className="bc-resolve-msg">{msg}</p> : null}
                  <div className="bc-resolve-actions">
                    <button
                      type="button"
                      className="bc-btn bc-btn-ghost"
                      disabled={pending}
                      onClick={() => resolve("bo_qua")}
                    >
                      Bỏ qua (không vi phạm)
                    </button>
                    <button
                      type="button"
                      className="bc-btn bc-btn-danger"
                      disabled={pending}
                      onClick={() => resolve("da_xu_ly")}
                    >
                      {pending ? (
                        <Loader2 size={14} className="bc-spin" aria-hidden />
                      ) : null}
                      Đánh dấu đã xử lý
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
