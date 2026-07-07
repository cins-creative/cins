import Link from "next/link";
import { ArrowRight, University } from "lucide-react";

import { TimKhoaHocHubShell } from "@/app/tim-khoa-hoc/_components/TimKhoaHocHubShell";
import {
  timKhoaHocHubHref,
  type TimKhoaHocLoai,
} from "@/app/tim-khoa-hoc/_components/tim-khoa-hoc-params";
import { MissingSupabaseEnvNotice } from "@/components/cins/MissingSupabaseEnvNotice";
import { NganhHubCard } from "@/components/nganh/NganhHubCard";
import { deptCardThemeByIndex } from "@/lib/career/hubRailTheme";
import { loadNganhHubListing } from "@/lib/nganh/loadNganhHubListing";
import { loadKhoaHocListing } from "@/lib/to-chuc/khoa-hoc-listing";

type Props = {
  q: string;
  loai: TimKhoaHocLoai;
};

export async function TimKhoaHocHubLoader({ q, loai }: Props) {
  const showKhoa = loai === "all" || loai === "khoa";
  const showNganh = loai === "all" || loai === "nganh";

  const [khoaListing, nganhListing] = await Promise.all([
    showKhoa ? loadKhoaHocListing(200, 0, q || undefined) : Promise.resolve({ items: [], total: 0 }),
    showNganh ? loadNganhHubListing({ q: q || undefined }) : Promise.resolve({
      searchQuery: q,
      nganhSidebarGroups: [],
      activeNhomId: "",
      activeNhomLabel: null,
      nganhGroups: [],
      sampleNganh: [],
      listError: undefined,
    }),
  ]);

  const { items: khoaItems, total: khoaTotal } = khoaListing;
  const { nganhGroups, listError: nganhListError } = nganhListing;
  const nganhCount = nganhListing.sampleNganh.length;
  const hasQuery = q.length > 0;

  const resultsBar = hasQuery ? (
    <p className="tkh-results-bar" role="status">
      Kết quả cho <strong>「{q}」</strong>
      {loai === "all" ? (
        <>
          {" "}
          — <strong>{khoaTotal}</strong> khóa học
          {showNganh ? (
            <>
              {" "}
              · <strong>{nganhCount}</strong> ngành
            </>
          ) : null}
        </>
      ) : loai === "khoa" ? (
        <>
          {" "}
          — <strong>{khoaTotal}</strong> khóa học
        </>
      ) : (
        <>
          {" "}
          — <strong>{nganhCount}</strong> ngành
        </>
      )}
      {" · "}
      <Link href={timKhoaHocHubHref({ loai })} prefetch={false}>
        Xóa bộ lọc
      </Link>
    </p>
  ) : null;

  const nganhSection = showNganh ? (
    <section
      className="tkh-section tkh-section--nganh"
      id="nganh-dai-hoc"
      aria-labelledby="tkh-sec-nganh-title"
    >
      <header className="tkh-section-head tkh-section-head--compact">
        <div className="tkh-section-icon tkh-section-icon--blue" aria-hidden>
          <University size={18} strokeWidth={2} />
        </div>
        <h2 className="tkh-section-title" id="tkh-sec-nganh-title">
          Ngành đại học
        </h2>
        {!hasQuery && nganhCount > 0 ? (
          <p className="tkh-section-meta">
            <strong>{nganhCount}</strong> ngành
          </p>
        ) : null}
      </header>

      <div className="tkh-nganh-wrap career-hub career-hub--hn career-hub--nganh">
        <div className="hn-content">
          {nganhListError ? (
            <div className="hn-empty">
              <p className="cins-body">
                {nganhListError.reason === "no_env" ? (
                  <MissingSupabaseEnvNotice />
                ) : (
                  <>
                    <strong>Không tải được danh sách ngành học.</strong>
                    {nganhListError.message ? (
                      <span className="block mt-2 text-sm opacity-90">
                        {nganhListError.message}
                      </span>
                    ) : null}
                  </>
                )}
              </p>
            </div>
          ) : nganhGroups.length === 0 ? (
            <p className="tkh-empty tkh-empty--section">
              {hasQuery
                ? "Không có ngành khớp từ khóa — thử mã ngành, khối thi hoặc tên ngành khác."
                : "Chưa có ngành đào tạo nào được xuất bản."}
            </p>
          ) : (
            nganhGroups.map((group, groupIndex) => (
              <section
                key={group.id}
                id={`tkh-${group.id}`}
                className="hn-dept"
                aria-labelledby={`tkh-${group.id}-title`}
              >
                <header className="hn-dept-head">
                  <div>
                    <h3 className="hn-dept-name" id={`tkh-${group.id}-title`}>
                      {group.title}
                      <span className="hn-dept-badge">
                        {String(groupIndex + 1).padStart(2, "0")} ·{" "}
                        {group.items.length} ngành
                      </span>
                    </h3>
                    {group.intro?.trim() ? (
                      <p className="hn-dept-desc">{group.intro.trim()}</p>
                    ) : null}
                  </div>
                </header>
                <ul className="hn-role-grid">
                  {group.items.map((item) => (
                    <NganhHubCard
                      key={item.id}
                      item={item}
                      href={`/nganh-hoc/${item.slug}`}
                      deptTheme={deptCardThemeByIndex(groupIndex)}
                      nhomId={group.nhomId}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>

      <Link
        href={
          hasQuery
            ? `/nganh-hoc?q=${encodeURIComponent(q)}`
            : "/nganh-hoc"
        }
        className="tkh-section-link"
        prefetch={false}
      >
        {hasQuery ? "Xem thêm ngành trên hub ngành học" : "Xem đầy đủ ngành học"}
        <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
      </Link>
    </section>
  ) : null;

  return (
    <TimKhoaHocHubShell
      q={q}
      loai={loai}
      khoaItems={khoaItems}
      khoaTotal={khoaTotal}
      showKhoa={showKhoa}
      hasQuery={hasQuery}
      resultsBar={resultsBar}
      nganhSection={nganhSection}
    />
  );
}
