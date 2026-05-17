import type { Metadata } from "next";
import Link from "next/link";

import { ArticleLoaiBadge } from "@/components/article/ArticleLoaiBadge";
import { CinsShell } from "@/components/cins/CinsShell";
import { MissingSupabaseEnvNotice } from "@/components/cins/MissingSupabaseEnvNotice";
import { SiteFooter } from "@/components/cins/SiteFooter";
import { formatRelativeTimeVi } from "@/lib/articles/format";
import { LOAI_LABELS } from "@/lib/articles/labels";
import type { LoaiBaiViet } from "@/lib/articles/types";
import { listArticlesForPublicIndex } from "@/lib/articles/queries";

export const metadata: Metadata = {
  title: "Bài viết | CINs",
  description:
    "Danh sách bài viết tag — nghề, ngành, phần mềm, keyword và editorial CINs.",
};

export const dynamic = "force-dynamic";

const FILTER_KEYS: { key: string; label: string }[] = [
  { key: "", label: "Tất cả" },
  ...(
    Object.keys(LOAI_LABELS) as LoaiBaiViet[]
  ).map((k) => ({ key: k, label: LOAI_LABELS[k] })),
];

type Props = {
  searchParams?: Promise<{ loai?: string }>;
};

export default async function BaiVietIndexPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const loai = sp.loai?.trim() || undefined;

  const result = await listArticlesForPublicIndex({
    loai,
    limit: 300,
  });

  return (
    <CinsShell data-screen-label="Bai-viet-index">
      <div className="article-page">
        <div className="article-page-inner">
          <header className="article-listing-head">
            <h1 className="article-listing-title">Bài viết</h1>
            <p className="article-listing-lead">
              Các tag nội dung đã xuất bản. Chọn một dòng để đọc chi tiết.
            </p>
          </header>

          <nav className="article-listing-filters" aria-label="Lọc theo loại">
            {FILTER_KEYS.map(({ key, label }) => {
              const href = key ? `/bai-viet?loai=${encodeURIComponent(key)}` : "/bai-viet";
              const active = (key || "") === (loai || "");
              return (
                <Link
                  key={key || "all"}
                  href={href}
                  className={`article-filter-pill${active ? " is-active" : ""}`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {!result.ok && result.reason === "no_env" ? (
            <div className="article-listing-panel article-listing-panel-warn">
              <MissingSupabaseEnvNotice />
            </div>
          ) : null}

          {!result.ok && result.reason === "query_error" ? (
            <div className="article-listing-panel article-listing-panel-error">
              <strong>Không tải được danh sách.</strong>
              {result.message ? (
                <pre className="mt-2 whitespace-pre-wrap break-all text-sm opacity-90">
                  {result.message}
                </pre>
              ) : null}
              <p className="mt-3 text-sm font-semibold text-red-950">
                Nếu lỗi là <code>TypeError: fetch failed</code> (lỗi mạng, chưa phải RLS):
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed">
                <li>
                  Kiểm tra <code>NEXT_PUBLIC_SUPABASE_URL</code> trong{" "}
                  <code>.env.local</code>: đúng dạng{" "}
                  <code>https://xxxx.supabase.co</code>, không có dấu cách hay dấu ngoặc.
                </li>
                <li>
                  Mở cùng URL đó trên trình duyệt — nếu không tải được thì máy/VPN/firewall đang
                  chặn tới Supabase.
                </li>
                <li>
                  Trên Windows, thử chạy terminal trước khi <code>npm run dev</code>:{" "}
                  <code className="rounded bg-red-100 px-1">
                    set NODE_OPTIONS=--dns-result-order=ipv4first
                  </code>{" "}
                  (một số mạng lỗi IPv6 tới Supabase).
                </li>
                <li>Tắt VPN thử, hoặc đổi mạng (hotspot điện thoại).</li>
              </ul>
              <p className="mt-3 text-sm">
                Nếu mạng OK nhưng vẫn lỗi PostgREST (403 / không có dòng): kiểm tra bảng{" "}
                <code>article_bai_viet</code> và policy RLS <strong>SELECT</strong> cho role{" "}
                <code>anon</code>.
              </p>
            </div>
          ) : null}

          {result.ok && result.items.length === 0 ? (
            <div className="article-listing-panel">
              Chưa có bài <strong>published</strong> nào — hoặc bộ lọc loại không khớp dữ liệu.
            </div>
          ) : null}

          {result.ok && result.items.length > 0 ? (
            <ul className="article-listing-table" aria-label="Danh sách bài viết">
              {result.items.map((row) => (
                <li key={row.id} className="article-listing-row">
                  <div className="article-listing-row-main">
                    <Link href={`/bai-viet/${row.slug}`} className="article-listing-link">
                      {row.tieu_de}
                    </Link>
                    {row.tom_tat ? (
                      <p className="article-listing-excerpt">{row.tom_tat}</p>
                    ) : null}
                  </div>
                  <div className="article-listing-row-meta">
                    <ArticleLoaiBadge loai={row.loai_bai_viet} />
                    <span className="article-listing-meta-muted">
                      {row.luot_xem.toLocaleString("vi-VN")} xem
                    </span>
                    <span className="article-listing-meta-muted" title={row.cap_nhat_luc}>
                      {formatRelativeTimeVi(row.cap_nhat_luc)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <SiteFooter />
    </CinsShell>
  );
}
