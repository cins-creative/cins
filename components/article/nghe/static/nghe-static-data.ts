export type StaticTip = {
  name: string;
  kind: string;
  desc: string;
  meta: string[];
  metaHot?: string;
  metaOk?: string;
  metaWarn?: string;
  footLeft?: string;
  footRight?: string;
  /** Ảnh preview trong tooltip (hover) */
  thumbnailSrc?: string | null;
  thumbnailAlt?: string | null;
};

export type StaticRelItemData = {
  thumb: string;
  thumbBg: string;
  name: string;
  sub?: string;
  tag: string;
  tagClass: string;
  tip: StaticTip;
  tipClass?: string;
  href?: string;
};

export type StaticRelCardData = {
  thumb: string;
  thumbBg: string;
  name: string;
  sub: string;
  tip: StaticTip;
  tipClass?: "tip-left" | "tip-right";
  href?: string;
};

export type StaticRelTileData = {
  thumb: string;
  thumbBg: string;
  name: string;
  tip: StaticTip;
  tipClass?: "tip-left" | "tip-right";
  href?: string;
};

const G = {
  blue: "linear-gradient(135deg,#3F8DFD,#0C50B8)",
  mint: "linear-gradient(135deg,#6EFEC0,#0E5C3B)",
  orange: "linear-gradient(135deg,#FE7745,#B53711)",
  violet: "linear-gradient(135deg,#BB89F8,#5C2BB6)",
  yellow: "linear-gradient(135deg,#F0D94A,#9A6E00)",
  blender: "linear-gradient(135deg,#F5792A,#E87B16)",
  maya: "linear-gradient(135deg,#0696D7,#005AAB)",
  zbrush: "linear-gradient(135deg,#A41F1F,#691010)",
  substance: "linear-gradient(135deg,#FF8400,#E55D00)",
  marmoset: "linear-gradient(135deg,#1E88E5,#0D47A1)",
  subdiv: "linear-gradient(135deg,#0EA47A,#064A2E)",
};

export const NGHE_SIDEBAR_KEYWORDS: StaticRelItemData[] = [
  {
    thumb: "UV",
    thumbBg: G.mint,
    name: "UV Mapping",
    sub: "trải bề mặt 3D",
    tag: "Kỹ thuật",
    tagClass: "rel-tag tag-mint",
    tip: {
      name: "UV Mapping",
      kind: "Keyword · Texturing",
      desc: "Trải bề mặt 3D thành bản đồ 2D để vẽ texture hoặc bake chi tiết từ high-poly xuống low-poly.",
      meta: ["Blender", "Maya", "3ds Max"],
      thumbnailSrc: "/assets/career-illustration-1.png",
      thumbnailAlt: "Minh họa UV / texturing",
    },
  },
  {
    thumb: "Rg",
    thumbBg: G.violet,
    name: "Rigging",
    sub: "bộ xương kỹ thuật số",
    tag: "Kỹ thuật",
    tagClass: "rel-tag tag-violet",
    tip: {
      name: "Rigging",
      kind: "Keyword · Animation pipeline",
      desc: "Tạo bộ xương ảo bên trong model — bone hierarchy, IK chain, control rig — để animator điều khiển.",
      meta: ["Maya", "Blender", "3ds Max"],
      thumbnailSrc: "/assets/career-illustration-2.png",
      thumbnailAlt: "Minh họa rigging",
    },
  },
  {
    thumb: "Pb",
    thumbBg: G.orange,
    name: "PBR Materials",
    sub: "physically-based rendering",
    tag: "Kỹ thuật",
    tagClass: "rel-tag tag-orange",
    tip: {
      name: "PBR Materials",
      kind: "Keyword · Shading",
      desc: "Mô tả vật liệu theo định luật vật lý — BaseColor, Normal, Roughness, Metallic. Chuẩn cross-engine.",
      meta: ["Substance", "Unreal", "Unity"],
      thumbnailSrc: "/assets/career-illustration-3.png",
      thumbnailAlt: "Minh họa PBR",
    },
  },
  {
    thumb: "Rt",
    thumbBg: G.blue,
    name: "Retopology",
    sub: "tối ưu polygon",
    tag: "Kỹ thuật",
    tagClass: "rel-tag tag-blue",
    tip: {
      name: "Retopology",
      kind: "Keyword · Mesh optimization",
      desc: "Dựng lại lưới poly sạch (low-poly) trên model sculpt (high-poly) — cần thiết cho game và animation.",
      meta: ["ZBrush", "Maya", "3D-Coat"],
      thumbnailSrc: "/assets/career-illustration-4.png",
      thumbnailAlt: "Minh họa retopology",
    },
  },
  {
    thumb: "Nm",
    thumbBg: G.yellow,
    name: "Normal Map",
    sub: "giả lập chi tiết bề mặt",
    tag: "Kỹ thuật",
    tagClass: "rel-tag tag-yellow",
    tip: {
      name: "Normal Map",
      kind: "Keyword · Texture map",
      desc: "Map RGB lưu hướng pháp tuyến — giả lập độ lồi lõm bề mặt mà không cần thêm geometry thật.",
      meta: ["Substance", "xNormal", "Marmoset"],
      thumbnailSrc: "/assets/illustration-gamepad.png",
      thumbnailAlt: "Minh họa normal map",
    },
  },
  {
    thumb: "Sb",
    thumbBg: G.subdiv,
    name: "Subdivision",
    sub: "chia mượt surface",
    tag: "Kỹ thuật",
    tagClass: "rel-tag tag-mint",
    tip: {
      name: "Subdivision Surface",
      kind: "Keyword · Modeling",
      desc: "Thuật toán chia nhỏ mặt poly để có surface mượt — tiêu chuẩn cho character modeling và film production.",
      meta: ["Blender", "Maya", "Pixar OpenSubdiv"],
      thumbnailSrc: "/assets/career-illustration-1.png",
      thumbnailAlt: "Minh họa subdivision",
    },
  },
];

