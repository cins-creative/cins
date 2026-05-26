import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

type Item = {
  id: string;
  tieu_de: string;
  tieu_de_viet: string;
  tom_tat: string;
  meta_title: string;
  meta_description: string;
  noi_dung: string;
};

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

const items: Item[] = [
  // 01. Transparency/Opacity
  {
    id: "a14e59dc-7423-424b-a40a-887e71b6b64a",
    tieu_de: "Transparency / Opacity",
    tieu_de_viet: "Transparency và Opacity",
    tom_tat:
      "Transparency/Opacity là thuộc tính kiểm soát mức độ nhìn xuyên qua của đối tượng — về cơ bản là một khái niệm, biểu thị theo hai hướng ngược nhau (0% opacity = 100% transparent).",
    meta_title:
      "Transparency / Opacity là gì? Ý nghĩa và ứng dụng | CINS",
    meta_description:
      "Transparency và Opacity trong design. Tìm hiểu cách dùng trong Photoshop, web, alpha channel và workflow design.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn designer overlay text trên photo — text 100% solid hard read. Lower <strong>Opacity</strong> 70% — text blend with photo, more visually pleasing. Same concept on water mark, glass effect, ghost layer. Foundation digital design — Photoshop, web CSS, video. Master Transparency/Opacity = foundation visual hierarchy.</p>
  <p>Transparency / Opacity là kỹ năng essential cho designer, web developer, motion graphics artist. Hiểu alpha channel, opacity blending, blending mode giúp tạo sophisticated visual effect. Foundation cho composite, UI design, web modern.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Transparency / Opacity là gì?</h2>
  <p>Transparency và Opacity là <strong>same property different direction</strong>. <strong>Opacity</strong>: how visible/solid object (100% = fully visible, 0% = invisible). <strong>Transparency</strong>: how see-through (100% transparent = 0% opacity). Universal concept across design software, web. Foundation cho overlay, blending, glass effect, ghost layer.</p>
  <p>Implementation: <strong>Alpha Channel</strong> — fourth channel beyond RGB encoding transparency per pixel. PNG, TIFF, PSD support alpha. JPG no alpha. <strong>Opacity Slider</strong> — global property of layer. <strong>Blending Mode</strong> — how layer combine (multiply, screen, overlay), different from but related opacity. Combine = sophisticated composite.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Opacity vs Fill vs Blend</span>
    <p><strong>Opacity</strong>: overall layer visibility 0-100%. <strong>Fill (Photoshop)</strong>: pixel opacity but preserve layer style. <strong>Blend Mode</strong>: how mix with layer below. Combine all for sophisticated effect.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Alpha Channel</strong> — transparency map</li>
    <li><strong>Opacity Slider</strong> — layer property</li>
    <li><strong>Blend Mode</strong> — combine method</li>
    <li><strong>Premultiplied Alpha</strong> — pre-blended</li>
    <li><strong>Straight Alpha</strong> — separate alpha</li>
    <li><strong>PNG Alpha</strong> — web transparency</li>
    <li><strong>RGBA</strong> — RGB + Alpha</li>
    <li><strong>CSS Opacity</strong> — web</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"transparency opacity photoshop layer alpha channel design"</span>
    </div>
    <p class="arc-image-caption">Transparency/Opacity — control visibility, foundation composite</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Use Cases</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Overlay Text on Photo</summary>
      <div class="arc-card-body">
        <p>Text 70-80% opacity overlay photo. Better readability than solid. Subtle integration.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Watermark</summary>
      <div class="arc-card-body">
        <p>Brand logo 20-30% opacity on image. Identifies but không obstruct.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Glass Effect</summary>
      <div class="arc-card-body">
        <p>UI glass — 50% opacity with blur backdrop. Modern macOS Big Sur, iOS, Vision Pro. Frosted glass aesthetic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Layer Blending</summary>
      <div class="arc-card-body">
        <p>Compositing photo — overlay texture 50%, color tint 30%. Multi-layer build complex image.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fade In / Out</summary>
      <div class="arc-card-body">
        <p>Video transition opacity ramp 0 → 100. Smooth appear/disappear.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ghost / Onion Skin</summary>
      <div class="arc-card-body">
        <p>Animation onion skin — previous frame 50% opacity. Helps animator see motion arc.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UI Background Overlay</summary>
      <div class="arc-card-body">
        <p>Modal dialog background 50% black overlay. Focus user attention modal.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Grading</summary>
      <div class="arc-card-body">
        <p>Color overlay layer adjustable opacity. Subtle color cast image.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Implementation</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photoshop Opacity</h3>
    <ul class="arc-list">
      <li>Layer Opacity slider 0-100%</li>
      <li>Fill slider preserve style</li>
      <li>Blend Mode combine</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Illustrator Transparency</h3>
    <ul class="arc-list">
      <li>Transparency panel</li>
      <li>Per object opacity</li>
      <li>Blend mode</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">CSS opacity</h3>
    <ul class="arc-list">
      <li>opacity: 0.7 — 70% visible</li>
      <li>Affect entire element including children</li>
      <li>rgba color alternative</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">CSS rgba()</h3>
    <ul class="arc-list">
      <li>color: rgba(0, 0, 0, 0.5) — 50% black</li>
      <li>Affect only this color</li>
      <li>Children stay opaque</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">PNG Alpha</h3>
    <ul class="arc-list">
      <li>PNG-24 with alpha channel</li>
      <li>Web transparent image</li>
      <li>Logo, icon standard</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Video Alpha</h3>
    <ul class="arc-list">
      <li>ProRes 4444 alpha</li>
      <li>Green screen + key</li>
      <li>Lower thirds graphics</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Figma Opacity</h3>
    <ul class="arc-list">
      <li>Frame Opacity property</li>
      <li>Per-layer</li>
      <li>Background blur</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">After Effects</h3>
    <ul class="arc-list">
      <li>Layer Opacity property keyframe</li>
      <li>Animate fade</li>
      <li>Track matte alpha</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Opacity</h2>
  <ul class="arc-list">
    <li><strong>Don&apos;t over-rely</strong> — solid often more impactful</li>
    <li><strong>30-70% range</strong> — most useful subtle effect</li>
    <li><strong>Blend mode + opacity</strong> — combine sophisticated</li>
    <li><strong>PNG cho transparent</strong> — JPG no alpha</li>
    <li><strong>Performance</strong> — many transparent layer slow GPU</li>
    <li><strong>Glass effect</strong>: blur + low opacity + reflection</li>
    <li><strong>Watermark subtle</strong> — 15-30% opacity ideal</li>
    <li><strong>CSS opacity</strong> affect children — use rgba selective</li>
    <li><strong>Premultiplied vs straight</strong> — alpha workflow consideration</li>
    <li><strong>Career Designer</strong> — opacity mastery basic skill</li>
  </ul>
</section>
`,
  },

  // 02. Typography
  {
    id: "147be797-372b-4792-b83d-ea0662a92170",
    tieu_de: "Typography",
    tieu_de_viet: "Typography (Nghệ thuật chữ)",
    tom_tat:
      "Typography là nghệ thuật sắp xếp và thiết kế chữ — đảm bảo tính dễ đọc và thẩm mỹ, phù hợp với thương hiệu hoặc tác phẩm — foundation cho mọi visual communication.",
    meta_title: "Typography là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Typography design. Tìm hiểu typeface, font pairing, hierarchy, kerning, leading và career typographer.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nhìn brand Apple — clean Helvetica/SF Pro typography. Coca-Cola — iconic script. New York Times — distinctive serif. Mỗi brand defined by <strong>Typography</strong>. Font choice convey personality, era, emotion. Foundation cho graphic design, brand identity, web design, UI. Differentiate professional vs amateur work. Master typography = master visual communication.</p>
  <p>Typography là kỹ năng essential cho mọi designer — graphic, web, UI, brand. Hiểu typeface anatomy, font pairing, hierarchy, kerning, leading giúp design clean readable visually impactful. Foundation cho career designer chuyên nghiệp.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Typography là gì?</h2>
  <p>Typography là <strong>art and technique of arranging type</strong> để communication readable, legible, visually appealing. Components: <strong>Typeface</strong> (font family — Helvetica, Times, Futura), <strong>Font</strong> (specific weight/style — Helvetica Bold Italic), <strong>Hierarchy</strong> (size variation), <strong>Spacing</strong> (kerning between letter, leading between line), <strong>Layout</strong> (text on page).</p>
  <p>Foundation history: <strong>Gutenberg movable type</strong> 1450s. <strong>Modern era</strong>: Bauhaus 1920s. <strong>Digital revolution</strong>: PostScript, TrueType 1980s. Today: web font (Google Fonts), variable font, modern OpenType feature. Typography science + art — readability research + emotional convey. Foundation visual communication.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Typeface Categories</span>
    <p><strong>Serif</strong>: Times, Garamond — traditional, formal. <strong>Sans-Serif</strong>: Helvetica, Arial — modern, clean. <strong>Script</strong>: handwritten feel. <strong>Display</strong>: decorative, headline only. <strong>Monospace</strong>: code, fixed width. <strong>Variable Font</strong>: modern adjustable.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Typeface</strong> — font family</li>
    <li><strong>Font</strong> — specific style</li>
    <li><strong>Kerning</strong> — letter spacing</li>
    <li><strong>Leading</strong> — line spacing</li>
    <li><strong>Tracking</strong> — overall spacing</li>
    <li><strong>Hierarchy</strong> — size importance</li>
    <li><strong>X-Height</strong> — lowercase height</li>
    <li><strong>Ligature</strong> — combined letter</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"typography design typeface font hierarchy spacing"</span>
    </div>
    <p class="arc-image-caption">Typography — art of type, foundation visual communication</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Typography Principles</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Hierarchy</summary>
      <div class="arc-card-body">
        <p>Size/weight indicate importance. Headline large, body small. Guide reader eye. Foundation editorial design.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Contrast</summary>
      <div class="arc-card-body">
        <p>Differentiation between element. Serif vs sans, bold vs regular, large vs small. Visual interest.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Alignment</summary>
      <div class="arc-card-body">
        <p>Left, right, center, justify. Left most readable Western. Consistency throughout layout.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Kerning (Letter Spacing)</summary>
      <div class="arc-card-body">
        <p>Space between letter pair. Pro typography careful kerning. Photoshop adjust V|A | T tight pair.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Leading (Line Spacing)</summary>
      <div class="arc-card-body">
        <p>Space between line. 1.4-1.6× font size readable body. Critical for reading flow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tracking (Word Spacing)</summary>
      <div class="arc-card-body">
        <p>Overall character spacing. Tighter = compact. Looser = airy. Match design intent.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Font Pairing</summary>
      <div class="arc-card-body">
        <p>Combine serif + sans typical. Contrast establish hierarchy. Limit 2-3 font per design.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Readability vs Legibility</summary>
      <div class="arc-card-body">
        <p><strong>Legibility</strong>: can decode letter. <strong>Readability</strong>: comfortable to read. Both essential.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Font Categories</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Serif</h3>
    <ul class="arc-list">
      <li>Tail/foot at letter end</li>
      <li>Times, Garamond, Georgia</li>
      <li>Traditional, formal</li>
      <li>Body text book, newspaper</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Sans-Serif</h3>
    <ul class="arc-list">
      <li>No serif, clean</li>
      <li>Helvetica, Arial, Futura</li>
      <li>Modern, minimal</li>
      <li>Tech brand, UI default</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Slab Serif</h3>
    <ul class="arc-list">
      <li>Thick serif</li>
      <li>Rockwell, Roboto Slab</li>
      <li>Bold, friendly</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Script</h3>
    <ul class="arc-list">
      <li>Handwritten feel</li>
      <li>Wedding invitation, luxury</li>
      <li>Limited use — readability</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Display</h3>
    <ul class="arc-list">
      <li>Decorative, headline only</li>
      <li>Bold personality</li>
      <li>Don&apos;t use body text</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Monospace</h3>
    <ul class="arc-list">
      <li>Fixed-width</li>
      <li>Courier, JetBrains Mono</li>
      <li>Code editor, technical</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Variable Font</h3>
    <ul class="arc-list">
      <li>Single file multiple variation</li>
      <li>Modern web standard</li>
      <li>Performance efficient</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Vietnamese Support</h3>
    <ul class="arc-list">
      <li>Diacritic marks important</li>
      <li>Be Vietnam Pro, Google Fonts Vietnamese</li>
      <li>Custom local foundry</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Resources</h2>
  <ul class="arc-list">
    <li><strong>Google Fonts</strong> — free, comprehensive</li>
    <li><strong>Adobe Fonts (Typekit)</strong> — premium, CC included</li>
    <li><strong>Monotype, Linotype</strong> — pro foundry</li>
    <li><strong>Glyphs</strong> — typeface design software</li>
    <li><strong>FontForge</strong> — free font design</li>
    <li><strong>Variable Fonts</strong> — modern web standard</li>
    <li><strong>WhatTheFont</strong> — identify font from image</li>
    <li><strong>Fonts In Use</strong> — typography reference site</li>
    <li><strong>Career Typographer</strong> — niche $80K-200K</li>
    <li><strong>School</strong>: Cooper Union, Yale typography</li>
  </ul>
</section>
`,
  },

  // 03. UV Editor
  {
    id: "6db13f19-37a5-48a3-8cb3-521b4c26023a",
    tieu_de: "UV Editor",
    tieu_de_viet: "UV Editor trong 3D",
    tom_tat:
      "UV Editor là công cụ giúp trải các mặt của mô hình 3D phẳng ra thành tọa độ 2D — cho phép áp texture và vật liệu lên mô hình.",
    meta_title: "UV Editor là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "UV Editor trong 3D. Tìm hiểu Maya, Blender, RizomUV workflow, UV unwrap và best practice cho texture artist.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn 3D artist hoàn tất sculpt character — sẵn sàng apply texture. Câu hỏi: làm sao &quot;wrap&quot; 2D image onto 3D surface? Solution: <strong>UV Editor</strong> — tool flatten 3D mesh into 2D coordinate space. Like cutting clothing pattern. Each vertex của mesh có (U, V) coordinate trên 2D — texture pixel mapping. Foundation cho mọi texture work.</p>
  <p>UV Editor là kỹ năng essential cho 3D artist, texture artist. Hiểu workflow Maya UV Editor, Blender, RizomUV (pro), UV unwrapping methods giúp produce clean UV ready for texture. Foundation cho production-ready 3D asset.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>UV Editor là gì?</h2>
  <p>UV Editor là <strong>specialized tool trong 3D software</strong> manage UV coordinate of 3D model. <strong>UV</strong> = 2D coordinate (U horizontal, V vertical) mapping mỗi vertex 3D mesh đến point trên 2D texture image. UV Editor cho user view, edit UV layout. Foundation cho texturing — without proper UV, texture stretch, repeat, misalign.</p>
  <p>Functions: <strong>UV Unwrap</strong> (flatten 3D to 2D), <strong>Cut Seam</strong> (mark where to split mesh), <strong>Pack UV Island</strong> (efficient layout), <strong>Stretch Check</strong> (verify no distortion), <strong>UV Manipulation</strong> (move, scale, rotate UV). Different software different UI: Maya UV Editor, Blender UV Editor, 3ds Max, dedicated tool RizomUV.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">UV Editor Functions</span>
    <p><strong>Project / Unwrap</strong>: convert 3D to 2D. <strong>Mark Seam</strong>: cut edge. <strong>Pack</strong>: efficient layout. <strong>Distortion Check</strong>: visual feedback. <strong>Texel Density</strong>: even resolution. <strong>UV Snap</strong>: align grid.</p>
  </div>

  <ul class="arc-list">
    <li><strong>UV Coordinate</strong> — 2D map</li>
    <li><strong>UV Island</strong> — separated chunk</li>
    <li><strong>UV Seam</strong> — cut edge</li>
    <li><strong>UV Unwrap</strong> — flatten</li>
    <li><strong>UV Pack</strong> — efficient layout</li>
    <li><strong>Texel Density</strong> — pixel/area</li>
    <li><strong>0-1 UV Space</strong> — standard</li>
    <li><strong>UDIM</strong> — multi-tile pro</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"UV editor 3D maya blender rizomuv texture unwrap"</span>
    </div>
    <p class="arc-image-caption">UV Editor — tool manage UV, foundation texture work</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>UV Software</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>RizomUV (Pro)</summary>
      <div class="arc-card-body">
        <p>Industry pro UV tool. Fastest unwrap. Advanced auto-pack. Maya integration. Best in class. $200-700 license.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Maya UV Editor</summary>
      <div class="arc-card-body">
        <p>Built-in capable. Modern UV Toolkit. Quad Draw integration. Industry standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender UV Editor</summary>
      <div class="arc-card-body">
        <p>Free, capable. Mark Seam (Ctrl+E). UVPackmaster paid add-on improve. Indie friendly.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3ds Max UV</summary>
      <div class="arc-card-body">
        <p>Unwrap UVW modifier. Established workflow. Less modern than Maya.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Houdini UV</summary>
      <div class="arc-card-body">
        <p>Procedural approach. Less common cho hand UV. Auto-UV good organic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D-Coat UV</summary>
      <div class="arc-card-body">
        <p>Specialized retopo tool. Strong UV workflow. Affordable.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Headus UVLayout</summary>
      <div class="arc-card-body">
        <p>Older but still industry use. Pelt-based unwrap. Pioneer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Substance Painter UV</summary>
      <div class="arc-card-body">
        <p>Read existing UV. Doesn&apos;t create. Texture painting tool.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>UV Editor Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Analyze Mesh</h3>
    <ul class="arc-list">
      <li>Identify break point</li>
      <li>Plan UV island</li>
      <li>Hidden seam location</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Mark Seam</h3>
    <ul class="arc-list">
      <li>Select edge to cut</li>
      <li>Mark Seam command</li>
      <li>Under arm, behind ear</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Unwrap</h3>
    <ul class="arc-list">
      <li>Unwrap command</li>
      <li>UV island flatten</li>
      <li>View 2D layout</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Check Distortion</h3>
    <ul class="arc-list">
      <li>Checker pattern texture</li>
      <li>Square = good</li>
      <li>Distorted = add seam</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Pack UV Island</h3>
    <ul class="arc-list">
      <li>Arrange in 0-1 UV space</li>
      <li>Maximize coverage</li>
      <li>Auto-pack tools</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Texel Density Adjust</h3>
    <ul class="arc-list">
      <li>Important area larger UV</li>
      <li>Face high res, hidden low</li>
      <li>Even density possible</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Optimize Layout</h3>
    <ul class="arc-list">
      <li>Rotate island</li>
      <li>Maximize space</li>
      <li>Minimize wasted area</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Export / Pass to Texture</h3>
    <ul class="arc-list">
      <li>UV layout export PNG</li>
      <li>Substance Painter import</li>
      <li>Begin texturing</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips UV Editor</h2>
  <ul class="arc-list">
    <li><strong>RizomUV save time</strong> — pro speed massive improvement</li>
    <li><strong>Checker pattern test</strong> — distortion check</li>
    <li><strong>Seam hidden area</strong> — under arm, behind ear</li>
    <li><strong>Even texel density</strong> — consistent resolution</li>
    <li><strong>Auto-pack good start</strong> — refine manually</li>
    <li><strong>UDIM cho film VFX</strong> — multi-tile workflow</li>
    <li><strong>Hard edge follow UV seam</strong> — common best practice</li>
    <li><strong>UV important workflow</strong> — texture quality depend</li>
    <li><strong>Don&apos;t mirror cho character</strong> sometimes — bake error</li>
    <li><strong>Career Texture Artist</strong> — UV mastery essential</li>
  </ul>
</section>
`,
  },

  // 04. UV Mapping
  {
    id: "34207eba-0f51-4269-ad45-982548e7695d",
    tieu_de: "UV Mapping",
    tieu_de_viet: "UV Mapping (Trải UV)",
    tom_tat:
      "UV Mapping là quá trình mở bề mặt 3D thành bản đồ 2D phẳng để áp texture — như mở hộp carton thành tờ giấy phẳng — bắt buộc trước khi texture vật thể 3D.",
    meta_title:
      "UV Mapping là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "UV Mapping trong 3D modeling. Tìm hiểu workflow, seam placement, UV space, distortion và best practice texture artist.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn 3D modeler vừa finish model. Apply texture: lines distorted, image stretch. Problem: <strong>UV Mapping</strong> chưa làm properly. UV Mapping là process flatten 3D surface to 2D plane cho texture application. Without — texture appear randomly. Foundation cho mọi 3D model production-ready. Critical skill cho character artist, environment artist, prop modeler.</p>
  <p>UV Mapping là kỹ năng essential cho 3D artist. Hiểu mapping methods, seam strategic placement, UV space efficient use, distortion management giúp produce clean UV. Foundation cho texture work, game-ready asset, film VFX.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>UV Mapping là gì?</h2>
  <p>UV Mapping là <strong>process of projecting 3D model surface onto 2D plane</strong> để apply texture. Each vertex of 3D mesh has corresponding <strong>UV coordinate</strong> (U, V) in 2D texture space (0-1 range). When rendering, software lookup texture pixel at vertex UV coordinate. Foundation cho mọi texture work — color, normal map, roughness all use UV mapping.</p>
  <p>Analogy: think of unwrapping wrapped present. 3D box surface → flat paper if cut along edge. Same principle 3D model. Cut along strategic edge (seam) → flatten to 2D. Multi-step process: <strong>Mark Seam</strong>, <strong>Unwrap</strong>, <strong>Pack</strong>, <strong>Refine</strong>. Result: clean 2D representation ready cho texture.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">UV Projection Methods</span>
    <p><strong>Planar</strong>: project from single direction. Flat object. <strong>Cylindrical</strong>: wrap cylinder. Bottle. <strong>Spherical</strong>: wrap sphere. Globe. <strong>Box</strong>: 6 sides project. <strong>Smart UV</strong>: auto algorithm. <strong>Manual Unwrap</strong>: cho complex character. Choose based on shape.</p>
  </div>

  <ul class="arc-list">
    <li><strong>UV Coordinate</strong> — 2D point</li>
    <li><strong>0-1 UV Space</strong> — standard range</li>
    <li><strong>UV Island</strong> — flat chunk</li>
    <li><strong>UV Seam</strong> — cut edge</li>
    <li><strong>Distortion</strong> — UV stretch</li>
    <li><strong>Pack Efficiency</strong> — layout</li>
    <li><strong>Texel Density</strong> — resolution</li>
    <li><strong>UDIM</strong> — multi-tile film</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"UV mapping 3D modeling texture flatten unwrap seam"</span>
    </div>
    <p class="arc-image-caption">UV Mapping — flatten 3D to 2D, foundation texture</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>UV Methods</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Planar Mapping</summary>
      <div class="arc-card-body">
        <p>Project from single direction (top, front, side). Simple flat surface. Wall, floor. Quick but limited.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cylindrical Mapping</summary>
      <div class="arc-card-body">
        <p>Wrap cylinder. Bottle, can, column. Auto-generate cho cylindrical shape.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Spherical Mapping</summary>
      <div class="arc-card-body">
        <p>Wrap sphere. Globe, planet, eyeball. Polar distortion at top/bottom.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Box / Cube Mapping</summary>
      <div class="arc-card-body">
        <p>Project 6 face. Box, building. Quick cho rectangular.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Smart UV / Auto Unwrap</summary>
      <div class="arc-card-body">
        <p>Algorithm-based auto unwrap. Blender Smart UV Project. Quick decent result. Refine manual.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Manual / LSCM Unwrap</summary>
      <div class="arc-card-body">
        <p>Mark seam, unwrap algorithm. Most control. Character, organic. Industry standard cho production.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Camera-Projected</summary>
      <div class="arc-card-body">
        <p>Project từ camera view. Photogrammetry, matte painting. Specialized.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UDIM (Multi-Tile)</summary>
      <div class="arc-card-body">
        <p>Multiple 0-1 UV tile. Each tile separate texture. Film VFX hero asset. High detail.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>UV Mapping Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Plan Seam Strategy</h3>
    <ul class="arc-list">
      <li>Where to cut mesh?</li>
      <li>Hidden area priority</li>
      <li>Natural break (clothing edge)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Mark Seam</h3>
    <ul class="arc-list">
      <li>Select edge cut</li>
      <li>Mark Seam command</li>
      <li>Strategic placement</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Unwrap</h3>
    <ul class="arc-list">
      <li>Run unwrap algorithm</li>
      <li>UV island generate</li>
      <li>View 2D layout</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Distortion Check</h3>
    <ul class="arc-list">
      <li>Apply checker pattern</li>
      <li>Square check uniform</li>
      <li>Stretch → add seam fix</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Layout / Pack</h3>
    <ul class="arc-list">
      <li>Arrange UV island in 0-1</li>
      <li>Auto-pack or manual</li>
      <li>Maximize texture space</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Texel Density</h3>
    <ul class="arc-list">
      <li>Important area larger</li>
      <li>Face high res</li>
      <li>Hidden area smaller</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Symmetry / Mirror</h3>
    <ul class="arc-list">
      <li>Mirror character UV — half UV, double resolution</li>
      <li>Watch for normal map mirror issue</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Export Layout</h3>
    <ul class="arc-list">
      <li>UV layout image export</li>
      <li>Substance Painter ready</li>
      <li>Begin texturing</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips UV Mapping</h2>
  <ul class="arc-list">
    <li><strong>Seam hidden first</strong> — under arm, behind ear, inside leg</li>
    <li><strong>Follow natural break</strong> — clothing edge, hairline</li>
    <li><strong>Minimize total seam</strong> — fewer seam better generally</li>
    <li><strong>Even texel density</strong> — consistent resolution</li>
    <li><strong>Checker pattern essential</strong> — quick distortion check</li>
    <li><strong>RizomUV speed</strong> — pro choice fastest</li>
    <li><strong>UDIM cho hero asset</strong> — film VFX standard</li>
    <li><strong>Mirror caution</strong> — character mirror UV may issue normal</li>
    <li><strong>Pack efficiency 80%+</strong> — minimize wasted space</li>
    <li><strong>Career Character / Texture Artist</strong> — UV essential</li>
  </ul>
</section>
`,
  },

  // 05. UV Unwrapping
  {
    id: "15ddd953-e1c3-4b23-a2bf-4719c6ca7cdd",
    tieu_de: "UV Unwrapping",
    tieu_de_viet: "UV Unwrapping (Trải UV)",
    tom_tat:
      "UV Unwrapping là bước cụ thể trong UV mapping — dùng các công cụ để cắt và mở mesh 3D thành UV island phẳng trên UV space, cân bằng giữa distortion và không gian.",
    meta_title:
      "UV Unwrapping là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "UV Unwrapping techniques. Tìm hiểu LSCM, ABF, manual unwrap, distortion management trong Maya, Blender, RizomUV.",
    noi_dung: `
<section class="arc-intro">
  <p>UV Mapping = whole process. <strong>UV Unwrapping</strong> = specific step — algorithm flatten 3D mesh to 2D. Pro use sophisticated algorithm: LSCM, ABF, conformal mapping. Quality unwrap = minimal distortion, efficient pack, hidden seam. Bad unwrap = stretched texture, visible seam. Distinguish amateur vs pro work. Foundation skill cho 3D artist.</p>
  <p>UV Unwrapping là kỹ năng essential cho 3D texture artist. Hiểu algorithm differences (LSCM, ABF), workflow Maya/Blender/RizomUV, distortion management giúp produce production-quality UV. Foundation cho game/film asset texture pipeline.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>UV Unwrapping là gì?</h2>
  <p>UV Unwrapping là <strong>specific technique / step</strong> trong UV Mapping process — flatten 3D mesh to 2D using algorithm. After artist mark seam (where to cut), unwrap algorithm calculate optimal flat layout. Quality algorithm preserve shape (minimize distortion) cùng spacing efficient. Different algorithm cho different priority.</p>
  <p>Algorithm types: <strong>LSCM</strong> (Least Squares Conformal Map) — preserves angle, common Blender. <strong>ABF</strong> (Angle Based Flattening) — alternative conformal. <strong>Pelt Mapping</strong> — Headus UVLayout pioneer. <strong>Optimal</strong> — Maya. <strong>Conformal vs Distortion</strong> trade-off — algorithm choice match content.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Algorithm Tradeoffs</span>
    <p><strong>LSCM</strong>: angle preserve, area distort. <strong>ABF</strong>: similar LSCM variant. <strong>Pelt</strong>: more even but può stretch. <strong>Optimal</strong>: Maya hybrid balanced. Each suitable different mesh. Production try several.</p>
  </div>

  <ul class="arc-list">
    <li><strong>LSCM</strong> — angle preserve</li>
    <li><strong>ABF</strong> — angle based</li>
    <li><strong>Pelt Mapping</strong> — pull flat</li>
    <li><strong>Conformal</strong> — angle conserve</li>
    <li><strong>UV Pack</strong> — efficient layout</li>
    <li><strong>Distortion Heat Map</strong> — visualize</li>
    <li><strong>Pin / Anchor</strong> — fix UV point</li>
    <li><strong>Iterative Refinement</strong> — improve</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"UV unwrapping algorithm LSCM ABF 3D mesh flatten"</span>
    </div>
    <p class="arc-image-caption">UV Unwrapping — algorithm flatten mesh, key step UV mapping</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Unwrap Techniques</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Manual Seam + LSCM</summary>
      <div class="arc-card-body">
        <p>Artist mark seam strategic. LSCM unwrap flat. Standard workflow Blender, Maya. Best control quality.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Smart UV Project</summary>
      <div class="arc-card-body">
        <p>Blender auto. Algorithm decide seam based angle. Quick result, refine after.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>RizomUV Auto-Unwrap</summary>
      <div class="arc-card-body">
        <p>Pro tool. Sophisticated algorithm. Fastest pro workflow. Auto seam suggest.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Project From View</summary>
      <div class="arc-card-body">
        <p>Project current view to 2D. Photo-based texture. Matte painting work.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cylindrical / Spherical</summary>
      <div class="arc-card-body">
        <p>Primitive shape unwrap. Quick for matching primitive. Specialized.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pelt Mapping</summary>
      <div class="arc-card-body">
        <p>Pull flat technique. Headus UVLayout pioneered. Distinct workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Camera Mapping</summary>
      <div class="arc-card-body">
        <p>Project texture từ camera angle. VFX matte painting. Photogrammetry.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UV Stitch / Sew</summary>
      <div class="arc-card-body">
        <p>Combine separate UV island back. Reduce seam later. Iterative process.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Unwrap Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Plan Seam Strategy</h3>
    <ul class="arc-list">
      <li>Study mesh form</li>
      <li>Identify hidden area</li>
      <li>Plan UV island breakdown</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Mark Seam Edges</h3>
    <ul class="arc-list">
      <li>Select edge to cut</li>
      <li>Mark Seam command</li>
      <li>Strategic placement</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Run Unwrap Algorithm</h3>
    <ul class="arc-list">
      <li>LSCM, ABF, Optimal</li>
      <li>UV island flatten</li>
      <li>Initial result review</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Check Distortion</h3>
    <ul class="arc-list">
      <li>Checker pattern apply</li>
      <li>Identify stretched area</li>
      <li>Heat map visualize</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Add Seam Fix Distortion</h3>
    <ul class="arc-list">
      <li>Heavy distortion = add seam</li>
      <li>Re-unwrap</li>
      <li>Iterate until clean</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Optimize Island Shape</h3>
    <ul class="arc-list">
      <li>Straighten island when possible</li>
      <li>Rotate for packing</li>
      <li>Manual adjust</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Pack UV Layout</h3>
    <ul class="arc-list">
      <li>Auto-pack or manual</li>
      <li>Maximize fill 0-1 space</li>
      <li>RizomUV best pack</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Final QA</h3>
    <ul class="arc-list">
      <li>Verify even texel density</li>
      <li>No overlap island</li>
      <li>Ready for texture</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Unwrapping</h2>
  <ul class="arc-list">
    <li><strong>Plan before mark seam</strong> — strategic thinking</li>
    <li><strong>LSCM standard Blender</strong> — angle-preserving good</li>
    <li><strong>Distortion = add seam</strong> — relieve stretching</li>
    <li><strong>Even texel density</strong> — consistent throughout</li>
    <li><strong>Hide seam strategically</strong> — under arm, ear</li>
    <li><strong>RizomUV pro speed</strong> — workflow accelerator</li>
    <li><strong>Mirror characters</strong> — double resolution effectively</li>
    <li><strong>UDIM cho film hero</strong> — multi-tile workflow</li>
    <li><strong>Test in engine</strong> — verify with target render</li>
    <li><strong>Career Texture Artist</strong> — UV unwrap mastery essential</li>
  </ul>
</section>
`,
  },

  // 06. UX UI
  {
    id: "e2018f22-eb69-438d-94d6-0203f99e7338",
    tieu_de: "UX/UI Design",
    tieu_de_viet: "UX/UI Design (Thiết kế trải nghiệm)",
    tom_tat:
      "UX (User Experience) tập trung vào trải nghiệm người dùng đảm bảo dễ dùng, hiệu quả. UI (User Interface) thiết kế giao diện trực quan thẩm mỹ — bộ đôi essential cho digital product.",
    meta_title:
      "UX UI là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "UX UI Design career. Tìm hiểu user research, wireframe, prototype, design system và workflow Figma, Sketch.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn use app — intuitive, beautiful, làm task seamlessly. App khác — confused, ugly, frustrating. Difference: <strong>UX/UI Design</strong>. UX = how it works (user research, flow, usability). UI = how it looks (visual, layout, color). Combined = great product. Foundation cho mọi digital product. Career path lucrative — UX/UI hot field.</p>
  <p>UX/UI Design là kỹ năng essential cho product designer, app developer, web designer. Hiểu user research, wireframe, prototype, design system, software (Figma) giúp build product users love. Career path high-demand $80K-180K. Foundation cho modern digital business.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>UX và UI là gì?</h2>
  <p><strong>UX (User Experience)</strong>: focus on overall experience using product — how easy, efficient, enjoyable. Includes user research, information architecture, user flow, usability testing. Non-visual primarily. <strong>UI (User Interface)</strong>: focus on visual interface — layout, color, typography, button, icon. Visual presentation of UX.</p>
  <p>Modern usage: often combined as &quot;UX/UI Designer&quot; single role smaller team. Large company separate — UX Designer (research, flow) vs UI Designer (visual). Foundation: design beautiful interface không enough — must support good experience. Great UX hidden invisibly, great UI immediately apparent.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">UX vs UI Difference</span>
    <p><strong>UX</strong>: invisible work — research, flow, usability. User feels good. <strong>UI</strong>: visible work — color, typography, layout. User sees beauty. <strong>Combined</strong>: product feel right + look good. Both essential. Different skill set.</p>
  </div>

  <ul class="arc-list">
    <li><strong>User Research</strong> — UX foundation</li>
    <li><strong>Wireframe</strong> — structural sketch</li>
    <li><strong>Prototype</strong> — interactive mock</li>
    <li><strong>User Flow</strong> — task path</li>
    <li><strong>Usability Testing</strong> — feedback</li>
    <li><strong>Design System</strong> — UI consistency</li>
    <li><strong>Component Library</strong> — reusable</li>
    <li><strong>Accessibility (A11y)</strong> — inclusive</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"UX UI design figma wireframe prototype app interface"</span>
    </div>
    <p class="arc-image-caption">UX/UI Design — experience + interface, foundation digital product</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>UX vs UI Activity</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>UX: User Research</summary>
      <div class="arc-card-body">
        <p>Interview user, observe behavior, survey. Understand need, pain point. Foundation good UX. Persona create.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UX: Information Architecture</summary>
      <div class="arc-card-body">
        <p>Structure content. Site map. Navigation hierarchy. How user find information. Foundation findability.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UX: User Flow</summary>
      <div class="arc-card-body">
        <p>Step user take to complete task. Onboarding flow, checkout flow. Optimize for ease.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UX: Wireframe</summary>
      <div class="arc-card-body">
        <p>Low-fi structural sketch. Boxes, label. Focus layout, không visual. Iterate fast.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UX: Usability Testing</summary>
      <div class="arc-card-body">
        <p>Watch user try product. Identify friction. Iterate. Critical validation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UI: Visual Design</summary>
      <div class="arc-card-body">
        <p>Color, typography, layout. Beauty, mood. Brand expression.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UI: Component Design</summary>
      <div class="arc-card-body">
        <p>Button, card, input, modal. Each reusable. Design system foundation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UI: Animation / Microinteraction</summary>
      <div class="arc-card-body">
        <p>Hover effect, transition, loading. Subtle motion feedback. Modern UI essential.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Design Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Research Phase (UX)</h3>
    <ul class="arc-list">
      <li>User interview</li>
      <li>Competitive analysis</li>
      <li>Persona create</li>
      <li>Problem definition</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Ideation</h3>
    <ul class="arc-list">
      <li>Sketch idea</li>
      <li>Brainstorm solution</li>
      <li>Multiple approach</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Wireframe</h3>
    <ul class="arc-list">
      <li>Low-fi layout</li>
      <li>Figma, Balsamiq</li>
      <li>Structure first</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Prototype</h3>
    <ul class="arc-list">
      <li>Interactive mock</li>
      <li>Figma prototype</li>
      <li>Click through flow</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Usability Testing</h3>
    <ul class="arc-list">
      <li>Test prototype với users</li>
      <li>5 user reveal 80% issue</li>
      <li>Iterate based finding</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Visual Design (UI)</h3>
    <ul class="arc-list">
      <li>Color, font, image</li>
      <li>High-fi mockup</li>
      <li>Match brand</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Design System</h3>
    <ul class="arc-list">
      <li>Component library</li>
      <li>Consistent reusable</li>
      <li>Figma component</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Handoff Developer</h3>
    <ul class="arc-list">
      <li>Specs, asset export</li>
      <li>Figma Dev Mode</li>
      <li>Communicate ongoing</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Tools</h2>
  <ul class="arc-list">
    <li><strong>Figma</strong> — industry standard 2024</li>
    <li><strong>Sketch</strong> — Mac, declining</li>
    <li><strong>Adobe XD</strong> — declining</li>
    <li><strong>Framer</strong> — modern interactive</li>
    <li><strong>Maze, UserTesting</strong> — usability test</li>
    <li><strong>Career UX/UI Designer</strong> — $70K-150K junior, $150K-250K senior</li>
    <li><strong>Product Designer</strong> — broader role $100K-200K</li>
    <li><strong>UX Researcher</strong> — specialized $90K-180K</li>
    <li><strong>Design System Designer</strong> — niche specialty</li>
    <li><strong>School</strong>: Google UX Design Certificate, IDEO, GA</li>
  </ul>
</section>
`,
  },

  // 07. Value Graph
  {
    id: "35db8b11-928d-4f1a-9fb7-6f62cfd3d116",
    tieu_de: "Value Graph (AE)",
    tieu_de_viet: "Value Graph trong After Effects",
    tom_tat:
      "Value Graph hiển thị giá trị thực tế của thuộc tính theo thời gian trong After Effects — khác với speed graph, value graph cho thấy vị trí/giá trị thay vì tốc độ thay đổi.",
    meta_title:
      "Value Graph là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Value Graph After Effects. So sánh Value vs Speed Graph, bezier handle và workflow polish animation.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn animator open AE Graph Editor — see two view: <strong>Value Graph</strong> (actual property value over time) và <strong>Speed Graph</strong> (rate of change). Beginners often confused. Value Graph foundational — shows position, opacity actual số over time. Master Value Graph = master animation curve manipulation. Foundation cho polish phase.</p>
  <p>Value Graph là kiến thức essential cho mọi After Effects animator. Hiểu difference từ Speed Graph, bezier handle manipulation, common pattern giúp craft natural motion. Foundation skill cho motion design polish.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Value Graph là gì?</h2>
  <p>Value Graph là <strong>view mode trong After Effects Graph Editor</strong> displaying actual property value over time. X-axis: time. Y-axis: value (position pixel, opacity %, rotation degree). Curve shows property change throughout animation. Different from <strong>Speed Graph</strong> which shows velocity (rate of change). Both views useful — value graph cho position, speed graph for velocity profile.</p>
  <p>Manipulation: <strong>Bezier handle</strong> on each keyframe control curve interpolation. Drag handle to shape curve. Steep curve = fast change. Flat curve = slow change. Foundation cho ease in/out, animation polish. Most animator default Value Graph view.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Value Graph vs Speed Graph</span>
    <p><strong>Value Graph</strong>: shows actual value (where, what color, etc). Y-axis = value. Default view. <strong>Speed Graph</strong>: shows velocity (how fast changing). Y-axis = speed. Reveal motion characteristics not visible in value graph. Both essential, toggle between.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Value Curve</strong> — property over time</li>
    <li><strong>Speed Curve</strong> — velocity</li>
    <li><strong>Bezier Handle</strong> — control point</li>
    <li><strong>Linear</strong> — straight curve</li>
    <li><strong>Ease In/Out</strong> — bezier curved</li>
    <li><strong>Auto Bezier</strong> — auto-smooth</li>
    <li><strong>Hold / Step</strong> — no interpolation</li>
    <li><strong>Keyframe Type</strong> — interpolation</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"value graph after effects animation curve bezier"</span>
    </div>
    <p class="arc-image-caption">Value Graph — visualize property over time, foundation polish</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Graph Editor View</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Linear (Straight Line)</summary>
      <div class="arc-card-body">
        <p>Constant change rate. Mechanical motion. Diagonal line trong value graph. Click keyframe → Toggle Hold or Linear.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bezier (Curved)</summary>
      <div class="arc-card-body">
        <p>Smooth interpolation. Default. Bezier handle adjustable. Ease in/out natural motion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hold (Step)</summary>
      <div class="arc-card-body">
        <p>No interpolation. Value jump at keyframe. Used cho blocking animation, hard cut value change.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Auto Bezier</summary>
      <div class="arc-card-body">
        <p>Software auto-smooth. Initial keyframe state. Edit handle manually after.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Continuous Bezier</summary>
      <div class="arc-card-body">
        <p>Handle linked through keyframe. Smooth curve continuous. Default behavior.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Broken Handle</summary>
      <div class="arc-card-body">
        <p>Handle independent each side keyframe. Asymmetric ease. Different in/out rate.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Easy Ease (F9)</summary>
      <div class="arc-card-body">
        <p>One-click ease in/out. Foundation animator shortcut. Apply both side keyframe.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Multiple Property Stacked</summary>
      <div class="arc-card-body">
        <p>View multiple property in one graph editor. Layer position X, Y, Z stacked. Coordinate timing.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Toggle Graph Editor</h3>
    <ul class="arc-list">
      <li>Click Graph Editor button</li>
      <li>Or Shift+F3</li>
      <li>Timeline → graph</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Choose Value or Speed</h3>
    <ul class="arc-list">
      <li>Bottom toggle</li>
      <li>Value default</li>
      <li>Speed for velocity check</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Select Property</h3>
    <ul class="arc-list">
      <li>Click property in timeline</li>
      <li>Graph show only selected</li>
      <li>Multi-select multiple property</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Drag Bezier Handle</h3>
    <ul class="arc-list">
      <li>Click keyframe → handle appear</li>
      <li>Drag adjust curve shape</li>
      <li>Steeper = faster change</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Apply Easy Ease</h3>
    <ul class="arc-list">
      <li>Select keyframe</li>
      <li>Press F9</li>
      <li>Both side ease applied</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Break Handle Asymmetric</h3>
    <ul class="arc-list">
      <li>Alt+drag handle</li>
      <li>Independent each side</li>
      <li>Asymmetric ease</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Switch Hold for Block</h3>
    <ul class="arc-list">
      <li>Animator blocking mode</li>
      <li>Hold keyframe</li>
      <li>Stepped interpolation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Match Reference</h3>
    <ul class="arc-list">
      <li>Curve shape match real motion</li>
      <li>Pendulum sine wave</li>
      <li>Bounce exponential decay</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Value Graph</h2>
  <ul class="arc-list">
    <li><strong>F9 Easy Ease</strong> shortcut master</li>
    <li><strong>Steep curve = fast</strong>, flat = slow</li>
    <li><strong>Asymmetric ease</strong> often natural — slow start, fast settle</li>
    <li><strong>Watch curve shape</strong> — looks natural?</li>
    <li><strong>Linear robotic</strong> — only mechanical motion</li>
    <li><strong>Hold for blocking</strong> — animator workflow</li>
    <li><strong>Speed graph reveal</strong> issue value graph hide</li>
    <li><strong>Multiple property simultaneously</strong> — coordinate animation</li>
    <li><strong>Print reference</strong> — sketch curve cho complex</li>
    <li><strong>Career Motion Designer</strong> — graph mastery essential</li>
  </ul>
</section>
`,
  },

  // 08. Vector
  {
    id: "55f66b24-cdc9-42f2-a684-158746cc0081",
    tieu_de: "Vector Graphics",
    tieu_de_viet: "Đồ họa Vector",
    tom_tat:
      "Vector là loại đồ họa sử dụng các đường cong và đường thẳng toán học — hình ảnh phóng to vô hạn không bị vỡ — khác với Raster pixel-based.",
    meta_title: "Vector là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Vector graphics vs Raster. Tìm hiểu Illustrator, Figma, SVG và workflow cho logo, icon, illustration chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn design logo cho client — JPG hoặc PNG? Print on billboard 10 meter — JPG vỡ pixelated. Solution: <strong>Vector</strong> — math-based graphic scale infinitely. Same file from business card to billboard. Foundation cho logo, icon, illustration modern. Foundation skill cho graphic designer. Master Vector = pro design.</p>
  <p>Vector là kỹ năng essential cho graphic designer, illustrator, brand designer. Hiểu difference với raster, software (Illustrator, Figma), workflow giúp produce scalable design. Foundation cho mọi production-ready graphic asset.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Vector Graphics là gì?</h2>
  <p>Vector Graphics là <strong>image format based on mathematical equation</strong> — points, lines, curves, polygon. Different from <strong>Raster</strong> (pixel-based, JPG, PNG). Vector store shape definition, not individual pixel. Result: <strong>scale infinitely without quality loss</strong>. Foundation cho logo, icon, illustration, font. Modern web: SVG.</p>
  <p>Components: <strong>Anchor Point</strong> (vertex), <strong>Path</strong> (line/curve between anchor), <strong>Bezier Handle</strong> (control curve), <strong>Fill</strong> (interior color), <strong>Stroke</strong> (outline). Math-based — file describe shape mathematically. Renderer (browser, printer) compute pixel based on equation at any resolution.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Vector vs Raster</span>
    <p><strong>Vector</strong>: math-based, scale infinite, small file, editable shape. Logo, icon. <strong>Raster</strong>: pixel-based, fixed resolution, large file (color rich), photo realistic. Photo. Each appropriate different content.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Anchor Point</strong> — vertex</li>
    <li><strong>Path</strong> — line/curve</li>
    <li><strong>Bezier Curve</strong> — smooth</li>
    <li><strong>Fill</strong> — interior color</li>
    <li><strong>Stroke</strong> — outline</li>
    <li><strong>SVG</strong> — web vector format</li>
    <li><strong>AI / EPS / PDF</strong> — vector file</li>
    <li><strong>Scale Infinite</strong> — no degrade</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"vector graphics illustrator logo icon path bezier"</span>
    </div>
    <p class="arc-image-caption">Vector — math-based scalable, foundation logo và icon</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Vector Use Cases</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Logo Design</summary>
      <div class="arc-card-body">
        <p>Brand logo must vector. Scale từ favicon đến billboard. Single file all use case. Industry standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Icon Design</summary>
      <div class="arc-card-body">
        <p>UI icon system. SVG export. Scale per device. Consistent across resolution.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Illustration</summary>
      <div class="arc-card-body">
        <p>Flat illustration trend. Editorial, marketing. Personality, scalable.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Typography</summary>
      <div class="arc-card-body">
        <p>Font file (TTF, OTF) = vector. Each letter shape stored math. Scale any size.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Infographic</summary>
      <div class="arc-card-body">
        <p>Chart, diagram, icon-heavy. Vector clean lines. Print + web flexibility.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pattern Design</summary>
      <div class="arc-card-body">
        <p>Tileable pattern. Fabric, packaging, wallpaper. Vector preserve crisp.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Web Graphics</summary>
      <div class="arc-card-body">
        <p>SVG modern web standard. Crisp every screen. Animatable CSS.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Print Design</summary>
      <div class="arc-card-body">
        <p>Business card, poster. CMYK vector best print. Scale up no issue.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Vector Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Sketch Concept</h3>
    <ul class="arc-list">
      <li>Pencil hoặc tablet sketch</li>
      <li>Iterate design</li>
      <li>Foundation ideation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Trace in Illustrator</h3>
    <ul class="arc-list">
      <li>Pen Tool draw path</li>
      <li>Or Image Trace from sketch</li>
      <li>Clean shape</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Refine Path</h3>
    <ul class="arc-list">
      <li>Adjust anchor point</li>
      <li>Smooth curve</li>
      <li>Minimal point cho clean shape</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Add Color / Fill</h3>
    <ul class="arc-list">
      <li>Fill color, gradient</li>
      <li>Stroke outline</li>
      <li>Brand color palette</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Layer Organize</h3>
    <ul class="arc-list">
      <li>Name layer</li>
      <li>Group related</li>
      <li>Maintain hierarchy</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Test Scaling</h3>
    <ul class="arc-list">
      <li>Zoom 1000% — still crisp</li>
      <li>Zoom 10% — readable small</li>
      <li>Universal sizing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Export Format</h3>
    <ul class="arc-list">
      <li>AI master file</li>
      <li>SVG cho web</li>
      <li>EPS cho print</li>
      <li>PDF universal</li>
      <li>PNG raster export sometime</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Multiple Variant</h3>
    <ul class="arc-list">
      <li>Color variant</li>
      <li>Monochrome version</li>
      <li>Horizontal / stacked</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Adobe Illustrator</strong> — industry standard vector</li>
    <li><strong>Figma</strong> — modern UI/vector</li>
    <li><strong>Affinity Designer</strong> — affordable alternative</li>
    <li><strong>Inkscape</strong> — free, open-source</li>
    <li><strong>CorelDRAW</strong> — alternative</li>
    <li><strong>Sketch</strong> — Mac, declining</li>
    <li><strong>Vectornator</strong> — iPad free</li>
    <li><strong>Career Graphic Designer</strong> — vector essential $50K-130K</li>
    <li><strong>Illustrator certification</strong> — Adobe official</li>
    <li><strong>Brand designer</strong>: vector master mandatory</li>
  </ul>
</section>
`,
  },

  // 09. Vehicle Design
  {
    id: "11e21dcd-36b4-43e9-b15f-9f0d16a54f49",
    tieu_de: "Vehicle Design",
    tieu_de_viet: "Vehicle Design (Thiết kế phương tiện)",
    tom_tat:
      "Vehicle Design là thiết kế các phương tiện — xe hơi, máy bay, tàu vũ trụ, cỗ máy chiến đấu — phù hợp với phong cách và thời đại của dự án phim, game.",
    meta_title:
      "Vehicle Design là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Vehicle Design cho film, game. Tìm hiểu workflow concept art, sci-fi vehicle, mech và career concept artist.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Star Wars — Millennium Falcon, X-Wing iconic. Hoặc Avatar — Pandora dragon-like creature mount. Marvel — Iron Man suit. Mass Effect — Normandy SR-2. Đó là <strong>Vehicle Design</strong> — specialized concept art creating cinematic transportation. From sci-fi spaceship đến futuristic car. Niche skill, lucrative career cho concept artist.</p>
  <p>Vehicle Design là kỹ năng essential cho concept artist specializing transportation. Hiểu silhouette, function-driven design, era/style match giúp produce iconic vehicle. Career path Star Wars, Marvel, AAA game concept artist.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Vehicle Design là gì?</h2>
  <p>Vehicle Design là <strong>specialized concept art discipline</strong> creating vehicles cho film, TV, game. Includes: <strong>Ground Vehicle</strong> (car, tank, mech), <strong>Aircraft</strong> (plane, helicopter, dropship), <strong>Spaceship</strong> (sci-fi staple), <strong>Watercraft</strong> (boat, submarine), <strong>Fantastical</strong> (creature mount, hover bike). Each requires understanding form follow function + cinematic appeal.</p>
  <p>Core principles: <strong>Silhouette</strong> (readable shape distance), <strong>Function-Driven</strong> (each part should logical purpose), <strong>Era / Style Consistency</strong> (match project aesthetic — sleek modern, grimy used-future, ornate fantasy), <strong>Brand Identity</strong> (faction recognizable), <strong>Scale</strong> (sense of size — human element reference).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Vehicle Design Studios</span>
    <p><strong>Industrial Light &amp; Magic</strong>: Star Wars vehicle iconic. <strong>Marvel Studio</strong>: tech-heavy. <strong>Activision/Blizzard</strong>: AAA game. <strong>Riot Games</strong>: stylized. Specialized concept artist often staff per studio. Designer Ryan Church, Doug Chiang Star Wars legend.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Silhouette First</strong> — readable</li>
    <li><strong>Function-Driven</strong> — believable</li>
    <li><strong>Era Style</strong> — match project</li>
    <li><strong>Faction Identity</strong> — recognizable</li>
    <li><strong>Scale Reference</strong> — human ref</li>
    <li><strong>Mech Design</strong> — robot vehicle</li>
    <li><strong>Spaceship</strong> — sci-fi</li>
    <li><strong>Concept to 3D</strong> — pipeline</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"vehicle design concept art spaceship sci-fi mech illustration"</span>
    </div>
    <p class="arc-image-caption">Vehicle Design — concept art transportation, iconic moment</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Vehicle Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Spaceship</summary>
      <div class="arc-card-body">
        <p>Sci-fi staple. Star Wars, Mass Effect. Engine thrust, weapon, cockpit. Function + aesthetic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ground Vehicle (Car/Tank)</summary>
      <div class="arc-card-body">
        <p>Cyberpunk car, Mad Max post-apoc tank. Realism reference + dramatic. Wheel design key.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Aircraft (Plane, Helicopter)</summary>
      <div class="arc-card-body">
        <p>Real-world aircraft inspiration. WW2, modern fighter. Aerodynamics + cinematic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mech / Robot</summary>
      <div class="arc-card-body">
        <p>Pacific Rim, Gundam. Humanoid robot. Anatomy + machinery hybrid. Joint design technical.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Watercraft</summary>
      <div class="arc-card-body">
        <p>Boat, submarine. Less common but iconic — Bond submarine, Pirates ship. Specialty.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hover / Antigrav</summary>
      <div class="arc-card-body">
        <p>Sci-fi hover bike, antigrav vehicle. No wheel. Glow effect propulsion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Creature Mount</summary>
      <div class="arc-card-body">
        <p>Hybrid creature + saddle. Avatar Ikran, How to Train Dragon. Fantasy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Industrial / Construction</summary>
      <div class="arc-card-body">
        <p>Mining vehicle, construction. Distinct from combat. Halo Pelican variant.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Vehicle Design Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Brief / Constraint</h3>
    <ul class="arc-list">
      <li>Function (transport, combat)</li>
      <li>Era (medieval, futuristic)</li>
      <li>Faction (Empire vs Rebel)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Reference Research</h3>
    <ul class="arc-list">
      <li>Real-world reference</li>
      <li>Tank, plane, car</li>
      <li>Nature inspiration</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Silhouette Exploration</h3>
    <ul class="arc-list">
      <li>50-100 thumbnail silhouette</li>
      <li>Black shape recognizable</li>
      <li>Select strong silhouette</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Refine Sketch</h3>
    <ul class="arc-list">
      <li>Develop selected silhouette</li>
      <li>Add detail</li>
      <li>Function logical</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Orthographic Views</h3>
    <ul class="arc-list">
      <li>Front, side, top, back</li>
      <li>3D modeler reference</li>
      <li>Pipeline ready</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Color &amp; Render</h3>
    <ul class="arc-list">
      <li>Paint detail render</li>
      <li>Lighting dramatic</li>
      <li>Material indication</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Detail Callout</h3>
    <ul class="arc-list">
      <li>Specific element detail</li>
      <li>Cockpit, engine, weapon</li>
      <li>Annotation function</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Final Hero Shot</h3>
    <ul class="arc-list">
      <li>Cinematic angle</li>
      <li>Environment context</li>
      <li>Production-ready</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Famous</h2>
  <ul class="arc-list">
    <li><strong>Ryan Church</strong> — Star Wars Episode I-III concept</li>
    <li><strong>Doug Chiang</strong> — Star Wars Mandalorian visual</li>
    <li><strong>Syd Mead</strong> — Blade Runner, Tron legendary</li>
    <li><strong>Phil Saunders</strong> — Iron Man, Marvel</li>
    <li><strong>Career Vehicle Concept Artist</strong> — $70K-180K studio</li>
    <li><strong>Senior / Lead Concept Artist</strong> — $180K-300K</li>
    <li><strong>Studio</strong>: ILM, Marvel, Naughty Dog, Bungie</li>
    <li><strong>Software</strong>: Photoshop, Blender, KeyShot</li>
    <li><strong>Schools</strong>: Art Center, FZD, CDA</li>
    <li><strong>Portfolio</strong>: ArtStation showcase essential</li>
  </ul>
</section>
`,
  },

  // 10. VFX
  {
    id: "380708b2-e1a4-4a2e-ac15-635f898e417c",
    tieu_de: "VFX (Visual Effects)",
    tieu_de_viet: "VFX (Hiệu ứng hình ảnh)",
    tom_tat:
      "VFX (Visual Effects) là quá trình xử lý và &quot;bùa phép&quot; hình ảnh sau giai đoạn quay phim — CGI, compositing, simulation tạo ra cảnh không thể quay trực tiếp.",
    meta_title: "VFX là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "VFX Visual Effects film, TV. Tìm hiểu CGI, compositing, simulation, software Houdini, Maya, Nuke và career VFX artist.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Marvel Endgame — Thanos digital character, building collapse, portal CGI. Avatar — entirely virtual world. Game of Thrones — dragon, set extension. Đó là <strong>VFX (Visual Effects)</strong> — &quot;magic&quot; in post-production. Industry massive — Hollywood blockbuster $200M+ VFX budget. Career opportunity worldwide. Foundation cho modern film, TV, streaming.</p>
  <p>VFX là kỹ năng essential cho VFX artist, technical artist, post production. Hiểu pipeline, software (Houdini, Maya, Nuke), specializations (compositing, animation, simulation, lighting) giúp career VFX industry. Path lucrative cho creative tech-savvy.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>VFX là gì?</h2>
  <p>VFX (Visual Effects) là <strong>digital post-production technique</strong> creating, manipulating image impossible or impractical to capture in-camera. Different from <strong>SFX (Special Effects)</strong> — on-set practical (pyrotechnic, makeup, animatronic). VFX done in computer post-shoot. Modern blockbuster combine both. Foundation modern cinematic spectacle.</p>
  <p>Disciplines: <strong>Compositing</strong> (combine multiple element — live action + CG), <strong>3D Animation</strong> (character, creature), <strong>Modeling</strong> (build 3D asset), <strong>Texturing</strong> (surface), <strong>Lighting</strong> (illuminate scene), <strong>Simulation / FX</strong> (fire, fluid, destruction), <strong>Matchmove / Tracking</strong> (camera track), <strong>Rotoscoping</strong> (cut out subject), <strong>Matte Painting</strong> (extend environment).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">VFX Pipeline</span>
    <p><strong>1. Previs</strong>: 3D pre-visualize. <strong>2. Shoot</strong>: live action plate. <strong>3. Layout</strong>: digital scene setup. <strong>4. Asset Build</strong>: model, texture, rig. <strong>5. Animation</strong>: character motion. <strong>6. FX</strong>: simulation. <strong>7. Lighting</strong>: scene illumination. <strong>8. Render</strong>: final image. <strong>9. Compositing</strong>: combine all. <strong>10. Delivery</strong>.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Compositing</strong> — combine layer</li>
    <li><strong>CGI</strong> — computer-generated</li>
    <li><strong>Simulation</strong> — physics</li>
    <li><strong>Tracking</strong> — camera match</li>
    <li><strong>Rotoscoping</strong> — cut out</li>
    <li><strong>Matte Painting</strong> — environment</li>
    <li><strong>Green Screen</strong> — chroma key</li>
    <li><strong>Rendering</strong> — final image</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"VFX visual effects film marvel CGI compositing post production"</span>
    </div>
    <p class="arc-image-caption">VFX — digital magic, foundation modern cinematic</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>VFX Disciplines</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Compositing</summary>
      <div class="arc-card-body">
        <p>Combine multiple element — live + CG + matte painting. Final image assembly. Nuke industry standard. Highest skilled VFX role.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D Animation</summary>
      <div class="arc-card-body">
        <p>Character, creature animation. Avatar, Marvel Hulk. Maya, Blender. Motion capture often integrate.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Modeling</summary>
      <div class="arc-card-body">
        <p>Build 3D asset — character, prop, environment. Maya, ZBrush. Foundation pipeline.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Texturing / Look Dev</summary>
      <div class="arc-card-body">
        <p>Surface material — color, roughness, displacement. Substance Painter, Mari. Material realism.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Rigging</summary>
      <div class="arc-card-body">
        <p>Character control system. Maya, Houdini KineFX. Animation infrastructure. Technical specialty.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>FX / Simulation</summary>
      <div class="arc-card-body">
        <p>Fire, smoke, water, destruction. Houdini specialty. Most technical role. High demand.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lighting</summary>
      <div class="arc-card-body">
        <p>Illuminate 3D scene. Arnold, RenderMan. Match plate. Art + technical.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Matchmove / Tracking</summary>
      <div class="arc-card-body">
        <p>Reconstruct camera motion match plate. PFTrack, SynthEyes. Foundation cho seamless CG integration.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>VFX Pipeline</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Pre-Production</h3>
    <ul class="arc-list">
      <li>Storyboard, previs</li>
      <li>Concept art</li>
      <li>Plan VFX shot</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Shoot Plate</h3>
    <ul class="arc-list">
      <li>Live action footage</li>
      <li>Green screen often</li>
      <li>VFX supervisor on-set</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Matchmove</h3>
    <ul class="arc-list">
      <li>Camera track</li>
      <li>3D scene match plate</li>
      <li>Foundation cho CG integrate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Asset Build</h3>
    <ul class="arc-list">
      <li>Model 3D</li>
      <li>Texture surface</li>
      <li>Rig animation system</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Animation / FX</h3>
    <ul class="arc-list">
      <li>Character animation</li>
      <li>Simulation (fire, fluid)</li>
      <li>Match performance</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Lighting / Render</h3>
    <ul class="arc-list">
      <li>Match plate light</li>
      <li>Render multi-pass</li>
      <li>Render farm hours-days</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Compositing</h3>
    <ul class="arc-list">
      <li>Combine plate + CG</li>
      <li>Color grade match</li>
      <li>Final image</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Director Approve</h3>
    <ul class="arc-list">
      <li>Review session</li>
      <li>Feedback iterate</li>
      <li>Final delivery</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Studios</h2>
  <ul class="arc-list">
    <li><strong>ILM (Industrial Light &amp; Magic)</strong> — Star Wars, Marvel</li>
    <li><strong>Weta Digital</strong> — Lord of Rings, Avatar</li>
    <li><strong>DNEG (Double Negative)</strong> — Tenet, Dune Oscar</li>
    <li><strong>MPC (Moving Picture Company)</strong> — Lion King 2019</li>
    <li><strong>Framestore</strong> — Marvel, Gravity</li>
    <li><strong>Sony Pictures Imageworks</strong> — Spider-Verse</li>
    <li><strong>Career VFX Artist</strong> — $50K-200K depending specialty</li>
    <li><strong>Senior / Lead</strong> — $200K-500K</li>
    <li><strong>VFX Supervisor</strong> — $300K-1M+</li>
    <li><strong>Schools</strong>: Gnomon, FZD, Lost Boys</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 3 · Batch 8 — chạy ${items.length} bài keyword (Q → Z) ──\n`,
);

for (const it of items) {
  const sql = `UPDATE article_bai_viet SET
  tieu_de             = '${esc(it.tieu_de)}',
  tieu_de_viet        = '${esc(it.tieu_de_viet)}',
  tom_tat             = '${esc(it.tom_tat)}',
  meta_title          = '${esc(it.meta_title)}',
  meta_description    = '${esc(it.meta_description)}',
  trang_thai_noi_dung = 'published',
  noi_dung            = $noidung$${it.noi_dung}$noidung$
WHERE id = '${it.id}'
  AND loai_bai_viet = 'keyword'
RETURNING id, slug, tieu_de, LENGTH(noi_dung) AS do_dai;
`;

  try {
    const res = await runAdminSql(sql, "full");
    const row = res.rows?.find(
      (r) => r && typeof r === "object" && "do_dai" in r,
    ) as { do_dai?: string | number } | undefined;
    const doDai =
      typeof row?.do_dai === "string" ? Number(row.do_dai) : row?.do_dai;
    if (typeof doDai === "number" && doDai > 800) {
      console.log(`✓ ${it.tieu_de} — ${doDai} ký tự`);
    } else {
      console.log(`⚠ ${it.tieu_de} — do_dai = ${doDai} (cần > 800)`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`✗ ${it.tieu_de} — ${msg}`);
  }
}

const remain = await runAdminSql(
  `SELECT COUNT(*) AS con_lai_dot3
FROM article_bai_viet
WHERE loai_bai_viet = 'keyword'
  AND (noi_dung IS NULL OR noi_dung = '')
  AND tieu_de >= 'Q'`,
  "read",
);
const conLai = remain.rows?.[0]?.con_lai_dot3;

console.log(`\nCòn lại đợt 3: ${conLai} bài.`);
