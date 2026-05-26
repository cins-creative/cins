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
  // 01. Motion Tracking
  {
    id: "5a0e915f-b28b-40ae-ab6d-ffab01356f7c",
    tieu_de: "Motion Tracking",
    tieu_de_viet: "Theo dõi chuyển động (Motion Tracking)",
    tom_tat:
      "Motion Tracking là kỹ thuật theo dõi chuyển động của một đối tượng trong video — foundation cho VFX, từ camera tracking đến object tracking, screen replacement, face tracking.",
    meta_title:
      "Motion Tracking là gì? Ý nghĩa và ứng dụng trong VFX | CINS",
    meta_description:
      "Motion Tracking trong VFX. Tìm hiểu point tracking, planar tracking và workflow track trong After Effects, Mocha.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem phim sci-fi — character có hologram floating phía trước phone. Hoặc music video — tattoo animated trên skin của artist. Hoặc news report — pixelated face anonymize. Tất cả dùng <strong>Motion Tracking</strong> — kỹ thuật cơ bản nhất của VFX để &quot;dán&quot; element ảo lên video thật, theo dõi motion qua thời gian.</p>
  <p>Motion Tracking là kỹ năng essential cho VFX artist, video editor, motion designer. Hiểu các loại tracking (point, planar, 3D camera), workflow trong AE/Mocha và best practice giúp tạo VFX integration seamless. One of most-used skill trong day-to-day VFX work.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Motion Tracking là gì?</h2>
  <p>Motion Tracking là kỹ thuật <strong>analyze và follow motion</strong> của element trong video footage. Software detect feature point (corner, edge, distinctive pattern) trong frame, track position của feature qua subsequent frames → output motion data. Data này dùng để: attach 2D/3D element lên video, stabilize footage, replace screen, anonymize face, generate camera motion (matchmoving).</p>
  <p>Multiple loại tracking based on tracking goal: <strong>Point Tracking</strong> (track single point — basic, 2 axis position), <strong>Planar Tracking</strong> (track flat surface — perspective, scale, rotation), <strong>3D Camera Tracking</strong> (reconstruct camera 3D position — matchmoving), <strong>Face Tracking</strong> (track facial features), <strong>Object Tracking</strong> (track moving object trong scene). Choose technique based on what you&apos;re tracking and what you&apos;re attaching.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Motion Tracking vs Matchmoving</span>
    <p><strong>Motion Tracking</strong>: broad term, include 2D point tracking, planar, etc. <strong>Matchmoving</strong>: specific subset — track CAMERA motion in 3D space. Matchmoving requires multiple tracking points để triangulate 3D position. Both share underlying tracking algorithm.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Point Tracking</strong> — track single 2D point</li>
    <li><strong>Planar Tracking</strong> — track flat surface với perspective</li>
    <li><strong>3D Camera Tracking</strong> — derive 3D camera path</li>
    <li><strong>Track Data</strong> — output position/rotation/scale per frame</li>
    <li><strong>Track Region</strong> — area software analyze</li>
    <li><strong>Track Sample</strong> — feature template</li>
    <li><strong>Stabilization</strong> — remove camera shake via tracking</li>
    <li><strong>Marker</strong> — physical X marker on set cho tracking aid</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"motion tracking VFX after effects mocha planar point"</span>
    </div>
    <p class="arc-image-caption">Motion Tracking — analyze motion video, attach element seamlessly</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Tracking</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Point Tracking (1-Point, 2-Point, 4-Point)</summary>
      <div class="arc-card-body">
        <p>Most basic. Track 1, 2, hoặc 4 point. 1-point = position. 2-point = position + rotation + scale. 4-point = corner pin (perspective). After Effects standard tracker.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Planar Tracking (Mocha)</summary>
      <div class="arc-card-body">
        <p>Track flat surface — wall, table, phone screen, billboard. Track multiple feature within plane simultaneously. More robust than point tracking. Mocha Pro industry standard. Built-in AE từ CS6.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D Camera Tracking</summary>
      <div class="arc-card-body">
        <p>Analyze entire frame for multiple feature → reconstruct camera 3D position. After Effects 3D Camera Tracker, Nuke CameraTracker, dedicated PFTrack/SynthEyes/3DEqualizer. Necessary cho 3D CGI integration.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Face Tracking</summary>
      <div class="arc-card-body">
        <p>Track facial features — eye, mouth, jaw. Face Tracker (AE), Spark AR, Snap Lens Studio. Used cho beauty filter, anonymize face, facial replacement.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Object / Spline Tracking</summary>
      <div class="arc-card-body">
        <p>Track moving object trong scene. Object motion blur compensation. Useful cho rotoscoping aid, object removal.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2.5D Tracking</summary>
      <div class="arc-card-body">
        <p>Hybrid — track flat plane với depth approximation. Useful cho fake 3D effect.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Motion Tracking</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Choose Right Tracker</h3>
    <ul class="arc-list">
      <li>Stick text on wall → Planar (Mocha)</li>
      <li>Add 3D CGI in scene → 3D Camera Tracker</li>
      <li>Stabilize shake → Warp Stabilizer or 2-point</li>
      <li>Replace phone screen → 4-point Corner Pin</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Identify Track Feature</h3>
    <ul class="arc-list">
      <li>High contrast, distinct corner/edge</li>
      <li>Static feature relative to tracking goal</li>
      <li>Avoid moving people, reflective surface</li>
      <li>Add physical tracking marker (X on set) if needed</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Execute Tracking</h3>
    <ul class="arc-list">
      <li>Set track region around feature</li>
      <li>Run forward / backward</li>
      <li>Monitor real-time — pause if drift</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Refine Manually</h3>
    <ul class="arc-list">
      <li>Fix drift — manual nudge track to correct position</li>
      <li>Add keyframe at problem frame</li>
      <li>Re-run từ keyframe</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Apply Tracking Data</h3>
    <ul class="arc-list">
      <li>Apply to null object</li>
      <li>Parent target element to null</li>
      <li>Element follows tracked motion</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Integrate &amp; Polish</h3>
    <ul class="arc-list">
      <li>Color match, motion blur, grain</li>
      <li>Test integration seamless</li>
      <li>Toggle on/off check believability</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Use Cases &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Screen Replacement</strong> — replace phone/computer screen content</li>
    <li><strong>Text/Graphic Stick</strong> — add text on wall, sign on building</li>
    <li><strong>Object Removal</strong> — track object, clone background over</li>
    <li><strong>Stabilization</strong> — track and smooth shaky footage</li>
    <li><strong>Face Anonymization</strong> — blur tracked face for privacy</li>
    <li><strong>Beauty Filter</strong> — track facial feature, apply makeup</li>
    <li><strong>CGI Integration</strong> — 3D character stand on real ground</li>
    <li><strong>Tip</strong>: shoot với tracking markers on set — much easier than tracking-by-feature</li>
    <li><strong>Tip</strong>: Mocha Pro standalone superior cho difficult planar shot</li>
    <li><strong>Tip</strong>: more contrast và more feature = better tracking</li>
  </ul>
</section>
`,
  },

  // 02. nCloth (Maya)
  {
    id: "6062c4bf-c692-4acd-822d-49f0395bb576",
    tieu_de: "nCloth (Maya)",
    tieu_de_viet: "Mô phỏng vải nCloth trong Maya",
    tom_tat:
      "nCloth là công cụ mô phỏng vải và vật liệu mềm trong Autodesk Maya — tạo chuyển động tự nhiên cho quần áo, cờ, drapery, leather và soft body dynamics complex.",
    meta_title:
      "nCloth là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "nCloth Maya mô phỏng vải. Tìm hiểu workflow setup, collision, wind và best practice cho character clothing simulation.",
    noi_dung: `
<section class="arc-intro">
  <p>Trong phim Doctor Strange — Sorcerer Supreme cape flow dramatically, dynamic, alive. Maya animator không animate từng vertex cape — họ dùng <strong>nCloth</strong>, công cụ physics simulation built-in Maya. Setup mesh as cloth, define properties, let physics engine simulate. Result: realistic fabric motion impossible to hand-animate.</p>
  <p>nCloth là kỹ thuật advanced cho 3D animator, technical director, character TD. Mặc dù Maya specific, principles transfer to other software (Marvelous Designer, Blender Cloth, Houdini Vellum). Hiểu cloth simulation giúp create realistic character costume cho film, animation, game cinematic.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>nCloth là gì?</h2>
  <p>nCloth là <strong>physics simulation system</strong> trong Autodesk Maya — designed cho cloth (vải), soft body (vật liệu mềm) simulation. Part of Maya&apos;s Nucleus framework (cùng family với nParticle, nHair). Convert polygon mesh thành cloth object, define properties (stiffness, damping, mass), set collision với other mesh — simulator compute physics motion frame-by-frame.</p>
  <p>Workflow: artist setup cloth (T-shirt, cape, flag), bake animation, hand off to lighting/rendering. nCloth handle gravity, wind, collision, friction. Real-time playback giúp iterate. Export simulation as alembic cache cho production pipeline.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">nCloth vs Marvelous Designer vs Blender Cloth</span>
    <p><strong>nCloth (Maya)</strong>: integrated trong Maya pipeline, good for character work. <strong>Marvelous Designer</strong>: specialized clothing creation tool — pattern-based, sewing simulation. <strong>Blender Cloth</strong>: free alternative, less features. <strong>Houdini Vellum</strong>: most powerful, procedural workflow. Different strengths.</p>
  </div>

  <ul class="arc-list">
    <li><strong>nCloth Object</strong> — mesh converted to cloth</li>
    <li><strong>Passive Collider</strong> — non-simulating object cloth collide with</li>
    <li><strong>Nucleus Solver</strong> — physics engine</li>
    <li><strong>Stiffness</strong> — how rigid cloth resists bending</li>
    <li><strong>Damping</strong> — energy loss</li>
    <li><strong>Wind Field</strong> — directional force</li>
    <li><strong>Self-Collision</strong> — cloth collide with itself</li>
    <li><strong>Cache</strong> — bake simulation cho playback</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"nCloth maya cloth simulation cape character drapery"</span>
    </div>
    <p class="arc-image-caption">nCloth — Maya physics cho vải, cape, flag, clothing simulation</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>nCloth Workflow</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Create Cloth Mesh</summary>
      <div class="arc-card-body">
        <p>Model clothing/fabric polygon mesh. Clean topology, quad mesh preferred. Density appropriate — too dense = slow simulation, too sparse = artifacts.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Convert to nCloth</summary>
      <div class="arc-card-body">
        <p>Select mesh → nCloth → Create nCloth. Mesh becomes simulating cloth. Nucleus solver attached automatically.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Add Passive Colliders</summary>
      <div class="arc-card-body">
        <p>Body, ground, furniture must be passive collider. Select mesh → nCloth → Create Passive Collider. Cloth collide với these.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Set Properties</summary>
      <div class="arc-card-body">
        <p>Attribute Editor → nClothShape. Common: <strong>Stretch Resistance</strong> (anti-stretch), <strong>Bend Resistance</strong> (stiffness), <strong>Mass</strong> (weight), <strong>Damping</strong> (energy loss), <strong>Friction</strong>, <strong>Stickiness</strong>.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Add Constraints</summary>
      <div class="arc-card-body">
        <p>Cloth attach to body — Point to Surface constraint pin specific area. Vd: shirt neck attach to character&apos;s neck. Cloth shoulder hold while sleeve flow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Wind / Force</summary>
      <div class="arc-card-body">
        <p>Add Wind field cho directional force. Adjust magnitude, direction. Multiple field combine cho complex effect.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>7. Simulate &amp; Iterate</summary>
      <div class="arc-card-body">
        <p>Play timeline — simulation compute frame-by-frame. Adjust properties, re-simulate. Iterate until satisfied.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>8. Cache</summary>
      <div class="arc-card-body">
        <p>Bake simulation to disk — alembic cache. Playback realtime without re-simulating. Hand off to lighting/render.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Ứng dụng nCloth</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Character Clothing</h3>
    <ul class="arc-list">
      <li>Shirt, dress, cape, jacket dynamic</li>
      <li>Realistic clothing motion during action</li>
      <li>Hero character premium quality</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cape / Banner / Flag</h3>
    <ul class="arc-list">
      <li>Superhero cape (Doctor Strange, Thor)</li>
      <li>Flag in wind</li>
      <li>Long fabric drama</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Drapery / Curtain</h3>
    <ul class="arc-list">
      <li>Window curtain motion</li>
      <li>Bed sheet</li>
      <li>Tablecloth</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Soft Body (non-cloth)</h3>
    <ul class="arc-list">
      <li>Jelly, gummy bear deform</li>
      <li>Inflatable balloon</li>
      <li>Soft object collide</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Tearing / Ripping</h3>
    <ul class="arc-list">
      <li>nCloth có tearing feature</li>
      <li>Paper rip, fabric tear</li>
      <li>Destruction effect</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Leather / Heavy Fabric</h3>
    <ul class="arc-list">
      <li>Stiff material (higher stiffness)</li>
      <li>Less drape, more structure</li>
      <li>Realistic leather jacket motion</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Common Issues</h2>
  <ul class="arc-list">
    <li><strong>Simulation slow</strong> — reduce mesh density, increase Substeps for stability</li>
    <li><strong>Cloth interpenetrate</strong> — increase Self-Collision, Thickness</li>
    <li><strong>Cloth too jiggly</strong> — increase Damping, Bend Resistance</li>
    <li><strong>Cloth too stiff</strong> — decrease Bend Resistance, Stretch Resistance</li>
    <li><strong>Cloth fly off</strong> — check constraint, Air Push Distance</li>
    <li><strong>Frame 1 explode</strong> — initial state intersecting collider, start simulation later frame</li>
    <li><strong>Cache before render</strong> — never render without baked cache (different result)</li>
    <li><strong>Iteration is normal</strong> — multiple sim, tweak — expect time investment</li>
    <li><strong>Reference real fabric</strong> — film fabric motion cho realistic settings</li>
  </ul>
</section>
`,
  },

  // 03. Node-based
  {
    id: "48731ca8-5f65-4b19-b98e-64fcbaeeb135",
    tieu_de: "Node-based Workflow",
    tieu_de_viet: "Workflow theo nút (Node-based)",
    tom_tat:
      "Node-based là phương pháp tổ chức task trong software bằng cách kết nối các nút (node) — mỗi node là một tác vụ — Nuke, Houdini, Substance Designer, Blender, DaVinci Fusion đều dùng.",
    meta_title:
      "Node-based là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Node-based workflow trong VFX, 3D, compositing. Tìm hiểu lợi ích, software popular và so sánh với layer-based.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn mở Nuke compositor pro — không phải timeline layer như AE, mà network of node connected by lines. Mỗi node là một tác vụ — read image, color correct, blur, mask. Houdini same — node graph create complex 3D scene. Substance Designer — node create material. <strong>Node-based</strong> là paradigm khác layer-based, mạnh hơn cho complex VFX pipeline.</p>
  <p>Node-based là kiến thức essential cho VFX artist, 3D TD, technical artist game. Hiểu node-based thinking phân biệt junior (layer-based AE only) và senior (Nuke, Houdini, Substance node fluent). Career path top-tier VFX requires node fluency.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Node-based là gì?</h2>
  <p>Node-based là <strong>phương pháp tổ chức workflow</strong> trong software — task represented as <strong>node</strong> (block, box), kết nối với nhau qua <strong>line</strong> (connection, wire). Each node performs <strong>một specific function</strong> — read file, modify pixel, transform geometry, output. Output của one node = input của next. Result: <strong>directed graph</strong> defining computation flow.</p>
  <p>Architecture allows: <strong>non-destructive editing</strong> (modify any node anytime, downstream re-compute), <strong>complex branching</strong> (output to multiple destinations), <strong>visual logic clarity</strong> (see entire pipeline as diagram), <strong>flexibility</strong> (rearrange, replace, mix nodes). Trade-off: steeper learning curve than layer-based.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Node-based vs Layer-based</span>
    <p><strong>Layer-based</strong> (Photoshop, AE, Premiere): stack layers, blend mode interact. Linear, intuitive. Simpler. <strong>Node-based</strong> (Nuke, Houdini, Substance Designer): graph network. Non-linear, more flexible. Better for complex VFX pipeline. Pro often use both — layer-based cho simple task, node-based cho complex.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Node</strong> — function block</li>
    <li><strong>Input / Output Port</strong> — connection point</li>
    <li><strong>Wire / Connection</strong> — link between nodes</li>
    <li><strong>Graph / Network</strong> — entire node structure</li>
    <li><strong>Read / Write Node</strong> — file I/O</li>
    <li><strong>Merge Node</strong> — combine 2+ inputs</li>
    <li><strong>Group Node</strong> — encapsulate sub-network</li>
    <li><strong>Parameter</strong> — node setting</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"node based workflow nuke houdini substance designer graph"</span>
    </div>
    <p class="arc-image-caption">Node-based — task as node connected, visual computation graph</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Software Node-based Phổ biến</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Nuke (Compositing)</summary>
      <div class="arc-card-body">
        <p>Industry standard cho film VFX compositing. Used by ILM, Weta, Marvel studios. Node graph: Read → Merge → Color → Blur → Write. Steep learning curve, but powerful. Free version Nuke Non-Commercial available.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Houdini (3D &amp; VFX)</summary>
      <div class="arc-card-body">
        <p>Most powerful procedural 3D software. Procedural modeling, simulation, particle, fluid. SideFX. Used cho complex VFX simulation. Apprentice version free.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Substance Designer</summary>
      <div class="arc-card-body">
        <p>Procedural material creation. Node graph → parametric texture. Output PBR maps. Adobe Substance suite.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DaVinci Resolve Fusion</summary>
      <div class="arc-card-body">
        <p>Compositing và motion graphics trong DaVinci Resolve. Free tier capable. Alternative to Nuke / After Effects.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender Shader Editor</summary>
      <div class="arc-card-body">
        <p>Material creation trong Blender. Node-based shader. Geometry Nodes Blender 3.0+ — procedural geometry node-based.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unreal Engine Material Editor</summary>
      <div class="arc-card-body">
        <p>UE4/5 material via node graph. Blueprint visual scripting (logic) also node-based.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Maya Hypershade</summary>
      <div class="arc-card-body">
        <p>Maya&apos;s shader/material network editor. Connect node để build complex shader.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>TouchDesigner</summary>
      <div class="arc-card-body">
        <p>Real-time interactive visual. Multimedia art, VJ work. Operator-based (node).</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Lợi ích Node-based</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Non-destructive</h3>
    <ul class="arc-list">
      <li>Modify any node anytime, no &quot;undo&quot; needed</li>
      <li>Source data preserved</li>
      <li>Experiment freely</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Branching</h3>
    <ul class="arc-list">
      <li>Output to multiple destination</li>
      <li>Compare variations side-by-side</li>
      <li>Layer-based difficulty cho branching</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Reusability</h3>
    <ul class="arc-list">
      <li>Group nodes into reusable template</li>
      <li>Copy/paste subgraph</li>
      <li>Asset library of node patterns</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Procedural</h3>
    <ul class="arc-list">
      <li>Parameters drive output</li>
      <li>Change parameter → entire graph re-compute</li>
      <li>Easy variation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Visual Debugging</h3>
    <ul class="arc-list">
      <li>See entire pipeline as diagram</li>
      <li>Identify bottleneck visually</li>
      <li>Easy understand someone else&apos;s setup</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Performance Optimization</h3>
    <ul class="arc-list">
      <li>Cache intermediate node</li>
      <li>Disable expensive node for faster preview</li>
      <li>Parallel processing</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Học Node-based</h2>
  <ul class="arc-list">
    <li><strong>Start với one software</strong> — Nuke or Substance Designer popular entry</li>
    <li><strong>Watch tutorial</strong> — FXPHD, Hugo&apos;s Desk, CGCircuit cho Nuke; Substance Academy</li>
    <li><strong>Understand node order</strong> — output of upstream = input of downstream</li>
    <li><strong>Use Group/Subnetwork</strong> — organize complex graph cleanly</li>
    <li><strong>Label nodes</strong> — meaningful name, not default &quot;Blur1&quot;</li>
    <li><strong>Comment</strong> — annotate intent of section</li>
    <li><strong>Backbone clean</strong> — straight backbone, branch off perpendicular</li>
    <li><strong>Copy industry pattern</strong> — beauty pass, denoise pass — standard structures</li>
    <li><strong>Career boost</strong>: node-based fluency = senior VFX role $90K-150K+</li>
    <li><strong>Skill transfer</strong>: Nuke node thinking transfers to Houdini, Substance — invest learning concept</li>
  </ul>
</section>
`,
  },

  // 04. Noise Reduction
  {
    id: "a348c1b7-eb50-4723-a847-cd94efb99189",
    tieu_de: "Noise Reduction",
    tieu_de_viet: "Giảm nhiễu (Noise Reduction)",
    tom_tat:
      "Noise Reduction là kỹ thuật giảm nhiễu hạt trong ảnh hoặc video — xử lý bằng thuật toán temporal hoặc spatial, quan trọng với footage quay trong điều kiện ánh sáng thấp.",
    meta_title:
      "Noise Reduction là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Noise Reduction xử lý nhiễu video/ảnh. Tìm hiểu temporal vs spatial, Neat Video, RED Giant và workflow chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn quay video buổi tối — footage có grain heavy, chấm pixel xanh đỏ rải khắp. Tăng ISO cao trên camera = noise đặc trưng. Trong post-production, apply <strong>Noise Reduction</strong> — algorithm phân tích noise pattern, smooth out — footage clean như quay ban ngày. Critical kỹ thuật cho videographer indie, podcast video, low-budget production.</p>
  <p>Noise Reduction là kỹ năng essential cho mọi video editor, photographer, colorist. Hiểu các loại noise và phương pháp reduction (temporal, spatial, AI-based) giúp recover footage quay điều kiện khó khăn — quan trọng cho workflow professional và indie creator.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Noise Reduction là gì?</h2>
  <p>Noise Reduction (NR) là kỹ thuật digital processing để <strong>giảm nhiễu</strong> trong ảnh/video — random fluctuation in pixel value tạo ra grainy, speckled appearance. Sources of noise: high ISO setting (sensor amplify signal kèm noise), small sensor (smartphone, action cam), heat (long exposure), compression artifact, signal interference.</p>
  <p>NR algorithm analyze image, identify noise pattern, smooth out — preserve detail. Trade-off luôn tồn tại: aggressive NR removes noise but blurs detail; mild NR preserves detail but noise remains. Pro skill: balance settings cho clean look without &quot;plasticy&quot; over-processed appearance.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Spatial vs Temporal Noise Reduction</span>
    <p><strong>Spatial NR</strong>: analyze pixel value of neighbors in same frame. Smooth based on surrounding. Single image OK, simpler. <strong>Temporal NR</strong>: compare multiple frames over time — true detail consistent, noise varies frame-to-frame. More powerful cho video. Modern tool combine both.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Luminance Noise</strong> — brightness variation, grainy</li>
    <li><strong>Chrominance Noise</strong> — color speckle, red/green dot</li>
    <li><strong>Spatial NR</strong> — single frame, neighbor-based</li>
    <li><strong>Temporal NR</strong> — multi-frame comparison</li>
    <li><strong>Adaptive NR</strong> — vary by area (more in dark, less in light)</li>
    <li><strong>AI Noise Reduction</strong> — machine learning approach</li>
    <li><strong>Sharpening</strong> — counter-balance after NR</li>
    <li><strong>Grain Add</strong> — re-add subtle grain after heavy NR</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"noise reduction video photo low light grain remove"</span>
    </div>
    <p class="arc-image-caption">Noise Reduction — giảm nhiễu hạt, preserve detail tối đa</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Tools Noise Reduction</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Neat Video</summary>
      <div class="arc-card-body">
        <p>Industry standard plugin cho video noise reduction. Profile-based — analyze noise pattern from sample area, apply optimized cleanup. Plugin cho After Effects, Premiere, Resolve. $130-200. Best in class.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DaVinci Resolve Noise Reduction</summary>
      <div class="arc-card-body">
        <p>Built-in Studio version. Temporal + Spatial. Good quality, well-integrated. Studio license $295 one-time.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Premiere Pro / After Effects Noise Reduction</summary>
      <div class="arc-card-body">
        <p>Built-in Reduce Noise effect. Basic, slow. Adequate cho mild noise. Pro use Neat Video instead.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Topaz Video AI (formerly DeNoise AI)</summary>
      <div class="arc-card-body">
        <p>AI-based noise reduction. Newer technology, impressive result. Subscription/one-time options. Strong for heavy noise.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>BorisFX Sapphire Denoise</summary>
      <div class="arc-card-body">
        <p>Plugin Sapphire suite. High-end VFX noise reduction.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photo: Topaz DeNoise, DxO PureRAW, Adobe Camera Raw</summary>
      <div class="arc-card-body">
        <p>For still photo. AI-based DeNoise impressive. DxO PureRAW excellent cho RAW. Lightroom built-in noise reduction sufficient cho most.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>FFmpeg / Free Tools</summary>
      <div class="arc-card-body">
        <p>Command-line free options. Less user-friendly, capable for technical user.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Noise Reduction</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Identify Noise Type</h3>
    <ul class="arc-list">
      <li>Luminance noise (grainy) hoặc chrominance (color speckle)?</li>
      <li>Heavy or mild?</li>
      <li>Determines treatment strength</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Build Noise Profile</h3>
    <ul class="arc-list">
      <li>Neat Video: sample area without detail (shadow background)</li>
      <li>Software learn noise pattern</li>
      <li>Specific to camera, ISO, lighting condition</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Apply Conservative Settings</h3>
    <ul class="arc-list">
      <li>Start với mild settings</li>
      <li>Over-reduction = plastic look</li>
      <li>Trade-off detail preserve vs noise removal</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Adjust Per-Region</h3>
    <ul class="arc-list">
      <li>Dark area more noise, more reduction</li>
      <li>Bright area less noise, less reduction</li>
      <li>Adaptive NR auto-handle</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Sharpen After</h3>
    <ul class="arc-list">
      <li>NR softens image — slight sharpening recover detail</li>
      <li>Don&apos;t over-sharpen — re-introduces noise</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Re-add Grain (Optional)</h3>
    <ul class="arc-list">
      <li>Heavy NR = unnaturally clean</li>
      <li>Add subtle film grain back cho organic feel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Compare A/B</h3>
    <ul class="arc-list">
      <li>Toggle on/off frequently</li>
      <li>Zoom 100-200% inspect</li>
      <li>Multiple frame playback (NR look different motion)</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Best Practices</h2>
  <ul class="arc-list">
    <li><strong>Prevention &gt; cure</strong> — shoot low ISO, expose correctly cho minimal noise</li>
    <li><strong>Use neutral noise profile</strong> — build per-clip cho best result</li>
    <li><strong>Apply BEFORE color grading</strong> — grading amplify noise</li>
    <li><strong>Subtle sharp after NR</strong> — restore some detail</li>
    <li><strong>Check edge of subject</strong> — common NR artifact area</li>
    <li><strong>AI tool excel for heavy noise</strong> — Topaz, DXO better than traditional</li>
    <li><strong>10-bit footage &gt; 8-bit</strong> for NR — more data work with</li>
    <li><strong>Render expensive</strong> — quality NR slow, batch overnight</li>
    <li><strong>Don&apos;t over-process</strong> — pro recognize over-NR &quot;plastic&quot; look immediately</li>
  </ul>
</section>
`,
  },

  // 05. Normal Map
  {
    id: "943432f4-90b7-4637-8218-f018428eeac4",
    tieu_de: "Normal Map",
    tieu_de_viet: "Normal Map (Pháp tuyến)",
    tom_tat:
      "Normal Map là texture lưu thông tin về hướng bề mặt dưới dạng RGB — cho phép low-poly mesh mô phỏng chi tiết high-poly mà không tốn performance render — essential cho game asset.",
    meta_title:
      "Normal Map là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Normal Map fake detail cho low-poly mesh. Tìm hiểu tangent vs world space, baking workflow và best practice texture.",
    noi_dung: `
<section class="arc-intro">
  <p>Game AAA — character có skin pore detail, armor rivet, fabric weave thấy rõ. Khi inspect wireframe — chỉ 30K polygon. Làm sao? <strong>Normal Map</strong> — texture lưu thông tin về surface direction, fake detail visual mà không add geometry. Đây là magic của normal mapping — performance optimization critical cho mọi game asset, VR/AR, mobile real-time graphics.</p>
  <p>Normal Map là kiến thức essential cho 3D modeler, texture artist, technical artist game. Hiểu cách bake, troubleshoot, apply normal map giúp tạo asset hiệu quả về performance — quan trọng cho game development, real-time visualization, AR/VR application.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Normal Map là gì?</h2>
  <p>Normal Map là <strong>image texture</strong> trong đó mỗi pixel <strong>RGB value đại diện cho hướng surface normal</strong> (vector pointing perpendicular to surface) tại điểm đó. R = X direction, G = Y, B = Z. Apply normal map onto mesh → renderer treat surface as if it had detail described in map, even though geometry is flat. Result: fake bumpiness, detail without geometric cost.</p>
  <p>Workflow standard: artist sculpt high-poly mesh (millions polygon) với fine detail; retopologize thành low-poly (thousands polygon); <strong>bake</strong> high-poly detail vào normal map → apply onto low-poly. Low-poly render fast với high-poly visual. Game industry standard từ early 2000s. Modern Unreal Nanite era reduces dependence on normal map nhưng vẫn relevant cho mobile, VR.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Normal Map vs Bump Map vs Displacement Map</span>
    <p><strong>Normal Map</strong>: directional info RGB, fake detail. <strong>Bump Map</strong>: grayscale height value, simpler. <strong>Displacement Map</strong>: actually move vertex up/down — adds real geometry, expensive but better silhouette. Each progressively more expensive and accurate.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Tangent Space</strong> — relative to mesh surface</li>
    <li><strong>World Space</strong> — relative to world axes</li>
    <li><strong>Object Space</strong> — relative to object</li>
    <li><strong>OpenGL vs DirectX</strong> — Y axis inverted</li>
    <li><strong>Baking</strong> — transfer high-poly to low-poly</li>
    <li><strong>UV Map</strong> — required for normal map application</li>
    <li><strong>Mikktspace</strong> — standard normal calculation</li>
    <li><strong>Seam</strong> — UV boundary issue</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"normal map texture 3D RGB blue pink purple bake game"</span>
    </div>
    <p class="arc-image-caption">Normal Map — RGB encoding surface direction, fake detail cho low-poly</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Workflow Bake Normal Map</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Create High-Poly</summary>
      <div class="arc-card-body">
        <p>ZBrush sculpt với millions of polygon. Fine detail — wrinkles, pores, rivets. Maximum detail target.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Retopologize Low-Poly</summary>
      <div class="arc-card-body">
        <p>Clean topology version, suitable cho animation/game. 10K-50K poly typical character.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. UV Unwrap</summary>
      <div class="arc-card-body">
        <p>UV map low-poly. Clean layout, minimal seam. Sufficient texel density. Critical cho normal map quality.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Align Both Models</summary>
      <div class="arc-card-body">
        <p>High-poly và low-poly same position, scale. Critical cho accurate bake.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Bake</summary>
      <div class="arc-card-body">
        <p>Software project high-poly detail onto low-poly UV. Tool: Substance Painter, Marmoset Toolbag, xNormal, Maya Transfer Maps. Cage definition help bake accuracy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Verify &amp; Clean</summary>
      <div class="arc-card-body">
        <p>Check normal map for artifact. Apply lên low-poly trong viewer — compare với high-poly. Touch up trong Photoshop nếu cần.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>7. Apply trong Game/Engine</summary>
      <div class="arc-card-body">
        <p>Material setup — connect normal map to Normal slot. Tangent space typically. Test trong real engine lighting.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Common Issues &amp; Solutions</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Seam Visible</h3>
    <ul class="arc-list">
      <li>UV seam = normal map discontinuity</li>
      <li>Hide seam in non-visible area (back of head, sole)</li>
      <li>Padding (bleed) trong UV layout</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Artifact / Distortion</h3>
    <ul class="arc-list">
      <li>Cage too tight — high-poly intersect low-poly</li>
      <li>Adjust cage distance</li>
      <li>Multi-bake từng region riêng</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Inverted Normal</h3>
    <ul class="arc-list">
      <li>OpenGL vs DirectX Y axis convention difference</li>
      <li>Unity uses OpenGL, Unreal uses DirectX</li>
      <li>Flip green channel if needed</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Blurry / Low Quality</h3>
    <ul class="arc-list">
      <li>UV layout too small (low texel density)</li>
      <li>Increase texture resolution (2K → 4K)</li>
      <li>Re-layout UV for detail area</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Faceting</h3>
    <ul class="arc-list">
      <li>Low-poly hard edge visible despite normal map</li>
      <li>Normal map fake only smooth detail</li>
      <li>Smoothing groups / smoothed normal in low-poly</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Best Practices</h2>
  <ul class="arc-list">
    <li><strong>Tangent space</strong> default cho most use case</li>
    <li><strong>UV layout matters</strong> — texel density consistent</li>
    <li><strong>16-bit normal map</strong> cho high quality (vs 8-bit)</li>
    <li><strong>Don&apos;t paint normal map</strong> directly — bake from high-poly</li>
    <li><strong>Test in target engine</strong> — viewport ≠ game engine result</li>
    <li><strong>Combine với other maps</strong> — AO, roughness for full PBR</li>
    <li><strong>Substance Painter</strong> standard cho bake + paint workflow</li>
    <li><strong>Marmoset Toolbag</strong> excellent baker + viewer</li>
    <li><strong>xNormal</strong> free alternative baker</li>
    <li><strong>Career</strong>: Texture artist với normal map mastery in-demand cho game studio</li>
  </ul>
</section>
`,
  },

  // 06. NURBS
  {
    id: "c8c16c40-d8f7-4917-8d6e-f01927417be0",
    tieu_de: "NURBS",
    tieu_de_viet: "Bề mặt NURBS",
    tom_tat:
      "NURBS (Non-Uniform Rational B-Splines) là phương pháp modeling 3D tạo bề mặt cong mịn dùng mathematical curve — thường dùng trong thiết kế công nghiệp, ô tô, sản phẩm cần precision cao.",
    meta_title: "NURBS là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "NURBS surface modeling 3D. Tìm hiểu so sánh với polygon, ứng dụng automotive, industrial design và workflow.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nhìn iPhone — smooth curve perfect, no facet visible. Apple designer dùng <strong>NURBS</strong> — mathematical surface tạo curve hoàn hảo, không pixel-y như polygon. Automotive design (BMW, Ferrari), industrial product (Dyson vacuum), aerospace (Boeing) — tất cả dùng NURBS để achieve precision impossible với polygon.</p>
  <p>NURBS là kiến thức quan trọng cho industrial designer, automotive designer, product designer. Mặc dù less common in character/film modeling (polygon dominate), NURBS critical cho precision design where smoothness matters. Software như Rhino, Alias chuyên về NURBS.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>NURBS là gì?</h2>
  <p>NURBS (Non-Uniform Rational B-Splines) là <strong>mathematical representation</strong> của 3D surface using curves. Khác với polygon (vertex + face), NURBS surface defined by <strong>control points</strong> driving <strong>smooth curves</strong>. Movement of control point bends curve smoothly. Result: <strong>perfectly smooth surface</strong>, no facet, no polygon visible, regardless of zoom level. Math: B-spline curve weighted by control points; &quot;Non-Uniform&quot; means control points can be unevenly spaced.</p>
  <p>NURBS advantage: precise control over curve, mathematically smooth, ideal cho engineering precision. Disadvantage: harder to model complex organic shape, less flexible than polygon, file format compatibility issue trong game pipeline. Modern modern modeling chủ yếu polygon + subdivision surface, NURBS reserve cho specific industrial use.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">NURBS vs Polygon vs Subdivision Surface</span>
    <p><strong>NURBS</strong>: mathematical smooth, precision engineering. <strong>Polygon</strong>: vertex/face, flexible, universal. <strong>Subdivision Surface</strong>: polygon + smoothing algorithm, organic smooth. Modern character animation use Subdivision. Industrial design use NURBS. Game use Polygon.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Control Point (CV)</strong> — point driving curve</li>
    <li><strong>Curve</strong> — 1D NURBS</li>
    <li><strong>Surface</strong> — 2D NURBS</li>
    <li><strong>Trim Curve</strong> — cut surface to shape</li>
    <li><strong>Degree</strong> — polynomial degree of curve</li>
    <li><strong>Knot</strong> — parameter value of curve segment</li>
    <li><strong>Loft / Sweep / Revolve</strong> — surface creation methods</li>
    <li><strong>U / V Direction</strong> — surface parametric axes</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"NURBS surface modeling industrial design automotive rhino"</span>
    </div>
    <p class="arc-image-caption">NURBS — mathematical smooth surface, precision modeling industrial</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Software NURBS</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Rhino (Rhinoceros 3D)</summary>
      <div class="arc-card-body">
        <p>Most popular NURBS dedicated software. Industrial design, architecture, jewelry. McNeel Associates. $995. Grasshopper plugin cho parametric workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Autodesk Alias</summary>
      <div class="arc-card-body">
        <p>Premium tier cho automotive design. Used by BMW, Audi, Ferrari. Highest precision Class A surface. Expensive.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>SolidWorks</summary>
      <div class="arc-card-body">
        <p>CAD software. Combine parametric solid modeling với NURBS surface. Engineering, mechanical design.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fusion 360</summary>
      <div class="arc-card-body">
        <p>Autodesk. Free cho hobbyist, education. Parametric modeling + NURBS. Industry-level workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Maya NURBS</summary>
      <div class="arc-card-body">
        <p>Maya supports NURBS alongside polygon. Less common modern workflow but available. Legacy NURBS tutorial common in Maya.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Catia (Dassault Systèmes)</summary>
      <div class="arc-card-body">
        <p>Aerospace, automotive industry. Most expensive premium ($10K+/year). Boeing, Airbus, Tesla.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>NURBS Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Curve First</h3>
    <ul class="arc-list">
      <li>Create curves as foundation</li>
      <li>Edit control points → curve shape</li>
      <li>Adjust degree, knots for control</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Surface Creation</h3>
    <ul class="arc-list">
      <li><strong>Loft</strong>: surface across multiple curves</li>
      <li><strong>Revolve</strong>: rotate curve around axis</li>
      <li><strong>Sweep</strong>: curve along path</li>
      <li><strong>Extrude</strong>: curve straight line</li>
      <li><strong>Birail</strong>: surface between two rail curves</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Edit Surface</h3>
    <ul class="arc-list">
      <li>Move control points</li>
      <li>Insert/remove isoparm (parameter line)</li>
      <li>Smooth / refine surface</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Trim &amp; Boolean</h3>
    <ul class="arc-list">
      <li>Cut surface với curve hoặc other surface</li>
      <li>Project curve onto surface</li>
      <li>Subtraction operation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Tangent Continuity</h3>
    <ul class="arc-list">
      <li>Two adjacent surface must connect smoothly</li>
      <li>G0 (position match), G1 (tangent match), G2 (curvature match)</li>
      <li>Critical cho Class A surface automotive</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Convert to Polygon</h3>
    <ul class="arc-list">
      <li>For rendering / game export</li>
      <li>Tessellation — control density</li>
      <li>Different software different conversion quality</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Ứng dụng &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Automotive Design</strong> — Class A surface BMW, Audi, Ferrari, Tesla</li>
    <li><strong>Industrial Design</strong> — consumer product (iPhone, Dyson, Bose)</li>
    <li><strong>Aerospace</strong> — Boeing, Airbus, SpaceX</li>
    <li><strong>Architecture</strong> — curved building (Frank Gehry, Zaha Hadid)</li>
    <li><strong>Yacht Design</strong> — boat hull</li>
    <li><strong>Jewelry Design</strong> — Rhino popular jewelry industry</li>
    <li><strong>Footwear Design</strong> — Nike, Adidas NURBS for shoe surface</li>
    <li><strong>Career path</strong>: Industrial Designer $60K-120K, Automotive Designer $80K-200K, CAD Engineer</li>
    <li><strong>Top schools</strong>: ArtCenter Pasadena, RCA London, CCS Detroit</li>
    <li><strong>Less common</strong> in entertainment industry (film, game) — character/environment use polygon</li>
  </ul>
</section>
`,
  },

  // 07. Occlusion Culling
  {
    id: "b7ccd28b-49a9-4af4-8cdc-80d1a0a4fac7",
    tieu_de: "Occlusion Culling",
    tieu_de_viet: "Tối ưu render Occlusion Culling",
    tom_tat:
      "Occlusion Culling là kỹ thuật render chỉ hiển thị vật thể có thể nhìn thấy, loại bỏ vật thể bị che khuất để tăng tốc xử lý đồ họa — essential cho game 3D performance.",
    meta_title:
      "Occlusion Culling là gì? Ý nghĩa và ứng dụng trong game | CINS",
    meta_description:
      "Occlusion Culling tối ưu game 3D. Tìm hiểu Unity, Unreal occlusion, view frustum và workflow setup chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn đứng trong game GTA — character ở trong room, có 1 wall lớn block view ra ngoài. Engine vẫn render entire city behind wall? Lãng phí GPU horribly — fps drop. Engine smarter — <strong>Occlusion Culling</strong> — detect what player can&apos;t see và skip rendering it. Result: game run smoothly even với massive scene. Critical optimization cho mọi game 3D modern.</p>
  <p>Occlusion Culling là kiến thức essential cho game developer, technical artist, 3D programmer. Hiểu các loại culling, setup trong Unity/Unreal, và profiling giúp tạo game perform well — đặc biệt cho open world, mobile, VR khi performance critical.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Occlusion Culling là gì?</h2>
  <p>Occlusion Culling là kỹ thuật <strong>optimization render</strong> — engine <strong>skip render</strong> object that <strong>không visible</strong> from current camera position (bị che khuất bởi other object). Different from <strong>Frustum Culling</strong> (skip object outside camera view frustum/cone of vision). Both apply — frustum cull eliminates off-screen, occlusion cull eliminates blocked-by-geometry.</p>
  <p>Without occlusion culling, GPU process every object trong scene regardless visibility. Massive scene (city, dungeon) waste GPU power. With occlusion culling, only <strong>visible</strong> object render → drastic fps improvement. Engine maintain <strong>visibility database</strong> precomputed từ scene geometry — runtime query: is this object visible from camera?</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Frustum Culling vs Occlusion Culling</span>
    <p><strong>Frustum Culling</strong>: skip object outside camera&apos;s cone of vision. Cheap, always enabled. <strong>Occlusion Culling</strong>: skip object behind other geometry. Expensive computation, opt-in. Combine both = maximum optimization.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Frustum Culling</strong> — skip off-screen object</li>
    <li><strong>Backface Culling</strong> — skip polygon facing away</li>
    <li><strong>PVS (Potentially Visible Set)</strong> — precomputed visibility data</li>
    <li><strong>Z-Buffer</strong> — depth buffer for visibility test</li>
    <li><strong>Hierarchical Z-Buffer</strong> — multi-level depth check</li>
    <li><strong>Portal</strong> — door/window indicate visibility connection</li>
    <li><strong>Occluder</strong> — large block geometry hide others</li>
    <li><strong>Bake</strong> — precompute visibility data</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"occlusion culling game 3D optimization unity unreal performance"</span>
    </div>
    <p class="arc-image-caption">Occlusion Culling — skip render object bị che khuất, boost fps</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Loại Occlusion Culling</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Static Occlusion Culling (Baked)</summary>
      <div class="arc-card-body">
        <p>Precomputed at build time. Scene must be static (doors closed, walls fixed). Fast runtime. Used Unity Pro, Unreal Engine. Baked into level data.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dynamic Occlusion Culling</summary>
      <div class="arc-card-body">
        <p>Computed runtime. Handle dynamic scene (door open/close). More expensive but flexible. Modern engine increasing dynamic culling.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Portal-based</summary>
      <div class="arc-card-body">
        <p>Define portal (door, window) connecting rooms. If player can&apos;t see portal, can&apos;t see room beyond. Efficient cho indoor environment. Quake engine pioneered.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hi-Z (Hierarchical Z-Buffer)</summary>
      <div class="arc-card-body">
        <p>GPU-based, multi-level depth check. Test bounding volume against depth pyramid. Modern engine standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hardware Occlusion Query</summary>
      <div class="arc-card-body">
        <p>GPU API queries — render bounding box test, get visibility result. Latency issue — frame delay before result.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Manual / Layer-based</summary>
      <div class="arc-card-body">
        <p>Artist/designer manually disable distant object. Old-school but effective. Combination với automatic.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Setup Occlusion Culling trong Unity</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Mark Static</h3>
    <ul class="arc-list">
      <li>Object phải đánh dấu Occluder Static / Occludee Static</li>
      <li>Inspector → Static dropdown</li>
      <li>Building, terrain, large geometry = Occluder</li>
      <li>Small object that gets occluded = Occludee</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Window → Occlusion Culling</h3>
    <ul class="arc-list">
      <li>Open Occlusion Culling panel</li>
      <li>Configure settings</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Bake Settings</h3>
    <ul class="arc-list">
      <li><strong>Smallest Occluder</strong>: small object treated as occluder</li>
      <li><strong>Smallest Hole</strong>: smaller hole gap ignored</li>
      <li><strong>Backface Threshold</strong>: backface culling threshold</li>
      <li>Adjust based on scene scale</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Bake</h3>
    <ul class="arc-list">
      <li>Click Bake button</li>
      <li>Unity precompute visibility data</li>
      <li>Time depends on scene size</li>
      <li>Data saved with scene</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Test &amp; Verify</h3>
    <ul class="arc-list">
      <li>Visualize tab — see culling working</li>
      <li>Profiler — verify draw calls reduced</li>
      <li>FPS improvement check</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Iterate</h3>
    <ul class="arc-list">
      <li>Adjust occluder/occludee classification</li>
      <li>Re-bake</li>
      <li>Iterate cho optimal balance</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Best Practices &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Mark static aggressively</strong> — many object can be static</li>
    <li><strong>Use occluder geometry</strong> — large building, wall as occluder</li>
    <li><strong>Avoid many small object</strong> — combine into chunk reduce draw call</li>
    <li><strong>LOD complement occlusion</strong> — both technique stack</li>
    <li><strong>Profile first</strong> — measure before optimizing</li>
    <li><strong>Mobile critical</strong> — phone GPU limited, occlusion essential</li>
    <li><strong>VR even more critical</strong> — render 2 frame (each eye), perf budget tight</li>
    <li><strong>Unreal Engine</strong> auto-enables HZB occlusion by default, less setup</li>
    <li><strong>Open world challenge</strong> — large scale need streaming + culling combined</li>
    <li><strong>UE5 Nanite</strong> — virtualized geometry với automatic culling per cluster</li>
  </ul>
</section>
`,
  },

  // 08. Onion Skin
  {
    id: "41188814-2800-41ef-94a2-ba82ef22588d",
    tieu_de: "Onion Skin",
    tieu_de_viet: "Onion Skin (Animation)",
    tom_tat:
      "Onion Skin là kỹ thuật hiển thị mờ các frame trước và sau frame hiện tại trong animation — giúp animator thấy chuyển động và điều chỉnh timing chính xác, đặc biệt cho frame-by-frame.",
    meta_title: "Onion Skin là gì? Ý nghĩa và ứng dụng trong animation | CINS",
    meta_description:
      "Onion Skin animation 2D. Tìm hiểu cách dùng trong TVPaint, Toon Boom, Procreate Dreams cho frame-by-frame animation.",
    noi_dung: `
<section class="arc-intro">
  <p>2D animator vẽ character chạy — frame 5 cần vẽ đúng position so với frame 4 và frame 6 cho smooth motion. Without reference, mỗi frame standalone — character &quot;teleport&quot;. Với <strong>Onion Skin</strong> — frame trước và sau visible as semi-transparent ghost — animator clearly see motion progression. Đây là digital equivalent của light table cổ điển.</p>
  <p>Onion Skin là kỹ năng cơ bản cho 2D animator. Hiểu cách configure onion skin (range, color, opacity) trong các software (TVPaint, Toon Boom, Procreate Dreams) giúp animate frame-by-frame hiệu quả — foundation cho character animation 2D modern.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Onion Skin là gì?</h2>
  <p>Onion Skin là feature trong animation software — <strong>hiển thị frame xung quanh</strong> (trước và sau) <strong>frame hiện tại</strong> dưới dạng <strong>semi-transparent ghost</strong>. Tên &quot;onion skin&quot; reference vỏ hành tỏi — many translucent layers. Animator vẽ frame hiện tại với reference visible từ multiple adjacent frame → judge motion progression, timing.</p>
  <p>Configurable: number of frames visible before/after (range), opacity per frame (newer = brighter, older = dimmer), color (past=blue, future=red common convention), display style. Digital evolution của <strong>light table</strong> trong traditional 2D animation — physical paper stacked, light through underneath shows previous drawings.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Onion Skin Best Settings</span>
    <p>Common setup: <strong>2 frame before, 2 frame after</strong>. Past = blue tint, future = red tint. Opacity 30-50% cho ghost frames. Adjust based on motion complexity — fast motion need more frame visible cho overall arc.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Range</strong> — number of adjacent frame visible</li>
    <li><strong>Opacity</strong> — ghost frame transparency</li>
    <li><strong>Color Coding</strong> — past blue, future red</li>
    <li><strong>Forward / Backward</strong> — direction visible</li>
    <li><strong>Light Table</strong> — physical traditional equivalent</li>
    <li><strong>Inbetweening</strong> — primary use case</li>
    <li><strong>Frame-by-Frame</strong> — animation method</li>
    <li><strong>Flipping</strong> — rapid frame preview</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"onion skin animation 2D frame TVPaint Toon Boom inbetween"</span>
    </div>
    <p class="arc-image-caption">Onion Skin — ghost frame visible, giúp animate frame-by-frame chính xác</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Onion Skin trong Software</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>TVPaint</summary>
      <div class="arc-card-body">
        <p>Industry standard cho 2D digital. Onion skin configurable — range 1-10 frame, color, opacity. Display options. Used by Disney TVPaint show, Cartoon Saloon.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Toon Boom Harmony</summary>
      <div class="arc-card-body">
        <p>Production-grade TV/film animation. Onion skin essential feature. Studio standard cho animated series (Bojack Horseman, Rick and Morty).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Procreate Dreams</summary>
      <div class="arc-card-body">
        <p>iPad animation app. Onion skin built-in, easy access. Accessible cho beginner mobile workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Adobe Animate (formerly Flash)</summary>
      <div class="arc-card-body">
        <p>Vector animation. Onion Skin Outlines mode cho clean view. Web animation legacy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Krita</summary>
      <div class="arc-card-body">
        <p>Free open-source paint/animation. Onion skin in Animation workspace. Capable cho indie animator.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>OpenToonz</summary>
      <div class="arc-card-body">
        <p>Free, used by Studio Ghibli. Open-source after Toonz commercial. Onion skin standard feature.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Procreate (Standard)</summary>
      <div class="arc-card-body">
        <p>Animation Assist mode in standard Procreate. Limited but functional. Onion skin available.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender Grease Pencil</summary>
      <div class="arc-card-body">
        <p>2D animation trong Blender với Grease Pencil. Onion skin built-in cho frame-by-frame.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Best Practice Onion Skin</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Configure Range</h3>
    <ul class="arc-list">
      <li>Default: 1-2 frames before/after</li>
      <li>Increase cho slow motion (more visible context)</li>
      <li>Decrease for fast motion (less clutter)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Color Code</h3>
    <ul class="arc-list">
      <li>Past = blue/cyan (cool color = retreat)</li>
      <li>Future = red/orange (warm = approach)</li>
      <li>Or follow software default — convention exists</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Opacity Setting</h3>
    <ul class="arc-list">
      <li>30-50% opacity for ghost</li>
      <li>Fade out further frame (frame -2 lighter than frame -1)</li>
      <li>Current frame 100%, ghost much lower</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Flipping Workflow</h3>
    <ul class="arc-list">
      <li>Onion skin static reference</li>
      <li>Flipping = rapid playback adjacent frame</li>
      <li>Combine both cho complete motion check</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Toggle Off Sometimes</h3>
    <ul class="arc-list">
      <li>Onion skin can clutter view</li>
      <li>Toggle off for clean drawing</li>
      <li>Toggle on for reference check</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Use Cases &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Frame-by-Frame</strong> — primary use, vẽ từng frame riêng</li>
    <li><strong>Inbetween</strong> — vẽ frame between key pose</li>
    <li><strong>Cleanup</strong> — trace rough drawing</li>
    <li><strong>Motion Arc</strong> — verify arc smooth qua nhiều frame</li>
    <li><strong>Timing Adjustment</strong> — adjust frame interval cho good rhythm</li>
    <li><strong>Tip</strong>: tradition flipbook still teach cách work với adjacent frame</li>
    <li><strong>Tip</strong>: don&apos;t over-rely — sometimes draw without ghost cho original take</li>
    <li><strong>Tip</strong>: combine với reference video — record own action, trace</li>
    <li><strong>Tip</strong>: Wacom Cintiq cho most natural drawing experience</li>
    <li><strong>Career</strong>: 2D animator demand still strong — Cartoon Saloon, Cuphead Studio, Riot Animation, etc.</li>
  </ul>
</section>
`,
  },

  // 09. Opacity
  {
    id: "8aa516d7-3f06-44f5-8e4e-666c8a7f3407",
    tieu_de: "Opacity",
    tieu_de_viet: "Độ đục/trong suốt (Opacity)",
    tom_tat:
      "Opacity là mức độ trong suốt của layer, object, brush — từ 0% (hoàn toàn trong suốt) đến 100% (hoàn toàn đục) — công cụ cơ bản nhất trong thiết kế đồ họa.",
    meta_title: "Opacity là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Opacity điều khiển transparency. Tìm hiểu opacity vs fill, alpha channel và ứng dụng trong Photoshop, After Effects.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn paint trên Photoshop với brush — opacity 100% = solid color, 50% = semi-transparent (build up khi paint nhiều layer), 10% = very subtle (good cho shading). Hoặc layer thumbnail trong AE — opacity 50% giúp blend với layer below. <strong>Opacity</strong> là control cơ bản nhất trong digital design — appears trong mọi software, every workflow.</p>
  <p>Opacity là kiến thức foundational cho mọi digital artist — graphic designer, photographer, illustrator, motion designer. Mặc dù seemingly simple, mastery opacity techniques (alpha, fill vs opacity, blend mode interaction) phân biệt amateur và pro work.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Opacity là gì?</h2>
  <p>Opacity là <strong>mức độ trong suốt</strong> của element trong digital software — đo từ <strong>0% (hoàn toàn trong suốt, invisible)</strong> đến <strong>100% (hoàn toàn đục, fully visible)</strong>. Apply to: layer, object, brush stroke, fill, effect. Khi opacity &lt; 100%, element blend with layers below — see-through effect.</p>
  <p>Different contexts: <strong>Layer Opacity</strong> (whole layer transparency), <strong>Brush Opacity</strong> (per stroke), <strong>Fill</strong> (layer content opacity but not effect), <strong>Alpha Channel</strong> (per-pixel transparency data). Master combination of these allows complex compositing và creative effect.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Opacity vs Fill (Photoshop)</span>
    <p><strong>Opacity</strong>: affects everything — pixel + layer styles (drop shadow, glow). <strong>Fill</strong>: affects only pixel content, layer style remains 100%. Use case: shadow at 100% but text 0% opacity = floating shadow effect. Subtle distinction crucial cho pro work.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Layer Opacity</strong> — entire layer transparency</li>
    <li><strong>Fill Opacity</strong> — pixel only (Photoshop specific)</li>
    <li><strong>Brush Opacity</strong> — per-stroke</li>
    <li><strong>Alpha Channel</strong> — per-pixel transparency data</li>
    <li><strong>Transparency</strong> — alternative term, same meaning</li>
    <li><strong>Blend Mode Interaction</strong> — opacity + blend = complex result</li>
    <li><strong>RGBA</strong> — Red, Green, Blue, Alpha channel</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"opacity transparency layer photoshop design digital art"</span>
    </div>
    <p class="arc-image-caption">Opacity — 0-100% transparency control, fundamental digital design</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Use Cases Opacity</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Layer Blending</summary>
      <div class="arc-card-body">
        <p>Reduce opacity to blend layer with underlying. Subtle texture overlay (50%), color cast (30%), faded element (70%). Primary use case.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Brush Painting Buildup</summary>
      <div class="arc-card-body">
        <p>Brush 30% opacity — paint nhiều stroke trên same area, color build up gradually. Smooth transition for shading, glazing. Foundation digital painting.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fade In / Fade Out</summary>
      <div class="arc-card-body">
        <p>Animation: opacity 0 → 100 over time = fade in. 100 → 0 = fade out. Most common animation effect.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Watermark</summary>
      <div class="arc-card-body">
        <p>Logo at 20-30% opacity over image = subtle watermark. Visible but not distracting.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ghosting / Translucent</summary>
      <div class="arc-card-body">
        <p>Spirit/ghost character = low opacity. UI tooltip = semi-transparent panel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Layer Mask + Opacity</summary>
      <div class="arc-card-body">
        <p>Combine cho gradient transparency — mask black-to-white + opacity 100% = smooth fade. Powerful cho composite.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UI Design</summary>
      <div class="arc-card-body">
        <p>Disabled button = 50% opacity. Hover effect = 80% opacity. Loading state = 30%. Communicate state via opacity.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Opacity trong Different Software</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photoshop</h3>
    <ul class="arc-list">
      <li>Layers panel — Opacity slider (top right)</li>
      <li>Fill slider (separate from Opacity)</li>
      <li>Brush opacity (Options bar)</li>
      <li>Layer mask + Opacity for gradient fade</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">After Effects</h3>
    <ul class="arc-list">
      <li>Layer Properties → Opacity (T shortcut)</li>
      <li>Animate cho fade effect</li>
      <li>Stack with blend mode</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Illustrator</h3>
    <ul class="arc-list">
      <li>Transparency panel — Opacity</li>
      <li>Object-level transparency</li>
      <li>Opacity Mask cho complex transparency</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Procreate</h3>
    <ul class="arc-list">
      <li>Layer thumbnail tap → opacity slider</li>
      <li>Brush opacity (sidebar)</li>
      <li>Quick toggle via finger gesture</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Figma / Web (CSS)</h3>
    <ul class="arc-list">
      <li>opacity: 0 to 1 (CSS, decimal)</li>
      <li>rgba() color với alpha channel</li>
      <li>backdrop-filter for glass effect</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D Software</h3>
    <ul class="arc-list">
      <li>Material Opacity (Maya, Blender)</li>
      <li>Alpha channel of texture</li>
      <li>Transparency settings (Render → Settings)</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Best Practices</h2>
  <ul class="arc-list">
    <li><strong>Don&apos;t default 100%</strong> — subtle transparency often better</li>
    <li><strong>Layer opacity vs Effect opacity</strong> — Photoshop Fill respects this</li>
    <li><strong>Brush low opacity 20-40%</strong> for shading buildup natural</li>
    <li><strong>Stack subtle</strong> — multiple 20% layer better than single 100%</li>
    <li><strong>Watch performance</strong> — many semi-transparent layer slow GPU rendering</li>
    <li><strong>Combine với blend mode</strong> — opacity × blend mode = vast creative range</li>
    <li><strong>Alpha channel</strong> — for per-pixel transparency (PNG)</li>
    <li><strong>Premultiplied vs Straight Alpha</strong> — VFX issue, understand the difference</li>
    <li><strong>Number key shortcuts</strong> — Photoshop press &quot;5&quot; = 50% opacity brush, fast workflow</li>
    <li><strong>Modern design trend</strong> — Glassmorphism heavy use semi-transparent with blur</li>
  </ul>
</section>
`,
  },

  // 10. Opener (Grain Overlay)
  {
    id: "d1d7fe0e-5025-4ce7-9ded-914805835a87",
    tieu_de: "Grain Overlay",
    tieu_de_viet: "Lớp phủ hạt nhiễu (Grain Overlay)",
    tom_tat:
      "Grain Overlay là lớp hạt nhiễu (film grain) chồng lên footage hoặc hình ảnh để tạo cảm giác phim analog, ấm áp, vintage — phổ biến trong color grading và thiết kế đồ họa hiện đại.",
    meta_title:
      "Grain Overlay là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Grain Overlay tạo cảm giác film. Tìm hiểu cách add film grain trong After Effects, Resolve và best practice cho cinematic look.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem A24 movie (Hereditary, Moonlight) — image có subtle texture, organic, &quot;film feel&quot;. Hoặc fashion video — Dior, Saint Laurent commercial — analog grain warmth. Modern digital camera quay clean — too clean. Add <strong>grain overlay</strong> in post → instant cinematic, organic, &quot;shot on film&quot; feel. Subtle effect, huge impact cho production value.</p>
  <p>Grain Overlay là kỹ thuật essential cho video editor, colorist, motion designer modern. Cinematic, vintage, fashion content all benefit. Hiểu cách add grain subtle, choose right grain type, và avoid pitfall giúp output professional film-like quality.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Grain Overlay là gì?</h2>
  <p>Grain Overlay là <strong>lớp hạt nhiễu (film grain pattern)</strong> được composite lên footage/image — replicate look của analog film stock. Real film có grain do <strong>silver halide crystal</strong> trong emulsion. Each frame slightly different grain pattern → organic texture. Digital camera clean — no grain. Editors add grain artificially trong post để gain that analog warmth.</p>
  <p>Sources of grain overlay: <strong>Stock footage</strong> (real film grain scanned), <strong>Plugin generated</strong> (Magic Bullet, FilmConvert), <strong>Procedural</strong> (DaVinci Resolve grain), <strong>Custom shot</strong> (record real grain on overexposed black film). Stock footage scanned chuẩn for authenticity.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Real Grain vs Digital Noise</span>
    <p><strong>Film Grain</strong>: organic, pleasing, varies per frame — looks aesthetic. <strong>Digital Noise</strong>: from high ISO, blocky, ugly chroma noise. Goal of grain overlay = add desirable film grain to clean digital footage. Different from accidental digital noise we try to reduce.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Film Stock</strong> — 16mm, 35mm, 65mm grain</li>
    <li><strong>Grain Size</strong> — larger 16mm, finer 35mm</li>
    <li><strong>Grain Intensity</strong> — subtle vs heavy</li>
    <li><strong>Overlay Blend Mode</strong> — Overlay, Soft Light typical</li>
    <li><strong>Stock Footage</strong> — real scanned grain</li>
    <li><strong>Magic Bullet, FilmConvert</strong> — plugin generators</li>
    <li><strong>Temporal Variation</strong> — grain change per frame</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"film grain overlay cinematic analog vintage 16mm 35mm"</span>
    </div>
    <p class="arc-image-caption">Grain Overlay — film texture lên digital footage, cinematic vibe</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Sources Grain</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Stock Footage Grain</summary>
      <div class="arc-card-body">
        <p>Real film grain scanned to digital. RocketStock, VashiVisuals, Cinegrain provide 4K. 16mm, 35mm, 65mm variants. $30-100/pack. Authentic feel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Magic Bullet (Red Giant)</summary>
      <div class="arc-card-body">
        <p>Plugin cho AE, Premiere. Realistic grain emulation algorithm. Combine với color grading suite. $$$ but high quality.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>FilmConvert</summary>
      <div class="arc-card-body">
        <p>Specialized cho film emulation. Recreate look của specific film stock (Kodak, Fuji) including grain. Plugin AE, Premiere, Resolve.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DaVinci Resolve Built-in</summary>
      <div class="arc-card-body">
        <p>Free tier grain effect available. Studio version more option. Procedural — generate grain algorithmically.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>After Effects Add Grain</summary>
      <div class="arc-card-body">
        <p>Built-in plugin. Procedural grain generation. Match Grain feature to match source clip. Slow render but capable.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>FCP X Film Grain</summary>
      <div class="arc-card-body">
        <p>Built-in effect. Quick application. Limited customization.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dehancer</summary>
      <div class="arc-card-body">
        <p>Specialized film emulation. Premium quality.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Apply Grain</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Choose Right Grain</h3>
    <ul class="arc-list">
      <li>16mm = larger grain, vintage feel</li>
      <li>35mm = finer grain, cinema standard</li>
      <li>65mm = very fine, IMAX</li>
      <li>Match grain size to story tone</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Import Grain Footage</h3>
    <ul class="arc-list">
      <li>Stock grain or plugin</li>
      <li>Place above footage layer</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Blend Mode = Overlay</h3>
    <ul class="arc-list">
      <li>Overlay blend mode standard</li>
      <li>Alternative: Soft Light cho more subtle</li>
      <li>Test which look best</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Adjust Opacity</h3>
    <ul class="arc-list">
      <li>20-50% typical for subtle</li>
      <li>Lower (10-20%) for very subtle</li>
      <li>Higher (60-80%) for heavy stylized look</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Match Grain Size to Resolution</h3>
    <ul class="arc-list">
      <li>4K footage with 4K grain — natural size</li>
      <li>4K footage with HD grain stretched — grain larger</li>
      <li>Consider final output resolution</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Loop / Trim</h3>
    <ul class="arc-list">
      <li>Loop grain footage for entire timeline</li>
      <li>Stock grain typically 10-60s loops</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Apply Globally</h3>
    <ul class="arc-list">
      <li>Adjustment layer above all</li>
      <li>Consistent grain across whole project</li>
      <li>Single point cho adjustment</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Best Practices &amp; Common Mistakes</h2>
  <ul class="arc-list">
    <li><strong>Subtle is better</strong> — heavy grain looks fake, distracting</li>
    <li><strong>Apply AFTER color grading</strong> — grain stays on top of grade</li>
    <li><strong>Avoid static grain</strong> — must change per frame for authenticity</li>
    <li><strong>Match grain size to project</strong> — micro grain on indie hipster film looks off</li>
    <li><strong>Quality grain source</strong> — cheap loop visible pattern repetition</li>
    <li><strong>Don&apos;t use on every project</strong> — sometimes clean digital is appropriate</li>
    <li><strong>Pair với color grade</strong> — film emulation = grain + film color curve together</li>
    <li><strong>Subtle on text</strong> — heavy grain make text unreadable</li>
    <li><strong>Render expensive</strong> — grain affects compression, plan output</li>
    <li><strong>Tip</strong>: Watch reference film carefully — grain quality differ Hereditary vs Saving Private Ryan</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 2 · Batch 6 — chạy ${items.length} bài keyword (I → P) ──\n`,
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