export const NGHE_SIDEBAR_NGHE: StaticRelItemData[] = [
  {
    thumb: "Ca",
    thumbBg: G.blue,
    name: "Character Artist",
    sub: "nhân vật & sinh vật",
    tag: "Cùng mảng",
    tagClass: "rel-tag tag-blue",
    tip: {
      name: "Character Artist",
      kind: "Nghề · Game / Phim",
      desc: "Sculpt & modeling nhân vật từ concept — yêu cầu anatomy chắc, tay nghề sculpt mạnh, gu thẩm mỹ tốt.",
      meta: ["Hot", "$1.2–2.5k/mo"],
      metaHot: "Hot",
      thumbnailSrc: "/assets/mascot-artist.png",
      thumbnailAlt: "Character Artist",
    },
  },
  {
    thumb: "Co",
    thumbBg: G.orange,
    name: "Concept Artist",
    sub: "vẽ ý tưởng tiền kỳ",
    tag: "Tiền kỳ",
    tagClass: "rel-tag tag-orange",
    tip: {
      name: "Concept Artist",
      kind: "Nghề · Pre-production",
      desc: "Vẽ nhân vật, cảnh, props bằng 2D trước khi 3D dựng. Là source visual cho cả pipeline phía sau.",
      meta: ["2–6 năm KN", "$900–2.0k/mo"],
      thumbnailSrc: "/assets/mascot-manager.png",
      thumbnailAlt: "Concept Artist",
    },
  },
  {
    thumb: "Tx",
    thumbBg: G.violet,
    name: "Texture Artist",
    sub: "bề mặt vật liệu",
    tag: "Cùng mảng",
    tagClass: "rel-tag tag-violet",
    tip: {
      name: "Texture Artist",
      kind: "Nghề · Surfacing",
      desc: "Vẽ và bake texture PBR — chuyên về cảm quan material: da, kim loại, vải, gỗ. Substance là tool chính.",
      meta: ["2–5 năm KN", "$900–1.8k/mo"],
      thumbnailSrc: "/assets/mascot-technical-artist.png",
      thumbnailAlt: "Texture Artist",
    },
  },
  {
    thumb: "Rr",
    thumbBg: G.mint,
    name: "Rigger",
    sub: "setup xương cho animator",
    tag: "Hậu kỳ",
    tagClass: "rel-tag tag-mint",
    tip: {
      name: "Rigger",
      kind: "Nghề · Technical art",
      desc: "Dựng skeleton, control rig, skin weight cho character — yêu cầu logic kỹ thuật mạnh và hiểu animation.",
      meta: ["Hiếm người", "$1.4–2.8k/mo"],
      metaWarn: "Hiếm người",
      thumbnailSrc: "/assets/mascot-supporter.png",
      thumbnailAlt: "Rigger",
    },
  },
];

