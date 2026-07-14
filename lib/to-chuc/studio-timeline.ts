import { labelTinhThanh } from "@/lib/truong/contact";
import { currentCalendarYear } from "@/lib/truong/diem-chuan";
import { normalizeLoaiBaiDang, type BaiDangLoai } from "@/lib/truong/bai-dang";
import { studioLoaiLabel } from "@/lib/truong/org-bai-dang-loai-options";
import { baiDangYear } from "@/lib/truong/bai-dang-timeline";
import {
  isTruongBaiDangScheduled,
  isTruongBaiDangVisibleOnTimeline,
} from "@/lib/truong/org-bai-dang-schedule";
import { formatTimelineDate, getStepStatus } from "@/lib/truong/timeline";
import {
  mocDateSortKey,
  parseCalendarYearFromDate,
} from "@/lib/truong/timeline-moc";
import type { TuyenSinhTimelineStep } from "@/lib/truong/timeline-steps";
import type { TruongBaiDang } from "@/lib/truong/types";
import { STUDIO_SHOWCASE_LOAI } from "@/lib/to-chuc/studio-page-config";
import { studioTabPath } from "@/lib/to-chuc/studio-routes";
import {
  STUDIO_JOB_LOAI_HINH_LABEL,
  type StudioJob,
} from "@/lib/to-chuc/studio-tuyen-dung-types";

const JOB_STEP_PREFIX = "studio-job:";
const BAI_DANG_STEP_PREFIX = "studio-baidang:";

/** Loại bài đăng (`loai_bai_dang`) hiện trên sidebar Thông báo studio. */
export const STUDIO_SIDEBAR_BAI_DANG_LOAI: ReadonlySet<BaiDangLoai> = new Set([
  "thong_bao",
  "su_kien",
]);

export function isStudioShowcasePost(
  post: Pick<TruongBaiDang, "loai_bai_dang">,
): boolean {
  return (
    String(post.loai_bai_dang ?? "")
      .trim()
      .toLowerCase() === STUDIO_SHOWCASE_LOAI
  );
}

export function isStudioSidebarBaiDangPost(
  post: Pick<TruongBaiDang, "loai_bai_dang" | "trang_thai" | "tao_luc">,
  options: { includeScheduled?: boolean } = {},
): boolean {
  if (isStudioShowcasePost(post)) return false;
  const loai = normalizeLoaiBaiDang(post.loai_bai_dang);
  if (!STUDIO_SIDEBAR_BAI_DANG_LOAI.has(loai)) return false;
  if (options.includeScheduled) {
    return (
      isTruongBaiDangVisibleOnTimeline(post) ||
      isTruongBaiDangScheduled(post)
    );
  }
  return isTruongBaiDangVisibleOnTimeline(post);
}

export function studioJobStepId(jobId: string): string {
  return `${JOB_STEP_PREFIX}${jobId}`;
}

export function parseStudioJobStepId(stepId: string): string | null {
  return stepId.startsWith(JOB_STEP_PREFIX)
    ? stepId.slice(JOB_STEP_PREFIX.length)
    : null;
}

export function studioBaiDangStepId(postId: string): string {
  return `${BAI_DANG_STEP_PREFIX}${postId}`;
}

export function parseStudioBaiDangStepId(stepId: string): string | null {
  return stepId.startsWith(BAI_DANG_STEP_PREFIX)
    ? stepId.slice(BAI_DANG_STEP_PREFIX.length)
    : null;
}

function jobPlace(job: StudioJob): string {
  if (job.lamTuXa) return "Remote";
  return labelTinhThanh(job.tinhThanh) ?? "Linh hoạt";
}

