"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  BookOpen,
  Building2,
  GraduationCap,
  Users,
} from "lucide-react";

import { coSoQuanLyPath, coSoRootPath } from "@/lib/to-chuc/co-so-routes";
import { schoolInitials } from "@/lib/truong/school-avatar";

type Funnel = {
  soGhiDanh: number;
  soDangHoc: number;
  soFreeze: number;
  soDonCho: number;
  soDonDaNhan: number;
};

type Props = {
  orgId: string;
  orgSlug: string;
  orgTen: string;
  orgLogoSrc?: string | null;
};

const FLOW: Array<{
  key: keyof Funnel;
  label: string;
  hint: string;
  tone: "rail" | "warn" | "ok";
}> = [
  {
    key: "soGhiDanh",
    label: "Ghi danh",
    hint: "Đã vào sổ lớp",
    tone: "rail",
  },
  {
    key: "soDonCho",
    label: "Chờ TT",
    hint: "Chưa đối soát",
    tone: "warn",
  },
  {
    key: "soDonDaNhan",
    label: "Đã nhận",
    hint: "Đã đóng học phí",
    tone: "ok",
  },
  {
    key: "soDangHoc",
    label: "Đang học",
    hint: "Kỳ còn hạn",
    tone: "rail",
  },
  {
    key: "soFreeze",
    label: "Freeze",
    hint: "Hết kỳ / tạm dừng",
    tone: "warn",
  },
];

/** Khớp nav nhóm A: Thiết lập · Học · Tiền */
const LANES: Array<{
  title: string;
  desc: string;
  items: Array<{
    hrefKey:
      | "co-so"
      | "lop-hoc"
      | "hoc-vien"
      | "diem-danh"
      | "doanh-thu"
      | "public";
    label: string;
    hint: string;
    Icon: typeof Building2;
  }>;
}> = [
  {
    title: "Thiết lập",
    desc: "Mặt tiền và địa điểm đồng bộ trang công khai.",
    items: [
      {
        hrefKey: "co-so",
        label: "Cơ sở",
        hint: "Thông tin · chi nhánh · thành viên",
        Icon: Building2,
      },
    ],
  },
  {
    title: "Học",
    desc: "Catalog lớp, học viên và điểm danh trong ngày.",
    items: [
      {
        hrefKey: "lop-hoc",
        label: "Khóa & lớp",
        hint: "Catalog · giáo trình · duyệt bài",
        Icon: BookOpen,
      },
      {
        hrefKey: "hoc-vien",
        label: "Học viên",
        hint: "Ghi danh · thu tiền · gia hạn",
        Icon: Users,
      },
      {
        hrefKey: "diem-danh",
        label: "Điểm danh",
        hint: "Có mặt / vắng theo lớp",
        Icon: GraduationCap,
      },
    ],
  },
  {
    title: "Tiền",
    desc: "STK, gói và đối soát VietQR / tiền mặt.",
    items: [
      {
        hrefKey: "doanh-thu",
        label: "Doanh thu",
        hint: "Gói · STK · đơn chờ",
        Icon: Banknote,
      },
    ],
  },
];

function laneHref(
  orgSlug: string,
  key: (typeof LANES)[number]["items"][number]["hrefKey"],
) {
  if (key === "public") return coSoRootPath(orgSlug);
  return coSoQuanLyPath(orgSlug, key);
}