export const NGHE_SIDEBAR_NGANH: StaticRelItemData[] = [
  {
    thumb: "TG",
    thumbBg: G.yellow,
    name: "Thiết kế Game",
    sub: "7320105 · 4 năm",
    tag: "Ngành ĐT",
    tagClass: "rel-tag tag-yellow",
    tip: {
      name: "Thiết kế Game",
      kind: "Ngành · Bậc Đại học",
      desc: "Tích hợp game design, 3D, programming và narrative — sinh viên ra trường làm cả game artist lẫn level designer.",
      meta: ["Mã 7320105", "4 năm", "H00 · V00"],
      thumbnailSrc: "/assets/illustration-gamepad.png",
      thumbnailAlt: "Thiết kế Game",
    },
  },
  {
    thumb: "MT",
    thumbBg: G.violet,
    name: "Mỹ thuật Ứng dụng",
    sub: "7210408 · 4 năm",
    tag: "Ngành ĐT",
    tagClass: "rel-tag tag-violet",
    tip: {
      name: "Mỹ thuật Ứng dụng",
      kind: "Ngành · Bậc Đại học",
      desc: "Nền tảng nghệ thuật vững — drawing, anatomy, composition. Phù hợp ai muốn theo Character / Concept Art.",
      meta: ["Mã 7210408", "4 năm", "H00 · V00"],
      thumbnailSrc: "/assets/career-illustration-2.png",
      thumbnailAlt: "Mỹ thuật Ứng dụng",
    },
  },
  {
    thumb: "ĐH",
    thumbBg: G.blue,
    name: "Đồ họa & Multimedia",
    sub: "7210403 · 4 năm",
    tag: "Ngành ĐT",
    tagClass: "rel-tag tag-blue",
    tip: {
      name: "Đồ họa & Multimedia",
      kind: "Ngành · Bậc Đại học",
      desc: "Phổ rộng từ thiết kế đồ họa 2D, motion, web design đến 3D — chọn chuyên ngành từ năm 3.",
      meta: ["Mã 7210403", "4 năm", "H00 · V00 · D01"],
      thumbnailSrc: "/assets/career-illustration-3.png",
      thumbnailAlt: "Đồ họa & Multimedia",
    },
  },
];

