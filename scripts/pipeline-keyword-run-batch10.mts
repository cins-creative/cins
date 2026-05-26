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
  // 01. FBX
  {
    id: "925829b8-aa48-4d39-b4cd-9432da9ccb49",
    tieu_de: "FBX",
    tieu_de_viet: "Định dạng FBX (3D Exchange)",
    tom_tat:
      "FBX là định dạng file 3D phổ biến nhất ngành — chứa model, animation, rig, material — dùng để trao đổi giữa Maya, 3ds Max, Blender, Unreal, Unity và các phần mềm khác.",
    meta_title: "FBX là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "FBX là chuẩn 3D exchange format. Tìm hiểu cách export, import FBX giữa các phần mềm 3D và pipeline game development chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn modeling character trong Maya, animate trong Blender, render trong Unreal Engine. Làm sao chuyển asset giữa các phần mềm này? Câu trả lời: FBX — định dạng &quot;universal&quot; cho 3D exchange. Hiểu FBX là một trong những kỹ năng pipeline cơ bản nhất cho mọi 3D artist.</p>
  <p>FBX là kiến thức nền tảng cho 3D artist, game developer và VFX artist. Hiểu cách export/import đúng, các option settings và khi nào nên dùng FBX vs alternatives (glTF, USD, OBJ) giúp pipeline 3D smooth, không mất data.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>FBX là gì?</h2>
  <p>FBX (Filmbox) là định dạng file 3D độc quyền của Autodesk, ra đời từ Kaydara năm 1996, được Autodesk mua lại năm 2006. Hiện là chuẩn de facto cho 3D exchange — hầu như mọi phần mềm 3D đều support import/export FBX. Có thể chứa: <strong>geometry</strong> (mesh, UV), <strong>materials</strong> (cơ bản), <strong>animation</strong> (keyframe), <strong>rig/skeleton</strong>, <strong>blendshapes</strong>, <strong>texture references</strong>, <strong>cameras</strong>, <strong>lights</strong>.</p>
  <p>FBX có hai variants: <strong>FBX Binary (.fbx)</strong> — compact, fast load, default; <strong>FBX ASCII</strong> — readable text, larger file, dùng khi cần debug. Mặc dù được Autodesk own, FBX đã trở thành industry standard — game engine (Unreal, Unity) chấp nhận FBX là input chính cho asset 3D.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">FBX vs glTF vs USD vs OBJ</span>
    <p><strong>FBX</strong>: full-featured (animation, rig, material), proprietary, ubiquitous. <strong>glTF</strong>: open standard, optimized for web/realtime, modern PBR. <strong>USD (Pixar)</strong>: modern, scalable cho large scene, future industry standard. <strong>OBJ</strong>: simple, geometry only, no animation. FBX cho game pipeline; USD cho film pipeline modern; glTF cho web/AR.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Geometry</strong> — vertex, polygon, UV map</li>
    <li><strong>Skinning</strong> — vertex weight cho joint</li>
    <li><strong>Animation Clips</strong> — keyframe data</li>
    <li><strong>Blendshapes</strong> — facial expression target</li>
    <li><strong>Material</strong> — basic shading (limited PBR)</li>
    <li><strong>Cameras / Lights</strong> — full scene transfer</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"fbx 3D file format autodesk pipeline maya unreal"</span>
    </div>
    <p class="arc-image-caption">FBX — chuẩn 3D exchange giữa các phần mềm 3D và game engine</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>FBX trong từng phần mềm</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Maya (Autodesk — native FBX)</summary>
      <div class="arc-card-body">
        <p>File → Export Selection → FBX. Settings phong phú — animation bake, geometry options. Best export support trong industry.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3ds Max (Autodesk — native FBX)</summary>
      <div class="arc-card-body">
        <p>File → Export → FBX. Tương tự Maya, full support. Workflow cho game cinema thường Max → FBX → engine.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender</summary>
      <div class="arc-card-body">
        <p>File → Export → FBX. Free option. Animation export đôi khi có quirks — armature naming, scale issue. Better-fbx addon improve nhiều.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unreal Engine</summary>
      <div class="arc-card-body">
        <p>Drag .fbx vào Content Browser. Import options: skeletal mesh, static mesh, animation. Auto-create material slot.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unity</summary>
      <div class="arc-card-body">
        <p>Drop .fbx vào Assets. Inspector show import settings — rig type, animation type. Direct workflow phổ biến.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cinema 4D / Houdini</summary>
      <div class="arc-card-body">
        <p>Cả hai support FBX. Houdini → FBX cho lighting/animation chuyển sang game engine.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Best Practice FBX Export</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Geometry Cleanup trước Export</h3>
    <ul class="arc-list">
      <li>Apply transforms (freeze rotation/scale)</li>
      <li>Delete history (Maya), Apply modifier (Blender)</li>
      <li>Triangulate mesh (game pipeline yêu cầu)</li>
      <li>Check normals — consistent direction</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation Export</h3>
    <ul class="arc-list">
      <li>Bake animation thành keyframe (no IK, constraint)</li>
      <li>Set frame range chính xác</li>
      <li>Multiple animation clips → multiple file hoặc combined</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Skeleton</h3>
    <ul class="arc-list">
      <li>Joint hierarchy clean — root → children</li>
      <li>Skin weight normalize</li>
      <li>No scaling on joint (translation/rotation only)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Texture Path</h3>
    <ul class="arc-list">
      <li>Embed textures OR keep relative path</li>
      <li>Naming convention consistent</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Scale</h3>
    <ul class="arc-list">
      <li>1 unit = 1 meter (Unreal default) hoặc 1 cm (Unity default)</li>
      <li>Apply scale trước export</li>
    </ul>
  </div>
</section>
`,
  },

  // 02. Filters
  {
    id: "7542e6d8-fbd5-469c-b8cd-b47d3d8b2c40",
    tieu_de: "Filters (hiệu ứng hình ảnh)",
    tieu_de_viet: "Bộ lọc hình ảnh (Filters)",
    tom_tat:
      "Filter là hiệu ứng áp dụng lên hình ảnh hoặc video để thay đổi màu sắc, độ sắc nét, kết cấu — từ blur cơ bản đến filter phức tạp mô phỏng ống kính máy ảnh hoặc chất liệu phim.",
    meta_title: "Filters là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Filters thay đổi look hình ảnh, video. Tìm hiểu blur, sharpen, color filter và ứng dụng trong photo editing, video grading, motion graphics.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn chụp ảnh — apply filter Instagram &quot;Clarendon&quot; làm ảnh đẹp hơn. Video editor apply &quot;Lumetri Color&quot; làm scene đêm trông cinematic. Motion designer add &quot;CC Light Sweep&quot; tạo highlight chạy qua logo. Tất cả đều là filter — building block của visual modification trong digital media.</p>
  <p>Filters là công cụ cơ bản cho mọi visual artist. Hiểu các loại filter chính (blur, sharpen, color, distortion, stylize) giúp editor và designer apply hiệu quả — biết khi nào nên dùng filter, khi nào tự build effect từ scratch.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Filters là gì?</h2>
  <p>Filter là thuật toán xử lý áp dụng lên hình ảnh hoặc video để thay đổi properties: màu sắc, độ sắc nét, contrast, kết cấu, distortion. Filter có thể đơn giản (blur, sharpen) hoặc phức tạp (cinematic look LUT, simulate film grain). Là cốt lõi của photo/video editing — từ Photoshop, Lightroom, đến Premiere, After Effects, Resolve, mọi software dựa vào filter.</p>
  <p>Filter có thể chia thành các nhóm chính: <strong>Color filters</strong> (hue, saturation, color balance), <strong>Detail filters</strong> (sharpen, denoise, blur), <strong>Stylize filters</strong> (oil painting, watercolor, comic), <strong>Distortion filters</strong> (lens distortion, ripple, wave), <strong>Render filters</strong> (lens flare, clouds, lighting effects).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Filter vs Effect vs LUT — phân biệt</span>
    <p><strong>Filter</strong>: real-time algorithm, parameter editable (blur amount, sharpness level). <strong>Effect</strong>: term phổ biến cho composite multiple filter (rain, glow, glitch). <strong>LUT (Look-Up Table)</strong>: precise color mapping table — input color X → output color Y. LUT cinematic mạnh nhất cho film grading.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Blur filters</strong> — Gaussian, Motion, Radial, Box</li>
    <li><strong>Sharpen filters</strong> — Unsharp Mask, Smart Sharpen</li>
    <li><strong>Color filters</strong> — Curves, Levels, HSL adjustment</li>
    <li><strong>Distortion</strong> — Pinch, Twirl, Liquify</li>
    <li><strong>Stylize</strong> — Oil paint, Posterize, Mosaic</li>
    <li><strong>Noise/Grain</strong> — Add Grain, Film Grain</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"image filters photoshop before after color grading effects"</span>
    </div>
    <p class="arc-image-caption">Filter — algorithm thay đổi color, sharpness, texture của image/video</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Filter chính</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Blur Filters</summary>
      <div class="arc-card-body">
        <p><strong>Gaussian Blur</strong> phổ biến nhất — soft blur uniform. <strong>Motion Blur</strong> tạo cảm giác chuyển động. <strong>Radial Blur</strong> blur tỏa từ một point. <strong>Lens Blur</strong> simulate depth of field with bokeh.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sharpen Filters</summary>
      <div class="arc-card-body">
        <p><strong>Unsharp Mask</strong> classic sharpen với control amount/radius/threshold. <strong>Smart Sharpen</strong> sharpen edge tránh halo. <strong>High Pass</strong> + Overlay = sharpen technique pro photographer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Filters</summary>
      <div class="arc-card-body">
        <p><strong>Curves</strong> control tonal range chi tiết. <strong>HSL</strong> tách hue, saturation, lightness. <strong>Color Balance</strong> shift shadows/midtones/highlights. <strong>Gradient Map</strong> remap tonal sang gradient.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Noise &amp; Grain</summary>
      <div class="arc-card-body">
        <p><strong>Add Noise</strong> texture cho image flat. <strong>Film Grain</strong> simulate analog film. <strong>Reduce Noise / Median</strong> denoise. Phổ biến cho aesthetic film look digital footage.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Distortion Filters</summary>
      <div class="arc-card-body">
        <p><strong>Liquify</strong> Photoshop power tool. <strong>Lens Distortion</strong> simulate camera lens. <strong>Wave/Ripple</strong> tạo distortion creative. <strong>Spherize</strong> wrap quanh sphere.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stylize Filters</summary>
      <div class="arc-card-body">
        <p><strong>Oil Painting</strong> mimic painted look. <strong>Posterize</strong> reduce color level. <strong>Mosaic</strong> pixelate. <strong>Edges</strong> detect edge thành line art. Cho creative/artistic look.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Filter trong từng phần mềm</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photoshop</h3>
    <ul class="arc-list">
      <li>Menu Filter → gallery 100+ filter</li>
      <li>Smart Filter cho non-destructive</li>
      <li>Neural Filters (AI) cho advanced effect</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Lightroom / Camera Raw</h3>
    <ul class="arc-list">
      <li>Preset = combo nhiều filter (color + tone + sharpen)</li>
      <li>Mobile Lightroom popular cho photographer mobile</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">After Effects</h3>
    <ul class="arc-list">
      <li>Effects panel — categorized: Blur, Stylize, Distort, Color Correction</li>
      <li>Third-party plugin (Red Giant, Sapphire) extend significantly</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Premiere / DaVinci Resolve</h3>
    <ul class="arc-list">
      <li>Lumetri Color (Premiere) / Color page (Resolve) — pro color filter</li>
      <li>LUT apply cinematic look nhanh</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Instagram / TikTok / VSCO</h3>
    <ul class="arc-list">
      <li>Pre-built filter preset cho mobile</li>
      <li>VSCO film emulation popular cho aesthetic photography</li>
    </ul>
  </div>
</section>
`,
  },

  // 03. Fine Art
  {
    id: "6971c128-c336-4cd8-893f-82e0a4e09344",
    tieu_de: "Fine Art",
    tieu_de_viet: "Mỹ thuật (Fine Art)",
    tom_tat:
      "Fine Art là lĩnh vực nghệ thuật truyền thống — hội họa, điêu khắc, đồ họa in ấn — tập trung vào giá trị thẩm mỹ và biểu cảm cá nhân. Là nền tảng kỹ năng và tư duy cho mọi ngành sáng tạo kỹ thuật số hiện đại.</p>",
    meta_title: "Fine Art là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Fine Art là nghệ thuật truyền thống — nền tảng cho concept art, illustration. Tìm hiểu lợi ích học fine art cho artist digital hiện đại.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem concept art &quot;Avatar&quot; — đẹp như tranh sơn dầu cổ điển. Hoặc character design Pixar — gestural như sketch của thầy Da Vinci. Tại sao? Vì các artist hàng đầu của ngành sáng tạo digital đều có nền tảng <strong>fine art</strong> — hội họa, điêu khắc, drawing truyền thống. Đó là &quot;invisible skill&quot; phân biệt amateur và master.</p>
  <p>Fine Art là kiến thức nền tảng cho mọi creative artist — concept artist, illustrator, character designer, art director. Đầu tư học fine art (drawing, anatomy, color theory, composition) tạo &quot;moat&quot; cho artist — kỹ năng AI khó replicate, foundation cho mọi technical tool tương lai.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Fine Art là gì?</h2>
  <p>Fine Art (mỹ thuật) là lĩnh vực nghệ thuật truyền thống được tạo ra chủ yếu vì giá trị thẩm mỹ và biểu cảm — không phải utilitarian function. Bao gồm các bộ môn: <strong>Hội họa</strong> (sơn dầu, acrylic, watercolor, tempera), <strong>Điêu khắc</strong> (sculpture marble, bronze, clay), <strong>Đồ họa in ấn</strong> (lithography, etching, woodblock), <strong>Drawing</strong> (charcoal, pencil, ink), <strong>Photography</strong> nghệ thuật.</p>
  <p>Quan trọng hơn các bộ môn cụ thể, fine art dạy <strong>cách nhìn</strong> (observation), <strong>cách tư duy thị giác</strong> (composition, value, color, form), và <strong>cách giao tiếp ý tưởng qua hình ảnh</strong> (storytelling). Tất cả đều transferable sang digital art, concept art, illustration, design.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Tại sao Fine Art quan trọng cho Digital Artist?</span>
    <p>Software tools change (Photoshop → AI generation). Nhưng nguyên lý fine art không đổi 500 năm — composition, value, color harmony, anatomy, perspective. Artist với fine art foundation adapt được mọi tool mới. Đó là lý do top art school (Art Center, CalArts, Ringling) bắt đầu với drawing và painting cơ bản trước digital.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Drawing fundamentals</strong> — line, value, perspective</li>
    <li><strong>Anatomy</strong> — human, animal anatomical accuracy</li>
    <li><strong>Color theory</strong> — color wheel, harmony, temperature</li>
    <li><strong>Composition</strong> — rule of thirds, leading lines, focal point</li>
    <li><strong>Value &amp; light</strong> — chiaroscuro, atmospheric perspective</li>
    <li><strong>Art history</strong> — context, movement, master study</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"fine art classical painting drawing oil charcoal master"</span>
    </div>
    <p class="arc-image-caption">Fine art — drawing, painting, sculpture truyền thống — nền tảng cho mọi digital art</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Bộ môn Fine Art chính</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Drawing</summary>
      <div class="arc-card-body">
        <p>Foundation của mọi visual art. Pencil, charcoal, ink. Gesture, anatomy, perspective. Drawing daily là cách improve nhanh nhất — &quot;you draw better by drawing more&quot;.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Painting (Oil, Acrylic, Watercolor)</summary>
      <div class="arc-card-body">
        <p><strong>Oil</strong>: workable lâu, blend smooth, classical look. <strong>Acrylic</strong>: dry fast, water-clean, flexible. <strong>Watercolor</strong>: transparent, requires planning. Mỗi medium dạy color &amp; value differently.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sculpture</summary>
      <div class="arc-card-body">
        <p>3D understanding tốt nhất — bắt đầu từ clay, plaster. Form thinking transfer trực tiếp sang 3D modeling. Pixar, Disney character sculptor làm clay maquette trước digital model.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Printmaking</summary>
      <div class="arc-card-body">
        <p>Lithography, etching, woodblock. Hiểu reproduction, repetition, color separation — base concept cho graphic design.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photography (Fine Art)</summary>
      <div class="arc-card-body">
        <p>Composition, light, moment. Học photograph teach &quot;see like camera&quot; — quan trọng cho cinematography, concept art.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Fine Art &gt; Digital Art Career</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Concept Art</h3>
    <ul class="arc-list">
      <li>Painting fundamentals critical — value, color, brushwork</li>
      <li>Top concept artist (Sparth, Maciej Kuciara) đều có fine art background</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Illustration</h3>
    <ul class="arc-list">
      <li>Drawing + storytelling foundation</li>
      <li>Book illustrator, editorial illustrator base on fine art training</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Character Design</h3>
    <ul class="arc-list">
      <li>Anatomy + gesture from life drawing</li>
      <li>Pixar character designer học sculpture truyền thống</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D Modeling &amp; Sculpting</h3>
    <ul class="arc-list">
      <li>Sculpting clay → ZBrush transferable</li>
      <li>Form understanding critical cho organic modeling</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Art Direction &amp; Visual Development</h3>
    <ul class="arc-list">
      <li>Art history knowledge essential cho period research</li>
      <li>Composition foundation cho frame design phim</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Cách học Fine Art</h2>
  <ul class="arc-list">
    <li><strong>Daily drawing</strong> — 30 phút/ngày, gesture + value study</li>
    <li><strong>Life drawing class</strong> — sketch người model — critical cho figure</li>
    <li><strong>Master study</strong> — copy painting của master cũ (Sargent, Rembrandt)</li>
    <li><strong>Plein air</strong> — paint outdoor — train eye see real light, color</li>
    <li><strong>Books</strong> — Bridgman Anatomy, Andrew Loomis books, Color &amp; Light của James Gurney</li>
    <li><strong>Art school formal</strong> — Art Center, RISD, SAIC nếu serious career</li>
  </ul>
</section>
`,
  },

  // 04. Fluid Dynamics
  {
    id: "fb8508b5-5f69-451e-91ff-6d87fa4c94e3",
    tieu_de: "Fluid Dynamics (CGI)",
    tieu_de_viet: "Động lực học chất lưu trong CGI",
    tom_tat:
      "Fluid Dynamics trong CGI là lĩnh vực mô phỏng chuyển động của chất lỏng, khí và chất lưu — water, smoke, fire, oil — bằng phương trình vật lý phức tạp, tạo hiệu ứng VFX chân thực.",
    meta_title:
      "Fluid Dynamics CGI là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Fluid Dynamics CGI mô phỏng water, smoke, fire. Tìm hiểu FLIP method, Navier-Stokes và ứng dụng trong VFX phim, advertising.",
    noi_dung: `
<section class="arc-intro">
  <p>Cảnh đại dương dâng trào trong &quot;Aquaman&quot;, explosion khổng lồ phá thành phố trong &quot;Avengers&quot;, magic spell hóa lửa của Doctor Strange — tất cả đều là fluid dynamics simulation trong CGI. Một trong những kỹ thuật phức tạp và visually striking nhất trong VFX hiện đại.</p>
  <p>Fluid Dynamics CGI là chuyên môn đỉnh cao cho FX artist trong industry phim, advertising. Hiểu các phương pháp (FLIP, SPH, Voxel) và tooling (Houdini chuẩn industry) giúp artist participate trong các project blockbuster — well-paid specialty role.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Fluid Dynamics CGI là gì?</h2>
  <p>Fluid Dynamics trong CGI là lĩnh vực mô phỏng chuyển động của chất lưu (fluid) — chất lỏng (water, oil, blood), khí (smoke, mist, fog), plasma (fire, explosion) — bằng phương pháp computational physics. Dựa trên phương trình Navier-Stokes — phương trình toán mô tả flow của fluid trong thực tế (1822).</p>
  <p>Vì phương trình quá phức tạp tính exact, CGI dùng các phương pháp approximation: <strong>FLIP/PIC</strong> (Fluid Implicit Particle), <strong>SPH</strong> (Smoothed Particle Hydrodynamics), <strong>Eulerian (voxel grid)</strong>. Mỗi phương pháp có trade-off — FLIP popular nhất cho water (Houdini); SPH cho splashy fluid; voxel cho smoke/fire.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Fluid Sim &quot;heavy&quot; như thế nào?</span>
    <p>Một cảnh ocean blockbuster có thể: 100 million particle, 5GB cache per frame, 30 phút/frame để simulate, 5 ngày simulate cả cảnh trên render farm. Studio như Weta, ILM có hardware dedicate cho FX simulation. Đây là lĩnh vực &quot;heavy compute&quot; nhất của VFX.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Navier-Stokes Equations</strong> — phương trình vật lý fluid</li>
    <li><strong>FLIP Method</strong> — Fluid Implicit Particle (chuẩn cho water)</li>
    <li><strong>SPH</strong> — Smoothed Particle Hydrodynamics</li>
    <li><strong>Voxel Grid</strong> — 3D grid cho smoke/fire</li>
    <li><strong>VDB</strong> — sparse volume data format (OpenVDB)</li>
    <li><strong>Substep</strong> — chia frame thành multiple step cho accuracy</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"fluid dynamics CGI simulation houdini water smoke fire"</span>
    </div>
    <p class="arc-image-caption">Fluid dynamics CGI — water, smoke, fire simulation theo physics</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Tools Fluid Dynamics</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Houdini (SideFX) — Industry Standard</summary>
      <div class="arc-card-body">
        <p>FLIP Solver chuẩn cho water, Pyro cho fire/smoke. Most VFX studio AAA dùng Houdini cho fluid sim. Procedural node-based, scriptable, render via Mantra/Karma/Redshift.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>RealFlow (Next Limit)</summary>
      <div class="arc-card-body">
        <p>Specialized cho fluid sim. Earlier industry standard, vẫn được dùng. SPH method strong. Plugin cho Maya, Cinema 4D.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Maya Bifrost</summary>
      <div class="arc-card-body">
        <p>Native trong Maya. Aero (smoke/fire), Liquid (water), Cloth. Less powerful than Houdini nhưng tích hợp Maya tốt.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>EmberGen (Realtime)</summary>
      <div class="arc-card-body">
        <p>GPU-accelerated, realtime fire/smoke. Game-quality, không cinema. Affordable license, growing popularity cho indie/game.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender Mantaflow</summary>
      <div class="arc-card-body">
        <p>Built-in fluid sim trong Blender — free. Smoke, fire, liquid. Decent quality cho indie/personal project.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>X-Particles (Cinema 4D)</summary>
      <div class="arc-card-body">
        <p>Plugin cho C4D — particle + fluid. Popular cho motion graphics liquid effect (typography, abstract).</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Use Cases trong VFX</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Water &amp; Ocean</h3>
    <ul class="arc-list">
      <li>Ocean wave (Aquaman, Pirates of the Caribbean)</li>
      <li>River, waterfall, splash interaction</li>
      <li>Underwater scene với bubble, current</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Smoke &amp; Mist</h3>
    <ul class="arc-list">
      <li>Atmospheric scene (fog, mist, dust)</li>
      <li>Smoke từ destruction, fire</li>
      <li>Magic effect smoke trail</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Fire &amp; Explosion</h3>
    <ul class="arc-list">
      <li>Explosion blockbuster (Marvel, action films)</li>
      <li>Realistic fire (Pyro solver Houdini)</li>
      <li>Magical fire (stylized)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Liquid Product Shots</h3>
    <ul class="arc-list">
      <li>Pour, splash của drink commercial</li>
      <li>Honey, viscous fluid product</li>
      <li>Yogurt, sauce commercial</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Abstract / Motion Graphics</h3>
    <ul class="arc-list">
      <li>Liquid metal logo animation</li>
      <li>Abstract fluid art</li>
      <li>Music visualization với fluid</li>
    </ul>
  </div>
</section>
`,
  },

  // 05. Fluid Simulation
  {
    id: "2236ac59-901f-433c-8d38-a5571dfbfab8",
    tieu_de: "Fluid Simulation",
    tieu_de_viet: "Mô phỏng chất lỏng (Fluid Sim)",
    tom_tat:
      "Fluid Simulation là kỹ thuật mô phỏng chuyển động chất lỏng, khói, lửa, khí trong phần mềm 3D — dùng phương trình Navier-Stokes tạo chuyển động vật lý chân thực không thể làm thủ công.",
    meta_title:
      "Fluid Simulation là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Fluid Simulation tạo water, smoke, fire trong 3D. Tìm hiểu workflow Houdini, Maya Bifrost và pipeline simulation cho VFX phim.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nhìn cảnh CGI water dâng tràn trong &quot;Interstellar&quot; — wave huge với foam, droplet, interaction với character. Bạn không thể keyframe từng droplet — quá nhiều, quá phức tạp. Cần software tính toán theo physics — đó chính là fluid simulation. Một trong những technical đỉnh cao của CGI hiện đại.</p>
  <p>Fluid Simulation là chuyên môn quý hiếm trong VFX industry. Hiểu fundamental của simulation (solver type, cache, render) giúp 3D artist transition vào FX role — well-paid niche với demand cao tại studio film, game, advertising.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Fluid Simulation là gì?</h2>
  <p>Fluid Simulation là kỹ thuật trong 3D software để mô phỏng behavior của chất lỏng (water, oil), khí (smoke, mist), và chất lưu khác (fire, explosion). Sử dụng physical equations (chủ yếu Navier-Stokes) để tính toán mỗi frame: mỗi particle/voxel ở đâu, vận tốc ra sao, tương tác thế nào với object và môi trường.</p>
  <p>Khác keyframe animation (animator quyết định mỗi pose), fluid sim là <strong>procedural</strong> — artist setup parameter (gravity, viscosity, source), engine tính toán physics. Kết quả không hoàn toàn predictable — same setup chạy 2 lần có thể slightly khác (do randomness).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Particle-based vs Grid-based vs Hybrid</span>
    <p><strong>Particle (SPH)</strong>: tốt cho splashy water, droplet, foam. Khó simulate large volume. <strong>Grid/Voxel (Eulerian)</strong>: tốt cho smoke, fire, viscous fluid. Heavy memory cho high res. <strong>Hybrid FLIP</strong>: best of both — particle cho fluid body, grid cho velocity field. Houdini FLIP solver standard cho water.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Solver</strong> — algorithm tính toán (FLIP, SPH, Pyro)</li>
    <li><strong>Source</strong> — nơi fluid emit (volume, point)</li>
    <li><strong>Collision</strong> — object fluid tương tác</li>
    <li><strong>Cache</strong> — store simulation data per frame</li>
    <li><strong>Substep</strong> — chia frame nhỏ hơn cho accuracy</li>
    <li><strong>Field</strong> — velocity, density, temperature data grid</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"fluid simulation houdini FLIP water smoke render"</span>
    </div>
    <p class="arc-image-caption">Fluid simulation — water FLIP, smoke Pyro với physics chân thực</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Pipeline Fluid Simulation</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Setup Source &amp; Container</summary>
      <div class="arc-card-body">
        <p>Define nơi fluid bắt đầu (source — emitter geometry hoặc point). Container/box giới hạn vùng simulate — tiết kiệm compute, focus vào vùng quan trọng.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Set Parameters</summary>
      <div class="arc-card-body">
        <p>Gravity, viscosity, surface tension, density. Default thường work, tune cho specific look (honey vs water viscosity rất khác).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Add Collision Objects</summary>
      <div class="arc-card-body">
        <p>Geometry mà fluid sẽ tương tác — character, ground, building. Collide với simplified proxy mesh (không phải render mesh full detail) cho speed.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Low-Res Test Simulate</summary>
      <div class="arc-card-body">
        <p>Simulate ở low resolution để check art direction. Quick iteration. Adjust parameter, source position.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. High-Res Final Simulate</summary>
      <div class="arc-card-body">
        <p>Increase resolution (particle count, voxel size). Có thể overnight render farm. Cache to disk — VDB cho voxel, BGEO cho particle.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Meshing (cho water)</summary>
      <div class="arc-card-body">
        <p>Convert particle thành mesh surface — &quot;Particle Fluid Surface&quot; trong Houdini. Render-ready geometry.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>7. Render</summary>
      <div class="arc-card-body">
        <p>Render với Mantra, Karma, Redshift, Arnold. Setup shader: water với refraction, dispersion. Smoke với scattering, density.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>8. Composite</summary>
      <div class="arc-card-body">
        <p>Comp render passes (beauty, AO, depth) với live action plate hoặc 3D scene trong Nuke/AE.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Tips Fluid Simulation</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Performance Optimization</h3>
    <ul class="arc-list">
      <li>Container nhỏ nhất có thể — không simulate vùng không thấy</li>
      <li>Substep just enough — too many waste compute</li>
      <li>Particle/voxel resolution scale với screen size</li>
      <li>Cache to fast SSD — read/write nhanh</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Look Development</h3>
    <ul class="arc-list">
      <li>Reference real footage — water/smoke real behavior</li>
      <li>Iterate low-res cho art direction trước</li>
      <li>Secondary detail (foam, spray, splash) add cuối cùng</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Pipeline Sanity</h3>
    <ul class="arc-list">
      <li>Version control cache file</li>
      <li>Naming convention strict (project_shot_pass_v01)</li>
      <li>Backup important sim</li>
      <li>Document setup cho team revision</li>
    </ul>
  </div>
</section>
`,
  },

  // 06. Foil Stamping
  {
    id: "78f61764-e8b3-445d-8833-9511fb1ae4a1",
    tieu_de: "Foil Stamping",
    tieu_de_viet: "Mạ kim loại (Foil Stamping)",
    tom_tat:
      "Foil Stamping là kỹ thuật in dùng lá kim loại (foil) tạo hiệu ứng ánh kim trên bao bì, name card, book cover — phổ biến để làm nổi bật logo, tên brand luxury.",
    meta_title:
      "Foil Stamping là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Foil Stamping mạ vàng/bạc trên giấy. Tìm hiểu các loại foil, kỹ thuật cold/hot stamping và ứng dụng trong luxury packaging, branding.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nhận một invitation đám cưới cao cấp — tên cô dâu chú rể mạ vàng sáng lấp lánh, không phải printed mà bằng kim loại thật. Hoặc một book luxury với tiêu đề mạ bạc trên bìa đen. Đây là foil stamping — kỹ thuật print finishing premium nhất, tạo cảm giác cao cấp ngay từ cái nhìn đầu tiên.</p>
  <p>Foil Stamping là finishing technique quan trọng cho print designer. Hiểu các loại foil (gold, silver, holographic), kỹ thuật (hot, cold) và limitation giúp designer đề xuất finish phù hợp brand luxury — và design appropriate cho foil result đẹp.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Foil Stamping là gì?</h2>
  <p>Foil Stamping (hoặc Hot Foil Stamping) là kỹ thuật post-press dùng lá kim loại mỏng (foil) ép lên giấy/bìa bằng heated die — die nóng melt adhesive trên foil, kim loại transfer lên giấy theo shape của die. Kết quả: vùng được stamp có lớp kim loại bóng (vàng, bạc, hoặc màu khác) gắn chắc lên giấy.</p>
  <p>Khác với in mực (printing ink), foil stamping tạo metallic finish thật — phản chiếu ánh sáng như kim loại, không thể replicate bằng metallic ink. Mặc dù expensive (vì cần die custom + foil material), foil stamping là signature của luxury brand, premium product.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Hot Foil vs Cold Foil</span>
    <p><strong>Hot Foil Stamping</strong>: traditional, dùng heated die + foil — cao quality, sharp edge. Cần die custom (expensive setup). <strong>Cold Foil</strong>: dùng adhesive printed first → foil dán lên adhesive. Cheaper, fast cho large run. Quality slightly less than hot foil. Most luxury work dùng hot foil.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Die</strong> — khuôn metal được heat để stamp</li>
    <li><strong>Foil</strong> — lá kim loại mỏng có adhesive layer</li>
    <li><strong>Heat &amp; Pressure</strong> — yếu tố transfer foil</li>
    <li><strong>Registration</strong> — alignment chính xác với printed element</li>
    <li><strong>Combo Stamping</strong> — foil + emboss cùng vùng</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"foil stamping gold luxury packaging business card print"</span>
    </div>
    <p class="arc-image-caption">Foil stamping — lá kim loại transfer lên giấy tạo metallic finish</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Foil</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Gold Foil</summary>
      <div class="arc-card-body">
        <p>Phổ biến nhất cho luxury — wedding invitation, jewelry box, perfume packaging. Variations: bright gold, rose gold, antique gold, copper gold.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Silver Foil</summary>
      <div class="arc-card-body">
        <p>Modern, sophisticated. Tech brand (Apple presentation card), wedding modern. Bright silver hoặc matte silver tùy aesthetic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Holographic Foil</summary>
      <div class="arc-card-body">
        <p>Rainbow shift theo angle. Eye-catching cho marketing material, kid product, music album. Holographic pattern (random, prism, specific design).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Foil (Red, Blue, Black)</summary>
      <div class="arc-card-body">
        <p>Foil không phải metallic — chỉ là solid color with glossy finish. Smooth, high pigment. Brand-specific color.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Matte / Brushed Foil</summary>
      <div class="arc-card-body">
        <p>Metallic finish nhưng matte, brushed texture — modern minimal. Apple aesthetic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pigment Foil</summary>
      <div class="arc-card-body">
        <p>Solid color không metallic, opaque. Tự tô màu print không thấy được trên dark paper.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Foil Stamping trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Luxury Branding</h3>
    <ul class="arc-list">
      <li>Hermès, Cartier, Tiffany — gold foil logo on packaging</li>
      <li>Business card CEO/executive cao cấp</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Wedding &amp; Event</h3>
    <ul class="arc-list">
      <li>Wedding invitation — phổ biến nhất cho foil</li>
      <li>Corporate gala, charity event invitation</li>
      <li>Save the date cards</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Book Publishing</h3>
    <ul class="arc-list">
      <li>Hardcover title foil — classic novels, gift edition</li>
      <li>Children book với holographic foil cover</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Premium Packaging</h3>
    <ul class="arc-list">
      <li>Cosmetic luxury (Chanel, Dior boxes)</li>
      <li>Wine, champagne label</li>
      <li>Chocolate, candy premium</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Awards &amp; Certificate</h3>
    <ul class="arc-list">
      <li>University diploma, professional certificate</li>
      <li>Award certificate, recognition document</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Design Tips cho Foil Stamping</h2>
  <ul class="arc-list">
    <li><strong>Bold shapes work best</strong> — fine detail có thể bị mất</li>
    <li><strong>Minimum stroke 0.5mm</strong> — text/line không nên mỏng hơn</li>
    <li><strong>Avoid large solid areas</strong> — large foil area có thể uneven, bubble</li>
    <li><strong>Dark paper background</strong> — foil pops most trên dark color (black, deep navy, burgundy)</li>
    <li><strong>Registration tolerance</strong> — design phải work nếu lệch 0.5mm</li>
    <li><strong>Discuss với printer early</strong> — die expensive, không sửa được</li>
  </ul>
</section>
`,
  },

  // 07. Foley
  {
    id: "6a625472-59c9-4629-93a4-5f6b95fbbb8e",
    tieu_de: "Foley",
    tieu_de_viet: "Kỹ thuật Foley (âm thanh hiệu ứng)",
    tom_tat:
      "Foley là kỹ thuật thu âm thanh hiệu ứng trong studio bằng cách tái hiện âm thanh vật lý — bước chân, tiếng vải, tiếng va chạm — để thay thế hoặc bổ sung âm thanh gốc trong phim.",
    meta_title: "Foley là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Foley tái tạo âm thanh trong studio cho phim. Tìm hiểu foley artist, foley pit, kỹ thuật footstep, cloth movement chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem phim hành động — nghe footstep gravel cứng rõ ràng, tiếng vải áo nhân vật xoay người, ly cốc va chạm crisp. Bạn nghĩ đó là âm thanh thu trên set? Không — gần như tất cả là <strong>Foley</strong> — âm thanh tái tạo trong studio bởi Foley Artist. Đây là một trong những craft thầm lặng và sáng tạo nhất trong post-production âm thanh.</p>
  <p>Foley là chuyên môn cao cấp trong sound design. Hiểu Foley giúp video editor, sound designer biết cách work với Foley artist, và biết khi nào cần Foley (thay vì sound library). Foley vẫn là gold standard cho film quality âm thanh — không gì replace được.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Foley là gì?</h2>
  <p>Foley là kỹ thuật thu âm hiệu ứng âm thanh trong studio bằng cách tái hiện âm thanh vật lý sync với picture. Đặt tên theo <strong>Jack Foley</strong> — pioneer làm việc tại Universal Studios những năm 1920-30s, người định nghĩa kỹ thuật này. Foley Artist (còn gọi Foley Walker) performance live trước picture, tạo từng âm thanh footstep, cloth movement, prop interaction.</p>
  <p>Foley khác với sound library/SFX library: <strong>Library SFX</strong> là pre-recorded sound, dùng đi dùng lại; <strong>Foley</strong> là custom recorded cho từng cảnh, sync exact với action. Quality và character của Foley vượt trội — vì ghi specifically cho scene đó, character đó.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Tại sao cần Foley?</span>
    <p>(1) <strong>On-set audio không clean</strong> — có dialogue, wind, traffic, music. (2) <strong>Need creative control</strong> — phim cần shoe boot heavy hơn, scene phải có weight; (3) <strong>International dubbing</strong> — dialogue thay nhưng cần Foley layer trống cho phim local; (4) <strong>Quality consistency</strong> — Foley studio quality > on-set boom audio.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Foley Artist</strong> — performer tạo âm thanh</li>
    <li><strong>Foley Mixer</strong> — engineer record và mix</li>
    <li><strong>Foley Editor</strong> — sync foley với picture</li>
    <li><strong>Foley Pit</strong> — studio room với nhiều surface (gravel, wood, tile)</li>
    <li><strong>Props</strong> — đồ vật để tạo âm thanh (shoes, fabric, glasses)</li>
    <li><strong>3 Categories</strong>: Footsteps, Movements (cloth), Props (objects)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"foley artist studio footstep movement film sound design"</span>
    </div>
    <p class="arc-image-caption">Foley artist trong studio — tái tạo footstep, cloth, prop sound sync picture</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>3 Categories của Foley</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Footsteps</summary>
      <div class="arc-card-body">
        <p>Phổ biến nhất — mỗi character mỗi shoe khác nhau, surface khác nhau. Foley pit có nhiều surface: wood floor, concrete, gravel, grass, snow, tile. Artist với shoes match character.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Movements (Cloth)</summary>
      <div class="arc-card-body">
        <p>Tiếng vải mỗi khi character di chuyển — leather jacket creak, silk dress whisper, denim rub. Subtle nhưng critical cho realism. Foley artist mặc loại vải phù hợp character.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Props (Objects)</summary>
      <div class="arc-card-body">
        <p>Tương tác với object — door open, glass clink, paper rustle, key jingle, gun rattle. Studio có hàng nghìn prop available. Artist creative với household item — celery break = bone snap.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Foley Production</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Spotting Session</h3>
    <ul class="arc-list">
      <li>Foley editor + supervisor watch picture</li>
      <li>Mark mỗi moment cần foley — footstep, cloth, prop</li>
      <li>Create &quot;cue sheet&quot; cho session</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Studio Prep</h3>
    <ul class="arc-list">
      <li>Setup mics — typically close-mic shotgun</li>
      <li>Prepare props, costumes</li>
      <li>Picture playback on monitor</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Recording Session</h3>
    <ul class="arc-list">
      <li>Foley artist watch picture, perform sync</li>
      <li>Multiple takes per scene cho choice</li>
      <li>Each character recorded separately</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Editing</h3>
    <ul class="arc-list">
      <li>Foley editor sync exact với picture frame</li>
      <li>Clean noise, trim</li>
      <li>Organize tracks (footsteps, cloth, props separated)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Mix</h3>
    <ul class="arc-list">
      <li>Rerecording mixer integrate foley vào final mix</li>
      <li>EQ, level, panning cho integration với dialogue, music, SFX</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Foley Tricks &amp; Famous Tools</h2>
  <ul class="arc-list">
    <li><strong>Celery</strong> — break = bone snap (horror, fight scene)</li>
    <li><strong>Coconut shells</strong> — horse galloping (Monty Python iconic)</li>
    <li><strong>Cornstarch in leather pouch</strong> — snow crunch</li>
    <li><strong>Wet cabbage</strong> — body impact, gore sound</li>
    <li><strong>Crumpled tape</strong> — fire crackle</li>
    <li><strong>Boxing gloves on watermelon</strong> — punch impact</li>
    <li><strong>Cherry tomatoes thrown</strong> — explosion gore</li>
  </ul>
</section>
`,
  },

  // 08. Fonts
  {
    id: "2d72d884-2a2e-4f20-a93b-c908e2433634",
    tieu_de: "Fonts",
    tieu_de_viet: "Phông chữ (Fonts)",
    tom_tat:
      "Fonts là file chứa dữ liệu typeface để hiển thị text trên màn hình và in ấn. Lựa chọn font là quyết định quan trọng trong design — ảnh hưởng đến tính cách thương hiệu và khả năng đọc.",
    meta_title: "Fonts là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Fonts là file typeface cho design. Tìm hiểu font categories, license và cách chọn font phù hợp cho branding, web, print design.",
    noi_dung: `
<section class="arc-intro">
  <p>Cùng một message &quot;Hello&quot; viết bằng <strong>Helvetica</strong> → corporate, modern. Bằng <strong>Comic Sans</strong> → casual, không serious. Bằng <strong>Times New Roman</strong> → traditional, formal. Font không chỉ chứa chữ — nó chứa <strong>cảm xúc</strong>, <strong>tính cách</strong>, <strong>thông điệp ngầm</strong>. Đây là tại sao font selection là một trong những quyết định quan trọng nhất của designer.</p>
  <p>Fonts là kiến thức cơ bản cho mọi designer — graphic, web, motion. Hiểu font categories, anatomy, pairing và license giúp designer chọn font professional — bước nền cho mọi typography work.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Fonts là gì?</h2>
  <p>Font là file dữ liệu chứa thiết kế của một typeface (kiểu chữ) — bao gồm tất cả các ký tự (a-z, A-Z, 0-9, dấu câu, symbol), cùng với metadata: tên, weight, style, kerning data. Khi bạn install font vào máy, OS biết cách render text với typeface đó. Format phổ biến: <strong>OTF (OpenType)</strong>, <strong>TTF (TrueType)</strong>, <strong>WOFF/WOFF2</strong> (web fonts).</p>
  <p>Một &quot;typeface&quot; thường có nhiều &quot;fonts&quot; — vd Helvetica typeface có nhiều fonts: Helvetica Regular, Helvetica Bold, Helvetica Italic, Helvetica Light, Helvetica Condensed. Tổng thể của một typeface gọi là &quot;font family&quot;. &quot;Variable Font&quot; modern chứa nhiều variant trong một file (weight, width, slant slider).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Font vs Typeface — phân biệt</span>
    <p>Technical: <strong>Typeface</strong> = design (Helvetica, Arial). <strong>Font</strong> = file cụ thể (Helvetica Bold 12pt). Casually người ta dùng &quot;font&quot; cho cả hai. Trong industry, designer dùng &quot;typeface&quot; chính xác hơn.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Serif</strong> — có chân ở cuối stroke (Times, Garamond)</li>
    <li><strong>Sans-Serif</strong> — không chân (Helvetica, Arial, Inter)</li>
    <li><strong>Slab Serif</strong> — chân vuông đậm (Rockwell, Roboto Slab)</li>
    <li><strong>Script</strong> — viết tay (Brush Script, Pacifico)</li>
    <li><strong>Display</strong> — decorative, dùng cho heading lớn</li>
    <li><strong>Monospace</strong> — mọi character cùng width (Courier, Fira Code)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"typography fonts serif sans-serif categories examples"</span>
    </div>
    <p class="arc-image-caption">Font categories — Serif, Sans-serif, Script, Display, Monospace</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Font Categories</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Serif</summary>
      <div class="arc-card-body">
        <p>Truyền thống, có chân. Dễ đọc trong long text (book, newspaper). Examples: <strong>Times New Roman, Garamond, Caslon, Georgia, Merriweather</strong>. Cảm giác: classic, authoritative, trustworthy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sans-Serif</summary>
      <div class="arc-card-body">
        <p>Modern, clean, không chân. Phổ biến nhất hiện đại — UI, branding tech. Examples: <strong>Helvetica, Arial, Inter, Roboto, Open Sans, Montserrat</strong>. Cảm giác: modern, neutral, friendly.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Slab Serif</summary>
      <div class="arc-card-body">
        <p>Serif với chân vuông, đậm. Bold, impactful. Examples: <strong>Rockwell, Roboto Slab, Arvo, Museo Slab</strong>. Cảm giác: confident, modern-vintage.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Script</summary>
      <div class="arc-card-body">
        <p>Mô phỏng chữ viết tay. Calligraphy hoặc casual handwriting. Examples: <strong>Brush Script, Pacifico, Great Vibes, Lobster, Dancing Script</strong>. Cảm giác: personal, elegant, casual (tùy style).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Display / Decorative</summary>
      <div class="arc-card-body">
        <p>Decorative, dùng cho heading lớn, logo. Không dùng cho body text. Examples: <strong>Bebas Neue, Anton, Impact, Lobster, Permanent Marker</strong>. Cảm giác: bold, attention-grabbing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Monospace</summary>
      <div class="arc-card-body">
        <p>Mọi character cùng width — for code, technical. Examples: <strong>Courier, Fira Code, JetBrains Mono, Source Code Pro, IBM Plex Mono</strong>. Cảm giác: technical, mechanical.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Font License &amp; Sources</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Free Sources</h3>
    <ul class="arc-list">
      <li><strong>Google Fonts</strong> — 1,500+ font free, web + desktop OK</li>
      <li><strong>Adobe Fonts</strong> — bao gồm trong Creative Cloud subscription</li>
      <li><strong>Font Squirrel</strong> — curated free font commercial-OK</li>
      <li><strong>1001fonts.com</strong> — đa dạng nhưng careful license</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Premium Sources</h3>
    <ul class="arc-list">
      <li><strong>MyFonts</strong> — biggest commercial library</li>
      <li><strong>Fonts.com (Monotype)</strong> — classic typefaces</li>
      <li><strong>Type Network</strong> — indie type foundries</li>
      <li><strong>Hoefler &amp; Co</strong> — premium quality</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">License Types</h3>
    <ul class="arc-list">
      <li><strong>Desktop</strong> — install trên máy, print design</li>
      <li><strong>Web</strong> — embed vào website (CSS @font-face)</li>
      <li><strong>App</strong> — embed trong mobile app</li>
      <li><strong>Broadcast</strong> — video commercial, TV</li>
      <li>Mỗi license type charge khác nhau!</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Open Source Fonts</h3>
    <ul class="arc-list">
      <li><strong>SIL Open Font License (OFL)</strong> — most permissive</li>
      <li>Most Google Fonts là OFL</li>
      <li>Use commercial mà không cần pay royalty</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips chọn Fonts</h2>
  <ul class="arc-list">
    <li><strong>Max 2-3 fonts trong một design</strong> — quá nhiều = chaos</li>
    <li><strong>Pair contrast</strong> — serif + sans-serif tốt; 2 similar serif khó</li>
    <li><strong>Heading vs body</strong> — heading display font; body cần readable sans-serif/serif</li>
    <li><strong>Test trên target medium</strong> — print vs web khác biệt</li>
    <li><strong>Hierarchy bằng weight/size</strong> — không chỉ font khác</li>
    <li><strong>Brand consistency</strong> — establish font system cho brand</li>
  </ul>
</section>
`,
  },

  // 09. Footage
  {
    id: "d65e9483-94fb-4ee6-a5ae-a2775cd6b26d",
    tieu_de: "Footage",
    tieu_de_viet: "Tư liệu video (Footage)",
    tom_tat:
      "Footage là chất liệu video thô — quay thật, stock footage, hoặc render 3D — nguyên liệu đầu vào của quá trình dựng phim và compositing. Quản lý footage hiệu quả là kỹ năng cơ bản của editor.",
    meta_title: "Footage là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Footage là video raw cho editing. Tìm hiểu stock footage, organize workflow và best practice quản lý footage trong project lớn.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn editor — nhận 500GB footage từ DP cho doc film 90 phút. Hàng nghìn clip, hàng trăm interview, B-roll. Làm sao biết clip nào ở đâu? Footage management là một trong những kỹ năng quan trọng nhất nhưng ít được teach của editor. Project lớn fail vì footage chaos chứ không phải vì editor không creative.</p>
  <p>Footage management là kỹ năng cơ bản cho mọi video editor, motion designer. Hiểu cách organize, label, tag footage giúp workflow efficient — đặc biệt cho project lớn, long-form, hoặc team collaboration.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Footage là gì?</h2>
  <p>Footage là chất liệu video thô (raw video material) chưa qua chỉnh sửa cuối cùng. Có thể từ nhiều nguồn: <strong>Original footage</strong> (quay thật bằng camera), <strong>Stock footage</strong> (mua từ thư viện như Shutterstock, Pond5), <strong>Archive footage</strong> (video lịch sử, từ archive như Getty), <strong>3D rendered footage</strong> (output từ Maya, Houdini, Cinema 4D). Đây là nguyên liệu đầu vào cho post-production.</p>
  <p>Footage có nhiều format: RAW (RED, ARRI, BlackmagicRAW), ProRes, DNxHR, H.264, H.265. Quality và workflow phụ thuộc format — RAW lớn nhưng flexible, H.264 nhỏ nhưng compressed. Modern workflow thường dùng <strong>proxy</strong> — low-res copy của footage cho editing nhanh, link back to high-res cho final render.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">A-roll vs B-roll</span>
    <p><strong>A-roll</strong>: footage chính — interview, dialogue, action chính. <strong>B-roll</strong>: footage hỗ trợ — cutaway, illustration. Editor cut B-roll over A-roll cho variety, cover edit, hide jump cut. Tỷ lệ B-roll: A-roll thường 2:1 hoặc 3:1 trong doc.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Source Media</strong> — file gốc</li>
    <li><strong>Proxy</strong> — low-res copy cho editing performance</li>
    <li><strong>Metadata</strong> — date, camera, scene, take info</li>
    <li><strong>Bin / Folder</strong> — organize trong NLE</li>
    <li><strong>Marker / Tag</strong> — mark moment cụ thể trong clip</li>
    <li><strong>Selects</strong> — best take selected từ raw footage</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"footage organization premiere bin folder structure"</span>
    </div>
    <p class="arc-image-caption">Footage organization — bin structure, naming convention cho editing efficient</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Loại Footage Sources</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Original Footage</summary>
      <div class="arc-card-body">
        <p>Quay thật cho project. Quality control nhất, nhưng expensive — camera, crew, location. Cinema camera (ARRI, RED) hoặc mirrorless (Sony, Canon, Panasonic). Phim feature 90% original.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stock Footage</summary>
      <div class="arc-card-body">
        <p>Mua từ thư viện. Cheap so với quay riêng. Marketplace: <strong>Shutterstock, Pond5, Adobe Stock, Storyblocks</strong>. Free: <strong>Pexels, Pixabay, Mixkit</strong>. Phù hợp B-roll, establishing shot, abstract.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Archive Footage</summary>
      <div class="arc-card-body">
        <p>Video lịch sử, historical clip. Source: <strong>Getty Images, AP Archive, BBC Archive</strong>. License expensive cho commercial. Cần cho doc historical, biography.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D Rendered Footage</summary>
      <div class="arc-card-body">
        <p>Output từ 3D software — Maya, Houdini, Cinema 4D. Format: EXR sequence (high quality), ProRes (intermediate). Cho VFX, motion graphics, animated content.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Screen Recording</summary>
      <div class="arc-card-body">
        <p>Recording màn hình computer/phone. Cho tutorial, software demo. Tool: ScreenFlow, Camtasia, OBS. Format MP4 H.264.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Drone / Aerial Footage</summary>
      <div class="arc-card-body">
        <p>Quay từ trên cao. Establishing shot tuyệt vời. DJI series phổ biến. Format ProRes hoặc H.264.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Footage Management Best Practices</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Folder Structure</h3>
    <ul class="arc-list">
      <li>Project root: /Project_Name/</li>
      <li>Subfolders: /Footage/, /Audio/, /Stills/, /Project_Files/, /Exports/</li>
      <li>Footage subfolder by date hoặc scene: /Day1_2024-01-15/Cam_A/</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Naming Convention</h3>
    <ul class="arc-list">
      <li>Stick với camera default naming, ADD context: A001_C001_INT_Lobby</li>
      <li>Consistent across project — easy to find</li>
      <li>Avoid space, special character cho cross-platform</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Backup &amp; Storage</h3>
    <ul class="arc-list">
      <li>3-2-1 rule: 3 copies, 2 different media, 1 offsite</li>
      <li>RAID drive cho work, backup external + cloud</li>
      <li>Never delete original sau editing — keep for re-edit, archive</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">In NLE (Premiere/Resolve/FCP)</h3>
    <ul class="arc-list">
      <li>Bin structure mirror folder structure</li>
      <li>Color label clips: green = good, red = NG</li>
      <li>Marker với note cho key moment</li>
      <li>Selects sequence cho best take</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Proxy Workflow</h3>
    <ul class="arc-list">
      <li>4K/RAW = create proxy ProRes 1080p</li>
      <li>Edit với proxy, swap về full-res cho final export</li>
      <li>Saves disk space và edit performance significant</li>
    </ul>
  </div>
</section>
`,
  },

  // 10. FPS
  {
    id: "dc8cc964-3c98-4417-be41-f7ea87dfcbf4",
    tieu_de: "FPS (Frames Per Second)",
    tieu_de_viet: "FPS — Khung hình trên giây",
    tom_tat:
      "FPS (Frames Per Second) là chỉ số đo số lượng khung hình trong một giây. Trong video: 24fps (cinema), 30/60fps (web/sports). Trong game: 30fps (console), 60+fps (PC), 120+fps (esports).",
    meta_title: "FPS là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "FPS đo frames per second cho video, game. Tìm hiểu 24fps cinematic, 60fps smooth, motion blur và cách chọn FPS phù hợp project.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem phim ở rạp — &quot;cinematic&quot; cảm giác. Watch sport trên TV — smooth, fluid. Play game online — phải 60fps trở lên mới competitive. Cùng là &quot;moving image&quot; nhưng FPS khác làm experience hoàn toàn khác. Đây là một trong những technical concept quan trọng nhất cho video maker, game developer, motion designer.</p>
  <p>FPS là kiến thức cơ bản cho mọi visual media creator. Hiểu các FPS standard (24, 30, 60, 120), khi nào dùng cái nào, và cách FPS ảnh hưởng aesthetic giúp chọn đúng cho project — không chỉ default 30fps.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>FPS là gì?</h2>
  <p>FPS (Frames Per Second) là số lượng khung hình hiển thị trong một giây. Mắt người perceive motion khi FPS &gt; 10 — dưới đó là slideshow. Standard: <strong>24fps</strong> (cinema, từ 1920s), <strong>25fps</strong> (PAL TV Europe), <strong>30fps</strong> (NTSC TV US, web video), <strong>50/60fps</strong> (sports broadcasting, smooth web), <strong>120fps+</strong> (gaming, high-end display, slow-mo source).</p>
  <p>FPS ảnh hưởng <strong>aesthetic</strong> và <strong>performance</strong>: 24fps có &quot;cinematic motion blur&quot; quen thuộc trong phim; 60fps smooth như &quot;TV soap opera&quot; effect — đẹp cho game/sport, không cinematic. Higher FPS = smoother nhưng require nhiều data, processing power.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Tại sao 24fps là &quot;cinematic&quot;?</span>
    <p>Lịch sử: 24fps là minimum FPS với sound sync trên film stock 1920s — chosen cho balance quality vs film cost. Đã trở thành chuẩn cinema 100 năm. Brain &quot;learned&quot; rằng 24fps motion = phim. Tăng lên 48fps (Hobbit film) viewers thấy &quot;quá smooth&quot;, &quot;không như phim&quot; — vì psychologically conditioned.</p>
  </div>

  <ul class="arc-list">
    <li><strong>24fps</strong> — cinema, film aesthetic</li>
    <li><strong>25fps</strong> — PAL TV Europe</li>
    <li><strong>30fps</strong> — NTSC TV US, web standard</li>
    <li><strong>60fps</strong> — smooth web, gaming, sports</li>
    <li><strong>120fps+</strong> — competitive gaming, high refresh display</li>
    <li><strong>240+fps</strong> — slow motion source</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"fps frames per second 24 60 120 cinema gaming comparison"</span>
    </div>
    <p class="arc-image-caption">FPS comparison — 24fps cinematic vs 60fps smooth vs 120fps gaming</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>FPS trong từng lĩnh vực</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Cinema / Film — 24fps</summary>
      <div class="arc-card-body">
        <p>Standard từ 1920s. Hobbit (Peter Jackson 2012) thử 48fps — controversial. Avatar 2 mix 24-48fps cho effect. Nhưng 24fps vẫn dominant cho feature film.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>TV Broadcasting — 25/29.97fps</summary>
      <div class="arc-card-body">
        <p>PAL (Europe) 25fps, NTSC (Americas) 29.97fps. Truyền hình historical. Modern TV channel có thể 50/60fps cho sports, smooth news.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Web Video — 30/60fps</summary>
      <div class="arc-card-body">
        <p>YouTube, social media chuẩn 30fps. 60fps cho gaming, sport channel. Vlog 30fps phổ biến. Cinematic content vẫn 24fps trên web.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Gaming Console — 30/60fps</summary>
      <div class="arc-card-body">
        <p>PS5/Xbox Series X target 60fps cho performance mode, 30fps cho quality mode. Older console mostly 30fps. Switch nhiều game 30fps.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Gaming PC — 60-360fps</summary>
      <div class="arc-card-body">
        <p>Casual: 60fps. Competitive: 144-240fps. Esports pro: 360fps display. Higher FPS = lower latency, competitive advantage.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Slow Motion Source — 120-1000fps</summary>
      <div class="arc-card-body">
        <p>Quay 120-240fps, play 24fps = slow motion 5-10x. Phantom camera quay 1000-10,000fps cho extreme slow-mo. Camera DSLR/mirrorless modern thường 120fps available.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Chọn FPS cho Project</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Feature Film / Short Film</h3>
    <ul class="arc-list">
      <li>24fps cinema standard</li>
      <li>Slow motion shot quay 60-120fps, conform 24fps</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Documentary</h3>
    <ul class="arc-list">
      <li>24fps cinematic feel</li>
      <li>Hoặc 30fps cho news/journalism style</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Commercial / Music Video</h3>
    <ul class="arc-list">
      <li>24fps cho cinematic high-end</li>
      <li>30/60fps cho social media, energetic content</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">YouTube Vlog</h3>
    <ul class="arc-list">
      <li>30fps standard</li>
      <li>60fps cho action, sport channel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Sports Broadcasting</h3>
    <ul class="arc-list">
      <li>50/60fps minimum cho fluid motion</li>
      <li>Esports 144fps+</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Development</h3>
    <ul class="arc-list">
      <li>Target frame rate based on platform</li>
      <li>VR mandatory 90fps cho comfort</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips về FPS</h2>
  <ul class="arc-list">
    <li><strong>Shutter Speed Rule</strong> — shutter speed = 1/(2×FPS). 24fps = 1/48s shutter cho motion blur natural</li>
    <li><strong>Mixed FPS dangerous</strong> — không mix 24fps và 30fps trong cùng project unless intentional</li>
    <li><strong>VR cần high FPS</strong> — 90fps minimum, dưới đó cause motion sickness</li>
    <li><strong>Variable FPS in modern game</strong> — adaptive sync (G-Sync, FreeSync) cho smooth visual</li>
    <li><strong>FPS không = quality</strong> — 4K 24fps có thể đẹp hơn 1080p 60fps tùy use case</li>
    <li><strong>Slow-mo: shoot high, play normal</strong> — quay 60fps, conform 24fps = 2.5x slow</li>
  </ul>
</section>
`,
  },
];