/** Vị trí tuyển dụng đang mở → bước timeline (luôn ghim đầu sidebar). */
export function buildStudioJobSteps(
  jobs: StudioJob[],
  orgSlug: string,
): TuyenSinhTimelineStep[] {
  const href = studioTabPath(orgSlug, "tuyen-dung");
  const entries = jobs.map((job) => {
    const deadline = job.hanNop?.trim() || null;
    const formatted = deadline ? formatTimelineDate(deadline) : null;
    const descParts = [
      jobPlace(job),
      STUDIO_JOB_LOAI_HINH_LABEL[job.loaiHinh],
    ];
    return {
      step: {
        id: studioJobStepId(job.id),
        label: job.tieuDe,
        dateLabel: formatted ? `Hạn nộp ${formatted}` : "Đang tuyển",
        desc: descParts.join(" · "),
        link: href,
        status: "active" as const,
        dot: "→",
      },
      sortKey: mocDateSortKey(deadline, null),
    };
  });
  entries.sort((a, b) => a.sortKey - b.sortKey);
  return entries.map((e) => e.step);
}

/**
 * Bài đăng org (nhãn Thông báo / Sự kiện / Khác) → mốc sidebar.
 * Ngày mốc = `tao_luc` (hoặc giờ hẹn đăng khi `nhap` + tương lai).
 */
export function buildStudioBaiDangSteps(
  posts: ReadonlyArray<TruongBaiDang>,
  orgSlug: string,
  year: number,
  includeScheduled = false,
): TuyenSinhTimelineStep[] {
  const baiDangHref = studioTabPath(orgSlug, "bai-dang");
  const entries = posts
    .filter((p) => isStudioSidebarBaiDangPost(p, { includeScheduled }))
    .filter((p) => baiDangYear(p.tao_luc) === year)
    .map((post) => {
      const scheduled = isTruongBaiDangScheduled(post);
      const iso = post.tao_luc?.trim() || null;
      const status = iso ? getStepStatus(iso, iso) : "upcoming";
      let dateLabel = formatTimelineDate(iso) ?? "—";
      if (scheduled) {
        dateLabel = `Hẹn đăng · ${dateLabel}`;
      } else if (status === "active") {
        dateLabel = `${dateLabel} · Đang diễn ra`;
      }
      const descParts = [studioLoaiLabel(post.loai_bai_dang)];
      const summary = post.tom_tat?.trim();
      if (summary) descParts.push(summary);
      return {
        sortKey: mocDateSortKey(iso, null),
        step: {
          id: studioBaiDangStepId(post.id),
          label: post.tieu_de,
          dateLabel,
          desc: descParts.join(" · "),
          link: `${baiDangHref}#org-post-${post.id}`,
          status,
          dot:
            status === "done"
              ? "✓"
              : status === "active"
                ? "→"
                : scheduled
                  ? "◷"
                  : "★",
        } satisfies TuyenSinhTimelineStep,
      };
    });
  entries.sort((a, b) => a.sortKey - b.sortKey);
  return entries.map((e) => e.step);
}

export function studioBaiDangStepSortKey(
  step: TuyenSinhTimelineStep,
  posts: ReadonlyArray<TruongBaiDang>,
): number {
  const postId = parseStudioBaiDangStepId(step.id);
  if (!postId) return Number.MAX_SAFE_INTEGER;
  const post = posts.find((p) => p.id === postId);
  return mocDateSortKey(post?.tao_luc ?? null, null);
}

/** Năm lịch cho dropdown — từ bài đăng thông báo/sự kiện và hạn nộp tuyển dụng. */
export function collectStudioTimelineYears(
  posts: ReadonlyArray<TruongBaiDang>,
  jobs: ReadonlyArray<StudioJob>,
  includeScheduled = false,
): number[] {
  const years = new Set<number>();
  for (const post of posts) {
    if (!isStudioSidebarBaiDangPost(post, { includeScheduled })) continue;
    const y = baiDangYear(post.tao_luc);
    if (y) years.add(y);
  }
  for (const job of jobs) {
    const y = parseCalendarYearFromDate(job.hanNop);
    if (y) years.add(y);
  }
  if (!years.size) years.add(currentCalendarYear());
  return [...years].sort((a, b) => b - a);
}