export const NGHE_JOB_CARDS: StaticRelCardData[] = [
  {
    thumb: "Cm",
    thumbBg: G.blue,
    name: "Character Modeller",
    sub: "Chuyên nhân vật & sinh vật",
    tipClass: "tip-left",
    tip: {
      name: "Character Modeller",
      kind: "Nghề · Game / Phim",
      desc: "Dựng nhân vật và sinh vật 3D — sculpt → retopo → UV → texture. Vị trí lõi của studio game AAA và animation feature.",
      meta: ["Hot", "3–8 năm KN", "$1.2–2.5k/mo"],
      metaHot: "Hot",
      thumbnailSrc: "/assets/mascot-artist.png",
      thumbnailAlt: "Character Modeller",
    },
  },
  {
    thumb: "Ea",
    thumbBg: G.mint,
    name: "Environment Artist",
    sub: "Cảnh quan, level, kiến trúc",
    tip: {
      name: "Environment Artist",
      kind: "Nghề · Level / World",
      desc: "Tạo bối cảnh: rừng, thành phố, dungeon, kiến trúc — phối hợp lighting và composition cho cảm xúc khung hình.",
      meta: ["3–7 năm KN", "$1.0–2.2k/mo"],
      thumbnailSrc: "/assets/career-illustration-1.png",
      thumbnailAlt: "Environment Artist",
    },
  },
  {
    thumb: "Hs",
    thumbBg: G.orange,
    name: "Hard Surface Artist",
    sub: "Vũ khí, xe, thiết bị, máy móc",
    tip: {
      name: "Hard Surface Artist",
      kind: "Nghề · Props / Vehicles",
      desc: "Chuyên geometry chuẩn cho vũ khí, xe, robot — yêu cầu topology sạch và độ chính xác cao về tỷ lệ kỹ thuật.",
      meta: ["2–6 năm KN", "$1.1–2.3k/mo"],
      thumbnailSrc: "/assets/career-illustration-4.png",
      thumbnailAlt: "Hard Surface Artist",
    },
  },
  {
    thumb: "Tx",
    thumbBg: G.violet,
    name: "Texture Artist",
    sub: "Chuyên về bề mặt vật liệu",
    tipClass: "tip-right",
    tip: {
      name: "Texture Artist",
      kind: "Nghề · Surfacing",
      desc: "Vẽ và bake texture PBR — màu, độ bóng, vân, scratch — quyết định độ chân thực của material trên model.",
      meta: ["2–5 năm KN", "$900–1.8k/mo"],
      thumbnailSrc: "/assets/mascot-technical-artist.png",
      thumbnailAlt: "Texture Artist",
    },
  },
];

export const NGHE_SW_TILES: StaticRelTileData[] = [
  {
    thumb: "Bl",
    thumbBg: G.blender,
    name: "Blender",
    tipClass: "tip-left",
    tip: {
      name: "Blender",
      kind: "Phần mềm · 3D suite",
      desc: "Open-source 3D suite — modeling, sculpt, animation, rendering. Cộng đồng cực mạnh, plugin nhiều, free hoàn toàn.",
      meta: ["Free", "Win · Mac · Linux"],
      metaOk: "Free",
      footLeft: "v4.x · 2024",
      footRight: "blender.org ↗",
      thumbnailSrc: "/assets/career-illustration-1.png",
      thumbnailAlt: "Blender",
    },
  },
  {
    thumb: "Mb",
    thumbBg: G.maya,
    name: "Autodesk Maya",
    tip: {
      name: "Autodesk Maya",
      kind: "Phần mềm · Industry",
      desc: "Tiêu chuẩn ngành phim & game AAA cho rigging, animation, modeling. Đắt nhưng pipeline studio dùng nhiều nhất.",
      meta: ["$2.2k/năm", "Win · Mac"],
      metaWarn: "$2.2k/năm",
      footLeft: "v2025",
      footRight: "autodesk.com ↗",
      thumbnailSrc: "/assets/career-illustration-2.png",
      thumbnailAlt: "Autodesk Maya",
    },
  },
  {
    thumb: "Zb",
    thumbBg: G.zbrush,
    name: "ZBrush",
    tip: {
      name: "ZBrush",
      kind: "Phần mềm · Sculpt",
      desc: "Vua của digital sculpt — hỗ trợ hàng triệu poly để sculpt nhân vật chi tiết da, vết nhăn, vảy, lông.",
      meta: ["$10–40/mo", "Win · Mac"],
      footLeft: "v2024",
      footRight: "maxon.net ↗",
      thumbnailSrc: "/assets/career-illustration-3.png",
      thumbnailAlt: "ZBrush",
    },
  },
  {
    thumb: "Sp",
    thumbBg: G.substance,
    name: "Substance Painter",
    tip: {
      name: "Substance Painter",
      kind: "Phần mềm · Texturing",
      desc: "Vẽ texture PBR trực tiếp trên model 3D — smart materials, layer-based, export PBR maps chuẩn.",
      meta: ["$20/mo", "Win · Mac · Linux"],
      footLeft: "2024.x",
      footRight: "adobe.com ↗",
      thumbnailSrc: "/assets/career-illustration-4.png",
      thumbnailAlt: "Substance Painter",
    },
  },
  {
    thumb: "Mt",
    thumbBg: G.marmoset,
    name: "Marmoset Toolbag",
    tipClass: "tip-right",
    tip: {
      name: "Marmoset Toolbag",
      kind: "Phần mềm · Render & Bake",
      desc: "Real-time render & baking tool — show portfolio piece với lighting đẹp nhanh, bake high-to-low chuẩn.",
      meta: ["$319 · 1 lần", "Win · Mac"],
      footLeft: "v5",
      footRight: "marmoset.co ↗",
      thumbnailSrc: "/assets/promo-game-card.png",
      thumbnailAlt: "Marmoset Toolbag",
    },
  },
];

