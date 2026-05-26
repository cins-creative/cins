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
  // 01. Shader
  {
    id: "f0ca6fea-8a1f-4478-8d8c-b208fc3d70c5",
    tieu_de: "Shader",
    tieu_de_viet: "Shader trong đồ họa máy tính",
    tom_tat:
      "Shader là chương trình GPU hướng dẫn phần cứng đồ họa tính toán màu sắc, ánh sáng, bóng, kết cấu, hiệu ứng của bề mặt 3D — foundation cho mọi rendering modern.",
    meta_title: "Shader là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Shader trong game, VFX. Tìm hiểu vertex shader, fragment shader, compute shader, HLSL, GLSL, Unreal Material.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn play game Cyberpunk — neon city, wet road reflect, character skin realistic. Behind scene mỗi pixel mặt color decided by <strong>Shader</strong> — small program running trên GPU. Game engine compile shader code, GPU execute millions per second. Shader là magic transform raw 3D data thành visually stunning image. Foundation knowledge cho mọi 3D graphics work.</p>
  <p>Shader là kiến thức essential cho game developer, technical artist, VFX TD. Hiểu shader types, language (HLSL, GLSL), workflow trong Unity/Unreal giúp create custom visual effect, optimize performance. Bridge giữa art và programming.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Shader là gì?</h2>
  <p>Shader là <strong>small program</strong> run on GPU specifying how 3D scene rendered. Modern GPU has programmable pipeline với multiple shader stage: <strong>Vertex Shader</strong> (transform vertex position), <strong>Fragment / Pixel Shader</strong> (compute pixel color), <strong>Geometry Shader</strong> (generate new geometry), <strong>Compute Shader</strong> (general-purpose computation). Mỗi stage parallel execute trên thousands of GPU core.</p>
  <p>Shader written in specialized language: <strong>HLSL</strong> (Microsoft, DirectX), <strong>GLSL</strong> (OpenGL), <strong>MSL</strong> (Apple Metal), <strong>WGSL</strong> (WebGPU), <strong>Cg</strong> (older NVIDIA). Modern game engine có visual shader editor (Unity Shader Graph, Unreal Material Editor) — node-based, no code required. Still, code shader cho advanced effect.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Shader Pipeline Stages</span>
    <p><strong>1. Vertex Shader</strong>: per-vertex math, transform 3D position to screen. <strong>2. Geometry Shader</strong> (optional): generate primitive. <strong>3. Rasterization</strong>: convert triangle to fragments. <strong>4. Fragment Shader</strong>: per-pixel color calculation. <strong>5. Output</strong>: blend với framebuffer. Each stage GPU parallel.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Vertex Shader</strong> — per-vertex</li>
    <li><strong>Fragment / Pixel Shader</strong> — per-pixel</li>
    <li><strong>Compute Shader</strong> — general GPU</li>
    <li><strong>HLSL / GLSL</strong> — shader language</li>
    <li><strong>Material</strong> — shader + parameter</li>
    <li><strong>Shader Graph</strong> — visual editor</li>
    <li><strong>Uniform</strong> — shader input</li>
    <li><strong>Texture Sample</strong> — read texture</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"shader graph unity unreal HLSL GLSL game graphics"</span>
    </div>
    <p class="arc-image-caption">Shader — GPU program defines visual của 3D rendering</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Shader Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Vertex Shader</summary>
      <div class="arc-card-body">
        <p>Process per-vertex. Transform 3D position → screen space. Vertex animation (wind sway tree). Cheap vì vertex count low (thousands).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fragment / Pixel Shader</summary>
      <div class="arc-card-body">
        <p>Per-pixel calculation. Most visual effect here — lighting, texture, color. Most performance-critical (millions of pixel). Modern lighting model run here.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Geometry Shader</summary>
      <div class="arc-card-body">
        <p>Optional. Generate new primitive — grass blade per vertex, particle effect. Performance trade-off, less used modern.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Compute Shader</summary>
      <div class="arc-card-body">
        <p>General-purpose GPU computation. Not directly rendering. Physics simulation, particle, post-processing, machine learning.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tessellation Shader</summary>
      <div class="arc-card-body">
        <p>Subdivide geometry on GPU. Smooth curve, displacement effect. Performance expensive.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ray Tracing Shader</summary>
      <div class="arc-card-body">
        <p>Modern RTX. Ray generation, closest hit, miss shader. NVIDIA OptiX, DirectX Raytracing (DXR). Cutting-edge rendering.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Surface Shader (Unity)</summary>
      <div class="arc-card-body">
        <p>Unity simplified shader paradigm. Auto-generate lighting code. Easier than full ShaderLab.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Material (Unreal)</summary>
      <div class="arc-card-body">
        <p>Unreal&apos;s shader abstraction. Material Editor visual node. Generate underlying HLSL.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Common Shader Effects</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">PBR (Physically-Based Rendering)</h3>
    <ul class="arc-list">
      <li>Standard modern shader</li>
      <li>Metallic-roughness workflow</li>
      <li>Realistic material</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Toon / Cel Shading</h3>
    <ul class="arc-list">
      <li>Stylized cartoon look</li>
      <li>Posterized lighting</li>
      <li>Outline pass</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Subsurface Scattering</h3>
    <ul class="arc-list">
      <li>Skin, wax, jade realism</li>
      <li>Light penetrate surface</li>
      <li>Expensive but critical</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Dissolve / Hologram</h3>
    <ul class="arc-list">
      <li>Stylized appearance/disappearance</li>
      <li>Noise pattern dissolve</li>
      <li>Game power-up VFX</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Water</h3>
    <ul class="arc-list">
      <li>Refraction, reflection</li>
      <li>Vertex wave displacement</li>
      <li>Foam edge</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Post-Processing</h3>
    <ul class="arc-list">
      <li>Bloom, tone mapping</li>
      <li>Vignette, chromatic aberration</li>
      <li>Full-screen quad fragment shader</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Tools</h2>
  <ul class="arc-list">
    <li><strong>Unity Shader Graph</strong> — visual node-based shader</li>
    <li><strong>Unreal Material Editor</strong> — comprehensive visual shader</li>
    <li><strong>ShaderToy.com</strong> — community fragment shader playground</li>
    <li><strong>Book of Shaders</strong> — free GLSL tutorial</li>
    <li><strong>HLSL Microsoft docs</strong> — DirectX reference</li>
    <li><strong>Career Shader Programmer</strong> — $90K-200K, specialized AAA studio</li>
    <li><strong>Career Technical Artist</strong> — $80K-150K, shader knowledge required</li>
    <li><strong>VFX TD shader skill valued</strong> — Houdini, Nuke shader work</li>
    <li><strong>Self-learning</strong>: Acerola YouTube channel, Freya Holmer</li>
    <li><strong>Performance critical</strong> — shader optimization affect game framerate</li>
  </ul>
</section>
`,
  },

  // 02. Shading
  {
    id: "37ff1ea9-d41e-4ffa-85f0-b3b93ac1120f",
    tieu_de: "Shading",
    tieu_de_viet: "Shading trong 2D & 3D",
    tom_tat:
      "Shading là kỹ thuật tạo sáng-tối lên vật thể để có khối, chiều sâu và chân thật — foundation cho drawing, illustration, 3D rendering, painting.",
    meta_title: "Shading là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Shading 2D, 3D. Tìm hiểu light direction, value, hatching, smooth shading và workflow cho illustration, drawing.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn vẽ sphere — circle outline. Looks flat 2D. Add <strong>shading</strong> — bright spot (highlight), darker shadow side, soft transition — sphere xuất hiện 3D, volumetric. Đó là magic của shading — fundamental drawing skill. Same principle 2D illustration, 3D render, painting. Foundation hiểu light interact với form.</p>
  <p>Shading là kỹ năng essential cho mọi visual artist — illustrator, painter, 3D artist, animator. Hiểu light direction, value, technique giúp tạo dimensional artwork. Foundation skill phải master trước advanced artistic technique.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Shading là gì?</h2>
  <p>Shading là kỹ thuật <strong>simulate light interaction</strong> với surface — tạo bright (highlight), mid-tone, dark (shadow) value lên vật thể để convey 3D form trên 2D surface. Foundation drawing skill từ Renaissance master (Leonardo, Caravaggio) đến modern artist. 3D render perform automatic shading via shader, but artistic understanding still essential.</p>
  <p>Components shading: <strong>Light Source</strong> (direction, intensity, color), <strong>Form Shadow</strong> (shadow on object itself), <strong>Cast Shadow</strong> (shadow projected onto other surface), <strong>Highlight</strong> (brightest spot), <strong>Reflected Light</strong> (light bounced from environment), <strong>Core Shadow</strong> (darkest area where light just stops). Understanding these = realistic shading.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Value Range</span>
    <p><strong>5-value system</strong>: highlight, light, mid-tone, shadow, dark shadow. Simplifies decision. Pro artist consistent value structure. Beginner mistake: not enough value contrast, washed out.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Light Source</strong> — direction of light</li>
    <li><strong>Highlight</strong> — brightest</li>
    <li><strong>Mid-tone</strong> — main tone</li>
    <li><strong>Core Shadow</strong> — darkest on form</li>
    <li><strong>Cast Shadow</strong> — projected onto surface</li>
    <li><strong>Reflected Light</strong> — bounced</li>
    <li><strong>Form Shadow</strong> — shadow on object</li>
    <li><strong>Value</strong> — lightness/darkness</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"shading drawing 2D light value sphere painting"</span>
    </div>
    <p class="arc-image-caption">Shading — light/dark value, convey 3D form on 2D</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Shading Techniques (2D)</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Smooth / Blended Shading</summary>
      <div class="arc-card-body">
        <p>Soft gradient. Realistic. Digital painting standard. Procreate, Photoshop. Smooth transition between value.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hatching</summary>
      <div class="arc-card-body">
        <p>Parallel line. Pencil drawing, etching. Direction line indicate form. Tighter = darker, looser = lighter.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cross-hatching</summary>
      <div class="arc-card-body">
        <p>Multiple direction line overlap. Build darker tone progressively. Pen and ink classic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stippling</summary>
      <div class="arc-card-body">
        <p>Dots. Density vary tone. Detailed, slow. Pen and ink, etching.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cel Shading</summary>
      <div class="arc-card-body">
        <p>Hard-edge value transition. Anime, comic. Clear light/shadow division. No gradient.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cross-contour Hatching</summary>
      <div class="arc-card-body">
        <p>Hatch follow form contour. 3D feel. Subtle, sophisticated.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Scribbling</summary>
      <div class="arc-card-body">
        <p>Random line. Energetic, expressive. Loose style.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>3D Shading</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Flat Shading</h3>
    <ul class="arc-list">
      <li>Each polygon single color</li>
      <li>Faceted look</li>
      <li>Old 3D / stylized</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Gouraud Shading</h3>
    <ul class="arc-list">
      <li>Per-vertex calculation interpolate</li>
      <li>Smoother than flat</li>
      <li>Older standard</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phong Shading</h3>
    <ul class="arc-list">
      <li>Per-pixel calculation</li>
      <li>Smooth highlight</li>
      <li>Modern standard</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">PBR Shading</h3>
    <ul class="arc-list">
      <li>Physically-based</li>
      <li>Metallic-roughness</li>
      <li>Modern game standard</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Subsurface Shading</h3>
    <ul class="arc-list">
      <li>Skin, wax</li>
      <li>Light scatter through surface</li>
      <li>Premium effect</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Toon / NPR Shading</h3>
    <ul class="arc-list">
      <li>Non-photorealistic</li>
      <li>Cel-shaded look</li>
      <li>Stylized aesthetic</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Shading</h2>
  <ul class="arc-list">
    <li><strong>Establish light source early</strong> — direction critical, consistent</li>
    <li><strong>5-value structure</strong> — limit value cho cohesive</li>
    <li><strong>Value before color</strong> — gray scale study first</li>
    <li><strong>Squint check</strong> — eyes squint to see value clearly</li>
    <li><strong>Reflected light subtle</strong> — should not be brighter than mid-tone</li>
    <li><strong>Cast shadow shape</strong> — describes object casting</li>
    <li><strong>Edge variation</strong> — sharp shadow (sun) vs soft (cloudy)</li>
    <li><strong>Atmospheric perspective</strong> — distant object lower contrast</li>
    <li><strong>Study master</strong>: Caravaggio, Vermeer, Rembrandt</li>
    <li><strong>Reference</strong>: photo, real object, photogrammetry</li>
  </ul>
</section>
`,
  },

  // 03. Showreel
  {
    id: "fd2f1ad8-7fc7-4fee-8cdf-4700ede73aea",
    tieu_de: "Showreel",
    tieu_de_viet: "Showreel (Demo công việc)",
    tom_tat:
      "Showreel là video tổng hợp công trình tốt nhất — ngắn hơn demo reel, tập trung vào một chuyên môn cụ thể như VFX, motion graphics, hoặc 3D — dùng để tìm việc hoặc pitch khách hàng.",
    meta_title: "Showreel là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Showreel cho creative career. Tìm hiểu cấu trúc, music selection, timing và best practice để impress studio recruiter.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn 3D artist apply Marvel job — gửi resume + portfolio website. Recruiter spend 60-90 seconds review portfolio. Need: <strong>Showreel</strong> — curated highlights video 1-2 minutes show best work. First impression critical. Bad showreel = no callback. Good showreel = interview. Career-defining asset cho mọi creative professional.</p>
  <p>Showreel là deliverable essential cho VFX artist, motion designer, animator, 3D artist looking for studio job hoặc freelance pitch. Hiểu cấu trúc, music selection, work selection giúp produce showreel impactful. Distinguish hired vs ignored.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Showreel là gì?</h2>
  <p>Showreel là <strong>short video</strong> showcasing best work của artist. Typically <strong>60-120 seconds</strong>. Designed cho fast review — recruiter, hiring manager, client. Visual proof of capability. More impactful than text portfolio. Standard cho creative career application.</p>
  <p>Different from <strong>demo reel</strong> (technically synonym but demo reel often longer 2-3 minutes), <strong>showcase video</strong> (similar concept). Specialized version cho specific discipline — VFX showreel (compositing), animation reel (character animation), motion graphics reel, 3D modeling reel. Show specific skill targeted at specific job application.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Showreel Goal</span>
    <p><strong>Demonstrate</strong>: technical skill, artistic quality. <strong>Highlight</strong>: best work, strongest moment. <strong>Match</strong>: targeted at specific role/studio aesthetic. <strong>Brevity</strong>: 60-120 sec, recruiter time limited. <strong>Curated</strong>: less = more, quality over quantity.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Best work first</strong> — strongest open</li>
    <li><strong>Music selection</strong> — drive pace</li>
    <li><strong>Targeted</strong> — match studio aesthetic</li>
    <li><strong>Curated</strong> — only best</li>
    <li><strong>Credit / Role</strong> — what you did</li>
    <li><strong>Length 60-120s</strong> — short impactful</li>
    <li><strong>Updated</strong> — keep current</li>
    <li><strong>Multiple version</strong> — per discipline</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"showreel demo reel motion graphics VFX portfolio video"</span>
    </div>
    <p class="arc-image-caption">Showreel — curated video, career-defining asset cho creative</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Showreel Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>VFX Showreel</summary>
      <div class="arc-card-body">
        <p>Compositing, tracking, paint, CG integration. Specific shots show technical capability. Marvel-style work. Targeted ILM, Weta, DNEG.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Motion Graphics Reel</summary>
      <div class="arc-card-body">
        <p>Title sequence, commercial, branding animation. Music sync important. Targeted ad agency, motion studio.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animation Reel (Character)</summary>
      <div class="arc-card-body">
        <p>Acting performance — character emotion, motion quality. Pixar-style work. Targeted animation studio.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D Modeling Reel</summary>
      <div class="arc-card-body">
        <p>Turntable per asset, wireframe view. Hard surface vs character. Show topology cho recruiter assess.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Concept Art Reel</summary>
      <div class="arc-card-body">
        <p>Static images often, sometimes animated reveal. Different paradigm — less video, more curated stills.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cinematography Reel</summary>
      <div class="arc-card-body">
        <p>DP, cinematographer. Beautiful shot. Wide gamut location, lighting style.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Editor Reel</summary>
      <div class="arc-card-body">
        <p>Cut sequence, music sync, story moment. Difficult — credit who edited can be unclear.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Director Reel</summary>
      <div class="arc-card-body">
        <p>Stylistic vision. Showcase wide range. Music video, commercial samples.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Showreel Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Curate Best Work</h3>
    <ul class="arc-list">
      <li>Select top 5-15 shot/project</li>
      <li>Quality over quantity</li>
      <li>Match target role</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Order Strategically</h3>
    <ul class="arc-list">
      <li>Best work first (open strong)</li>
      <li>Variety throughout</li>
      <li>Strong moment end</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Music Selection</h3>
    <ul class="arc-list">
      <li>Energy match work</li>
      <li>Royalty-free (Artlist, Epidemic)</li>
      <li>Avoid copyrighted music</li>
      <li>Drive pace</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Edit to Music</h3>
    <ul class="arc-list">
      <li>Cut on beat</li>
      <li>Match energy</li>
      <li>Pacing dynamic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Title Cards</h3>
    <ul class="arc-list">
      <li>Opening: name, role</li>
      <li>Per shot: project, role, year</li>
      <li>Closing: contact info</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Quality Output</h3>
    <ul class="arc-list">
      <li>1080p minimum, 4K preferred</li>
      <li>H.264 standard format</li>
      <li>Vimeo Pro hosting</li>
      <li>YouTube backup</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Breakdown Reel (Optional)</h3>
    <ul class="arc-list">
      <li>Show process — plate, CG, comp</li>
      <li>Demonstrate technical work</li>
      <li>VFX role essential</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Feedback &amp; Iterate</h3>
    <ul class="arc-list">
      <li>Show industry friend</li>
      <li>Honest critique</li>
      <li>Revise weak shot</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Resources</h2>
  <ul class="arc-list">
    <li><strong>60-120 second sweet spot</strong> — longer recruiter skip</li>
    <li><strong>Open strong</strong> — best shot first</li>
    <li><strong>Music drive pace</strong> — selection critical</li>
    <li><strong>Match target studio</strong> — Pixar style ≠ ILM style</li>
    <li><strong>Update annually</strong> — work evolve</li>
    <li><strong>Multiple version</strong> — different role different reel</li>
    <li><strong>Vimeo Pro</strong> standard hosting cho industry</li>
    <li><strong>Royalty-free music</strong>: Artlist, Musicbed, Epidemic Sound</li>
    <li><strong>Credit clearly</strong> — what you did each shot</li>
    <li><strong>Don&apos;t pad</strong> — weak work harm overall impression</li>
  </ul>
</section>
`,
  },

  // 04. Simulation
  {
    id: "56b7b364-d5fa-4851-925a-c985d5ca3cbd",
    tieu_de: "Simulation (3D)",
    tieu_de_viet: "Mô phỏng vật lý 3D (Simulation)",
    tom_tat:
      "Simulation là quá trình dùng thuật toán vật lý để mô phỏng chuyển động của vật thể — vải, tóc, chất lỏng, lửa, smoke — cho VFX, animation, game realistic.",
    meta_title: "Simulation là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Simulation trong VFX, animation. Tìm hiểu cloth, fluid, smoke, fire simulation và workflow Houdini, Maya nCloth.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Marvel film — Doctor Strange cape flow dramatic, Storm summon hurricane, building collapse Avengers Endgame. Behind scene: <strong>Simulation</strong> — physics-based algorithm compute motion. Cloth, fluid, smoke, destruction — too complex keyframe manually. Houdini, Maya simulate physically accurate. VFX foundation skill cho blockbuster work.</p>
  <p>Simulation là kỹ năng essential cho VFX FX artist, technical artist. Hiểu các loại simulation, software (Houdini gold standard), workflow giúp create realistic dynamics. Specialized career với high demand — FX artist always valued in VFX.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Simulation là gì?</h2>
  <p>Simulation là <strong>process compute motion using physics algorithm</strong>. Apply Newtonian physics (force, gravity, collision) hoặc specialized math (fluid dynamics, solid mechanics) lên 3D object. Result: realistic motion artist cannot manually keyframe efficiently. Different from <strong>animation</strong> (artist keyframe) — simulation algorithm-generated, deterministic dựa trên input parameter.</p>
  <p>Categories: <strong>Rigid Body Dynamics</strong> (solid objects collide — destruction, debris), <strong>Soft Body</strong> (deformable jelly-like), <strong>Cloth</strong> (fabric drape, flow), <strong>Hair / Fur</strong> (strand dynamics), <strong>Fluid</strong> (water, liquid splash), <strong>Smoke / Fire / Gas</strong> (volumetric), <strong>Cá</strong> (snow, sand granular). Each require specialized solver.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Simulation Cost</span>
    <p>Simulation expensive computationally. Simple cloth seconds-minutes, complex fluid hours-days. Render after simulation often more time. VFX FX artist cài đặt sim, run overnight, iterate. Most computation-heavy phase trong VFX pipeline.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Rigid Body</strong> — solid object physics</li>
    <li><strong>Soft Body</strong> — deformable</li>
    <li><strong>Cloth Sim</strong> — fabric</li>
    <li><strong>Hair / Fur</strong> — strand</li>
    <li><strong>Fluid Sim</strong> — water, liquid</li>
    <li><strong>Smoke / Fire</strong> — volumetric gas</li>
    <li><strong>Solver</strong> — physics algorithm</li>
    <li><strong>Cache</strong> — store sim result</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"simulation VFX houdini cloth fluid fire smoke physics"</span>
    </div>
    <p class="arc-image-caption">Simulation — physics-based motion, foundation VFX dynamics</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Simulation Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Rigid Body Dynamics (RBD)</summary>
      <div class="arc-card-body">
        <p>Solid object physics — collision, gravity, friction. Building collapse, debris fly. Houdini RBD, NVIDIA PhysX. Used destruction sequence.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cloth Simulation</summary>
      <div class="arc-card-body">
        <p>Fabric drape, flow, collision. Houdini Vellum, Maya nCloth, Marvelous Designer. Tested by character walking, wind.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hair / Fur Simulation</summary>
      <div class="arc-card-body">
        <p>Strand dynamics. Hair sway theo motion. Houdini guides, XGen Maya. Fur on creature.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fluid Simulation</summary>
      <div class="arc-card-body">
        <p>Water, liquid, viscous fluid. SPH, FLIP solver. Houdini FLIP, RealFlow. Splash, splash, pour. Days of computation cho heavy sim.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Smoke / Fire / Gas</summary>
      <div class="arc-card-body">
        <p>Volumetric simulation. Pyro solver Houdini. Fire, smoke, dust, fog. Embergen real-time option. Combustion modeled.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Granular (Sand, Snow)</summary>
      <div class="arc-card-body">
        <p>Particle-based granular material. Sand pile, snow flow. Houdini Vellum grain. Specialized.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Soft Body</summary>
      <div class="arc-card-body">
        <p>Jelly, gelatin, organic deformable. Houdini Vellum soft. Less common but valuable cho creature stomach.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Crowd Simulation</summary>
      <div class="arc-card-body">
        <p>Many character orchestrated. Massive software (Lord of Rings). Houdini Crowd. Battle scene.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Simulation</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Reference Real</h3>
    <ul class="arc-list">
      <li>Real footage of phenomenon</li>
      <li>Understand behavior</li>
      <li>Note key visual</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Setup Scene</h3>
    <ul class="arc-list">
      <li>Geometry collide với sim</li>
      <li>Emitter location</li>
      <li>Force fields (gravity, wind)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Define Material</h3>
    <ul class="arc-list">
      <li>Cloth: stretch, bend, weight</li>
      <li>Fluid: viscosity, surface tension</li>
      <li>Smoke: temperature, density</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Low-Res Test</h3>
    <ul class="arc-list">
      <li>Low resolution simulation first</li>
      <li>Iterate fast</li>
      <li>Tune parameter</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. High-Res Final</h3>
    <ul class="arc-list">
      <li>Crank up resolution</li>
      <li>Run sim overnight typical</li>
      <li>Cache result</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Add Detail / Secondary</h3>
    <ul class="arc-list">
      <li>Foam, spray on water</li>
      <li>Spark on fire</li>
      <li>Dust on debris</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Render Simulation</h3>
    <ul class="arc-list">
      <li>Volumetric render fluid/smoke</li>
      <li>Mesh render cloth</li>
      <li>Multiple pass cho compositing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Composite</h3>
    <ul class="arc-list">
      <li>Combine với plate</li>
      <li>Color grade match</li>
      <li>Final delivery</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Houdini</strong> — industry standard VFX simulation</li>
    <li><strong>Maya nCloth, nParticle, nDynamics</strong></li>
    <li><strong>3ds Max — tyFlow, FumeFX</strong></li>
    <li><strong>Blender — Mantaflow, Cloth, Hair</strong> free</li>
    <li><strong>Marvelous Designer</strong> — cloth specialized</li>
    <li><strong>RealFlow</strong> — fluid specialized</li>
    <li><strong>Embergen</strong> — real-time pyro</li>
    <li><strong>Unreal Niagara Fluids</strong> — real-time fluid</li>
    <li><strong>Career FX Artist</strong> — $80K-180K, senior VFX specialist</li>
    <li><strong>Houdini master</strong> = top paid VFX role</li>
  </ul>
</section>
`,
  },

  // 05. Skeletal System
  {
    id: "edef85e6-7c68-4e72-af9a-a3ed1f62e638",
    tieu_de: "Skeletal System (3D)",
    tieu_de_viet: "Hệ thống xương 3D (Skeletal System)",
    tom_tat:
      "Skeletal System là cấu trúc xương ảo được tạo trong phần mềm 3D — cho phép hoạt hình viên tạo chuyển động cho nhân vật và mô hình thông qua skeleton hierarchy.",
    meta_title:
      "Skeletal System là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Skeletal System trong 3D rigging. Tìm hiểu joint hierarchy, IK chain, naming convention và workflow setup skeleton.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn 3D artist tạo character — mesh hoàn chỉnh, sẵn sàng animate. Bước tiếp theo: tạo <strong>Skeletal System</strong> — bones hierarchy bên trong character. Animator move bones → mesh deform. Foundation cho rigging và animation. Same concept như xương người — control structure beneath skin. Critical setup phase trước animation production.</p>
  <p>Skeletal System là kiến thức essential cho rigger, technical artist, character animator. Hiểu joint placement, hierarchy, naming convention, IK chain setup giúp tạo skeleton clean, animation-friendly. Foundation skill cho character animation pipeline.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Skeletal System là gì?</h2>
  <p>Skeletal System trong 3D là <strong>hierarchy of virtual bones (joints)</strong> built bên trong character mesh. Bone parent-child relationship — moving parent affects all children. Spine connects to neck/shoulder/hip; arm chain from shoulder → elbow → wrist → fingers. Mesh <strong>skinned</strong> to skeleton — vertex follow bone. Animator manipulate skeleton → mesh deform → motion.</p>
  <p>Components: <strong>Joint</strong> (pivot point, also called bone trong some software), <strong>Hierarchy</strong> (parent-child structure), <strong>Bind Pose</strong> (initial rest position, typically T-pose), <strong>Naming Convention</strong> (consistent left_arm_shoulder, etc.), <strong>Joint Orient</strong> (rotation axis aligned correctly). Quality skeleton dramatically affects animation quality.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Skeleton vs Skeletal System vs Rig</span>
    <p>Often interchangeable. <strong>Skeleton</strong> / <strong>Skeletal System</strong>: bone hierarchy itself. <strong>Rig</strong>: complete control system — skeleton + controllers + constraint + IK. Skeleton subset of rig. Rig fully animator-ready, skeleton just bones.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Joint</strong> — pivot point</li>
    <li><strong>Bone</strong> — visual connection</li>
    <li><strong>Hierarchy</strong> — parent-child</li>
    <li><strong>Bind Pose / T-Pose</strong> — rest position</li>
    <li><strong>Joint Orient</strong> — local axis</li>
    <li><strong>Pivot Point</strong> — rotation center</li>
    <li><strong>Local / World Space</strong> — coordinate</li>
    <li><strong>Naming Convention</strong> — clarity</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"skeletal system 3D joint hierarchy character rigging"</span>
    </div>
    <p class="arc-image-caption">Skeletal System — bone hierarchy, foundation animation</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Skeleton Structure</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Root / Pelvis</summary>
      <div class="arc-card-body">
        <p>Top of hierarchy. Whole body move when root move. Pelvis position typically.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Spine Chain</summary>
      <div class="arc-card-body">
        <p>Pelvis → lower spine → middle → upper → neck → head. 3-7 joints depending complexity. Bend characteristic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Arm Chain</summary>
      <div class="arc-card-body">
        <p>Clavicle → shoulder → elbow → wrist → hand → fingers (3 joint per finger). Symmetric left/right.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Leg Chain</summary>
      <div class="arc-card-body">
        <p>Hip → knee → ankle → ball → toe. Foot setup carefully cho walk animation. Symmetric.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Head &amp; Neck</summary>
      <div class="arc-card-body">
        <p>Neck base → head. Sometimes additional joint cho jaw, eye control.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Finger Joints</summary>
      <div class="arc-card-body">
        <p>Thumb (3-4 joint), Index/Middle/Ring/Pinky (3 joint each). Hand expressive, important rigging.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tail / Extras</summary>
      <div class="arc-card-body">
        <p>Creature tail, wings, antenna. Specific to character design.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Facial Joints (Optional)</summary>
      <div class="arc-card-body">
        <p>Jaw, eye, eyelid, brow joint. Alternative blend shape cho face. Hybrid system common.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Setup Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. T-Pose Character</h3>
    <ul class="arc-list">
      <li>Pose neutral arms outstretched</li>
      <li>Easy joint placement</li>
      <li>Bind pose typically</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Place Root Joint</h3>
    <ul class="arc-list">
      <li>Pelvis or world origin</li>
      <li>Parent of everything</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Spine Chain</h3>
    <ul class="arc-list">
      <li>3-7 joint up spine</li>
      <li>Even spacing</li>
      <li>Anatomically correct</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Arms &amp; Legs</h3>
    <ul class="arc-list">
      <li>Joint at anatomical position</li>
      <li>Symmetric left/right</li>
      <li>Mirror tool</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Hands</h3>
    <ul class="arc-list">
      <li>Per finger joint</li>
      <li>Thumb separate angle</li>
      <li>Time-intensive but worth it</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Naming Convention</h3>
    <ul class="arc-list">
      <li>L_arm_shoulder_jnt</li>
      <li>Consistent prefix L_ R_</li>
      <li>Suffix _jnt</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Joint Orient</h3>
    <ul class="arc-list">
      <li>Local axis consistent</li>
      <li>X aim down chain</li>
      <li>Critical cho animation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Test &amp; Bind</h3>
    <ul class="arc-list">
      <li>Skin mesh to skeleton</li>
      <li>Test extreme pose</li>
      <li>Iterate weight painting</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Skeletal System</h2>
  <ul class="arc-list">
    <li><strong>Anatomy accurate</strong> — joint at actual anatomical position</li>
    <li><strong>Joint orient critical</strong> — wrong axis = animation chaos</li>
    <li><strong>Mirror skeleton</strong> — symmetric character, half then mirror</li>
    <li><strong>Naming strict</strong> — clear name save countless time</li>
    <li><strong>Don&apos;t over-joint</strong> — too many joint complex, hard to weight</li>
    <li><strong>Don&apos;t under-joint</strong> — too few = limited animation</li>
    <li><strong>Industry standard humanoid</strong>: ~50-60 joint typical</li>
    <li><strong>Auto-rig tools</strong>: Advanced Skeleton (Maya), Rigify (Blender) save time</li>
    <li><strong>Mixamo</strong> auto-rig character upload, free</li>
    <li><strong>Test với extreme pose</strong> — find weak point</li>
  </ul>
</section>
`,
  },

  // 06. Skeleton
  {
    id: "a223912a-6aec-4ab6-babf-f25b3b4003c9",
    tieu_de: "Skeleton (3D)",
    tieu_de_viet: "Skeleton trong 3D Character",
    tom_tat:
      "Skeleton là cấu trúc xương ảo được tạo trong phần mềm 3D — cho phép hoạt hình viên tạo chuyển động cho nhân vật và mô hình — synonym với skeletal system.",
    meta_title: "Skeleton là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Skeleton 3D character. Tìm hiểu joint hierarchy, naming, joint orient và workflow setup skeleton chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn character artist hoàn tất sculpt character — beautiful, detailed. Câu hỏi: làm sao animate? Cần build <strong>Skeleton</strong> — bone hierarchy inside character, parents and children of joint create body structure. Animator pose skeleton → mesh deform. Without skeleton, character chỉ là static sculpture. Skeleton = bridge giữa modeling và animation.</p>
  <p>Skeleton là foundation knowledge cho rigger, character artist, animator. Hiểu cấu trúc, joint hierarchy, naming convention, common pitfall giúp build skeleton support quality animation. Critical setup quan trọng nhất cho character pipeline.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Skeleton là gì?</h2>
  <p>Skeleton trong 3D context là <strong>hierarchical structure of joint/bone</strong> bên trong character mesh. Each joint = pivot point + position + orientation. Parent-child relationship — move parent moves children. Foundation cho rigging và animation. Skeleton typically built sau khi modeling, before texturing/rigging.</p>
  <p>Skeleton trên các phần mềm thường được visualize bằng pyramid hoặc sphere connect by line. Behind scene: math hierarchy của transformation matrix. Animation = changing transformation per joint over time. Renderer apply transformation to skinned vertex → mesh follow skeleton motion.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Skeleton vs Armature vs Rig</span>
    <p><strong>Skeleton</strong> (Maya, Unreal): joint hierarchy. <strong>Armature</strong> (Blender term): same concept. <strong>Rig</strong>: skeleton + controllers + IK + constraint = complete animation system. Skeleton is subset of full rig.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Joint</strong> — node position + rotation</li>
    <li><strong>Root</strong> — top hierarchy</li>
    <li><strong>Parent / Child</strong> — relationship</li>
    <li><strong>Bind Pose</strong> — initial rest</li>
    <li><strong>Local Transform</strong> — relative parent</li>
    <li><strong>World Transform</strong> — global</li>
    <li><strong>Joint Hierarchy</strong> — tree structure</li>
    <li><strong>FBX</strong> — common skeleton export</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"skeleton 3D character bones joint maya blender"</span>
    </div>
    <p class="arc-image-caption">Skeleton — hierarchical joint structure, foundation animation</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Skeleton Components</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Root Joint</summary>
      <div class="arc-card-body">
        <p>Top hierarchy. Move entire character. Typically at hip / pelvis. Animation root motion drive locomotion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hip Joint</summary>
      <div class="arc-card-body">
        <p>Often child of root. Drive lower body. Hip rotation key to walking, sitting.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Spine Joints</summary>
      <div class="arc-card-body">
        <p>3-7 joint between hip và neck. Allow torso bend. More joint = more flexibility, more weighting work.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Shoulder &amp; Arm</summary>
      <div class="arc-card-body">
        <p>Clavicle, shoulder, elbow, wrist. Clavicle important cho realistic shoulder motion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hand &amp; Fingers</summary>
      <div class="arc-card-body">
        <p>Wrist → fingers (4 finger × 3 joint + thumb 4 joint). Hand expressive critical, time-intensive setup.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hip &amp; Legs</summary>
      <div class="arc-card-body">
        <p>Hip → knee → ankle → toe. Foot setup careful cho realistic walking — heel, ball, toe.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Neck &amp; Head</summary>
      <div class="arc-card-body">
        <p>Neck base, head. Sometimes additional jaw, eye joint depending facial system.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Helper Joints</summary>
      <div class="arc-card-body">
        <p>Twist joints (forearm twist), corrective joints. Improve deformation quality.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Skeleton Best Practice</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Anatomy Reference</h3>
    <ul class="arc-list">
      <li>Study human anatomy</li>
      <li>Joint at actual position</li>
      <li>Asset reference</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Symmetric Setup</h3>
    <ul class="arc-list">
      <li>Build left side</li>
      <li>Mirror to right</li>
      <li>L_arm_jnt → R_arm_jnt</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Naming Convention</h3>
    <ul class="arc-list">
      <li>Strict consistency</li>
      <li>Side prefix L_/R_</li>
      <li>Suffix _jnt or _bone</li>
      <li>Descriptive: L_arm_elbow_jnt</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Joint Orientation</h3>
    <ul class="arc-list">
      <li>Primary axis (X) down chain</li>
      <li>Consistent across skeleton</li>
      <li>Animator depend on this</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Sufficient Joint Count</h3>
    <ul class="arc-list">
      <li>Don&apos;t over-joint (complicate)</li>
      <li>Don&apos;t under-joint (limit)</li>
      <li>Standard humanoid 50-70 joint</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Engine Compatibility</h3>
    <ul class="arc-list">
      <li>Unreal humanoid skeleton standard</li>
      <li>Unity humanoid avatar</li>
      <li>FBX export tested</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Tools</h2>
  <ul class="arc-list">
    <li><strong>Auto-rig</strong>: Maya Advanced Skeleton, Blender Rigify, Mixamo</li>
    <li><strong>Unreal Mannequin</strong> — standard humanoid skeleton AAA game</li>
    <li><strong>MetaHuman</strong> — Unreal premium digital human với skeleton</li>
    <li><strong>FBX standard format</strong> — share skeleton across software</li>
    <li><strong>USD</strong> — Pixar modern format, increasing adoption</li>
    <li><strong>Joint testing</strong> — pose extreme, check deformation</li>
    <li><strong>Skeleton bake</strong> — preserve joint position after mirror</li>
    <li><strong>Career Rigger</strong> — $60K-130K, skeleton expert valued</li>
    <li><strong>Standard skeleton library</strong> — many studio reuse base skeleton</li>
    <li><strong>Documentation</strong> — comment skeleton purpose, animator handoff</li>
  </ul>
</section>
`,
  },

  // 07. Skinning
  {
    id: "d80e342b-6e2f-47c3-bd73-3e8babda32b3",
    tieu_de: "Skinning (Weight Painting)",
    tieu_de_viet: "Skinning trong 3D",
    tom_tat:
      "Skinning là quá trình gán trọng số (weight) từ xương đến vertex của mesh — quyết định phần nào của mesh di chuyển theo xương nào và bao nhiêu khi rig hoạt động.",
    meta_title: "Skinning là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Skinning, weight painting trong rigging. Tìm hiểu workflow, smooth bind, weight transfer trong Maya, Blender.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn rigger build skeleton tốt. Bind mesh — character bend ở elbow, mesh deform chaotically — vertex assigned wrong bone. Solution: <strong>Skinning</strong> — properly assign weight from each bone to each vertex. Time-intensive painting work — but distinguishes amateur rig vs professional. Pro skinning = animation looks natural; bad skinning = ugly deform.</p>
  <p>Skinning là kỹ năng essential cho rigger, technical artist. Hiểu workflow weight painting, common tools, optimization giúp build skeleton work với mesh smooth. Critical phase cho character animation quality.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Skinning là gì?</h2>
  <p>Skinning là <strong>process binding mesh vertices to skeleton bones</strong>. Mỗi vertex assigned <strong>weight</strong> per bone — value 0-1 indicating influence amount. Vertex on upper arm: 100% shoulder bone (weight 1.0 shoulder, 0 elbow). Vertex at elbow: 50% shoulder, 50% elbow (smooth blend). Bone move → vertex moves theo proportional weight.</p>
  <p>Foundation algorithm: <strong>Linear Blend Skinning (LBS)</strong> — fast, default. Limitation: candy wrapper at joint (volume loss). Modern alternative: <strong>Dual Quaternion (DQS)</strong> — preserve volume better. Some software: <strong>Pose-Space Deformation (PSD)</strong> — corrective shape per pose. Choose based on requirement.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Weight Painting Concept</span>
    <p>Each vertex sum of weights = 1.0. Single bone influence (weight 1.0) = rigid deform. Multiple bone (e.g., 0.5/0.5) = smooth blend. Smooth transition critical at joint. Sharp transition (cliff edge) = visible crease. Goal: smooth gradient where deformation occurs.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Weight</strong> — influence per bone</li>
    <li><strong>Linear Blend Skinning</strong> — basic algorithm</li>
    <li><strong>Dual Quaternion</strong> — volume preserve</li>
    <li><strong>Weight Painting</strong> — paint weight</li>
    <li><strong>Skin Cluster</strong> — Maya skin</li>
    <li><strong>Vertex Group</strong> — Blender</li>
    <li><strong>Smooth Bind</strong> — auto initial</li>
    <li><strong>Heat Map</strong> — visualize weight</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"skinning weight painting 3D character rig maya blender"</span>
    </div>
    <p class="arc-image-caption">Skinning — gán weight vertex-bone, mesh deform theo skeleton</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Skinning Tools</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Maya — Skin Cluster</summary>
      <div class="arc-card-body">
        <p>Standard Maya skinning. Smooth Bind initial, then Paint Skin Weights. Powerful workflow. ngSkinTools plugin enhance.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender — Weight Paint</summary>
      <div class="arc-card-body">
        <p>Built-in weight paint mode. Free. Visual brush. Sufficient cho most case.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3ds Max — Skin Modifier</summary>
      <div class="arc-card-body">
        <p>Skin modifier with envelope and per-vertex. Established workflow. Skin Wrap cho transfer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Houdini — Bones</summary>
      <div class="arc-card-body">
        <p>KineFX rigging system. Weight paint via SOP. Less common but growing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>ZBrush Transpose</summary>
      <div class="arc-card-body">
        <p>Quick masking for pose. Not true skinning but useful cho prop pose.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Brave Rabbit — ngSkinTools</summary>
      <div class="arc-card-body">
        <p>Maya plugin essential cho pro skinning. Layered weights. Best in industry.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Skin Pack (Maya)</summary>
      <div class="arc-card-body">
        <p>Built-in skin weight transfer between mesh. Useful cho LOD, swap mesh.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Skinning Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Smooth Bind Initial</h3>
    <ul class="arc-list">
      <li>Auto algorithm assign initial weight</li>
      <li>Most software có Smooth Bind / similar</li>
      <li>Starting point</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Test Pose</h3>
    <ul class="arc-list">
      <li>Pose at extreme — arm up, leg out</li>
      <li>Identify problem area</li>
      <li>Note where weight wrong</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Paint Weight</h3>
    <ul class="arc-list">
      <li>Select problematic vertex</li>
      <li>Adjust influence per bone</li>
      <li>Smooth transition</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Per-Bone Pass</h3>
    <ul class="arc-list">
      <li>One bone at a time</li>
      <li>Verify influence range</li>
      <li>No stray vertex</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Smooth Transition</h3>
    <ul class="arc-list">
      <li>Gradual weight change at joint</li>
      <li>Avoid hard edge</li>
      <li>Test bend</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Joint Volume Preservation</h3>
    <ul class="arc-list">
      <li>Elbow bend không lose volume</li>
      <li>Dual quaternion option</li>
      <li>Helper joint at twist</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Twist Joint Setup</h3>
    <ul class="arc-list">
      <li>Forearm twist joint cho wrist</li>
      <li>Avoid candy wrapper</li>
      <li>Subtle improvement major impact</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Animation Test</h3>
    <ul class="arc-list">
      <li>Run sample animation</li>
      <li>Check all extreme</li>
      <li>Fix remaining issue</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Skinning</h2>
  <ul class="arc-list">
    <li><strong>Smooth bind start</strong> — auto baseline saves time</li>
    <li><strong>Mirror weight</strong> — left side then mirror right</li>
    <li><strong>Per-bone approach</strong> — focus one bone at a time</li>
    <li><strong>Test extreme pose</strong> — find weak point</li>
    <li><strong>Gradient at joint</strong> — smooth transition critical</li>
    <li><strong>ngSkinTools Maya</strong> — pro tool layered weight</li>
    <li><strong>Skin transfer</strong> — reuse weight on similar mesh</li>
    <li><strong>Dual quaternion</strong> cho preserve volume at twist</li>
    <li><strong>Helper joint</strong> — corrective shape difficult area</li>
    <li><strong>Time-intensive</strong> — quality skinning days per character</li>
  </ul>
</section>
`,
  },

  // 08. Slider Controller
  {
    id: "37adfef8-6a0b-4673-b441-0fb0f4492c21",
    tieu_de: "Slider Controller",
    tieu_de_viet: "Slider Controller (Điều khiển trượt)",
    tom_tat:
      "Slider Controller là điều khiển dạng thanh trượt trong rig nhân vật — kéo slider để blend giữa các biểu cảm khuôn mặt hoặc trạng thái nhân vật, đơn giản hóa workflow animator.",
    meta_title:
      "Slider Controller là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Slider Controller trong rigging. Tìm hiểu workflow setup facial slider, blend shape control và animator-friendly UI.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn animator pose character face. Method 1: select 30 facial joint, adjust mỗi cái — tedious. Method 2: kéo <strong>Slider Controller</strong> &quot;Smile&quot; — face animate smile complete. Slider làm 30 movements behind scene. Productivity multiplier. Standard cho facial rig modern. Pixar, Industrial Light &amp; Magic, all use slider-based facial rig.</p>
  <p>Slider Controller là kỹ thuật pro cho rigger, character TD. Hiểu setup, FACS-based slider, animation-friendly UI giúp build rig animator yêu. Distinguish hobbyist rig vs production rig. Foundation cho facial animation efficient.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Slider Controller là gì?</h2>
  <p>Slider Controller là <strong>UI element trong rig</strong> animator interact để control character state. Visual representation: thanh trượt với value 0-1 hoặc -1 to 1. Behind scene: slider drives multiple underlying parameter (joint rotation, blend shape weight). One slider abstract complex movement combination.</p>
  <p>Most common application: <strong>facial rigging</strong>. Sliders cho mỗi facial expression (Smile, Frown, Eyebrow Raise, Eye Wide, Eye Squint, Mouth Open). Each slider drive multiple blend shape hoặc joint. Animator focus on artistic decision (how much smile?) rather than mechanical control (which joint?). Industry standard cho facial animation.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Slider Use Cases</span>
    <p><strong>Facial</strong>: most common — smile, blink, eyebrow. <strong>Body shape</strong>: muscle flex, fat distribution. <strong>Costume</strong>: cloth size, prop attachment. <strong>Color</strong>: skin tone variation. <strong>Anything driven by single value</strong>: slider candidate.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Slider Range</strong> — 0-1 or -1 to 1</li>
    <li><strong>Custom Attribute</strong> — slider implementation</li>
    <li><strong>Driven Key</strong> — value drive other</li>
    <li><strong>Set Driven Key (SDK)</strong> — Maya feature</li>
    <li><strong>Blend Shape</strong> — common slider driven</li>
    <li><strong>Picker UI</strong> — visual slider interface</li>
    <li><strong>FACS</strong> — Facial Action Coding</li>
    <li><strong>Visemes</strong> — mouth shape lip sync</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"slider controller facial rig blend shape animator UI"</span>
    </div>
    <p class="arc-image-caption">Slider Controller — animator-friendly UI, simplify rig interaction</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Common Slider Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>FACS Action Unit Sliders</summary>
      <div class="arc-card-body">
        <p>Facial Action Coding System — 46 atomic facial movement. Pro facial rig has slider per AU. Industry standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Emotion Sliders</summary>
      <div class="arc-card-body">
        <p>Happy, Sad, Angry, Surprise, Fear, Disgust. Each slider drives multiple AU. High-level emotion control.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Viseme Sliders</summary>
      <div class="arc-card-body">
        <p>Mouth shape per phoneme — A, O, M, EE. 15-20 visemes typical. Drive lip sync animation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Eye Control</summary>
      <div class="arc-card-body">
        <p>Look direction (left, right, up, down). Eyelid blink, squint. Look At target alternative.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Body Tension</summary>
      <div class="arc-card-body">
        <p>Muscle flex, posture tension slider. Specific to character. Add personality.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Costume Variation</summary>
      <div class="arc-card-body">
        <p>Toggle costume element on/off. Hat appears/disappears. Animation state.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>IK / FK Switch</summary>
      <div class="arc-card-body">
        <p>Slider 0 = FK, 1 = IK. Animator switch arm/leg mode.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Visibility</summary>
      <div class="arc-card-body">
        <p>Show/hide controller layer. Animator focus on current task.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Setup Slider</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Custom Attribute</h3>
    <ul class="arc-list">
      <li>Add attribute to controller</li>
      <li>Type: float</li>
      <li>Range 0-1 or -1 to 1</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Set Driven Key</h3>
    <ul class="arc-list">
      <li>Slider 0: blend shape 0</li>
      <li>Slider 1: blend shape 1</li>
      <li>SDK in Maya</li>
      <li>Drivers in Blender</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Test Slider</h3>
    <ul class="arc-list">
      <li>Move slider 0 → 1</li>
      <li>Verify smooth transition</li>
      <li>No glitch</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Multiple Driven</h3>
    <ul class="arc-list">
      <li>One slider drives multiple shape</li>
      <li>Smile = mouth + cheek + eye</li>
      <li>Realistic compound</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Picker UI</h3>
    <ul class="arc-list">
      <li>Build visual interface</li>
      <li>Sliders organized by region</li>
      <li>Face UI panel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Limit Range</h3>
    <ul class="arc-list">
      <li>Clamp slider 0-1</li>
      <li>Prevent extreme</li>
      <li>Animator can&apos;t break rig</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Combine với Other Control</h3>
    <ul class="arc-list">
      <li>Slider + direct joint manipulation</li>
      <li>Layered approach</li>
      <li>Flexibility</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Documentation</h3>
    <ul class="arc-list">
      <li>Slider name clear</li>
      <li>Document what each does</li>
      <li>Animator handoff</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Tools</h2>
  <ul class="arc-list">
    <li><strong>FACS-based slider</strong> — industry standard, scientific basis</li>
    <li><strong>Animator-friendly naming</strong> — descriptive, sortable</li>
    <li><strong>Limit slider</strong> — clamped range prevent extreme</li>
    <li><strong>Slider in viewport</strong> — accessible without UI dialog</li>
    <li><strong>Picker UI</strong>: Studio Library, AnimSchool Picker, custom</li>
    <li><strong>Maya SDK</strong> — Set Driven Key foundational</li>
    <li><strong>Blender Driver</strong> — similar concept</li>
    <li><strong>Combine with blend shape</strong> — most common pattern</li>
    <li><strong>Negative value</strong> — sad = -1, happy = 1 single slider</li>
    <li><strong>Test extensively</strong> — animator find weakness fast</li>
  </ul>
</section>
`,
  },

  // 09. Slider Revolution
  {
    id: "559aed5e-7fc6-464b-8b36-ae209af76769",
    tieu_de: "Slider Revolution",
    tieu_de_viet: "Plugin Slider Revolution",
    tom_tat:
      "Slider Revolution là plugin WordPress tạo slider và presentation tương tác với animation phức tạp — phổ biến cho web design tạo hero section và showcase sản phẩm.",
    meta_title:
      "Slider Revolution là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Slider Revolution WordPress plugin. Tìm hiểu cách tạo slider hiệu ứng, hero section, animation timeline và tips optimize.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn web designer xây dựng WordPress site cho client — cần hero section animated dramatic. Phương pháp manual code: hours of CSS, JavaScript. Solution: <strong>Slider Revolution</strong> — plugin WordPress với visual editor build animation phức tạp. Drag-drop element, timeline keyframe, hundreds template. Industry standard cho high-end WordPress sites, premium feel.</p>
  <p>Slider Revolution là kỹ thuật pro cho WordPress web designer. Hiểu interface, timeline animation, template library giúp build engaging hero section nhanh chóng. Plus: integration với theme, optimization tips cho performance. Common skill cho freelance WP designer.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Slider Revolution là gì?</h2>
  <p>Slider Revolution là <strong>premium WordPress plugin</strong> by ThemePunch — visual builder cho creating animated slider, hero section, scrolling presentation. Hơn 8 million sale globally. Industry standard cho premium WordPress theme. Drag-drop interface accessible non-coder, timeline-based animation cho complex motion.</p>
  <p>Features: <strong>Hero section</strong> với animation, <strong>Slider</strong> (image, video, content), <strong>Scrolling Presentation</strong> (one-page reveals), <strong>Hundreds of Template</strong> ready-to-use, <strong>Visual Editor</strong> với layer panel, <strong>Animation Timeline</strong> với keyframe, <strong>Responsive</strong> per breakpoint, <strong>Module Library</strong> common pattern.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Slider Revolution vs Alternatives</span>
    <p><strong>Slider Revolution</strong>: industry standard, comprehensive. <strong>LayerSlider</strong>: similar, less features. <strong>MetaSlider</strong>: simpler, free option. <strong>WP Smart Slider</strong>: capable alternative. <strong>Custom code</strong>: Slick, Swiper.js library cho developer. Choose based on need và skill.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Module</strong> — single slider unit</li>
    <li><strong>Slide</strong> — individual frame</li>
    <li><strong>Layer</strong> — element within slide</li>
    <li><strong>Timeline</strong> — animation track</li>
    <li><strong>Template Library</strong> — pre-built</li>
    <li><strong>Responsive Edit</strong> — per breakpoint</li>
    <li><strong>Action / Behavior</strong> — interaction</li>
    <li><strong>Premium Plugin</strong> — paid (~$87 lifetime)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"slider revolution wordpress hero section animation plugin"</span>
    </div>
    <p class="arc-image-caption">Slider Revolution — WordPress plugin tạo slider animated chuyên nghiệp</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Features Overview</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Visual Editor</summary>
      <div class="arc-card-body">
        <p>Drag-drop interface. Layer panel like Photoshop. Add image, text, button, shape, SVG. No code required cho basic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animation Timeline</summary>
      <div class="arc-card-body">
        <p>Keyframe-based timeline. Animate each layer. Position, scale, rotation, opacity. Easing curve control.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Template Library</summary>
      <div class="arc-card-body">
        <p>200+ template ready-to-use. Hero section, slider, presentation. Customize starter point. Save hours.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Responsive Editing</summary>
      <div class="arc-card-body">
        <p>Adjust per breakpoint — desktop, tablet, mobile. Independent layout. Critical mobile-first.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Interactive Action</summary>
      <div class="arc-card-body">
        <p>Click action, hover effect, navigation. Build interactive presentation. Behavior modify on event.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Video / Audio</summary>
      <div class="arc-card-body">
        <p>YouTube, Vimeo, self-hosted video as BG. Audio sync. Multimedia rich content.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Background Effect</summary>
      <div class="arc-card-body">
        <p>Parallax, particle, Ken Burns. Dynamic background. Add depth.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Module Library</summary>
      <div class="arc-card-body">
        <p>Reusable component. Header, hero, gallery patterns. Save own as template.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Install Plugin</h3>
    <ul class="arc-list">
      <li>Purchase Slider Revolution license</li>
      <li>Upload to WordPress</li>
      <li>Activate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Browse Template</h3>
    <ul class="arc-list">
      <li>200+ template browse</li>
      <li>Select closest to vision</li>
      <li>Import</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Customize Content</h3>
    <ul class="arc-list">
      <li>Replace text, image</li>
      <li>Brand color</li>
      <li>Logo, font</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Adjust Animation</h3>
    <ul class="arc-list">
      <li>Timeline edit</li>
      <li>Timing per layer</li>
      <li>Easing adjust</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Responsive Edit</h3>
    <ul class="arc-list">
      <li>Switch to tablet view</li>
      <li>Adjust position, size</li>
      <li>Mobile view final</li>
      <li>Each breakpoint optimal</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Test Browser</h3>
    <ul class="arc-list">
      <li>Chrome, Firefox, Safari</li>
      <li>Mobile actual device</li>
      <li>Catch issue</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Embed</h3>
    <ul class="arc-list">
      <li>Shortcode insert</li>
      <li>Visual builder block</li>
      <li>Theme integration</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Performance Optimize</h3>
    <ul class="arc-list">
      <li>Image compression</li>
      <li>Lazy load</li>
      <li>Defer JS</li>
      <li>Monitor PageSpeed</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Performance</h2>
  <ul class="arc-list">
    <li><strong>License $87 lifetime</strong> — affordable cho freelance</li>
    <li><strong>Performance concern</strong> — heavy plugin, optimize image critical</li>
    <li><strong>Image compression</strong> — WebP, TinyPNG before upload</li>
    <li><strong>Limit animation</strong> — too much animation = slow page</li>
    <li><strong>Mobile static option</strong> — disable animation mobile cho performance</li>
    <li><strong>Lazy load</strong> built-in option</li>
    <li><strong>Cache plugin compatibility</strong> — W3 Total Cache, WP Rocket</li>
    <li><strong>Template start point</strong> — heavy customize</li>
    <li><strong>WordPress theme</strong> — often comes pre-installed</li>
    <li><strong>Alternative cho free</strong>: MetaSlider, Smart Slider 3 free version</li>
  </ul>
</section>
`,
  },

  // 10. Slow-Motion
  {
    id: "caf3fa66-ced3-4337-90ed-c294ca254f24",
    tieu_de: "Slow-Motion",
    tieu_de_viet: "Quay chậm (Slow-Motion)",
    tom_tat:
      "Slow-Motion là kỹ thuật quay ở tốc độ frame cao (120fps, 240fps, 1000fps) để khi phát ở tốc độ thông thường tạo chuyển động chậm — dùng trong quảng cáo, thể thao, phim.",
    meta_title: "Slow-Motion là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Slow-Motion video. Tìm hiểu high frame rate shooting, camera Phantom, post production và workflow cho commercial.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Apple commercial — water droplet impact slow mo, beautiful detail visible. Hoặc Marvel film — Quicksilver scene 6000fps quay, action moment dramatic. <strong>Slow-Motion</strong> reveal detail invisible to naked eye, create emotional impact. Foundation cinematic moment trong modern film, advertising, sport coverage.</p>
  <p>Slow-Motion là kỹ thuật essential cho cinematographer, video editor. Hiểu camera capability, frame rate planning, post-production workflow giúp execute slow motion effective. Critical cho premium video content — music video, commercial, indie film.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Slow-Motion là gì?</h2>
  <p>Slow-Motion là <strong>technique recording at higher frame rate</strong> than playback rate. Camera capture 120 frame/second, playback 24 fps = 5x slower than real. 240fps → 24fps = 10x slow. Specialized camera (Phantom Flex) cap 1000+ fps cho extreme slow mo. Each frame captures different motion increment — playback dilate time, reveal detail.</p>
  <p>Two approach: <strong>In-camera slow motion</strong> (true high frame rate recording, best quality) — REQUIRES camera với high fps capability. <strong>Post-production slow motion</strong> (optical flow interpolation từ standard 24/30fps) — synthetic, lower quality. Major difference quality. Pro production shoot high fps when slow mo planned.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Frame Rate Slow Motion</span>
    <p><strong>60fps → 24fps</strong>: 2.5x slow. Mild. <strong>120fps → 24fps</strong>: 5x slow. Standard cinematic. <strong>240fps → 24fps</strong>: 10x slow. Beautiful detail. <strong>1000fps+</strong>: extreme cinematic. Phantom camera. Choose based on action speed.</p>
  </div>

  <ul class="arc-list">
    <li><strong>High Frame Rate (HFR)</strong> — recording fast</li>
    <li><strong>Phantom Camera</strong> — pro slow mo</li>
    <li><strong>Optical Flow</strong> — post-process slow mo</li>
    <li><strong>Twixtor</strong> — popular slow mo plugin</li>
    <li><strong>Motion Blur</strong> — capture per frame</li>
    <li><strong>Shutter Speed</strong> — match frame rate</li>
    <li><strong>Light Requirement</strong> — high fps need more light</li>
    <li><strong>Storage</strong> — high fps massive data</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"slow motion video high frame rate phantom camera"</span>
    </div>
    <p class="arc-image-caption">Slow-Motion — high frame rate recording, dilate time reveal detail</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Camera Capability</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Phantom Flex / VEO</summary>
      <div class="arc-card-body">
        <p>Pro cinema slow mo. 1000-25000+ fps at HD. $50K-200K camera. Marvel, commercial, sport. Rental common.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>RED Komodo, V-Raptor</summary>
      <div class="arc-card-body">
        <p>120fps 4K, 240fps lower. Cinema camera. Premium indie / commercial choice.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sony FX3, FX6, A7S III</summary>
      <div class="arc-card-body">
        <p>120fps 4K. Affordable cinema. Wedding, commercial, indie. Cropped sensor at high fps sometimes.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Canon C70, R5</summary>
      <div class="arc-card-body">
        <p>120fps 4K, R5 240fps cropped. Mid-tier cinema.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blackmagic Pocket Cinema</summary>
      <div class="arc-card-body">
        <p>120fps capable. BRAW slow mo. Affordable.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>iPhone 14 Pro+</summary>
      <div class="arc-card-body">
        <p>240fps 1080p, 120fps 4K. Surprising quality. Casual slow mo accessible.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>GoPro Hero</summary>
      <div class="arc-card-body">
        <p>240fps 1080p. Action camera slow mo standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DSLR (Older)</summary>
      <div class="arc-card-body">
        <p>60fps standard. Limited cho slow mo. Optical flow post.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Shooting Slow Motion</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Plan FPS</h3>
    <ul class="arc-list">
      <li>Determine slow factor</li>
      <li>120fps → 24p = 5x (most use case)</li>
      <li>Planning shoot decision</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Shutter Speed Rule</h3>
    <ul class="arc-list">
      <li>1/(2× frame rate) typical</li>
      <li>120fps → 1/240 shutter</li>
      <li>Natural motion blur</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. More Light</h3>
    <ul class="arc-list">
      <li>Faster shutter = less light</li>
      <li>120fps requires 4x more light</li>
      <li>Larger aperture, ISO, more light source</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Camera Stable</h3>
    <ul class="arc-list">
      <li>Motion exaggerated slow mo</li>
      <li>Tripod, gimbal, slider essential</li>
      <li>Handheld emphasized</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Storage Plan</h3>
    <ul class="arc-list">
      <li>High fps = 4-10x more data</li>
      <li>Fast SD card / SSD essential</li>
      <li>Large storage requirement</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Director Plan Action</h3>
    <ul class="arc-list">
      <li>Action moment specific</li>
      <li>Plan trigger</li>
      <li>Brief actor</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Post-Production</h3>
    <ul class="arc-list">
      <li>Conform to project frame rate</li>
      <li>Sound design important slow mo</li>
      <li>Music sync</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Color Grade</h3>
    <ul class="arc-list">
      <li>Slow mo emphasize color</li>
      <li>Critical color match với rest</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Slow Motion</h2>
  <ul class="arc-list">
    <li><strong>Plan in pre-production</strong> — shoot HFR if slow mo planned</li>
    <li><strong>180° shutter rule</strong> — natural motion blur preserved</li>
    <li><strong>Light heavy</strong> — slow mo light-hungry</li>
    <li><strong>Stable platform</strong> — every micro-jitter visible</li>
    <li><strong>Sound design</strong> — slow mo audio needs design (silence, designed sound, pitch shift)</li>
    <li><strong>Don&apos;t overuse</strong> — every shot slow mo loses impact</li>
    <li><strong>Hit specific moment</strong> — water drop impact, expression peak</li>
    <li><strong>Post slow mo backup</strong> — Twixtor when missed shooting HFR</li>
    <li><strong>Storage budget</strong> — 5-10x larger than normal</li>
    <li><strong>Music video, commercial</strong> — common use case</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 3 · Batch 3 — chạy ${items.length} bài keyword (Q → Z) ──\n`,
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
