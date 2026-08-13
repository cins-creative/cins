"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type GateLite = {
  trangThai: "hoat_dong" | "canh_bao" | "khoa_ghi_danh";
  tongNoVnd: number;
  hanTraGanNhat: string | null;
  tuKhaiTamMo?: boolean;
};

type Props = { orgId: string; orgSlug: string };

function fmtYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

/** Banner gate phí nền tảng — chỉ hiện canh_bao / khoa_ghi_danh. */
export function CsdtPhiGateBanner({ orgId }: Props) {
  const [gate, setGate] = useState<GateLite | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/academy/${orgId}/fees/gate`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;
        const json = (await res.json()) as GateLite;
        if (!cancelled) setGate(json);
      } catch {
        /* bỏ qua — banner không chặn trang */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  if (!gate || gate.trangThai === "hoat_dong") return null;

  const phiHref = `/account/billing?dv=${encodeURIComponent(orgId)}`;
  const han = gate.hanTraGanNhat ? fmtYmd(gate.hanTraGanNhat) : null;
  const isLock = gate.trangThai === "khoa_ghi_danh";

  return (
    <div
      className={`cso-phi-banner${isLock ? " cso-phi-banner--danger" : " cso-phi-banner--warn"}`}
      role="status"
    >
      <div className="cso-phi-banner-text">
        {isLock ? (
          <>
            Đã khóa thêm ghi danh mới
            {han ? ` — thanh toán kỳ hạn ${han}` : ""}
            {gate.tongNoVnd > 0 ? ` (${fmtVnd(gate.tongNoVnd)})` : ""} để mở lại.
          </>
        ) : gate.tuKhaiTamMo ? (
          <>
            Đã ghi nhận chuyển khoản — ghi danh tạm mở trong khi CINs đối soát
            {gate.tongNoVnd > 0 ? ` · nợ ${fmtVnd(gate.tongNoVnd)}` : ""}.
          </>
        ) : (
          <>
            Sắp đến hạn trả phí nền tảng
            {han ? ` (${han})` : ""}
            {gate.tongNoVnd > 0 ? ` · nợ ${fmtVnd(gate.tongNoVnd)}` : ""}.
          </>
        )}
      </div>
      <Link href={phiHref} className="cso-phi-banner-link">
        Thanh toán
      </Link>
    </div>
  );
}