export const NGHE_GALLERY = [
  { handle: "@minh.modeller", av: "var(--cins-yellow)" },
  { handle: "@studio.dotnine", av: "var(--cins-mint)" },
  { handle: "@vrnh_3d", av: "var(--cins-orange)" },
  { handle: "@prop.blockout", av: "var(--cins-blue)" },
  { handle: "@lan.thuy.poly", av: "var(--cins-violet)" },
  { handle: "@BakeLabVN", av: "linear-gradient(135deg,#6EFEC0,#3F8DFD)" },
];

export type NgheSkillRow = {
  label: string;
  hot: boolean;
  /** Nội dung mở rộng (plain text, sẽ escape khi nhúng HTML). */
  detail: string;
};

export const NGHE_SKILLS: NgheSkillRow[] = [
  {
    label: "Tư duy không gian 3 chiều",
    hot: true,
    detail:
      "Bạn cần hình dung được khối trong không gian: xoay, cắt, dựng lại tỷ lệ và silhouette dù chỉ nhìn một góc camera. Điều này giúp tránh model bị méo khi animate, và giữ form rõ khi bake lighting hoặc render real-time.",
  },
  {
    label: "UV unwrapping",
    hot: true,
    detail:
      "UV là bản đồ 2D của bề mặt 3D: đặt seam hợp lý, tránh stretch, cân nhắc texel density theo shot. Kỹ năng này ảnh hưởng trực tiếp đến độ nét texture và hiệu suất draw call khi asset lên engine.",
  },
  {
    label: "Hiểu về anatomy",
    hot: false,
    detail:
      "Với nhân vật và sinh vật, cần nắm cơ và xương cơ bản để silhouette đọc được cảm xúc và pose. Không nhất thiết phải như nghệ sĩ giải phẫu, nhưng phải đủ để tránh lỗi gãy khớp hoặc deform khi rig chạy.",
  },
  {
    label: "Quản lý polygon count",
    hot: false,
    detail:
      "Game và mobile đòi hỏi budget poly rõ ràng; phim có thể nới hơn nhưng vẫn cần LOD và tổ chức topology. Biết chỗ nào giữ chi tiết, chỗ nào tối giản giúp asset ổn định qua pipeline lighting và collision.",
  },
  {
    label: "Đọc được concept art",
    hot: false,
    detail:
      "Chuyển 2D sang 3D là lấp chỗ trống thông tin: tỉ lệ, vật liệu, wear & tear. Bạn phải hỏi đúng chỗ khi concept mơ hồ, và chủ động đề xuất thay đổi nhỏ để asset production-ready.",
  },
  {
    label: "PBR materials & texturing",
    hot: false,
    detail:
      "Quy trình PBR (Base Color, Normal, Roughness, Metallic…) giúp bề mặt nhất quán giữa DCC và engine. Hiểu cách đọc reference vật liệu thật và bake chi tiết từ high-poly xuống low là phần cốt lõi của shading hiện đại.",
  },
  {
    label: "Reference research",
    hot: false,
    detail:
      "Thu thập ảnh, blueprint hoặc scan trước khi chamfer edge hay sculpt chi tiết. Reference tốt giảm vòng chỉnh sửa với director và giữ asset đúng thời đại / đúng lore của dự án.",
  },
  {
    label: "Tự kỷ luật & deadline",
    hot: false,
    detail:
      "Pipeline 3D là chuỗi iteration: blocking → polish → UV → texture → feedback. Giữ naming, layer và version file gọn giúp team không mất thời gian săn asset; đúng deadline là một phần kỹ năng senior.",
  },
];

