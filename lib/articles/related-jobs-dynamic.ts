/** Bài B từ `article_lien_quan` (loại quan hệ LIEN_QUAN) — inject vào `data-dynamic="related-jobs"`. */
export type RelatedJobLienQuanRow = {
  slug: string;
  tieu_de: string;
  tom_tat: string | null;
  loai_bai_viet: string;
};

export const DEFAULT_RELATED_JOB_NOTE =
  "Hai vị trí này thường phối hợp trong cùng một pipeline sản xuất.";

/** Mô tả tương tác theo slug bài B (brief CINS). */
export const RELATION_NOTES: Record<string, string> = {
  "nghe-concept-artist":
    "Cùng làm pre-production nhưng Concept Artist tổng quát lo environment và props — Character CA chỉ focus vào nhân vật. Hai bên chia sẻ style guide chung.",
  "nghe-3d-modeller":
    "Character CA bàn giao turnaround sheet cho 3D Modeller để xây dựng model. Cần feedback 2 chiều: CA phải hiểu constraint polygon, Modeller phải trung thành với design.",
  "nghe-motion-designer":
    "Motion Designer dùng expression sheet và pose reference từ Character CA khi làm animation marketing. Ít tương tác trực tiếp hơn Animator trong game pipeline.",
  "nghe-game-designer":
    "Game Designer định nghĩa role của nhân vật trong gameplay — ảnh hưởng đến thiết kế visual. Ví dụ: tank thì to, healer thì có màu warm, assassin thì silhouette gọn.",
};

export const JOB_ICONS: Record<string, string> = {
  "nghe-concept-artist": "🎨",
  "nghe-character-concept-artist": "👤",
  "nghe-3d-modeller": "🧊",
  "nghe-motion-designer": "🎬",
  "nghe-ui-ux-designer": "📱",
  "nghe-game-designer": "🎮",
};

export const JOB_COLORS: Record<string, string> = {
  "nghe-concept-artist": "var(--cins-blue-soft)",
  "nghe-3d-modeller": "var(--cins-mint-soft)",
  "nghe-motion-designer": "var(--cins-violet-soft)",
  "nghe-ui-ux-designer": "var(--cins-orange-soft)",
  "nghe-game-designer": "var(--cins-yellow-soft)",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildRelatedJobsHTML(jobs: readonly RelatedJobLienQuanRow[]): string {
  const cards = jobs
    .map((job) => {
      const slug = job.slug.trim();
      const note = RELATION_NOTES[slug] ?? DEFAULT_RELATED_JOB_NOTE;
      const icon = JOB_ICONS[slug] ?? "💼";
      const bg = JOB_COLORS[slug] ?? "var(--neutral-100)";
      const title = escapeHtml(job.tieu_de.trim() || "Không tiêu đề");
      const desc = escapeHtml((job.tom_tat ?? "").trim());
      const noteEsc = escapeHtml(note);

      return `<a class="arc-related-card" href="/bai-viet/${escapeHtml(slug)}">
        <div class="arc-related-icon" style="background:${bg}">${icon}</div>
        <div class="arc-related-info">
          <span class="arc-related-title">${title}</span>
          <span class="arc-related-desc">${desc}</span>
          <div class="arc-related-note">${noteEsc}</div>
        </div>
        <span class="arc-related-arrow">→</span>
      </a>`;
    })
    .join("");

  return `<div class="arc-related-grid">${cards}</div>`;
}

/**
 * Chèn `.arc-related-grid` ngay trước thẻ đóng của phần tử có `data-dynamic="related-jobs"`.
 * Hỗ trợ `section` / `div` (tên thẻ lấy từ mở thẻ khớp đầu tiên).
 */
export function injectRelatedJobsGridIntoHtml(
  html: string,
  jobs: readonly RelatedJobLienQuanRow[],
): string {
  if (!jobs.length) return html;
  if (!html.includes('data-dynamic="related-jobs"')) return html;

  const openRe =
    /<([a-z][a-z0-9]*)([^>]*\bdata-dynamic="related-jobs"[^>]*)>/i;
  const m = openRe.exec(html);
  if (!m || m.index === undefined) return html;

  const tag = m[1]!.toLowerCase();
  const innerStart = m.index + m[0].length;
  const closeSeq = `</${tag}>`;
  const closeIdx = html.indexOf(closeSeq, innerStart);
  if (closeIdx === -1) return html;

  const grid = buildRelatedJobsHTML(jobs);
  return html.slice(0, closeIdx) + grid + html.slice(closeIdx);
}
