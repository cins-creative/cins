"use client";

import { useCallback, useEffect, useState } from "react";

import { getCoverUrl } from "@/lib/articles/cover";
import { CINS_BANK_OPTIONS } from "@/lib/cins/tai-chinh-banks";
import { AdminPhiThongBaoPanel } from "@/components/admin/AdminPhiThongBaoPanel";

import "@/components/admin/admin-tai-chinh.css";

type KnItem = {
  id: string;
  idHoaDon: string | null;
  idDichVu: string | null;
  loai: string;
  noiDung: string;
  maGiaoDich: string | null;
  soTienKhai: number | null;
  anhIds: string[];
  trangThai: string;
  phanHoiAdmin: string | null;
  taoLuc: string;
  tenDichVu: string | null;
};

type TuKhaiItem = {
  id: string;
  loai: string;
  tenDichVu: string | null;
  maThamChieu: string;
  conNoVnd: number;
  trangThai: string;
  hanTra: string | null;
  tuKhaiDaTraLuc: string;
  tuKhaiLan: number;
  anHanHieuLuc: boolean;
  anHanDenIso: string | null;
};

type CauHinh = {
  id: string;
  csdt: {
    tyLe: number;
    nguongVnd: number;
    soNgayHanTra: number;
    nguongEgressGb: number | null;
  };
  shop: {
    tyLe: number;
    nguongVnd: number;
    toiThieuXuatKyVnd: number;
    soNgayHanTra: number;
    soNgayAnHanTuKhai: number;
    dongDon: {
      ngayKhaoSatSuKien: number;
      ngayKhaoSatTrucTiep: number;
      ngayKhaoSatOnline: number;
      ngayTuDongSuKien: number;
      ngayTuDongTrucTiep: number;
      ngayTuDongOnline: number;
      ngayTuDongOnlineKhongMa: number;
      soLanChoHoan: number;
      ngayHoanChuaNhan: number;
    };
    buyerLimit: {
      toiDaDonChoXacNhan: number;
      toiDaDonChoXacNhanMoiShop: number;
      toiDaDonMoiNgay: number;
    };
  };
  bank: {
    ten: string | null;
    soTk: string | null;
    chuTk: string | null;
    bin: string | null;
  };
  doanhNghiep: {
    tenPhapNhan: string | null;
    mst: string | null;
    diaChi: string | null;
    nguoiDaiDien: string | null;
    emailHoaDon: string | null;
  };
  xuatHoaDonBat: boolean;
  ghiChu: string | null;
  capNhatBoi: string | null;
  capNhatLuc: string;
};

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function fmtLuc(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  } catch {
    return iso;
  }
}

type Props = { canEdit: boolean };

type TabId =
  | "csdt"
  | "shop"
  | "nhan-tien"
  | "khieu-nai"
  | "tu-khai"
  | "lich-su";

const TABS: { id: TabId; label: string; hint: string }[] = [
  {
    id: "csdt",
    label: "Phí CSĐT",
    hint: "Tỷ lệ, ngưỡng kích hoạt và hạn trả của cơ sở đào tạo",
  },
  {
    id: "shop",
    label: "Shop",
    hint: "Phí GMV, lịch đóng đơn và giới hạn đặt hàng",
  },
  {
    id: "nhan-tien",
    label: "Nhận tiền & HĐ",
    hint: "STK VietQR nhận phí nền tảng và pháp nhân xuất hóa đơn",
  },
  {
    id: "khieu-nai",
    label: "Khiếu nại",
    hint: "Đối soát thanh toán user gửi từ hub",
  },
  {
    id: "tu-khai",
    label: "Tự khai",
    hint: "Shop/cơ sở tự khai đã trả — chờ đối soát SePay hoặc bác để khoá",
  },
  {
    id: "lich-su",
    label: "Lịch sử",
    hint: "Mọi lần lưu tạo dòng mới — không ghi đè",
  },
];

