"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { orgQuanLyPath } from "@/lib/to-chuc/org-quan-ly-routes";

type GateLite = {
  trangThai: "hoat_dong" | "canh_bao" | "khoa_ghi_danh";
  tongNoVnd: number;
  hanTraGanNhat: string | null;
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
export function CsdtPhiGateBanner({ orgId, orgSlug }: Props) {
  const [gate, setGate] = useState<GateLite | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/co-so/${orgId}/phi/gate`, {
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

  const phiHref = orgQuanLyPath("co_so_dao_tao", orgSlug, "phi");
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
        ) : (
          <>
            Sắp đến hạn trả phí nền tảng
            {han ? ` (${han})` : ""}
            {gate.tongNoVnd > 0 ? ` · nợ ${fmtVnd(gate.tongNoVnd)}` : ""}.
          </>
        )}
      </div>
      <Link href={phiHref} className="cso-phi-banner-link">
        Xem Phí CINs
      </Link>
    </div>
  );
}
