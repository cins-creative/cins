/**
 * Đổi `<span class="arc-skill-emoji">…</span>` (emoji từ CMS) → Material Symbols Outlined.
 * Nếu nội dung đã là tên icon (chữ thường + _), giữ nguyên tên.
 */

const EMOJI_TO_LIGATURE: Record<string, string> = {
  "✏️": "draw",
  "✍️": "edit",
  "🎨": "palette",
  "🖌️": "brush",
  "🖍️": "format_paint",
  "📐": "straighten",
  "📏": "square_foot",
  "🔧": "build",
  "⚙️": "settings",
  "🧊": "view_in_ar",
  "💡": "lightbulb",
  "👁️": "visibility",
  "🎯": "track_changes",
  "📱": "smartphone",
  "🖥️": "desktop_windows",
  "🎬": "movie",
  "🎮": "sports_esports",
  "📊": "bar_chart",
  "🔍": "search",
  "🧩": "extension",
  "⚡": "bolt",
  "🌐": "language",
  "📦": "inventory_2",
  "🧠": "psychology",
  "👤": "person",
  "🤝": "handshake",
  "📌": "push_pin",
  "✨": "auto_awesome",
  "🛠️": "handyman",
  "🖼️": "image",
  "📝": "edit_note",
  "📋": "assignment",
  "🏗️": "construction",
  "🎭": "theater_comedy",
  "🔄": "sync",
  "⏱️": "timer",
  "🧪": "science",
  "📸": "photo_camera",
  "🎵": "music_note",
  "🔊": "volume_up",
  "💻": "computer",
  "⌨️": "keyboard",
  "🖱️": "mouse",
  "📽️": "videocam",
};

const ICON_NAME = /^[a-z][a-z0-9_]*$/;

export function transformArcSkillEmojiSpans(html: string): string {
  return html.replace(
    /<span\s+class="([^"]*\barc-skill-emoji\b[^"]*)"[^>]*>([\s\S]*?)<\/span>/gi,
    (full, classNames: string, inner: string) => {
      if (/\barc-skill-ms\b/.test(classNames)) {
        return full;
      }
      const raw = String(inner)
        .replace(/&nbsp;/g, " ")
        .trim();
      if (!raw) {
        return `<span class="arc-skill-emoji arc-skill-ms material-symbols-outlined" aria-hidden="true">widgets</span>`;
      }

      let lig = EMOJI_TO_LIGATURE[raw];
      if (!lig && ICON_NAME.test(raw)) {
        lig = raw;
      }
      if (!lig) {
        lig = "widgets";
      }

      return `<span class="arc-skill-emoji arc-skill-ms material-symbols-outlined" aria-hidden="true">${lig}</span>`;
    },
  );
}
