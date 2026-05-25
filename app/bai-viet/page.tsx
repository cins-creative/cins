import type { Metadata } from "next";

import { BaiVietHubScreen } from "@/components/bai-viet/BaiVietHubScreen";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import { isHubLoaiId } from "@/lib/bai-viet/hub-loai";
import { listBlogHub } from "@/lib/bai-viet/queries";

import "@/app/cins-career.css";
import "@/app/cins-huong-nghiep-hub.css";
import "@/app/cins-bai-viet-hub.css";

export const metadata: Metadata = {
  title: "Bài viết | CINs",
  description:
    "Góc nhìn và phân tích về ngành sáng tạo Việt Nam — bài viết editorial từ CINs.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type Props = {
  searchParams?: Promise<{
    loai?: string;
    cap_do?: string;
    q?: string;
    page?: string;
  }>;
};

export default async function BaiVietIndexPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const loaiRaw = sp.loai?.trim() ?? "";
  const loaiSlug = isHubLoaiId(loaiRaw) ? loaiRaw : "";
  const capDoSlug = sp.cap_do?.trim() ?? "";
  const q = sp.q?.trim() ?? "";
  const page = Math.max(Number(sp.page ?? "1") || 1, 1);
  const limit = loaiSlug || q ? PAGE_SIZE : 48;
  const offset = (page - 1) * limit;

  const result = await listBlogHub({
    loai: loaiSlug || undefined,
    capDoSlug: capDoSlug || undefined,
    q: q || undefined,
    offset,
    limit: PAGE_SIZE,
  });

  return (
    <CinsShell data-screen-label="Bai-viet-hub">
      <div className="career-page career-page--hub">
      <BaiVietHubScreen
        result={result}
        loaiSlug={loaiSlug}
        capDoSlug={capDoSlug}
        q={q}
        page={page}
        pageSize={PAGE_SIZE}
      />
      </div>
      <SiteFooter />
    </CinsShell>
  );
}