console.log(`\n── Bắt đầu chạy ${items.length} bài keyword đợt 1.10 ──\n`);

const results: { tieu_de: string; do_dai?: number; error?: string }[] = [];

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
    ) as { do_dai?: string | number; tieu_de?: string } | undefined;
    const doDai =
      typeof row?.do_dai === "string" ? Number(row.do_dai) : row?.do_dai;
    if (typeof doDai === "number" && doDai > 800) {
      console.log(`✓ ${it.tieu_de} — ${doDai} ký tự`);
      results.push({ tieu_de: it.tieu_de, do_dai: doDai });
    } else {
      console.log(`⚠ ${it.tieu_de} — do_dai = ${doDai} (cần > 800)`);
      results.push({ tieu_de: it.tieu_de, do_dai: doDai, error: "too_short" });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`✗ ${it.tieu_de} — ${msg}`);
    results.push({ tieu_de: it.tieu_de, error: msg });
  }
}

const remain = await runAdminSql(
  `SELECT COUNT(*) AS con_lai_dot1
FROM article_bai_viet
WHERE loai_bai_viet = 'keyword'
  AND (noi_dung IS NULL OR noi_dung = '')
  AND tieu_de < 'I'`,
  "read",
);
const conLai = remain.rows?.[0]?.con_lai_dot1;

console.log(`\nCòn lại đợt 1: ${conLai} bài.`);
