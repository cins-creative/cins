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
  // 01. Modeling
  {
    id: "47f22540-555c-4ffa-97a4-4c37616858e0",
    tieu_de: "Modeling (3D)",
    tieu_de_viet: "Tạo mô hình 3D (Modeling)",
    tom_tat:
      "Modeling là quá trình tạo đối tượng 3D bằng cách xây dựng hình học — polygon modeling, sculpting, NURBS, procedural — bước đầu tiên trong pipeline 3D cho mọi loại project.",
    meta_title:
      "Modeling 3D là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Modeling 3D là building block của 3D pipeline. Tìm hiểu polygon, sculpting, NURBS, procedural modeling và workflow chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Mỗi character trong game, mỗi vehicle trong film, mỗi product trong commercial 3D — bắt đầu từ <strong>modeling</strong>. Artist building shape 3D từ scratch — block primitive, extrude, sculpt detail. Modeling là bước đầu tiên của 3D pipeline — không có model = không có asset cho texture, rig, animate, render.</p>
  <p>3D Modeling là kỹ năng foundation cho mọi 3D artist. Hiểu các phương pháp modeling khác nhau — polygon, sculpting, NURBS, procedural — và biết khi nào dùng cái nào giúp tạo asset hiệu quả, fit purpose cho game, film, hoặc viz.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Modeling là gì?</h2>
  <p>3D Modeling là quá trình <strong>tạo geometric representation</strong> của object trong không gian 3D — buildings, character, vehicle, prop, environment. Output là <strong>mesh</strong> (vertex + edge + polygon) hoặc curves (NURBS) defining shape. Modeling là first step trong 3D pipeline trước khi texture, rig, animate, render.</p>
  <p>Multiple approach: <strong>Polygon Modeling</strong> (modify mesh directly), <strong>Sculpting</strong> (clay-like push/pull), <strong>NURBS</strong> (mathematical curves), <strong>Procedural</strong> (rule-based generation), <strong>Photogrammetry</strong> (3D from photos). Modeler choose method based on object type và project requirement.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Modeler Specialization</span>
    <p>3D modeling là broad — many specialization: <strong>Character Modeler</strong> (organic character), <strong>Environment Modeler</strong> (building, terrain), <strong>Hard Surface Modeler</strong> (vehicle, weapon, robot), <strong>Prop Modeler</strong> (small objects). Each has different software, technique preference. Career path narrow as senior.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Polygon Modeling</strong> — direct mesh manipulation</li>
    <li><strong>Box Modeling</strong> — start với cube, extrude</li>
    <li><strong>Sculpting</strong> — high-detail, organic (ZBrush)</li>
    <li><strong>NURBS</strong> — mathematical surface</li>
    <li><strong>Subdivision Surface</strong> — smooth low-poly</li>
    <li><strong>Procedural</strong> — Houdini, parametric</li>
    <li><strong>Photogrammetry</strong> — from real photos</li>
    <li><strong>Retopology</strong> — clean topology from sculpt</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"3D modeling polygon character sculpting maya blender zbrush"</span>
    </div>
    <p class="arc-image-caption">3D Modeling — tạo geometric representation, first step 3D pipeline</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Phương pháp Modeling</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Box Modeling</summary>
      <div class="arc-card-body">
        <p>Start với primitive (cube, sphere). Extrude, scale, bevel để build complex form. Hard surface (vehicle, building), character standard approach. Maya, Blender, 3ds Max.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Edge Modeling / Quad Draw</summary>
      <div class="arc-card-body">
        <p>Draw edge directly trên reference. Build mesh edge-by-edge với perfect topology. Slower nhưng precise. Critical cho character face retopology.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sculpting</summary>
      <div class="arc-card-body">
        <p>ZBrush, Mudbox, Blender Sculpt. Clay-like push/pull. Million polygon for detail. Best cho organic — character, creature, terrain. Output retopologized cho production.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>NURBS Modeling</summary>
      <div class="arc-card-body">
        <p>Non-Uniform Rational B-Splines. Mathematical surface, perfect smooth. Automotive, industrial design. Maya NURBS, Rhino. Less common modern character.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Procedural Modeling</summary>
      <div class="arc-card-body">
        <p>Houdini, Geometry Nodes Blender. Rule-based generation. Cities, foliage, fractal. Parametric — change parameter regenerate. Non-destructive workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>CAD Modeling</summary>
      <div class="arc-card-body">
        <p>SolidWorks, Fusion 360, Rhino. Engineering precision. Product design, mechanical. Export to render software cho viz.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photogrammetry</summary>
      <div class="arc-card-body">
        <p>Multiple photos → 3D model. RealityCapture, Metashape. Real-world object scan. Quixel Megascans uses photogrammetry.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Kitbashing</summary>
      <div class="arc-card-body">
        <p>Combine pre-made parts. Kitbash3D library. Quick complex design — sci-fi, mech.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Modeling cho Different Use Case</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Character (Real-time)</h3>
    <ul class="arc-list">
      <li>10K-50K poly typical</li>
      <li>Clean topology cho deformation</li>
      <li>Bake high-poly detail to normal map</li>
      <li>ZBrush sculpt + Maya retopo workflow</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Film Character (Hero)</h3>
    <ul class="arc-list">
      <li>100K-1M+ poly</li>
      <li>Subdivision surface for smoothness</li>
      <li>Displacement map for fine detail</li>
      <li>Hours-long render</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Architectural Viz</h3>
    <ul class="arc-list">
      <li>Building accurate dimension</li>
      <li>NURBS or polygon</li>
      <li>SketchUp, Revit, 3ds Max common</li>
      <li>Photorealistic render goal</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Product Visualization</h3>
    <ul class="arc-list">
      <li>Hard-surface accuracy</li>
      <li>Smooth NURBS surface preferred</li>
      <li>Material detail critical</li>
      <li>Studio lighting render</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VR/AR Asset</h3>
    <ul class="arc-list">
      <li>Lower poly than standard game</li>
      <li>90fps requirement = aggressive optimization</li>
      <li>LOD important</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D Printing</h3>
    <ul class="arc-list">
      <li>Manifold mesh (watertight)</li>
      <li>No floating geometry</li>
      <li>Wall thickness consideration</li>
      <li>Export STL</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Software &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Maya</strong> — film industry standard, character modeling</li>
    <li><strong>Blender</strong> — free, all-in-one, popular indie</li>
    <li><strong>3ds Max</strong> — game industry, arch viz</li>
    <li><strong>ZBrush</strong> — sculpting standard</li>
    <li><strong>Cinema 4D</strong> — motion graphics, design</li>
    <li><strong>Houdini</strong> — procedural, VFX</li>
    <li><strong>Modo</strong> — polygon modeling specialty</li>
    <li><strong>Career path</strong>: Junior Modeler $50K → Senior Modeler $80K → Lead $100K+ → Modeling Supervisor $130K+</li>
    <li><strong>Studios hiring</strong>: ILM, Pixar, Disney, MPC, DNEG, Weta, EA, Ubisoft</li>
  </ul>
</section>
`,
  },

  // 02. Modelsheet
  {
    id: "c6cca9e5-8d64-4a2f-abee-0e785f87acb5",
    tieu_de: "Modelsheet",
    tieu_de_viet: "Bảng quy chuẩn nhân vật (Modelsheet)",
    tom_tat:
      "Modelsheet là tài liệu tham chiếu chính thức cho character hoặc prop — thể hiện từ nhiều góc độ với kích thước, tỉ lệ chuẩn — đảm bảo tất cả họa sĩ vẽ nhất quán.",
    meta_title:
      "Modelsheet là gì? Ý nghĩa và ứng dụng trong animation | CINS",
    meta_description:
      "Modelsheet đảm bảo character consistency. Tìm hiểu các view chuẩn, color script và workflow tạo modelsheet chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Disney animation production có 100+ animator vẽ cùng một character. Làm sao mỗi animator vẽ Mickey Mouse đúng tỉ lệ, đúng style? Answer: <strong>modelsheet</strong> — official reference document defining character&apos;s exact proportion, design, expression. Bible cho mọi artist trong production. Không có modelsheet = character look different mỗi cảnh.</p>
  <p>Modelsheet là deliverable critical từ character designer. Hiểu cấu trúc modelsheet và best practice giúp character design clear, communicable cho team — đảm bảo consistency cross episode/scene/season trong animation production.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Modelsheet là gì?</h2>
  <p>Modelsheet là <strong>tài liệu tham chiếu chính thức</strong> của character (hoặc prop) trong animation production — show character từ <strong>multiple angle</strong> (front, side, 3/4, back), với <strong>proportion guide</strong> (head height units, measurement), <strong>expression sheet</strong> (mood variations), và <strong>color sheet</strong> (palette). Approved bởi creative director, locked → mọi artist follow.</p>
  <p>Multiple sheets per character thường: <strong>Turnaround Sheet</strong> (rotation views), <strong>Expression Sheet</strong> (happy, sad, angry, surprised), <strong>Action Pose Sheet</strong> (movement examples), <strong>Color Sheet</strong> (skin, hair, costume), <strong>Construction Sheet</strong> (skeleton, head shape breakdown). Lighting reference modelsheet cũng có for 3D character.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Modelsheet vs Character Design vs Concept Art</span>
    <p><strong>Concept Art</strong>: exploratory, mood-driven. Multiple options. <strong>Character Design</strong>: refined version, single direction. <strong>Modelsheet</strong>: finalized, technical, multi-view reference cho production. Last step before animation begin.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Turnaround</strong> — multiple angle (3, 5, 7 views)</li>
    <li><strong>Proportion Guide</strong> — head height measurement</li>
    <li><strong>Expression Sheet</strong> — mood variations</li>
    <li><strong>Construction</strong> — skeleton, breakdown shape</li>
    <li><strong>Color Sheet</strong> — palette specific</li>
    <li><strong>Action Pose</strong> — character in movement</li>
    <li><strong>Costume Variation</strong> — outfits</li>
    <li><strong>Comparison Chart</strong> — height vs other character</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"modelsheet character design turnaround animation reference Disney"</span>
    </div>
    <p class="arc-image-caption">Modelsheet — official reference đảm bảo character consistent across production</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Modelsheet</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Turnaround Sheet</summary>
      <div class="arc-card-body">
        <p>Show character từ multiple angle — front, 3/4 front, side, 3/4 back, back. 5-8 view typically. Proportion line guide horizontal. Reference cho 3D modeler build mesh.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Expression Sheet</summary>
      <div class="arc-card-body">
        <p>Same character with different emotion — happy, sad, angry, surprised, fear, neutral. 6-12 expression. Define character&apos;s emotional range.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Construction / Anatomy Sheet</summary>
      <div class="arc-card-body">
        <p>Underlying structure — skeleton, head construction, simplified shape (cylinder limb). Help animator draw correct 3D form.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Sheet</summary>
      <div class="arc-card-body">
        <p>Color palette — skin, hair, eye, clothing. Hex/RGB values. Color script for different scene (day, night, sunset).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Action Pose Sheet</summary>
      <div class="arc-card-body">
        <p>Character in different action — walking, running, jumping, throwing. Demonstrate character&apos;s physical capability, weight, energy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Costume Sheet</summary>
      <div class="arc-card-body">
        <p>If character has multiple outfits — casual, formal, action gear. Detail of clothing pattern, accessory.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Comparison Chart</summary>
      <div class="arc-card-body">
        <p>Character lined up side-by-side. Height comparison. Visual hierarchy cast — main character, supporting, antagonist.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Tạo Modelsheet</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Character Design Approval</h3>
    <ul class="arc-list">
      <li>Design finalized (1 chosen from concepts)</li>
      <li>Director, creative lead sign off</li>
      <li>Locked design — không changes after this</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Turnaround Drawing</h3>
    <ul class="arc-list">
      <li>Front view first as foundation</li>
      <li>Side view next</li>
      <li>3/4 views derived</li>
      <li>Back view</li>
      <li>Maintain proportion across views</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Proportion Lines</h3>
    <ul class="arc-list">
      <li>Horizontal guide lines — head top, eye level, chin, shoulder, waist, knee, ankle</li>
      <li>Measure in &quot;heads&quot; (character is 7 heads tall)</li>
      <li>Consistent across all view</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Expression Sheet</h3>
    <ul class="arc-list">
      <li>Define emotional range</li>
      <li>Same head turn, different expression</li>
      <li>Label each emotion</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Color Definition</h3>
    <ul class="arc-list">
      <li>Final color palette</li>
      <li>Color swatches with hex values</li>
      <li>Lighting variation (day, night)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Annotation</h3>
    <ul class="arc-list">
      <li>Notes về character — voice direction, personality</li>
      <li>Do&apos;s and Don&apos;ts</li>
      <li>Common mistake to avoid</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Distribution</h3>
    <ul class="arc-list">
      <li>PDF cho team member</li>
      <li>Print poster trong studio</li>
      <li>Reference accessible all production</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Best Practices &amp; Use Cases</h2>
  <ul class="arc-list">
    <li><strong>Clarity above all</strong> — modelsheet purpose is communicate, not artistic show-off</li>
    <li><strong>Consistent line weight</strong> — clean, technical look</li>
    <li><strong>Annotate everything</strong> — assume reader doesn&apos;t know character</li>
    <li><strong>Don&apos;t omit back view</strong> — animator need it</li>
    <li><strong>Show character&apos;s soul</strong> — pose có life, không stiff</li>
    <li><strong>Iterate với team feedback</strong> — animator catch issue</li>
    <li><strong>2D animation</strong>: traditional turnaround essential</li>
    <li><strong>3D animation</strong>: turnaround help modeler. Less critical post-modeling</li>
    <li><strong>Game development</strong>: concept art + technical sheet together</li>
    <li><strong>Studios</strong>: Disney, Pixar, DreamWorks, Studio Ghibli all use extensively</li>
  </ul>
</section>
`,
  },

  // 03. Mograph
  {
    id: "1f79d6d8-d1fd-4a20-bc78-0a700965fc2f",
    tieu_de: "Mograph (Cinema 4D)",
    tieu_de_viet: "Mograph trong Cinema 4D",
    tom_tat:
      "Mograph là hệ thống trong Cinema 4D cho phép nhân bản và animate hàng loạt đối tượng với hiệu ứng phức tạp — Cloner, Effector, MoText — foundation của motion graphics 3D modern.",
    meta_title:
      "Mograph là gì? Ý nghĩa và ứng dụng trong motion graphics | CINS",
    meta_description:
      "Mograph Cinema 4D là engine motion graphics. Tìm hiểu Cloner, Effector, Fields và workflow tạo animation phức tạp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Apple ad — 1000 sphere bounce trên grid pattern. Netflix series intro — text reveal với complex distortion. Brand reel Mograph artist — particles dance theo music. Tất cả powered by <strong>Mograph</strong> trong Cinema 4D — feature set revolutionizing motion graphics từ 2007. Mograph cho phép artist tạo complex animation với thousand object trong vài click — impossible với traditional keyframe.</p>
  <p>Mograph là essential skill cho motion designer Cinema 4D. Hiểu Cloner, Effector, MoSpline và Fields system giúp tạo animation impressive nhanh chóng. Mograph mastery phân biệt good vs great motion designer — productivity multiplier critical.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Mograph là gì?</h2>
  <p>Mograph (short for &quot;Motion Graphics&quot;) là <strong>module/feature set</strong> trong Maxon Cinema 4D — designed specifically for <strong>procedural animation</strong> với multiple objects. Introduced Cinema 4D R8 (2007), Mograph transformed C4D into industry standard cho motion graphics. Multi-step duplication, effects, dynamics integration — all built around Mograph paradigm.</p>
  <p>Core concept: <strong>Cloner</strong> object duplicate object in pattern (linear, grid, radial), <strong>Effector</strong> object modify Cloner&apos;s output (position, rotation, color, scale). Combine Cloner + Effector + animation → complex motion graphic. Procedural, parametric — change Cloner setting, animation update automatically.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Mograph vs After Effects Repeating Patterns</span>
    <p><strong>AE</strong>: 2D motion graphics standard. Layer-based, dùng cho compositing video. <strong>Mograph C4D</strong>: 3D motion graphics. Cloner-based, procedural, dynamics integrate. Heavy lifting in 3D rendering — render to AE for compositing/final. Modern motion designer use both.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Cloner</strong> — duplicate object trong pattern</li>
    <li><strong>Effector</strong> — modify Cloner output (Random, Plain, Shader, etc.)</li>
    <li><strong>MoText</strong> — text mograph object</li>
    <li><strong>MoSpline</strong> — animated spline</li>
    <li><strong>Tracer</strong> — trail line from moving object</li>
    <li><strong>Fields</strong> — modern falloff system (replace old)</li>
    <li><strong>MoExtrude</strong> — extrude polygon per Cloner element</li>
    <li><strong>Voronoi Fracture</strong> — fragment object</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"mograph cinema 4d cloner effector motion graphics 3D"</span>
    </div>
    <p class="arc-image-caption">Mograph C4D — Cloner + Effector procedural workflow cho motion graphics 3D</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Core Mograph Objects</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Cloner</summary>
      <div class="arc-card-body">
        <p>Most fundamental Mograph object. Duplicate child object trong pattern. <strong>Linear</strong>: line, <strong>Grid</strong>: 2D/3D array, <strong>Radial</strong>: circle, <strong>Object</strong>: distribute on surface, <strong>Honeycomb</strong>: hexagon pattern. Count parameter define number of clones.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Random Effector</summary>
      <div class="arc-card-body">
        <p>Add random variation to Cloner — random position, rotation, scale, color. Each clone different despite identical setup. Seed value cho repeatable randomness.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Plain Effector</summary>
      <div class="arc-card-body">
        <p>Apply linear transform to clones — move, rotate, scale uniformly. Combine với Field cho selective effect (only affect clones in field range).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Shader Effector</summary>
      <div class="arc-card-body">
        <p>Use shader (color value) to drive effector parameters. Image map drive clone height = pixel-mapping effect (popular).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Step Effector</summary>
      <div class="arc-card-body">
        <p>Apply effect progressively across clones — first clone 0%, last clone 100%. Useful cho wave-like animation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>MoText</summary>
      <div class="arc-card-body">
        <p>Text với Mograph integration. Each letter as clone — apply Effector to letter individually. Text wave, scatter, reveal.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>MoSpline</summary>
      <div class="arc-card-body">
        <p>Animated spline (curve). Growth animation along path. Combine với sweep cho tube animation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fields</summary>
      <div class="arc-card-body">
        <p>Modern falloff replace simple falloff. Spherical, box, plane, sound field. Combine fields với boolean (add, subtract, intersect).</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Mograph</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Create Base Object</h3>
    <ul class="arc-list">
      <li>Simple primitive (sphere, cube) hoặc complex model</li>
      <li>Material/texture cho clones</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Add Cloner</h3>
    <ul class="arc-list">
      <li>Insert Cloner object</li>
      <li>Make base object child of Cloner</li>
      <li>Choose mode (Linear, Grid, Radial)</li>
      <li>Set count, spacing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Add Effector</h3>
    <ul class="arc-list">
      <li>Add Random/Plain/Shader Effector</li>
      <li>Drag Effector to Cloner&apos;s Effector list</li>
      <li>Configure parameter (position, rotation, scale, color)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Add Falloff / Fields</h3>
    <ul class="arc-list">
      <li>Linear/Spherical falloff on Effector</li>
      <li>Modern: Fields system với multiple shape</li>
      <li>Selective effect application</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Animate</h3>
    <ul class="arc-list">
      <li>Animate Effector strength over time</li>
      <li>Animate Field position</li>
      <li>Animate Cloner count, mode</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Combine Multiple Effectors</h3>
    <ul class="arc-list">
      <li>Stack Effectors trong Cloner&apos;s list</li>
      <li>Random + Plain + Shader simultaneously</li>
      <li>Complex result from simple component</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Render &amp; Comp</h3>
    <ul class="arc-list">
      <li>Redshift / Octane / Standard renderer</li>
      <li>Export to After Effects cho final comp</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Ứng dụng &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Brand Identity Animation</strong> — logo reveal, brand pattern</li>
    <li><strong>Title Sequence</strong> — Netflix-style intro</li>
    <li><strong>Music Video</strong> — abstract animated pattern</li>
    <li><strong>Product Visualization</strong> — exploded view animation</li>
    <li><strong>UI/UX Animation</strong> — dashboard, data viz motion</li>
    <li><strong>Conference Visual</strong> — keynote stage screen</li>
    <li><strong>Career path</strong>: Motion Designer junior $50K → Senior $80K → Director $100K+</li>
    <li><strong>Famous studios</strong>: BUCK, GMUNK, Imaginary Forces, Mill, Method Studios</li>
    <li><strong>Learning resources</strong>: GreyscaleGorilla (best for C4D Mograph), School of Motion</li>
  </ul>
</section>
`,
  },

  // 04. MOGRT
  {
    id: "28db873f-b23f-4fd9-9c5a-6172914eae11",
    tieu_de: "MOGRT (Motion Graphics Template)",
    tieu_de_viet: "Motion Graphics Template (.mogrt)",
    tom_tat:
      "MOGRT là Motion Graphics Template format của Adobe — export animation từ After Effects, sử dụng trong Premiere Pro mà không cần mở AE — workflow phổ biến cho lower thirds, title, etc.",
    meta_title: "MOGRT là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "MOGRT Motion Graphics Template Adobe. Tìm hiểu cách tạo trong After Effects, sử dụng trong Premiere và best practice.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn video editor cần lower thirds cho 50 interviewee. Tạo trong After Effects 50 lần? Quá tốn thời gian. Tạo 1 lần thành <strong>MOGRT</strong> — drag-drop vào Premiere, đánh chữ tên mới, done. Workflow tiết kiệm hàng giờ — đặc biệt cho recurring template như lower thirds, title card, transition.</p>
  <p>MOGRT là kỹ thuật productivity essential cho Adobe workflow editor. Hiểu cách tạo MOGRT trong AE, expose parameter cho Premiere user và best practice giúp create reusable template — boost productivity và monetize template trên marketplace.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>MOGRT là gì?</h2>
  <p>MOGRT (Motion Graphics Template) là <strong>file format proprietary</strong> của Adobe (.mogrt) — export motion graphics từ <strong>After Effects</strong>, sử dụng trong <strong>Premiere Pro</strong> mà không cần AE installed. Template có exposed parameters editable — text content, color, size — user (editor) modify trong Premiere without touching AE.</p>
  <p>Workflow: motion designer tạo complex animation trong AE (lower thirds với layered effect, masks, expressions). Configure Essential Graphics panel — expose specific parameter (text, color). Export .mogrt file. Editor in Premiere drag .mogrt to timeline, edit exposed parameter — final result customized template.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">MOGRT vs Premiere Native Title</span>
    <p><strong>Premiere Native Title</strong>: simple text + basic animation. Limited. <strong>MOGRT</strong>: complex AE animation, expressions, effect. Pre-designed, parametrized. Premiere user gets AE-level animation without learning AE.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Essential Graphics Panel</strong> — AE panel cho design template</li>
    <li><strong>Exposed Parameter</strong> — editable in Premiere</li>
    <li><strong>Text Properties</strong> — content, font, color</li>
    <li><strong>2D Position / Size</strong> — adjustable</li>
    <li><strong>Color Picker</strong> — themeable</li>
    <li><strong>Master Properties</strong> — top-level controls</li>
    <li><strong>Linked Comp</strong> — preserve link to AE source</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"motion graphics template mogrt premiere after effects"</span>
    </div>
    <p class="arc-image-caption">MOGRT — template motion graphics editable trong Premiere không cần AE</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Tạo MOGRT trong After Effects</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Design Animation</summary>
      <div class="arc-card-body">
        <p>Create AE composition với your motion graphics design — lower thirds, title card, logo animation. Include text layer, shape, effect.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Open Essential Graphics</summary>
      <div class="arc-card-body">
        <p>Window → Essential Graphics. Panel opens. Select master composition (top-level).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Drag Property to Panel</summary>
      <div class="arc-card-body">
        <p>From Effects/Controls panel, drag Text Source, Color, Position to Essential Graphics. Each becomes editable parameter.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Organize &amp; Label</summary>
      <div class="arc-card-body">
        <p>Group properties (Color Group, Text Group). Rename clearly — &quot;Headline Text&quot;, &quot;Background Color&quot;.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Add Comments</summary>
      <div class="arc-card-body">
        <p>Comments explain usage. Show preview thumbnail. Add font reference if custom font.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Test Edit</summary>
      <div class="arc-card-body">
        <p>Test changing exposed parameter — does template still work? Edge case: long text overflow, extreme color, etc.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>7. Export as MOGRT</summary>
      <div class="arc-card-body">
        <p>Essential Graphics panel → Export Motion Graphics Template. Save as .mogrt. Choose Local or Library export.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Sử dụng MOGRT trong Premiere</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Import Template</h3>
    <ul class="arc-list">
      <li>Essential Graphics panel trong Premiere</li>
      <li>Browse tab → install local .mogrt</li>
      <li>Or drag .mogrt file vào Browse panel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Drag to Timeline</h3>
    <ul class="arc-list">
      <li>Drag template từ panel vào timeline</li>
      <li>Position trên video clip</li>
      <li>Adjust duration nếu cần</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Edit Parameters</h3>
    <ul class="arc-list">
      <li>Select template trong timeline</li>
      <li>Essential Graphics panel → Edit tab</li>
      <li>Modify text, color, position</li>
      <li>Real-time preview</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Multiple Instances</h3>
    <ul class="arc-list">
      <li>Same template, different content</li>
      <li>Vd: 50 lower thirds với different interviewee name</li>
      <li>Productivity multiplier</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Render</h3>
    <ul class="arc-list">
      <li>Premiere renders animation trực tiếp</li>
      <li>No need AE installation</li>
      <li>Output normal video export</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Ứng dụng &amp; Monetization</h2>
  <ul class="arc-list">
    <li><strong>Lower Thirds</strong> — name + title interviewee</li>
    <li><strong>Title Cards</strong> — opening title sequence</li>
    <li><strong>Transitions</strong> — between scene</li>
    <li><strong>Logo Reveal</strong> — intro outro animation</li>
    <li><strong>Social Media Templates</strong> — square 1:1, vertical 9:16</li>
    <li><strong>News-Style Graphic</strong> — info display, ticker</li>
    <li><strong>Marketplace</strong>: Motion Array, Premiere Pro Templates, Envato Elements — sell .mogrt $5-100/template</li>
    <li><strong>Subscription</strong>: Motion Array, Envato Elements — unlimited template</li>
    <li><strong>Custom MOGRT for client</strong> — $300-2000 per package</li>
    <li><strong>Best practice</strong>: thoroughly test exposed parameter, document usage clearly</li>
  </ul>
</section>
`,
  },

  // 05. Moodboard
  {
    id: "cabec65f-4b53-4a26-88df-8ed2b9c3dbc1",
    tieu_de: "Moodboard",
    tieu_de_viet: "Bảng cảm hứng (Moodboard)",
    tom_tat:
      "Moodboard là bảng tập hợp hình ảnh, màu sắc, texture, tài liệu tham khảo để truyền cảm hứng và truyền đạt ý tưởng thiết kế trực quan — tool quan trọng cho creative direction.",
    meta_title:
      "Moodboard là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Moodboard là tool truyền đạt ý tưởng. Tìm hiểu cách tạo moodboard chuyên nghiệp, tools (Milanote, Pinterest) và best practice.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn designer pitch concept cho client &quot;modern, minimalist, premium&quot;. Client confused — &quot;minimalist&quot; là gì cụ thể? Tạo <strong>moodboard</strong> — collage of reference photo Apple website, Bauhaus design, Scandinavian furniture, monochrome typography. Client instantly &quot;get it&quot;. Moodboard là <strong>visual language</strong> — communicate aesthetic faster than words.</p>
  <p>Moodboard là kỹ năng essential cho mọi creative — designer, photographer, filmmaker, art director, fashion designer, interior designer. Hiểu cách tạo moodboard hiệu quả giúp align team, communicate với client, và set direction creative cho project.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Moodboard là gì?</h2>
  <p>Moodboard (bảng cảm hứng) là <strong>collage of visual reference</strong> — image, color swatch, texture, typography, words — assembled to communicate aesthetic direction, mood, style, hoặc concept của project. Physical (corkboard với pin) hoặc digital (Pinterest, Milanote, Figma). Used in <strong>pre-production</strong> phase trước khi production work begin.</p>
  <p>Purpose: (1) <strong>Align team</strong> — designer, photographer, art director share same vision; (2) <strong>Communicate với client</strong> — show không tell; (3) <strong>Inspiration</strong> — fuel creative process; (4) <strong>Decision-making</strong> — choose direction từ multiple option; (5) <strong>Reference during execution</strong> — keep on-track.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Moodboard ≠ Final Design</span>
    <p>Moodboard là <strong>direction</strong>, không phải template để copy. Show vibe, mood, color palette, texture quality — not exact composition. Junior mistake: pitch moodboard as final design. Pro understand: moodboard sets aesthetic frame; design fills within.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Visual Reference</strong> — photos, art, screenshot</li>
    <li><strong>Color Palette</strong> — swatches</li>
    <li><strong>Typography</strong> — font reference</li>
    <li><strong>Texture / Material</strong> — surface inspiration</li>
    <li><strong>Mood Words</strong> — descriptive terms</li>
    <li><strong>Pinterest, Milanote, Figma</strong> — popular tools</li>
    <li><strong>Physical Cork Board</strong> — tactile approach</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"moodboard design inspiration collage reference creative direction"</span>
    </div>
    <p class="arc-image-caption">Moodboard — collage of visual reference, communicate aesthetic direction</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Loại Moodboard</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Brand Identity Moodboard</summary>
      <div class="arc-card-body">
        <p>Brand direction — logo style, color palette, typography, photography style, packaging reference. Show brand personality visually. Critical cho branding project kickoff.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photography Moodboard</summary>
      <div class="arc-card-body">
        <p>Specific photoshoot reference — lighting, composition, model pose, location, color grading. Photographer share với client, model, stylist trước shoot.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Film / Music Video Moodboard</summary>
      <div class="arc-card-body">
        <p>Cinematic reference — film stills, color palette, costume, locations. Director communicate với DP, production designer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Web Design Moodboard</summary>
      <div class="arc-card-body">
        <p>Website inspiration — layout, color, typography, illustration style. UX/UI direction. Screenshot from references.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Interior Design Moodboard</summary>
      <div class="arc-card-body">
        <p>Room inspiration — furniture, color, texture, material samples. Tactile components (fabric, paint chips).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fashion Moodboard</summary>
      <div class="arc-card-body">
        <p>Collection direction — silhouette, color, fabric, era reference. Fashion designer foundation collection.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Wedding / Event Moodboard</summary>
      <div class="arc-card-body">
        <p>Event aesthetic — venue style, floral, color palette, attire. Client + planner align.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Tạo Moodboard</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Understand Project Brief</h3>
    <ul class="arc-list">
      <li>Client direction, target audience</li>
      <li>Key adjectives — modern, luxurious, organic, bold</li>
      <li>Constraints — budget, deadline, technical</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Research &amp; Gather</h3>
    <ul class="arc-list">
      <li>Pinterest search — vast resource</li>
      <li>Behance, Dribbble — designer work</li>
      <li>Unsplash, Pexels — stock photos</li>
      <li>Magazine, art book — physical inspiration</li>
      <li>Save 50-100 images initially, then curate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Curate &amp; Edit</h3>
    <ul class="arc-list">
      <li>Cull to 15-30 strongest pieces</li>
      <li>Look for cohesive direction emerging</li>
      <li>Identify themes — color, texture, composition</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Layout</h3>
    <ul class="arc-list">
      <li>Group similar — color cluster, texture cluster</li>
      <li>Hierarchy — hero image larger, support smaller</li>
      <li>White space cho breathing</li>
      <li>Tool: Figma, Milanote, Pinterest, InDesign</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Add Color Palette</h3>
    <ul class="arc-list">
      <li>Extract colors từ moodboard images</li>
      <li>3-5 main colors</li>
      <li>Hex codes labeled</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Mood Words</h3>
    <ul class="arc-list">
      <li>3-7 adjectives describing direction</li>
      <li>Vd: minimalist, premium, organic, warm, sophisticated</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Present &amp; Iterate</h3>
    <ul class="arc-list">
      <li>Share with client/team</li>
      <li>Discuss reactions — which images resonate</li>
      <li>Refine — remove what doesn&apos;t work</li>
      <li>Approved moodboard guides production</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools Tạo Moodboard</h2>
  <ul class="arc-list">
    <li><strong>Pinterest</strong> — free, vast image library, board organization</li>
    <li><strong>Milanote</strong> — designed cho creative — note, image, link in one board</li>
    <li><strong>Figma / FigJam</strong> — collaboration, real-time editing</li>
    <li><strong>InDesign</strong> — designer-friendly, professional layout</li>
    <li><strong>Photoshop</strong> — full control, custom design</li>
    <li><strong>Notion</strong> — text + image, project management integrated</li>
    <li><strong>Niice</strong> — designed cho moodboard sharing</li>
    <li><strong>Physical Board</strong> — corkboard với pin, tactile</li>
    <li><strong>Tip</strong>: cite source if showing client (avoid &quot;ripping off&quot; appearance)</li>
    <li><strong>Best practice</strong>: 2-3 moodboard option for client — different direction</li>
  </ul>
</section>
`,
  },

  // 06. Morph (Hulk)
  {
    id: "66d9d269-832b-469e-846f-16e98a267d48",
    tieu_de: "Morph (Blend Shapes)",
    tieu_de_viet: "Biến hình (Morph / Blend Shapes)",
    tom_tat:
      "Morph là kỹ thuật biến dạng mesh từ hình dạng này sang hình dạng khác — blend shapes hoặc morph targets — dùng trong facial animation và transition giữa các trạng thái của character.",
    meta_title: "Morph là gì? Ý nghĩa và ứng dụng trong animation | CINS",
    meta_description:
      "Morph (blend shape) animate facial expression và transformation. Tìm hiểu workflow blend shape, FACS và facial rigging hiện đại.",
    noi_dung: `
<section class="arc-intro">
  <p>Bruce Banner transform thành Hulk trong Marvel — body morph từ human normal sang massive green creature. Pixar character smile, frown, blink — face morph between hundreds of expression. Đây là <strong>Morph</strong> (hoặc Blend Shapes, Morph Targets) — kỹ thuật fundamental cho facial animation và character transformation trong 3D.</p>
  <p>Morph/Blend Shapes là kiến thức essential cho character animator, facial rigger, technical animator. Hiểu workflow tạo blend shape, FACS-based facial animation, modern AI facial capture giúp animate character expressively — phân biệt cartoony và realistic acting.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Morph là gì?</h2>
  <p>Morph (hoặc Blend Shapes, Morph Targets, Shape Keys) là kỹ thuật trong 3D animation — <strong>store multiple versions của cùng mesh</strong> với different vertex positions, sau đó <strong>blend smoothly</strong> giữa các version. Vd: face neutral pose + face smiling — animator blend từ 0 to 1, vertex move from neutral position to smile position over time → smooth facial animation.</p>
  <p>Different from rigging với joint/skeleton — blend shape store actual vertex displacement, không phải joint rotation. Modern character animation use both: skeleton cho large gross movement (head turn, jaw open), blend shape cho fine facial detail (lip curl, eyebrow raise). Industry standard FACS (Facial Action Coding System) — set of muscle-based blend shape representing every possible facial muscle movement.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Blend Shape vs Joint-based Facial Rig</span>
    <p><strong>Blend Shape</strong>: store target shape, blend %. Pros: precise facial expression, easier to author. Cons: large file size, harder for asymmetric expression. <strong>Joint-based</strong>: joint deform face mesh. Pros: smaller file, easier asymmetry. Cons: hard cho subtle expression. Modern: combine both — hybrid rig.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Blend Shape / Morph Target</strong> — stored mesh variation</li>
    <li><strong>Shape Key</strong> — Blender term</li>
    <li><strong>Corrective Shape</strong> — fix deformation issue</li>
    <li><strong>FACS</strong> — Facial Action Coding System</li>
    <li><strong>Phoneme Shape</strong> — mouth shape cho lip sync</li>
    <li><strong>Driver / Drive Connection</strong> — automate blend shape</li>
    <li><strong>Sculpt Mode</strong> — create blend shape via sculpting</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"morph blend shape facial animation 3D character expression"</span>
    </div>
    <p class="arc-image-caption">Morph / Blend Shapes — facial animation, character transformation</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Ứng dụng Morph</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Facial Animation</summary>
      <div class="arc-card-body">
        <p>Most common use case. Smile, frown, eyebrow raise, eye blink. Mix multiple blend shape — happy + surprised = surprised happy. Foundation character acting.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lip Sync</summary>
      <div class="arc-card-body">
        <p>Phoneme blend shapes — A, E, I, O, U, M, B, P, F, V, etc. Match mouth shape to dialogue audio. Auto-lipsync tool (FaceFX, Papagayo, Adobe Character Animator).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Body Transformation</summary>
      <div class="arc-card-body">
        <p>Hulk transformation — human → muscular monster. Slow morph between body shape over time. Wolfman, werewolf transformation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Corrective Shape</summary>
      <div class="arc-card-body">
        <p>Fix deformation when joint bend extreme. Vd: shoulder lift arm too high creates wrinkle, corrective shape smooth it. Driven by joint rotation value.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cartoon Squash &amp; Stretch</summary>
      <div class="arc-card-body">
        <p>Cartoon character bouncing — body squash flat, stretch tall. Blend shape achieve exaggeration impossible với joint alone.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Aging / Weight Change</summary>
      <div class="arc-card-body">
        <p>Character age over story — face wrinkle, body slim/fat. Blend between young, middle, old shape.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Motion Capture Facial</summary>
      <div class="arc-card-body">
        <p>Mocap actor facial → drive blend shape weight on 3D character. iPhone TrueDepth camera, Apple ARKit blend shape map.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Tạo Blend Shape</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Base Mesh</h3>
    <ul class="arc-list">
      <li>Character mesh trong neutral pose</li>
      <li>Clean topology — quad mesh, edge loop around mouth, eye</li>
      <li>Symmetric base ideal</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Duplicate Mesh</h3>
    <ul class="arc-list">
      <li>Copy base mesh</li>
      <li>Sculpt new shape (smile, frown, brow up)</li>
      <li>Same vertex count, just moved positions</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Connect as Blend Shape</h3>
    <ul class="arc-list">
      <li>Maya: Create Blend Shape Deformer, add target mesh</li>
      <li>Blender: Shape Key panel, add new shape from current</li>
      <li>3ds Max: Morpher modifier</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Test &amp; Refine</h3>
    <ul class="arc-list">
      <li>Slide weight 0 to 1 — see morph happen</li>
      <li>Fix vertex misalignment</li>
      <li>Smooth deformation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Build Library</h3>
    <ul class="arc-list">
      <li>50-150 blend shapes typical character face</li>
      <li>FACS-based naming (browInnerUp, mouthSmile_L, etc.)</li>
      <li>Asymmetric (left/right) cho realistic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Create Driver / Controller</h3>
    <ul class="arc-list">
      <li>NURBS curve controller cho animator</li>
      <li>Slider UI cho easy access</li>
      <li>Driven keys connect controller to blend shape weight</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Hand-off to Animator</h3>
    <ul class="arc-list">
      <li>Documentation cho controller usage</li>
      <li>Demo expression animator</li>
      <li>Iterate based on feedback</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Modern Trends</h2>
  <ul class="arc-list">
    <li><strong>iPhone Face Tracking</strong> — TrueDepth camera capture 52 ARKit blend shape</li>
    <li><strong>MetaHuman</strong> — Unreal Engine high-quality character với FACS-based blend shape</li>
    <li><strong>Reallusion iClone</strong> — facial capture + animation</li>
    <li><strong>FaceFX</strong> — auto lip sync industry standard</li>
    <li><strong>Audio2Face (NVIDIA)</strong> — AI generate facial animation from audio</li>
    <li><strong>Joint + Blend Shape Hybrid</strong> — modern best practice</li>
    <li><strong>Naming convention</strong>: Apple ARKit standard cho cross-app compatibility</li>
    <li><strong>Career</strong>: Facial Rigger TD — specialized senior role, $100K-180K studio</li>
  </ul>
</section>
`,
  },

  // 07. Motion Blur
  {
    id: "9eb26d29-d713-45d1-87b0-50eca07ac827",
    tieu_de: "Motion Blur",
    tieu_de_viet: "Hiệu ứng mờ chuyển động",
    tom_tat:
      "Motion Blur là hiệu ứng mờ theo hướng chuyển động — xuất hiện tự nhiên trong nhiếp ảnh và film khi vật thể di chuyển nhanh trong thời gian phơi sáng — render hoặc add trong compositing.",
    meta_title: "Motion Blur là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Motion Blur tạo cảm giác chuyển động. Tìm hiểu shutter angle, 180° rule và cách render motion blur trong 3D, add in post.",
    noi_dung: `
<section class="arc-intro">
  <p>Xem phim — character chạy nhanh, hand blurred theo direction. Sport photography — formula 1 car blur trên track. Xem game 60fps — character motion smooth. Hoặc game khác — quá sharp, look like stop motion. Khác biệt: <strong>Motion Blur</strong>. Effect cơ bản nhưng critical cho cinematic feel — without motion blur = robotic, video game-y; with proper motion blur = filmic, natural.</p>
  <p>Motion Blur là kiến thức essential cho cinematographer, 3D animator, VFX artist, motion designer. Hiểu shutter angle, 180° rule, và cách apply motion blur trong rendering và compositing giúp output feel cinematic professional. Subtle nhưng impactful detail.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Motion Blur là gì?</h2>
  <p>Motion Blur là <strong>hiệu ứng mờ</strong> trên image hoặc video frame khi <strong>subject hoặc camera di chuyển</strong> trong thời gian phơi sáng (exposure time). Photographer chụp moving car với slow shutter speed — car blur theo direction motion. Film camera same principle — each frame là exposure for fraction of second; nếu subject move during, image blur.</p>
  <p>In real photography/film, motion blur tự nhiên xuất hiện based on shutter speed. In 3D animation và game, motion blur must be added artificially — by render engine compute or post-production effect. Without motion blur, 3D render look &quot;stop motion&quot; — too sharp, unnatural. With motion blur calibrated correctly, 3D feel like live action film.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">180° Shutter Rule</span>
    <p>Standard cinematography rule: shutter angle 180° (or shutter speed = 1/2 of fps). Vd: 24fps → 1/48s shutter. Tạo motion blur amount considered &quot;natural cinematic&quot;. Hai-bit film standard. Wider angle (270°) = more blur, dreamy. Narrower (90°) = sharper, &quot;Saving Private Ryan&quot; combat feel.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Shutter Speed</strong> — exposure duration per frame</li>
    <li><strong>Shutter Angle</strong> — film standard expression (180° = 1/2 fps)</li>
    <li><strong>Motion Vector</strong> — direction + speed per pixel</li>
    <li><strong>Camera Motion Blur</strong> — camera move during exposure</li>
    <li><strong>Object Motion Blur</strong> — subject move</li>
    <li><strong>Frame Blending</strong> — fake motion blur in post</li>
    <li><strong>Vector Motion Blur</strong> — accurate, using motion data</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"motion blur photography cinematography film 3D render shutter"</span>
    </div>
    <p class="arc-image-caption">Motion Blur — natural blur from movement, cinematic feel</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Loại Motion Blur</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Camera Motion Blur</summary>
      <div class="arc-card-body">
        <p>Camera pan/tilt during exposure → entire frame blur in direction. Sport camera tracking subject = subject sharp, BG blur (panning). Specific look.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Object Motion Blur</summary>
      <div class="arc-card-body">
        <p>Camera static, subject move → only subject blur. Most common. Walking character&apos;s arm blur slightly.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Combined</summary>
      <div class="arc-card-body">
        <p>Both camera and subject move → complex blur pattern. Realistic in production. 3D renderer handle both simultaneously.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Radial Motion Blur</summary>
      <div class="arc-card-body">
        <p>Camera zoom in/out during exposure → radial blur from center. Used for hyperdrive jump (Star Wars), dramatic zoom effect.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stylized Motion Blur</summary>
      <div class="arc-card-body">
        <p>Anime &quot;speed lines&quot; — stylized motion blur. Comic book exaggerated. Not realistic, intentional artistic.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Motion Blur trong 3D Rendering</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Render Engine Approach</h3>
    <ul class="arc-list">
      <li>Arnold, V-Ray, Cycles: built-in motion blur</li>
      <li>Calculate vertex position over time</li>
      <li>Multiple sample blend → blurred result</li>
      <li>Expensive — increase render time</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Shutter Angle Setting</h3>
    <ul class="arc-list">
      <li>Most renderer have shutter angle (0-360°)</li>
      <li>180° default — cinematic standard</li>
      <li>Increase cho more blur</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Vector Pass</h3>
    <ul class="arc-list">
      <li>Render motion vector data — direction+speed per pixel</li>
      <li>Separate AOV (Arbitrary Output Variable)</li>
      <li>Apply motion blur in compositing — faster, flexibility</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Engine Motion Blur</h3>
    <ul class="arc-list">
      <li>Real-time approximation</li>
      <li>Cheaper than offline render motion blur</li>
      <li>Per-object motion blur (UE5)</li>
      <li>Setting affect performance</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Motion Blur trong Post-Production</h2>
  <ul class="arc-list">
    <li><strong>After Effects — CC Force Motion Blur</strong> — auto add blur to layer</li>
    <li><strong>After Effects — Pixel Motion Blur</strong> — optical flow analysis</li>
    <li><strong>ReelSmart Motion Blur</strong> — RE:Vision plugin chuẩn industry</li>
    <li><strong>Premiere Pro</strong> — Frame Blending for slow motion blur</li>
    <li><strong>DaVinci Resolve</strong> — Optical Flow giúp interpolate frames</li>
    <li><strong>Render Test First</strong> — motion blur expensive, optimize settings</li>
    <li><strong>Common mistake</strong>: too much motion blur — looks soft, unfocused</li>
    <li><strong>Sports</strong>: low shutter angle (90°) cho sharp action sequence</li>
    <li><strong>Cinematic</strong>: 180° standard</li>
    <li><strong>Dreamy</strong>: 360° shutter angle for ethereal feel</li>
  </ul>
</section>
`,
  },

  // 08. Motion Capture
  {
    id: "a2201a4c-2ac9-46d2-a4dc-8775a733e096",
    tieu_de: "Motion Capture",
    tieu_de_viet: "Bắt chuyển động (Motion Capture)",
    tom_tat:
      "Motion Capture (Mocap) là quá trình ghi lại chuyển động của người/vật thể thực, sau đó áp dụng data đó cho mô hình 3D để tạo hoạt ảnh — foundation cho realistic character animation modern.",
    meta_title:
      "Motion Capture là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Motion Capture ghi lại chuyển động thực. Tìm hiểu mocap optical, inertial, markerless và workflow cho game, film.",
    noi_dung: `
<section class="arc-intro">
  <p>Avatar (2009) — Sigourney Weaver acting trong mocap suit, Na&apos;vi character move identical. Andy Serkis as Gollum, Caesar (Planet of the Apes) — performance capture giúp digital character feel alive. Modern AAA game — Last of Us, Red Dead Redemption — protagonist motion captured. Đây là <strong>Motion Capture</strong> — technology bridging real performance và digital character.</p>
  <p>Motion Capture là kỹ thuật advanced cho character animation. Hiểu workflow mocap — capture, cleanup, retarget — và limitations giúp leverage hiệu quả cho project. Mocap democratize cho indie với iPhone-based system, Rokoko inertial suit.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Motion Capture là gì?</h2>
  <p>Motion Capture (Mocap) là quá trình <strong>ghi lại motion data</strong> của actor performance trong real world, sau đó <strong>apply data đó cho 3D character</strong>. Actor wears suit với marker hoặc sensor — system tracks marker position over time → output 3D animation data → applied to digital character&apos;s skeleton. Result: character moves exactly như actor.</p>
  <p>Multiple technology approach: <strong>Optical Mocap</strong> (camera tracking reflective marker — most accurate, Vicon, OptiTrack); <strong>Inertial Mocap</strong> (suit với gyroscope — wireless, Xsens, Rokoko); <strong>Markerless Mocap</strong> (AI từ video — easier, less accurate, RADiCAL, Move.ai); <strong>Facial Mocap</strong> (specialized cho face — iPhone ARKit, helmet camera).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Mocap vs Keyframe Animation</span>
    <p><strong>Mocap</strong>: realistic, natural human motion. Faster cho complex action sequence. Need actor, suit, studio. Limited cho non-human (animal, monster). <strong>Keyframe</strong>: hand-crafted, stylized control. Slower but precise artistic intent. Better cho cartoon, exaggeration. Modern often combine both — mocap base + keyframe polish.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Optical Mocap</strong> — camera + marker</li>
    <li><strong>Inertial Mocap</strong> — IMU sensor suit</li>
    <li><strong>Markerless Mocap</strong> — AI video analysis</li>
    <li><strong>Performance Capture</strong> — body + face simultaneously</li>
    <li><strong>Volume / Stage</strong> — mocap capture area</li>
    <li><strong>Marker</strong> — reflective ball on suit</li>
    <li><strong>Retargeting</strong> — apply mocap to different skeleton</li>
    <li><strong>Cleanup</strong> — fix tracking errors</li>
    <li><strong>FACS</strong> — facial action coding</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"motion capture suit actor 3D animation mocap optical"</span>
    </div>
    <p class="arc-image-caption">Motion Capture — record real actor motion, apply to 3D character</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Loại Motion Capture</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Optical Mocap (Marker-based)</summary>
      <div class="arc-card-body">
        <p>Studio với multiple high-speed camera (10-50 camera). Actor wear suit với reflective marker. Camera track marker, system reconstruct 3D position per frame. Most accurate. Industry standard cho film, AAA game. Brand: Vicon, OptiTrack, Qualisys. Cost: $50K-500K+ studio setup.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Inertial Mocap (IMU)</summary>
      <div class="arc-card-body">
        <p>Suit với IMU (Inertial Measurement Unit) — accelerometer, gyroscope, magnetometer. No camera needed, wireless. Capture anywhere — outdoor, studio. Less accurate position drift. Brand: Xsens, Rokoko, Perception Neuron. Cost: $2K-15K suit.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Markerless Mocap (AI)</summary>
      <div class="arc-card-body">
        <p>Computer vision + AI analyze video. No suit needed — actor wears normal clothes. Single camera or multi-camera. Quality improving rapidly với deep learning. Brand: Move.ai, RADiCAL, DeepMotion. Accessible $20-200/month subscription.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Facial Mocap</summary>
      <div class="arc-card-body">
        <p>Specialized for face. Helmet-mounted camera close-up actor face + dot pattern. Or markerless iPhone ARKit (52 blend shape). Capture nuanced expression cho photorealistic character.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mechanical Mocap (Exoskeleton)</summary>
      <div class="arc-card-body">
        <p>Older tech — exoskeleton rig with sensor. Less common modern. Legacy from 90s-2000s.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hand &amp; Finger Tracking</summary>
      <div class="arc-card-body">
        <p>Specialized glove (StretchSense, Manus) capture finger motion. Combine với body mocap for full performance.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Mocap Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Pre-production</h3>
    <ul class="arc-list">
      <li>Script storyboard mocap session</li>
      <li>Casting actor — physicality match character</li>
      <li>Rehearse direction, choreography</li>
      <li>Mocap studio booking</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Capture Session</h3>
    <ul class="arc-list">
      <li>Actor suit up</li>
      <li>Calibration — actor T-pose, A-pose</li>
      <li>Performance — multiple take per shot</li>
      <li>Director direct via monitor preview</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Raw Data Output</h3>
    <ul class="arc-list">
      <li>FBX, C3D, BVH file format</li>
      <li>Skeleton data với keyframe per joint per frame</li>
      <li>Raw data — has noise, errors</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Cleanup</h3>
    <ul class="arc-list">
      <li>Manual cleanup trong MotionBuilder, Maya</li>
      <li>Fix tracking errors — marker swap, gap</li>
      <li>Smooth noisy data</li>
      <li>Time-consuming — half of mocap labor</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Retargeting</h3>
    <ul class="arc-list">
      <li>Map mocap skeleton → character skeleton</li>
      <li>Different proportion handled</li>
      <li>HumanIK trong Maya, MotionBuilder retarget</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Animation Polish</h3>
    <ul class="arc-list">
      <li>Animator refine mocap base</li>
      <li>Add personality, weight</li>
      <li>Fix interaction (hand on object exact)</li>
      <li>Layer hand-keyed animation if needed</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Integration</h3>
    <ul class="arc-list">
      <li>Bake animation onto character</li>
      <li>Export to game engine / render</li>
      <li>Final QC</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Ứng dụng &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Game</strong>: AAA game heavily use mocap (GTA, Last of Us, Horizon)</li>
    <li><strong>Film VFX</strong>: Avatar, LOTR Gollum, Apes, MCU Hulk, etc.</li>
    <li><strong>Sports Game</strong>: FIFA, Madden — pro athlete mocap</li>
    <li><strong>VR Avatar</strong>: real-time mocap for live performance</li>
    <li><strong>Animation Studio</strong>: Pixar/Disney less mocap, more keyframe (stylized)</li>
    <li><strong>VTuber</strong>: real-time facial mocap drive avatar</li>
    <li><strong>Mocap Studio</strong>: Centroid, House of Moves, Audiomotion, Cubic Motion</li>
    <li><strong>Career path</strong>: Mocap Technician → Mocap Cleanup → Mocap Supervisor</li>
    <li><strong>Salary</strong>: $50-100K mocap artist, $130K+ supervisor</li>
    <li><strong>Indie tip</strong>: Rokoko Smartsuit Pro $2.5K, Move.ai subscription affordable cho solo</li>
  </ul>
</section>
`,
  },

  // 09. Motion Graphics
  {
    id: "83a38625-4d40-4827-a397-aac5bed28adf",
    tieu_de: "Motion Graphics",
    tieu_de_viet: "Đồ họa chuyển động",
    tom_tat:
      "Motion Graphics là thiết kế đồ họa động — animate graphic, typography, illustration cho video, web, advertising — combine graphic design + animation principles tạo communication tool.",
    meta_title:
      "Motion Graphics là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Motion Graphics design + animation. Tìm hiểu nguyên tắc, software (AE, C4D), career path và ứng dụng trong marketing, branding.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Apple Watch commercial — typography slide in smoothly, icon bounce, product reveal cinematic. Netflix Tudum reveal animation. Explainer video startup — character animation explain product. Tất cả là <strong>Motion Graphics</strong> — discipline kết hợp graphic design và animation, exploded in popularity từ social media age đến nay.</p>
  <p>Motion Graphics là career path lucrative cho creative skill kết hợp design và animation. Hiểu nguyên tắc motion design, software workflow (AE, C4D) và industry standards giúp build career — từ freelance creator tới senior motion designer in agency.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Motion Graphics là gì?</h2>
  <p>Motion Graphics là discipline thiết kế — <strong>animate graphical element</strong> (text, illustration, shape, icon) để communicate message hoặc evoke emotion qua time. Combination of <strong>graphic design principles</strong> (composition, color, typography) và <strong>animation principles</strong> (timing, easing, anticipation). Output: video — short, communication-focused, brand-aligned.</p>
  <p>Distinguished từ traditional animation: motion graphics chủ yếu <strong>abstract or graphic content</strong> (text, shape, infographic, brand element) thay vì character storytelling. Use case: commercial, brand identity, explainer video, social media content, title sequence, UI animation. Motion designer là role hybrid graphic designer + animator.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Motion Graphics vs Animation vs VFX</span>
    <p><strong>Motion Graphics</strong>: graphic + design + animation. Brand-focused, communicative. <strong>Animation</strong>: character storytelling, narrative. <strong>VFX</strong>: composite real footage với CGI, realism. Overlap exists — motion graphics có thể include character animation, VFX có motion graphics title. Specialization based on primary intent.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Mograph</strong> — short for Motion Graphics</li>
    <li><strong>Kinetic Typography</strong> — animated text</li>
    <li><strong>Explainer Video</strong> — animated explanation</li>
    <li><strong>Title Sequence</strong> — opening of film/show</li>
    <li><strong>Lower Thirds</strong> — info graphic bottom of video</li>
    <li><strong>Brand Reel</strong> — agency showcase</li>
    <li><strong>Lottie</strong> — vector animation cho web/app</li>
    <li><strong>UI Animation</strong> — app interface motion</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"motion graphics design animation typography brand reel"</span>
    </div>
    <p class="arc-image-caption">Motion Graphics — graphic design + animation = communication tool</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Motion Graphics</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Brand Identity Animation</summary>
      <div class="arc-card-body">
        <p>Logo reveal, brand intro, product launch. Modern brand have animated identity package. Apple, Google, Adobe extensive use.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Explainer Video</summary>
      <div class="arc-card-body">
        <p>Animated explanation product/service. 60-90 second. Startup heavily use. Various style: 2D character, kinetic typography, whiteboard, infographic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Title Sequence</summary>
      <div class="arc-card-body">
        <p>Opening of film, TV show, podcast. Stranger Things, Game of Thrones, Mad Men — iconic title sequence. Craft of its own.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Social Media Content</summary>
      <div class="arc-card-body">
        <p>Vertical 9:16, square 1:1. Instagram, TikTok, YouTube Shorts. Short, attention-grabbing. Motion designer create assets at scale.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UI/UX Motion</summary>
      <div class="arc-card-body">
        <p>App animation, button micro-interaction, page transition. Lottie deploy lightweight. UX designer collaborate với motion designer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Conference / Event Visual</summary>
      <div class="arc-card-body">
        <p>Keynote stage screen, conference branding, live event motion graphics. Apple WWDC, TED Talk extensive use.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Music Video Motion Graphics</summary>
      <div class="arc-card-body">
        <p>Abstract motion paired với music. Beeple-style. Visual album, music video segments.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Data Visualization</summary>
      <div class="arc-card-body">
        <p>Animated chart, graph reveal data over time. Election night graphics, financial data, news.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Software Motion Graphics</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">After Effects</h3>
    <ul class="arc-list">
      <li>Industry standard cho 2D motion graphics</li>
      <li>Layer-based, expression scripting</li>
      <li>Plugin ecosystem (Element 3D, Trapcode, Optical Flares)</li>
      <li>Bridge với Premiere, Photoshop, Illustrator</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cinema 4D</h3>
    <ul class="arc-list">
      <li>Industry standard cho 3D motion graphics</li>
      <li>Mograph module game-changing</li>
      <li>Tight integration với AE</li>
      <li>Used by Apple, BUCK, GMUNK</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Blender</h3>
    <ul class="arc-list">
      <li>Free alternative 3D motion graphics</li>
      <li>Geometry Nodes powerful procedural</li>
      <li>Growing in indie space</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Houdini</h3>
    <ul class="arc-list">
      <li>Procedural powerhouse</li>
      <li>Complex motion graphics, simulation</li>
      <li>Premium tool, steep learning curve</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">DaVinci Resolve Fusion</h3>
    <ul class="arc-list">
      <li>Built-in Resolve, free</li>
      <li>Node-based, alternative to AE</li>
      <li>Growing motion graphics use</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career Path Motion Designer</h2>
  <ul class="arc-list">
    <li><strong>Junior Motion Designer</strong> — $40K-60K, mostly execute task</li>
    <li><strong>Motion Designer</strong> — $60K-90K, fully own project</li>
    <li><strong>Senior Motion Designer</strong> — $90K-130K, lead, mentor</li>
    <li><strong>Motion Design Director</strong> — $130K+, oversee team, creative direction</li>
    <li><strong>Freelance</strong> — $50-200/hour, flexible</li>
    <li><strong>Top Agencies</strong>: BUCK, GMUNK, Imaginary Forces, Mill, Method Studios, Buck</li>
    <li><strong>Brands hiring in-house</strong>: Apple, Netflix, Spotify, Google, Adobe</li>
    <li><strong>Learning</strong>: School of Motion (Joey Korenman), Skillshare, YouTube tutorial</li>
    <li><strong>Portfolio platform</strong>: Behance, Vimeo, Dribbble, personal site</li>
    <li><strong>Demo reel</strong>: 30-60 second highlight best work cho job hunt</li>
  </ul>
</section>
`,
  },

  // 10. Motion Path
  {
    id: "087ae7fa-e40b-4959-ba18-9eb35931ee5c",
    tieu_de: "Motion Path",
    tieu_de_viet: "Đường đi chuyển động (Motion Path)",
    tom_tat:
      "Motion Path là đường đi của object qua không gian theo thời gian trong animation software — visualize và edit curve để control chính xác quỹ đạo chuyển động.",
    meta_title:
      "Motion Path là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Motion Path visualize quỹ đạo object. Tìm hiểu cách edit motion path trong After Effects, Maya và best practice animation.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn animate ball bouncing trong After Effects — keyframe position frame 1 (top), frame 10 (bottom), frame 20 (top again). Ball move straight line lên xuống — boring. Adjust <strong>motion path</strong> — curve dotted line giữa keyframes — to arc. Ball now bounce in natural arc, satisfying eye. Đây là power của motion path — visual control over trajectory.</p>
  <p>Motion Path là kỹ thuật fundamental cho animator — 2D, 3D, motion graphics. Hiểu cách view, edit, optimize motion path giúp animation feel natural, có life. Phân biệt amateur (straight line motion) và pro (curved arc) animation.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Motion Path là gì?</h2>
  <p>Motion Path là <strong>visual representation</strong> của trajectory mà object di chuyển qua thời gian trong animation software. Thường hiển thị as dotted line hoặc spline curve trong viewport — show position của object frame-by-frame. Animator có thể <strong>edit motion path directly</strong> — drag handle để shape curve, control trajectory precisely.</p>
  <p>Khái niệm: object có position keyframes (frame 1: position A, frame 30: position B). Without motion path edit, object travels straight line A → B. Motion path display show this line. Animator can convert to curve, adjusting tangent giữa keyframes để create arc motion — fundamental principle of animation (arcs make motion feel natural).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Arc Principle</summary>
    <p>One of <strong>12 Principles of Animation</strong> (Disney) — most natural motion follows arc, not straight line. Throwing ball, hand wave, character walking — all arc. Motion path tool helps animator visualize và create arc instead of straight line motion.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Trajectory</strong> — path object follow</li>
    <li><strong>Tangent / Handle</strong> — control curve at keyframe</li>
    <li><strong>Spatial Interpolation</strong> — how object moves spatially</li>
    <li><strong>Bezier</strong> — smooth curve type</li>
    <li><strong>Linear</strong> — straight line between key</li>
    <li><strong>Continuous Curve</strong> — smooth through keyframe</li>
    <li><strong>Path Animation</strong> — object follow pre-defined curve</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"motion path animation trajectory curve after effects maya"</span>
    </div>
    <p class="arc-image-caption">Motion Path — visual trajectory của object, editable cho arc natural</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Motion Path trong After Effects</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>View Motion Path</summary>
      <div class="arc-card-body">
        <p>Select layer with position keyframes. Motion path visible as dotted line trong Composition panel. Dots = frame positions; further apart = faster motion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Edit Bezier Handle</summary>
      <div class="arc-card-body">
        <p>Click keyframe on motion path → bezier handles appear (yellow lines extending). Drag handle to adjust curve direction. Pull handle out for more pronounced curve.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Change Tangent Type</summary>
      <div class="arc-card-body">
        <p>Right-click keyframe → Spatial Interpolation. <strong>Linear</strong>: straight line. <strong>Bezier</strong>: smooth curve. <strong>Auto Bezier</strong>: auto-smooth. <strong>Hold</strong>: snap (no interpolation).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Smooth Motion</summary>
      <div class="arc-card-body">
        <p>Select all keyframes → Animation → Keyframe Assistants → Smoother. Reduces sharp corner in motion path. Natural feel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Motion Sketch</summary>
      <div class="arc-card-body">
        <p>Window → Motion Sketch. Draw motion path with mouse cursor in real-time. AE record movement as keyframes. Quick organic motion.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Motion Path trong Maya / 3D</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Trajectory Display</h3>
    <ul class="arc-list">
      <li>Animate → Editors → Trajectories</li>
      <li>Or Display → Animation → Trajectories</li>
      <li>Show 3D path of selected object</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Edit trong Graph Editor</h3>
    <ul class="arc-list">
      <li>Open Graph Editor — show curve per axis (X, Y, Z)</li>
      <li>Tangent type adjustable</li>
      <li>Maya offers more curve control than AE</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Path Animation</h3>
    <ul class="arc-list">
      <li>Different concept: object follow predefined NURBS curve</li>
      <li>Constraint → Motion Paths → Attach to Motion Path</li>
      <li>Camera follow path through scene</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Curve Editor</h3>
    <ul class="arc-list">
      <li>Adjust tangent in curve editor</li>
      <li>Tangent types: Spline, Auto, Linear, Flat, Stepped, Clamped</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Best Practices &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Arcs over straight lines</strong> — natural motion follow arc, edit motion path để curve</li>
    <li><strong>Less is more</strong> — fewer keyframes, smoother curve; many keyframes create jagged motion</li>
    <li><strong>Adjust per-frame</strong> — check motion path tốt mỗi frame, avoid backtrack</li>
    <li><strong>Use Auto Bezier</strong> default cho beginner — software smooth automatically</li>
    <li><strong>Asymmetric handles</strong> cho dramatic ease — pull out long on slow side, short on fast</li>
    <li><strong>Combine với easing</strong> — motion path control trajectory, easing control timing</li>
    <li><strong>Avoid &quot;jelly&quot; motion</strong> — too many curve, looks wobbly</li>
    <li><strong>Reference real life</strong> — film yourself throwing ball, observe arc</li>
    <li><strong>Disney 12 principles</strong> — &quot;Arcs&quot; principle directly relates to motion path</li>
    <li><strong>Camera move</strong> — apply same arc principle to camera path cho cinematic feel</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 2 · Batch 5 — chạy ${items.length} bài keyword (I → P) ──\n`,
);

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
  `SELECT COUNT(*) AS con_lai_dot2
FROM article_bai_viet
WHERE loai_bai_viet = 'keyword'
  AND (noi_dung IS NULL OR noi_dung = '')
  AND tieu_de >= 'I' AND tieu_de < 'Q'`,
  "read",
);
const conLai = remain.rows?.[0]?.con_lai_dot2;

console.log(`\nCòn lại đợt 2: ${conLai} bài.`);
