"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { getCoverUrl } from "@/lib/articles/cover";
import { buildVietQrImageUrl } from "@/lib/shop/vietqr";
import type { BillingHubPayload, CinsDichVu, DichVuNoTong, HoaDon } from "@/lib/billing/types";

import {
  BillingPaySuccessModal,
  type BienNhanUi,
  type PaySuccessSnapshot,
} from "./BillingPaySuccessModal";
import { BillingDongPhiDrawer } from "./BillingDongPhiDrawer";
import "./thanh-toan-hub.css";

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

function fmtTyLePercent(tyLe: number | null | undefined): string | null {
  if (tyLe == null || !Number.isFinite(tyLe)) return null;
  const pct = tyLe * 100;
  const s =
    Math.abs(pct - Math.round(pct)) < 1e-6
      ? String(Math.round(pct))
      : pct.toFixed(1).replace(/\.0$/, "");
  return `${s}%`;
}


function fmtYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

function fmtIsoDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString("vi-VN");
}

const TT_LABEL: Record<HoaDon["trangThai"], string> = {
  chua_chot: "Chưa chốt",
  chua_tra: "Chưa trả",
  da_tra: "Đã trả",
  qua_han: "Quá hạn",
  mien: "Miễn",
};

const LOAI_LABEL: Record<string, string> = {
  csdt_phi: "Phí cơ sở",
  shop_phi: "Phí shop",
  ads: "Ads",
};

const KN_TT: Record<string, string> = {
  mo: "Mở",
  dang_xu_ly: "Đang xử lý",
  da_xu_ly: "Đã xử lý",
  tu_choi: "Từ chối",
};

type SoTrangThaiUi = {
  label: string;
  tone: "ok" | "warn" | "danger";
};

function soTrangThaiUi(hq: DichVuNoTong["heQua"]): SoTrangThaiUi {
  switch (hq?.loai) {
    case "khoa_nhan_don":
      return { label: "Đã khoá nhận đơn", tone: "danger" };
    case "khoa_ghi_danh":
      return { label: "Đã khoá ghi danh", tone: "danger" };
    case "han_che":
      return { label: "Đang hạn chế", tone: "warn" };
    case "canh_bao":
      return { label: "Cần thanh toán", tone: "warn" };
    default:
      return { label: "Hoạt động bình thường", tone: "ok" };
  }
}

function soLoaiBadge(loai: string): string {
  return LOAI_LABEL[loai] ?? loai;
}

function soCongThucLine(
  dv: CinsDichVu,
  phi: BillingHubPayload["phiCongKhai"],
): string {
  if (dv.loai === "shop_phi") {
    const tyLe = fmtTyLePercent(dv.tyLe ?? phi.shopTyLe) ?? "5%";
    const toiThieu = fmtVnd(dv.toiThieuXuatKyVnd ?? phi.shopToiThieuXuatKyVnd);
    return `${tyLe} trên GMV đơn hoàn thành · tối thiểu ${toiThieu}/kỳ`;
  }
  if (dv.loai === "csdt_phi") {
    const tyLe = fmtTyLePercent(dv.tyLe ?? phi.csdtTyLe) ?? "10%";
    const nguong = fmtVnd(dv.nguongChotVnd ?? phi.csdtNguongVnd);
    return `${tyLe} trên doanh thu học phí (sau ngưỡng ${nguong})`;
  }
  return "Phí nền tảng CINs";
}

type Props = {
  initial: BillingHubPayload;
};

