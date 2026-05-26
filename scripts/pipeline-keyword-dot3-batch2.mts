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
  // 01. Responsive
  {
    id: "0497c8f8-08b0-419f-9584-4c4b05d2f4f4",
    tieu_de: "Responsive Design",
    tieu_de_viet: "Thiết kế Responsive",
    tom_tat:
      "Responsive là thiết kế web thích ứng với nhiều kích thước màn hình — layout, font, hình ảnh tự điều chỉnh để hiển thị tốt trên điện thoại, tablet, và màn hình lớn.",
    meta_title:
      "Responsive Design là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Responsive Design workflow. Tìm hiểu breakpoint, flexbox, grid, mobile-first và best practice cho web modern.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn build website cho khách hàng. Desktop view đẹp — layout 3 column. User mở từ iPhone — same layout, text tí xíu, có vẻ broken. Đó là tại sao <strong>Responsive Design</strong> bắt buộc cho mọi website modern. Mobile traffic chiếm 60% global, designer phải account cho mọi screen size từ 320px phone đến 4K monitor.</p>
  <p>Responsive Design là kiến thức essential cho mọi web designer, frontend developer. Hiểu breakpoint, layout system (Flexbox, CSS Grid), mobile-first approach giúp tạo website work seamless across device. Foundation cho modern UX.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Responsive Design là gì?</h2>
  <p>Responsive Design là <strong>approach thiết kế web</strong> trong đó layout, content, image tự động <strong>adapt</strong> theo screen size, orientation, capability của device. Single website code base serve well across phone, tablet, laptop, desktop, TV. Coined by Ethan Marcotte 2010, became industry standard. Google search engine prioritize responsive site — SEO benefit.</p>
  <p>Core techniques: <strong>Fluid Grid</strong> (percentage-based width thay vì fixed pixel), <strong>Flexible Image</strong> (max-width 100%), <strong>Media Query</strong> (CSS rule per screen size), <strong>Breakpoint</strong> (specific width trigger layout shift). Modern enhancement: <strong>Flexbox</strong>, <strong>CSS Grid</strong>, <strong>Container Query</strong>, <strong>Responsive Typography</strong> với clamp().</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Responsive vs Adaptive vs Mobile</span>
    <p><strong>Responsive</strong>: single code, fluid adapt. <strong>Adaptive</strong>: multiple discrete layout per screen size. <strong>Mobile-only site</strong>: separate URL/code cho mobile. Responsive modern standard — single source of truth, easier maintenance.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Breakpoint</strong> — screen width trigger layout</li>
    <li><strong>Media Query</strong> — CSS conditional</li>
    <li><strong>Flexbox</strong> — 1D layout</li>
    <li><strong>CSS Grid</strong> — 2D layout</li>
    <li><strong>Mobile-first</strong> — design mobile then up</li>
    <li><strong>Viewport Meta Tag</strong> — mobile rendering</li>
    <li><strong>Container Query</strong> — modern responsive</li>
    <li><strong>Fluid Typography</strong> — text scale với screen</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"responsive design web mobile tablet desktop breakpoint"</span>
    </div>
    <p class="arc-image-caption">Responsive Design — single code, multiple device, adapt fluidly</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Common Breakpoint</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Mobile First (Standard)</summary>
      <div class="arc-card-body">
        <p>Default style cho smallest screen. Add media query cho larger screen. Modern approach. Bootstrap, Tailwind follow this.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>320-480px (Phone)</summary>
      <div class="arc-card-body">
        <p>Single column. Stack vertical. Hamburger menu. Touch-friendly button size (44x44px min). 75% of web traffic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>481-768px (Large Phone / Small Tablet)</summary>
      <div class="arc-card-body">
        <p>Beginning of 2-column. Increase font slightly. Show more nav option.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>769-1024px (Tablet)</summary>
      <div class="arc-card-body">
        <p>Multi-column emerges. Sidebar appears. Card grid layout. iPad common breakpoint.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>1025-1440px (Laptop / Desktop)</summary>
      <div class="arc-card-body">
        <p>Full multi-column. Sidebar + main + secondary. Full nav menu.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>1441+ (Large Desktop / 4K)</summary>
      <div class="arc-card-body">
        <p>Max content width 1200-1440px typical. Center content. Avoid overstretched.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Container Query (Modern)</summary>
      <div class="arc-card-body">
        <p>Style based on parent container size, not viewport. CSS new feature. More flexible component design.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Responsive</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Mobile-First Design</h3>
    <ul class="arc-list">
      <li>Sketch mobile layout first</li>
      <li>Prioritize content hierarchy</li>
      <li>Touch-friendly UI</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Wireframe All Breakpoint</h3>
    <ul class="arc-list">
      <li>Figma frames 375, 768, 1280</li>
      <li>Plan how layout shift</li>
      <li>Component variation per size</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Code Mobile Default</h3>
    <ul class="arc-list">
      <li>Style without media query = mobile</li>
      <li>Min-width media query add desktop</li>
      <li>Progressive enhancement</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Flexbox / Grid</h3>
    <ul class="arc-list">
      <li>Flexbox 1D row/column</li>
      <li>Grid 2D complex layout</li>
      <li>Modern, powerful</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Responsive Images</h3>
    <ul class="arc-list">
      <li>srcset multiple resolution</li>
      <li>picture element art direction</li>
      <li>WebP modern format</li>
      <li>Lazy load</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Test on Real Devices</h3>
    <ul class="arc-list">
      <li>Browser DevTools mobile simulation</li>
      <li>Real phone testing critical</li>
      <li>BrowserStack cross-device</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Performance</h3>
    <ul class="arc-list">
      <li>Mobile data slower</li>
      <li>Optimize image, font</li>
      <li>Lighthouse audit</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Iterate</h3>
    <ul class="arc-list">
      <li>User test mobile</li>
      <li>Adjust based feedback</li>
      <li>Continuous improvement</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Tools</h2>
  <ul class="arc-list">
    <li><strong>Mobile-first always</strong> — modern standard</li>
    <li><strong>Use rem/em</strong> instead of px for typography — scale với user preference</li>
    <li><strong>Tailwind CSS</strong> — utility-first responsive built-in</li>
    <li><strong>Bootstrap</strong> — battle-tested responsive framework</li>
    <li><strong>Figma Auto Layout</strong> — design responsive component</li>
    <li><strong>Test real device</strong> — emulator không catch all issue</li>
    <li><strong>Performance critical mobile</strong> — slow connection user impatient</li>
    <li><strong>Touch target</strong> 44x44px minimum cho phone</li>
    <li><strong>Avoid hover-only</strong> interaction — phone không có hover</li>
    <li><strong>Container query</strong> future direction, component-level responsive</li>
  </ul>
</section>
`,
  },

  // 02. Retargeting
  {
    id: "2f0dbb24-c1ce-4e72-adf5-4a12a9feea5e",
    tieu_de: "Retargeting (Motion Capture)",
    tieu_de_viet: "Retargeting Motion Capture",
    tom_tat:
      "Retargeting là quá trình chuyển dữ liệu chuyển động từ skeleton này sang skeleton khác có cấu trúc xương khác nhau — reuse mocap data, library cho nhiều character.",
    meta_title:
      "Retargeting là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Retargeting Motion Capture. Tìm hiểu Maya HumanIK, MotionBuilder, Unreal IK Retargeter workflow chuẩn industry.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn animator có mocap library — actor walking, running, jumping. Project cần animate 5 different character — proportions khác nhau (giant, dwarf, child). Re-record mocap cho mỗi? Expensive. Solution: <strong>Retargeting</strong> — transfer mocap data from source skeleton to target skeleton automatically. Adjust theo proportion difference. Mocap library investment becomes reusable across project.</p>
  <p>Retargeting là kỹ thuật essential cho character animator, technical animator. Hiểu workflow, software (HumanIK, MotionBuilder, Unreal), common issue giúp reuse mocap efficient. Critical cho game studio với mocap pipeline, indie với purchased mocap library.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Retargeting là gì?</h2>
  <p>Retargeting là <strong>process transferring motion data</strong> từ source skeleton (typically mocap actor) đến target skeleton (game character). Two skeleton thường có different proportion — actor 1.8m vs character 1.5m or stylized 1.0m. Retargeting algorithm adjust angle, position để motion look correct on target despite proportion difference.</p>
  <p>Key principle: <strong>skeleton mapping</strong> — match equivalent bone giữa skeletons (shoulder→shoulder, elbow→elbow). Joint angle from source applied to target. Position can be normalized hoặc preserved. Foot placement preserved (foot IK) — feet stay on ground despite leg length difference.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Retargeting Methods</span>
    <p><strong>Rotation-based</strong>: copy joint rotation. Simple, may cause foot slide. <strong>IK-based</strong>: preserve end effector position (hand, foot). Better result complex. <strong>Hybrid</strong>: rotation for spine/arm, IK for foot. Modern approach.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Source Skeleton</strong> — mocap actor</li>
    <li><strong>Target Skeleton</strong> — game character</li>
    <li><strong>Bone Mapping</strong> — match equivalent bone</li>
    <li><strong>T-Pose</strong> — reference rest pose</li>
    <li><strong>Foot IK</strong> — preserve ground contact</li>
    <li><strong>Hand IK</strong> — preserve grip</li>
    <li><strong>Pivot Offset</strong> — adjust origin</li>
    <li><strong>HumanIK</strong> — Maya/MotionBuilder standard</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"retargeting motion capture skeleton mocap unreal maya"</span>
    </div>
    <p class="arc-image-caption">Retargeting — transfer motion từ skeleton này sang skeleton khác</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Software Retargeting</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>MotionBuilder (Autodesk)</summary>
      <div class="arc-card-body">
        <p>Industry standard cho mocap cleanup và retargeting. HumanIK system. Professional motion capture pipeline.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Maya — HumanIK</summary>
      <div class="arc-card-body">
        <p>HumanIK in Maya. Same system as MotionBuilder. Integrate với rigging workflow. Standard production tool.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unreal Engine — IK Retargeter</summary>
      <div class="arc-card-body">
        <p>UE5 modern IK Retargeter. Visual workflow. Transfer animation between any skeleton. Integration với MetaHuman, Mixamo.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unity — Humanoid Avatar</summary>
      <div class="arc-card-body">
        <p>Humanoid Avatar system. Auto-mapped skeleton. Animation transferable across humanoid character. Mecanim system.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender</summary>
      <div class="arc-card-body">
        <p>Auto-Rig Pro add-on cho retargeting. Built-in less developed. Free workflow option.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>iClone</summary>
      <div class="arc-card-body">
        <p>Character animation focused. Retargeting integrated. Indie/freelance friendly.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cascadeur</summary>
      <div class="arc-card-body">
        <p>AI-assisted animation. Retargeting với physics-aware adjustment.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Retargeting</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Prepare Source &amp; Target</h3>
    <ul class="arc-list">
      <li>Both in T-pose (or A-pose consistent)</li>
      <li>Skeleton clean naming</li>
      <li>Hierarchy proper</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Define Bone Mapping</h3>
    <ul class="arc-list">
      <li>Map source bone to target equivalent</li>
      <li>Spine → spine, head → head</li>
      <li>Most software auto-detect humanoid</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. T-Pose Match</h3>
    <ul class="arc-list">
      <li>Source T-pose match target T-pose</li>
      <li>Calibration step</li>
      <li>Subsequent motion offset từ this base</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Apply Animation</h3>
    <ul class="arc-list">
      <li>Source animation drives target</li>
      <li>Preview result</li>
      <li>Check problems</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Foot IK Lock</h3>
    <ul class="arc-list">
      <li>Foot should stay on ground</li>
      <li>Sliding common issue</li>
      <li>IK constraint fix</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Hand IK</h3>
    <ul class="arc-list">
      <li>Hand reach object — preserve position</li>
      <li>Weapon grip etc</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Cleanup</h3>
    <ul class="arc-list">
      <li>Manual fix specific issue</li>
      <li>Hand collision với body</li>
      <li>Foot floating</li>
      <li>Joint flip</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Bake Animation</h3>
    <ul class="arc-list">
      <li>Bake retargeted to keyframe</li>
      <li>Cho game engine import</li>
      <li>FBX export</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Retargeting</h2>
  <ul class="arc-list">
    <li><strong>T-pose calibration critical</strong> — wrong T-pose = entire animation off</li>
    <li><strong>Foot slide common</strong> — IK fix necessary</li>
    <li><strong>Proportion big difference</strong> — large skeleton change → manual fix many</li>
    <li><strong>Mixamo</strong>: free auto-rig + animation library, easy retarget Unity/Unreal</li>
    <li><strong>MotionBuilder MOT</strong> — preserve professional quality cleanup</li>
    <li><strong>Bake before export</strong> — game engine prefer keyframe data</li>
    <li><strong>Frame rate match</strong> — 30 vs 60 fps consideration</li>
    <li><strong>Test in engine</strong> — animation looks different at runtime</li>
    <li><strong>Career Tech Animator</strong> — retargeting specialty $80K-150K</li>
    <li><strong>Mocap industry growing</strong> — Vicon, OptiTrack pro, Rokoko, Move.ai accessible</li>
  </ul>
</section>
`,
  },

  // 03. Retopology
  {
    id: "889e320f-0975-42a6-835f-cb265a6717ef",
    tieu_de: "Retopology",
    tieu_de_viet: "Retopology (Tạo lại topology)",
    tom_tat:
      "Retopology là quá trình tạo lại mesh mới với topology sạch hơn từ model polygon cao hoặc sculpt — cần thiết trước khi UV unwrap, rig, hoặc đưa vào game engine.",
    meta_title: "Retopology là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Retopology workflow. Tìm hiểu manual retopo, ZRemesher, Quad Draw, ZBrush ZSphere và best practice cho game model.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn 3D artist sculpt character trong ZBrush — millions polygon, detail tuyệt vời. Now need game engine — Unity import? Crash. Animation rig? Cannot deform clean với messy topology. Solution: <strong>Retopology</strong> — create new clean low-poly mesh on top of sculpt. Bake high-poly detail to normal map. Result: game-ready model. Standard production workflow.</p>
  <p>Retopology là kỹ thuật essential cho character artist, game artist, prop modeler. Hiểu workflow manual vs auto, software (ZBrush ZRemesher, Maya Quad Draw, Blender Retopoflow), edge flow giúp tạo deform-friendly mesh cho animation. Critical cho production-ready 3D asset.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Retopology là gì?</h2>
  <p>Retopology là kỹ thuật <strong>tạo new mesh</strong> trên top of existing reference (typically high-poly sculpt). New mesh có <strong>clean topology</strong> — appropriate polygon count, quad-dominant, good edge flow theo muscle/form. Original detail bakeed thành normal map, AO, displacement map cho preserve visual quality.</p>
  <p>Why need: <strong>animation</strong> (high-poly deform poorly), <strong>performance</strong> (millions polygon game crash), <strong>UV unwrap</strong> (impossible on messy sculpt mesh), <strong>edge flow</strong> (loop around eye, mouth cho facial animation). Production-grade model demands retopology.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Retopology Approach</span>
    <p><strong>Manual</strong>: full control, slow. Highest quality. <strong>Auto (ZRemesher, Quad Remesher)</strong>: fast, decent. Good cho non-animated, environment prop. <strong>Hybrid</strong>: auto base + manual refine. Modern industry standard.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Edge Flow</strong> — direction of edge loop</li>
    <li><strong>Quad-Dominant</strong> — mostly quad polygon</li>
    <li><strong>Pole</strong> — vertex with 3 or 5 edge</li>
    <li><strong>Loop</strong> — connected edge ring</li>
    <li><strong>Manual Retopo</strong> — slow, precise</li>
    <li><strong>Auto Retopo</strong> — algorithm</li>
    <li><strong>ZRemesher</strong> — ZBrush auto</li>
    <li><strong>Quad Remesher</strong> — Maya/Blender plugin</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"retopology 3D character clean topology zbrush maya"</span>
    </div>
    <p class="arc-image-caption">Retopology — new clean mesh trên sculpt, production-ready</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Software Retopology</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>ZBrush — ZRemesher</summary>
      <div class="arc-card-body">
        <p>Auto retopology built-in. Set target polycount. Curve guide for edge flow control. Excellent cho organic. Quick result.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Maya — Quad Draw</summary>
      <div class="arc-card-body">
        <p>Manual retopology tool. Modeling Toolkit. Industry standard cho production. Slow but precise.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender — Retopoflow</summary>
      <div class="arc-card-body">
        <p>Add-on with manual retopo tools. Free option. PolyDraw, Contours, Patches. Active community.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D-Coat</summary>
      <div class="arc-card-body">
        <p>Specialized retopo tool. Auto + manual hybrid. Strong cho retopology task. Standalone software.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>TopoGun</summary>
      <div class="arc-card-body">
        <p>Industry pro retopo standalone. Powerful manual workflow. Less popular now nhưng quality.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Quad Remesher (Exoside)</summary>
      <div class="arc-card-body">
        <p>Best auto retopology plugin cho Maya, Blender, 3ds Max. AI-based, excellent edge flow. Pro tool.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>InstantMeshes (Free)</summary>
      <div class="arc-card-body">
        <p>Open-source auto retopology. Quick processing. Less polished than commercial. Indie option.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Retopology</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Prepare High-Poly</h3>
    <ul class="arc-list">
      <li>Finalized ZBrush sculpt</li>
      <li>Decimate to reasonable polycount cho retopo</li>
      <li>Export OBJ</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Establish Polycount Target</h3>
    <ul class="arc-list">
      <li>Mobile game: 1000-5000 tri character</li>
      <li>PC game: 10000-50000 tri</li>
      <li>Film: 100000+ tri</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Plan Edge Flow</h3>
    <ul class="arc-list">
      <li>Loop around eye, mouth</li>
      <li>Follow muscle line</li>
      <li>Joint area extra loop</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Manual Retopo (Quality)</h3>
    <ul class="arc-list">
      <li>Maya Quad Draw / Blender Retopoflow</li>
      <li>Snap to high-poly surface</li>
      <li>Build quad by quad</li>
      <li>Days for character</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Auto Retopo (Speed)</h3>
    <ul class="arc-list">
      <li>ZRemesher in ZBrush</li>
      <li>Set polycount target</li>
      <li>Add curve guide cho edge flow</li>
      <li>Minutes</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. UV Unwrap</h3>
    <ul class="arc-list">
      <li>Clean topology = easier UV</li>
      <li>Maya UV editor</li>
      <li>RizomUV pro</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Bake Maps</h3>
    <ul class="arc-list">
      <li>High-poly → low-poly bake</li>
      <li>Normal map</li>
      <li>AO map</li>
      <li>Displacement map</li>
      <li>xNormal, Substance Painter</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Test in Engine</h3>
    <ul class="arc-list">
      <li>Import to Unreal/Unity</li>
      <li>Apply normal map</li>
      <li>Verify detail preserved</li>
      <li>Performance check</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Retopology</h2>
  <ul class="arc-list">
    <li><strong>Quad-dominant</strong> — strive 95%+ quad, minimize tri/n-gon</li>
    <li><strong>Edge loop at joint</strong> — elbow, knee, shoulder needs loop</li>
    <li><strong>Face loop</strong> — circle around eye, mouth cho expression</li>
    <li><strong>Even polygon distribution</strong> — more polygon at curve, less at flat</li>
    <li><strong>Avoid pole at deform area</strong> — hide pole in flat region</li>
    <li><strong>Symmetry first</strong> — half retopo, mirror</li>
    <li><strong>Auto for non-animated</strong> — environment prop fine</li>
    <li><strong>Manual for character</strong> — animation depend on topology</li>
    <li><strong>ZRemesher curves</strong> — guide edge flow cho better auto</li>
    <li><strong>Career Character Artist</strong> — $60K-130K, retopology required skill</li>
  </ul>
</section>
`,
  },

  // 04. Reverb
  {
    id: "4a363268-1541-4555-9d6f-37f57fe36e8a",
    tieu_de: "Reverb",
    tieu_de_viet: "Hiệu ứng Reverb",
    tom_tat:
      "Reverb là hiệu ứng âm thanh mô phỏng cách âm thanh phản xạ trong không gian — thêm sense of space và realism cho dialogue, music, sound design.",
    meta_title: "Reverb là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Reverb effect trong audio. Tìm hiểu các loại reverb (hall, plate, spring), parameters và workflow Pro Tools, Logic Pro.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn record vocal trong booth — clean, dry, isolated. Sound flat, lifeless. Add <strong>Reverb</strong> — vocal sit in space, cathedral feel hoặc small room ambient. Suddenly mix có depth, dimension. Reverb = essential audio effect, transform dry recording → polished pro sound. Foundation cho mix engineer, sound designer, music producer.</p>
  <p>Reverb là kỹ thuật essential cho mọi audio professional — music producer, sound designer, post-production engineer. Hiểu các loại reverb (hall, plate, spring, convolution), parameters, workflow giúp create natural sense of space. Critical cho polished audio production.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Reverb là gì?</h2>
  <p>Reverb (Reverberation) là hiệu ứng âm thanh mô phỏng <strong>multiple reflection</strong> của sound trong physical space. Trong cathedral lớn, sound bounce off wall, ceiling, floor — multiple reflection arrive ear slightly delayed, creating sense of large space. Reverb digital plugin simulate này — dry sound + algorithmically generated reflection = sense of space.</p>
  <p>Different from <strong>delay</strong> (discrete echo) — reverb là dense complex reflection blend smoothly. Parameter: <strong>Decay Time / RT60</strong> (how long reflection takes to fade), <strong>Pre-Delay</strong> (gap between dry và reverb), <strong>Room Size</strong> (large hall vs small room), <strong>Damping</strong> (high frequency loss), <strong>Wet/Dry Mix</strong> (how much reverb).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Reverb Types</span>
    <p><strong>Hall</strong>: large concert hall feel. Long decay. <strong>Room</strong>: smaller, more intimate. <strong>Plate</strong>: vintage metal plate emulation. Smooth. <strong>Spring</strong>: vintage Spring tank — guitar amp. <strong>Chamber</strong>: real recording room. <strong>Convolution</strong>: real space sampled. Choose based on context.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Decay Time / RT60</strong> — fade duration</li>
    <li><strong>Pre-Delay</strong> — gap dry → reverb</li>
    <li><strong>Room Size</strong> — small to large</li>
    <li><strong>Damping</strong> — high freq loss</li>
    <li><strong>Wet / Dry Mix</strong> — reverb amount</li>
    <li><strong>Diffusion</strong> — reflection density</li>
    <li><strong>EQ on Reverb</strong> — tone shape</li>
    <li><strong>Convolution</strong> — real space sample</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"reverb audio effect mixing studio plate hall convolution"</span>
    </div>
    <p class="arc-image-caption">Reverb — simulate space, sense of dimension cho audio</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Reverb Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Hall Reverb</summary>
      <div class="arc-card-body">
        <p>Large concert hall, cathedral. Long decay 2-5+ seconds. Lush, expansive. Vocal, orchestral. Most cinematic feel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Room Reverb</summary>
      <div class="arc-card-body">
        <p>Smaller space. Decay 0.5-1.5s. Intimate, natural. Drums, dialogue. Most realistic for actual room recording.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Plate Reverb</summary>
      <div class="arc-card-body">
        <p>Vintage hardware — large metal plate excited by transducer. Smooth, dense reflection. Vocal classic. EMT 140 famous.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Spring Reverb</summary>
      <div class="arc-card-body">
        <p>Vintage guitar amp built-in. Metallic, distinct sound. Surf rock, vintage feel. Now plugin emulation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Chamber Reverb</summary>
      <div class="arc-card-body">
        <p>Real recording chamber — speaker và microphone in dedicated space. Old technique. Distinct character.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Convolution Reverb</summary>
      <div class="arc-card-body">
        <p>Sampled real space — impulse response (IR) captured, mathematical convolution recreate space. Most realistic. Altiverb, IR1.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Algorithmic Reverb</summary>
      <div class="arc-card-body">
        <p>Mathematical algorithm generate reflection. Lexicon, Bricasti. Smoother control, less &quot;real&quot; than convolution but more flexible.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Shimmer / Creative</summary>
      <div class="arc-card-body">
        <p>Modern creative reverb — pitch shift, modulation, granular. Ambient, atmospheric. Valhalla Shimmer popular.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Reverb Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Bus Send vs Insert</h3>
    <ul class="arc-list">
      <li>Bus send: single reverb shared multiple track</li>
      <li>Insert: individual reverb per track</li>
      <li>Bus more efficient, cohesive sound</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Pre-Delay Setting</h3>
    <ul class="arc-list">
      <li>20-40ms typical vocal</li>
      <li>Longer = separation source from reverb</li>
      <li>Shorter = closer integration</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Decay Time</h3>
    <ul class="arc-list">
      <li>Match musical context</li>
      <li>Fast song = short decay</li>
      <li>Ballad = longer decay</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">EQ Reverb Return</h3>
    <ul class="arc-list">
      <li>Cut low (muddy)</li>
      <li>Cut high (sibilance)</li>
      <li>Mid-focused</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Wet/Dry Balance</h3>
    <ul class="arc-list">
      <li>10-30% wet typical</li>
      <li>Too much = lost</li>
      <li>Too little = no space</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Multiple Reverbs</h3>
    <ul class="arc-list">
      <li>Different reverb per element</li>
      <li>Drum tight room, vocal hall</li>
      <li>Layered space</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Automation</h3>
    <ul class="arc-list">
      <li>More reverb chorus, less verse</li>
      <li>Dramatic moment automate up</li>
      <li>Dynamic mix</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>ValhallaDSP</strong> — affordable excellent reverb (Vintage Verb, Shimmer)</li>
    <li><strong>FabFilter Pro-R</strong> — pro-grade algorithmic</li>
    <li><strong>Lexicon</strong> — classic algorithmic plugin</li>
    <li><strong>Altiverb</strong> — gold standard convolution</li>
    <li><strong>Native Instruments Raum</strong> — included Komplete</li>
    <li><strong>DAW built-in</strong>: Logic Space Designer, Pro Tools Avid</li>
    <li><strong>Less is more</strong> — subtle reverb often better than obvious</li>
    <li><strong>Mono reverb</strong> sometimes — phase issue avoid</li>
    <li><strong>Dry vocal</strong> trend — modern pop, less reverb than 80s</li>
    <li><strong>Film dialogue</strong> — natural room reverb, không heavy</li>
  </ul>
</section>
`,
  },

  // 05. Rigging
  {
    id: "cb276693-b1b2-48a4-8c08-1ebb40c40d37",
    tieu_de: "Rigging",
    tieu_de_viet: "Rigging trong 3D",
    tom_tat:
      "Rigging là quá trình tạo hệ thống xương và bộ điều khiển (rig) cho mô hình 3D — giúp animator dễ dàng thao tác và tạo chuyển động — foundation cho character animation.",
    meta_title: "Rigging là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Rigging 3D character. Tìm hiểu skeleton, IK FK, blend shape, weight painting và workflow Maya, Blender, Houdini.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn modeler vừa hoàn thành character 3D — sculpt detail, texture beautiful. Bây giờ cần animation — character cần walk, run, talk. Câu hỏi: làm sao animator move character? Đó là tại sao need <strong>Rigging</strong> — build skeleton + controller cho character. Animator move controller → character deform realistically. Foundation cho mọi character animation production.</p>
  <p>Rigging là kỹ năng essential cho technical artist, character TD. Hiểu skeleton, weight painting, IK/FK, controller setup, software workflow giúp create rig animator-friendly. Specialized career path với high demand — good rigger always in need.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Rigging là gì?</h2>
  <p>Rigging là <strong>process building control system</strong> cho 3D character/object. Includes: <strong>Skeleton / Bones</strong> (hierarchy of joints), <strong>Skin Binding</strong> (mesh follows bone), <strong>Weight Painting</strong> (how much each bone influence each vertex), <strong>Controllers</strong> (user-friendly objects animator manipulate), <strong>Constraints &amp; Logic</strong> (IK, FK, automatic behavior). Result: character ready for animation.</p>
  <p>Different role from animator. Rigger = engineer-artist hybrid. Build infrastructure animator use. Quality rig dramatically affect animation quality và speed. Bad rig = animator struggle, lose hours per shot. Good rig = animator focus on artistic, productive. Industry: rigger highly valued specialist.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Rigging Components</span>
    <p><strong>Skeleton</strong>: joint hierarchy. <strong>Skin</strong>: mesh bind to skeleton. <strong>Weight Paint</strong>: per-vertex influence. <strong>Controllers</strong>: NURBS curves animator click/drag. <strong>IK/FK</strong>: inverse/forward kinematics. <strong>Blend Shapes</strong>: facial expression. <strong>Custom Attributes</strong>: animator setting. Complete rig combine all.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Skeleton / Bone</strong> — joint hierarchy</li>
    <li><strong>Skin / Bind</strong> — mesh follow bone</li>
    <li><strong>Weight Paint</strong> — influence per vertex</li>
    <li><strong>IK (Inverse Kinematics)</strong> — solve backward</li>
    <li><strong>FK (Forward Kinematics)</strong> — chain forward</li>
    <li><strong>Controller</strong> — user-facing object</li>
    <li><strong>Blend Shape</strong> — morph target facial</li>
    <li><strong>Constraint</strong> — relationship</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"rigging 3D character skeleton bones maya animation"</span>
    </div>
    <p class="arc-image-caption">Rigging — build skeleton + controller, foundation animation</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Rigging Components</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Skeleton (Joints)</summary>
      <div class="arc-card-body">
        <p>Hierarchy of joint match anatomy. Spine, head, arm, leg. Proper orientation, pivot. Foundation that everything else built on.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Skinning / Bind</summary>
      <div class="arc-card-body">
        <p>Bind mesh to skeleton. Each vertex linked to bone(s). Move bone → vertex move. Foundation deformation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Weight Painting</summary>
      <div class="arc-card-body">
        <p>Per-vertex influence weight from 0-1 per bone. Shoulder area influenced by both arm và spine. Smooth transition = clean deform.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>IK (Inverse Kinematics)</summary>
      <div class="arc-card-body">
        <p>Set end effector position (foot, hand) → chain rotates to follow. Foot on ground tracking. Hand pick object.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>FK (Forward Kinematics)</summary>
      <div class="arc-card-body">
        <p>Rotate each joint individually. Arc movement (waving hand). Default for arm animation often.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>IK/FK Switch</summary>
      <div class="arc-card-body">
        <p>Animator switch between modes per limb. Critical control. Common arm uses both — FK for swing, IK for hold object.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Controllers</summary>
      <div class="arc-card-body">
        <p>NURBS curves animator interact. Hide skeleton, show controller. Easier selection. Visual cue. Clean animation interface.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blend Shapes / Morph Targets</summary>
      <div class="arc-card-body">
        <p>Facial expression — smile, frown, anger. Each shape stored as vertex delta. Animator slider blend between. Lip sync.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Constraints</summary>
      <div class="arc-card-body">
        <p>Parent, point, orient, aim constraint. Object follow other. Hand follow weapon. Head look at target.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Rigging Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Model Analysis</h3>
    <ul class="arc-list">
      <li>Study mesh topology</li>
      <li>Check joint area edge loop</li>
      <li>Verify deformability</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Joint Placement</h3>
    <ul class="arc-list">
      <li>Build skeleton in T-pose</li>
      <li>Anatomy-correct position</li>
      <li>Naming convention strict</li>
      <li>Orient consistent</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Skin Bind</h3>
    <ul class="arc-list">
      <li>Skin mesh to skeleton</li>
      <li>Auto initial weight</li>
      <li>Test simple movement</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Weight Painting</h3>
    <ul class="arc-list">
      <li>Refine weight per vertex</li>
      <li>Smooth transition</li>
      <li>Test all extreme pose</li>
      <li>Most time-intensive step</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. IK Setup</h3>
    <ul class="arc-list">
      <li>Leg IK</li>
      <li>Arm IK with pole vector</li>
      <li>Spine IK</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Build Controllers</h3>
    <ul class="arc-list">
      <li>NURBS curves shapes</li>
      <li>Color code (left red, right blue)</li>
      <li>Custom attribute IK/FK switch</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Facial Rig</h3>
    <ul class="arc-list">
      <li>Blend shapes hoặc bone-based</li>
      <li>FACS standard expression</li>
      <li>Lip sync ready</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Test &amp; Animator Hand-off</h3>
    <ul class="arc-list">
      <li>Extreme pose test</li>
      <li>Animator feedback</li>
      <li>Iterate</li>
      <li>Document rig usage</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Software &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Maya</strong> — industry standard rigging</li>
    <li><strong>Maya Advanced Skeleton</strong> — auto-rig plugin</li>
    <li><strong>Blender</strong> — Rigify auto-rig, free</li>
    <li><strong>Houdini KineFX</strong> — procedural rigging</li>
    <li><strong>Cinema 4D</strong> — character object</li>
    <li><strong>3ds Max</strong> — CAT, Biped</li>
    <li><strong>Mixamo</strong> — auto-rig + animation library free</li>
    <li><strong>Unreal Control Rig</strong> — engine rigging</li>
    <li><strong>Career Rigger</strong> — $60K-130K, Senior TD $130K-200K</li>
    <li><strong>Specialization opportunity</strong> — face rig, body rig, creature rig specialty</li>
  </ul>
</section>
`,
  },

  // 06. Rotation Expression
  {
    id: "fdae0355-3b90-48b0-a6ba-843a9e30cb12",
    tieu_de: "Rotation Expression",
    tieu_de_viet: "Rotation Expression trong After Effects",
    tom_tat:
      "Rotation Expression là expression After Effects điều khiển góc xoay của layer dựa trên giá trị tính toán — tạo chuyển động xoay liên kết, pendulum, bánh răng tự động.",
    meta_title:
      "Rotation Expression là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Rotation Expression AE. Tìm hiểu loopOut, wiggle rotation, time-based và workflow tạo gear, pendulum animation.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn motion designer animate gear (bánh răng) — keyframe rotation 360° mỗi second cho infinite spin? Tedious nếu hold scene 30 second. Solution: <strong>Rotation Expression</strong> — <code>time * 360</code> trên Rotation property = automatic infinite spin. Hoặc gear linked — small gear spin 3x faster large gear: expression <code>thisComp.layer(&quot;Large Gear&quot;).transform.rotation * 3</code>. Productivity multiplier cho motion design.</p>
  <p>Rotation Expression là kỹ thuật pro cho motion designer chuyên nghiệp. Hiểu time-based rotation, loopOut, wiggle, linked rotation giúp tự động hóa motion mechanical, infinite cycle. Critical cho infographic, mechanical animation, music visualizer.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Rotation Expression là gì?</h2>
  <p>Rotation Expression là <strong>After Effects expression</strong> applied to <strong>Rotation property</strong> của layer. Compute rotation value algorithmically — based on time, other layer, math function. Eliminate need for manual keyframe trong common pattern (continuous spin, pendulum, linked rotation). Foundation cho mechanical animation, infinite loop.</p>
  <p>Common patterns: <strong>Time-based</strong> (<code>time * 360</code> = 1 revolution/second), <strong>Wiggle Rotation</strong> (<code>wiggle(2, 30)</code> = subtle oscillation), <strong>Linked Rotation</strong> (rotation track other layer), <strong>Sine Wave Pendulum</strong> (<code>Math.sin(time) * 45</code>), <strong>loopOut(&quot;cycle&quot;)</strong> (extend keyframe pattern infinitely).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Common Rotation Expression</span>
    <p><strong>time * speed</strong>: continuous rotation. <strong>wiggle(freq, amp)</strong>: random oscillation. <strong>Math.sin(time * freq) * amp</strong>: smooth pendulum. <strong>loopOut(&quot;cycle&quot;)</strong>: loop keyframe forever. <strong>linked rotation</strong>: track other layer. Combine cho complex behavior.</p>
  </div>

  <ul class="arc-list">
    <li><strong>time</strong> — current time seconds</li>
    <li><strong>Math.sin / Math.cos</strong> — wave</li>
    <li><strong>wiggle()</strong> — random</li>
    <li><strong>loopOut()</strong> — loop keyframe</li>
    <li><strong>thisComp.layer</strong> — reference other</li>
    <li><strong>linear / ease</strong> — interpolation</li>
    <li><strong>radians vs degrees</strong> — converter</li>
    <li><strong>index</strong> — layer index variation</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"after effects rotation expression gear motion graphics"</span>
    </div>
    <p class="arc-image-caption">Rotation Expression — automate rotation animation, infinite cycle</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Common Rotation Patterns</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Continuous Spin</summary>
      <div class="arc-card-body">
        <p><code>time * 360</code> — full rotation per second. <code>time * 180</code> = half speed. Foundation expression. Infographic icon, loading spinner.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pendulum Sine Wave</summary>
      <div class="arc-card-body">
        <p><code>Math.sin(time * 2) * 45</code> — oscillate ±45 degree, frequency 2/sec. Smooth swing. Clock pendulum, character idle.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Wiggle Rotation</summary>
      <div class="arc-card-body">
        <p><code>wiggle(3, 10)</code> — random small rotation, 3 changes/sec, 10 degree. Organic, alive feel. Subtle character motion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>loopOut Cycle</summary>
      <div class="arc-card-body">
        <p>Set keyframe rotate 0° → 360°. Apply <code>loopOut(&quot;cycle&quot;)</code> on rotation. Infinite loop without continuous keyframe.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Linked Rotation</summary>
      <div class="arc-card-body">
        <p><code>thisComp.layer(&quot;Hub&quot;).transform.rotation * 3</code> — this layer rotates 3x speed of Hub. Gear ratio.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Per-Layer Variation</summary>
      <div class="arc-card-body">
        <p><code>time * 60 * index</code> — each layer rotation speed × index. Layer 1 slow, layer 5 fast. Variety from single expression.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Position-driven Rotation</summary>
      <div class="arc-card-body">
        <p>Rotation based on position change — wheel rotate when ball roll. <code>position[0] * -1</code> in degrees.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Easing within Expression</summary>
      <div class="arc-card-body">
        <p><code>linear(time, 0, 5, 0, 360)</code> — interpolate from 0 to 360 over 0-5 sec linearly. Or ease() cho smooth.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Use Cases</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Loading Spinner</h3>
    <ul class="arc-list">
      <li>Infinite continuous rotation</li>
      <li><code>time * 360</code> classic</li>
      <li>Logo reveal animation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Gear System</h3>
    <ul class="arc-list">
      <li>Multiple gear linked</li>
      <li>Smaller faster rotation</li>
      <li>Mechanical animation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Pendulum Clock</h3>
    <ul class="arc-list">
      <li>Sine wave swing</li>
      <li>Realistic pendulum</li>
      <li>Combine với scaling, position</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Camera Shake</h3>
    <ul class="arc-list">
      <li>Wiggle rotation cho earthquake</li>
      <li>Combine với position wiggle</li>
      <li>Handheld camera feel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Character Idle</h3>
    <ul class="arc-list">
      <li>Subtle wiggle rotation cho breath</li>
      <li>Living feel</li>
      <li>Small amplitude critical</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Audio Reactive</h3>
    <ul class="arc-list">
      <li>Bass drive rotation</li>
      <li>Audio amplitude → rotation</li>
      <li>Music visualizer</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Expression</h2>
  <ul class="arc-list">
    <li><strong>Use time variable</strong> — eliminate manual keyframe</li>
    <li><strong>Degrees not radians</strong> — AE expression default degrees</li>
    <li><strong>loopOut for keyframe loop</strong> — keep manual control + infinite repeat</li>
    <li><strong>Pick whip</strong> — link rotation visually drag-drop</li>
    <li><strong>Combine multiple</strong> — <code>time * 360 + wiggle(2, 10)</code> spin với jitter</li>
    <li><strong>Performance</strong> — heavy expression slow preview, pre-comp</li>
    <li><strong>Bake to keyframe</strong> — convert expression cho more control</li>
    <li><strong>Documentation in expression</strong> — comment line cho future self</li>
    <li><strong>Reusable</strong> — save expression as preset</li>
    <li><strong>aescripts</strong> Motion 4, Plugin Everything offer GUI cho expression</li>
  </ul>
</section>
`,
  },

  // 07. Rotoscoping
  {
    id: "0f33242b-0faa-4654-9914-79a039dba3e7",
    tieu_de: "Rotoscoping",
    tieu_de_viet: "Rotoscoping (Roto)",
    tom_tat:
      "Rotoscoping là kỹ thuật tạo animation hoặc cắt mask bằng cách vẽ đồ lên hình ảnh chuyển động đã ghi hình trước đó theo từng frame — phổ biến trong VFX, animation indie.",
    meta_title:
      "Rotoscoping là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Rotoscoping VFX. Tìm hiểu workflow trong Nuke, After Effects, Mocha và ứng dụng cho compositing chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Marvel film — actor performance trên green screen, behind có CGI environment. Process: <strong>Rotoscoping</strong> — frame-by-frame cut actor out of green screen footage to composite onto new BG. Hoặc Disney animated film &quot;A Scanner Darkly&quot; — actor performance traced frame-by-frame thành stylized animation. Rotoscoping = essential VFX technique từ 1915 (Max Fleischer invented) đến nay.</p>
  <p>Rotoscoping là kỹ thuật essential cho VFX compositor, indie animator. Hiểu workflow trong Nuke, AE, Mocha giúp produce cleaner composite, hand-drawn animation feel. Critical kỹ năng cho VFX career, niche cho artistic animation style.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Rotoscoping là gì?</h2>
  <p>Rotoscoping (often shortened &quot;roto&quot;) có hai meaning chính: <strong>VFX rotoscoping</strong> — cắt subject ra khỏi background frame-by-frame để composite. Critical khi green screen impossible (location shoot, fast motion). <strong>Animation rotoscoping</strong> — trace over live action footage để tạo stylized animation. Both labor-intensive, both fundamental skill.</p>
  <p>Modern VFX roto: <strong>Bezier curve / spline</strong> drawn around subject, animated frame-by-frame. Each frame artist adjust spline match subject motion. AI assistant (Mocha tracking, Rotobrush AE) speed up but human refinement always needed. Major VFX house has dedicated roto department, hundreds artist.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Rotoscoping Methods</span>
    <p><strong>Bezier Spline</strong>: most precise, manual frame-by-frame. <strong>Mocha Planar Track</strong>: track planar surface, auto-animate. <strong>AE Rotobrush</strong>: AI-assisted, brush on subject. <strong>AI / ML</strong>: modern Runway, Rotobrush 3.0 — auto-segment.</p>
  </div>

  <ul class="arc-list">
    <li><strong>VFX Rotoscoping</strong> — cut subject từ BG</li>
    <li><strong>Animation Rotoscoping</strong> — trace cho style</li>
    <li><strong>Spline / Bezier</strong> — curve tool</li>
    <li><strong>Mask</strong> — output rotoscoping</li>
    <li><strong>Tracking</strong> — auto-follow motion</li>
    <li><strong>Mocha Planar Tracker</strong> — pro tool</li>
    <li><strong>Rotobrush (AE)</strong> — AI-assisted</li>
    <li><strong>Edge Feather</strong> — soft edge</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"rotoscoping VFX nuke mocha composite mask"</span>
    </div>
    <p class="arc-image-caption">Rotoscoping — frame-by-frame cut subject hoặc trace animation</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Software Rotoscoping</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Foundry Nuke (Industry Standard)</summary>
      <div class="arc-card-body">
        <p>VFX studio standard. RotoPaint node. Spline-based roto. Advanced tracking. Used Marvel, ILM, Weta. Steep learning curve, powerful.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>After Effects Mask + Rotobrush</summary>
      <div class="arc-card-body">
        <p>Bezier mask manual. Rotobrush AI-assisted brush on subject. Decent quality, faster than manual. Motion graphics-friendly.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mocha Pro (Imagineer)</summary>
      <div class="arc-card-body">
        <p>Planar tracking specialist. Track surface, derive mask. Speed up roto dramatically when planar. Plugin trong AE, Premiere, Nuke.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Silhouette</summary>
      <div class="arc-card-body">
        <p>Specialized roto/paint software. Studio standard alternate Nuke. Strong paint workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fusion (DaVinci Resolve)</summary>
      <div class="arc-card-body">
        <p>Node-based compositing với roto tools. Free in Resolve. Capable alternative Nuke cho indie.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender Compositor</summary>
      <div class="arc-card-body">
        <p>Free, decent roto via node. Less polished than commercial. Indie option.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Runway ML</summary>
      <div class="arc-card-body">
        <p>AI-based automatic rotoscoping. Web-based. Modern AI workflow. Quality improving rapidly.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Roto Brush 3.0 (AE)</summary>
      <div class="arc-card-body">
        <p>Latest AE Rotobrush với AI improvement. Modern approach. Indie pro accessible.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Rotoscoping Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Analyze Footage</h3>
    <ul class="arc-list">
      <li>Identify subject</li>
      <li>Check motion complexity</li>
      <li>Frame count</li>
      <li>Estimate effort</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Break into Sections</h3>
    <ul class="arc-list">
      <li>Separate hand, body, head</li>
      <li>Multiple shapes easier than one complex</li>
      <li>Each shape independent</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Draw Initial Spline</h3>
    <ul class="arc-list">
      <li>Bezier curve around subject first frame</li>
      <li>Minimal point cho easier edit</li>
      <li>Tight to subject edge</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Keyframe Critical Frame</h3>
    <ul class="arc-list">
      <li>First, last, midpoint</li>
      <li>Major motion change point</li>
      <li>Set shape position each</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Fill In Between</h3>
    <ul class="arc-list">
      <li>Frame by frame adjust</li>
      <li>Spline interpolate between keyframe</li>
      <li>Refine where motion complex</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Edge Refinement</h3>
    <ul class="arc-list">
      <li>Feather edge cho soft</li>
      <li>Match natural blur của motion</li>
      <li>Avoid hard cutout look</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Tracking Help</h3>
    <ul class="arc-list">
      <li>Mocha planar track subject</li>
      <li>Mocha shape follow track</li>
      <li>Hours saved</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. QA Per Frame</h3>
    <ul class="arc-list">
      <li>Scrub through every frame</li>
      <li>Check edge accuracy</li>
      <li>Fix glitch</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Minimal points</strong> — fewer points = easier animate</li>
    <li><strong>Multiple shapes</strong> — separate hand, head, body</li>
    <li><strong>Edge feather subtle</strong> — match motion blur</li>
    <li><strong>Track when possible</strong> — Mocha save hours</li>
    <li><strong>Patient repetitive work</strong> — roto job nature</li>
    <li><strong>Career roto artist</strong> — entry VFX, $40K-70K</li>
    <li><strong>Senior roto / compositor path</strong> — promotion natural</li>
    <li><strong>AI assistance</strong> — Runway, Rotobrush 3.0 improving</li>
    <li><strong>Career stability</strong> — roto always needed, can&apos;t fully automate</li>
    <li><strong>Indie animation</strong>: Linklater &quot;Waking Life&quot;, &quot;A Scanner Darkly&quot;</li>
  </ul>
</section>
`,
  },

  // 08. Rough Animation
  {
    id: "dfd29dbd-a33a-4646-a052-5b26d4337d3d",
    tieu_de: "Rough Animation",
    tieu_de_viet: "Rough Animation (Phác thảo thô)",
    tom_tat:
      "Rough Animation là giai đoạn phác thảo thô trong hoạt hình — tập trung vào thời gian (timing) và các tư thế chính của nhân vật để xác định chuyển động tổng thể.",
    meta_title:
      "Rough Animation là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Rough Animation trong 2D, 3D animation. Tìm hiểu blocking phase, key pose, timing và workflow từ rough đến final.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn animator nhận shot — character walk across room, pick up cup, drink. Method: rush vào polished animation right away. Result: tedious, change mind difficult. Pro method: <strong>Rough Animation</strong> — first sketch fast key pose, timing. Critical decision (when pick cup, how character feel) lock first. Polish later. Iterate fast → quality final.</p>
  <p>Rough Animation là kỹ thuật essential cho mọi animator — 2D, 3D, motion capture. Hiểu workflow rough → blocking → spline → polish, importance của timing first giúp produce quality animation efficiently. Foundation của professional animation workflow.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Rough Animation là gì?</h2>
  <p>Rough Animation là <strong>early phase</strong> của animation production — focus on <strong>key pose</strong> và <strong>timing</strong> rather than polish. Animator quickly sketch (2D) hoặc block (3D) critical moment của shot — extreme pose, beat, key emotion. Result: rough but conveys intent of shot. Director, supervisor review rough — approve or feedback before commit polish work.</p>
  <p>Workflow philosophy: <strong>iterate cheap, finalize expensive</strong>. Polished animation slow to change — re-pose every frame. Rough sketch fast — adjust key pose in seconds. Discover shot work or not before invest hours. Industry standard: rough pass → blocking → splining → polish. Multi-stage review at each level.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Animation Stages</span>
    <p><strong>1. Rough / Blocking</strong>: key pose only, stepped. <strong>2. Blocking Plus</strong>: more breakdown pose. <strong>3. Splining</strong>: smooth interpolation between. <strong>4. Polish</strong>: final detail, secondary motion. Each stage review/approve. Saves rework.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Key Pose</strong> — extreme pose tells story</li>
    <li><strong>Timing</strong> — when each pose happens</li>
    <li><strong>Spacing</strong> — distance between key</li>
    <li><strong>Stepped Mode</strong> — no interpolation, see key only</li>
    <li><strong>Spline Mode</strong> — smooth between key</li>
    <li><strong>Blocking</strong> — 3D term cho rough</li>
    <li><strong>Breakdown</strong> — mid pose between key</li>
    <li><strong>In-between</strong> — additional smoothing</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"rough animation blocking key pose 2D 3D workflow"</span>
    </div>
    <p class="arc-image-caption">Rough Animation — phase phác thảo, key pose + timing first</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Animation Stages</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Rough / Blocking (Stage 1)</summary>
      <div class="arc-card-body">
        <p>Key extreme pose. Stepped interpolation (no smooth between). Focus story, timing, intent. Director review here. 2-3 days per shot typical.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blocking Plus (Stage 2)</summary>
      <div class="arc-card-body">
        <p>Add breakdown — mid pose between key. Still stepped. More detail of motion. Better assessment shot flow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Spline / In-betweening (Stage 3)</summary>
      <div class="arc-card-body">
        <p>Switch from stepped to smooth interpolation. Curve adjust. Animation flows. Common &quot;splining hell&quot; — curves create unwanted motion, fix.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Polish (Stage 4)</summary>
      <div class="arc-card-body">
        <p>Add secondary motion, overlap, settle. Facial detail. Cloth secondary. Fine timing adjust. Final beauty pass.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2D Rough Pencil</summary>
      <div class="arc-card-body">
        <p>Traditional / digital 2D — rough pencil sketch each key frame. Loose line. Energy capture priority over clean draw.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D Rough Block</summary>
      <div class="arc-card-body">
        <p>Maya/Blender — pose rig at key frame, stepped tangent. Don&apos;t worry about smooth motion. Just key pose.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2D Clean-Up Stage</summary>
      <div class="arc-card-body">
        <p>After rough approved, clean line drawing on top. Production-ready. Often separate artist (clean-up animator).</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Rough Animation Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Read Shot</h3>
    <ul class="arc-list">
      <li>Read script, storyboard</li>
      <li>Listen audio dialog</li>
      <li>Understand emotion, intent</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Plan Shot</h3>
    <ul class="arc-list">
      <li>Thumbnail sketch on paper</li>
      <li>Identify key pose</li>
      <li>Plan timing</li>
      <li>Beats of action</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Pose Key Frame</h3>
    <ul class="arc-list">
      <li>Set extreme pose first frame</li>
      <li>End pose last frame</li>
      <li>Critical midpoint</li>
      <li>Stepped tangent (3D)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Timing Pass</h3>
    <ul class="arc-list">
      <li>Adjust frame timing</li>
      <li>Hit dialog accent</li>
      <li>Beat of action</li>
      <li>Pause for emphasis</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Review with Supervisor</h3>
    <ul class="arc-list">
      <li>Show stepped rough</li>
      <li>Discuss intent</li>
      <li>Iterate based feedback</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Add Breakdown</h3>
    <ul class="arc-list">
      <li>Mid pose between key</li>
      <li>Refine motion arc</li>
      <li>Still stepped</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Approval Lock Rough</h3>
    <ul class="arc-list">
      <li>Director approve rough</li>
      <li>Move to splining phase</li>
      <li>Commit to direction</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Don&apos;t Polish Rough</h3>
    <ul class="arc-list">
      <li>Resist polish too early</li>
      <li>Wasted if direction changes</li>
      <li>Keep rough loose</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Rough Animation</h2>
  <ul class="arc-list">
    <li><strong>Stepped tangent first</strong> — see key pose only, no distracting interpolation</li>
    <li><strong>Plan before animate</strong> — thumbnail sketch, save time</li>
    <li><strong>Strong silhouette</strong> — even rough should read silhouette</li>
    <li><strong>Timing critical</strong> — wrong timing = entire animation broken</li>
    <li><strong>Emotion intent</strong> — what character feels, posture reflect</li>
    <li><strong>Don&apos;t fall in love</strong> — rough disposable</li>
    <li><strong>Review early, often</strong> — catch issue cheap</li>
    <li><strong>Disney 12 Principles</strong> apply rough phase</li>
    <li><strong>Reference video</strong> — film yourself or actor</li>
    <li><strong>Career animator</strong> $60K-150K, supervisor $150K-300K</li>
  </ul>
</section>
`,
  },

  // 09. Sculpt
  {
    id: "bd05e45d-0fcd-4e3f-8df4-7a1db8b2cd81",
    tieu_de: "Sculpt (3D Sculpting)",
    tieu_de_viet: "Điêu khắc 3D (Sculpt)",
    tom_tat:
      "Sculpt là kỹ thuật mô hình hóa 3D điêu khắc digital — đẩy, kéo, làm mịn bề mặt như clay vật lý — phổ biến trong ZBrush, Blender cho character, creature, prop chi tiết.",
    meta_title:
      "Sculpt 3D là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "3D Sculpting trong ZBrush, Blender. Tìm hiểu workflow, brush, dyntopo, retopology và career character artist sculpt.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn 3D artist muốn create realistic creature face — pore, wrinkle, scar. Traditional polygon modeling extrude/cut: impossible cho detail organic. Solution: <strong>3D Sculpt</strong> — như clay vật lý, push pull surface với brush. Add subdivision khi need more detail. ZBrush became industry standard, revolutionize character creation. Marvel monsters, Pixar character — all sculpt.</p>
  <p>3D Sculpt là kỹ năng essential cho character artist, creature artist, environment artist. Hiểu workflow, software (ZBrush, Blender, 3D-Coat), brushes, retopology giúp create stunning organic 3D model. Foundation cho modern character/creature pipeline.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Sculpt là gì?</h2>
  <p>3D Sculpting là <strong>modeling technique</strong> emulate vật lý clay sculpting. Artist use <strong>digital brush</strong> push, pull, smooth, pinch surface. Foundation: mesh có many polygon (millions), allow detail manipulation. <strong>Dynamic Subdivision</strong> (DynaMesh, Dyntopo) automatically add polygon where needed. Unlike polygon modeling (vertex-by-vertex), sculpt feels intuitive như artistic process.</p>
  <p>Workflow: <strong>1. Block out</strong> rough form. <strong>2. Refine</strong> primary shapes. <strong>3. Detail</strong> secondary forms (muscle, anatomy). <strong>4. Tertiary detail</strong> (pore, wrinkle). <strong>5. Retopology</strong> create clean low-poly. <strong>6. Bake</strong> high-poly detail to normal map. Result: production-ready model với scuplted detail preserved.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Sculpt vs Polygon Modeling</span>
    <p><strong>Polygon Modeling</strong>: precise control, hard-surface (mech, vehicle), low-poly direct. Intuitive cho geometric. <strong>Sculpt</strong>: intuitive cho organic (character, creature), millions polygon detail, requires retopology. Modern workflow combines — polygon block out + sculpt detail.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Subdivision</strong> — increase polygon detail</li>
    <li><strong>DynaMesh / Dyntopo</strong> — dynamic topology</li>
    <li><strong>Brush</strong> — sculpt tool</li>
    <li><strong>Alpha / Texture Brush</strong> — surface detail</li>
    <li><strong>Mask</strong> — protect area from edit</li>
    <li><strong>Multires</strong> — multiple subdivision level</li>
    <li><strong>Symmetry</strong> — mirror sculpt</li>
    <li><strong>ZRemesher</strong> — auto retopology</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"3D sculpt zbrush blender character creature digital sculpting"</span>
    </div>
    <p class="arc-image-caption">3D Sculpt — digital clay, intuitive organic modeling</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Software Sculpting</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>ZBrush (Maxon)</summary>
      <div class="arc-card-body">
        <p>Industry standard. Pixologic (now Maxon). Used Hollywood, AAA game. Unique interface, steep learning. $39/month subscription or perpetual.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender Sculpt Mode</summary>
      <div class="arc-card-body">
        <p>Free, increasingly capable. Dyntopo, Multires. Active development. Indie / hobbyist friendly. Competitive với ZBrush for many task.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D-Coat</summary>
      <div class="arc-card-body">
        <p>All-in-one — sculpt, retopo, texture, paint. Voxel sculpting (different paradigm). Affordable. Active community.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mudbox (Autodesk)</summary>
      <div class="arc-card-body">
        <p>Maya integration. Sculpting + texture painting. Lost popularity to ZBrush. Still in use.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Forger / Nomad (iPad)</summary>
      <div class="arc-card-body">
        <p>iPad sculpting app. Affordable. Apple Pencil. Touch-based sculpt growing trend.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>ZBrushCore</summary>
      <div class="arc-card-body">
        <p>Stripped ZBrush, cheaper. Entry-level. Limited features. Path to full ZBrush.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Sculpting Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Reference Gathering</h3>
    <ul class="arc-list">
      <li>Anatomy reference</li>
      <li>Concept art</li>
      <li>Real-world photo</li>
      <li>PureRef organize</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Block Out</h3>
    <ul class="arc-list">
      <li>Primitive shape (sphere, ZSphere)</li>
      <li>Rough form establish</li>
      <li>DynaMesh adapt topology freely</li>
      <li>Get proportion correct first</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Primary Forms</h3>
    <ul class="arc-list">
      <li>Major muscle, anatomy</li>
      <li>Big shape</li>
      <li>Anatomy correctness</li>
      <li>Refine proportion</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Secondary Forms</h3>
    <ul class="arc-list">
      <li>Smaller anatomy</li>
      <li>Wrinkles, expression line</li>
      <li>Subdivide higher</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Tertiary Details</h3>
    <ul class="arc-list">
      <li>Pore, scar, scratches</li>
      <li>Alpha brush stamps</li>
      <li>Highest subdivision</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. PolyPaint / Color</h3>
    <ul class="arc-list">
      <li>Paint color directly</li>
      <li>Skin tone, makeup</li>
      <li>Reference photo</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Retopology</h3>
    <ul class="arc-list">
      <li>ZRemesher auto hoặc Maya manual</li>
      <li>Clean low-poly</li>
      <li>Animation-friendly topology</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Bake Maps</h3>
    <ul class="arc-list">
      <li>Normal map</li>
      <li>Displacement</li>
      <li>AO, cavity</li>
      <li>Use on low-poly model</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Anatomy study essential</strong> — sculpt success requires anatomy knowledge</li>
    <li><strong>Reference always</strong> — pro sculpt reference-heavy</li>
    <li><strong>Block out first</strong> — proportion critical, fix in detail too late</li>
    <li><strong>Don&apos;t over-detail</strong> — viewer eye guided by form, not random detail</li>
    <li><strong>Symmetry early</strong> — break symmetry late (faces aren&apos;t perfectly symmetric)</li>
    <li><strong>Alpha brush</strong> — texture brush save time cho pore, scale</li>
    <li><strong>Course</strong>: Scott Spencer&apos;s ZBrush courses, FZD school</li>
    <li><strong>Career Character Artist</strong>: $60K-140K, Senior $140K-250K</li>
    <li><strong>Studio</strong>: Naughty Dog, Blizzard, Marvel Studio Visual Development</li>
    <li><strong>ZBrush Master</strong>: Scott Eaton, Rafael Grassetti, Magdalena Dadela</li>
  </ul>
</section>
`,
  },

  // 10. Seam
  {
    id: "453ceafb-c2c8-40ab-bb59-837846f780f0",
    tieu_de: "Seam - Đường nối (UV)",
    tieu_de_viet: "Seam trong 3D UV",
    tom_tat:
      "Seam là đường nối trên mô hình 3D — tạo ra khi tách các phần của mô hình để trải UV cho việc tạo texture — nơi mesh được &quot;cắt mở&quot; để flatten ra UV space.",
    meta_title: "Seam là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "UV Seam trong 3D modeling. Tìm hiểu cách đặt seam đúng vị trí, workflow UV unwrap, tools Maya, Blender, RizomUV.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn 3D artist UV unwrap character — mặc dù skill texture đẹp, model có visible seam line ở má, trán. Seam = bad. Solution: <strong>đặt Seam đúng chỗ</strong> — sau tai, dưới hàm, hidden spot. Đó là kỹ thuật UV Seam — biết cách cut model strategic để minimize visible seam trong final texture. Critical skill cho game/film texture artist.</p>
  <p>Seam là kiến thức essential cho 3D artist working với UV và texture. Hiểu where to place seam, workflow trong Maya/Blender/RizomUV, common pitfall giúp produce clean texture without visible seam. Foundation cho production-ready 3D asset.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Seam là gì?</h2>
  <p>Seam là <strong>edge designated trong 3D model</strong> nơi mesh được &quot;cut open&quot; để flatten lên 2D UV space. Think of clothing pattern — to flatten 3D shirt, you cut along certain seam (side, sleeve, neck) — same concept 3D model. Seam allow 3D surface flatten thành 2D image cho texture painting/applying.</p>
  <p>Seam introduce <strong>discontinuity</strong> in texture — pixel on one side seam not necessarily match other side. Result: visible line if texture không match across seam. Goal: <strong>hide seam</strong> trong area not visible (under arm, behind ear, inside leg), <strong>follow natural break</strong> (clothing edge, hairline), <strong>minimize total seam length</strong>.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Seam Placement Rule</span>
    <p><strong>Hidden areas</strong>: under arm, behind ear, inside leg, under jaw. <strong>Natural break</strong>: clothing edge, hairline, fingertip. <strong>Asymmetric</strong>: vary seam location avoid pattern. <strong>Manage stretch</strong>: enough seam to flatten, not too much to fragment.</p>
  </div>

  <ul class="arc-list">
    <li><strong>UV Map</strong> — 2D representation</li>
    <li><strong>UV Island</strong> — separated UV chunk</li>
    <li><strong>Seam Edge</strong> — cut edge</li>
    <li><strong>Stretch</strong> — UV distortion</li>
    <li><strong>Pack</strong> — efficient layout</li>
    <li><strong>Smart UV</strong> — auto unwrap</li>
    <li><strong>UDIM</strong> — multi-tile UV</li>
    <li><strong>Texture Bleed</strong> — paint past edge</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"UV seam 3D unwrap mesh maya blender texture"</span>
    </div>
    <p class="arc-image-caption">Seam — edge cut to flatten 3D mesh thành 2D UV</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Seam Placement Rules</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Hidden Areas</summary>
      <div class="arc-card-body">
        <p>Place seam where viewer doesn&apos;t see — under arm, behind ear, scalp, inside thigh, under jaw. Most common technique.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Follow Natural Break</summary>
      <div class="arc-card-body">
        <p>Clothing edge naturally has seam — sleeve hem, collar, belt. Place seam along these. Already visible breaks, doesn&apos;t add new.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hairline Boundary</summary>
      <div class="arc-card-body">
        <p>Face/scalp boundary common seam. Hidden under hair. Natural transition.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Symmetric vs Asymmetric</summary>
      <div class="arc-card-body">
        <p>Symmetric character can share UV (mirror). Halve UV space need. Asymmetric require unique UV — more space, more seam.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hard Edge / Smoothing Group</summary>
      <div class="arc-card-body">
        <p>Hard edge often becomes UV seam. Edge between two smoothing group natural break. Avoid visible mismatch.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Minimize Total Length</summary>
      <div class="arc-card-body">
        <p>Each seam = potential visible issue. Use minimum seam needed to flatten without stretch. Balance.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stretch Management</summary>
      <div class="arc-card-body">
        <p>Insufficient seam = UV stretch = distorted texture. Add seam to relieve. Trade-off accept visible seam to fix stretch.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>UV Unwrap Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Analyze Mesh</h3>
    <ul class="arc-list">
      <li>Visualize where to cut</li>
      <li>Identify natural break</li>
      <li>Plan UV island</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Mark Seam</h3>
    <ul class="arc-list">
      <li>Maya: Cut UV Edges</li>
      <li>Blender: Mark Seam (Ctrl+E)</li>
      <li>RizomUV: dedicated seam tool</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Unwrap</h3>
    <ul class="arc-list">
      <li>Press unwrap command</li>
      <li>UV unfold lên 2D space</li>
      <li>Check distortion</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Check Stretch</h3>
    <ul class="arc-list">
      <li>Checker pattern test</li>
      <li>Even square = good</li>
      <li>Distorted square = stretch issue</li>
      <li>Add more seam if needed</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Layout UV Island</h3>
    <ul class="arc-list">
      <li>Arrange island trong 0-1 UV space</li>
      <li>Maximize coverage</li>
      <li>Pack efficiently</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Adjust Texture Density</h3>
    <ul class="arc-list">
      <li>Important area larger UV</li>
      <li>Face high res, hidden low res</li>
      <li>Even texel density possible</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Test với Texture</h3>
    <ul class="arc-list">
      <li>Apply test texture</li>
      <li>Look for visible seam</li>
      <li>Adjust if obvious</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Substance Painter / Mari</h3>
    <ul class="arc-list">
      <li>Paint directly on 3D model</li>
      <li>Seam projection paint over seam</li>
      <li>Minimize visible discontinuity</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>RizomUV</strong> — industry standard pro UV tool, fastest unwrap</li>
    <li><strong>Maya UV Editor</strong> — built-in, capable</li>
    <li><strong>Blender UV</strong> — free, capable</li>
    <li><strong>Headus UVLayout</strong> — older but still used</li>
    <li><strong>Substance Painter</strong> — paint over seam to hide</li>
    <li><strong>Mari</strong> — VFX texture painting industry standard</li>
    <li><strong>3D-Coat UV</strong> — strong UV tool</li>
    <li><strong>UDIM workflow</strong> — multi-tile cho high detail (film VFX)</li>
    <li><strong>Texture bleed / padding</strong> — extend paint past edge prevents seam</li>
    <li><strong>Test checker pattern</strong> — quickly identify stretch issue</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 3 · Batch 2 — chạy ${items.length} bài keyword (Q → Z) ──\n`,
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