export function AdminTaiChinhScreen({ canEdit }: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("csdt");
  const [cauHinh, setCauHinh] = useState<CauHinh | null>(null);
  const [lichSu, setLichSu] = useState<CauHinh[]>([]);
  const [knItems, setKnItems] = useState<KnItem[]>([]);
  const [knCanEdit, setKnCanEdit] = useState(false);
  const [knPhanHoi, setKnPhanHoi] = useState<Record<string, string>>({});
  const [knBusyId, setKnBusyId] = useState<string | null>(null);
  const [tkItems, setTkItems] = useState<TuKhaiItem[]>([]);
  const [tkCanEdit, setTkCanEdit] = useState(false);
  const [tkBusyId, setTkBusyId] = useState<string | null>(null);

  const [tyLePercent, setTyLePercent] = useState("10");
  const [nguongVnd, setNguongVnd] = useState("2000000");
  const [soNgayHan, setSoNgayHan] = useState("7");
  const [ghiChuTyLe, setGhiChuTyLe] = useState("");

  const [shopTyLePercent, setShopTyLePercent] = useState("5");
  const [shopToiThieu, setShopToiThieu] = useState("50000");
  const [shopNguong, setShopNguong] = useState("0");
  const [ghiChuShop, setGhiChuShop] = useState("");

  const [ddKhaoSuKien, setDdKhaoSuKien] = useState("1");
  const [ddKhaoTrucTiep, setDdKhaoTrucTiep] = useState("3");
  const [ddKhaoOnline, setDdKhaoOnline] = useState("7");
  const [ddTuDongSuKien, setDdTuDongSuKien] = useState("3");
  const [ddTuDongTrucTiep, setDdTuDongTrucTiep] = useState("7");
  const [ddTuDongOnline, setDdTuDongOnline] = useState("14");
  const [ddTuDongOnlineKhongMa, setDdTuDongOnlineKhongMa] = useState("21");
  const [ddSoLanHoan, setDdSoLanHoan] = useState("2");
  const [ddNgayHoan, setDdNgayHoan] = useState("7");
  const [ghiChuDongDon, setGhiChuDongDon] = useState("");

  const [blChoXn, setBlChoXn] = useState("10");
  const [blChoXnShop, setBlChoXnShop] = useState("3");
  const [blMoiNgay, setBlMoiNgay] = useState("20");
  const [ghiChuBuyerLimit, setGhiChuBuyerLimit] = useState("");

  const [egressGb, setEgressGb] = useState("");

  const [bankBin, setBankBin] = useState("");
  const [bankSoTk, setBankSoTk] = useState("");
  const [bankChuTk, setBankChuTk] = useState("");

  const [dnTen, setDnTen] = useState("");
  const [dnMst, setDnMst] = useState("");
  const [dnDiaChi, setDnDiaChi] = useState("");
  const [dnNguoi, setDnNguoi] = useState("");
  const [dnEmail, setDnEmail] = useState("");
  const [xuatHd, setXuatHd] = useState(false);

  const applyCauHinh = useCallback((c: CauHinh) => {
    setCauHinh(c);
    setTyLePercent(String(Number((c.csdt.tyLe * 100).toFixed(2))));
    setNguongVnd(String(c.csdt.nguongVnd));
    setSoNgayHan(String(c.csdt.soNgayHanTra));
    setShopTyLePercent(
      String(Number(((c.shop?.tyLe ?? 0.05) * 100).toFixed(2))),
    );
    setShopToiThieu(String(c.shop?.toiThieuXuatKyVnd ?? 50_000));
    setShopNguong(String(c.shop?.nguongVnd ?? 0));
    const dd = c.shop?.dongDon;
    setDdKhaoSuKien(String(dd?.ngayKhaoSatSuKien ?? 1));
    setDdKhaoTrucTiep(String(dd?.ngayKhaoSatTrucTiep ?? 3));
    setDdKhaoOnline(String(dd?.ngayKhaoSatOnline ?? 7));
    setDdTuDongSuKien(String(dd?.ngayTuDongSuKien ?? 3));
    setDdTuDongTrucTiep(String(dd?.ngayTuDongTrucTiep ?? 7));
    setDdTuDongOnline(String(dd?.ngayTuDongOnline ?? 14));
    setDdTuDongOnlineKhongMa(String(dd?.ngayTuDongOnlineKhongMa ?? 21));
    setDdSoLanHoan(String(dd?.soLanChoHoan ?? 2));
    setDdNgayHoan(String(dd?.ngayHoanChuaNhan ?? 7));
    const bl = c.shop?.buyerLimit;
    setBlChoXn(String(bl?.toiDaDonChoXacNhan ?? 10));
    setBlChoXnShop(String(bl?.toiDaDonChoXacNhanMoiShop ?? 3));
    setBlMoiNgay(String(bl?.toiDaDonMoiNgay ?? 20));
    setEgressGb(
      c.csdt.nguongEgressGb == null ? "" : String(c.csdt.nguongEgressGb),
    );
    setBankBin(c.bank.bin ?? "");
    setBankSoTk(c.bank.soTk ?? "");
    setBankChuTk(c.bank.chuTk ?? "");
    setDnTen(c.doanhNghiep.tenPhapNhan ?? "");
    setDnMst(c.doanhNghiep.mst ?? "");
    setDnDiaChi(c.doanhNghiep.diaChi ?? "");
    setDnNguoi(c.doanhNghiep.nguoiDaiDien ?? "");
    setDnEmail(c.doanhNghiep.emailHoaDon ?? "");
    setXuatHd(c.xuatHoaDonBat);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/tai-chinh", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        cauHinh?: CauHinh;
        lichSu?: CauHinh[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải được cấu hình.");
        return;
      }
      if (json?.cauHinh) applyCauHinh(json.cauHinh);
      setLichSu(json?.lichSu ?? []);
    } catch {
      setErr("Lỗi mạng khi tải cấu hình.");
    } finally {
      setLoading(false);
    }
  }, [applyCauHinh]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadKn = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tai-chinh/khieu-nai", {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        items?: KnItem[];
        canEdit?: boolean;
      } | null;
      if (res.ok) {
        setKnItems(json?.items ?? []);
        setKnCanEdit(Boolean(json?.canEdit));
      }
    } catch {
      /* ignore — khối phụ */
    }
  }, []);

  useEffect(() => {
    void loadKn();
  }, [loadKn]);

  const loadTuKhai = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tai-chinh/tu-khai", {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        items?: TuKhaiItem[];
        canEdit?: boolean;
      } | null;
      if (res.ok) {
        setTkItems(json?.items ?? []);
        setTkCanEdit(Boolean(json?.canEdit));
      }
    } catch {
      /* ignore — khối phụ */
    }
  }, []);

  useEffect(() => {
    void loadTuKhai();
  }, [loadTuKhai]);

  async function xuLyTuKhai(hoaDonId: string, action: "gan" | "bac") {
    if (!tkCanEdit) {
      setErr("Chỉ Admin tối cao được xử lý tự khai.");
      return;
    }
    if (action === "bac") {
      const ok = window.confirm(
        "Bác tự khai và khoá ngay? Cửa sổ ân hạn sẽ bị xoá; shop/cơ sở bị khoá nếu còn nợ quá hạn.",
      );
      if (!ok) return;
    }
    setTkBusyId(hoaDonId);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/tai-chinh/tu-khai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hoaDonId, action }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        synced?: boolean;
        message?: string;
        trangThaiMoi?: string | null;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không xử lý được tự khai.");
        return;
      }
      if (action === "bac") {
        setMsg(
          json?.trangThaiMoi
            ? `Đã bác tự khai — gate: ${json.trangThaiMoi}.`
            : "Đã bác tự khai — cửa sổ ân hạn đã xoá.",
        );
      } else if (json?.synced) {
        setMsg("Đã gán giao dịch SePay — nợ đã cập nhật.");
      } else {
        setErr(
          json?.message ??
            "Chưa tìm thấy giao dịch khớp mã CK trong log SePay.",
        );
      }
      await loadTuKhai();
    } finally {
      setTkBusyId(null);
    }
  }

  async function xuLyKn(
    id: string,
    trangThai: "dang_xu_ly" | "da_xu_ly" | "tu_choi",
  ) {
    if (!knCanEdit) {
      setErr("Chỉ Admin tối cao được xử lý khiếu nại.");
      return;
    }
    setKnBusyId(id);
    setErr(null);
    try {
      const res = await fetch("/api/admin/tai-chinh/khieu-nai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          trangThai,
          phanHoiAdmin: knPhanHoi[id]?.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không cập nhật khiếu nại.");
        return;
      }
      setMsg(
        trangThai === "da_xu_ly"
          ? "Đã xử lý khiếu nại."
          : trangThai === "tu_choi"
            ? "Đã từ chối khiếu nại."
            : "Đã chuyển đang xử lý.",
      );
      await loadKn();
    } finally {
      setKnBusyId(null);
    }
  }

  async function save(khoi: string, body: Record<string, unknown>) {
    if (!canEdit) {
      setErr("Chỉ Admin tối cao được sửa.");
      return;
    }
    setBusy(khoi);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/tai-chinh", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ khoi, ...body }),
      });
      const json = (await res.json().catch(() => null)) as {
        cauHinh?: CauHinh;
        lichSu?: CauHinh[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không lưu được.");
        return;
      }
      if (json?.cauHinh) applyCauHinh(json.cauHinh);
      if (json?.lichSu) setLichSu(json.lichSu);
      if (khoi === "ty_le") setGhiChuTyLe("");
      if (khoi === "shop") setGhiChuShop("");
      if (khoi === "dong_don") setGhiChuDongDon("");
      if (khoi === "buyer_limit") setGhiChuBuyerLimit("");
      setMsg("Đã lưu — tạo dòng lịch sử mới. Kỳ/dòng phí cũ không đổi.");
    } finally {
      setBusy(null);
    }
  }

  function saveTyLe() {
    const pct = Number(String(tyLePercent).replace(",", "."));
    const ng = Number(String(nguongVnd).replace(/[,\s.]/g, ""));
    const sn = Number(soNgayHan);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setErr("Tỷ lệ % phải từ 0 đến 100.");
      return;
    }
    if (!Number.isFinite(ng) || ng < 0) {
      setErr("Ngưỡng kích hoạt không hợp lệ.");
      return;
    }
    if (!Number.isFinite(sn) || sn < 0) {
      setErr("Số ngày hạn trả không hợp lệ.");
      return;
    }
    if (!ghiChuTyLe.trim()) {
      setErr("Đổi tỷ lệ/ngưỡng bắt buộc ghi chú lý do.");
      return;
    }
    void save("ty_le", {
      tyLePercent: pct,
      csdtNguongVnd: ng,
      csdtSoNgayHanTra: sn,
      ghiChu: ghiChuTyLe.trim(),
    });
  }

  function saveShop() {
    const pct = Number(String(shopTyLePercent).replace(",", "."));
    const toi = Number(String(shopToiThieu).replace(/[,\s.]/g, ""));
    const ng = Number(String(shopNguong).replace(/[,\s.]/g, ""));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setErr("Tỷ lệ shop % phải từ 0 đến 100.");
      return;
    }
    if (!Number.isFinite(toi) || toi < 0) {
      setErr("Tối thiểu xuất kỳ không hợp lệ.");
      return;
    }
    if (!Number.isFinite(ng) || ng < 0) {
      setErr("Ngưỡng shop không hợp lệ.");
      return;
    }
    if (!ghiChuShop.trim()) {
      setErr("Đổi phí shop bắt buộc ghi chú lý do.");
      return;
    }
    void save("shop", {
      shopTyLePercent: pct,
      shopToiThieuXuatKyVnd: toi,
      shopNguongVnd: ng,
      ghiChu: ghiChuShop.trim(),
    });
  }

  function saveDongDon() {
    const nums = [
      ddKhaoSuKien,
      ddKhaoTrucTiep,
      ddKhaoOnline,
      ddTuDongSuKien,
      ddTuDongTrucTiep,
      ddTuDongOnline,
      ddTuDongOnlineKhongMa,
      ddSoLanHoan,
      ddNgayHoan,
    ].map((s) => Number(s));
    if (nums.some((n) => !Number.isFinite(n) || n < 0)) {
      setErr("Số ngày / lần hoãn đóng đơn không hợp lệ.");
      return;
    }
    if (!ghiChuDongDon.trim()) {
      setErr("Đổi lịch đóng đơn bắt buộc ghi chú lý do.");
      return;
    }
    void save("dong_don", {
      shopNgayKhaoSatSuKien: nums[0],
      shopNgayKhaoSatTrucTiep: nums[1],
      shopNgayKhaoSatOnline: nums[2],
      shopNgayTuDongSuKien: nums[3],
      shopNgayTuDongTrucTiep: nums[4],
      shopNgayTuDongOnline: nums[5],
      shopNgayTuDongOnlineKhongMa: nums[6],
      shopSoLanChoHoan: nums[7],
      shopNgayHoanChuaNhan: nums[8],
      ghiChu: ghiChuDongDon.trim(),
    });
  }

  function saveBuyerLimit() {
    const nums = [blChoXn, blChoXnShop, blMoiNgay].map((s) => Number(s));
    if (nums.some((n) => !Number.isFinite(n) || n < 0)) {
      setErr("Soft-limit buyer không hợp lệ (0 = tắt).");
      return;
    }
    if (!ghiChuBuyerLimit.trim()) {
      setErr("Đổi soft-limit buyer bắt buộc ghi chú lý do.");
      return;
    }
    void save("buyer_limit", {
      buyerToiDaDonChoXacNhan: nums[0],
      buyerToiDaDonChoXacNhanMoiShop: nums[1],
      buyerToiDaDonMoiNgay: nums[2],
      ghiChu: ghiChuBuyerLimit.trim(),
    });
  }

  function saveEgress() {
    const t = egressGb.trim();
    void save("egress", {
      csdtNguongEgressGb: t === "" ? null : Number(t),
    });
  }

  function saveStk() {
    void save("stk", {
      bankBin: bankBin.trim() || null,
      bankSoTk: bankSoTk.trim() || null,
      bankChuTk: bankChuTk.trim() || null,
    });
  }

  function saveDn() {
    void save("doanh_nghiep", {
      dnTenPhapNhan: dnTen.trim() || null,
      dnMst: dnMst.trim() || null,
      dnDiaChi: dnDiaChi.trim() || null,
      dnNguoiDaiDien: dnNguoi.trim() || null,
      dnEmailHoaDon: dnEmail.trim() || null,
      xuatHoaDonBat: xuatHd,
    });
  }

  const stkOk =
    Boolean(bankSoTk.trim()) &&
    Boolean(bankBin.trim()) &&
    Boolean(bankChuTk.trim());

  const bankLabel =
    CINS_BANK_OPTIONS.find((b) => b.code === bankBin)?.ten ??
    cauHinh?.bank.ten ??
    null;

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];
  const knOpenCount = knItems.filter(
    (k) => k.trangThai === "moi" || k.trangThai === "dang_xu_ly",
  ).length;
  const tkOpenCount = tkItems.filter((t) => t.anHanHieuLuc).length;

  return (
    <div className="admin-tc">
      <header className="admin-tc-head">
        <div>
          <h1>Tài chính CINs</h1>
          <p className="admin-tc-lead">
            Cấu hình phí nền tảng, tài khoản nhận tiền và pháp nhân hóa đơn.
            Mỗi lần lưu tạo dòng lịch sử mới — kỳ/dòng phí cũ không đổi. Secret
            Sepay chỉ nằm trong env.
          </p>
        </div>
        <span
          className={`admin-tc-badge ${canEdit ? "is-edit" : "is-view"}`}
          role="status"
        >
          {canEdit ? "Admin tối cao — được sửa" : "Chỉ xem — cần Admin tối cao"}
        </span>
      </header>

      {err ? (
        <p className="admin-tc-flash is-err" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="admin-tc-flash is-ok" role="status">
          {msg}
        </p>
      ) : null}

      {loading ? <p className="admin-tc-loading">Đang tải cấu hình…</p> : null}

      {!loading && cauHinh ? (
        <>
          <div className="admin-tc-snap" aria-label="Cấu hình đang áp dụng">
            <div className="admin-tc-snap-cell">
              <span className="label">Phí CSĐT</span>
              <span className="value">
                {(cauHinh.csdt.tyLe * 100).toFixed(2)}%
              </span>
              <span className="sub">
                Từ {fmtVnd(cauHinh.csdt.nguongVnd)}₫ · hạn{" "}
                {cauHinh.csdt.soNgayHanTra} ngày
              </span>
            </div>
            <div className="admin-tc-snap-cell">
              <span className="label">Phí shop</span>
              <span className="value">
                {((cauHinh.shop?.tyLe ?? 0.05) * 100).toFixed(2)}%
              </span>
              <span className="sub">
                Xuất kỳ từ {fmtVnd(cauHinh.shop?.toiThieuXuatKyVnd ?? 50_000)}₫
              </span>
            </div>
            <div
              className={`admin-tc-snap-cell ${stkOk ? "is-ready" : "is-gap"}`}
            >
              <span className="label">STK nhận phí</span>
              <span className="value">{stkOk ? "Sẵn sàng" : "Thiếu"}</span>
              <span className="sub">
                {stkOk
                  ? bankLabel ?? "VietQR"
                  : "Ẩn thanh toán trên trang Phí"}
              </span>
            </div>
            <button
              type="button"
              className={`admin-tc-snap-cell is-btn ${knOpenCount > 0 ? "is-gap" : ""}`}
              onClick={() => setTab("khieu-nai")}
            >
              <span className="label">Khiếu nại mở</span>
              <span className="value">{knOpenCount}</span>
              <span className="sub">Bấm để xử lý</span>
            </button>
            <button
              type="button"
              className={`admin-tc-snap-cell is-btn ${tkOpenCount > 0 ? "is-gap" : ""}`}
              onClick={() => setTab("tu-khai")}
            >
              <span className="label">Tự khai chờ đối soát</span>
              <span className="value">{tkOpenCount}</span>
              <span className="sub">
                {tkItems.length > tkOpenCount
                  ? `${tkItems.length} tổng · ${tkOpenCount} còn ân hạn`
                  : "Bấm để xử lý"}
              </span>
            </button>
          </div>

          <div className="admin-tc-tabs" role="tablist" aria-label="Nhóm cấu hình tài chính">
            {TABS.map((t) => {
              const selected = tab === t.id;
              const badge =
                t.id === "khieu-nai" && knOpenCount > 0
                  ? knOpenCount
                  : t.id === "tu-khai" && tkOpenCount > 0
                    ? tkOpenCount
                    : null;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`admin-tc-tab-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`admin-tc-panel-${t.id}`}
                  className={`admin-tc-tab${selected ? " is-active" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                  {badge != null ? (
                    <span className="admin-tc-tab-badge">{badge}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <p className="admin-tc-tab-hint" id={`admin-tc-hint-${tab}`}>
            {activeTab.hint}
          </p>

          <div
            className="admin-tc-grid"
            role="tabpanel"
            id={`admin-tc-panel-${tab}`}
            aria-labelledby={`admin-tc-tab-${tab}`}
          >
            {tab === "csdt" ? (
              <>
                <section className="admin-tc-panel is-wide">
                  <div className="admin-tc-panel-head">
                    <h2>Tỷ lệ & ngưỡng phí CSĐT</h2>
                    <p>
                      Áp cho kỳ/dòng phí tạo sau khi lưu. Đổi tỷ lệ hoặc ngưỡng
                      bắt buộc ghi lý do (lưu vào lịch sử).
                    </p>
                  </div>
                  <div className="admin-tc-callout">
                    <strong>Cách hiểu nhanh:</strong> cơ sở chỉ bị tính phí khi
                    doanh thu lũy kế vượt ngưỡng. Hạn trả = số ngày sau khi chốt
                    kỳ phải thanh toán cho CINs.
                  </div>
                  <div className="admin-tc-panel-body is-2col">
                    <div className="admin-tc-field">
                      <label htmlFor="tc-tyle">Tỷ lệ phí (%)</label>
                      <input
                        id="tc-tyle"
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={tyLePercent}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setTyLePercent(e.target.value)}
                      />
                    </div>
                    <div className="admin-tc-field">
                      <label htmlFor="tc-nguong">Ngưỡng kích hoạt (VND)</label>
                      <input
                        id="tc-nguong"
                        type="number"
                        min={0}
                        step={1000}
                        value={nguongVnd}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setNguongVnd(e.target.value)}
                      />
                      <span className="hint">
                        Doanh thu lũy kế dưới mức này → chưa thu phí
                      </span>
                    </div>
                    <div className="admin-tc-field">
                      <label htmlFor="tc-han">Số ngày hạn trả sau chốt kỳ</label>
                      <input
                        id="tc-han"
                        type="number"
                        min={0}
                        max={90}
                        value={soNgayHan}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setSoNgayHan(e.target.value)}
                      />
                    </div>
                    <div className="admin-tc-field is-span-2">
                      <label htmlFor="tc-lydo">Lý do thay đổi (bắt buộc)</label>
                      <textarea
                        id="tc-lydo"
                        rows={2}
                        placeholder="Vd: Giai đoạn 1 — giữ 10% / 2tr"
                        value={ghiChuTyLe}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setGhiChuTyLe(e.target.value)}
                      />
                    </div>
                  </div>
                  {canEdit ? (
                    <div className="admin-tc-panel-foot">
                      <button
                        type="button"
                        className="admin-tc-btn"
                        disabled={busy != null}
                        onClick={saveTyLe}
                      >
                        {busy === "ty_le" ? "Đang lưu…" : "Lưu tỷ lệ & ngưỡng"}
                      </button>
                    </div>
                  ) : null}
                </section>

                <section className="admin-tc-panel is-wide">
                  <div className="admin-tc-panel-head">
                    <h2>Hạ tầng phòng học</h2>
                    <span className="admin-tc-status is-muted">Chưa áp dụng</span>
                    <p>
                      Giới hạn dung lượng truyền tải phòng học online (GB/tháng).
                      Để trống = tắt. Dự kiến dùng làm điều kiện phụ tính phí —
                      hiện chỉ lưu cấu hình.
                    </p>
                  </div>
                  <div className="admin-tc-panel-body">
                    <div className="admin-tc-field">
                      <label htmlFor="tc-egress">
                        Ngưỡng dung lượng phòng học (GB)
                      </label>
                      <input
                        id="tc-egress"
                        type="number"
                        min={1}
                        placeholder="Trống = tắt"
                        value={egressGb}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setEgressGb(e.target.value)}
                      />
                      <span className="hint">
                        Hiện:{" "}
                        {cauHinh.csdt.nguongEgressGb == null
                          ? "tắt"
                          : `${cauHinh.csdt.nguongEgressGb} GB`}
                      </span>
                    </div>
                  </div>
                  {canEdit ? (
                    <div className="admin-tc-panel-foot">
                      <button
                        type="button"
                        className="admin-tc-btn"
                        disabled={busy != null}
                        onClick={saveEgress}
                      >
                        {busy === "egress" ? "Đang lưu…" : "Lưu ngưỡng"}
                      </button>
                    </div>
                  ) : null}
                </section>
              </>
            ) : null}

            {tab === "shop" ? (
              <>
                <section className="admin-tc-panel is-wide">
                  <div className="admin-tc-panel-head">
                    <h2>Phí shop</h2>
                    <p>
                      % trên GMV và mức tối thiểu để xuất kỳ phí. Dưới mức tối
                      thiểu → dồn sang tháng sau, không xuất hóa đơn.
                    </p>
                  </div>
                  <div className="admin-tc-panel-body is-2col">
                    <div className="admin-tc-field">
                      <label htmlFor="tc-shop-tyle">Tỷ lệ phí shop (%)</label>
                      <input
                        id="tc-shop-tyle"
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={shopTyLePercent}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setShopTyLePercent(e.target.value)}
                      />
                    </div>
                    <div className="admin-tc-field">
                      <label htmlFor="tc-shop-toi">Tối thiểu xuất kỳ (VND)</label>
                      <input
                        id="tc-shop-toi"
                        type="number"
                        min={0}
                        step={1000}
                        value={shopToiThieu}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setShopToiThieu(e.target.value)}
                      />
                      <span className="hint">
                        Tránh đòi phí quá nhỏ từng kỳ
                      </span>
                    </div>
                    <div className="admin-tc-field">
                      <label htmlFor="tc-shop-nguong">Ngưỡng kích hoạt (VND)</label>
                      <input
                        id="tc-shop-nguong"
                        type="number"
                        min={0}
                        step={1000}
                        value={shopNguong}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setShopNguong(e.target.value)}
                      />
                      <span className="hint">
                        0 = chốt theo tháng (không chờ ngưỡng)
                      </span>
                    </div>
                    <div className="admin-tc-field is-span-2">
                      <label htmlFor="tc-shop-lydo">Lý do thay đổi (bắt buộc)</label>
                      <textarea
                        id="tc-shop-lydo"
                        rows={2}
                        placeholder="Vd: Tối thiểu 50k — tránh đòi phí quá nhỏ"
                        value={ghiChuShop}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setGhiChuShop(e.target.value)}
                      />
                    </div>
                  </div>
                  {canEdit ? (
                    <div className="admin-tc-panel-foot">
                      <button
                        type="button"
                        className="admin-tc-btn"
                        disabled={busy != null}
                        onClick={saveShop}
                      >
                        {busy === "shop" ? "Đang lưu…" : "Lưu phí shop"}
                      </button>
                    </div>
                  ) : null}
                </section>

                <AdminPhiThongBaoPanel canEdit={canEdit} />

                <section className="admin-tc-panel is-wide">
                  <div className="admin-tc-panel-head">
                    <h2>Lịch đóng đơn</h2>
                    <p>
                      Đếm ngày từ lúc shop nhận tiền. Khảo sát hỏi buyer trước;
                      hết hạn → tự đóng. Buyer chọn «chưa nhận» → hoãn rồi hỏi
                      lại; hết lần → khiếu nại admin.
                    </p>
                  </div>
                  <div className="admin-tc-callout">
                    <strong>Thứ tự:</strong> khảo sát → (có thể hoãn) → tự đóng.
                    Số ngày tự đóng nên lớn hơn khảo sát cùng hình thức giao.
                  </div>

                  <div className="admin-tc-group">
                    <h3 className="admin-tc-group-title">Khảo sát buyer</h3>
                    <p className="admin-tc-group-desc">
                      Sau bao nhiêu ngày (từ nhận tiền) gửi hỏi đã nhận hàng chưa.
                    </p>
                    <div className="admin-tc-panel-body is-3col">
                      <div className="admin-tc-field">
                        <label htmlFor="tc-dd-ks-sk">Tại sự kiện (ngày)</label>
                        <input
                          id="tc-dd-ks-sk"
                          type="number"
                          min={0}
                          max={90}
                          value={ddKhaoSuKien}
                          disabled={!canEdit || busy != null}
                          onChange={(e) => setDdKhaoSuKien(e.target.value)}
                        />
                      </div>
                      <div className="admin-tc-field">
                        <label htmlFor="tc-dd-ks-tt">Trực tiếp (ngày)</label>
                        <input
                          id="tc-dd-ks-tt"
                          type="number"
                          min={0}
                          max={90}
                          value={ddKhaoTrucTiep}
                          disabled={!canEdit || busy != null}
                          onChange={(e) => setDdKhaoTrucTiep(e.target.value)}
                        />
                      </div>
                      <div className="admin-tc-field">
                        <label htmlFor="tc-dd-ks-on">Online (ngày)</label>
                        <input
                          id="tc-dd-ks-on"
                          type="number"
                          min={0}
                          max={90}
                          value={ddKhaoOnline}
                          disabled={!canEdit || busy != null}
                          onChange={(e) => setDdKhaoOnline(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="admin-tc-group">
                    <h3 className="admin-tc-group-title">Tự đóng đơn</h3>
                    <p className="admin-tc-group-desc">
                      Hết hạn mà không phản hồi → hệ thống đóng đơn.
                    </p>
                    <div className="admin-tc-panel-body is-2col">
                      <div className="admin-tc-field">
                        <label htmlFor="tc-dd-td-sk">Tại sự kiện (ngày)</label>
                        <input
                          id="tc-dd-td-sk"
                          type="number"
                          min={0}
                          max={90}
                          value={ddTuDongSuKien}
                          disabled={!canEdit || busy != null}
                          onChange={(e) => setDdTuDongSuKien(e.target.value)}
                        />
                      </div>
                      <div className="admin-tc-field">
                        <label htmlFor="tc-dd-td-tt">Trực tiếp (ngày)</label>
                        <input
                          id="tc-dd-td-tt"
                          type="number"
                          min={0}
                          max={90}
                          value={ddTuDongTrucTiep}
                          disabled={!canEdit || busy != null}
                          onChange={(e) => setDdTuDongTrucTiep(e.target.value)}
                        />
                      </div>
                      <div className="admin-tc-field">
                        <label htmlFor="tc-dd-td-on">Online có mã (ngày)</label>
                        <input
                          id="tc-dd-td-on"
                          type="number"
                          min={0}
                          max={90}
                          value={ddTuDongOnline}
                          disabled={!canEdit || busy != null}
                          onChange={(e) => setDdTuDongOnline(e.target.value)}
                        />
                      </div>
                      <div className="admin-tc-field">
                        <label htmlFor="tc-dd-td-nm">
                          Online không mã (ngày)
                        </label>
                        <input
                          id="tc-dd-td-nm"
                          type="number"
                          min={0}
                          max={90}
                          value={ddTuDongOnlineKhongMa}
                          disabled={!canEdit || busy != null}
                          onChange={(e) =>
                            setDdTuDongOnlineKhongMa(e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="admin-tc-group">
                    <h3 className="admin-tc-group-title">Hoãn «chưa nhận»</h3>
                    <p className="admin-tc-group-desc">
                      Buyer báo chưa nhận → hoãn rồi hỏi lại. Hết số lần → mở
                      khiếu nại.
                    </p>
                    <div className="admin-tc-panel-body is-2col">
                      <div className="admin-tc-field">
                        <label htmlFor="tc-dd-lan">Số lần được hoãn</label>
                        <input
                          id="tc-dd-lan"
                          type="number"
                          min={0}
                          max={10}
                          value={ddSoLanHoan}
                          disabled={!canEdit || busy != null}
                          onChange={(e) => setDdSoLanHoan(e.target.value)}
                        />
                      </div>
                      <div className="admin-tc-field">
                        <label htmlFor="tc-dd-hoan">Mỗi lần hoãn (ngày)</label>
                        <input
                          id="tc-dd-hoan"
                          type="number"
                          min={0}
                          max={90}
                          value={ddNgayHoan}
                          disabled={!canEdit || busy != null}
                          onChange={(e) => setDdNgayHoan(e.target.value)}
                        />
                      </div>
                      <div className="admin-tc-field is-span-2">
                        <label htmlFor="tc-dd-lydo">
                          Lý do thay đổi (bắt buộc)
                        </label>
                        <textarea
                          id="tc-dd-lydo"
                          rows={2}
                          placeholder="Vd: sự kiện 1/3 · trực tiếp 3/7 · online 7/14"
                          value={ghiChuDongDon}
                          disabled={!canEdit || busy != null}
                          onChange={(e) => setGhiChuDongDon(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {canEdit ? (
                    <div className="admin-tc-panel-foot">
                      <button
                        type="button"
                        className="admin-tc-btn"
                        disabled={busy != null}
                        onClick={saveDongDon}
                      >
                        {busy === "dong_don" ? "Đang lưu…" : "Lưu lịch đóng đơn"}
                      </button>
                    </div>
                  ) : null}
                </section>

                <section className="admin-tc-panel is-wide">
                  <div className="admin-tc-panel-head">
                    <h2>Giới hạn đặt hàng (buyer)</h2>
                    <p>
                      Chống spam đơn. <strong>0 = tắt</strong> từng ngưỡng. Ngày
                      theo giờ VN. Chặn buyer thủ công (seller) vẫn dùng riêng.
                    </p>
                  </div>
                  <div className="admin-tc-panel-body is-2col">
                    <div className="admin-tc-field">
                      <label htmlFor="tc-bl-cxn">
                        Tối đa đơn chờ xác nhận (toàn hệ)
                      </label>
                      <input
                        id="tc-bl-cxn"
                        type="number"
                        min={0}
                        max={500}
                        value={blChoXn}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setBlChoXn(e.target.value)}
                      />
                    </div>
                    <div className="admin-tc-field">
                      <label htmlFor="tc-bl-cxn-shop">
                        Tối đa chờ xác nhận / shop
                      </label>
                      <input
                        id="tc-bl-cxn-shop"
                        type="number"
                        min={0}
                        max={500}
                        value={blChoXnShop}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setBlChoXnShop(e.target.value)}
                      />
                    </div>
                    <div className="admin-tc-field">
                      <label htmlFor="tc-bl-ngay">Tối đa đơn mới / ngày</label>
                      <input
                        id="tc-bl-ngay"
                        type="number"
                        min={0}
                        max={500}
                        value={blMoiNgay}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setBlMoiNgay(e.target.value)}
                      />
                    </div>
                    <div className="admin-tc-field is-span-2">
                      <label htmlFor="tc-bl-lydo">Lý do thay đổi (bắt buộc)</label>
                      <textarea
                        id="tc-bl-lydo"
                        rows={2}
                        placeholder="Vd: mặc định 10 / 3 / 20"
                        value={ghiChuBuyerLimit}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setGhiChuBuyerLimit(e.target.value)}
                      />
                    </div>
                  </div>
                  {canEdit ? (
                    <div className="admin-tc-panel-foot">
                      <button
                        type="button"
                        className="admin-tc-btn"
                        disabled={busy != null}
                        onClick={saveBuyerLimit}
                      >
                        {busy === "buyer_limit"
                          ? "Đang lưu…"
                          : "Lưu giới hạn buyer"}
                      </button>
                    </div>
                  ) : null}
                </section>
              </>
            ) : null}

            {tab === "nhan-tien" ? (
              <>
                <section className="admin-tc-panel">
                  <div className="admin-tc-panel-head">
                    <h2>STK nhận phí nền tảng</h2>
                    <span
                      className={`admin-tc-status ${stkOk ? "is-ready" : "is-gap"}`}
                    >
                      {stkOk ? "Đủ VietQR" : "Chưa đủ"}
                    </span>
                    <p>
                      Hiện trên trang Phí của cơ sở. Thiếu ngân hàng / STK / chủ
                      TK → ẩn khối thanh toán và hoãn khóa ghi danh.
                    </p>
                  </div>
                  <div className="admin-tc-panel-body">
                    <div className="admin-tc-field">
                      <label htmlFor="tc-bank">Ngân hàng (mã VietQR)</label>
                      <select
                        id="tc-bank"
                        value={bankBin}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setBankBin(e.target.value)}
                      >
                        <option value="">— Chọn —</option>
                        {CINS_BANK_OPTIONS.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.ten} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-tc-field">
                      <label htmlFor="tc-stk">Số tài khoản</label>
                      <input
                        id="tc-stk"
                        inputMode="numeric"
                        autoComplete="off"
                        value={bankSoTk}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setBankSoTk(e.target.value)}
                      />
                    </div>
                    <div className="admin-tc-field">
                      <label htmlFor="tc-chu">Chủ tài khoản</label>
                      <input
                        id="tc-chu"
                        value={bankChuTk}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setBankChuTk(e.target.value)}
                      />
                    </div>
                  </div>
                  {canEdit ? (
                    <div className="admin-tc-panel-foot">
                      <button
                        type="button"
                        className="admin-tc-btn"
                        disabled={busy != null}
                        onClick={saveStk}
                      >
                        {busy === "stk" ? "Đang lưu…" : "Lưu STK"}
                      </button>
                    </div>
                  ) : null}
                </section>

                <section className="admin-tc-panel">
                  <div className="admin-tc-panel-head">
                    <h2>Doanh nghiệp CINs (hóa đơn)</h2>
                    <span className="admin-tc-status is-muted">Chưa HĐĐT</span>
                    <p>
                      Bên bán trên hóa đơn sau này. Xuất HĐĐT chưa tích hợp —
                      chỉ điền sẵn dữ liệu pháp nhân.
                    </p>
                  </div>
                  <div className="admin-tc-panel-body">
                    <div className="admin-tc-field">
                      <label htmlFor="tc-dn-ten">Tên pháp nhân</label>
                      <input
                        id="tc-dn-ten"
                        value={dnTen}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setDnTen(e.target.value)}
                      />
                    </div>
                    <div className="admin-tc-field">
                      <label htmlFor="tc-dn-mst">Mã số thuế</label>
                      <input
                        id="tc-dn-mst"
                        value={dnMst}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setDnMst(e.target.value)}
                      />
                    </div>
                    <div className="admin-tc-field">
                      <label htmlFor="tc-dn-dc">Địa chỉ</label>
                      <textarea
                        id="tc-dn-dc"
                        rows={2}
                        value={dnDiaChi}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setDnDiaChi(e.target.value)}
                      />
                    </div>
                    <div className="admin-tc-field">
                      <label htmlFor="tc-dn-dd">Người đại diện</label>
                      <input
                        id="tc-dn-dd"
                        value={dnNguoi}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setDnNguoi(e.target.value)}
                      />
                    </div>
                    <div className="admin-tc-field">
                      <label htmlFor="tc-dn-email">Email nhận hóa đơn</label>
                      <input
                        id="tc-dn-email"
                        type="email"
                        value={dnEmail}
                        disabled={!canEdit || busy != null}
                        onChange={(e) => setDnEmail(e.target.value)}
                      />
                    </div>
                    <div className="admin-tc-field">
                      <label className="admin-tc-check" htmlFor="tc-xuat-hd">
                        <input
                          id="tc-xuat-hd"
                          type="checkbox"
                          checked={xuatHd}
                          disabled={!canEdit || busy != null}
                          onChange={(e) => setXuatHd(e.target.checked)}
                        />
                        <span>
                          Bật xuất hóa đơn điện tử
                          <span className="hint" style={{ display: "block" }}>
                            Chưa tích hợp — nên để tắt.
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                  {canEdit ? (
                    <div className="admin-tc-panel-foot">
                      <button
                        type="button"
                        className="admin-tc-btn"
                        disabled={busy != null}
                        onClick={saveDn}
                      >
                        {busy === "doanh_nghiep"
                          ? "Đang lưu…"
                          : "Lưu doanh nghiệp"}
                      </button>
                    </div>
                  ) : null}
                </section>
              </>
            ) : null}

            {tab === "khieu-nai" ? (
              <section className="admin-tc-panel is-wide">
                <div className="admin-tc-panel-head">
                  <h2>Khiếu nại đối soát</h2>
                  <p>
                    User gửi từ hub thanh toán kèm ảnh bằng chứng. Đối chiếu
                    Sepay rồi ghi thanh toán thủ công / phản hồi.
                  </p>
                </div>
                {knItems.length === 0 ? (
                  <p className="admin-tc-history-empty">
                    Không có khiếu nại đang mở.
                  </p>
                ) : (
                  <ul className="admin-tc-history-list">
                    {knItems.map((k) => (
                      <li key={k.id} className="admin-tc-history-item">
                        <time dateTime={k.taoLuc}>{fmtLuc(k.taoLuc)}</time>
                        <span className="rate">{k.trangThai}</span>
                        <div className="meta">
                          <strong>
                            {k.tenDichVu || k.loai}
                            {k.soTienKhai != null
                              ? ` · khai ${fmtVnd(k.soTienKhai)}₫`
                              : ""}
                          </strong>
                          <span className="note">{k.noiDung}</span>
                          {k.maGiaoDich ? (
                            <span className="note">GD {k.maGiaoDich}</span>
                          ) : null}
                          {k.idHoaDon ? (
                            <span className="note mono">HD {k.idHoaDon}</span>
                          ) : null}
                          {k.anhIds.length > 0 ? (
                            <div className="admin-tc-kn-thumbs">
                              {k.anhIds.map((id) => {
                                const src = getCoverUrl(id, "public");
                                return src ? (
                                  <a
                                    key={id}
                                    href={src}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={src}
                                      alt=""
                                      width={64}
                                      height={64}
                                    />
                                  </a>
                                ) : null;
                              })}
                            </div>
                          ) : null}
                          {knCanEdit ? (
                            <div className="admin-tc-kn-actions">
                              <textarea
                                rows={2}
                                placeholder="Phản hồi cho user…"
                                value={knPhanHoi[k.id] ?? ""}
                                onChange={(e) =>
                                  setKnPhanHoi((p) => ({
                                    ...p,
                                    [k.id]: e.target.value,
                                  }))
                                }
                              />
                              <div className="admin-tc-kn-btns">
                                <button
                                  type="button"
                                  className="admin-tc-btn"
                                  disabled={knBusyId === k.id}
                                  onClick={() =>
                                    void xuLyKn(k.id, "dang_xu_ly")
                                  }
                                >
                                  Đang xử lý
                                </button>
                                <button
                                  type="button"
                                  className="admin-tc-btn"
                                  disabled={knBusyId === k.id}
                                  onClick={() => void xuLyKn(k.id, "da_xu_ly")}
                                >
                                  Đã xử lý
                                </button>
                                <button
                                  type="button"
                                  className="admin-tc-btn is-ghost"
                                  disabled={knBusyId === k.id}
                                  onClick={() => void xuLyKn(k.id, "tu_choi")}
                                >
                                  Từ chối
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            {tab === "tu-khai" ? (
              <section className="admin-tc-panel is-wide">
                <div className="admin-tc-panel-head">
                  <h2>Tự khai chờ đối soát</h2>
                  <p>
                    Shop/cơ sở đã bấm «Tôi đã chuyển rồi» — nợ vẫn còn, cửa sổ
                    ân hạn tạm mở. Gán giao dịch SePay theo mã CK nếu tiền đã
                    về, hoặc bác để xoá ân hạn và khoá lại.
                  </p>
                </div>
                {tkItems.length === 0 ? (
                  <p className="admin-tc-history-empty">
                    Không có hoá đơn đang tự khai.
                  </p>
                ) : (
                  <ul className="admin-tc-history-list">
                    {tkItems.map((t) => (
                      <li key={t.id} className="admin-tc-history-item">
                        <time dateTime={t.tuKhaiDaTraLuc}>
                          {fmtLuc(t.tuKhaiDaTraLuc)}
                        </time>
                        <span className="rate">
                          {t.anHanHieuLuc ? "ân hạn" : "hết ân hạn"}
                        </span>
                        <div className="meta">
                          <strong>
                            {t.tenDichVu || t.loai}
                            {t.conNoVnd > 0
                              ? ` · nợ ${fmtVnd(t.conNoVnd)}₫`
                              : ""}
                          </strong>
                          <span className="note mono">
                            Mã CK {t.maThamChieu || "—"}
                          </span>
                          <span className="note">
                            TT {t.trangThai}
                            {t.hanTra ? ` · hạn trả ${t.hanTra}` : ""}
                            {` · lần tự khai ${t.tuKhaiLan}`}
                          </span>
                          {t.anHanDenIso ? (
                            <span className="note">
                              Ân hạn đến {fmtLuc(t.anHanDenIso)}
                            </span>
                          ) : (
                            <span className="note">
                              Cửa sổ ân hạn đã hết — gate sẽ khoá nếu còn nợ
                              quá hạn
                            </span>
                          )}
                          {tkCanEdit ? (
                            <div className="admin-tc-kn-actions">
                              <div className="admin-tc-kn-btns">
                                <button
                                  type="button"
                                  className="admin-tc-btn"
                                  disabled={tkBusyId === t.id}
                                  onClick={() =>
                                    void xuLyTuKhai(t.id, "gan")
                                  }
                                >
                                  {tkBusyId === t.id
                                    ? "Đang xử lý…"
                                    : "Gán giao dịch"}
                                </button>
                                <button
                                  type="button"
                                  className="admin-tc-btn is-ghost"
                                  disabled={tkBusyId === t.id}
                                  onClick={() =>
                                    void xuLyTuKhai(t.id, "bac")
                                  }
                                >
                                  Bác — khoá ngay
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            {tab === "lich-su" ? (
              <section className="admin-tc-panel is-wide admin-tc-history">
                <div className="admin-tc-panel-head">
                  <h2>Lịch sử thay đổi</h2>
                  <p>
                    Mỗi lần lưu append một dòng — không ghi đè cấu hình cũ. Số %
                    bên dưới là tỷ lệ CSĐT tại thời điểm lưu.
                  </p>
                </div>
                {lichSu.length === 0 ? (
                  <p className="admin-tc-history-empty">Chưa có dòng lịch sử.</p>
                ) : (
                  <ul className="admin-tc-history-list">
                    {lichSu.map((row) => (
                      <li
                        key={row.id || row.capNhatLuc}
                        className="admin-tc-history-item"
                      >
                        <time dateTime={row.capNhatLuc}>
                          {fmtLuc(row.capNhatLuc)}
                        </time>
                        <span className="rate">
                          {(row.csdt.tyLe * 100).toFixed(2)}%
                        </span>
                        <div className="meta">
                          <strong>{fmtVnd(row.csdt.nguongVnd)}₫</strong>
                          {row.ghiChu ? (
                            <span className="note">{row.ghiChu}</span>
                          ) : (
                            <span className="note">Không có ghi chú</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
