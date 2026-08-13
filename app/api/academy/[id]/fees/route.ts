import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getCinsTaiChinh, hasStkNhanPhi } from "@/lib/cins/tai-chinh-config";
import { getCsdtPhiGate } from "@/lib/co-so/phi-gate";
import { listOrgPhiKy } from "@/lib/co-so/phi-ky";
import { tienPhaiTra } from "@/lib/co-so/phi-config";
import { buildVietQrImageUrl } from "@/lib/shop/vietqr";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/co-so/:id/phi — gate + kỳ + khối thanh toán (đọc). */
export async function GET(_req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  const quyen = await getCoSoModuleQuyen(
    orgId,
    actorId,
    vaiTro,
    "hoc-phi-doi-soat",
  );
  if (quyen === "an") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [gate, kys, cfg] = await Promise.all([
    getCsdtPhiGate(orgId),
    listOrgPhiKy(orgId, 24),
    getCinsTaiChinh(),
  ]);

  const noGan =
    gate.kyQuaHan[0] ??
    gate.kyChuaTra[0] ??
    null;
  const soTienNo = noGan
    ? Math.max(
        0,
        tienPhaiTra(noGan.phiPhaiTraVnd, noGan.dieuChinhVnd) - noGan.daTraVnd,
      )
    : 0;

  const coStk = hasStkNhanPhi(cfg);
  let qrUrl: string | null = null;
  if (coStk && noGan && soTienNo > 0) {
    qrUrl = buildVietQrImageUrl({
      nganHang: cfg.bank.bin || cfg.bank.ten || "",
      soTaiKhoan: cfg.bank.soTk || "",
      amountVnd: soTienNo,
      addInfo: noGan.maThamChieu,
    });
  }

  return NextResponse.json({
    gate,
    kys,
    tyLe: cfg.csdt.tyLe,
    nguongVnd: cfg.csdt.nguongVnd,
    thanhToan: {
      available: coStk,
      bank: coStk
        ? {
            ten: cfg.bank.ten,
            soTk: cfg.bank.soTk,
            chuTk: cfg.bank.chuTk,
            bin: cfg.bank.bin,
          }
        : null,
      maThamChieu: noGan?.maThamChieu ?? null,
      soTienVnd: soTienNo > 0 ? soTienNo : null,
      hanTra: noGan?.hanTra ?? null,
      ngayChot: noGan?.ngayChot ?? null,
      qrUrl,
    },
  });
}
