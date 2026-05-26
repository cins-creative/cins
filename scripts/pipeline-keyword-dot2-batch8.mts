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
  // 01. Particle System
  {
    id: "9adebc7b-d60b-4d7c-affc-86e143dfbe64",
    tieu_de: "Particle System",
    tieu_de_viet: "Hệ thống Particle (Particle System)",
    tom_tat:
      "Particle System là hệ thống tạo hiệu ứng của vô số vật thể nhỏ (hạt) như khói, lửa, nước, tuyết, bụi — foundation cho VFX game, motion graphics, real-time visual.",
    meta_title:
      "Particle System là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Particle System trong game engine, VFX. Tìm hiểu emitter, lifetime, force và workflow Unity, Unreal, Houdini.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn play game God of War — Kratos cast magic, particle xung quanh hand glow. Walking on snow — footstep kick up particle snow. Combat impact spark fly. Trong realtime game, mỗi effect đều là <strong>Particle System</strong> — hệ thống simulate vô số particle theo rule. Trong Unity, Unreal, Houdini, ngay cả AE — particle system là tool nền tảng.</p>
  <p>Particle System là kỹ thuật quan trọng cho game artist, VFX artist, motion designer. Hiểu cấu trúc, parameter, và best practice giúp create effect performant, visually impressive — phù hợp realtime constraint hoặc film-quality offline render.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Particle System là gì?</h2>
  <p>Particle System là <strong>framework software</strong> để spawn, simulate và render vô số <strong>particle</strong> (small element). Core components: <strong>Emitter</strong> (where particle spawn), <strong>Birth Rate</strong> (how many per second), <strong>Lifetime</strong> (how long), <strong>Initial Velocity</strong>, <strong>Forces</strong> (gravity, wind, turbulence), <strong>Render</strong> (sprite, mesh, ribbon). Configure các parameter này tạo wide variety of effect — from gentle dust to violent explosion.</p>
  <p>Particle system existed since 1980s VFX (Genesis effect Star Trek). Modern game engine particle system real-time, optimized GPU. Film VFX particle system in Houdini, Maya — millions of particle, volumetric. Use cases: weather, magic, fire, smoke, water, hair, foliage, debris.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Particle System Components</span>
    <p><strong>1. Emitter</strong>: source location, shape, direction. <strong>2. Lifetime</strong>: duration each particle exist. <strong>3. Modules</strong>: behavior over time (color change, size scale). <strong>4. Forces</strong>: gravity, wind. <strong>5. Collision</strong>: react với mesh. <strong>6. Render</strong>: visual style. Combine modules → endless effect.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Emitter</strong> — spawn source</li>
    <li><strong>Module</strong> — behavior block</li>
    <li><strong>Force</strong> — gravity, wind, vortex</li>
    <li><strong>GPU Particle</strong> — fast realtime</li>
    <li><strong>CPU Particle</strong> — flexible, slower</li>
    <li><strong>Mesh Particle</strong> — 3D mesh per particle</li>
    <li><strong>Sprite Particle</strong> — 2D billboard</li>
    <li><strong>Ribbon / Trail</strong> — line connect particle</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"particle system unity unreal niagara game effect VFX"</span>
    </div>
    <p class="arc-image-caption">Particle System — framework simulate vô số particle, foundation VFX</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Particle System Per Software</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Unreal Engine — Niagara</summary>
      <div class="arc-card-body">
        <p>Modern node-based particle system (replaced Cascade). Powerful, GPU-driven. Used cho AAA game effect Fortnite, Gears, etc. Steep learning curve, capable.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unity — VFX Graph &amp; Particle System</summary>
      <div class="arc-card-body">
        <p>Built-in Particle System CPU-based. VFX Graph (HDRP/URP) — GPU node-based modern. Both productive. Indie / mid-size game popular.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Houdini — POP</summary>
      <div class="arc-card-body">
        <p>POP (Particles Operators) — film-quality particle. Millions of particle, volumetric. Used VFX studio cho film Marvel, Avatar.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>After Effects — Trapcode Particular</summary>
      <div class="arc-card-body">
        <p>Industry standard motion graphics particle plugin. Red Giant suite. Easy to use, beautiful result. Subscription / one-time license.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cinema 4D — X-Particles</summary>
      <div class="arc-card-body">
        <p>INSYDIUM plugin. Advanced particle system với fluid, physics. Motion graphics studio popular.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3ds Max — Particle Flow / TyFlow</summary>
      <div class="arc-card-body">
        <p>Particle Flow built-in. TyFlow plugin advanced, free for indie. Powerful destruction simulation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender — Particle System</summary>
      <div class="arc-card-body">
        <p>Built-in, decent. Hair/grass system. Modern Geometry Nodes extending particle capability.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Common Particle Effects</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Fire</h3>
    <ul class="arc-list">
      <li>Multiple layer: flame core + smoke + sparks + heat distortion</li>
      <li>Color gradient orange → red → black smoke</li>
      <li>Upward velocity với turbulence</li>
      <li>Decreasing size over lifetime</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Smoke</h3>
    <ul class="arc-list">
      <li>Soft sprite, large scale</li>
      <li>Slow upward drift</li>
      <li>Fade out over lifetime</li>
      <li>Turbulent motion</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Magic / Spell</h3>
    <ul class="arc-list">
      <li>Glowing sprite</li>
      <li>Spiral / orbital motion</li>
      <li>Color shift over lifetime</li>
      <li>Trail behind</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Rain</h3>
    <ul class="arc-list">
      <li>Long thin sprite</li>
      <li>Downward velocity</li>
      <li>Collision với ground → splash</li>
      <li>Sound-reactive</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Sparks / Debris</h3>
    <ul class="arc-list">
      <li>Burst emission</li>
      <li>Initial high velocity</li>
      <li>Gravity affect</li>
      <li>Random direction</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Snow</h3>
    <ul class="arc-list">
      <li>White soft sprite</li>
      <li>Slow downward + gentle horizontal drift</li>
      <li>Spawn from large area above scene</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Performance &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Realtime budget</strong> — game 1000-10000 particle typical, mobile less</li>
    <li><strong>GPU particle</strong> faster than CPU but less flexible</li>
    <li><strong>LOD particle</strong> — reduce count at distance</li>
    <li><strong>Sprite atlas</strong> — combine multiple texture cho efficiency</li>
    <li><strong>Curve everything</strong> — size, color over lifetime curve = natural</li>
    <li><strong>Stack systems</strong> — fire = 4 layered particle system</li>
    <li><strong>Reference real</strong> — observe smoke, fire patterns</li>
    <li><strong>Iterate</strong> — particle system iterative tuning</li>
    <li><strong>Career game VFX artist</strong> — $60K-130K</li>
    <li><strong>Learn Niagara</strong> for AAA game career, Houdini for film VFX</li>
  </ul>
</section>
`,
  },

  // 02. Particle.JS
  {
    id: "98668681-cb0a-4363-9336-880d65fb3fe1",
    tieu_de: "Particle.JS",
    tieu_de_viet: "Thư viện Particle.JS",
    tom_tat:
      "Particle.JS là thư viện JavaScript tạo hiệu ứng hạt tương tác trên web — các điểm nhỏ chuyển động và kết nối — phổ biến trong website creative và landing page.",
    meta_title: "Particle.JS là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Particle.JS web library. Tìm hiểu cách integrate, customize và alternative library tsParticles cho website creative.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn visit creative agency website, freelancer portfolio — thấy background với floating dot, connect by line khi gần nhau, react mouse cursor. Đó là <strong>Particle.JS</strong> (hoặc successor tsParticles) — JavaScript library tạo interactive particle effect trên web. Lightweight, configurable, free. Phổ biến cho landing page, hero section creative.</p>
  <p>Particle.JS / tsParticles là tool đơn giản nhưng impactful cho web developer, designer. Hiểu cách integrate, customize, và performance consideration giúp tạo visual interest cho website mà không tốn bandwidth lớn — distinct phong cách hơn static design.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Particle.JS là gì?</h2>
  <p>Particle.JS là <strong>JavaScript library</strong> tạo particle effect trên HTML5 canvas. Created by Vincent Garreau, open-source. Render particle (dot, polygon, image) trên canvas, interactive với mouse (hover, click), connect particle by line. Lightweight (~30KB), no dependency. Integrate qua script tag hoặc npm.</p>
  <p>Original Particle.JS không actively maintained — modern alternative <strong>tsParticles</strong> (TypeScript port với enhanced feature) recommended. tsParticles có React, Vue, Angular wrapper. More configuration option, better performance. Particle.JS ecosystem syntax compatible.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Particle.JS vs tsParticles vs Three.js</span>
    <p><strong>Particle.JS</strong>: simple 2D canvas particle. Easy. <strong>tsParticles</strong>: modern fork, more feature. Recommended. <strong>Three.js</strong>: 3D WebGL particle. Heavier, more capable. Choose based on need — quick decorative use tsParticles, complex 3D use Three.js.</p>
  </div>

  <ul class="arc-list">
    <li><strong>HTML5 Canvas</strong> — render target</li>
    <li><strong>Configuration JSON</strong> — define behavior</li>
    <li><strong>Mouse Interaction</strong> — hover, click, attract</li>
    <li><strong>Particle Number</strong> — count on screen</li>
    <li><strong>Color / Shape</strong> — visual style</li>
    <li><strong>Lines Linked</strong> — connect particle by line</li>
    <li><strong>Move Speed</strong> — animation speed</li>
    <li><strong>Responsive</strong> — adjust mobile/desktop</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"particle js web background interactive dots lines canvas"</span>
    </div>
    <p class="arc-image-caption">Particle.JS — interactive particle background cho website</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Setup &amp; Integration</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>CDN (Script Tag)</summary>
      <div class="arc-card-body">
        <p>Simplest. Add &lt;script src=&quot;https://cdn.jsdelivr.net/npm/tsparticles&quot;&gt;&lt;/script&gt;. Add &lt;div id=&quot;tsparticles&quot;&gt;&lt;/div&gt;. Call tsParticles.load(&apos;tsparticles&apos;, config).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>NPM Install</summary>
      <div class="arc-card-body">
        <p>npm install tsparticles. Import in JavaScript. Build với webpack/vite/parcel. Standard modern web workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>React Integration</summary>
      <div class="arc-card-body">
        <p>npm install react-tsparticles. Component &lt;Particles /&gt; với options prop. Easy React integration.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Vue Integration</summary>
      <div class="arc-card-body">
        <p>npm install vue3-particles. Component &lt;Particles /&gt; trong Vue 3. Similar React pattern.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Angular Integration</summary>
      <div class="arc-card-body">
        <p>npm install ng-particles. Module-based Angular integration.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>WordPress Plugin</summary>
      <div class="arc-card-body">
        <p>Particles JS Backgrounds plugin. No coding required.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Configuration Examples</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Classic Networked Dots</h3>
    <ul class="arc-list">
      <li>50-100 particle</li>
      <li>White color, small size</li>
      <li>Lines linked: enable, distance 150px</li>
      <li>Move slow, random direction</li>
      <li>Mouse hover repulse</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Snow Effect</h3>
    <ul class="arc-list">
      <li>White particle</li>
      <li>Larger size 3-5px</li>
      <li>Downward motion với drift</li>
      <li>No lines linked</li>
      <li>Many particle 200+</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Bubbles</h3>
    <ul class="arc-list">
      <li>Circle particle</li>
      <li>Mouse hover bubble: enlarge</li>
      <li>Upward motion</li>
      <li>Color gradient</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Star Field</h3>
    <ul class="arc-list">
      <li>White small particle</li>
      <li>Random twinkle (opacity animate)</li>
      <li>No movement</li>
      <li>Nebula effect possible</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Connecting Network</h3>
    <ul class="arc-list">
      <li>Tech / business website classic</li>
      <li>Lines link at distance</li>
      <li>Brand color</li>
      <li>Subtle motion</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Polygon Logo Reveal</h3>
    <ul class="arc-list">
      <li>Particle form into logo shape</li>
      <li>Advanced configuration</li>
      <li>Eye-catching loading screen</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Performance &amp; Best Practices</h2>
  <ul class="arc-list">
    <li><strong>Particle count</strong> — 50-100 optimal, 500+ slows down</li>
    <li><strong>Lines linked expensive</strong> — distance calculation per pair</li>
    <li><strong>Mobile optimize</strong> — reduce count for small screen</li>
    <li><strong>Avoid layered systems</strong> — multiple instance heavy</li>
    <li><strong>Hide on low-end device</strong> — feature detection / prefers-reduced-motion</li>
    <li><strong>Accessibility</strong> — respect prefers-reduced-motion media query</li>
    <li><strong>Don&apos;t obscure content</strong> — background, low opacity</li>
    <li><strong>Test mobile</strong> — battery impact</li>
    <li><strong>tsParticles documentation</strong>: extensive examples on official site</li>
    <li><strong>Trend caution</strong> — particle background everywhere = cliché. Use thoughtfully cho creative impact</li>
  </ul>
</section>
`,
  },

  // 03. Pathfinding
  {
    id: "17db8c9a-402f-4e34-bed7-a71535852249",
    tieu_de: "Pathfinding",
    tieu_de_viet: "Thuật toán Pathfinding",
    tom_tat:
      "Pathfinding là thuật toán tìm đường đi ngắn nhất hoặc hiệu quả nhất giữa hai điểm — foundation AI game cho nhân vật, NPC, enemy navigation trong môi trường game.",
    meta_title: "Pathfinding là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Pathfinding A* trong game AI. Tìm hiểu navmesh, A* algorithm, Unity NavMesh và Unreal Navigation cho NPC navigation.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn play RTS game StarCraft — 50 unit move from point A to B, đi avoid obstacle, không bunch up. RPG NPC follow player smart, không stuck wall. FPS enemy flank, hide behind cover. Đó là <strong>Pathfinding</strong> — thuật toán cốt lõi cho AI navigation trong game. Khoảng kỹ thuật critical mà mọi game developer phải hiểu.</p>
  <p>Pathfinding là kiến thức essential cho game developer, AI programmer. Hiểu algorithm (A*, Dijkstra, NavMesh), implementation game engine giúp create AI navigation believable, performant. Critical cho RTS, RPG, FPS, mọi game có AI character.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Pathfinding là gì?</h2>
  <p>Pathfinding là <strong>computer science algorithm</strong> tìm path tối ưu (shortest, fastest, safest) giữa start point và goal trong environment có obstacle. Core challenge: huge search space (entire map), need efficient algorithm. Classical algorithm: <strong>Dijkstra</strong> (shortest path, exhaustive), <strong>A* (A-star)</strong> (heuristic-guided, efficient), <strong>Hierarchical Pathfinding</strong> (multi-level cho large map), <strong>Flow Field</strong> (cho large unit count RTS).</p>
  <p>Game-specific representation: <strong>Grid</strong> (2D tile), <strong>Waypoint Graph</strong> (manual node), <strong>NavMesh</strong> (auto-generated walkable surface). Modern game engine (Unity, Unreal) provide built-in pathfinding via NavMesh. Custom implementation cho special game (RTS flow field, MMO hierarchical).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">A* Algorithm</span>
    <p>A* (A-star) most popular pathfinding algorithm. Combines Dijkstra (guarantee shortest) với heuristic (estimate distance to goal). Score f(n) = g(n) + h(n) where g = cost from start, h = heuristic to goal. Efficient and optimal khi heuristic admissible (never overestimate). Standard cho game industry.</p>
  </div>

  <ul class="arc-list">
    <li><strong>A* Algorithm</strong> — most common</li>
    <li><strong>Dijkstra</strong> — shortest path</li>
    <li><strong>NavMesh</strong> — walkable surface</li>
    <li><strong>Grid-based</strong> — tile map</li>
    <li><strong>Waypoint</strong> — manual node</li>
    <li><strong>Heuristic</strong> — distance estimate</li>
    <li><strong>Open / Closed List</strong> — A* data structure</li>
    <li><strong>Flow Field</strong> — RTS many-unit pathfinding</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"pathfinding A star algorithm game AI navmesh navigation"</span>
    </div>
    <p class="arc-image-caption">Pathfinding — algorithm foundation AI navigation trong game</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Algorithm Pathfinding</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>A* (A-star)</summary>
      <div class="arc-card-body">
        <p>Most widely used. Heuristic-guided search. Optimal và efficient. Manhattan distance heuristic cho grid, Euclidean cho free space. Industry standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dijkstra</summary>
      <div class="arc-card-body">
        <p>Guarantees shortest path. Slower than A* — no heuristic. Useful when multiple goal possible (find nearest of any goal). Foundation A* built on.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>BFS (Breadth-First Search)</summary>
      <div class="arc-card-body">
        <p>Simple, finds shortest path on unweighted graph. Used when all move equal cost. Less complex than A*.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Jump Point Search (JPS)</summary>
      <div class="arc-card-body">
        <p>Optimization for grid-based pathfinding. Skip redundant node, faster than A* on uniform grid. Used trong RTS.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hierarchical Pathfinding (HPA*)</summary>
      <div class="arc-card-body">
        <p>Multi-level — divide map vào cluster, find high-level path, then low-level within cluster. Critical cho huge map MMO.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Flow Field</summary>
      <div class="arc-card-body">
        <p>Vector field point toward goal. Each unit follow field. Efficient cho many unit toward same goal (RTS, Total War battle).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>RVO / Boids</summary>
      <div class="arc-card-body">
        <p>Reciprocal Velocity Obstacle. Unit avoid each other smoothly. Combine với A* cho realistic crowd.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Implementation Game Engine</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unity — NavMesh</h3>
    <ul class="arc-list">
      <li>Bake NavMesh from scene geometry</li>
      <li>NavMeshAgent component on NPC</li>
      <li>agent.SetDestination(target) one-liner</li>
      <li>Built-in A* internally</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unreal Engine — Navigation</h3>
    <ul class="arc-list">
      <li>Nav Mesh Bounds Volume covers area</li>
      <li>Recast Navigation built-in</li>
      <li>AI Move To node</li>
      <li>BehaviorTree integration</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Custom Grid A*</h3>
    <ul class="arc-list">
      <li>Tile-based game (turn-based, roguelike)</li>
      <li>2D array of walkable bool</li>
      <li>Implement A* manually</li>
      <li>Full control</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">A* Pathfinding Project (Unity Asset)</h3>
    <ul class="arc-list">
      <li>Aron Granberg&apos;s pro asset</li>
      <li>Advanced features — local avoidance, hierarchical</li>
      <li>Better than built-in NavMesh cho complex case</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Godot — Navigation</h3>
    <ul class="arc-list">
      <li>Navigation server</li>
      <li>NavigationAgent2D/3D</li>
      <li>Set target_position</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">RTS Flow Field</h3>
    <ul class="arc-list">
      <li>Custom implementation</li>
      <li>Calculate field once, reuse for all unit</li>
      <li>Efficient cho 100+ unit</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Pathfinding</h2>
  <ul class="arc-list">
    <li><strong>Hierarchical for large map</strong> — A* slow on huge grid</li>
    <li><strong>Smooth path</strong> — raw A* path zigzag, post-process smooth</li>
    <li><strong>Cache path</strong> — repeated request same start/goal, cache</li>
    <li><strong>Dynamic obstacle</strong> — moving NPC challenge — re-path periodically</li>
    <li><strong>Local avoidance</strong> — combine A* với RVO for unit-unit avoidance</li>
    <li><strong>Cost weighting</strong> — make path prefer road, avoid mud</li>
    <li><strong>Update cost</strong> — react to fire, danger zone</li>
    <li><strong>Async pathfinding</strong> — heavy computation, run on coroutine/thread</li>
    <li><strong>Debug visualization</strong> — draw path in editor</li>
    <li><strong>Game AI Pro books</strong> — industry pathfinding deep dive</li>
  </ul>
</section>
`,
  },

  // 04. Pattern
  {
    id: "9b16e6ae-ce70-432b-b8b6-323cfa7c3ef1",
    tieu_de: "Pattern (Design)",
    tieu_de_viet: "Họa tiết / Mẫu lặp (Pattern)",
    tom_tat:
      "Pattern là mẫu họa tiết lặp lại — hình dạng, màu sắc, đường nét — được sử dụng trong thiết kế đồ họa, thời trang, nội thất để tạo sự đồng nhất và tính thẩm mỹ.",
    meta_title: "Pattern là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Pattern thiết kế. Tìm hiểu các loại pattern, seamless tile workflow, tools Illustrator, Photoshop và ứng dụng đa ngành.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nhìn wallpaper, gift wrap, fabric — repeating element tạo continuous design. Coca-Cola red với swirling pattern. Marimekko fashion với bold floral. Web design hero section với subtle geometric pattern. <strong>Pattern</strong> ở khắp mọi nơi — foundation visual design across mọi industry.</p>
  <p>Pattern là kỹ năng essential cho graphic designer, fashion designer, interior designer, surface designer. Hiểu pattern theory, tile workflow, software giúp tạo pattern professional — license cho fabric, gift wrap, packaging hoặc apply trong brand design.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Pattern là gì?</h2>
  <p>Pattern là <strong>repeating arrangement</strong> của visual element (shape, line, color, motif) tạo continuous design across surface. Pattern có rule of repetition — element repeat in regular interval. <strong>Tileable / Seamless Pattern</strong> repeat edges align — important cho fabric, wallpaper. <strong>Random / Organic Pattern</strong> appears irregular but unified.</p>
  <p>Pattern across multi-industry: <strong>Textile / Fashion</strong> (fabric print), <strong>Surface Design</strong> (wallpaper, gift wrap), <strong>Graphic Design</strong> (background, decorative element), <strong>Architecture</strong> (tile, screen), <strong>Web Design</strong> (background texture). Strong pattern can be brand signature (Burberry check, Louis Vuitton monogram).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Pattern Types</span>
    <p><strong>Geometric</strong>: shape-based (stripe, circle, polygon). <strong>Organic</strong>: nature-inspired (floral, leaf). <strong>Abstract</strong>: non-representational. <strong>Pictorial</strong>: object imagery (skull, animal). <strong>Texture</strong>: subtle surface (paper, fabric). Each style different mood.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Motif</strong> — repeating element unit</li>
    <li><strong>Repeat Unit / Tile</strong> — base block</li>
    <li><strong>Seamless</strong> — edges align</li>
    <li><strong>Half-Drop</strong> — offset repeat</li>
    <li><strong>Mirror</strong> — symmetric repeat</li>
    <li><strong>Brick</strong> — staggered like masonry</li>
    <li><strong>Scale</strong> — size of motif</li>
    <li><strong>Color Way</strong> — color variation of same pattern</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"pattern design textile wallpaper repeating motif"</span>
    </div>
    <p class="arc-image-caption">Pattern — repeating element tạo continuous design</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Pattern Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Geometric Pattern</summary>
      <div class="arc-card-body">
        <p>Shape-based — stripe, polka dot, chevron, hexagon, plaid. Modern, structured feel. Easy to create. Industrial design popular.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Floral Pattern</summary>
      <div class="arc-card-body">
        <p>Flower, leaf motif. Classic fabric design. Wide range — small ditsy to large statement. Liberty of London famous floral.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Abstract Pattern</summary>
      <div class="arc-card-body">
        <p>Non-representational. Brush stroke, gradient, organic shape. Modern, artistic. Photoshop hand-painted.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animal Print</summary>
      <div class="arc-card-body">
        <p>Leopard, zebra, snake. Bold fashion statement. Glamorous, edgy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Plaid / Tartan</summary>
      <div class="arc-card-body">
        <p>Crisscross stripe. Scottish heritage. Burberry, Ralph Lauren signature.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Damask</summary>
      <div class="arc-card-body">
        <p>Ornate, symmetric motif. Wallpaper, formal fabric. Vintage elegance.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Toile</summary>
      <div class="arc-card-body">
        <p>Pastoral scene repeat. French heritage. Sophisticated interiors.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ikat / Tribal</summary>
      <div class="arc-card-body">
        <p>Cultural pattern — Indonesian ikat, African mudcloth. Rich heritage. Bohemian aesthetic.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Create Seamless Pattern Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Concept &amp; Sketch</h3>
    <ul class="arc-list">
      <li>Define motif idea</li>
      <li>Sketch traditional hoặc digital</li>
      <li>Plan scale, density, color</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Create Motif</h3>
    <ul class="arc-list">
      <li>Adobe Illustrator (vector) hoặc Photoshop (raster)</li>
      <li>Build individual motif element</li>
      <li>Keep on transparent BG</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Tile / Repeat Unit</h3>
    <ul class="arc-list">
      <li>Define square tile area</li>
      <li>Arrange motif trong tile</li>
      <li>Critical: edge content wraps</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Seamless Edge Trick</h3>
    <ul class="arc-list">
      <li>Photoshop: Filter → Offset half tile dimensions</li>
      <li>Reveal seam, paint over seam edge</li>
      <li>Repeat until invisible</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Test Repeat</h3>
    <ul class="arc-list">
      <li>Define pattern swatch</li>
      <li>Apply to large area</li>
      <li>Verify seam invisible</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Color Variations</h3>
    <ul class="arc-list">
      <li>Create alternative color ways</li>
      <li>Same pattern different palette</li>
      <li>Expand commercial value</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Output for Production</h3>
    <ul class="arc-list">
      <li>Fabric printing — CMYK or specific dye color</li>
      <li>Web — PNG/SVG seamless tile</li>
      <li>Print resolution 300 DPI</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; License Pattern</h2>
  <ul class="arc-list">
    <li><strong>Surface Designer</strong> — license pattern to brand, $500-5000 per pattern</li>
    <li><strong>Fabric Designer</strong> — Spoonflower marketplace, royalty</li>
    <li><strong>In-house Brand</strong>: Anthropologie, Madewell, IKEA hire pattern designer</li>
    <li><strong>Licensing</strong>: Pattern Bank, Patternbank, Society6, Redbubble</li>
    <li><strong>Tools</strong>: Illustrator (Pattern Tool), Photoshop, Procreate, Vectornator</li>
    <li><strong>Inspiration</strong>: vintage textile, nature, architecture</li>
    <li><strong>Collections</strong>: design 6-12 coordinating pattern = full collection valuable</li>
    <li><strong>Print on Demand</strong>: upload pattern, sell on product printed-on-demand</li>
    <li><strong>Education</strong>: surface design online course, Domestika, Skillshare</li>
    <li><strong>Trend research</strong>: Pinterest, WGSN trend report</li>
  </ul>
</section>
`,
  },

  // 05. PBR Material
  {
    id: "94e32d13-0a20-4c97-bfa8-974b9f1cba89",
    tieu_de: "PBR Material",
    tieu_de_viet: "Vật liệu PBR",
    tom_tat:
      "PBR Material là Physically Based Rendering material — vật liệu dựa trên vật lý thực tế với thuộc tính metallic, roughness, albedo — cho kết quả nhất quán dưới mọi điều kiện sáng.",
    meta_title: "PBR Material là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "PBR Material workflow. Tìm hiểu metallic-roughness, specular-glossiness, texture map và Substance, Quixel cho pipeline 3D.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn tạo metal sphere trong Blender — under harsh sunlight và soft cloudy day, sphere look believable both. Switch HDRI from outdoor đến indoor studio — material stay consistent, just lighting change. Đó là <strong>PBR Material</strong> — Physically Based Rendering — standard modern 3D từ Marvel film đến game AAA. Foundation realistic 3D.</p>
  <p>PBR là kiến thức essential cho 3D artist, game artist, archviz artist. Hiểu workflow (metallic-roughness, specular-glossiness), texture map, software (Substance Painter, Quixel) giúp tạo material realistic, consistent — phù hợp modern pipeline 3D.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>PBR Material là gì?</h2>
  <p>PBR (Physically Based Rendering) là <strong>standardized approach</strong> cho material và rendering dựa trên physics ánh sáng thực. Material define bằng physically meaningful parameter (metalness, roughness, albedo) thay vì arbitrary color/shininess slider. Result: material look consistent under different lighting condition — same metal sphere look right outdoor, indoor, dark scene.</p>
  <p>Two main workflow PBR: <strong>Metallic-Roughness</strong> (most common, Unreal, Unity, Substance) và <strong>Specular-Glossiness</strong> (older, less used now). Metallic-Roughness: <strong>Albedo</strong> (base color), <strong>Metallic</strong> (0 dielectric, 1 metal), <strong>Roughness</strong> (0 mirror, 1 matte), plus <strong>Normal</strong> (surface detail), <strong>AO</strong> (occlusion), <strong>Emissive</strong> (self-light).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Why PBR Standard?</span>
    <p>Pre-PBR: material tweak per lighting condition. Same material look weird in new scene. PBR: physics-based, look right anywhere. Reusable material library across project. Consistent quality. Disney/Pixar pioneered, gaming industry adopted en masse 2014+.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Albedo / Base Color</strong> — diffuse color</li>
    <li><strong>Metallic</strong> — metal or dielectric</li>
    <li><strong>Roughness</strong> — surface smoothness</li>
    <li><strong>Normal Map</strong> — surface detail</li>
    <li><strong>AO (Ambient Occlusion)</strong> — crevice shadow</li>
    <li><strong>Height / Displacement</strong> — 3D geometry detail</li>
    <li><strong>Emissive</strong> — self-illumination</li>
    <li><strong>Opacity</strong> — transparency</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"PBR material metallic roughness texture maps 3D substance"</span>
    </div>
    <p class="arc-image-caption">PBR Material — physics-based, consistent dưới mọi lighting</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>PBR Texture Maps</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Albedo / Base Color</summary>
      <div class="arc-card-body">
        <p>Pure surface color, no lighting/shadow baked in. RGB image. For metal: actual metal color (gold yellow, copper orange). For non-metal: diffuse color.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Metallic Map</summary>
      <div class="arc-card-body">
        <p>Grayscale. 0 = dielectric (wood, plastic, skin). 1 = metal. No values in-between typically — material either is metal or not. Mix only at boundary (paint chip showing metal underneath).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Roughness Map</summary>
      <div class="arc-card-body">
        <p>Grayscale. 0 = perfectly smooth (mirror). 1 = completely rough (chalk). Vary cho variation — same material can have smooth and rough section.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Normal Map</summary>
      <div class="arc-card-body">
        <p>RGB. Encode surface direction. Fake detail without geometry. Baked from high-poly model or generated from height map.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>AO (Ambient Occlusion)</summary>
      <div class="arc-card-body">
        <p>Grayscale. Pre-baked shadow trong crevice. Multiply với albedo. Increase depth.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Height / Displacement</summary>
      <div class="arc-card-body">
        <p>Grayscale. Actual geometry displacement. More accurate than normal map but expensive.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Emissive</summary>
      <div class="arc-card-body">
        <p>RGB. Self-illuminating. LED, neon, lava.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Opacity</summary>
      <div class="arc-card-body">
        <p>Grayscale. Transparency map. 0 transparent, 1 opaque. Used cho leaf cutout, glass.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>PBR Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. UV Unwrap</h3>
    <ul class="arc-list">
      <li>Mesh need clean UV cho PBR texture</li>
      <li>Avoid stretching</li>
      <li>Maximize UV space</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Texture Source</h3>
    <ul class="arc-list">
      <li><strong>Substance Painter</strong> — paint directly on 3D model</li>
      <li><strong>Quixel Mixer / Megascans</strong> — high-quality scanned PBR</li>
      <li><strong>Photogrammetry</strong> — capture real surface</li>
      <li><strong>Custom paint</strong> — hand-paint cho stylized</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Texture Per Map</h3>
    <ul class="arc-list">
      <li>Generate or paint albedo, metallic, roughness, normal, AO</li>
      <li>Substance Painter exports all map automatically</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Apply trong 3D Software</h3>
    <ul class="arc-list">
      <li>Blender Principled BSDF</li>
      <li>Maya aiStandardSurface (Arnold)</li>
      <li>Unreal Material Editor</li>
      <li>Unity Standard Shader</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. HDRI Lighting</h3>
    <ul class="arc-list">
      <li>PBR shines với realistic HDRI light</li>
      <li>Material respond accurately</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Render Test</h3>
    <ul class="arc-list">
      <li>Multiple lighting condition</li>
      <li>Material should look correct in all</li>
      <li>Calibrate albedo (not too bright, not too dark)</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips PBR</h2>
  <ul class="arc-list">
    <li><strong>Albedo brightness rule</strong> — no pure white (max ~240), no pure black (min ~30)</li>
    <li><strong>Metallic binary</strong> — material either metal or not. Mix at boundary only.</li>
    <li><strong>Roughness vary</strong> — uniform roughness boring. Vary subtly = realistic</li>
    <li><strong>Normal map intensity</strong> — too strong looks fake</li>
    <li><strong>Reference photo</strong> — match real material observation</li>
    <li><strong>Substance Painter</strong> standard tool cho game industry</li>
    <li><strong>Quixel Megascans free</strong> với Unreal — huge PBR library</li>
    <li><strong>Texturing.com</strong> — free PBR textures</li>
    <li><strong>Polyhaven</strong> — free CC0 PBR resources</li>
    <li><strong>Career texture artist</strong> — $55K-110K</li>
  </ul>
</section>
`,
  },

  // 06. Phối cảnh
  {
    id: "9e37e3fc-872f-46cb-a37c-dbe879b6be4c",
    tieu_de: "Phối cảnh (Perspective)",
    tieu_de_viet: "Nghệ thuật Phối cảnh",
    tom_tat:
      "Phối cảnh là kỹ thuật vẽ tạo ảo giác về không gian 3D, chiều sâu và khoảng cách trên một bề mặt phẳng — foundation drawing, painting, illustration, architecture.",
    meta_title: "Phối cảnh là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Phối cảnh 1, 2, 3 điểm tụ. Tìm hiểu nguyên tắc perspective drawing và workflow cho illustration, concept art, architecture.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn vẽ căn phòng — wall, furniture, người đứng. Sau khi xong, nhìn lại — feel flat, không có depth. Lý do: thiếu <strong>phối cảnh</strong> đúng. Phối cảnh — kỹ thuật vẽ tạo ảo giác 3D space trên bề mặt 2D — foundation skill cho artist. Renaissance master (Leonardo, Brunelleschi) khám phá perspective math, cách mạng art. Modern artist vẫn dùng same principle.</p>
  <p>Phối cảnh là kỹ năng critical cho mọi visual artist — illustrator, concept artist, architect, animator. Hiểu nguyên tắc 1, 2, 3-point perspective và workflow giúp vẽ space believable, professional. Foundation cho realistic và stylized work both.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Phối cảnh là gì?</h2>
  <p>Phối cảnh (Perspective) là <strong>kỹ thuật vẽ</strong> tạo illusion of 3D depth on 2D surface. Based on observation: parallel line in real world appear to converge at <strong>vanishing point</strong> as distance from viewer increases. Object far away appear smaller than near. Phối cảnh codify these observation thành mathematical rule that artist follow.</p>
  <p>Three main type: <strong>1-point perspective</strong> (single vanishing point — corridor, looking down street), <strong>2-point perspective</strong> (two vanishing point — corner of building view), <strong>3-point perspective</strong> (three vanishing point — extreme low/high angle, skyscraper looking up). Plus advanced: <strong>4 và 5-point</strong> (panoramic, fisheye). Choose based on subject.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Key Concepts</span>
    <p><strong>Horizon Line</strong>: viewer eye level. <strong>Vanishing Point</strong>: parallel line converge. <strong>Picture Plane</strong>: 2D surface drawing on. <strong>Cone of Vision</strong>: 60° viewing angle (beyond distortion). <strong>Foreshortening</strong>: object compressed toward viewer.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Horizon Line</strong> — eye level</li>
    <li><strong>Vanishing Point</strong> — convergence</li>
    <li><strong>1-Point</strong> — frontal view</li>
    <li><strong>2-Point</strong> — corner view</li>
    <li><strong>3-Point</strong> — extreme angle</li>
    <li><strong>Foreshortening</strong> — depth compression</li>
    <li><strong>Atmospheric Perspective</strong> — color/clarity over distance</li>
    <li><strong>Picture Plane</strong> — drawing surface</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"perspective drawing 1 2 3 point vanishing point art tutorial"</span>
    </div>
    <p class="arc-image-caption">Phối cảnh — kỹ thuật vẽ tạo illusion 3D depth on 2D</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Phối cảnh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1-Point Perspective</summary>
      <div class="arc-card-body">
        <p>Single vanishing point on horizon. View straight forward — corridor, train track, looking down street. Simplest type. Frontal architectural view.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2-Point Perspective</summary>
      <div class="arc-card-body">
        <p>Two vanishing points on horizon. View corner of building. Most common cho architectural drawing. Most natural-looking.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3-Point Perspective</summary>
      <div class="arc-card-body">
        <p>Three vanishing points — two on horizon plus one above/below. Extreme angle. Looking up skyscraper, down from rooftop. Dramatic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bird&apos;s Eye View</summary>
      <div class="arc-card-body">
        <p>Looking down from high. Often 3-point with vanishing point below horizon. Wide overview.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Worm&apos;s Eye View</summary>
      <div class="arc-card-body">
        <p>Looking up from low. 3-point với vanishing point above. Dramatic, towering feel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Atmospheric Perspective</summary>
      <div class="arc-card-body">
        <p>Distant object lighter, less saturated, lower contrast. Mountain in distance hazy blue. Add depth complement linear perspective.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Isometric / Axonometric</summary>
      <div class="arc-card-body">
        <p>No vanishing point — parallel line stay parallel. Used in technical drawing, pixel art game. Different visual look.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Phối cảnh</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Establish Horizon</h3>
    <ul class="arc-list">
      <li>Set horizon line position</li>
      <li>High horizon = looking down feel</li>
      <li>Low horizon = looking up</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Vanishing Point(s)</h3>
    <ul class="arc-list">
      <li>Mark on horizon</li>
      <li>1-point: one VP</li>
      <li>2-point: two VP (often off-canvas)</li>
      <li>3-point: add VP above/below</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Construct Box</h3>
    <ul class="arc-list">
      <li>Start với simple box as base</li>
      <li>Draw line from VP through corners</li>
      <li>Establish proportion</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Subdivide</h3>
    <ul class="arc-list">
      <li>Add window, door, detail to box</li>
      <li>Use diagonals to find center perspective-correct</li>
      <li>Use measuring point cho proportion</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Multiple Object</h3>
    <ul class="arc-list">
      <li>Each object follow same VP</li>
      <li>Use base box construction</li>
      <li>Smaller object further away</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Refine &amp; Render</h3>
    <ul class="arc-list">
      <li>Remove construction line</li>
      <li>Add detail, shading</li>
      <li>Atmospheric perspective cho depth</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Check &amp; Correct</h3>
    <ul class="arc-list">
      <li>Flip horizontal — error becomes obvious</li>
      <li>Verify VP consistency</li>
      <li>Adjust if needed</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Photoshop</strong> — Vanishing Point filter, perspective ruler</li>
    <li><strong>Procreate</strong> — Drawing Guide perspective</li>
    <li><strong>Clip Studio Paint</strong> — Perspective ruler excellent</li>
    <li><strong>Blender</strong> — model 3D scene, render as reference</li>
    <li><strong>SketchUp</strong> — 3D model architecture for reference</li>
    <li><strong>Loose hand sketch</strong> first cho composition</li>
    <li><strong>VP often off-canvas</strong> — only artwork visible to viewer matters</li>
    <li><strong>Avoid distortion zone</strong> — beyond 60° cone of vision = warp</li>
    <li><strong>Practice daily</strong> — 30 min/day perspective sketch</li>
    <li><strong>Resources</strong>: &quot;Perspective Made Easy&quot; by Ernest Norling, &quot;How to Draw&quot; Scott Robertson</li>
  </ul>
</section>
`,
  },

  // 07. Photobashing
  {
    id: "5b162f67-bdd0-4c56-bd3d-206332a2540e",
    tieu_de: "Photobashing",
    tieu_de_viet: "Photobashing trong Concept Art",
    tom_tat:
      "Photobashing là kỹ thuật ghép nhiều bức ảnh khác nhau để tạo hình ảnh mới — phổ biến trong concept art và matte painting cho film, game, motion picture.",
    meta_title: "Photobashing là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Photobashing concept art. Tìm hiểu workflow combining photo + paint, sources reference và best practice cho production.",
    noi_dung: `
<section class="arc-intro">
  <p>Marvel concept artist need spaceship in alien landscape — deadline 3 days. Painting from scratch = week. Workflow modern: <strong>photobashing</strong> — combine photo reference (rocky terrain photo + sky photo + spaceship 3D render) trong Photoshop, paintover unify. Result: 1 day. Industry standard production technique cho film, game concept art.</p>
  <p>Photobashing là kỹ thuật pro cho concept artist, illustrator, VFX artist. Hiểu workflow, source ethics, paint integration giúp tạo concept art fast và polished — phù hợp deadline studio. Combine với 3D blockout, AI image generation thành powerful hybrid workflow.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Photobashing là gì?</h2>
  <p>Photobashing là technique <strong>combine multiple photo</strong> trong Photoshop để tạo new image cho concept art. Photo selected từ stock library, personal shooting, hoặc Google Image (with copyright consideration). Combined với masking, blending, color grading, plus <strong>paintover</strong> trên top để unify, add original detail, hide seam.</p>
  <p>Originated trong matte painting industry (film background painting), spread vào concept art early 2010s. Marvel, ILM, Weta concept artist embraced — speed up production. Today: virtually every studio concept artist use photobashing some degree. Combined với 3D blockout, AI generation = modern concept art pipeline.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Photobashing vs Pure Painting vs Matte Painting</span>
    <p><strong>Pure Painting</strong>: vẽ từ blank canvas, slow but most original. <strong>Photobashing</strong>: combine photo + paint. <strong>Matte Painting</strong>: photo-realistic painting for film background, photobashing-heavy. Modern concept art mix all three.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Photo Reference</strong> — source material</li>
    <li><strong>Masking</strong> — cutout photo section</li>
    <li><strong>Blending</strong> — integrate photo together</li>
    <li><strong>Color Grading</strong> — unify color palette</li>
    <li><strong>Paintover</strong> — paint to refine</li>
    <li><strong>3D Blockout</strong> — combine với 3D base</li>
    <li><strong>Stock Photo</strong> — Shutterstock, Getty, free Unsplash</li>
    <li><strong>Personal Photo</strong> — own shooting</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"photobashing concept art photoshop matte painting composite"</span>
    </div>
    <p class="arc-image-caption">Photobashing — combine photo + paint, productivity concept art</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Source Photo</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Personal Photography</summary>
      <div class="arc-card-body">
        <p>Best practice — no copyright issue. Shoot reference daily — texture, sky, building. Build personal library. Always usable in commercial work.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stock Photo Sites</summary>
      <div class="arc-card-body">
        <p>Shutterstock, Adobe Stock, Getty. License cho commercial use. Costly but professional. Standard cho studio production.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Free Resources</summary>
      <div class="arc-card-body">
        <p>Unsplash, Pexels, Pixabay — free, commercial license. Quality varies. Good cho indie project, prototyping.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Texture Sites</summary>
      <div class="arc-card-body">
        <p>Textures.com, Poliigon, Quixel Megascans. Specialized texture/surface reference.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D Render Output</summary>
      <div class="arc-card-body">
        <p>Render rough 3D model, use as photobash element. Hybrid 3D + photo workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>AI Generated</summary>
      <div class="arc-card-body">
        <p>Midjourney, Stable Diffusion — generate element to bash with. Modern hybrid. Legal/ethical consideration evolving.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Google Image (Caution)</summary>
      <div class="arc-card-body">
        <p>Risky — copyright unknown. OK for personal study only. Never use commercial without verification.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Photobashing Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Composition Sketch</h3>
    <ul class="arc-list">
      <li>Thumbnail rough composition first</li>
      <li>Establish focal, perspective, mood</li>
      <li>Plan before collecting photo</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Gather Photo Reference</h3>
    <ul class="arc-list">
      <li>Search photo match each element</li>
      <li>Sky, terrain, building, character</li>
      <li>Match perspective when possible</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Block Composition</h3>
    <ul class="arc-list">
      <li>Place photo on canvas roughly</li>
      <li>Match composition sketch</li>
      <li>Don&apos;t worry detail yet</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Mask &amp; Composite</h3>
    <ul class="arc-list">
      <li>Mask out unwanted section</li>
      <li>Blend photo edges</li>
      <li>Layer hierarchy</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Color Grade Unify</h3>
    <ul class="arc-list">
      <li>Adjust each photo color to match palette</li>
      <li>Curves, color balance, hue/saturation</li>
      <li>Critical step — photo from different source = different color cast</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Paintover Detail</h3>
    <ul class="arc-list">
      <li>Paint on top layer</li>
      <li>Add highlight, shadow, original detail</li>
      <li>Hide photo seam</li>
      <li>Add atmosphere, light shaft</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Atmospheric Pass</h3>
    <ul class="arc-list">
      <li>Add fog, haze, particles</li>
      <li>Depth — distant element fade</li>
      <li>Drama, mood</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Final Polish</h3>
    <ul class="arc-list">
      <li>Sharp focal point</li>
      <li>Color grade overall</li>
      <li>Final detail pass</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Best Practices &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Match perspective</strong> — bashing photos with different perspective = obvious fake</li>
    <li><strong>Match lighting</strong> — photo with different light direction = jarring</li>
    <li><strong>Color unify critical</strong> — most important step often</li>
    <li><strong>Paintover hides seam</strong> — don&apos;t skip paint step, photo alone looks bashed</li>
    <li><strong>Use brush textures</strong> — paint with textured brush match photo grain</li>
    <li><strong>Add depth haze</strong> — atmospheric perspective sell depth</li>
    <li><strong>Light source motivation</strong> — paint highlight FROM light source direction</li>
    <li><strong>Don&apos;t over-photobash</strong> — looks lazy. Mix paint heavily</li>
    <li><strong>Studio ethics</strong> — always use licensed source for commercial</li>
    <li><strong>Career</strong>: concept artist studio $60K-130K, freelance $100-300/hour</li>
  </ul>
</section>
`,
  },

  // 08. Photogrammetry
  {
    id: "21013807-74ac-455d-af33-7e0ef8151896",
    tieu_de: "Photogrammetry",
    tieu_de_viet: "Photogrammetry (Quét 3D bằng ảnh)",
    tom_tat:
      "Photogrammetry là kỹ thuật tạo model 3D từ nhiều ảnh chụp ở các góc độ khác nhau bằng phần mềm như RealityCapture — cho phép số hóa vật thể và địa điểm thực tế với độ chính xác cao.",
    meta_title:
      "Photogrammetry là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Photogrammetry workflow. Tìm hiểu RealityCapture, Meshroom, Quixel Megascans và ứng dụng trong game, VFX, archviz.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn thấy environment game Battlefield, Star Citizen — buildings, rocks, terrain look photorealistic. Question: model bằng tay? Impossible scope. Câu trả lời: <strong>Photogrammetry</strong> — chụp 50-200 photo của vật thật từ mọi góc, software (RealityCapture) reconstruct 3D model với texture realistic. Quixel Megascans entire library — photogrammetry scanned. Revolutionizing 3D content.</p>
  <p>Photogrammetry là kỹ thuật rapidly important cho 3D artist, game artist, VFX artist. Hiểu workflow, software, và sources giúp create hoặc use photogrammetry asset cho production photorealistic. Critical kỹ năng cho modern 3D pipeline.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Photogrammetry là gì?</h2>
  <p>Photogrammetry là <strong>kỹ thuật tạo 3D model</strong> từ <strong>multiple photo</strong> của subject thật. Take 50-500 photo từ different angle, all around subject. Software (RealityCapture, Meshroom, Agisoft Metashape) analyze photo, identify common feature point across photo, reconstruct 3D geometry. Generate mesh với photo-realistic texture baked from input photo.</p>
  <p>Two main scale: <strong>Object scan</strong> (rock, statue, prop) — easier, well-lit, controlled. <strong>Environment scan</strong> (cave, landscape, building) — harder, drone often used. Result: photorealistic 3D asset không thể model bằng tay. Quixel Megascans = massive library of photogrammetry asset, free với Unreal license.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Why Photogrammetry?</span>
    <p>Manual modeling: artist sculpt every detail, hours. Photogrammetry: capture reality, hours of processing (cheaper). Quality: photogrammetry has authentic real-world detail (worn edges, surface imperfection) impossible to manually replicate. Limitation: hard for shiny, transparent, moving subject.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Photo Capture</strong> — 50-200+ photo around subject</li>
    <li><strong>Alignment</strong> — software find common point</li>
    <li><strong>Dense Cloud</strong> — point cloud generation</li>
    <li><strong>Mesh</strong> — triangle reconstruction</li>
    <li><strong>Texture Baking</strong> — project photo onto mesh</li>
    <li><strong>Retopology</strong> — clean mesh cho production</li>
    <li><strong>RealityCapture</strong> — industry standard software</li>
    <li><strong>Quixel Megascans</strong> — massive scan library</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"photogrammetry 3D scanning realitycapture reconstruct photos"</span>
    </div>
    <p class="arc-image-caption">Photogrammetry — capture reality, transform thành 3D model photorealistic</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Software Photogrammetry</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>RealityCapture</summary>
      <div class="arc-card-body">
        <p>Industry standard, fastest. Epic Games acquired, free cho Unreal users. Used by film studio, game AAA. Workflow polished.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Agisoft Metashape</summary>
      <div class="arc-card-body">
        <p>Professional, longstanding. Used trong archaeology, mapping, VFX. $179 standard, $3499 pro version.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Meshroom (AliceVision)</summary>
      <div class="arc-card-body">
        <p>Open-source, free. Good quality, slower than commercial. Indie / learning. Active development.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3DF Zephyr</summary>
      <div class="arc-card-body">
        <p>Italian software, free version available. Decent quality. Less popular than RealityCapture / Metashape.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Polycam</summary>
      <div class="arc-card-body">
        <p>Mobile app — iPhone LiDAR + photogrammetry. Quick scan from phone. Good cho fast capture.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>KIRI Engine</summary>
      <div class="arc-card-body">
        <p>Mobile / cloud photogrammetry. Free tier. Phone-based capture, cloud processing.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Photogrammetry Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Plan Subject</h3>
    <ul class="arc-list">
      <li>Choose subject — non-reflective, non-transparent, stationary</li>
      <li>Texture matters — featureless subject hard to scan</li>
      <li>Plan lighting — even, no harsh shadow</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Capture Photo</h3>
    <ul class="arc-list">
      <li>DSLR / mirrorless camera ideal, smartphone OK</li>
      <li>50-200+ photo around subject</li>
      <li>Overlap each photo 60-80% với neighbor</li>
      <li>Multiple height level</li>
      <li>Consistent exposure</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Import to Software</h3>
    <ul class="arc-list">
      <li>RealityCapture / Metashape / Meshroom</li>
      <li>Auto-detect EXIF metadata</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Alignment</h3>
    <ul class="arc-list">
      <li>Software analyze, find common point</li>
      <li>Result: camera position + sparse cloud</li>
      <li>Few minutes — hour depending on count</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Dense Reconstruction</h3>
    <ul class="arc-list">
      <li>Compute dense point cloud</li>
      <li>Most CPU-intensive step — hours</li>
      <li>Requires good GPU/CPU</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Mesh Generation</h3>
    <ul class="arc-list">
      <li>Triangulate point cloud thành mesh</li>
      <li>Often very high poly (millions)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Texture Baking</h3>
    <ul class="arc-list">
      <li>Project photo onto mesh as texture</li>
      <li>Generate diffuse, normal, AO map</li>
      <li>4K, 8K texture common</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Retopology &amp; Optimize</h3>
    <ul class="arc-list">
      <li>Reduce poly cho game use (Decimate, ZBrush ZRemesher)</li>
      <li>UV unwrap clean</li>
      <li>Bake from high to low poly</li>
      <li>Final asset usable trong Unreal/Unity</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Use Cases &amp; Resources</h2>
  <ul class="arc-list">
    <li><strong>Game Environment</strong> — Quixel Megascans rocks, foliage, props</li>
    <li><strong>VFX Film</strong> — capture real location, blend with CGI</li>
    <li><strong>Archviz</strong> — scan existing building cho renovation visualization</li>
    <li><strong>Cultural Heritage</strong> — digitize historic statue, archaeology site</li>
    <li><strong>Asset Library</strong>: Quixel Megascans (free Unreal), Sketchfab marketplace</li>
    <li><strong>Drone Photogrammetry</strong> — large environment scan</li>
    <li><strong>Tips</strong>: avoid shiny/transparent subject, control lighting, lots of overlap</li>
    <li><strong>Hardware</strong>: powerful GPU (RTX series), 32-64GB RAM</li>
    <li><strong>Storage</strong>: photogrammetry data huge, TB-scale</li>
    <li><strong>Career</strong>: environment artist photogrammetry-skilled $70K-130K</li>
  </ul>
</section>
`,
  },

  // 09. Pipeline
  {
    id: "9ad366b6-c1bd-41dd-b01a-476fedd53b56",
    tieu_de: "Pipeline (Production)",
    tieu_de_viet: "Pipeline trong làm phim, hoạt hình, VFX",
    tom_tat:
      "Pipeline trong sản xuất là quy trình systematic từ ý tưởng đến sản phẩm cuối — bao gồm tất cả giai đoạn, công cụ, vai trò trong làm phim, animation, VFX, game.",
    meta_title: "Pipeline là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Pipeline production cho film, animation, VFX, game. Tìm hiểu pre-production, production, post-production và phối hợp đội ngũ.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem credit cuối Marvel film — 1500+ people listed. Câu hỏi: làm sao 1500 người collaborate cho one film? Câu trả lời: <strong>Pipeline</strong> — production workflow systematic. From script đến final shot, mọi person, mọi tool, mọi step define clearly. Studio Pixar, ILM, DNEG run on disciplined pipeline. Critical foundation industry.</p>
  <p>Pipeline là kiến thức essential cho mọi creative professional muốn làm việc trong studio environment. Hiểu pre-production, production, post-production phase, role hierarchy, tool integration giúp navigate studio workflow, contribute effectively.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Pipeline là gì?</h2>
  <p>Pipeline trong production là <strong>systematic workflow</strong> từ idea đến final deliverable. Defines: <strong>phase</strong> (pre, production, post), <strong>role</strong> (writer, director, animator, compositor), <strong>tool</strong> (software, asset management), <strong>process</strong> (review, iteration, approval), <strong>standard</strong> (naming, file structure, quality benchmark). Goal: scale collaboration cho large team với efficiency và quality.</p>
  <p>Different industry slight different pipeline: <strong>Film</strong> (live-action), <strong>Animation</strong> (CGI feature), <strong>VFX</strong> (visual effect cho film/TV), <strong>Game</strong> (interactive), <strong>Motion Graphics</strong> (advertising). Each has unique structure but common pattern. Studio invest heavily trong pipeline — TD (Technical Director) role dedicated to pipeline tool development.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Pipeline Goal</span>
    <p><strong>1. Scalability</strong>: 1500-person team possible. <strong>2. Quality</strong>: review at each stage. <strong>3. Efficiency</strong>: parallelize work. <strong>4. Reproducibility</strong>: redo shot consistently. <strong>5. Asset Reuse</strong>: model used multiple shot. <strong>6. Iteration</strong>: feedback loop fast. Pipeline = invisible infrastructure of creative industry.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Pre-production</strong> — script, design, planning</li>
    <li><strong>Production</strong> — main creation</li>
    <li><strong>Post-production</strong> — editing, finishing</li>
    <li><strong>Asset Management</strong> — track files</li>
    <li><strong>Review / Dailies</strong> — feedback session</li>
    <li><strong>Version Control</strong> — manage iteration</li>
    <li><strong>Render Farm</strong> — distributed rendering</li>
    <li><strong>Production Tracker</strong> — Shotgrid, Ftrack</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"production pipeline VFX animation studio workflow"</span>
    </div>
    <p class="arc-image-caption">Pipeline — production workflow systematic, scale collaboration</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Pipeline Phase</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Pre-Production</summary>
      <div class="arc-card-body">
        <p>Script, storyboard, concept art, design, animatic, color script, asset breakdown. Plan everything before expensive production work begin. Director + concept team + producer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Production (Animation)</summary>
      <div class="arc-card-body">
        <p>Modeling, texturing, rigging, animation, lighting, FX, rendering. Largest phase — months/years. Asset feed into shots. Massive team coordination.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Production (Live-action)</summary>
      <div class="arc-card-body">
        <p>On-set shooting. Camera, lighting, sound, performance. Less work for VFX/animation pipeline but coordination critical.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Post-Production / Finishing</summary>
      <div class="arc-card-body">
        <p>Editing, color grading, sound design, mix, music, VFX integration. Final delivery prep. DI (Digital Intermediate).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VFX Phase Specific</summary>
      <div class="arc-card-body">
        <p>Shot turnover from editorial → tracking → matchmove → 3D → comp → review. Many round of iteration per shot. Compositor finalize.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Game Pipeline</summary>
      <div class="arc-card-body">
        <p>Concept → design doc → asset creation → engine integration → gameplay programming → QA. Iterative, longer than film.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>VFX Pipeline Detail</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Plate (Shot Turnover)</h3>
    <ul class="arc-list">
      <li>Editorial provides shot to VFX</li>
      <li>Frame range defined</li>
      <li>Brief: what need to do</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Tracking / Matchmove</h3>
    <ul class="arc-list">
      <li>Analyze camera motion from footage</li>
      <li>Recreate camera trong 3D software</li>
      <li>3D Equalizer, PFTrack, Mocha</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Roto / Paint</h3>
    <ul class="arc-list">
      <li>Cut out subject (roto)</li>
      <li>Paint out unwanted element (rig removal)</li>
      <li>Nuke, Silhouette</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Modeling &amp; Texturing</h3>
    <ul class="arc-list">
      <li>Create CG asset</li>
      <li>Maya, Houdini, Substance</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Animation / FX</h3>
    <ul class="arc-list">
      <li>Animate CG character</li>
      <li>Simulation FX (fire, water, destruction)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Lighting / Rendering</h3>
    <ul class="arc-list">
      <li>Match plate lighting</li>
      <li>Render với Arnold, RenderMan, V-Ray</li>
      <li>Render farm distribute</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Compositing</h3>
    <ul class="arc-list">
      <li>Combine plate + CG + matte painting</li>
      <li>Nuke, After Effects</li>
      <li>Color grade match</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Review &amp; Iterate</h3>
    <ul class="arc-list">
      <li>VFX Supervisor review</li>
      <li>Director review</li>
      <li>Multiple iterations</li>
      <li>Final approval → deliver to editorial</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Pipeline Tools &amp; Roles</h2>
  <ul class="arc-list">
    <li><strong>Asset management</strong>: Shotgrid (Autodesk), Ftrack, Kitsu</li>
    <li><strong>Version control</strong>: Perforce (game), Git (smaller), proprietary</li>
    <li><strong>Render management</strong>: Deadline (Thinkbox), Tractor (Pixar)</li>
    <li><strong>Roles</strong>: Producer, Director, Supervisor, Lead, Artist, TD (Technical Director)</li>
    <li><strong>TD (Technical Director)</strong>: pipeline tool, automation, Python scripting</li>
    <li><strong>Pipeline TD</strong> $80K-150K, senior $150K-250K</li>
    <li><strong>Review</strong>: Daily, Weekly, Sequence review</li>
    <li><strong>Frame.io, Wipster</strong>: review platform online</li>
    <li><strong>USD (Universal Scene Description)</strong>: Pixar open-source asset format, becoming standard</li>
    <li><strong>Modern trend</strong>: cloud rendering (AWS, GCP), real-time engine (Unreal Virtual Production)</li>
  </ul>
</section>
`,
  },

  // 10. Plugin After Effects
  {
    id: "ac912745-d00b-4f26-8882-fc875154fe5d",
    tieu_de: "Plugin After Effects",
    tieu_de_viet: "Plugin trong After Effects",
    tom_tat:
      "Plugin là phần mềm bên thứ 3 thêm vào After Effects để bổ sung chức năng — bao gồm visual effect, particles, color, transition, automation — extending AE capability massively.",
    meta_title:
      "Plugin After Effects là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Plugin After Effects essential. Tìm hiểu Trapcode, Sapphire, Element 3D, Optical Flares và must-have plugin cho motion designer.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn motion designer, AE basic install — sufficient for simple work. Pro project: cần particle (Trapcode Particular), 3D integration (Element 3D), lens flare (Optical Flares), color grading (Magic Bullet), advanced VFX (Sapphire). Đó là <strong>Plugin</strong> — software third-party extending AE. Motion design industry built on plugin ecosystem.</p>
  <p>Plugin AE là kiến thức essential cho motion designer chuyên nghiệp. Hiểu must-have plugin, workflow, free alternative giúp expand AE capability đáng kể — từ amateur work đến industry-standard production. Investment trong plugin = return long-term productivity.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Plugin AE là gì?</h2>
  <p>Plugin là <strong>third-party software</strong> install vào After Effects để extend capability beyond built-in feature. Plugin range from simple effect (one specific filter) đến complex toolkit (Trapcode Suite = multiple plugin together). Developed by independent company (Red Giant, BorisFX, Video Copilot), sold separately. Massive ecosystem — hundreds of plugin available.</p>
  <p>Plugin install vào AE via plug-in installer hoặc copy file vào Plug-ins folder. After Effects reads plugin on startup, appears trong Effects menu. Most plugin work với latest AE version; check compatibility before purchase. Updates often required cho new AE version.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Plugin vs Effect vs Script vs Extension</span>
    <p><strong>Plugin / Effect</strong>: applies to layer, shows trong Effects menu. <strong>Script</strong>: .jsx file automates AE workflow. <strong>Extension</strong>: panel UI inside AE. Combined ecosystem extends AE. Plugin most visual impact, script most workflow productivity.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Red Giant</strong> — Trapcode, Magic Bullet, Universe</li>
    <li><strong>BorisFX</strong> — Sapphire, Continuum</li>
    <li><strong>Video Copilot</strong> — Element 3D, Optical Flares</li>
    <li><strong>Maxon</strong> — Cineware (Cinema 4D integration)</li>
    <li><strong>FxFactory</strong> — diverse plugin marketplace</li>
    <li><strong>Aescripts</strong> — script + plugin marketplace</li>
    <li><strong>Free Plugin</strong> — limited but useful</li>
    <li><strong>Compatible AE Version</strong> — check before install</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"after effects plugin trapcode sapphire element 3D motion design"</span>
    </div>
    <p class="arc-image-caption">Plugin AE — third-party software extend After Effects capability</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Must-Have Plugin</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Trapcode Particular (Red Giant)</summary>
      <div class="arc-card-body">
        <p>Industry standard particle plugin. Fire, smoke, magic, abstract. Most used plugin motion design. $399 suite includes Form, Mir, Tao. Investment essential.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Element 3D (Video Copilot)</summary>
      <div class="arc-card-body">
        <p>3D model trong AE — import OBJ, apply texture, render. Faster than C4D for simple 3D motion graphics. $200.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Optical Flares (Video Copilot)</summary>
      <div class="arc-card-body">
        <p>Realistic lens flare. Standard cho title sequence, cinematic feel. $125.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sapphire (BorisFX)</summary>
      <div class="arc-card-body">
        <p>Industry-standard VFX suite. Glow, distortion, particles, transition. High-end studio favorite. $1295 (subscription option).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Magic Bullet Looks (Red Giant)</summary>
      <div class="arc-card-body">
        <p>Color grading inside AE. Preset cinematic look. Faster than manual grade. Suite includes Mojo, Cosmo (skin smooth), Denoiser.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Twixtor (RE:Vision Effects)</summary>
      <div class="arc-card-body">
        <p>Optical flow slow motion. Best quality slow mo from standard frame rate.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Plexus (Rowbyte)</summary>
      <div class="arc-card-body">
        <p>Connected dot/line network. Tech style motion graphics. Subscription/one-time.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Saber (Video Copilot, FREE)</summary>
      <div class="arc-card-body">
        <p>Lightsaber, energy beam, abstract glow. Free từ Video Copilot. Excellent quality.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Motion 4 (Mt. Mograph)</summary>
      <div class="arc-card-body">
        <p>Workflow accelerator. Quick toolkit cho rigging, animation, color. $50, productivity multiplier.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Plugin</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Identify Need</h3>
    <ul class="arc-list">
      <li>Specific effect you can&apos;t achieve in built-in AE</li>
      <li>Workflow that&apos;s slow manually</li>
      <li>Check if plugin solves it before buying</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Research Plugin</h3>
    <ul class="arc-list">
      <li>Read review</li>
      <li>Watch tutorial</li>
      <li>Try trial version</li>
      <li>Check forum compatibility</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Purchase &amp; Install</h3>
    <ul class="arc-list">
      <li>Buy from official source</li>
      <li>Run installer</li>
      <li>License activation</li>
      <li>Restart AE</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Learn Plugin</h3>
    <ul class="arc-list">
      <li>Watch tutorial (YouTube, official)</li>
      <li>Apply preset first</li>
      <li>Customize gradually</li>
      <li>Build library of preset/setup</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Performance</h3>
    <ul class="arc-list">
      <li>Many plugin GPU-accelerated</li>
      <li>Pre-render heavy plugin if slow</li>
      <li>Disable preview during work</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Update Regularly</h3>
    <ul class="arc-list">
      <li>Compatibility with new AE version</li>
      <li>Bug fix, feature add</li>
      <li>Subscription auto-update typically</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Free Alternatives</h2>
  <ul class="arc-list">
    <li><strong>Start with free</strong> — Saber, MoCode, free aescripts</li>
    <li><strong>Build essential set</strong>: Trapcode Particular + Optical Flares + Element 3D core motion design</li>
    <li><strong>Subscription vs one-time</strong> — depends on use, calculate cost</li>
    <li><strong>Aescripts marketplace</strong> — diverse plugin, often affordable</li>
    <li><strong>Don&apos;t buy everything</strong> — only what you need now</li>
    <li><strong>Try trial first</strong> — most plugin offer 14-30 day trial</li>
    <li><strong>Sale season</strong> — Black Friday, Cyber Monday 30-50% off plugin</li>
    <li><strong>Education discount</strong> — student version cheaper</li>
    <li><strong>Render farm consideration</strong> — plugin must be installed on render machine</li>
    <li><strong>Career investment</strong> — pro motion designer often $2000-5000 plugin library</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 2 · Batch 8 — chạy ${items.length} bài keyword (I → P) ──\n`,
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