function escapeHtmlPlain(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildNgheSkillsSectionHtml(skills: readonly NgheSkillRow[]): string {
  const items = skills
    .map((s) => {
      const cls = s.hot ? "skill-item hot" : "skill-item";
      return `<details class="${cls}">
  <summary>${escapeHtmlPlain(s.label)}</summary>
  <div class="skill-item-detail"><p>${escapeHtmlPlain(s.detail)}</p></div>
</details>`;
    })
    .join("\n");

  return `<h2 class="section-h nghe-skills-section-h">
  <span class="num">02</span>
  3D Modeller cần giỏi gì?
</h2>
<div class="skill-grid">
${items}
</div>`;
}

const NGHE_LEAD_HTML_CORE = `
<div class="mock-vid nghe-lead-mock-vid">
  <div class="label">
    <span>Video — "Một ngày của 3D Modeller tại studio"</span>
    <span class="dur">06:24</span>
  </div>
</div>

<div class="body">
  <p>
    3D Modeller là người tạo ra các <strong>mô hình 3 chiều</strong>
    bằng phần mềm chuyên dụng. Mô hình này được dùng trong game
    AAA, phim hoạt hình, VFX, kiến trúc, quảng cáo TVC và cả những
    lĩnh vực mới nổi như AR/VR hay Metaverse.
  </p>
</div>

<h2 class="section-h nghe-lead-section-h">
  <span class="num">01</span>
  Công việc cụ thể<em>— ba mảng chính</em>
</h2>

<div class="nghe-tech-section">
  <h3>Tạo Mô Hình (Modeling)</h3>
  <div class="body">
    <p>
      Xây dựng hình dạng 3D từ đầu bằng cách thao tác
      <strong>vertices, edges và faces</strong>. Có hai hướng
      chính: <em>Hard Surface</em> (vũ khí, xe, kiến trúc — thiên
      về geometry chuẩn) và <em>Organic</em> (nhân vật, sinh vật,
      thực vật — yêu cầu sculpt mềm mại).
    </p>
  </div>
  <div class="tech-grid cols-3">
    <div class="mock"><span>Hard Surface · Sci-fi rifle</span></div>
    <div class="mock"><span>Organic · Character bust</span></div>
    <div class="mock"><span>Wireframe · Topology</span></div>
  </div>
</div>

<div class="nghe-tech-section">
  <h3>Texturing &amp; Shading</h3>
  <div class="body">
    <p>
      Tạo bề mặt cho mô hình — màu sắc, độ bóng, vân da, vết trầy
      xước. Dùng <strong>UV mapping</strong> để trải bề mặt 3D thành
      bản đồ 2D, rồi vẽ texture hoặc bake từ high-poly xuống
      low-poly.
    </p>
  </div>
  <div class="mock" style="aspect-ratio:16/7">
    <span>
      Texture showcase · PBR maps (BaseColor, Normal, Roughness,
      Metallic)
    </span>
  </div>
</div>

<div class="nghe-tech-section">
  <h3>
    Rigging &amp; Animation
    <em class="nghe-tech-note">(tuỳ vị trí)</em>
  </h3>
  <div class="body">
    <p>
      Một số 3D Modeller cũng làm rigging —
      <strong>tạo bộ xương kỹ thuật số</strong> cho nhân vật, để
      animator có công cụ điều khiển. Ở các studio lớn, đây thường
      là vị trí riêng biệt.
    </p>
  </div>
  <div class="tech-grid cols-2">
    <div class="mock"><span>Skeleton rig setup</span></div>
    <div class="mock"><span>T-pose &amp; weight paint</span></div>
  </div>
</div>
`.trim();

/** HTML rich text — `.nghe-lead-panel`: core + mục 02 (skill accordion). */
export const NGHE_LEAD_HTML = `${NGHE_LEAD_HTML_CORE}\n\n${buildNgheSkillsSectionHtml(NGHE_SKILLS)}`;