export function TongQuanQuanLyClient({
  orgId,
  orgSlug,
  orgTen,
  orgLogoSrc,
}: Props) {
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/marketing`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải tổng quan.");
      setFunnel(data.funnel);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const soDonCho = funnel?.soDonCho ?? 0;
  const soFreeze = funnel?.soFreeze ?? 0;
  const soDangHoc = funnel?.soDangHoc ?? 0;

  return (
    <div className="cso-tq">
      <header className="cso-tq-hero">
        <div className="cso-tq-hero-main">
          <div className="cso-tq-hero-logo" aria-hidden={!orgLogoSrc}>
            {orgLogoSrc ? (
              <Image
                src={orgLogoSrc}
                alt=""
                width={64}
                height={64}
                className="cso-tq-hero-logo-img"
                unoptimized={orgLogoSrc.includes("imagedelivery.net")}
              />
            ) : (
              <span className="cso-tq-hero-logo-initials">
                {schoolInitials(orgTen)}
              </span>
            )}
          </div>
          <div className="cso-tq-hero-copy">
            <p className="cso-tq-kicker">Tổng quan vận hành</p>
            <h2 className="cso-tq-heading">{orgTen}</h2>
            <p className="cso-tq-lead">
              Điều khiển học phí, lớp và học viên tại đây. Trang cơ sở chỉ
              phản chiếu những gì bạn đã cấu hình.
            </p>
          </div>
        </div>
        <div className="cso-tq-hero-actions">
          <Link
            href={coSoRootPath(orgSlug)}
            className="cso-ql-btn cso-ql-btn--ghost cso-tq-hero-btn"
          >
            Xem trang cơ sở
            <ArrowUpRight size={15} strokeWidth={2.2} aria-hidden />
          </Link>
        </div>
      </header>

      {error ? <p className="cso-ql-error">{error}</p> : null}

      <section className="cso-tq-pulse" aria-label="Nhịp vận hành">
        <div className="cso-tq-pulse-head">
          <h3 className="cso-tq-pulse-title">Nhịp hiện tại</h3>
          <p className="cso-tq-pulse-sub">
            Funnel vận hành: tư vấn → đóng tiền → học / freeze. Số nóng cần xử
            lý nằm bên trái.
          </p>
        </div>

        <div className="cso-tq-pulse-body">
          <div className="cso-tq-attention" aria-label="Ưu tiên">
            <Link
              href={coSoQuanLyPath(orgSlug, "doanh-thu")}
              className={`cso-tq-attn${soDonCho > 0 ? " is-hot" : ""}`}
            >
              <span className="cso-tq-attn-label">Đơn chờ TT</span>
              <span className="cso-tq-attn-value">
                {loading ? "…" : soDonCho}
              </span>
              <span className="cso-tq-attn-hint">Đối soát Doanh thu</span>
            </Link>
            <Link
              href={coSoQuanLyPath(orgSlug, "hoc-vien")}
              className={`cso-tq-attn${soFreeze > 0 ? " is-hot" : ""}`}
            >
              <span className="cso-tq-attn-label">Freeze</span>
              <span className="cso-tq-attn-value">
                {loading ? "…" : soFreeze}
              </span>
              <span className="cso-tq-attn-hint">Gia hạn / thu tiền</span>
            </Link>
            <div className="cso-tq-attn cso-tq-attn--calm">
              <span className="cso-tq-attn-label">Đang học</span>
              <span className="cso-tq-attn-value">
                {loading ? "…" : soDangHoc}
              </span>
              <span className="cso-tq-attn-hint">Kỳ còn hạn</span>
            </div>
          </div>

          <ol className="cso-tq-flow" aria-label="Funnel vận hành">
            {FLOW.map((step, index) => (
              <li
                key={step.key}
                className={`cso-tq-flow-step cso-tq-flow-step--${step.tone}`}
              >
                {index > 0 ? (
                  <span className="cso-tq-flow-join" aria-hidden />
                ) : null}
                <span className="cso-tq-flow-idx" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="cso-tq-flow-value">
                  {loading ? "…" : (funnel?.[step.key] ?? "—")}
                </span>
                <span className="cso-tq-flow-label">{step.label}</span>
                <span className="cso-tq-flow-hint">{step.hint}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cso-tq-lanes" aria-label="Lối vào nhanh">
        {LANES.map((lane) => (
          <div key={lane.title} className="cso-tq-lane">
            <header className="cso-tq-lane-head">
              <h3 className="cso-tq-lane-title">{lane.title}</h3>
              <p className="cso-tq-lane-desc">{lane.desc}</p>
            </header>
            <ul className="cso-tq-lane-list">
              {lane.items.map((item) => (
                <li key={item.hrefKey}>
                  <Link
                    href={laneHref(orgSlug, item.hrefKey)}
                    className="cso-tq-lane-link"
                  >
                    <span className="cso-tq-lane-icon" aria-hidden>
                      <item.Icon size={16} strokeWidth={2.1} />
                    </span>
                    <span className="cso-tq-lane-text">
                      <span className="cso-tq-lane-label">{item.label}</span>
                      <span className="cso-tq-lane-hint">{item.hint}</span>
                    </span>
                    <ArrowUpRight
                      className="cso-tq-lane-arrow"
                      size={15}
                      strokeWidth={2.1}
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
