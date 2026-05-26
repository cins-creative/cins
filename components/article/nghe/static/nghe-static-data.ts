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

export const NGHE_COURSE_CARDS: StaticRelCardData[] = [
  {
    thumb: "3D",
    thumbBg: G.blue,
    name: "3D Modeling Fundamentals",
    sub: "Topology & UV — 8 tuần",
    tipClass: "tip-left",
    tip: {
      name: "3D Modeling Fundamentals",
      kind: "Khóa học · Online",
      desc: "Blocking, edge flow, UV unwrap — bài tập theo tuần, mentor feedback.",
      meta: ["Beginner", "Tiếng Việt"],
      thumbnailSrc: "/assets/career-illustration-1.png",
      thumbnailAlt: "3D Modeling",
    },
  },
  {
    thumb: "Zb",
    thumbBg: G.zbrush,
    name: "Digital Sculpting cơ bản",
    sub: "ZBrush workflow — 6 tuần",
    tip: {
      name: "Digital Sculpting cơ bản",
      kind: "Khóa học · Workshop",
      desc: "Dynamesh, ZRemesher, high-poly → game-ready low — demo character bust.",
      meta: ["Beginner+", "Live"],
      thumbnailSrc: "/assets/career-illustration-2.png",
      thumbnailAlt: "Sculpting",
    },
  },
  {
    thumb: "Tx",
    thumbBg: G.violet,
    name: "PBR Texturing cho game",
    sub: "Substance Painter — 5 tuần",
    tipClass: "tip-right",
    tip: {
      name: "PBR Texturing cho game",
      kind: "Khóa học · Project-based",
      desc: "Smart materials, bakers, UDIM — asset cuối kỳ đưa vào Unreal/Unity.",
      meta: ["Intermediate", "Certificate"],
      thumbnailSrc: "/assets/career-illustration-4.png",
      thumbnailAlt: "Texturing",
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

/** Phần mô tả tĩnh (không khối mock video) — dùng khi có `meta.video_url` thay mock. */
export const NGHE_LEAD_BODY_HTML = `
<div class="body">
  <p>
    3D Modeller là người tạo ra các <strong>mô hình 3 chiều</strong>
    bằng phần mềm chuyên dụng. Mô hình này được dùng trong game
    AAA, phim hoạt hình, VFX, kiến trúc, quảng cáo TVC và cả những
    lĩnh vực mới nổi như AR/VR hay Metaverse.
  </p>
</div>
`.trim();

const NGHE_LEAD_MOCK_HTML = `
<div class="mock-vid nghe-lead-mock-vid">
  <div class="label">
    <span>Video — "Một ngày của 3D Modeller tại studio"</span>
    <span class="dur">06:24</span>
  </div>
</div>
`.trim();

/** HTML rich text — `.nghe-lead-panel`: mock video + đoạn dẫn (mục 01/02 tĩnh đã bỏ). */
export const NGHE_LEAD_HTML = `${NGHE_LEAD_MOCK_HTML}

${NGHE_LEAD_BODY_HTML}`.trim();
