"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MessageSquare, Plus, Search, Trash2, X } from "lucide-react";

import { XoaBlockerList } from "@/components/co-so/quan-ly/XoaBlockerList";
import { HOC_VIEN_CHO_TTL_DEFAULT } from "@/lib/co-so/hoc-vien-cho-cau-hinh";
import { getAvatarUrl } from "@/lib/journey/profile";
import type { XoaPreflight } from "@/lib/to-chuc/khoa-lop-xoa-types";
import { orgQuanLyPath } from "@/lib/to-chuc/org-quan-ly-routes";

type Enrollment = {
  hocVienLopId: string;
  trangThai: string;
  trangThaiHienThi: "dang_hoc" | "het_han" | "nghi";
  ngayDangKy: string;
  userId: string;
  tenHienThi: string;
  slug: string | null;
  avatarUrl: string | null;
  khoaId: string;
  tenKhoa: string;
  lopId: string | null;
  maLop: string | null;
  ngayCuoiKy: string | null;
  soNgayConLai: number;
};

type Goi = { id: string; ten: string; soNgay: number; giaVnd: number };
type Lop = { id: string; maLop: string; khoaId: string; tenKhoa: string };

/** Tab bảng: HV đã có kỳ học vs ghi danh chờ thu học phí. */
type RosterTab = "hoc_vien" | "cho_xu_ly";

type LookupUser = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

type Props = {
  orgId: string;
  orgSlug: string;
};

const TRANG_THAI_HIEN_THI_LABEL: Record<
  Enrollment["trangThaiHienThi"],
  string
> = {
  dang_hoc: "Đang học",
  het_han: "Hết kỳ học",
  nghi: "Nghỉ",
};

const TRANG_THAI_HIEN_THI_OPTIONS: {
  value: Enrollment["trangThaiHienThi"];
  label: string;
}[] = [
  { value: "dang_hoc", label: TRANG_THAI_HIEN_THI_LABEL.dang_hoc },
  { value: "het_han", label: TRANG_THAI_HIEN_THI_LABEL.het_han },
  { value: "nghi", label: TRANG_THAI_HIEN_THI_LABEL.nghi },
];

function chipClass(tt: Enrollment["trangThaiHienThi"]): string {
  if (tt === "dang_hoc") return "cso-hv-chip cso-hv-chip--ok";
  if (tt === "nghi") return "cso-hv-chip cso-hv-chip--state";
  return "cso-hv-chip cso-hv-chip--freeze";
}

