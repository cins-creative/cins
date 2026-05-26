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
  // 01. Polygon
  {
    id: "ba6eb468-b825-4ab8-a403-54939c67818d",
    tieu_de: "Polygon",
    tieu_de_viet: "Đa giác (Polygon) trong 3D",
    tom_tat:
      "Polygon là đơn vị hình học cơ bản trong đồ họa 3D — mặt phẳng tạo bởi ít nhất ba đỉnh (vertex), dùng để xây dựng mọi mô hình 3D từ character đến environment.",
    meta_title: "Polygon là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Polygon trong 3D modeling. Tìm hiểu triangle, quad, n-gon, topology và best practice modeling cho game, film.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn modeling 3D — Maya, Blender hiển thị mesh. Zoom in — thấy faces tạo thành. Each face là <strong>polygon</strong> — atomic unit của 3D geometry. Cube = 6 polygon (quads), sphere = hundreds polygon, character realistic = millions polygon. Mọi 3D model existence built from polygon. Foundation knowledge cho 3D artist.</p>
  <p>Polygon là kiến thức cơ bản nhất cho 3D artist. Hiểu triangle vs quad vs n-gon, topology, polygon count budget giúp model efficient, animation-friendly, render-optimized. Critical cho game, film, archviz — mọi 3D pipeline.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Polygon là gì?</h2>
  <p>Polygon trong 3D là <strong>flat geometric face</strong> defined bởi 3 hoặc more vertex (đỉnh) connected by edge. Simplest polygon = triangle (3 vertex). Quad (4 vertex) most common trong modeling. N-gon (5+) sometimes used but problematic. Mesh = collection of polygon connected — model 3D entirely.</p>
  <p>Polygon properties: <strong>Vertex</strong> (point in 3D space), <strong>Edge</strong> (line between vertex), <strong>Face</strong> (filled area enclosed by edges), <strong>Normal</strong> (direction face points), <strong>UV</strong> (2D coordinate cho texture). Modern game engine render polygon as triangle internally — quad/n-gon converted to triangle at render time.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Triangle vs Quad vs N-gon</span>
    <p><strong>Triangle (Tri)</strong>: 3 vertex, always planar. Real-time render unit. <strong>Quad</strong>: 4 vertex. Most common modeling unit — clean topology, deform well in animation. <strong>N-gon</strong>: 5+ vertex. Avoid in production — unpredictable deformation, render issue. Convert n-gon to quad/tri before finalize.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Vertex</strong> — point trong 3D</li>
    <li><strong>Edge</strong> — line connect vertex</li>
    <li><strong>Face / Polygon</strong> — flat enclosed area</li>
    <li><strong>Triangle</strong> — 3-vertex polygon</li>
    <li><strong>Quad</strong> — 4-vertex polygon</li>
    <li><strong>N-gon</strong> — 5+ vertex (avoid)</li>
    <li><strong>Normal</strong> — face direction</li>
    <li><strong>Topology</strong> — polygon arrangement</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"polygon 3D mesh triangle quad topology modeling"</span>
    </div>
    <p class="arc-image-caption">Polygon — atomic unit của 3D geometry, foundation modeling</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Polygon Count Budget</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Mobile Game</summary>
      <div class="arc-card-body">
        <p>500-2000 tri per character, 100-500 per prop. Performance critical. Hand model low-poly với normal map fake detail.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>PC / Console Game</summary>
      <div class="arc-card-body">
        <p>5000-50000 tri per character, 500-5000 per prop. Modern AAA push higher với Nanite (Unreal 5). Environment higher.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unreal Nanite (UE5)</summary>
      <div class="arc-card-body">
        <p>Virtualized geometry — millions of polygon per asset feasible. Auto LOD. Revolutionizing game asset budget.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Film / VFX</summary>
      <div class="arc-card-body">
        <p>Millions of polygon per asset. Subdivision surface. Offline render — no realtime constraint. Quality first.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Archviz</summary>
      <div class="arc-card-body">
        <p>Often heavy — detailed building, furniture. Optimize with proxy for viewport, full poly cho render.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VR / AR</summary>
      <div class="arc-card-body">
        <p>Lower budget than console — render twice (each eye). Quest 2 ~50k tri per scene visible.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Topology Rules</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Quad First</h3>
    <ul class="arc-list">
      <li>Use quad whenever possible</li>
      <li>Deform predictably trong animation</li>
      <li>Subdivision smooth correctly</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Avoid N-gon</h3>
    <ul class="arc-list">
      <li>Convert to quad/tri before finish</li>
      <li>Unpredictable shading</li>
      <li>Render issue</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Edge Flow / Loop</h3>
    <ul class="arc-list">
      <li>Edge follow natural muscle/form line</li>
      <li>Around mouth, eye = circular loop</li>
      <li>Critical cho facial animation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Pole (vertex 3 hoặc 5 edge)</h3>
    <ul class="arc-list">
      <li>Avoid in deforming area</li>
      <li>Hide in flat region</li>
      <li>3-pole / 5-pole both have place</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Even Distribution</h3>
    <ul class="arc-list">
      <li>More polygon where curved</li>
      <li>Less where flat</li>
      <li>No waste polygon</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation-Ready</h3>
    <ul class="arc-list">
      <li>Joint area need loop</li>
      <li>Elbow, knee, shoulder loop critical</li>
      <li>Test deformation early</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Polygon Modeling</h2>
  <ul class="arc-list">
    <li><strong>Start simple</strong> — block out primitive shape first</li>
    <li><strong>Subdivision modeling</strong> — model low-poly base, subdivide cho smooth</li>
    <li><strong>Boolean carefully</strong> — boolean produce n-gon, clean afterward</li>
    <li><strong>ZBrush sculpt</strong> — sculpt high-poly, retopology for low-poly final</li>
    <li><strong>Triangulate at export</strong> — game engine triangulate anyway</li>
    <li><strong>Symmetry</strong> — model half, mirror</li>
    <li><strong>Check normal direction</strong> — face should point outward</li>
    <li><strong>Smoothing group</strong> — control hard/soft edge</li>
    <li><strong>Backface culling</strong> — game engine cull inward-facing</li>
    <li><strong>Beginners</strong>: practice basic poly modeling Blender free, classic foundation</li>
  </ul>
</section>
`,
  },

  // 02. Post Processing
  {
    id: "63f0013a-9a94-4321-9182-07f3c7371de5",
    tieu_de: "Post Processing",
    tieu_de_viet: "Xử lý hậu kỳ ảnh (Post Processing)",
    tom_tat:
      "Post Processing là giai đoạn xử lý hình ảnh sau khi render hoặc quay — áp dụng hiệu ứng màu sắc, độ tương phản, bloom, vignette để hoàn thiện hình ảnh cuối cùng.",
    meta_title:
      "Post Processing là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Post Processing trong game engine, render. Tìm hiểu bloom, color grading, motion blur, depth of field cho final image quality.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn render 3D scene Blender — raw render technically correct but feels flat. Apply <strong>Post Processing</strong> — bloom on bright area, color grading warm tone, vignette darken corner, slight chromatic aberration cinematic. Suddenly image feels cinematic, finished. Đó là magic of post processing — bridge between raw render và polished final image.</p>
  <p>Post Processing là kỹ năng critical cho 3D artist, game artist, photographer. Hiểu các effect, software workflow, và best practice giúp elevate render/photo từ technically correct đến visually stunning — distinguish amateur vs pro work.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Post Processing là gì?</h2>
  <p>Post Processing là <strong>image processing applied after main render/capture</strong>. Term used across context: <strong>game engine post-processing</strong> (real-time effect on rendered frame), <strong>photo post-processing</strong> (Lightroom edit), <strong>3D render post</strong> (composite render passes), <strong>video post-production</strong> (similar concept broader). Common goal: enhance final image quality, achieve specific look.</p>
  <p>Common effects: <strong>Bloom</strong> (glow around bright area), <strong>Color Grading</strong> (overall color shift), <strong>Tone Mapping</strong> (HDR → display), <strong>Vignette</strong> (darken edge), <strong>Chromatic Aberration</strong> (RGB shift lens fake), <strong>Motion Blur</strong>, <strong>Depth of Field</strong>, <strong>Lens Flare</strong>, <strong>Film Grain</strong>, <strong>Sharpening / Noise Reduction</strong>. Combine multiple effects → distinctive visual style.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Post Processing vs Color Grading vs Compositing</span>
    <p><strong>Post Processing</strong>: broad — all effect after main render. <strong>Color Grading</strong>: specifically color adjustment. <strong>Compositing</strong>: combine multiple layer (more general). Color grading IS subset of post processing. Compositing often includes post processing as final step.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Bloom</strong> — glow around bright</li>
    <li><strong>Color Grading</strong> — color shift</li>
    <li><strong>Tone Mapping</strong> — HDR to display</li>
    <li><strong>Vignette</strong> — corner darkening</li>
    <li><strong>Motion Blur</strong> — movement blur</li>
    <li><strong>DOF</strong> — depth of field blur</li>
    <li><strong>Chromatic Aberration</strong> — color fringing</li>
    <li><strong>Film Grain</strong> — texture add</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"post processing bloom color grade vignette game engine"</span>
    </div>
    <p class="arc-image-caption">Post Processing — image enhancement after main render</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Common Post Effects</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Bloom</summary>
      <div class="arc-card-body">
        <p>Glow around bright area — sun, lamp, hot metal. Simulate lens behavior with bright light. Subtle bloom = realistic, heavy bloom = stylized.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tone Mapping</summary>
      <div class="arc-card-body">
        <p>Map HDR (linear) render to display SDR range. ACES tone mapping film-quality standard. Compress dynamic range cho monitor display.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Grading</summary>
      <div class="arc-card-body">
        <p>Adjust hue, saturation, contrast. LUT apply preset look. Match scene tone (warm sunset, cool night). Most impactful post effect.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Vignette</summary>
      <div class="arc-card-body">
        <p>Darken edges, brighter center. Focus attention. Cinematic feel. Common subtle in modern film.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Depth of Field</summary>
      <div class="arc-card-body">
        <p>Background blur. Simulate camera focus. Bokeh effect. Cinematic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Motion Blur</summary>
      <div class="arc-card-body">
        <p>Blur for moving object/camera. Simulate film shutter. Realistic motion. Per-object or full-screen.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Chromatic Aberration</summary>
      <div class="arc-card-body">
        <p>Color separation at frame edge. Simulate cheap lens. Stylistic — sci-fi, gritty look.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Film Grain</summary>
      <div class="arc-card-body">
        <p>Texture overlay. Analog film feel. Subtle add organic quality.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lens Flare / Anamorphic Streak</summary>
      <div class="arc-card-body">
        <p>Light artifact lens. JJ Abrams style. Cinematic. Use sparingly.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Post Per Software</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unreal Engine</h3>
    <ul class="arc-list">
      <li>Post Process Volume — comprehensive built-in</li>
      <li>Bloom, exposure, tone mapping, color grade, DOF</li>
      <li>Cinematic camera post effect</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unity</h3>
    <ul class="arc-list">
      <li>Post Processing v3 (Built-in / URP / HDRP)</li>
      <li>Volume system với profile</li>
      <li>Built-in effect comprehensive</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Blender</h3>
    <ul class="arc-list">
      <li>Compositing node editor</li>
      <li>Render layer post process</li>
      <li>Glare, color grade, vignette nodes</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photoshop</h3>
    <ul class="arc-list">
      <li>Camera Raw filter</li>
      <li>Curves, levels, color balance</li>
      <li>Standard photo post</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Lightroom</h3>
    <ul class="arc-list">
      <li>Photo-specific workflow</li>
      <li>Preset / develop module</li>
      <li>Mobile sync</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">DaVinci Resolve</h3>
    <ul class="arc-list">
      <li>Color page powerful</li>
      <li>Industry-standard video color grade</li>
      <li>Free version capable</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nuke / After Effects</h3>
    <ul class="arc-list">
      <li>Compositing application</li>
      <li>Heavy post on rendered passes</li>
      <li>VFX studio standard</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Best Practices</h2>
  <ul class="arc-list">
    <li><strong>Subtlety</strong> — most post effect best subtle, not in-your-face</li>
    <li><strong>Tone mapping first</strong> — set HDR range correctly</li>
    <li><strong>Color grade after tone map</strong> — work in display space</li>
    <li><strong>Reference</strong> — match reference film/photo look</li>
    <li><strong>Bloom over-used common</strong> — bright everywhere = washed out</li>
    <li><strong>Chromatic aberration sparingly</strong> — annoying if heavy</li>
    <li><strong>DOF stylistic choice</strong> — game often subtle, cinematic heavy</li>
    <li><strong>Vignette subtle</strong> — should not be obvious</li>
    <li><strong>Game performance</strong> — post processing cost GPU, optimize</li>
    <li><strong>Off button</strong> — always have post off comparison toggle</li>
  </ul>
</section>
`,
  },

  // 03. Post-Production
  {
    id: "b52879a8-2188-4d22-a131-0d65aa4f2abe",
    tieu_de: "Post-Production",
    tieu_de_viet: "Post Production (Hậu kỳ)",
    tom_tat:
      "Post-Production là giai đoạn sản xuất hậu kỳ ra thành phẩm cuối cùng của sản phẩm nghe nhìn — phim, MV, nhiếp ảnh, âm nhạc — sau khi production phase chính kết thúc.",
    meta_title:
      "Post-Production là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Post-Production trong phim, video, music. Tìm hiểu editing, color grading, sound design, VFX integration cho final delivery.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn shooting phim — actor performance done, camera wrap. Now phase second of production begins: <strong>Post-Production</strong>. Editor cut shot together, colorist grade, sound designer add effect, composer score music, VFX artist integrate CG. Months of work transform raw footage thành finished film. Post = nơi film truly born.</p>
  <p>Post-Production là kiến thức essential cho mọi creative working in media. Hiểu phase từ rough cut đến final delivery, role hierarchy, software workflow giúp navigate film/video industry effectively. Career options multi — editor, colorist, sound designer, VFX, music.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Post-Production là gì?</h2>
  <p>Post-Production là <strong>final phase</strong> của filmmaking/video production — sau khi principal photography (production phase) wrap. Includes: <strong>Editing</strong> (cut footage), <strong>Color Grading</strong> (look development), <strong>Sound Design</strong> (effect, foley), <strong>Music</strong> (score, song), <strong>VFX</strong> (visual effect integration), <strong>Mix</strong> (sound balance), <strong>Mastering</strong> (final delivery prep). Multi-month process for feature film.</p>
  <p>Different industry similar pattern: <strong>Film</strong>: theatrical delivery, DCP, IMAX. <strong>TV</strong>: episodic, broadcast spec. <strong>Music Video</strong>: short, music-driven. <strong>Photography</strong>: editing, retouching. <strong>Music</strong>: mixing, mastering. Concept của &quot;post&quot; cross-industry. Post often takes longer than shooting itself.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Pre-Production vs Production vs Post-Production</span>
    <p><strong>Pre</strong>: plan, design, prep (script, casting, storyboard). <strong>Production</strong>: shooting, main creation. <strong>Post</strong>: editing, finishing. Three-phase model standard across industry. Mistake at pre = expensive to fix in production; mistake at production = expensive to fix in post. Plan well.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Editing / Cutting</strong> — assemble shot</li>
    <li><strong>Color Grading</strong> — look development</li>
    <li><strong>Sound Design</strong> — effect, foley</li>
    <li><strong>Music / Score</strong> — composition</li>
    <li><strong>VFX Integration</strong> — CG composite</li>
    <li><strong>Mix</strong> — sound balance final</li>
    <li><strong>DI (Digital Intermediate)</strong> — color finishing</li>
    <li><strong>Mastering / Delivery</strong> — final format output</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"post production editing color grading sound film studio"</span>
    </div>
    <p class="arc-image-caption">Post-Production — phase transform raw footage thành final film</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Post-Production Phases</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Editing (Picture Edit)</summary>
      <div class="arc-card-body">
        <p>Editor assemble shot from raw footage. Rough cut → fine cut → locked cut. Premiere, Avid, DaVinci Resolve. Editor often role most influential cho final feel. Months of work.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. VFX Integration</summary>
      <div class="arc-card-body">
        <p>VFX shot turned over to VFX house. Tracking, CG creation, compositing. Months for blockbuster. Coordination với editorial.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Sound Design</summary>
      <div class="arc-card-body">
        <p>Foley artist (footstep, cloth), sound effect (explosion), dialogue ADR (re-record). Build sound layer per scene.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Music / Score</summary>
      <div class="arc-card-body">
        <p>Composer write score to picture. Spot session với director. Record orchestra. Often final phase to lock.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Color Grading / DI</summary>
      <div class="arc-card-body">
        <p>Colorist work với director develop look. Match shot, scene mood. DaVinci Resolve industry standard. 1-2 week feature film.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Mix</summary>
      <div class="arc-card-body">
        <p>Re-recording mixer balance dialogue, sound effect, music. Stereo, 5.1, 7.1, Dolby Atmos format. Final sound deliverable.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>7. Mastering / Delivery</summary>
      <div class="arc-card-body">
        <p>Final format export — DCP cho theatrical, ProRes cho TV, web formats cho streaming. QC (Quality Control) check.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Roles trong Post</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Editor</h3>
    <ul class="arc-list">
      <li>Cut footage together</li>
      <li>Pacing, rhythm decision</li>
      <li>Premiere, Avid, Resolve</li>
      <li>$70K-200K depending on level</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Assistant Editor</h3>
    <ul class="arc-list">
      <li>Organize footage</li>
      <li>Sync sound</li>
      <li>Bin organization</li>
      <li>$45K-70K entry path</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Colorist</h3>
    <ul class="arc-list">
      <li>Color grade entire film</li>
      <li>DaVinci Resolve expert</li>
      <li>Develop look với director</li>
      <li>$60K-250K, top colorist millions</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Sound Designer</h3>
    <ul class="arc-list">
      <li>Create sound effect, atmosphere</li>
      <li>Pro Tools standard</li>
      <li>Foley supervision</li>
      <li>$50K-130K</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX Supervisor</h3>
    <ul class="arc-list">
      <li>Oversee VFX shot production</li>
      <li>Coordinate vendor</li>
      <li>$120K-300K</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Re-recording Mixer</h3>
    <ul class="arc-list">
      <li>Final sound mix</li>
      <li>Balance dialogue, music, SFX</li>
      <li>Atmos certified for premium</li>
      <li>$80K-200K</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Post Producer</h3>
    <ul class="arc-list">
      <li>Manage entire post phase</li>
      <li>Budget, schedule, vendor</li>
      <li>$80K-150K</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Post-Production</h2>
  <ul class="arc-list">
    <li><strong>Lock picture before final sound/score</strong> — editor changes ripple sound work</li>
    <li><strong>Color grade after VFX</strong> — VFX shot integrated then grade entire</li>
    <li><strong>Backup everything</strong> — multiple redundant drive</li>
    <li><strong>Proxy workflow</strong> — edit low-res proxy, conform to high-res before color</li>
    <li><strong>Daily backup</strong> — losing project devastating</li>
    <li><strong>Approval document</strong> — chain of approval signed</li>
    <li><strong>QC at every step</strong> — find issue early</li>
    <li><strong>Delivery spec early</strong> — know format requirement</li>
    <li><strong>Time management</strong> — post always takes longer than estimated</li>
    <li><strong>Career start as AE (Assistant Editor)</strong> — learn workflow then editor</li>
  </ul>
</section>
`,
  },

  // 04. Pre-Production
  {
    id: "8aaa6cda-cc5f-4d27-9205-5300e2f797a5",
    tieu_de: "Pre-Production",
    tieu_de_viet: "Pre-Production (Tiền sản xuất)",
    tom_tat:
      "Pre-Production là giai đoạn lập kế hoạch chi tiết cho dự án — bao gồm script, character design, storyboard, location scout — chuẩn bị mọi thứ trước khi production phase chính bắt đầu.",
    meta_title:
      "Pre-Production là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Pre-Production phim, game, animation. Tìm hiểu script, storyboard, concept art, schedule và planning essentials.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn muốn làm short film. Bạn pick up camera ngày mai và shoot? Disaster. Thiếu script, không có cast, location chưa scout, không có equipment plan. Result: chaos on set, footage unusable. Đó là why <strong>Pre-Production</strong> exists — phase planning critical trước khi production. Saying: &quot;Every hour in pre saves 10 hour in production.&quot;</p>
  <p>Pre-Production là kiến thức essential cho mọi filmmaker, animator, game developer, marketer. Hiểu phase, deliverable, role giúp plan project effective — save time, money, stress trong production. Foundation cho professional creative work.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Pre-Production là gì?</h2>
  <p>Pre-Production là <strong>planning phase</strong> trước khi expensive production begin. Includes <strong>creative development</strong> (script, design, storyboard), <strong>logistical preparation</strong> (location scout, casting, equipment), <strong>budgeting &amp; scheduling</strong>, <strong>contracts &amp; legal</strong>. Goal: solve as many problem as possible on paper before commit production budget. Bad pre = production hell.</p>
  <p>Length varies massively: indie film 2-6 month, blockbuster 1-3 year, AAA game 1-2 year design phase, animation feature 1-2 year design. Investment in pre = exponential saving downstream. Pixar story said: spent 90% pre-production time, animation last few years.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Pre-Production Saves Money</span>
    <p>Industry rule: cost of fixing problem increases 10x each phase. Script change in pre = cheap. Script change during shoot = expensive. Script change in post = catastrophic. Pre fixes future problem cheaply.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Script</strong> — story foundation</li>
    <li><strong>Storyboard</strong> — visual planning</li>
    <li><strong>Concept Art</strong> — design</li>
    <li><strong>Character Design</strong> — visual character</li>
    <li><strong>Location Scout</strong> — find shooting place</li>
    <li><strong>Casting</strong> — select actor</li>
    <li><strong>Schedule</strong> — daily shoot plan</li>
    <li><strong>Budget</strong> — financial planning</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"pre production storyboard concept art script planning film"</span>
    </div>
    <p class="arc-image-caption">Pre-Production — planning phase, save expensive problem later</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Pre-Production Deliverables</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Script / Screenplay</summary>
      <div class="arc-card-body">
        <p>Written narrative. Multiple draft. &quot;Locked script&quot; before production. Industry format Final Draft, Celtx. 110 page = 110 minute typical.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Storyboard</summary>
      <div class="arc-card-body">
        <p>Panel-by-panel visual breakdown. Each shot drawn. Animation feature thousands of panel. Live-action storyboard key sequence only.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Concept Art</summary>
      <div class="arc-card-body">
        <p>Visual development. Character, environment, props. Establishes mood, style. Multi-iteration with director feedback.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Character Design</summary>
      <div class="arc-card-body">
        <p>Animation, game — model sheet, turnaround, expression sheet. Define character visually before sculpt/model.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animatic</summary>
      <div class="arc-card-body">
        <p>Storyboard with timing — animated rough cut from boards. Test pacing before expensive animation/shoot.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Location Scout</summary>
      <div class="arc-card-body">
        <p>Visit and photo potential shoot location. Permits, access, logistics. Live-action critical phase.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Casting</summary>
      <div class="arc-card-body">
        <p>Audition actor. Director, casting director select. Animation — voice actor.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Schedule / Call Sheet</summary>
      <div class="arc-card-body">
        <p>Daily plan — what shoot when, who present, equipment. Hours of detail per shoot day.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Budget Breakdown</summary>
      <div class="arc-card-body">
        <p>Cost per category — cast, crew, equipment, location, post. Above-the-line, below-the-line breakdown.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Pre-Production Per Industry</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Live-Action Film</h3>
    <ul class="arc-list">
      <li>Script → casting → location scout → schedule</li>
      <li>Storyboard key scene</li>
      <li>Production design (set, costume)</li>
      <li>Crew hire</li>
      <li>2-12 month pre</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation Feature</h3>
    <ul class="arc-list">
      <li>Script + many revision</li>
      <li>Visual development heavy (months)</li>
      <li>Character design, environment design</li>
      <li>Animatic from storyboards</li>
      <li>Voice recording rough</li>
      <li>1-2 year pre</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Development</h3>
    <ul class="arc-list">
      <li>Game Design Document (GDD)</li>
      <li>Concept art</li>
      <li>Technical design</li>
      <li>Prototype gameplay</li>
      <li>Vertical slice</li>
      <li>1-3 year pre AAA</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Commercial / Music Video</h3>
    <ul class="arc-list">
      <li>Treatment (visual pitch document)</li>
      <li>Storyboard</li>
      <li>Location scout</li>
      <li>Casting</li>
      <li>2-4 week pre typical</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photography Project</h3>
    <ul class="arc-list">
      <li>Mood board</li>
      <li>Location scout</li>
      <li>Talent</li>
      <li>Shot list</li>
      <li>Days-weeks pre</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Graphics / Animation Short</h3>
    <ul class="arc-list">
      <li>Brief / brainstorm</li>
      <li>Style frame</li>
      <li>Animatic</li>
      <li>Asset preparation</li>
      <li>Days-weeks pre</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Pre-Production</h2>
  <ul class="arc-list">
    <li><strong>Time in pre = saving in production</strong> — invest properly</li>
    <li><strong>Lock script first</strong> — design follows story</li>
    <li><strong>Visual reference critical</strong> — moodboard everywhere</li>
    <li><strong>Storyboard test pacing</strong> — animatic catch problem</li>
    <li><strong>Schedule realistic</strong> — buffer 20% buffer</li>
    <li><strong>Budget contingency</strong> — 10-20% reserve for surprise</li>
    <li><strong>Clear approval</strong> — sign off each phase</li>
    <li><strong>Storyboard cheap, reshoot expensive</strong> — solve in pre</li>
    <li><strong>Talk to crew early</strong> — VFX supervisor input on storyboard</li>
    <li><strong>Don&apos;t rush pre</strong> — pressure to start shooting common, resist</li>
  </ul>
</section>
`,
  },

  // 05. Pre-viz
  {
    id: "f9c96792-7e45-4435-a688-ac611c091108",
    tieu_de: "Pre-Visualization (Pre-viz)",
    tieu_de_viet: "Pre-viz (Hình dung trước cảnh quay)",
    tom_tat:
      "Pre-viz là phiên bản hoạt hình 3D giản lược của cảnh quay trước khi quay thật — dùng để lên kế hoạch camera, blocking, VFX shot trước khi production tốn kém bắt đầu.",
    meta_title: "Pre-viz là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Pre-viz trong film, VFX. Tìm hiểu workflow Unreal Engine virtual production, blocking shot, camera plan trước production.",
    noi_dung: `
<section class="arc-intro">
  <p>Marvel director plan Avengers battle scene — 50 character, multiple camera, complex choreography. Storyboard helpful but 2D, static. Solution: <strong>Pre-viz</strong> — 3D animation rough của entire scene trong Maya/Unreal. Director can see camera angle, timing, choreography trước khi expensive shoot day. Save millions of dollars khi catch problem early.</p>
  <p>Pre-viz là kỹ thuật essential cho blockbuster film, VFX-heavy production. Hiểu workflow, software, role trong pipeline giúp navigate modern film production. Increasingly important cho virtual production, LED wall (Mandalorian style).</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Pre-viz là gì?</h2>
  <p>Pre-viz (Pre-visualization) là <strong>rough 3D animation</strong> tạo trước khi production thật bắt đầu, để visualize scene, plan shot, test idea. Quality không cao — focus is composition, timing, camera, blocking, không photorealistic. Pre-viz typically uses Maya, Cinema 4D, hoặc modern Unreal Engine. Lower-quality but complete coverage shot allows director assess sequence whole.</p>
  <p>Different scope: <strong>Storyboard pre-viz</strong> (after storyboard, animatic), <strong>Production pre-viz</strong> (shot design, camera angle), <strong>Tech-viz</strong> (technical analysis — crane reach, camera move feasible), <strong>Post-viz</strong> (VFX preview during edit). Big-budget VFX film increasingly heavy pre-viz dependency.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Pre-viz vs Storyboard vs Animatic</span>
    <p><strong>Storyboard</strong>: 2D drawing per shot. <strong>Animatic</strong>: storyboard with timing/sound. <strong>Pre-viz</strong>: 3D animation rough — actual camera angle, blocking, full motion. Pre-viz most accurate planning tool — exact dimension, scale, physics.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Storyboard Pre-viz</strong> — after board, complete sequence</li>
    <li><strong>Production Pre-viz</strong> — shot design</li>
    <li><strong>Tech-viz</strong> — technical feasibility</li>
    <li><strong>Post-viz</strong> — VFX preview during edit</li>
    <li><strong>Virtual Camera</strong> — director moves camera trong 3D</li>
    <li><strong>Motion Control</strong> — pre-viz drives camera on set</li>
    <li><strong>LED Wall Pre-viz</strong> — Mandalorian style</li>
    <li><strong>Virtual Production</strong> — modern combine pre-viz và shoot</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"previz 3D animation film planning virtual production unreal"</span>
    </div>
    <p class="arc-image-caption">Pre-viz — 3D rough scene preview, plan complex production</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Pre-viz Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Storyboard Pre-viz</summary>
      <div class="arc-card-body">
        <p>Quick blocking based on storyboard. Test sequence works in 3D. Find issue with camera angle, scale. Days-week per sequence.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Production Pre-viz</summary>
      <div class="arc-card-body">
        <p>Detailed shot design. Exact camera lens, focal length. Director plan each shot. Shared với DP, gaffer, AD.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stunt Pre-viz</summary>
      <div class="arc-card-body">
        <p>Plan stunt sequence — fight choreography, vehicle stunt. Critical safety planning. Coordinate stunt team.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VFX Pre-viz</summary>
      <div class="arc-card-body">
        <p>Plan VFX-heavy shot. CG character interaction with actor. Communicate VFX house early.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tech-viz</summary>
      <div class="arc-card-body">
        <p>Engineering analysis. Crane reach? Steadicam path? Camera dolly track location? Practical feasibility.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Post-viz</summary>
      <div class="arc-card-body">
        <p>During edit, rough VFX placeholder. Editor cut with approximate. Refined later. Help pacing decision.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Virtual Production (LED Wall)</summary>
      <div class="arc-card-body">
        <p>Mandalorian innovation. Real-time Unreal Engine on LED wall. Pre-viz becomes actual environment. Revolutionary.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Pre-viz</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Storyboard Reference</h3>
    <ul class="arc-list">
      <li>Start with storyboard</li>
      <li>Animatic for timing</li>
      <li>Direction notes</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Asset Library</h3>
    <ul class="arc-list">
      <li>Low-poly character (often rigged template)</li>
      <li>Set / environment rough</li>
      <li>Prop, vehicle simple model</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Block Scene</h3>
    <ul class="arc-list">
      <li>Place character in environment</li>
      <li>Rough animation (motion capture từ ref or keyframe)</li>
      <li>Position prop</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Camera Setup</h3>
    <ul class="arc-list">
      <li>Multiple virtual camera</li>
      <li>Match real lens (35mm, 50mm)</li>
      <li>Match crane / dolly path</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Animation Pass</h3>
    <ul class="arc-list">
      <li>Rough motion for character</li>
      <li>Stunt choreography</li>
      <li>Action timing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Director Review</h3>
    <ul class="arc-list">
      <li>Director walk through pre-viz</li>
      <li>Adjust camera, blocking</li>
      <li>Iterate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Render &amp; Output</h3>
    <ul class="arc-list">
      <li>Low-quality fast render</li>
      <li>Distribute to crew</li>
      <li>Reference on set</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Update Iteratively</h3>
    <ul class="arc-list">
      <li>Script change → update pre-viz</li>
      <li>New idea from director</li>
      <li>Living document</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Software &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Maya</strong> — traditional pre-viz tool</li>
    <li><strong>Unreal Engine</strong> — modern realtime, increasingly dominant</li>
    <li><strong>Cinema 4D</strong> — motion graphics pre-viz</li>
    <li><strong>iClone</strong> — fast character animation, pre-viz-friendly</li>
    <li><strong>Halon Entertainment</strong> — top pre-viz studio</li>
    <li><strong>The Third Floor</strong> — leading pre-viz house</li>
    <li><strong>Proof Inc</strong> — pre-viz, virtual production</li>
    <li><strong>Pre-viz artist</strong>: $50K-110K, senior $130K+</li>
    <li><strong>Virtual production growing</strong> — Mandalorian, House of Dragon</li>
    <li><strong>Mocap suit</strong> integrate với pre-viz rapid blocking</li>
  </ul>
</section>
`,
  },

  // 06. Presets
  {
    id: "1da80f17-b2f4-45a9-bca0-d6924af774d3",
    tieu_de: "Presets",
    tieu_de_viet: "Presets (Cài đặt sẵn)",
    tom_tat:
      "Presets là tập hợp các thiết lập đã được lưu trước — cho phép áp dụng nhanh chóng các hiệu ứng, bộ lọc, hoặc điều chỉnh màu sắc cho hình ảnh, video, hoặc animation.",
    meta_title: "Presets là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Presets cho Photoshop, Lightroom, AE, Premiere. Tìm hiểu cách tạo, install và sử dụng preset hiệu quả cho workflow.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn Lightroom edit 300 photo wedding — apply individual setting per photo = vô tận. Hoặc apply <strong>preset</strong> đã save từ before — one click, photo grade unified style. Photographer use preset productivity multiplier. Motion designer use AE animation preset save complex setting. Color grader use LUT preset. Preset = save time, consistency.</p>
  <p>Preset là kỹ thuật essential cho mọi creative professional working in repeating workflow. Hiểu cách create, organize, license preset giúp tăng productivity đáng kể — distinguish efficient pro vs slow amateur. Plus: license selling preset = income stream.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Presets là gì?</h2>
  <p>Presets là <strong>saved configuration</strong> của setting / parameter cho specific software. Apply preset với one click reproduces all setting saved. Examples: <strong>Lightroom preset</strong> (camera raw setting), <strong>Photoshop action</strong> (sequence of step), <strong>AE animation preset</strong> (keyframe + property), <strong>Premiere preset</strong> (effect + setting), <strong>LUT</strong> (color grading lookup table), <strong>Brush preset</strong> (brush configuration).</p>
  <p>Preset come from: <strong>Built-in</strong> (software ship with default preset), <strong>Self-created</strong> (save own setup for reuse), <strong>Free downloads</strong> (community share), <strong>Paid marketplace</strong> (premium preset pack). Industry massive — Lightroom preset business alone billion dollar industry. Influencer sell own Lightroom preset.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Preset vs Template vs Plugin</span>
    <p><strong>Preset</strong>: saved setting within software. <strong>Template</strong>: complete project file with structure (AE project, .psd file). <strong>Plugin</strong>: third-party software extending capability. Preset light, template heavy, plugin permanent install.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Lightroom Preset</strong> — photo color grade</li>
    <li><strong>Photoshop Action</strong> — automated sequence</li>
    <li><strong>AE Animation Preset</strong> — saved keyframe</li>
    <li><strong>Premiere Preset</strong> — effect setting</li>
    <li><strong>LUT</strong> — color grading lookup table</li>
    <li><strong>Brush Preset</strong> — brush configuration</li>
    <li><strong>Procreate Brush</strong> — iPad brush set</li>
    <li><strong>Final Cut Pro Preset</strong> — Mac editing</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"presets lightroom photoshop after effects productivity"</span>
    </div>
    <p class="arc-image-caption">Presets — saved configuration, productivity multiplier</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Preset Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Lightroom Preset</summary>
      <div class="arc-card-body">
        <p>Develop module setting — exposure, color, tone curve. Most popular preset category. Influencer sell signature look. Mobile Lightroom popular cho social media.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photoshop Action</summary>
      <div class="arc-card-body">
        <p>Recorded sequence of step. Apply automatically. Batch process. Industry standard cho repeating workflow (skin smooth, photo retouch).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>After Effects Animation Preset</summary>
      <div class="arc-card-body">
        <p>Save effect chain + animation keyframe. Apply text title animation, motion blur setup, etc. Hugely productive cho motion designer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>LUT (Look-Up Table)</summary>
      <div class="arc-card-body">
        <p>Color grade lookup mathematical. .cube file format. Apply in Premiere, Resolve, AE, Photoshop. Film stock emulation popular.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Premiere Preset</summary>
      <div class="arc-card-body">
        <p>Effect preset cho video editor. Color, transition, motion. Less popular than AE preset.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Resolve Powergrade</summary>
      <div class="arc-card-body">
        <p>DaVinci Resolve saved grade. Apply node tree. Colorist productivity.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Procreate Brush</summary>
      <div class="arc-card-body">
        <p>iPad illustration brush. Marketplace artist sell brush set. Affordable, popular.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Capture One Style</summary>
      <div class="arc-card-body">
        <p>Capture One photo software preset. Pro photographer alternative to Lightroom.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Tạo Custom Preset</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Develop Look First</h3>
    <ul class="arc-list">
      <li>Work on representative photo / project</li>
      <li>Tune setting carefully</li>
      <li>Test on multiple image</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Save as Preset</h3>
    <ul class="arc-list">
      <li>Lightroom: Develop → New Preset</li>
      <li>Photoshop: Action panel → New Action</li>
      <li>AE: Animation → Save Animation Preset</li>
      <li>Naming convention important</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Test Application</h3>
    <ul class="arc-list">
      <li>Apply to many different image/project</li>
      <li>Check works across condition</li>
      <li>Refine if needed</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Organize</h3>
    <ul class="arc-list">
      <li>Folder structure</li>
      <li>Naming theme — &quot;Sunset Warm&quot;, &quot;Moody Cinematic&quot;</li>
      <li>Group by use case</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Export / Share</h3>
    <ul class="arc-list">
      <li>Lightroom: .xmp file</li>
      <li>Photoshop: .atn file</li>
      <li>AE: .ffx file</li>
      <li>LUT: .cube file</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. License / Sell</h3>
    <ul class="arc-list">
      <li>Sellfy, Gumroad marketplace</li>
      <li>Own website</li>
      <li>Bundle 10-50 preset typical pack</li>
      <li>$10-100 per pack</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Preset</h2>
  <ul class="arc-list">
    <li><strong>Don&apos;t rely 100% preset</strong> — adjust per image</li>
    <li><strong>Preset is starting point</strong> — fine-tune always needed</li>
    <li><strong>Quality preset</strong> = developed careful, work on many condition</li>
    <li><strong>Build personal library</strong> = signature look</li>
    <li><strong>Subscription preset</strong> — VSCO, Lightroom mobile preset</li>
    <li><strong>Influencer preset</strong> — popular but often overpriced</li>
    <li><strong>Free quality preset</strong> — Adobe community, photography forum</li>
    <li><strong>AE preset essential</strong>: Motion 4, Plugin Everything, Mister Horse</li>
    <li><strong>LUT free</strong>: Lutify.me free pack, IWLTBAP</li>
    <li><strong>Backup preset</strong> — copy preset folder to cloud</li>
  </ul>
</section>
`,
  },

  // 07. Procedural Animation
  {
    id: "890a6836-820c-47b8-a31b-0d2fd6b76148",
    tieu_de: "Procedural Animation",
    tieu_de_viet: "Animation Procedural",
    tom_tat:
      "Procedural Animation là kỹ thuật tạo hoạt ảnh bằng cách sử dụng thuật toán và quy tắc — thay vì keyframe thủ công từng frame — giúp chuyển động tự nhiên và scalable.",
    meta_title:
      "Procedural Animation là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Procedural Animation game, simulation. Tìm hiểu IK, ragdoll, physics-based animation và workflow trong Houdini, Unreal.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn play game Death Stranding — Sam (Norman Reedus) walk on uneven terrain, mỗi step adjust theo ground. Hand grab onto rope dynamically. Body lean theo backpack weight. Traditional keyframe impossible cover mọi situation. Đó là <strong>Procedural Animation</strong> — algorithm tạo motion realtime, react với environment, infinite variation.</p>
  <p>Procedural Animation là kỹ thuật advanced cho game animator, technical animator. Hiểu IK, physics-based animation, dynamic system giúp create natural character motion respond environment — distinguish modern game animation từ static keyframe. Critical cho realistic gameplay.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Procedural Animation là gì?</h2>
  <p>Procedural Animation là <strong>motion generated by algorithm</strong> rather than artist-keyframed. Algorithm respond environment, input, state — generate appropriate motion runtime. Foundation: animation hệ thống systematic, parameterized, scalable. Combine với <strong>traditional keyframed animation</strong> tạo hybrid system — character animation drive base, procedural layer adjust per situation.</p>
  <p>Common technique: <strong>IK (Inverse Kinematics)</strong> — foot stick to ground, hand reach object. <strong>Physics-based</strong> — ragdoll, cloth, hair simulate physics. <strong>Procedural Generation</strong> — algorithm generate animation cycle. <strong>Locomotion System</strong> — foot placement adapting terrain. <strong>AI-Driven</strong> — machine learning generate motion (NaturalMotion, Cascadeur).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Procedural vs Keyframe Animation</span>
    <p><strong>Keyframe</strong>: animator artistically craft each pose. Beautiful, controlled. Doesn&apos;t scale. <strong>Procedural</strong>: algorithm generate motion. Scales infinitely, react environment. Less artistic control. Modern game: combine both — keyframe base layer + procedural detail.</p>
  </div>

  <ul class="arc-list">
    <li><strong>IK (Inverse Kinematics)</strong> — joint solved backward</li>
    <li><strong>Ragdoll</strong> — physics body simulation</li>
    <li><strong>Cloth Simulation</strong> — clothing</li>
    <li><strong>Foot IK</strong> — foot terrain-adaptive</li>
    <li><strong>Lookat</strong> — head tracking</li>
    <li><strong>Spring Physics</strong> — secondary motion</li>
    <li><strong>Procedural Walk Cycle</strong></li>
    <li><strong>Animation Blending</strong> — combine multiple</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"procedural animation game IK ragdoll character motion"</span>
    </div>
    <p class="arc-image-caption">Procedural Animation — algorithm-generated motion, react environment</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Procedural Techniques</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Foot IK</summary>
      <div class="arc-card-body">
        <p>Foot adapt terrain — stand on slope, foot adjust automatically. No floating on slope. Critical cho modern game realism.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ragdoll</summary>
      <div class="arc-card-body">
        <p>Character body physics simulate when ragdoll mode (death, knockout). Limbs flop realistically. PhysX, Bullet physics.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cloth Simulation</summary>
      <div class="arc-card-body">
        <p>Cape, skirt, scarf react to motion. Wind, gravity. Marvelous Designer, NVidia PhysX cloth.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hair Physics</summary>
      <div class="arc-card-body">
        <p>Hair strand dynamic. Wind, motion. Expensive but realistic. AAA game high-end.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lookat / Head Tracking</summary>
      <div class="arc-card-body">
        <p>Character head turn toward interest. Eyes follow object. Subtle but adds life.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Aim Pose</summary>
      <div class="arc-card-body">
        <p>Spine adjust aim direction. FPS weapon point per mouse. Procedural blend several pose.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Procedural Walk Cycle</summary>
      <div class="arc-card-body">
        <p>Algorithm generate walk based on speed, terrain. Spider with 8 leg easier procedural than keyframe.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Motion Matching</summary>
      <div class="arc-card-body">
        <p>Modern technique. Database of motion, runtime pick closest match given current state. EA Sports games. Smoother than blend.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>ML-Powered (Cascadeur)</summary>
      <div class="arc-card-body">
        <p>AI generate physically-accurate animation. Assist animator. Tool of future.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Use Cases</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Character</h3>
    <ul class="arc-list">
      <li>Foot adapt uneven terrain</li>
      <li>Hand grab object dynamically</li>
      <li>Head look at NPC speaking</li>
      <li>Ragdoll on death</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Creatures / Animals</h3>
    <ul class="arc-list">
      <li>Spider 8 legs — keyframe impossible</li>
      <li>Snake undulation</li>
      <li>Bird wing flap respond wind</li>
      <li>Fish swim with current</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Crowd</h3>
    <ul class="arc-list">
      <li>Hundreds NPCs — keyframe impossible</li>
      <li>Procedural walk cycle</li>
      <li>Houdini Crowd</li>
      <li>Massive (Lord of the Rings)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cloth / Hair</h3>
    <ul class="arc-list">
      <li>Cape flow</li>
      <li>Hair sway</li>
      <li>Realistic clothing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Destruction</h3>
    <ul class="arc-list">
      <li>Building collapse physics</li>
      <li>Debris scatter</li>
      <li>Houdini RBD simulation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Locomotion System</h3>
    <ul class="arc-list">
      <li>Character walk → run → jump blend</li>
      <li>Speed-based</li>
      <li>Direction blend</li>
      <li>Modern game character system</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Future</h2>
  <ul class="arc-list">
    <li><strong>Unreal Engine</strong> — Control Rig, Motion Matching</li>
    <li><strong>Unity</strong> — Animation Rigging, IK</li>
    <li><strong>Houdini</strong> — KineFX procedural rig</li>
    <li><strong>Maya</strong> — built-in IK, custom MEL script</li>
    <li><strong>NVidia PhysX</strong> — physics simulation</li>
    <li><strong>Marvelous Designer</strong> — cloth simulation</li>
    <li><strong>Cascadeur</strong> — AI-assisted animation</li>
    <li><strong>NaturalMotion Endorphin</strong> — motion synthesis</li>
    <li><strong>Career Tech Animator</strong>: $70K-150K</li>
    <li><strong>Future</strong>: ML-generated animation increasing, hybrid approach standard</li>
  </ul>
</section>
`,
  },

  // 08. Procedural Materials
  {
    id: "822f65fb-253f-4526-81f5-3ae7b0758f5f",
    tieu_de: "Procedural Materials",
    tieu_de_viet: "Vật liệu Procedural",
    tom_tat:
      "Procedural Materials là vật liệu tạo ra bằng thuật toán thay vì dựa trên ảnh bitmap — cho phép tạo texture phức tạp resolution-independent, tileable infinitely, parameterized.",
    meta_title:
      "Procedural Materials là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Procedural Materials trong Substance Designer, Blender. Tìm hiểu node-based workflow, infinite resolution và parameter control.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn cần wood texture cho 3D model. Approach 1: photograph wood, retouch. Resolution fixed, tile issue. Approach 2: <strong>Procedural Materials</strong> — generate wood algorithmically trong Substance Designer. Infinite resolution, tile perfect, parameter adjustable (warm to cold tone, grain density). Industry shift toward procedural materials cho production.</p>
  <p>Procedural Materials là kỹ năng essential cho 3D artist, game artist, VFX artist. Hiểu node-based workflow, software (Substance Designer, Blender shader), workflow giúp create flexible, scalable materials. Critical cho modern 3D pipeline — game, film, archviz, automotive.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Procedural Materials là gì?</h2>
  <p>Procedural Materials là material/texture generated by <strong>algorithm and procedural function</strong> rather than bitmap image. Built bằng <strong>noise function</strong> (Perlin, Voronoi, Worley), <strong>pattern generator</strong>, <strong>filter / blend node</strong>, <strong>color ramp</strong>. Result: texture infinitely resolution-independent (zoom in unlimited detail), tileable seamlessly, parameter-controlled (adjust wood color, age, wetness via slider).</p>
  <p>Industry standard tool: <strong>Substance Designer</strong> (Adobe, formerly Allegorithmic) — node-based procedural material creation. Output: textures cho any 3D software. Alternative: <strong>Blender Shader Editor</strong> (node-based built-in), <strong>Unreal Material Editor</strong>, <strong>Houdini</strong>. Substance shipped với massive material library, foundation cho modern game/film texturing.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Procedural vs Bitmap Texture</span>
    <p><strong>Bitmap</strong>: photo-based, fixed resolution, tile may seam, limited variation. <strong>Procedural</strong>: algorithm-generated, infinite resolution, perfect tile, infinite variation through parameter. Bitmap simpler, procedural more flexible. Modern hybrid: photo input + procedural processing.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Noise Function</strong> — Perlin, Voronoi</li>
    <li><strong>Pattern Generator</strong> — built-in pattern</li>
    <li><strong>Filter Node</strong> — modify input</li>
    <li><strong>Blend Mode</strong> — combine layers</li>
    <li><strong>Substance Designer</strong> — industry standard</li>
    <li><strong>Parameter (Slider)</strong> — adjust live</li>
    <li><strong>Tileable / Seamless</strong> — repeat perfectly</li>
    <li><strong>Resolution Independent</strong> — any size</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"procedural materials substance designer node-based shader texture"</span>
    </div>
    <p class="arc-image-caption">Procedural Materials — algorithm-generated, infinite resolution</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Software &amp; Tools</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Substance Designer</summary>
      <div class="arc-card-body">
        <p>Industry standard procedural material. Node-based. Export PBR map cho any 3D engine. $299 perpetual or subscription. Used by game studio, VFX house, automotive.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Substance Painter</summary>
      <div class="arc-card-body">
        <p>Complement to Designer. Paint material directly on 3D model. Texture work pipeline.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender Shader Editor</summary>
      <div class="arc-card-body">
        <p>Free, node-based. Procedural material possible. Less feature than Designer but accessible. Active community.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unreal Engine Material</summary>
      <div class="arc-card-body">
        <p>Engine material editor. Node-based procedural. Generate texture inside engine. Performance optimal cho game.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Houdini</summary>
      <div class="arc-card-body">
        <p>Procedural everything. Material via SOP, COP. Complex generation possible. Steep learning.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Material Maker (Free)</summary>
      <div class="arc-card-body">
        <p>Open-source Substance Designer alternative. Free, capable. Good cho hobbyist.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mari</summary>
      <div class="arc-card-body">
        <p>Foundry texturing software. Used VFX feature film. Some procedural capability.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Substance Designer</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Reference</h3>
    <ul class="arc-list">
      <li>Photo of target material</li>
      <li>Analyze: shape, color, pattern</li>
      <li>Break down components</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Base Shape</h3>
    <ul class="arc-list">
      <li>Start với noise or pattern generator</li>
      <li>Foundation of material</li>
      <li>Perlin noise cho organic, Voronoi cho cell</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Add Detail</h3>
    <ul class="arc-list">
      <li>Multiple noise layer combined</li>
      <li>Filter sharpen, blur</li>
      <li>Vary scale, intensity</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Generate Maps</h3>
    <ul class="arc-list">
      <li>Albedo (color)</li>
      <li>Roughness</li>
      <li>Normal map</li>
      <li>Height map</li>
      <li>AO</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Parameter Expose</h3>
    <ul class="arc-list">
      <li>Slider cho key parameter</li>
      <li>Color, wear, age, density</li>
      <li>Reusable material library</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Export &amp; Use</h3>
    <ul class="arc-list">
      <li>Export PBR map</li>
      <li>Import into 3D software / engine</li>
      <li>Apply with shader</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Iterate</h3>
    <ul class="arc-list">
      <li>Apply to model</li>
      <li>Render</li>
      <li>Tweak parameter back in Designer</li>
      <li>Re-export</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Use Cases &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Game asset</strong> — wood, metal, fabric, stone shipped tons in game</li>
    <li><strong>VFX environment</strong> — natural surface generated</li>
    <li><strong>Automotive viz</strong> — car paint, leather, dashboard</li>
    <li><strong>Archviz</strong> — building material library</li>
    <li><strong>Stylized art</strong> — non-realistic texture too</li>
    <li><strong>Substance Source</strong> — Adobe library, thousands materials free with subscription</li>
    <li><strong>ArtStation marketplace</strong> — sell own procedural material</li>
    <li><strong>Texture.com</strong> — bitmap reference</li>
    <li><strong>Quixel Megascans</strong> — photogrammetry combined với procedural variation</li>
    <li><strong>Career Material Artist</strong>: $60K-130K, specialized substance expert highly valued</li>
  </ul>
</section>
`,
  },

  // 09. Production
  {
    id: "6c6f4cd4-406a-45d6-ae5a-b2f4bea3e1de",
    tieu_de: "Production",
    tieu_de_viet: "Giai đoạn Production",
    tom_tat:
      "Production là giai đoạn chính trong quy trình làm phim, hoạt hình, game — nơi mọi thứ được sản xuất và thực hiện theo kế hoạch từ pre-production phase trước đó.",
    meta_title: "Production là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Production phase trong film, animation, game. Tìm hiểu workflow, role và process từ shooting đến animation production.",
    noi_dung: `
<section class="arc-intro">
  <p>Pre-production hoàn tất — script locked, cast assembled, set ready. Now starts <strong>Production</strong> — phase chính, expensive, intense — biến idea thành footage. Cho film: shoot day daily. Cho animation: artist animate. Cho game: programmer code, artist asset. Production = where money spent fastest, most pressure, most coordination.</p>
  <p>Production là kiến thức essential cho mọi creative working in media industry. Hiểu phase, role hierarchy, daily workflow giúp navigate studio environment — whether actor, animator, designer, developer. Foundation cho career trong creative industry.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Production là gì?</h2>
  <p>Production là <strong>main creation phase</strong> của project, sandwiched between pre-production (planning) và post-production (finishing). Cho film: <strong>principal photography</strong> (shooting). Cho animation: <strong>asset creation + animation</strong>. Cho game: <strong>development + content creation</strong>. Cho photography: <strong>shoot day</strong>. Phase where bulk of money spent, largest team working.</p>
  <p>Different industry similar pattern, different detail: <strong>Live-action film</strong>: 4-12 week shooting, cast + crew on set daily. <strong>Animation feature</strong>: 1-2 year production, artist at desk. <strong>Game</strong>: 1-3 year production, programmer + artist + designer collaborate. <strong>TV series</strong>: episodic production, repeat each episode.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Production Phase Characteristics</span>
    <p><strong>Pre-Production</strong>: planning, design, prep. <strong>Production</strong>: actual creation, biggest budget burn. <strong>Post-Production</strong>: assembly, finishing. Production = highest daily cost, most coordinated. Day rate of crew, equipment, location adds up quickly.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Principal Photography</strong> — film shooting</li>
    <li><strong>Call Sheet</strong> — daily plan</li>
    <li><strong>Daily / Rushes</strong> — daily footage review</li>
    <li><strong>Schedule</strong> — shooting timeline</li>
    <li><strong>Crew Department</strong> — camera, sound, art, costume</li>
    <li><strong>Set</strong> — physical or virtual</li>
    <li><strong>Production Designer</strong> — visual design</li>
    <li><strong>1st AD</strong> — assistant director on set</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"production film set shooting animation game development studio"</span>
    </div>
    <p class="arc-image-caption">Production — main creation phase, idea → reality</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Production Per Industry</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Live-Action Film</summary>
      <div class="arc-card-body">
        <p>Principal photography phase. 4-12 weeks. Daily call sheet. Crew arrive early, shoot day, wrap. Dailies sent to editor nightly. Director, DP, AD coordinate.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animation Feature</summary>
      <div class="arc-card-body">
        <p>Production = animation phase. 1-2 year. Artist at desk daily. Sequences animated, reviewed, polished. Pipeline crucial.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Game Development</summary>
      <div class="arc-card-body">
        <p>Production = main dev phase. 1-3 year typical AAA. Programmer code feature, artist make asset, designer balance. Iterative — alpha, beta, gold master.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>TV Series</summary>
      <div class="arc-card-body">
        <p>Episodic production. Each episode mini-production. Multi-camera setup common. Long-form crew familiar with each other.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Commercial</summary>
      <div class="arc-card-body">
        <p>Short, intense. Day or two shooting. High day rate cost. Multiple agency creative on set.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Music Video</summary>
      <div class="arc-card-body">
        <p>1-2 day shoot. Music-driven. Multiple costume change. High creative freedom.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photography</summary>
      <div class="arc-card-body">
        <p>Single day shoot or week-long campaign. Crew smaller. Photographer + assistant + model + makeup.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Documentary</summary>
      <div class="arc-card-body">
        <p>Often year-long production. Small crew. Capture life as unfolds. Different from scripted production.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Daily Production Flow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Call Sheet Distributed</h3>
    <ul class="arc-list">
      <li>Night before</li>
      <li>What shoot tomorrow</li>
      <li>Crew call time</li>
      <li>Cast call time</li>
      <li>Equipment list</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Crew Arrival (Pre-call)</h3>
    <ul class="arc-list">
      <li>Camera setup</li>
      <li>Lighting rig</li>
      <li>Costume / makeup department</li>
      <li>Catering breakfast</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Rehearsal</h3>
    <ul class="arc-list">
      <li>Block scene</li>
      <li>Camera test</li>
      <li>Lighting adjust</li>
      <li>Stand-in for talent</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Shooting</h3>
    <ul class="arc-list">
      <li>Multiple take per setup</li>
      <li>Coverage — wide, medium, close-up</li>
      <li>Director call action / cut</li>
      <li>Script supervisor track</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Lunch / Break</h3>
    <ul class="arc-list">
      <li>6-hour mark mandated (union)</li>
      <li>30-60 min</li>
      <li>Discussion of afternoon</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Afternoon Continue</h3>
    <ul class="arc-list">
      <li>Continue scene</li>
      <li>Try to make schedule</li>
      <li>Adjust if behind</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Wrap</h3>
    <ul class="arc-list">
      <li>End of day</li>
      <li>Equipment stored</li>
      <li>Dailies sent to editor</li>
      <li>Next call sheet finalized</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Production</h2>
  <ul class="arc-list">
    <li><strong>Schedule realistic</strong> — overconfidence common, behind schedule expensive</li>
    <li><strong>Weather backup plan</strong> — rain day cover scene</li>
    <li><strong>Cast / equipment insured</strong> — accident happen</li>
    <li><strong>Director communicate clearly</strong> — confusion delays</li>
    <li><strong>1st AD critical</strong> — keep shoot moving</li>
    <li><strong>Catering important</strong> — happy crew productive</li>
    <li><strong>Sleep</strong> — production schedule grueling, manage energy</li>
    <li><strong>Backup everything</strong> — footage backed up daily multiple copy</li>
    <li><strong>Animation: pipeline efficiency</strong> — every productivity gain compound across long production</li>
    <li><strong>Game: scope manage</strong> — feature creep kills schedule</li>
  </ul>
</section>
`,
  },

  // 10. Prop Design
  {
    id: "dca6b82b-cbcd-4338-bdd1-f394fbdb1f9c",
    tieu_de: "Prop Design",
    tieu_de_viet: "Thiết kế Đạo cụ (Prop Design)",
    tom_tat:
      "Prop Design là thiết kế đạo cụ — vũ khí, công cụ, vật trang trí — được nhân vật sử dụng hoặc xuất hiện trong bối cảnh film, animation, game.",
    meta_title: "Prop Design là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Prop Design trong film, game, animation. Tìm hiểu workflow concept art, hero prop, background prop và software professional.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Lord of the Rings — Anduril sword Aragorn, One Ring, Gandalf staff. Mỗi prop iconic, distinctive, support character. Game God of War — Leviathan Axe Kratos. Star Wars — lightsaber, Han Solo blaster. Đây là <strong>Prop Design</strong> — specialized concept art career. Mỗi prop chi tiết, có lịch sử, tells story without word.</p>
  <p>Prop Design là specialized career trong concept art. Hiểu workflow, mindset, types of prop (hero vs background), software giúp tạo prop memorable, functional, world-consistent. Critical cho film, game, animation requiring distinct visual identity.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Prop Design là gì?</h2>
  <p>Prop Design là <strong>specialized concept art discipline</strong> tập trung designing <strong>props</strong> — objects that characters use, hold, interact with, or appear in environment. Distinct from character design (character themselves) hoặc environment design (background). Prop range from minor (cup, book) đến hero prop (signature weapon).</p>
  <p>Each prop tells story: <strong>functional</strong> (works realistically — sword cuts, gun fires), <strong>character-defining</strong> (Kratos&apos; Leviathan = his identity), <strong>world-consistent</strong> (Mass Effect future tech feels Mass Effect), <strong>aesthetic</strong> (looks good cho camera). Hero prop receives weeks-months design effort, multiple iteration. Background prop quicker.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Hero Prop vs Background Prop</span>
    <p><strong>Hero Prop</strong>: significant story prop, close-up. Tons of detail. Weeks-months design. Sword Aragorn, Tony Stark gauntlet. <strong>Background Prop</strong>: set dressing, never close-up. Quick design. Hundreds in environment. Different time investment, both important.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Hero Prop</strong> — significant, close-up</li>
    <li><strong>Background Prop</strong> — set dressing</li>
    <li><strong>Functional</strong> — works realistically</li>
    <li><strong>Character-Defining</strong> — supports character</li>
    <li><strong>World-Consistent</strong> — fits universe</li>
    <li><strong>Practical / CGI</strong> — built physical or 3D</li>
    <li><strong>Modelsheet</strong> — multi-angle reference</li>
    <li><strong>Material Callout</strong> — what material made of</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"prop design concept art weapon sword game film"</span>
    </div>
    <p class="arc-image-caption">Prop Design — props story-telling, character-defining, functional</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Prop Categories</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Weapon</summary>
      <div class="arc-card-body">
        <p>Sword, gun, magical weapon. Iconic potential — Excalibur, Iron Man gauntlet. Function balance form. Combat usability consideration.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tool / Equipment</summary>
      <div class="arc-card-body">
        <p>Crafted item — hammer, magnifying glass, repair tool. Functional. Show profession of character.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Vehicle</summary>
      <div class="arc-card-body">
        <p>Car, spaceship, motorcycle. Bridge prop và vehicle category. Hero vehicle (Batmobile) gets prop-level detail.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Magical / Sci-Fi Item</summary>
      <div class="arc-card-body">
        <p>One Ring, Wand, Lightsaber. Fictional yet must feel real. Establish own &quot;rule&quot; — how it works.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Furniture / Set Dressing</summary>
      <div class="arc-card-body">
        <p>Chair, table, lamp. Bridge prop và set design. Background usually but signature piece (Captain&apos;s chair Star Trek) can be hero.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Clothing / Accessory</summary>
      <div class="arc-card-body">
        <p>Hat, glove, jewelry. Bridge prop và costume. Hero accessory (Indiana Jones whip, hat).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Technology / Device</summary>
      <div class="arc-card-body">
        <p>Phone, computer, scanner. Sci-fi gadget. Consistency với world tech level.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Book / Document</summary>
      <div class="arc-card-body">
        <p>Hero book (Necronomicon, Marauder&apos;s Map). Background paperwork. Set decoration.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Prop Design</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Brief</h3>
    <ul class="arc-list">
      <li>Read script — what prop need</li>
      <li>Character who uses it</li>
      <li>World context — tech level, aesthetic</li>
      <li>Director vision</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Research</h3>
    <ul class="arc-list">
      <li>Real reference — historical weapon, real tool</li>
      <li>Genre reference — sci-fi tech, fantasy magic</li>
      <li>Mood board</li>
      <li>Material study</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Thumbnail Sketch</h3>
    <ul class="arc-list">
      <li>20-50 small variation</li>
      <li>Explore silhouette</li>
      <li>Pick strongest 3-5</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Refine Top Picks</h3>
    <ul class="arc-list">
      <li>Larger drawing</li>
      <li>Detail forms</li>
      <li>Multiple angles</li>
      <li>Show function</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Director / Lead Review</h3>
    <ul class="arc-list">
      <li>Present iteration</li>
      <li>Feedback incorporated</li>
      <li>Direction refinement</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Final Design</h3>
    <ul class="arc-list">
      <li>Color, material rendering</li>
      <li>Multiple angle turnaround</li>
      <li>Detail callout (what mechanism does)</li>
      <li>Scale reference</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Build Sheet (Hero Prop)</h3>
    <ul class="arc-list">
      <li>For physical fabrication / 3D modeling</li>
      <li>Construction note</li>
      <li>Materials specified</li>
      <li>Mechanism diagram</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Hand Off</h3>
    <ul class="arc-list">
      <li>Modeler 3D / fabricator physical</li>
      <li>Available cho consultation</li>
      <li>Approve final build</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Function dictates form</strong> — sword needs sharp edge, gun trigger</li>
    <li><strong>Silhouette test</strong> — recognizable as black shape?</li>
    <li><strong>Material clarity</strong> — wood, metal, leather all clear</li>
    <li><strong>Wear and tear</strong> — used prop has history, scratch, scuff</li>
    <li><strong>Camera-ready</strong> — looks good close-up</li>
    <li><strong>Character integration</strong> — fits character&apos;s hand, scale</li>
    <li><strong>World consistency</strong> — feels same universe as everything else</li>
    <li><strong>Practical buildable</strong> — film prop must be physical built</li>
    <li><strong>Career</strong>: Prop Concept Artist $60K-130K, Senior Prop Designer top studio</li>
    <li><strong>Studios</strong>: Marvel, Lucasfilm, Naughty Dog, Bungie, Industrial Light &amp; Magic</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 2 · Batch 9 — chạy ${items.length} bài keyword (I → P) ──\n`,
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
  `SELECT COUNT(*) AS con_lai_dot2
FROM article_bai_viet
WHERE loai_bai_viet = 'keyword'
  AND (noi_dung IS NULL OR noi_dung = '')
  AND tieu_de >= 'I' AND tieu_de < 'Q'`,
  "read",
);
const conLai = remain.rows?.[0]?.con_lai_dot2;

console.log(`\nCòn lại đợt 2: ${conLai} bài.`);