export function ThanhToanHubClient({ initial }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hub, setHub] = useState<BillingHubPayload>(initial);
  const [copyFlash, setCopyFlash] = useState<string | null>(null);

  const [tuKhaiBusy, setTuKhaiBusy] = useState(false);
  const [tuKhaiMsg, setTuKhaiMsg] = useState<string | null>(null);
  const [pollWaiting, setPollWaiting] = useState(false);
  const [pollPaidFlash, setPollPaidFlash] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [pollRestartKey, setPollRestartKey] = useState(0);
  const [paySuccessOpen, setPaySuccessOpen] = useState(false);
  const [paySuccessSnap, setPaySuccessSnap] =
    useState<PaySuccessSnapshot | null>(null);
  const [dvFilter, setDvFilter] = useState<string>("all");
  const [dongHoaDonId, setDongHoaDonId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [knOpen, setKnOpen] = useState(false);
  const [knHoaDonId, setKnHoaDonId] = useState("");
  const [knDichVuId, setKnDichVuId] = useState("");
  const [knLoai, setKnLoai] = useState("khong_ghi_nhan");
  const [knNoiDung, setKnNoiDung] = useState("");
  const [knMaGd, setKnMaGd] = useState("");
  const [knAnhIds, setKnAnhIds] = useState<string[]>([]);
  const [knAnhBusy, setKnAnhBusy] = useState(false);
  const [knBusy, setKnBusy] = useState(false);
  const [knMsg, setKnMsg] = useState<string | null>(null);

  const [ttBusy, setTtBusy] = useState(false);
  const [ttMsg, setTtMsg] = useState<string | null>(null);
  const [ttOpen, setTtOpen] = useState(false);
  const [ttTen, setTtTen] = useState(initial.tk?.tenPhapNhan ?? "");
  const [ttMst, setTtMst] = useState(initial.tk?.mst ?? "");
  const [ttDiaChi, setTtDiaChi] = useState(initial.tk?.diaChi ?? "");
  const [ttEmail, setTtEmail] = useState(initial.tk?.emailHoaDon ?? "");
  const [dvEditId, setDvEditId] = useState<string | null>(null);
  const [dvHd, setDvHd] = useState({
    ten: "",
    mst: "",
    diaChi: "",
    email: "",
  });

  function openThongTinXuatHd() {
    setTtTen(hub.tk?.tenPhapNhan ?? "");
    setTtMst(hub.tk?.mst ?? "");
    setTtDiaChi(hub.tk?.diaChi ?? "");
    setTtEmail(hub.tk?.emailHoaDon ?? "");
    setDvEditId(null);
    setTtMsg(null);
    setTtOpen(true);
  }

  function closeThongTinXuatHd() {
    setTtOpen(false);
    setDvEditId(null);
    setTtMsg(null);
  }

  useEffect(() => {
    if (!ttOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeThongTinXuatHd();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [ttOpen]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/tai-khoan/thanh-toan", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as
        | (BillingHubPayload & { error?: string })
        | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải được.");
        return;
      }
      if (json) {
        setHub(json);
        setTtTen(json.tk?.tenPhapNhan ?? "");
        setTtMst(json.tk?.mst ?? "");
        setTtDiaChi(json.tk?.diaChi ?? "");
        setTtEmail(json.tk?.emailHoaDon ?? "");
      }
    } catch {
      setErr("Lỗi mạng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const raw = searchParams.get("dv")?.trim();
    if (!raw) return;
    if (raw === "all") {
      setDvFilter("all");
      return;
    }
    const byId = hub.theoDichVu.find((d) => d.dichVu.id === raw);
    if (byId) {
      setDvFilter(byId.dichVu.id);
      return;
    }
    const byTham = hub.theoDichVu.find((d) => d.dichVu.thamChieuId === raw);
    if (byTham) setDvFilter(byTham.dichVu.id);
  }, [searchParams, hub.theoDichVu]);

  function setDvFilterAndUrl(next: string) {
    setDvFilter(next);
    const sp = new URLSearchParams(searchParams.toString());
    if (next === "all") sp.delete("dv");
    else sp.set("dv", next);
    const q = sp.toString();
    router.replace(q ? `?${q}` : "/tai-khoan/thanh-toan", { scroll: false });
  }

  /** Poll SePay đối soát — 5s, dừng 10 phút / hết nợ / tab ẩn. Plan §5. */
  /* Kỳ đang hiển thị trên panel = kỳ ưu tiên trong sổ đang lọc. */
  const payPeriod = useMemo(() => {
    const inFilter =
      dvFilter === "all"
        ? hub.hoaDon
        : hub.hoaDon.filter((h) => h.idDichVu === dvFilter);
    const owing = inFilter.filter((h) => h.conNoVnd > 0);
    if (owing.length === 0) return null;
    if (dvFilter === "all" && hub.thanhToan.hoaDonId) {
      const server = owing.find((h) => h.id === hub.thanhToan.hoaDonId);
      if (server) return server;
    }
    const today = new Date().toISOString().slice(0, 10);
    return [...owing].sort((a, b) => {
      const aOver = a.hanTra && a.hanTra < today ? 0 : 1;
      const bOver = b.hanTra && b.hanTra < today ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      const aHan = a.hanTra ?? "9999-99-99";
      const bHan = b.hanTra ?? "9999-99-99";
      return aHan < bHan ? -1 : aHan > bHan ? 1 : 0;
    })[0];
  }, [hub.hoaDon, dvFilter, hub.thanhToan.hoaDonId]);

  const payHoaDonId = payPeriod?.id ?? null;
  const payMaThamChieu = payPeriod?.maThamChieu ?? null;
  const payStillOwes = Boolean(
    payHoaDonId && hub.tongNoVnd > 0 && hub.thanhToan.available,
  );

  useEffect(() => {
    if (!payStillOwes || !payHoaDonId) {
      setPollWaiting(false);
      return;
    }

    setPollTimedOut(false);
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const startedAt = Date.now();
    const POLL_MS = 10_000;
    const MAX_MS = 10 * 60 * 1000;
    const maCkPoll = payMaThamChieu?.trim() || null;

    async function tick(): Promise<void> {
      if (cancelled) return;
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      if (Date.now() - startedAt > MAX_MS) {
        setPollTimedOut(true);
        setPollWaiting(false);
        if (timer) clearInterval(timer);
        timer = null;
        return;
      }
      setPollWaiting(true);
      try {
        const res = await fetch("/api/tai-khoan/thanh-toan/poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ hoaDonId: payHoaDonId }),
        });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          conNoVnd?: number;
          trangThai?: string;
          soTienVnd?: number | null;
          conLaiVnd?: number | null;
          nhanLuc?: string | null;
          kyDaTru?: PaySuccessSnapshot["kyDaTru"];
          bienNhan?:
            | { sent: true }
            | { sent: false; reason: string; hint?: string }
            | null;
        } | null;
        if (cancelled || !res.ok || !json?.ok) return;
        if ((json.conNoVnd ?? 1) <= 0 || json.trangThai === "da_tra") {
          setPollPaidFlash(true);
          setPollWaiting(false);
          setPollTimedOut(false);
          if (timer) clearInterval(timer);
          timer = null;
          let bienNhan: BienNhanUi;
          if (!json.bienNhan) bienNhan = { status: "pending" };
          else if (json.bienNhan.sent) bienNhan = { status: "ok" };
          else
            bienNhan = {
              status: "skipped",
              reason: json.bienNhan.reason,
              hint: json.bienNhan.hint,
            };
          const ky = json.kyDaTru ?? [];
          const tongConNoSau = ky.reduce((sum, k) => sum + (k.conNoSau || 0), 0);
          setPaySuccessSnap({
            soTienVnd: json.soTienVnd ?? 0,
            conLaiVnd: json.conLaiVnd ?? 0,
            nhanLuc: json.nhanLuc ?? null,
            maCk: maCkPoll,
            kyDaTru: ky,
            tongConNoSau:
              tongConNoSau > 0 ? tongConNoSau : Math.max(0, json.conNoVnd ?? 0),
            bienNhan,
          });
          setPaySuccessOpen(true);
          await load();
          window.setTimeout(() => setPollPaidFlash(false), 8000);
        }
      } catch {
        /* ignore transient */
      }
    }

    void tick();
    timer = setInterval(() => void tick(), POLL_MS);

    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [payHoaDonId, payMaThamChieu, payStillOwes, load, pollRestartKey]);

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFlash(`Đã copy ${label}`);
      window.setTimeout(() => setCopyFlash(null), 1800);
    } catch {
      setCopyFlash("Không copy được");
    }
  }

  async function submitTuKhai(h: HoaDon) {
    if (h.coTheTuKhai === false) {
      setTuKhaiMsg("Đã hết lượt tự khai — gửi khiếu nại kèm ảnh để được hỗ trợ.");
      setKnOpen(true);
      window.setTimeout(() => {
        document
          .getElementById("billing-khieu-nai")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return;
    }
    setTuKhaiBusy(true);
    setTuKhaiMsg(null);
    try {
      const body =
        h.nguon === "org_phi_ky"
          ? { hoaDonId: h.id, orgId: h.thamChieuId }
          : { hoaDonId: h.id };
      const res = await fetch("/api/tai-khoan/thanh-toan/tu-khai-da-tra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        lyDo?: string;
        goiY?: string;
        anHanDen?: string;
      } | null;
      if (!res.ok) {
        setTuKhaiMsg(json?.error ?? "Không ghi nhận được.");
        if (res.status === 409 || json?.lyDo === "het_luot_tu_khai") {
          setKnOpen(true);
          window.setTimeout(() => {
            document
              .getElementById("billing-khieu-nai")
              ?.scrollIntoView({ behavior: "smooth" });
          }, 50);
        }
        return;
      }
      setTuKhaiMsg(
        "Đã ghi nhận — dịch vụ tạm mở trong cửa sổ ân hạn. CINs sẽ đối soát giao dịch.",
      );
      await load();
    } finally {
      setTuKhaiBusy(false);
    }
  }

  function openKhieuNaiFromTuKhai() {
    setKnOpen(true);
    window.setTimeout(() => {
      document
        .getElementById("billing-khieu-nai")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  async function uploadKnAnh(file: File) {
    if (knAnhIds.length >= 3) {
      setKnMsg("Tối đa 3 ảnh bằng chứng.");
      return;
    }
    setKnAnhBusy(true);
    setKnMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/post-image/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        imageId?: string;
      } | null;
      if (!res.ok || !json?.imageId) {
        setKnMsg(json?.error ?? "Không tải được ảnh.");
        return;
      }
      setKnAnhIds((prev) =>
        prev.includes(json.imageId!) || prev.length >= 3
          ? prev
          : [...prev, json.imageId!],
      );
    } catch {
      setKnMsg("Lỗi mạng khi tải ảnh.");
    } finally {
      setKnAnhBusy(false);
    }
  }

  async function submitKn() {
    setKnBusy(true);
    setKnMsg(null);
    try {
      const res = await fetch("/api/tai-khoan/thanh-toan/khieu-nai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hoaDonId: knHoaDonId || null,
          dichVuId: knDichVuId || null,
          loai: knLoai,
          noiDung: knNoiDung,
          maGiaoDich: knMaGd.trim() || null,
          anhIds: knAnhIds,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        item?: BillingHubPayload["khieuNai"][number];
      } | null;
      if (!res.ok) {
        setKnMsg(json?.error ?? "Không gửi được khiếu nại.");
        return;
      }
      setKnMsg(
        "Đã gửi khiếu nại kèm ảnh — CINs sẽ phản hồi tại đây. Dịch vụ tạm được hoãn khoá trong cửa sổ ân hạn.",
      );
      setKnNoiDung("");
      setKnMaGd("");
      setKnHoaDonId("");
      setKnAnhIds([]);
      setKnOpen(false);
      if (json?.item) {
        setHub((prev) => ({
          ...prev,
          khieuNai: [json.item!, ...prev.khieuNai],
        }));
      } else {
        await load();
      }
    } finally {
      setKnBusy(false);
    }
  }

  async function saveTkThongTin() {
    setTtBusy(true);
    setTtMsg(null);
    try {
      const res = await fetch("/api/tai-khoan/thanh-toan/thong-tin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "tk",
          tenPhapNhan: ttTen,
          mst: ttMst,
          diaChi: ttDiaChi,
          emailHoaDon: ttEmail,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        tk?: BillingHubPayload["tk"];
      } | null;
      if (!res.ok) {
        setTtMsg(json?.error ?? "Không lưu được.");
        return;
      }
      setTtMsg("Đã lưu thông tin mặc định.");
      if (json?.tk) setHub((prev) => ({ ...prev, tk: json.tk! }));
    } finally {
      setTtBusy(false);
    }
  }

  function startEditDv(dv: CinsDichVu) {
    setDvEditId(dv.id);
    setDvHd({
      ten: dv.hdTenPhapNhan ?? "",
      mst: dv.hdMst ?? "",
      diaChi: dv.hdDiaChi ?? "",
      email: dv.hdEmail ?? "",
    });
    setTtMsg(null);
  }

  async function saveDvThongTin() {
    if (!dvEditId) return;
    setTtBusy(true);
    setTtMsg(null);
    try {
      const res = await fetch("/api/tai-khoan/thanh-toan/thong-tin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "dich_vu",
          dichVuId: dvEditId,
          hdTenPhapNhan: dvHd.ten,
          hdMst: dvHd.mst,
          hdDiaChi: dvHd.diaChi,
          hdEmail: dvHd.email,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        dichVu?: CinsDichVu;
      } | null;
      if (!res.ok) {
        setTtMsg(json?.error ?? "Không lưu được.");
        return;
      }
      setTtMsg("Đã lưu bên mua của dòng dịch vụ.");
      setDvEditId(null);
      if (json?.dichVu) {
        const next = json.dichVu;
        setHub((prev) => ({
          ...prev,
          theoDichVu: prev.theoDichVu.map((d) =>
            d.dichVu.id === next.id
              ? {
                  ...d,
                  dichVu: { ...d.dichVu, ...next, tenHienThi: d.dichVu.tenHienThi },
                }
              : d,
          ),
        }));
      }
    } finally {
      setTtBusy(false);
    }
  }

  const { thanhToan } = hub;
  const phi = hub.phiCongKhai ?? {
    shopTyLe: 0.05,
    shopToiThieuXuatKyVnd: 50_000,
    csdtTyLe: 0.1,
    csdtNguongVnd: 2_000_000,
  };
  const showCaiDat = Boolean(hub.tk && hub.canSua);

  const filteredDichVu = useMemo(() => {
    if (dvFilter === "all") return hub.theoDichVu;
    return hub.theoDichVu.filter((d) => d.dichVu.id === dvFilter);
  }, [hub.theoDichVu, dvFilter]);

  const filteredHoaDon = useMemo(() => {
    if (dvFilter === "all") return hub.hoaDon;
    return hub.hoaDon.filter((h) => h.idDichVu === dvFilter);
  }, [hub.hoaDon, dvFilter]);

  const noList = filteredHoaDon.filter((h) => h.conNoVnd > 0);
  const tongNoFiltered = filteredDichVu.reduce((s, d) => s + d.tongNoVnd, 0);
  const hanFiltered =
    filteredDichVu
      .map((d) => d.hanTraGanNhat)
      .filter((x): x is string => Boolean(x))
      .sort()[0] ?? null;
  const dangTichLuyTong = filteredDichVu.reduce(
    (s, d) => s + (d.dangTichLuy?.phiDuKienVnd ?? 0),
    0,
  );
  /** Kỳ ưu tiên trong sổ đang lọc (dùng chung với poll). */
  const uuTienHd = payPeriod;
  const showPayAside = tongNoFiltered > 0 && Boolean(uuTienHd);
  const coShop = hub.theoDichVu.some((d) => d.dichVu.loai === "shop_phi");
  const coCsdt = hub.theoDichVu.some((d) => d.dichVu.loai === "csdt_phi");
  const activeSo =
    dvFilter === "all"
      ? null
      : hub.theoDichVu.find((d) => d.dichVu.id === dvFilter) ?? null;
  /**
   * Thông tin thanh toán hiệu dụng cho kỳ ưu tiên đang chọn.
   * Server chỉ trả một QR (kỳ ưu tiên toàn cục); khi lọc sổ khác,
   * dựng QR client-side theo đúng kỳ (buildVietQrImageUrl client-safe).
   */
  const payInfo = useMemo(() => {
    const bank = thanhToan.bank;
    if (!uuTienHd) {
      return {
        hoaDonId: thanhToan.hoaDonId,
        soTienVnd: thanhToan.soTienVnd,
        maThamChieu: thanhToan.maThamChieu,
        hanTra: thanhToan.hanTra,
        qrUrl: thanhToan.qrUrl,
      };
    }
    /* Trùng kỳ server đã dựng → tái dùng QR server. */
    if (uuTienHd.id === thanhToan.hoaDonId) {
      return {
        hoaDonId: thanhToan.hoaDonId,
        soTienVnd: thanhToan.soTienVnd,
        maThamChieu: thanhToan.maThamChieu,
        hanTra: thanhToan.hanTra,
        qrUrl: thanhToan.qrUrl,
      };
    }
    const qrUrl =
      thanhToan.available && bank?.soTk && uuTienHd.maThamChieu
        ? buildVietQrImageUrl({
            nganHang: bank.bin || bank.ten || "",
            soTaiKhoan: bank.soTk,
            amountVnd: uuTienHd.conNoVnd,
            addInfo: uuTienHd.maThamChieu,
          })
        : null;
    return {
      hoaDonId: uuTienHd.id,
      soTienVnd: uuTienHd.conNoVnd,
      maThamChieu: uuTienHd.maThamChieu,
      hanTra: uuTienHd.hanTra,
      qrUrl,
    };
  }, [uuTienHd, thanhToan]);

  const lede = (() => {
    if (hub.theoDichVu.length === 0) {
      return "Chưa có dòng dịch vụ phí nền tảng. Khi bạn bán hàng hoặc vận hành cơ sở, phí sẽ hiện tại đây.";
    }
    if (activeSo) {
      const dv = activeSo.dichVu;
      if (dv.loai === "shop_phi") {
        return `Phí shop ${dv.tenHienThi || "cửa hàng"} — ${fmtTyLePercent(dv.tyLe ?? phi.shopTyLe) ?? "5%"} GMV đơn hoàn thành. Dưới ${fmtVnd(dv.toiThieuXuatKyVnd ?? phi.shopToiThieuXuatKyVnd)} phí sẽ dồn kỳ sau.`;
      }
      if (dv.loai === "csdt_phi") {
        return `Phí cơ sở ${dv.tenHienThi || ""} — ${fmtTyLePercent(dv.tyLe ?? phi.csdtTyLe) ?? "10%"} doanh thu học phí (sau ngưỡng ${fmtVnd(dv.nguongChotVnd ?? phi.csdtNguongVnd)}).`;
      }
    }
    const parts: string[] = [];
    if (coShop) {
      parts.push(`shop ${fmtTyLePercent(phi.shopTyLe)} GMV`);
    }
    if (coCsdt) {
      parts.push(
        `cơ sở ${fmtTyLePercent(phi.csdtTyLe)} DT học phí (sau ${fmtVnd(phi.csdtNguongVnd)})`,
      );
    }
    return `Phí nền tảng CINs — ${parts.join(" · ")}. Trả sau qua STK CINs.`;
  })();

  if (loading) {
    return (
      <div className="billing-hub" aria-busy="true">
        <div className="billing-hub-loading">
          <Loader2 size={20} className="billing-spin" aria-hidden />
          Đang tải thanh toán…
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="billing-hub">
        <p className="billing-hub-err" role="alert">
          {err}
        </p>
        <button type="button" className="billing-btn" onClick={() => void load()}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="billing-hub">
      <header className="billing-hub-head">
        <div className="billing-hub-title-row">
          <h1 className="billing-hub-title">Thanh toán</h1>
          {showCaiDat ? (
            <button
              type="button"
              className="billing-btn ghost"
              onClick={openThongTinXuatHd}
            >
              Cài đặt thanh toán
            </button>
          ) : null}
        </div>
        <p className="billing-hub-lede">{lede}</p>
      </header>

      <section className="billing-kpi-row" aria-label="Tổng quan nợ">
        <div
          className={
            tongNoFiltered > 0
              ? "billing-kpi billing-kpi--hero"
              : "billing-kpi"
          }
        >
          <span className="billing-kpi-label">Tổng nợ</span>
          <strong
            className={
              tongNoFiltered > 0
                ? "billing-kpi-value danger"
                : "billing-kpi-value"
            }
          >
            {fmtVnd(tongNoFiltered)}
          </strong>
        </div>
        <div className="billing-kpi">
          <span className="billing-kpi-label">Ngày hết hạn</span>
          <strong className="billing-kpi-value">
            {hanFiltered ? fmtYmd(hanFiltered) : "—"}
          </strong>
        </div>
        <div className="billing-kpi">
          <span className="billing-kpi-label">Đang tích luỹ kỳ này</span>
          <strong className="billing-kpi-value">
            {fmtVnd(dangTichLuyTong)}
          </strong>
        </div>
      </section>

      {hub.theoDichVu.length > 1 ? (
        <div className="billing-dv-chips" role="tablist" aria-label="Chọn sổ">
          <button
            type="button"
            role="tab"
            aria-selected={dvFilter === "all"}
            className={
              dvFilter === "all"
                ? "billing-dv-chip is-active"
                : "billing-dv-chip"
            }
            onClick={() => setDvFilterAndUrl("all")}
          >
            Tất cả
          </button>
          {hub.theoDichVu.map((d) => (
            <button
              key={d.dichVu.id}
              type="button"
              role="tab"
              aria-selected={dvFilter === d.dichVu.id}
              className={
                dvFilter === d.dichVu.id
                  ? "billing-dv-chip is-active"
                  : "billing-dv-chip"
              }
              onClick={() => setDvFilterAndUrl(d.dichVu.id)}
            >
              {d.dichVu.tenHienThi ||
                LOAI_LABEL[d.dichVu.loai] ||
                d.dichVu.loai}
              {d.tongNoVnd > 0 ? ` · ${fmtVnd(d.tongNoVnd)}` : ""}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={
          showPayAside ? "billing-layout" : "billing-layout billing-layout--full"
        }
      >
        <div className="billing-layout-main">
          <section id="billing-hoa-don" className="billing-panel" aria-labelledby="billing-hd-title">
        <h2 id="billing-hd-title" className="billing-panel-title">
          Hoá đơn / kỳ phí
        </h2>
        {filteredHoaDon.length === 0 ? (
          <p className="billing-empty">
            Chưa có kỳ phí{dvFilter !== "all" ? " trong sổ này" : ""}.
          </p>
        ) : (
          <div className="billing-table-wrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Dịch vụ</th>
                  <th>Kỳ</th>
                  <th>Doanh thu</th>
                  <th>Tỉ lệ</th>
                  <th>Phí CINs</th>
                  <th>Đã trả</th>
                  <th>Còn nợ</th>
                  <th>Hạn</th>
                  <th>TT</th>
                  <th>Mã CK</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredHoaDon.map((h) => {
                  const pct = fmtTyLePercent(h.tyLe);
                  return (
                    <tr key={`${h.nguon}-${h.id}`}>
                      <td>
                        <div className="billing-td-main">{h.tenDichVu}</div>
                        <div className="billing-td-sub">
                          {LOAI_LABEL[h.loai] ?? h.loai}
                        </div>
                      </td>
                      <td>
                        {fmtYmd(h.tuNgay)} – {fmtYmd(h.denNgay)}
                      </td>
                      <td>
                        {h.doanhThuVnd != null ? fmtVnd(h.doanhThuVnd) : "—"}
                      </td>
                      <td>{pct ?? "—"}</td>
                      <td>
                        <div className="billing-td-main">{fmtVnd(h.soTienVnd)}</div>
                        {h.dieuChinhVnd ? (
                          <div className="billing-td-sub">
                            điều chỉnh {fmtVnd(h.dieuChinhVnd)}
                          </div>
                        ) : null}
                      </td>
                      <td>{fmtVnd(h.daTraVnd)}</td>
                      <td className={h.conNoVnd > 0 ? "danger" : undefined}>
                        {fmtVnd(h.conNoVnd)}
                      </td>
                      <td>{h.hanTra ? fmtYmd(h.hanTra) : "—"}</td>
                      <td>{TT_LABEL[h.trangThai] ?? h.trangThai}</td>
                      <td className="mono">{h.maThamChieu || "—"}</td>
                      <td className="billing-td-actions">
                        <button
                          type="button"
                          className="billing-btn ghost"
                          onClick={() => setDongHoaDonId(h.id)}
                        >
                          Bảng kê
                        </button>
                        {hub.canSua && h.conNoVnd > 0 ? (
                          h.coTheTuKhai === false ? (
                            <button
                              type="button"
                              className="billing-btn ghost"
                              onClick={openKhieuNaiFromTuKhai}
                            >
                              Đã tự khai — mở khiếu nại
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="billing-btn ghost"
                              disabled={tuKhaiBusy}
                              onClick={() => void submitTuKhai(h)}
                            >
                              Đã chuyển
                            </button>
                          )
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {filteredDichVu.length > 0 ? (
        <section
          className="billing-panel billing-so-panel"
          aria-labelledby="billing-so-title"
        >
          <header className="billing-so-head">
            <h2 id="billing-so-title" className="billing-panel-title">
              Phí kỳ đang chạy
            </h2>
            <p className="billing-muted billing-so-lede">
              {activeSo
                ? `Theo dõi phí đang cộng dồn cho ${activeSo.dichVu.tenHienThi || soLoaiBadge(activeSo.dichVu.loai)} — chưa vào hoá đơn cho đến khi chốt kỳ.`
                : "Mỗi cửa hàng / cơ sở có một sổ phí riêng. Số liệu dưới đây là phí đang tích luỹ trong tháng, chưa phải hoá đơn cần trả."}
            </p>
          </header>
          <div className="billing-so-cards">
            {filteredDichVu.map((d) => {
              const tl = d.dangTichLuy;
              const hq = d.heQua;
              const st = soTrangThaiUi(hq);
              const ten =
                d.dichVu.tenHienThi || soLoaiBadge(d.dichVu.loai);
              const tyLePct = fmtTyLePercent(d.dichVu.tyLe);
              const progressPct =
                tl && tl.nguongXuatKyVnd > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (tl.phiDuKienVnd / tl.nguongXuatKyVnd) * 100,
                      ),
                    )
                  : 0;

              return (
                <article
                  key={d.dichVu.id}
                  className={`billing-so-card billing-so-card--${st.tone}`}
                >
                  <div className="billing-so-card-head">
                    <div className="billing-so-card-ident">
                      <h3 className="billing-so-card-name">{ten}</h3>
                      <span className="billing-so-badge">
                        {soLoaiBadge(d.dichVu.loai)}
                      </span>
                    </div>
                    <span
                      className={`billing-so-status billing-so-status--${st.tone}`}
                    >
                      {st.label}
                    </span>
                  </div>

                  <p className="billing-so-formula">
                    {soCongThucLine(d.dichVu, phi)}
                  </p>

                  <dl className="billing-so-metrics">
                    <div className="billing-so-metric">
                      <dt>Nợ cần trả</dt>
                      <dd
                        className={
                          d.tongNoVnd > 0 ? "billing-so-metric-val danger" : undefined
                        }
                      >
                        {fmtVnd(d.tongNoVnd)}
                        {d.soKyNo > 0 ? (
                          <span className="billing-so-metric-sub">
                            {d.soKyNo} kỳ
                          </span>
                        ) : null}
                      </dd>
                    </div>
                    <div className="billing-so-metric">
                      <dt>Phí tích luỹ tháng này</dt>
                      <dd className="billing-so-metric-val">
                        {fmtVnd(tl?.phiDuKienVnd ?? 0)}
                      </dd>
                    </div>
                    <div className="billing-so-metric">
                      <dt>
                        {d.dichVu.loai === "shop_phi"
                          ? "GMV tháng này"
                          : "Doanh thu học phí"}
                      </dt>
                      <dd className="billing-so-metric-val">
                        {fmtVnd(tl?.doanhThuVnd ?? 0)}
                      </dd>
                    </div>
                    <div className="billing-so-metric">
                      <dt>Chốt kỳ dự kiến</dt>
                      <dd className="billing-so-metric-val">
                        {tl?.ngayChotDuKien
                          ? fmtYmd(tl.ngayChotDuKien)
                          : "—"}
                      </dd>
                    </div>
                  </dl>

                  {tl &&
                  d.dichVu.loai === "shop_phi" &&
                  tl.duoiNguong &&
                  tl.nguongXuatKyVnd > 0 ? (
                    <div className="billing-so-progress">
                      <div className="billing-so-progress-head">
                        <span>Tiến độ tối thiểu xuất kỳ</span>
                        <span>
                          {fmtVnd(tl.phiDuKienVnd)} /{" "}
                          {fmtVnd(tl.nguongXuatKyVnd)}
                        </span>
                      </div>
                      <div
                        className="billing-so-progress-bar"
                        role="progressbar"
                        aria-valuenow={progressPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Tiến độ phí tối thiểu xuất kỳ"
                      >
                        <span
                          className="billing-so-progress-fill"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <p className="billing-so-progress-note">
                        Dưới {fmtVnd(tl.nguongXuatKyVnd)} — phí sẽ dồn sang
                        tháng sau, chưa phát hoá đơn.
                      </p>
                    </div>
                  ) : null}

                  {tl &&
                  d.dichVu.loai === "csdt_phi" &&
                  tyLePct &&
                  tl.phiDuKienVnd > 0 ? (
                    <p className="billing-so-csdt-note">
                      Ước tính {tyLePct} × {fmtVnd(tl.doanhThuVnd)} doanh thu
                      đã ghi nhận trong kỳ mở.
                    </p>
                  ) : null}

                  {hq?.moTa ? (
                    <div
                      className={`billing-so-alert billing-so-alert--${st.tone}`}
                      role={st.tone !== "ok" ? "alert" : undefined}
                    >
                      <strong>
                        {st.tone === "ok"
                          ? "Khi quá hạn thanh toán"
                          : "Lưu ý"}
                      </strong>
                      <span>{hq.moTa}</span>
                      {hq.lyDo ? (
                        <span className="billing-so-alert-lydo">
                          ({hq.lyDo})
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {d.quanLyHref ? (
                    <div className="billing-so-foot">
                      <Link
                        href={d.quanLyHref}
                        className="billing-so-manage-link"
                      >
                        Quản lý {ten} →
                      </Link>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

            {hub.canSua && hub.theoDichVu.length > 0 ? (
        <section
          id="billing-khieu-nai"
          className="billing-panel"
          aria-labelledby="billing-kn-title"
        >
          <h2 id="billing-kn-title" className="billing-panel-title">
            Khiếu nại đối soát
          </h2>
          <p className="billing-muted">
            Đã thanh toán nhưng hệ thống chưa ghi nhận? Gửi khiếu nại kèm ảnh
            biên lai / sao kê (1–3 ảnh).
          </p>
          {knMsg ? (
            <p className="billing-flash" role="status">
              {knMsg}
            </p>
          ) : null}
          {!knOpen ? (
            <button
              type="button"
              className="billing-btn"
              onClick={() => {
                setKnOpen(true);
                const unpaid =
                  hub.hoaDon.find(
                    (h) =>
                      h.conNoVnd > 0 &&
                      (h.trangThai === "chua_tra" || h.trangThai === "qua_han"),
                  ) ?? null;
                setKnHoaDonId(unpaid?.id ?? hub.thanhToan.hoaDonId ?? "");
                setKnDichVuId(
                  unpaid?.idDichVu ?? hub.theoDichVu[0]?.dichVu.id ?? "",
                );
                setKnAnhIds([]);
              }}
            >
              Khiếu nại kèm ảnh
            </button>
          ) : (
            <div className="billing-form">
              <label className="billing-label">
                Kỳ / hoá đơn
                <select
                  className="billing-input"
                  value={knHoaDonId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setKnHoaDonId(id);
                    const h = hub.hoaDon.find((x) => x.id === id);
                    if (h?.idDichVu) setKnDichVuId(h.idDichVu);
                  }}
                >
                  <option value="">— Chọn kỳ còn nợ —</option>
                  {hub.hoaDon
                    .filter(
                      (h) =>
                        h.conNoVnd > 0 ||
                        h.trangThai === "chua_tra" ||
                        h.trangThai === "qua_han",
                    )
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {LOAI_LABEL[h.loai] ?? h.loai} ·{" "}
                        {h.maThamChieu || h.id.slice(0, 8)} · {fmtVnd(h.conNoVnd)}
                      </option>
                    ))}
                </select>
              </label>
              {!knHoaDonId ? (
                <label className="billing-label">
                  Dòng dịch vụ
                  <select
                    className="billing-input"
                    value={knDichVuId}
                    onChange={(e) => setKnDichVuId(e.target.value)}
                  >
                    {hub.theoDichVu.map((d) => (
                      <option key={d.dichVu.id} value={d.dichVu.id}>
                        {d.dichVu.tenHienThi ||
                          LOAI_LABEL[d.dichVu.loai] ||
                          d.dichVu.loai}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="billing-label">
                Loại vấn đề
                <select
                  className="billing-input"
                  value={knLoai}
                  onChange={(e) => setKnLoai(e.target.value)}
                >
                  <option value="khong_ghi_nhan">Không ghi nhận CK</option>
                  <option value="sai_so_tien">Sai số tiền</option>
                  <option value="trung_lap">Trùng / nhầm kỳ</option>
                  <option value="khac">Khác</option>
                </select>
              </label>
              <label className="billing-label">
                Mã giao dịch ngân hàng (không bắt buộc)
                <input
                  className="billing-input"
                  value={knMaGd}
                  onChange={(e) => setKnMaGd(e.target.value)}
                  placeholder="VD. FT…"
                />
              </label>
              <label className="billing-label">
                Nội dung
                <textarea
                  className="billing-input"
                  rows={3}
                  value={knNoiDung}
                  onChange={(e) => setKnNoiDung(e.target.value)}
                  placeholder="Đã CK lúc …, số tiền …, nội dung chuyển khoản …"
                />
              </label>
              <div className="billing-label">
                Ảnh bằng chứng (1–3)
                <div className="billing-kn-anh">
                  {knAnhIds.map((id) => {
                    const src = getCoverUrl(id, "public");
                    return (
                      <div key={id} className="billing-kn-anh-item">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src ?? ""} alt="" width={72} height={72} />
                        <button
                          type="button"
                          className="billing-btn ghost"
                          onClick={() =>
                            setKnAnhIds((prev) => prev.filter((x) => x !== id))
                          }
                        >
                          Gỡ
                        </button>
                      </div>
                    );
                  })}
                  {knAnhIds.length < 3 ? (
                    <label className="billing-kn-anh-add">
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        disabled={knAnhBusy || knBusy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) void uploadKnAnh(f);
                        }}
                      />
                      {knAnhBusy ? "Đang tải…" : "+ Thêm ảnh"}
                    </label>
                  ) : null}
                </div>
              </div>
              <div className="billing-pt-add">
                <button
                  type="button"
                  className="billing-btn"
                  disabled={
                    knBusy ||
                    knAnhBusy ||
                    knNoiDung.trim().length < 10 ||
                    knAnhIds.length < 1 ||
                    (!knHoaDonId && !knDichVuId)
                  }
                  onClick={() => void submitKn()}
                >
                  {knBusy ? "Đang gửi…" : "Gửi khiếu nại"}
                </button>
                <button
                  type="button"
                  className="billing-btn ghost"
                  disabled={knBusy}
                  onClick={() => setKnOpen(false)}
                >
                  Huỷ
                </button>
              </div>
            </div>
          )}
          {hub.khieuNai.length > 0 ? (
            <ul className="billing-kn-list">
              {hub.khieuNai.map((k) => (
                <li key={k.nguon + "-" + k.id} className="billing-kn-item">
                  <div className="billing-td-main">
                    {k.tenDichVu || LOAI_LABEL[k.loai] || "Dịch vụ"} ·{" "}
                    {KN_TT[k.trangThai] ?? k.trangThai}
                  </div>
                  <div className="billing-td-sub">
                    {fmtIsoDate(k.taoLuc)}
                    {k.maGiaoDich ? " · GD " + k.maGiaoDich : ""}
                  </div>
                  <p className="billing-kn-body">{k.noiDung}</p>
                  {k.anhIds?.length > 0 ? (
                    <div className="billing-kn-anh billing-kn-anh--readonly">
                      {k.anhIds.map((id) => {
                        const src = getCoverUrl(id, "public");
                        return src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={id}
                            src={src}
                            alt="Bằng chứng"
                            width={64}
                            height={64}
                          />
                        ) : null;
                      })}
                    </div>
                  ) : null}
                  {k.phanHoiAdmin ? (
                    <p className="billing-kn-reply">
                      Phản hồi CINs: {k.phanHoiAdmin}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
        </div>

        {showPayAside ? (
        <aside className="billing-layout-aside">
            <section
              className="billing-panel billing-pay"
              aria-labelledby="billing-pay-title"
            >
              <h2 id="billing-pay-title" className="billing-panel-title">
                Thanh toán
              </h2>
              {!thanhToan.available ? (
                <p className="billing-muted">
                  CINs chưa cấu hình STK nhận phí — tạm hoãn quá hạn. Liên hệ hỗ
                  trợ nếu bạn cần chuyển khoản gấp.
                </p>
              ) : (
                <>
                  {copyFlash ? (
                    <p className="billing-flash" role="status">
                      {copyFlash}
                    </p>
                  ) : null}
                  {tuKhaiMsg ? (
                    <p className="billing-flash" role="status">
                      {tuKhaiMsg}
                    </p>
                  ) : null}
                  <div className="billing-pay-body">
                    <dl className="billing-pay-dl">
                      <div>
                        <dt>Ngân hàng</dt>
                        <dd>{thanhToan.bank?.ten || "—"}</dd>
                      </div>
                      <div>
                        <dt>Số TK</dt>
                        <dd>
                          <button
                            type="button"
                            className="billing-copy"
                            onClick={() =>
                              void copyText(
                                "STK",
                                thanhToan.bank?.soTk?.trim() || "",
                              )
                            }
                          >
                            {thanhToan.bank?.soTk || "—"}
                          </button>
                        </dd>
                      </div>
                      <div>
                        <dt>Chủ TK</dt>
                        <dd>{thanhToan.bank?.chuTk || "—"}</dd>
                      </div>
                      <div>
                        <dt>Số tiền</dt>
                        <dd>
                          <button
                            type="button"
                            className="billing-copy"
                            onClick={() =>
                              void copyText(
                                "số tiền",
                                String(payInfo.soTienVnd ?? 0),
                              )
                            }
                          >
                            {payInfo.soTienVnd != null
                              ? fmtVnd(payInfo.soTienVnd)
                              : "—"}
                          </button>
                        </dd>
                      </div>
                      <div>
                        <dt>Nội dung CK</dt>
                        <dd>
                          <button
                            type="button"
                            className="billing-copy mono"
                            onClick={() =>
                              void copyText(
                                "mã CK",
                                payInfo.maThamChieu?.trim() || "",
                              )
                            }
                          >
                            {payInfo.maThamChieu || "—"}
                          </button>
                        </dd>
                      </div>
                      {payInfo.hanTra ? (
                        <div>
                          <dt>Hạn trả</dt>
                          <dd>{fmtYmd(payInfo.hanTra)}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {payInfo.qrUrl ? (
                      <div className="billing-qr">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={payInfo.qrUrl}
                          alt="QR chuyển khoản phí CINs"
                          width={200}
                          height={200}
                        />
                      </div>
                    ) : null}
                    {pollPaidFlash ? (
                      <div className="billing-poll billing-poll--paid" role="status">
                        <span className="billing-poll-dot" aria-hidden />
                        Đã nhận thanh toán
                      </div>
                    ) : pollWaiting ? (
                      <div className="billing-poll" role="status">
                        <span
                          className="billing-poll-dot billing-poll-dot--pulse"
                          aria-hidden
                        />
                        Đang chờ xác nhận thanh toán…
                      </div>
                    ) : pollTimedOut ? (
                      <div className="billing-poll billing-poll--timeout">
                        <p className="billing-note">
                          Chưa thấy giao dịch sau 10 phút. Nếu bạn đã chuyển
                          khoản, dùng «Tôi đã chuyển rồi» hoặc gửi khiếu nại kèm
                          ảnh bằng chứng.
                        </p>
                        <div className="billing-poll-timeout-actions">
                          <button
                            type="button"
                            className="billing-btn ghost"
                            onClick={() => setPollRestartKey((k) => k + 1)}
                          >
                            Kiểm tra lại
                          </button>
                          <button
                            type="button"
                            className="billing-btn"
                            onClick={() => {
                              setKnOpen(true);
                              window.setTimeout(() => {
                                document
                                  .getElementById("billing-khieu-nai")
                                  ?.scrollIntoView({ behavior: "smooth" });
                              }, 50);
                            }}
                          >
                            Khiếu nại kèm ảnh
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {hub.canSua && uuTienHd && !pollPaidFlash ? (
                    <div className="billing-pay-actions">
                      {uuTienHd.coTheTuKhai === false ? (
                        <>
                          <button
                            type="button"
                            className="billing-btn"
                            onClick={openKhieuNaiFromTuKhai}
                          >
                            Đã tự khai — mở khiếu nại
                          </button>
                          <p className="billing-note">
                            Đã dùng hết lượt tự khai. Gửi khiếu nại kèm ảnh nếu
                            tiền đã về mà hệ thống chưa ghi nhận.
                          </p>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="billing-btn"
                            disabled={tuKhaiBusy}
                            onClick={() => {
                              if (uuTienHd) void submitTuKhai(uuTienHd);
                            }}
                          >
                            {tuKhaiBusy ? "Đang ghi…" : "Tôi đã chuyển rồi"}
                          </button>
                          <p className="billing-note">
                            Tạm mở rào trong cửa sổ ân hạn (1 lần / hoá đơn)
                            trong khi CINs đối soát.
                          </p>
                        </>
                      )}
                    </div>
                  ) : null}
                  {noList.some((h) => h.nguon === "shop_phi_ky") ? (
                    <p className="billing-note">
                      Mã CK kỳ shop hiện là mã tạm (P1). Đối soát tự động shop sẽ
                      hoàn thiện ở bước hoá đơn hợp nhất.
                    </p>
                  ) : null}
                </>
              )}
            </section>
        </aside>
        ) : null}
      </div>

      {ttOpen && hub.canSua && hub.tk
        ? createPortal(
            <div
              className="billing-dialog-root"
              role="presentation"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeThongTinXuatHd();
              }}
            >
              <div
                className="billing-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="billing-tt-dialog-title"
              >
            <div className="billing-dialog-head">
              <h2 id="billing-tt-dialog-title" className="billing-panel-title">
                Cài đặt thanh toán
              </h2>
              <button
                type="button"
                className="billing-btn ghost"
                onClick={closeThongTinXuatHd}
              >
                Đóng
              </button>
            </div>
            <p className="billing-muted">
              Thông tin xuất hoá đơn — mặc định dùng cho mọi dòng dịch vụ. Có
              thể khai riêng pháp nhân từng cơ sở / shop bên dưới (để công ty
              hạch toán chi phí).
            </p>
            {ttMsg ? (
              <p className="billing-flash" role="status">
                {ttMsg}
              </p>
            ) : null}
            <h3 className="billing-subhead">Mặc định tài khoản</h3>
            <div className="billing-form billing-form--grid">
              <label className="billing-label">
                Tên pháp nhân / cá nhân
                <input
                  className="billing-input"
                  value={ttTen}
                  onChange={(e) => setTtTen(e.target.value)}
                  disabled={ttBusy}
                />
              </label>
              <label className="billing-label">
                MST
                <input
                  className="billing-input"
                  value={ttMst}
                  onChange={(e) => setTtMst(e.target.value)}
                  disabled={ttBusy}
                />
              </label>
              <label className="billing-label">
                Địa chỉ
                <input
                  className="billing-input"
                  value={ttDiaChi}
                  onChange={(e) => setTtDiaChi(e.target.value)}
                  disabled={ttBusy}
                />
              </label>
              <label className="billing-label">
                Email nhận hoá đơn
                <input
                  className="billing-input"
                  type="email"
                  value={ttEmail}
                  onChange={(e) => setTtEmail(e.target.value)}
                  disabled={ttBusy}
                />
              </label>
              <button
                type="button"
                className="billing-btn"
                disabled={ttBusy}
                onClick={() => void saveTkThongTin()}
              >
                Lưu mặc định
              </button>
            </div>

            {hub.theoDichVu.length > 0 ? (
              <div className="billing-dv-hd">
                <h3 className="billing-subhead">Theo dòng dịch vụ</h3>
                <ul className="billing-dv-list">
                  {hub.theoDichVu.map((d) => (
                    <li
                      key={d.dichVu.id}
                      className="billing-dv-item billing-dv-item--col"
                    >
                      <div className="billing-dv-item-row">
                        <div>
                          <div className="billing-dv-name">
                            {d.dichVu.tenHienThi ||
                              LOAI_LABEL[d.dichVu.loai]}
                          </div>
                          <div className="billing-dv-meta">
                            {d.dichVu.hdTenPhapNhan ||
                            d.dichVu.hdMst ||
                            d.dichVu.hdEmail
                              ? [
                                  d.dichVu.hdTenPhapNhan,
                                  d.dichVu.hdMst
                                    ? `MST ${d.dichVu.hdMst}`
                                    : null,
                                  d.dichVu.hdEmail,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")
                              : "Dùng thông tin mặc định"}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="billing-btn ghost"
                          disabled={ttBusy}
                          onClick={() => startEditDv(d.dichVu)}
                        >
                          Sửa
                        </button>
                      </div>
                      {dvEditId === d.dichVu.id ? (
                        <div className="billing-form billing-form--grid">
                          <label className="billing-label">
                            Tên pháp nhân
                            <input
                              className="billing-input"
                              value={dvHd.ten}
                              onChange={(e) =>
                                setDvHd((p) => ({
                                  ...p,
                                  ten: e.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="billing-label">
                            MST
                            <input
                              className="billing-input"
                              value={dvHd.mst}
                              onChange={(e) =>
                                setDvHd((p) => ({
                                  ...p,
                                  mst: e.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="billing-label">
                            Địa chỉ
                            <input
                              className="billing-input"
                              value={dvHd.diaChi}
                              onChange={(e) =>
                                setDvHd((p) => ({
                                  ...p,
                                  diaChi: e.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="billing-label">
                            Email
                            <input
                              className="billing-input"
                              value={dvHd.email}
                              onChange={(e) =>
                                setDvHd((p) => ({
                                  ...p,
                                  email: e.target.value,
                                }))
                              }
                            />
                          </label>
                          <div className="billing-pt-add">
                            <button
                              type="button"
                              className="billing-btn"
                              disabled={ttBusy}
                              onClick={() => void saveDvThongTin()}
                            >
                              Lưu dòng này
                            </button>
                            <button
                              type="button"
                              className="billing-btn ghost"
                              disabled={ttBusy}
                              onClick={() => setDvEditId(null)}
                            >
                              Huỷ
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>,
            document.body,
          )
        : null}

      <BillingDongPhiDrawer
        hoaDonId={dongHoaDonId}
        onClose={() => setDongHoaDonId(null)}
      />

      <BillingPaySuccessModal
        open={paySuccessOpen}
        snapshot={paySuccessSnap}
        onClose={() => setPaySuccessOpen(false)}
        onOpenCaiDat={() => {
          setPaySuccessOpen(false);
          openThongTinXuatHd();
        }}
        onXemSo={() => {
          setPaySuccessOpen(false);
          document
            .getElementById("billing-hoa-don")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <p className="billing-foot">
        <Link href="/">← Về trang chủ</Link>
      </p>
    </div>
  );
}