function statusSelectClass(tt: Enrollment["trangThaiHienThi"]): string {
  if (tt === "dang_hoc") return "cso-lh-status-select is-ok";
  if (tt === "nghi") return "cso-lh-status-select is-muted";
  return "cso-lh-status-select";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function daysTone(days: number): "ok" | "low" | "out" {
  if (days <= 0) return "out";
  if (days <= 7) return "low";
  return "ok";
}

export function HocVienQuanLyClient({ orgId, orgSlug }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filterKhoaId = searchParams.get("khoaId")?.trim() ?? "";
  const filterLopId = searchParams.get("lopId")?.trim() ?? "";
  const filterTrangThai = searchParams.get("trangThai")?.trim() ?? "";

  const [rows, setRows] = useState<Enrollment[]>([]);  const [total, setTotal] = useState(0);
  const [totalHocVien, setTotalHocVien] = useState(0);
  const [totalChoXuLy, setTotalChoXuLy] = useState(0);
  const [roster, setRoster] = useState<RosterTab>("hoc_vien");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canThu, setCanThu] = useState(false);
  const [goi, setGoi] = useState<Goi[]>([]);
  const [lop, setLop] = useState<Lop[]>([]);

  const [thuTarget, setThuTarget] = useState<Enrollment | null>(null);
  const [thuMode, setThuMode] = useState<"cash" | "chat">("cash");
  const [soNgay, setSoNgay] = useState(30);
  const [soTien, setSoTien] = useState(0);
  const [goiId, setGoiId] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [lookup, setLookup] = useState("");
  const [lookupUserId, setLookupUserId] = useState<string | null>(null);
  const [lookupResults, setLookupResults] = useState<LookupUser[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupHighlight, setLookupHighlight] = useState(-1);
  const [addLopId, setAddLopId] = useState("");
  const lookupListId = useId();
  const lookupWrapRef = useRef<HTMLDivElement>(null);

  const [goTarget, setGoTarget] = useState<Enrollment | null>(null);
  const [goPre, setGoPre] = useState<XoaPreflight | null>(null);
  const [goLoadingPre, setGoLoadingPre] = useState(false);
  const [goError, setGoError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [gateKhoaGhiDanh, setGateKhoaGhiDanh] = useState(false);
  const [gateHanTra, setGateHanTra] = useState<string | null>(null);
  const [choTtlNgay, setChoTtlNgay] = useState(HOC_VIEN_CHO_TTL_DEFAULT);
  const [ttlDraft, setTtlDraft] = useState(String(HOC_VIEN_CHO_TTL_DEFAULT));
  const [ttlSaving, setTtlSaving] = useState(false);
  const [showBulkGo, setShowBulkGo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        meta: "1",
        roster,
      });
      if (q) params.set("q", q);
      if (filterKhoaId) params.set("khoaId", filterKhoaId);
      if (filterLopId) params.set("lopId", filterLopId);
      if (filterTrangThai) params.set("trangThai", filterTrangThai);
      const res = await fetch(`/api/co-so/${orgId}/hoc-vien?${params}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải được danh sách.");
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setTotalHocVien(data.totalHocVien ?? 0);
      setTotalChoXuLy(data.totalChoXuLy ?? 0);
      setCanThu(Boolean(data.canThu));
      if (typeof data.choTtlNgay === "number") {
        setChoTtlNgay(data.choTtlNgay);
        setTtlDraft(String(data.choTtlNgay));
      }
      if (data.purgedChoXuLy > 0) {
        setFlash(
          `Đã tự gỡ ${data.purgedChoXuLy} ghi danh chờ xử lý quá hạn.`,
        );
      }
      setGoi(data.goi ?? []);
      const lopList = (data.lop ?? []) as Lop[];
      setLop(lopList);
      setAddLopId((prev) => prev || lopList[0]?.id || "");
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải.");
    } finally {
      setLoading(false);
    }
  }, [orgId, page, q, roster, filterKhoaId, filterLopId, filterTrangThai]);

  useEffect(() => {
    setPage(1);
  }, [filterKhoaId, filterLopId, filterTrangThai, roster]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/co-so/${orgId}/phi/gate`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          trangThai?: string;
          hanTraGanNhat?: string | null;
        };
        if (cancelled) return;
        setGateKhoaGhiDanh(json.trangThai === "khoa_ghi_danh");
        setGateHanTra(json.hanTraGanNhat ?? null);
      } catch {
        /* bỏ qua */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const filterKhoaTen = useMemo(() => {
    if (!filterKhoaId) return "";
    const fromLop = lop.find((item) => item.khoaId === filterKhoaId);
    if (fromLop?.tenKhoa) return fromLop.tenKhoa;
    const fromRow = rows.find((row) => row.khoaId === filterKhoaId);
    return fromRow?.tenKhoa ?? "Khóa";
  }, [filterKhoaId, lop, rows]);

  const lopOptionsForFilter = useMemo(
    () => lop.filter((item) => item.khoaId === filterKhoaId),
    [lop, filterKhoaId],
  );

  const filterLopLabel = useMemo(() => {
    if (!filterLopId) return "";
    return lop.find((item) => item.id === filterLopId)?.maLop ?? filterLopId;
  }, [filterLopId, lop]);

  function updateFilterLop(nextLopId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextLopId) params.set("lopId", nextLopId);
    else params.delete("lopId");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    router.replace(pathname);
  }

  function resetLookupSuggest() {
    setLookup("");
    setLookupUserId(null);
    setLookupResults([]);
    setLookupLoading(false);
    setLookupOpen(false);
    setLookupHighlight(-1);
  }

  function openAddModal() {
    if (gateKhoaGhiDanh) {
      setFlash(
        `Đã khóa thêm ghi danh vì nợ phí nền tảng quá hạn${
          gateHanTra ? ` (hạn ${gateHanTra})` : ""
        }. Thanh toán tại Thanh toán (Cài đặt tài khoản).`,
      );
      return;
    }
    resetLookupSuggest();
    setFlash(null);
    setShowAdd(true);
  }

  function closeAddModal() {
    if (submitting) return;
    setShowAdd(false);
    resetLookupSuggest();
  }

  function pickLookupUser(user: LookupUser) {
    setLookup(user.slug);
    setLookupUserId(user.id);
    setLookupOpen(false);
    setLookupHighlight(-1);
    setLookupResults([]);
  }

  useEffect(() => {
    if (!showAdd) return;
    // Đã chọn từ gợi ý — không search lại đến khi user sửa ô.
    if (lookupUserId) {
      setLookupResults([]);
      setLookupLoading(false);
      return;
    }
    const qRaw = lookup.trim().replace(/^@+/, "");
    if (qRaw.length < 1) {
      setLookupResults([]);
      setLookupLoading(false);
      setLookupHighlight(-1);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const res = await fetch(
          `/api/users/search?${new URLSearchParams({
            q: qRaw,
            limit: "8",
          }).toString()}`,
          { credentials: "include" },
        );
        const json = (await res.json().catch(() => null)) as {
          users?: LookupUser[];
        } | null;
        if (cancelled) return;
        setLookupResults(res.ok ? (json?.users ?? []) : []);
        setLookupOpen(true);
        setLookupHighlight(-1);
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [showAdd, lookup, lookupUserId]);

  useEffect(() => {
    if (!showAdd || !lookupOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!lookupWrapRef.current?.contains(e.target as Node)) {
        setLookupOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showAdd, lookupOpen]);

  async function setTrangThaiManual(
    row: Enrollment,
    action: "nghi" | "bo_nghi",
  ) {
    setStatusBusyId(row.hocVienLopId);
    setError(null);
    try {
      const res = await fetch(
        `/api/co-so/${orgId}/hoc-vien/${row.hocVienLopId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không cập nhật trạng thái.");
      setFlash(
        action === "nghi"
          ? `Đã gán Nghỉ cho ${row.tenHienThi}.`
          : `Đã bỏ Nghỉ — ${row.tenHienThi}.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi cập nhật.");
    } finally {
      setStatusBusyId(null);
    }
  }

  function onChangeTrangThaiHienThi(
    row: Enrollment,
    next: Enrollment["trangThaiHienThi"],
  ) {
    if (next === row.trangThaiHienThi) return;
    if (next === "nghi") {
      void setTrangThaiManual(row, "nghi");
      return;
    }
    // Đang học / Hết kỳ học chỉ suy từ kỳ HP — chỉ gọi API khi đang Nghỉ.
    if (row.trangThaiHienThi === "nghi") {
      void setTrangThaiManual(row, "bo_nghi");
    }
  }

  function openChat(row: Enrollment) {
    const params = new URLSearchParams({
      user: row.userId,
      filter: "all",
    });
    router.push(
      `${orgQuanLyPath("co_so_dao_tao", orgSlug, "tin-nhan")}?${params.toString()}`,
    );
  }

  function openThu(row: Enrollment, mode: "cash" | "chat" = "cash") {
    setThuTarget(row);
    setThuMode(mode);
    setFlash(null);
    if (goi.length > 0) {
      const g = goi[0]!;
      setGoiId(g.id);
      setSoNgay(g.soNgay);
      setSoTien(g.giaVnd);
    } else {
      setGoiId("");
      setSoNgay(30);
      setSoTien(0);
    }
    setGhiChu("");
  }

  function onPickGoi(id: string) {
    setGoiId(id);
    const g = goi.find((x) => x.id === id);
    if (g) {
      setSoNgay(g.soNgay);
      setSoTien(g.giaVnd);
    }
  }

  async function submitThu() {
    if (!thuTarget) return;
    setSubmitting(true);
    setFlash(null);
    try {
      const path =
        thuMode === "chat"
          ? `/api/co-so/${orgId}/hoc-phi/don-chat`
          : `/api/co-so/${orgId}/hoc-phi/thu-tien-mat`;
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hocVienLopId: thuTarget.hocVienLopId,
          soNgayCong: soNgay,
          soTienVnd: soTien,
          goiId: goiId || null,
          ghiChu: ghiChu || null,
          ...(thuMode === "cash" ? { autoConfirm: true } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            (thuMode === "chat" ? "Gửi đơn thất bại." : "Thu tiền thất bại."),
        );
      }
      const chuyenSangHocVien =
        thuMode === "cash" && thuTarget.ngayCuoiKy == null;
      setFlash(
        thuMode === "chat"
          ? `Đã gửi đơn CK vào chat · ${soNgay} ngày · ${String(data.donId).slice(0, 8)}…`
          : chuyenSangHocVien
            ? `Đã thu · cộng ${soNgay} ngày — đã chuyển sang tab Học viên.`
            : `Đã thu · cộng ${soNgay} ngày · đơn ${String(data.donId).slice(0, 8)}…`,
      );
      setThuTarget(null);
      // Có kỳ học đầu tiên → row rời tab Chờ xử lý.
      if (chuyenSangHocVien && roster === "cho_xu_ly") setRoster("hoc_vien");
      else await load();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Lỗi thu tiền.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitAdd() {
    if ((!lookup.trim() && !lookupUserId) || !addLopId) return;
    const selected = lop.find((l) => l.id === addLopId);
    if (!selected) return;
    setSubmitting(true);
    setFlash(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/hoc-vien`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(lookupUserId
            ? { userId: lookupUserId }
            : { lookup: lookup.trim() }),
          khoaId: selected.khoaId,
          lopId: selected.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setGateKhoaGhiDanh(true);
          setShowAdd(false);
          throw new Error(
            data.error ||
              "Đã khóa thêm ghi danh vì nợ phí nền tảng. Vào Thanh toán để thanh toán.",
          );
        }
        throw new Error(data.error || "Không thêm được.");
      }
      setShowAdd(false);
      resetLookupSuggest();
      setFlash(
        "Đã thêm ghi danh — nằm ở tab “Chờ xử lý”. Thu tiền / xác nhận HP để chuyển sang tab Học viên.",
      );
      setPage(1);
      // Ghi danh mới chưa có kỳ học → chỉ thấy ở tab Chờ xử lý.
      if (roster === "cho_xu_ly") await load();
      else setRoster("cho_xu_ly");
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Lỗi thêm học viên.");
    } finally {
      setSubmitting(false);
    }
  }

  function openGo(row: Enrollment) {
    setGoTarget(row);
    setGoPre(null);
    setGoError(null);
    setFlash(null);
  }

  useEffect(() => {
    if (!goTarget) return;
    let alive = true;
    setGoLoadingPre(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/co-so/${orgId}/hoc-vien/${goTarget.hocVienLopId}/xoa-preflight`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(data.error || "Không kiểm tra được.");
        setGoPre(data as XoaPreflight);
      } catch (e) {
        if (alive) setGoError(e instanceof Error ? e.message : "Lỗi kiểm tra.");
      } finally {
        if (alive) setGoLoadingPre(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [goTarget, orgId]);

  async function submitGo() {
    if (!goTarget || !goPre?.coTheXoa) return;
    setSubmitting(true);
    setGoError(null);
    try {
      const res = await fetch(
        `/api/co-so/${orgId}/hoc-vien/${goTarget.hocVienLopId}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.blockers) {
          setGoPre({
            coTheXoa: false,
            blockers: data.blockers,
            canhBao: data.canhBao ?? [],
          });
        }
        throw new Error(data.error || "Không gỡ được ghi danh.");
      }
      setGoTarget(null);
      setFlash(`Đã gỡ ghi danh của ${goTarget.tenHienThi}.`);
      await load();
    } catch (e) {
      setGoError(e instanceof Error ? e.message : "Lỗi gỡ ghi danh.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllPage() {
    const pageIds = rows.map((r) => r.hocVienLopId);
    const allOn = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOn) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }

  async function saveChoTtl() {
    const n = Number(ttlDraft);
    if (!Number.isFinite(n) || n < 0 || n > 365) {
      setFlash("Số ngày tự gỡ phải từ 0–365 (0 = tắt).");
      return;
    }
    setTtlSaving(true);
    setFlash(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/hoc-vien/cho-cau-hinh`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttlNgay: Math.floor(n) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không lưu được.");
      setChoTtlNgay(data.ttlNgay);
      setTtlDraft(String(data.ttlNgay));
      setFlash(
        data.ttlNgay === 0
          ? "Đã tắt tự gỡ ghi danh chờ xử lý."
          : `Đã lưu: tự gỡ sau ${data.ttlNgay} ngày.`,
      );
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Lỗi lưu cấu hình.");
    } finally {
      setTtlSaving(false);
    }
  }

  async function submitBulkGo() {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    setFlash(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/hoc-vien/xoa-hang-loat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không gỡ hàng loạt được.");
      setShowBulkGo(false);
      setSelectedIds(new Set());
      const skipNote =
        data.skipped > 0 ? ` · bỏ qua ${data.skipped} đã có kỳ` : "";
      setFlash(`Đã gỡ ${data.deleted} ghi danh chờ xử lý${skipNote}.`);
      await load();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Lỗi gỡ hàng loạt.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const choXuLyTab = roster === "cho_xu_ly";
  const allPageSelected =
    choXuLyTab &&
    rows.length > 0 &&
    rows.every((r) => selectedIds.has(r.hocVienLopId));
  const colSpan = choXuLyTab && canThu ? 6 : 5;

  return (
    <div className="cso-hv">
      <div className="cso-hv-toolbar">
        <form
          className="cso-hv-search"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQ(qDraft.trim());
          }}
        >
          <input
            type="search"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Tìm tên, slug, khóa, mã lớp…"
            className="cso-ql-input"
            aria-label="Tìm học viên"
          />
          <button type="submit" className="cso-ql-btn cso-ql-btn--primary">
            <Search size={15} strokeWidth={2.2} aria-hidden />
            Tìm
          </button>
        </form>
        {canThu ? (
          <button
            type="button"
            className="cso-ql-btn cso-ql-btn--priv"
            onClick={openAddModal}
            disabled={gateKhoaGhiDanh}
            title={
              gateKhoaGhiDanh
                ? "Đã khóa vì nợ phí nền tảng quá hạn — xem Thanh toán"
                : undefined
            }
          >
            <Plus size={15} strokeWidth={2.4} aria-hidden />
            Thêm ghi danh
          </button>
        ) : null}
      </div>

      {filterKhoaId ? (
        <div className="cso-hv-filter-bar">
          <span className="cso-hv-filter-label">
            Lọc khóa: <strong>{filterKhoaTen}</strong>
            {filterTrangThai === "dang_hoc" ? (
              <span className="cso-hv-filter-tag"> · đang học</span>
            ) : filterTrangThai === "het_han" ? (
              <span className="cso-hv-filter-tag"> · hết kỳ học</span>
            ) : filterTrangThai === "nghi" ? (
              <span className="cso-hv-filter-tag"> · nghỉ</span>
            ) : null}
          </span>
          <label className="cso-hv-filter-lop">
            <span className="cso-ql-label">Lớp</span>
            <select
              className="cso-ql-select"
              value={filterLopId}
              onChange={(e) => updateFilterLop(e.target.value)}
            >
              <option value="">Tất cả lớp</option>
              {lopOptionsForFilter.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.maLop}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
            onClick={clearFilters}
          >
            <X size={14} strokeWidth={2.2} aria-hidden />
            Bỏ lọc
          </button>
        </div>
      ) : null}

      <div className="cso-hv-tabs" role="tablist" aria-label="Danh sách ghi danh">
        <button
          type="button"
          role="tab"
          aria-selected={roster === "hoc_vien"}
          className={
            roster === "hoc_vien" ? "cso-hv-tab is-active" : "cso-hv-tab"
          }
          onClick={() => setRoster("hoc_vien")}
        >
          Học viên <span className="cso-hv-tab-n">{totalHocVien}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={roster === "cho_xu_ly"}
          className={
            roster === "cho_xu_ly" ? "cso-hv-tab is-active" : "cso-hv-tab"
          }
          onClick={() => setRoster("cho_xu_ly")}
        >
          Chờ xử lý <span className="cso-hv-tab-n">{totalChoXuLy}</span>
        </button>
      </div>

      <div className="cso-hv-meta">
        <p className="cso-hv-count">
          <strong>{totalHocVien}</strong> học viên ·{" "}
          <strong>{totalChoXuLy}</strong> chờ thu
          {filterKhoaId ? ` · ${filterKhoaTen}` : ""}
          {filterLopId ? ` · ${filterLopLabel}` : ""}
          {q ? ` · lọc “${q}”` : ""}
        </p>
        {choXuLyTab && canThu ? (
          <div className="cso-hv-cho-tools">
            <label className="cso-hv-ttl">
              <span>Tự gỡ sau</span>
              <input
                type="number"
                min={0}
                max={365}
                className="cso-ql-input cso-hv-ttl-input"
                value={ttlDraft}
                disabled={ttlSaving || submitting}
                onChange={(e) => setTtlDraft(e.target.value)}
                aria-label="Số ngày tự gỡ ghi danh chờ xử lý"
              />
              <span>ngày</span>
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                disabled={ttlSaving || submitting || ttlDraft === String(choTtlNgay)}
                onClick={() => void saveChoTtl()}
              >
                {ttlSaving ? "Đang lưu…" : "Lưu"}
              </button>
            </label>
            {selectedIds.size > 0 ? (
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--danger cso-ql-btn--sm"
                disabled={submitting}
                onClick={() => setShowBulkGo(true)}
              >
                <Trash2 size={14} strokeWidth={2.2} aria-hidden />
                Gỡ đã chọn ({selectedIds.size})
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {flash ? <p className="cso-ql-flash">{flash}</p> : null}
      {error ? <p className="cso-ql-error">{error}</p> : null}

      <div className="cso-hv-ledger">
        <div className="cso-hv-table-wrap">
          <table className="cso-hv-table">
            <thead>
              <tr>
                {choXuLyTab && canThu ? (
                  <th scope="col" className="cso-hv-check-col">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      disabled={loading || rows.length === 0}
                      onChange={toggleSelectAllPage}
                      aria-label="Chọn tất cả trên trang"
                    />
                  </th>
                ) : null}
                <th scope="col">Học viên</th>
                <th scope="col">Khóa / lớp</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Ngày còn</th>
                <th scope="col">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan}>
                    <div className="cso-hv-loading">Đang tải danh sách…</div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan}>
                    <div className="cso-hv-empty">
                      {roster === "cho_xu_ly" ? (
                        <>
                          <strong>Không có ghi danh chờ xử lý</strong>
                          Ghi danh thủ công chưa thu học phí sẽ nằm ở đây.
                          {choTtlNgay > 0
                            ? ` Tự gỡ sau ${choTtlNgay} ngày nếu chưa xử lý.`
                            : ""}
                        </>
                      ) : (
                        <>
                          <strong>Chưa có học viên</strong>
                          Học viên hiện sau khi đã đóng / xác nhận học phí (có kỳ
                          học).
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const choThu = row.ngayCuoiKy == null;
                  const hetHan = row.trangThaiHienThi === "het_han";
                  const daysShown = hetHan ? 0 : row.soNgayConLai;
                  const tone = row.ngayCuoiKy
                    ? hetHan
                      ? "out"
                      : daysTone(row.soNgayConLai)
                    : null;
                  return (
                    <tr key={row.hocVienLopId}>
                      {choXuLyTab && canThu ? (
                        <td className="cso-hv-check-col">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.hocVienLopId)}
                            onChange={() => toggleSelect(row.hocVienLopId)}
                            aria-label={`Chọn ${row.tenHienThi}`}
                          />
                        </td>
                      ) : null}
                      <td>
                        <div className="cso-hv-person">
                          <div className="cso-hv-ava" aria-hidden>
                            {row.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={row.avatarUrl} alt="" />
                            ) : (
                              initials(row.tenHienThi)
                            )}
                          </div>
                          <div>
                            <p className="cso-hv-name">{row.tenHienThi}</p>
                            {row.slug ? (
                              <p className="cso-hv-slug">@{row.slug}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="cso-hv-course">{row.tenKhoa}</p>
                        <p className="cso-hv-lop">
                          {row.maLop ?? "Chưa gắn lớp"}
                        </p>
                      </td>
                      <td>
                        <div className="cso-hv-status">
                          {choThu ? (
                            <span className="cso-hv-chip cso-hv-chip--freeze">
                              Chờ thu HP
                            </span>
                          ) : canThu ? (
                            <select
                              className={statusSelectClass(row.trangThaiHienThi)}
                              value={row.trangThaiHienThi}
                              disabled={statusBusyId === row.hocVienLopId}
                              aria-label={`Trạng thái ${row.tenHienThi}`}
                              onChange={(e) =>
                                onChangeTrangThaiHienThi(
                                  row,
                                  e.target.value as Enrollment["trangThaiHienThi"],
                                )
                              }
                            >
                              {TRANG_THAI_HIEN_THI_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={chipClass(row.trangThaiHienThi)}>
                              {TRANG_THAI_HIEN_THI_LABEL[row.trangThaiHienThi]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {row.ngayCuoiKy ? (
                          <div className="cso-hv-days">
                            <span
                              className={`cso-hv-days-n${
                                tone === "low"
                                  ? " is-low"
                                  : tone === "out"
                                    ? " is-out"
                                    : ""
                              }`}
                            >
                              {daysShown}
                            </span>
                            <span className="cso-hv-days-sub">
                              ngày · hết {row.ngayCuoiKy}
                            </span>
                          </div>
                        ) : (
                          <span className="cso-hv-days-empty">Chưa đóng</span>
                        )}
                      </td>
                      <td>
                        <div className="cso-hv-actions">
                          <button
                            type="button"
                            className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                            title={`Nhắn tin với ${row.tenHienThi}`}
                            onClick={() => openChat(row)}
                          >
                            <MessageSquare size={14} strokeWidth={2.2} aria-hidden />
                            Nhắn tin
                          </button>
                          {canThu ? (
                            <>
                              {!choThu ? (
                                <button
                                  type="button"
                                  className="cso-ql-btn cso-ql-btn--primary cso-ql-btn--sm"
                                  onClick={() => openThu(row, "cash")}
                                >
                                  Thu tiền
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                                onClick={() => openThu(row, "chat")}
                              >
                                Gửi đơn CK
                              </button>
                              <button
                                type="button"
                                className="cso-ql-btn cso-ql-btn--danger cso-ql-btn--sm"
                                title={`Gỡ ghi danh của ${row.tenHienThi}`}
                                onClick={() => openGo(row)}
                              >
                                <Trash2 size={14} strokeWidth={2.2} aria-hidden />
                                Gỡ
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="cso-hv-pager">
          <span>
            Trang {page}/{totalPages}
          </span>
          <div className="cso-hv-pager-btns">
            <button
              type="button"
              disabled={page <= 1}
              className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau
            </button>
          </div>
        </div>
      ) : null}

      {thuTarget ? (
        <div
          className="cso-ql-modal-backdrop"
          role="dialog"
          aria-modal
          aria-labelledby="thu-tien-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setThuTarget(null);
          }}
        >
          <div className="cso-ql-modal">
            <h3 id="thu-tien-title" className="cso-ql-modal-title">
              {thuMode === "chat" ? "Gửi đơn CK" : "Thu học phí"}
            </h3>
            <p className="cso-ql-modal-sub">
              {thuTarget.tenHienThi}
              {" · "}
              {thuTarget.tenKhoa}
              {thuTarget.maLop ? ` · ${thuTarget.maLop}` : ""}
              {thuMode === "chat"
                ? " · card vào phòng chat với học viên"
                : " · tiền mặt / xác nhận ngay"}
            </p>

            <div className="cso-ql-modal-body">
              {goi.length > 0 ? (
                <fieldset className="cso-ql-fieldset">
                  <legend className="cso-ql-fieldset-legend">
                    Gói áp dụng
                  </legend>
                  <label className="cso-ql-field">
                    <span className="cso-ql-label">Gói</span>
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
                </fieldset>
              ) : null}

              <fieldset className="cso-ql-fieldset">
                <legend className="cso-ql-fieldset-legend">
                  Cộng ngày &amp; số tiền
                </legend>
                <div className="cso-ql-fieldset-row">
                  <label className="cso-ql-field">
                    <span className="cso-ql-label">Số ngày cộng</span>
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
                    Đã chọn gói — giá &amp; số ngày do server lấy từ catalog.
                  </p>
                ) : null}
              </fieldset>

              <fieldset className="cso-ql-fieldset">
                <legend className="cso-ql-fieldset-legend">
                  Ghi chú (tuỳ chọn)
                </legend>
                <label className="cso-ql-field">
                  <span className="sr-only">Ghi chú</span>
                  <input
                    type="text"
                    className="cso-ql-input"
                    value={ghiChu}
                    onChange={(e) => setGhiChu(e.target.value)}
                    placeholder={
                      thuMode === "chat"
                        ? "Nội dung kèm đơn…"
                        : "Tiền mặt quầy…"
                    }
                  />
                </label>
              </fieldset>
            </div>

            <div className="cso-ql-modal-foot">
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--text"
                onClick={() => setThuTarget(null)}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--primary"
                onClick={() => void submitThu()}
                disabled={submitting || soNgay < 1}
              >
                {submitting
                  ? "Đang lưu…"
                  : thuMode === "chat"
                    ? "Gửi đơn vào chat"
                    : "Xác nhận đã thu"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {goTarget ? (
        <div
          className="cso-ql-modal-backdrop"
          role="dialog"
          aria-modal
          aria-labelledby="go-ghi-danh-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setGoTarget(null);
          }}
        >
          <div className="cso-ql-modal">
            <h3 id="go-ghi-danh-title" className="cso-ql-modal-title">
              Gỡ ghi danh?
            </h3>
            <p className="cso-ql-modal-sub">
              {goTarget.tenHienThi} · {goTarget.tenKhoa}
              {goTarget.maLop ? ` · ${goTarget.maLop}` : ""} — gỡ vĩnh viễn khỏi
              khóa. Không hoàn tác được.
            </p>
            <div className="cso-ql-modal-body">
              {goLoadingPre ? (
                <p className="cso-xoa-loading">Đang kiểm tra ràng buộc…</p>
              ) : goPre ? (
                <XoaBlockerList
                  blockers={goPre.blockers}
                  canhBao={goPre.canhBao}
                  onBeforeXuLy={() => setGoTarget(null)}
                />
              ) : null}
              {goError ? <p className="cso-ql-error">{goError}</p> : null}
            </div>
            <div className="cso-ql-modal-foot">
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--text"
                onClick={() => setGoTarget(null)}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--danger"
                disabled={submitting || goLoadingPre || !goPre?.coTheXoa}
                onClick={() => void submitGo()}
              >
                {submitting ? "Đang gỡ…" : "Gỡ ghi danh"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showBulkGo ? (
        <div
          className="cso-ql-modal-backdrop"
          role="dialog"
          aria-modal
          aria-labelledby="bulk-go-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setShowBulkGo(false);
          }}
        >
          <div className="cso-ql-modal">
            <h3 id="bulk-go-title" className="cso-ql-modal-title">
              Gỡ {selectedIds.size} ghi danh chờ xử lý?
            </h3>
            <p className="cso-ql-modal-sub">
              Chỉ gỡ ghi danh chưa có kỳ học. Không hoàn tác được.
            </p>
            <div className="cso-ql-modal-foot">
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--text"
                onClick={() => setShowBulkGo(false)}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--danger"
                disabled={submitting || selectedIds.size === 0}
                onClick={() => void submitBulkGo()}
              >
                {submitting ? "Đang gỡ…" : `Gỡ ${selectedIds.size} ghi danh`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAdd ? (
        <div
          className="cso-ql-modal-backdrop"
          role="dialog"
          aria-modal
          aria-labelledby="them-ghi-danh-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAddModal();
          }}
        >
          <div className="cso-ql-modal">
            <h3 id="them-ghi-danh-title" className="cso-ql-modal-title">
              Thêm ghi danh
            </h3>
            <p className="cso-ql-modal-sub">
              Tìm theo tên / @slug, hoặc nhập email liên hệ chính xác (đã có tài
              khoản CINs).
            </p>
            <div className="cso-ql-modal-body">
              <div className="cso-ql-field cso-hv-lookup" ref={lookupWrapRef}>
                <label className="cso-ql-label" htmlFor={`${lookupListId}-input`}>
                  Học viên
                </label>
                <div className="cso-hv-lookup-control">
                  <input
                    id={`${lookupListId}-input`}
                    className="cso-ql-input"
                    value={lookup}
                    role="combobox"
                    aria-expanded={lookupOpen}
                    aria-controls={lookupListId}
                    aria-autocomplete="list"
                    aria-activedescendant={
                      lookupHighlight >= 0 && lookupResults[lookupHighlight]
                        ? `${lookupListId}-opt-${lookupResults[lookupHighlight]!.id}`
                        : undefined
                    }
                    autoComplete="off"
                    disabled={submitting}
                    placeholder="Tìm tên hoặc @slug…"
                    onChange={(e) => {
                      setLookup(e.target.value);
                      setLookupUserId(null);
                      setLookupOpen(true);
                    }}
                    onFocus={() => {
                      if (!lookupUserId && lookup.trim()) setLookupOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (!lookupOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                        if (lookupResults.length > 0) setLookupOpen(true);
                        return;
                      }
                      if (e.key === "Escape") {
                        setLookupOpen(false);
                        return;
                      }
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setLookupHighlight((i) =>
                          lookupResults.length === 0
                            ? -1
                            : Math.min(i + 1, lookupResults.length - 1),
                        );
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setLookupHighlight((i) => Math.max(i - 1, -1));
                        return;
                      }
                      if (e.key === "Enter" && lookupHighlight >= 0) {
                        const picked = lookupResults[lookupHighlight];
                        if (picked) {
                          e.preventDefault();
                          pickLookupUser(picked);
                        }
                      }
                    }}
                  />
                  {lookupLoading ? (
                    <span className="cso-hv-lookup-spin" aria-hidden>
                      …
                    </span>
                  ) : null}
                </div>
                {lookupUserId ? (
                  <p className="cso-hv-lookup-picked">
                    Đã chọn @{lookup.trim()}
                  </p>
                ) : null}
                {lookupOpen && !lookupUserId && lookup.trim().length >= 1 ? (
                  <ul
                    id={lookupListId}
                    className="cso-hv-lookup-list"
                    role="listbox"
                  >
                    {lookupLoading && lookupResults.length === 0 ? (
                      <li className="cso-hv-lookup-empty">Đang tìm…</li>
                    ) : lookupResults.length === 0 ? (
                      <li className="cso-hv-lookup-empty">
                        Không thấy user — thử email chính xác hoặc @slug.
                      </li>
                    ) : (
                      lookupResults.map((user, idx) => {
                        const name = user.ten_hien_thi?.trim() || user.slug;
                        const ava = user.avatar_id
                          ? getAvatarUrl(user.avatar_id)
                          : null;
                        const active = idx === lookupHighlight;
                        return (
                          <li key={user.id} role="presentation">
                            <button
                              type="button"
                              id={`${lookupListId}-opt-${user.id}`}
                              role="option"
                              aria-selected={active}
                              className={
                                active
                                  ? "cso-hv-lookup-item is-active"
                                  : "cso-hv-lookup-item"
                              }
                              onMouseEnter={() => setLookupHighlight(idx)}
                              onClick={() => pickLookupUser(user)}
                            >
                              <span className="cso-hv-ava" aria-hidden>
                                {ava ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={ava} alt="" />
                                ) : (
                                  initials(name)
                                )}
                              </span>
                              <span className="cso-hv-lookup-meta">
                                <strong>{name}</strong>
                                <span>@{user.slug}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                ) : null}
              </div>
              <label className="cso-ql-field">
                <span className="cso-ql-label">Lớp</span>
                <select
                  className="cso-ql-select"
                  value={addLopId}
                  onChange={(e) => setAddLopId(e.target.value)}
                >
                  {lop.length === 0 ? (
                    <option value="">
                      Chưa có lớp — tạo lớp trên trang khóa
                    </option>
                  ) : (
                    lop.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.tenKhoa} · {l.maLop}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>
            <div className="cso-ql-modal-foot">
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--text"
                onClick={closeAddModal}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--primary"
                disabled={
                  submitting || (!lookup.trim() && !lookupUserId) || !addLopId
                }
                onClick={() => void submitAdd()}
              >
                {submitting ? "Đang thêm…" : "Thêm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
