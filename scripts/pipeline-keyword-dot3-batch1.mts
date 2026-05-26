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
  // 01. Quality Assurance (QA)
  {
    id: "ef3cd152-0646-4477-8145-82ead1f120be",
    tieu_de: "Quality Assurance (QA)",
    tieu_de_viet: "Đảm bảo chất lượng (QA)",
    tom_tat:
      "QA là quá trình kiểm tra hệ thống để phát hiện bug và đảm bảo sản phẩm hoạt động đúng — trong game và phần mềm, QA tester kiểm tra toàn bộ tính năng trước khi phát hành.",
    meta_title:
      "Quality Assurance (QA) là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "QA trong game, phần mềm. Tìm hiểu workflow QA testing, các loại test (functional, regression, compatibility) và career QA tester.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn play game AAA release day — gameplay smooth, không crash, achievement work. Behind scene: <strong>QA team</strong> đã test game 1000 hours, find &amp; fix hundreds bug trước khi release. Mỗi feature checked across multiple platform. Bug log đầy, dev fix, QA verify, repeat. QA = invisible heroes giữ product chất lượng — distinguish polished release vs buggy disaster.</p>
  <p>QA là kiến thức essential cho mọi game/software developer, production professional. Hiểu QA workflow, test types, methodology giúp build quality product, navigate studio QA process effectively. Plus: QA tester là entry-level path vào game industry, valuable cho người mới muốn break-in.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Quality Assurance là gì?</h2>
  <p>Quality Assurance (QA) là <strong>systematic process</strong> kiểm tra product để ensure functionality, reliability, performance theo spec. Trong game/software industry, QA team test product extensively — find bug, document, work với dev to fix, verify fix work, repeat until product ship-ready. QA different from <strong>QC (Quality Control)</strong> — QA process-focused, QC product-focused. Often used interchangeably.</p>
  <p>QA spans entire production: <strong>functional testing</strong> (feature work?), <strong>regression testing</strong> (new code break old feature?), <strong>compatibility testing</strong> (different hardware/OS), <strong>performance testing</strong> (frame rate, load time), <strong>localization testing</strong> (text fit per language?), <strong>certification testing</strong> (Sony, Microsoft, Nintendo platform requirement). Modern AAA QA team có 50-200+ tester.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">QA vs QC vs Testing</span>
    <p><strong>QA (Quality Assurance)</strong>: process to ensure quality, broader. <strong>QC (Quality Control)</strong>: identify defect trong product, narrower. <strong>Testing</strong>: actual act of executing test. Industry often lump together. QA team typically does all three.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Bug Report</strong> — document defect found</li>
    <li><strong>Test Case</strong> — predefined scenario to verify</li>
    <li><strong>Test Plan</strong> — overall test strategy</li>
    <li><strong>Regression Test</strong> — verify no broken</li>
    <li><strong>Smoke Test</strong> — basic build verification</li>
    <li><strong>Cert Test</strong> — platform certification</li>
    <li><strong>Bug Tracker</strong> — Jira, Bugzilla</li>
    <li><strong>Severity / Priority</strong> — bug ranking</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"quality assurance game testing QA tester software"</span>
    </div>
    <p class="arc-image-caption">QA — systematic process kiểm tra, đảm bảo chất lượng product</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Test</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Functional Testing</summary>
      <div class="arc-card-body">
        <p>Feature work as designed? Game: shoot weapon damage enemy? Software: click button submit form? Foundation of QA. Most time spent on functional.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Regression Testing</summary>
      <div class="arc-card-body">
        <p>New code break existing feature? Re-test established functionality with each build. Automated tool save time. Critical late in development.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Compatibility Testing</summary>
      <div class="arc-card-body">
        <p>Test across different hardware, OS, browser version. Game: PS5, Xbox, PC, Switch. Software: Windows, Mac, mobile. Resource-intensive.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Performance Testing</summary>
      <div class="arc-card-body">
        <p>Frame rate consistent? Load time acceptable? Memory leak? Game stress test critical. Tool: profiler, FPS monitor.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Localization Testing</summary>
      <div class="arc-card-body">
        <p>Text fit UI in German (longer)? Right-to-left language (Arabic) layout? Cultural appropriate? Multi-language launch challenge.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Certification Testing</summary>
      <div class="arc-card-body">
        <p>Sony TRC, Microsoft XR, Nintendo Lotcheck — strict requirement to ship on platform. Fail = delay release. Last QA phase.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Multiplayer / Network Testing</summary>
      <div class="arc-card-body">
        <p>Online game test latency, server load, matchmaking. Stress test before launch crucial. Beta period.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Usability Testing</summary>
      <div class="arc-card-body">
        <p>Real user feedback. UI intuitive? Onboarding clear? Distinct from QA but related. Marketing/UX team often involved.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>QA Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Test Plan Creation</h3>
    <ul class="arc-list">
      <li>QA lead define scope, schedule</li>
      <li>Test case prepared</li>
      <li>Build deliverable timeline</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Build Receive</h3>
    <ul class="arc-list">
      <li>Dev team push build to QA</li>
      <li>Smoke test first — basic verify install/launch</li>
      <li>Detailed test follow</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Execute Test</h3>
    <ul class="arc-list">
      <li>Tester run test case</li>
      <li>Note any unexpected behavior</li>
      <li>Reproduce bug carefully</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Bug Report</h3>
    <ul class="arc-list">
      <li>Title clear &quot;Game crashes when X happens&quot;</li>
      <li>Steps to reproduce</li>
      <li>Expected vs actual behavior</li>
      <li>Screenshot/video</li>
      <li>Severity rating</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Bug Triage</h3>
    <ul class="arc-list">
      <li>Lead review bug, assign priority</li>
      <li>Some defer, some fix immediately</li>
      <li>Dev assigned to fix</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Verify Fix</h3>
    <ul class="arc-list">
      <li>Dev fix bug, push new build</li>
      <li>QA verify bug actually fixed</li>
      <li>Mark resolved</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Regression Sweep</h3>
    <ul class="arc-list">
      <li>Re-test established feature</li>
      <li>Ensure fix didn&apos;t break other</li>
      <li>Final pass before ship</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Certification</h3>
    <ul class="arc-list">
      <li>Submit to platform</li>
      <li>Pass = ship</li>
      <li>Fail = fix and resubmit</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Tools</h2>
  <ul class="arc-list">
    <li><strong>QA Tester Entry</strong> — $35K-50K, common entry into game industry</li>
    <li><strong>QA Lead</strong> — $60K-90K, manage team</li>
    <li><strong>QA Manager / Director</strong> — $90K-150K</li>
    <li><strong>Automation Engineer</strong> — $70K-130K, code automated test</li>
    <li><strong>Bug tracker</strong>: Jira (Atlassian), Bugzilla, GitHub Issue</li>
    <li><strong>Test management</strong>: TestRail, Zephyr</li>
    <li><strong>Automation tool</strong>: Selenium (web), Appium (mobile), Unity Test Framework</li>
    <li><strong>Path</strong>: tester → senior tester → lead → manager → director</li>
    <li><strong>QA → other</strong>: often pivot to design, production, programming</li>
    <li><strong>Outsourced QA</strong>: VMC, Lionbridge, Keywords Studios — large QA vendors</li>
  </ul>
</section>
`,
  },

  // 02. Ragdoll Physics
  {
    id: "89e6305b-3503-43d2-bd4b-b8f070ca2209",
    tieu_de: "Ragdoll Physics",
    tieu_de_viet: "Vật lý Búp bê (Ragdoll Physics)",
    tom_tat:
      "Ragdoll Physics là mô phỏng vật lý giúp nhân vật 3D sụp đổ hoặc di chuyển tự nhiên như búp bê vải khi không còn animation control — phổ biến trong game cho death, hit reaction.",
    meta_title:
      "Ragdoll Physics là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Ragdoll Physics trong game. Tìm hiểu PhysX, Bullet physics engine, ragdoll setup Unreal, Unity và best practice cho character.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn play GTA — shoot NPC, NPC fall realistic, hit wall body bounce, limb sprawl natural. Hoặc Tomb Raider — Lara fall cliff, body tumble physics-correctly. Đó là <strong>Ragdoll Physics</strong> — character body simulate physics when not animation-controlled. Critical kỹ thuật cho action game realism. Từ Half-Life 2 mid-2000s popularize, modern game expected feature.</p>
  <p>Ragdoll Physics là kỹ thuật essential cho game developer, technical animator. Hiểu setup ragdoll trong engine, physics tuning, transition giữa animation và ragdoll giúp create believable character behavior. Foundation cho modern game character feeling alive.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Ragdoll Physics là gì?</h2>
  <p>Ragdoll Physics là <strong>simulation technique</strong> where character body simulate physics — gravity, collision, joint constraint — instead of animation-driven. Each bone treated as rigid body connected via constraint (joint with rotation limit). When character &quot;dies&quot; or knockout, switch from animation to ragdoll mode — body fall realistically, react impact, settle naturally.</p>
  <p>Foundation: <strong>physics engine</strong> (PhysX, Bullet, Havok, ODE) simulate rigid body với joint constraint. Character skeleton mapped to physics body, each bone = capsule/sphere collider, joint = constraint với rotation limit (knee bends one direction). Engine simulate runtime → bone position update → mesh deform → visible ragdoll motion.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Ragdoll vs Cloth vs Cá Other Simulation</span>
    <p><strong>Ragdoll</strong>: character body rigid joint. <strong>Cloth</strong>: fabric simulation, more vertex. <strong>Soft Body</strong>: deformable jello-like. <strong>Rigid Body</strong>: solid object physics. Ragdoll specifically character — high-quality result tuning critical, otherwise &quot;floppy&quot; awkward.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Physics Engine</strong> — PhysX, Bullet, Havok</li>
    <li><strong>Rigid Body</strong> — bone as capsule</li>
    <li><strong>Joint Constraint</strong> — rotation limit</li>
    <li><strong>Collision Body</strong> — bone shape</li>
    <li><strong>Mass Distribution</strong> — weight per bone</li>
    <li><strong>Damping</strong> — energy loss</li>
    <li><strong>Blend Animation → Ragdoll</strong> — smooth transition</li>
    <li><strong>Get Up Animation</strong> — recover from ragdoll</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"ragdoll physics game character death impact unreal unity"</span>
    </div>
    <p class="arc-image-caption">Ragdoll Physics — body simulate physics khi không animation control</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Ragdoll Setup</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Bone Collision</summary>
      <div class="arc-card-body">
        <p>Each bone gets collider — capsule for limb, box for torso. Shape match anatomy. Size matter cho stability.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Joint Constraint</summary>
      <div class="arc-card-body">
        <p>Limit joint rotation — elbow bend one way, hip rotate spherical với limit. Match anatomy. Too loose = floppy, too tight = stiff.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mass Distribution</summary>
      <div class="arc-card-body">
        <p>Torso heavier than limb. Realistic distribution = realistic ragdoll. Wrong mass = body fall unnaturally.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Damping</summary>
      <div class="arc-card-body">
        <p>Energy loss factor. Higher = settle quickly. Lower = bouncier. Tune for desired look. Real body has damping (drag, muscle resistance).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Friction</summary>
      <div class="arc-card-body">
        <p>Ground contact friction. High friction = body slide less. Low = slide more (icy floor).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blend Weight</summary>
      <div class="arc-card-body">
        <p>Smooth transition animation → ragdoll. Don&apos;t abrupt switch. Blend 0.5 seconds typical. Final character pose at moment of switch + physics layer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Active vs Passive Ragdoll</summary>
      <div class="arc-card-body">
        <p>Passive: pure physics, no muscle. Active: physics + simulated muscle, character can still react. Active modern AAA (FIFA player still reactive after impact).</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Implementation Per Engine</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unreal Engine — Physics Asset</h3>
    <ul class="arc-list">
      <li>Skeleton + auto-generated Physics Asset</li>
      <li>Edit per-bone collision, constraint</li>
      <li>Blueprint enable ragdoll on death</li>
      <li>Built-in workflow</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unity — Ragdoll Wizard</h3>
    <ul class="arc-list">
      <li>GameObject → 3D Object → Ragdoll</li>
      <li>Auto-setup based skeleton</li>
      <li>PhysX physics</li>
      <li>Manual adjust constraint</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Havok (Industry)</h3>
    <ul class="arc-list">
      <li>Microsoft acquired Havok</li>
      <li>Triple-A game choice — Halo, Skyrim</li>
      <li>Premium physics</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Custom Engine</h3>
    <ul class="arc-list">
      <li>Bullet open-source common</li>
      <li>ODE older alternative</li>
      <li>Custom physics for special game</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">NaturalMotion Euphoria</h3>
    <ul class="arc-list">
      <li>Advanced behavioral physics</li>
      <li>GTA, Red Dead Redemption signature</li>
      <li>Character react alive even after &quot;death&quot;</li>
      <li>Rockstar Games exclusive licensed</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation → Ragdoll Transition</h3>
    <ul class="arc-list">
      <li>Last animation frame pose preserve</li>
      <li>Velocity from animation transferred</li>
      <li>Smooth blend</li>
      <li>Force apply from impact direction</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Ragdoll</h2>
  <ul class="arc-list">
    <li><strong>Don&apos;t overuse</strong> — death sequence works, but ragdoll constantly = comical</li>
    <li><strong>Tune constraint carefully</strong> — joint limit anatomy-correct</li>
    <li><strong>Mass distribution realistic</strong> — torso heavy, head moderate, limb light</li>
    <li><strong>Test impact direction</strong> — body react believably from any angle</li>
    <li><strong>Damping critical</strong> — too bouncy = silly, just right = natural</li>
    <li><strong>Recovery animation</strong> — get up from ragdoll smooth transition</li>
    <li><strong>Network sync</strong> — multiplayer ragdoll challenging, often server-authoritative</li>
    <li><strong>Performance</strong> — many ragdoll simultaneously expensive</li>
    <li><strong>Hybrid active ragdoll</strong> — modern technique character still responsive after hit</li>
    <li><strong>Reference Half-Life 2, GTA, Skyrim</strong> — gold standard ragdoll</li>
  </ul>
</section>
`,
  },

  // 03. Random Expression
  {
    id: "6304ef67-0286-4836-97ab-caab7d4fa3eb",
    tieu_de: "Random Expression",
    tieu_de_viet: "Random Expression trong After Effects",
    tom_tat:
      "Random Expression là expression After Effects dùng hàm random() để tạo chuyển động hoặc giá trị ngẫu nhiên — tạo sự không đều tự nhiên trong animation thay vì máy móc.",
    meta_title:
      "Random Expression là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Random Expression AE. Tìm hiểu wiggle(), random(), noise() expression và workflow tạo natural motion graphics.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn motion designer animate floating particle — keyframe each particle position random? Tedious cho 50 particle. Solution: <strong>Random Expression</strong> — script một dòng, particle auto move ngẫu nhiên natural. Hoặc text với random delay — không cần keyframe từng character. AE expression = power user productivity, distinguish efficient motion designer vs slow keyframer.</p>
  <p>Random Expression là kỹ thuật essential cho motion designer chuyên nghiệp. Hiểu wiggle, random(), noise() functions, seed control, workflow giúp tạo organic motion tự nhiên - distinguish polished motion graphics from robotic. Foundation kỹ năng for AE pro.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Random Expression là gì?</h2>
  <p>Random Expression là <strong>After Effects expression</strong> sử dụng các hàm random — <strong>random()</strong>, <strong>wiggle()</strong>, <strong>noise()</strong>, <strong>seedRandom()</strong> — tạo giá trị thay đổi theo thời gian hoặc per-layer. Apply expression vào property (Position, Scale, Rotation, Opacity, Color) → property animate randomly without manual keyframe.</p>
  <p>Most common: <strong>wiggle(frequency, amplitude)</strong> — most-used AE expression. <code>wiggle(2, 50)</code> on Position = property wiggle 2 times/sec với 50 pixel amplitude. <strong>random(min, max)</strong> — random value (changes per frame if no seed). <strong>noise(x)</strong> — Perlin-style noise. <strong>seedRandom(seed, true)</strong> — control random với seed cho consistency.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Common Expression Functions</span>
    <p><strong>wiggle(freq, amp)</strong>: most used, organic random motion. <strong>random(min, max)</strong>: random number. <strong>seedRandom(seed, true)</strong>: time-stable random. <strong>noise(x)</strong>: smooth Perlin noise. <strong>index</strong>: layer index for per-layer variation. <strong>time</strong>: current time seconds. Combine functions cho complex behavior.</p>
  </div>

  <ul class="arc-list">
    <li><strong>wiggle()</strong> — most used random</li>
    <li><strong>random()</strong> — random number</li>
    <li><strong>noise()</strong> — smooth random</li>
    <li><strong>seedRandom()</strong> — control seed</li>
    <li><strong>index</strong> — layer index</li>
    <li><strong>time</strong> — current time</li>
    <li><strong>Math.sin/cos</strong> — wave function</li>
    <li><strong>Math.floor/round</strong> — discretize</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"after effects expression wiggle random motion graphics"</span>
    </div>
    <p class="arc-image-caption">Random Expression — tạo motion ngẫu nhiên tự nhiên, productivity AE</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Common Random Expression</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Basic Wiggle</summary>
      <div class="arc-card-body">
        <p><code>wiggle(2, 50)</code> trên Position — wiggle 2 times/sec, 50 pixel amplitude. Foundation. Organic motion. Replace tedious keyframe.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Wiggle One Dimension</summary>
      <div class="arc-card-body">
        <p><code>[value[0], wiggle(2, 50)[1]]</code> — wiggle Y only, X stay. Useful for floating object.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Random với Seed</summary>
      <div class="arc-card-body">
        <p><code>seedRandom(index, true); random(0, 100)</code> — each layer different random, stable over time. Cho text per-char animation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Time-based Wave</summary>
      <div class="arc-card-body">
        <p><code>Math.sin(time * 2) * 50</code> — smooth oscillation 50 amplitude. Use for breathing, hovering.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Noise (Smooth Random)</summary>
      <div class="arc-card-body">
        <p><code>noise(time) * 100</code> — Perlin noise output. Smoother than random. Camera shake natural feel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Index-based Variation</summary>
      <div class="arc-card-body">
        <p><code>wiggle(2, 50) * (index / numLayers)</code> — wiggle increase by layer index. Layered effect.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Conditional Random</summary>
      <div class="arc-card-body">
        <p><code>if (time &gt; 2) wiggle(2, 50) else value</code> — wiggle after 2 sec. Conditional behavior.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Combine Multiple</summary>
      <div class="arc-card-body">
        <p><code>wiggle(2, 50) + [Math.sin(time) * 30, 0]</code> — both wiggle và sine wave. Complex motion.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Use Cases Random Expression</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Floating Particle</h3>
    <ul class="arc-list">
      <li>Wiggle position cho organic floating</li>
      <li>Slight rotation wiggle</li>
      <li>Scale wiggle subtle breathing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Camera Shake</h3>
    <ul class="arc-list">
      <li>Apply wiggle to Position</li>
      <li>Earthquake heavier amplitude</li>
      <li>Handheld camera subtle wiggle</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Text Animation</h3>
    <ul class="arc-list">
      <li>Per-character delay via seedRandom</li>
      <li>Each character random animate-in</li>
      <li>Wiggle text on idle</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">UI Animation</h3>
    <ul class="arc-list">
      <li>Button pulse with sine wave</li>
      <li>Loading dots stagger via index</li>
      <li>Hover bounce</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Logo Animation</h3>
    <ul class="arc-list">
      <li>Subtle wiggle on hold pose</li>
      <li>Living feel</li>
      <li>Breathing effect</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Character Animation Detail</h3>
    <ul class="arc-list">
      <li>Hair, cloth subtle sway</li>
      <li>Idle pose breathing</li>
      <li>Eye blink random timing</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Best Practices</h2>
  <ul class="arc-list">
    <li><strong>seedRandom critical</strong> — without seed, value changes each preview = inconsistent</li>
    <li><strong>Subtle is better</strong> — small amplitude, infrequent — looks natural</li>
    <li><strong>Combine functions</strong> — wiggle + sine = complex believable</li>
    <li><strong>Index for variation</strong> — each layer unique but related motion</li>
    <li><strong>Math.sin smooth</strong> — predictable, controllable wave</li>
    <li><strong>noise smoother than random</strong> — preferred organic</li>
    <li><strong>Bake to keyframe</strong> — convert expression to keyframe for further edit</li>
    <li><strong>Performance heavy</strong> — many expression slow preview, pre-comp</li>
    <li><strong>Reference</strong>: aescripts AE Expression Reference, expressing your soul</li>
    <li><strong>Plugin alternative</strong>: Motion 4, AutoFill — UI for expression without code</li>
  </ul>
</section>
`,
  },

  // 04. RAW
  {
    id: "2ef16b34-ab06-4123-ae66-4a1a01782641",
    tieu_de: "RAW (File ảnh)",
    tieu_de_viet: "Định dạng file RAW",
    tom_tat:
      "RAW là định dạng file ảnh thô chứa toàn bộ dữ liệu từ cảm biến máy ảnh — mang lại khả năng chỉnh sửa màu sắc và ánh sáng tốt hơn so với JPEG nén lossy.",
    meta_title: "RAW là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "RAW file ảnh. Tìm hiểu CR2, ARW, DNG, NEF, workflow Lightroom và lý do nhiếp ảnh gia chuyên nghiệp dùng RAW.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nhiếp ảnh gia chụp wedding outdoor — bride exposure correct nhưng background sky cháy trắng (overexposed). JPEG: information lost vĩnh viễn. RAW: tất cả pixel data preserved — Lightroom recover detail từ sky, balance exposure. Đó là power of <strong>RAW</strong> — workflow standard cho mọi pro photographer. Loss-less editing flexibility.</p>
  <p>RAW là kiến thức essential cho mọi photographer, video colorist. Hiểu RAW format, processing workflow, advantages vs JPEG giúp capture maximum image quality, recover image trong post. Critical cho professional photography và serious enthusiast.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>RAW là gì?</h2>
  <p>RAW là <strong>file format containing raw sensor data</strong> from camera — uncompressed (or losslessly compressed) data straight from CCD/CMOS sensor. Unlike <strong>JPEG</strong> (camera processes, compresses, throws away data), RAW preserves <strong>full bit depth</strong> (12-14 bit vs 8 bit JPEG), <strong>full dynamic range</strong>, <strong>flexible white balance</strong>, <strong>flexible exposure</strong>. Must process trong RAW converter (Lightroom, Capture One) trước khi share.</p>
  <p>Each camera manufacturer has proprietary RAW format: <strong>CR2/CR3</strong> (Canon), <strong>NEF</strong> (Nikon), <strong>ARW</strong> (Sony), <strong>RAF</strong> (Fuji), <strong>ORF</strong> (Olympus). <strong>DNG</strong> (Digital Negative, Adobe) — open standard cho long-term archival. Adobe Lightroom convert proprietary to DNG cho future-proof.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">RAW vs JPEG</span>
    <p><strong>RAW</strong>: 12-14 bit, all sensor data, large file (~25-50MB), need processing. Flexible edit. <strong>JPEG</strong>: 8 bit, processed in camera, compressed (3-8MB), ready to share. Limited edit. RAW: edit, then export JPEG. JPEG only: limited edit window.</p>
  </div>

  <ul class="arc-list">
    <li><strong>CR2 / CR3</strong> — Canon RAW</li>
    <li><strong>NEF</strong> — Nikon RAW</li>
    <li><strong>ARW</strong> — Sony RAW</li>
    <li><strong>RAF</strong> — Fuji RAW</li>
    <li><strong>DNG</strong> — Adobe open standard</li>
    <li><strong>Bit Depth</strong> — 12-14 bit RAW vs 8 bit JPEG</li>
    <li><strong>Dynamic Range</strong> — wider in RAW</li>
    <li><strong>White Balance</strong> — adjustable in RAW</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"RAW file photography lightroom camera professional"</span>
    </div>
    <p class="arc-image-caption">RAW — sensor data thô, flexibility edit cho pro photographer</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Ưu điểm RAW</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Bit Depth Cao</summary>
      <div class="arc-card-body">
        <p>RAW 12-14 bit per channel = 4096-16384 tonal value. JPEG 8 bit = 256. Smooth gradient, no banding. Critical cho sky, skin tone.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dynamic Range</summary>
      <div class="arc-card-body">
        <p>Recover shadow detail, recover highlight (within limit). JPEG clip — data gone forever. RAW: ±2-3 stop exposure recovery.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>White Balance Flexible</summary>
      <div class="arc-card-body">
        <p>Adjust temperature in post freely. JPEG baked-in. RAW: tungsten → daylight → fluorescent shift without quality loss.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sharpening Optional</summary>
      <div class="arc-card-body">
        <p>JPEG sharpened in-camera (sometimes over-sharpened). RAW: apply sharpening trong post precisely.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Noise Reduction</summary>
      <div class="arc-card-body">
        <p>RAW: noise reduction algorithm có more data to work with. Better result. JPEG: data already reduced, less recovery.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lens Correction</summary>
      <div class="arc-card-body">
        <p>Distortion, vignetting correction better trong RAW. Modern Lightroom có lens profile per lens.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Non-destructive Editing</summary>
      <div class="arc-card-body">
        <p>Lightroom edit metadata only — original RAW untouched. Re-edit anytime. Future processing better algorithm.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow RAW</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Shoot RAW</h3>
    <ul class="arc-list">
      <li>Camera setting RAW or RAW+JPEG</li>
      <li>Larger storage need (50MB/photo)</li>
      <li>Fast SD card</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Import to Lightroom</h3>
    <ul class="arc-list">
      <li>Lightroom catalog organize</li>
      <li>Star rating, keyword</li>
      <li>Backup multiple drive</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Basic Edits</h3>
    <ul class="arc-list">
      <li>White balance</li>
      <li>Exposure</li>
      <li>Contrast</li>
      <li>Highlight, Shadow</li>
      <li>Whites, Blacks</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Color Grade</h3>
    <ul class="arc-list">
      <li>HSL panel</li>
      <li>Tone Curve</li>
      <li>Color Grading wheel</li>
      <li>Apply preset</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Detail</h3>
    <ul class="arc-list">
      <li>Sharpening</li>
      <li>Noise reduction</li>
      <li>Lens correction</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Local Adjustment</h3>
    <ul class="arc-list">
      <li>Mask area</li>
      <li>Brush selective edit</li>
      <li>Graduated filter sky</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Export</h3>
    <ul class="arc-list">
      <li>JPEG cho client/web</li>
      <li>TIFF cho print high quality</li>
      <li>Resize, sharpen for output</li>
      <li>Color profile (sRGB web, AdobeRGB print)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Archive RAW</h3>
    <ul class="arc-list">
      <li>Keep RAW long-term</li>
      <li>Future re-edit possible</li>
      <li>Backup multi-location</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Software</h2>
  <ul class="arc-list">
    <li><strong>Adobe Lightroom</strong> — most popular RAW editor</li>
    <li><strong>Capture One</strong> — pro alternative, fuji/phase one favorite</li>
    <li><strong>DxO PhotoLab</strong> — noise reduction excellent</li>
    <li><strong>Affinity Photo</strong> — one-time purchase option</li>
    <li><strong>Storage</strong>: RAW takes 5-10x more space than JPEG, plan accordingly</li>
    <li><strong>Shoot RAW + JPEG</strong> — backup if RAW corrupt, quick share JPEG</li>
    <li><strong>RAW video</strong> too — REDcode, ProRes RAW, BRAW for cinema</li>
    <li><strong>DNG convert</strong> for long-term archival future-proof</li>
    <li><strong>Action photography</strong>: RAW+JPEG, JPEG for speed, RAW backup</li>
    <li><strong>RAW essential cho</strong>: wedding, landscape, portrait, commercial</li>
  </ul>
</section>
`,
  },

  // 05. Raw footage
  {
    id: "588f6d0b-a66f-4f40-b587-8629aa75f4a3",
    tieu_de: "Raw Footage",
    tieu_de_viet: "Footage thô (Raw Footage)",
    tom_tat:
      "Raw Footage là cảnh quay thô chưa được chỉnh sửa hoặc xử lý — nguồn tài nguyên chính để biên tập và hoàn thiện sản phẩm video cuối cùng — bao gồm video RAW từ cinema camera.",
    meta_title: "Raw Footage là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Raw Footage trong video production. Tìm hiểu RED REDcode, BRAW, ProRes RAW, workflow editing và archival.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn cinematographer shoot indie film — RED Komodo camera, REDcode RAW. Each clip 200-500MB per minute, full sensor data preserved. Editor download terabyte of footage. Colorist later transform raw flat footage thành cinematic look. <strong>Raw Footage</strong> = foundation cho premium video production. Same concept như photo RAW, applied to motion picture.</p>
  <p>Raw Footage là kiến thức essential cho cinematographer, video editor, colorist. Hiểu RAW video format, storage requirement, workflow giúp work với cinema-grade footage. Critical cho indie film, music video, commercial production aiming for premium quality.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Raw Footage là gì?</h2>
  <p>Raw Footage có hai nghĩa: <strong>narrow technical</strong> — RAW video format từ cinema camera (REDcode, BRAW, ProRes RAW, ARRIRAW) — sensor data preserved like photo RAW. <strong>Broad term</strong> — unedited, unprocessed video clip from any camera (regardless RAW format hay không). Common usage: raw footage = whatever came from camera, untouched in edit.</p>
  <p>RAW video format advantage: <strong>color grading flexibility</strong> (similar photo RAW), <strong>high dynamic range</strong>, <strong>debayer in post</strong> (sensor pattern interpret later), <strong>noise reduction options</strong>. Disadvantage: <strong>massive file size</strong> (10x compressed footage), <strong>processing intensive</strong> (need powerful workstation), <strong>proxy workflow essential</strong>.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">RAW Video vs Log Footage vs Standard</span>
    <p><strong>RAW Video</strong>: full sensor data, maximum flexibility. <strong>Log Footage</strong> (S-Log, C-Log, Rec.709): wider dynamic range than standard, less than RAW. <strong>Standard / Rec.709</strong>: baked color, ready to use. RAW heaviest data, Log middle, Standard lightest. Choose based on grading need.</p>
  </div>

  <ul class="arc-list">
    <li><strong>REDcode RAW</strong> — RED camera</li>
    <li><strong>BRAW</strong> — Blackmagic RAW</li>
    <li><strong>ProRes RAW</strong> — Apple format</li>
    <li><strong>ARRIRAW</strong> — ARRI cinema camera</li>
    <li><strong>Cinema DNG</strong> — Adobe standard</li>
    <li><strong>Debayer</strong> — sensor pattern interpretation</li>
    <li><strong>Compression Ratio</strong> — RAW compression level</li>
    <li><strong>Bit Depth</strong> — 12-16 bit cinema</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"raw footage cinema camera RED ARRI blackmagic video"</span>
    </div>
    <p class="arc-image-caption">Raw Footage — unprocessed video, foundation cho premium production</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>RAW Video Formats</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>REDcode RAW (.r3d)</summary>
      <div class="arc-card-body">
        <p>RED Digital Cinema. Industry pioneer. 4K-8K RAW. Compression 3:1 to 22:1 (smaller higher compression). Used cho many film, music video. Expensive camera.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>BRAW (Blackmagic RAW)</summary>
      <div class="arc-card-body">
        <p>Blackmagic Design proprietary. Compressed RAW. Free workflow trong DaVinci Resolve. Affordable cinema camera democratize RAW. Compression 3:1 to 12:1.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>ProRes RAW</summary>
      <div class="arc-card-body">
        <p>Apple format. Atomos recorder common. Wide camera compatibility. Final Cut Pro X native support. iPhone Pro can record ProRes RAW.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>ARRIRAW</summary>
      <div class="arc-card-body">
        <p>ARRI Alexa premier cinema camera. Highest-end format. Used Marvel film, blockbuster. Massive file size.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cinema DNG</summary>
      <div class="arc-card-body">
        <p>Adobe open standard. Blackmagic camera support. Smaller adoption.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sony X-OCN (XAVC)</summary>
      <div class="arc-card-body">
        <p>Sony cinema RAW alternative. Smaller files than ProRes RAW. VENICE camera.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Raw Footage</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. On Set</h3>
    <ul class="arc-list">
      <li>Camera record RAW</li>
      <li>Large SSD storage on camera</li>
      <li>DIT (Digital Imaging Technician) backup card</li>
      <li>Multiple copy essential</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Ingest</h3>
    <ul class="arc-list">
      <li>Transfer card to RAID/SAN storage</li>
      <li>Multiple backup</li>
      <li>Naming convention strict</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Generate Proxy</h3>
    <ul class="arc-list">
      <li>RAW too heavy for edit</li>
      <li>Generate ProRes 422 LT proxy</li>
      <li>Edit on proxy</li>
      <li>Auto-link to RAW at export</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Edit (Premiere/Resolve)</h3>
    <ul class="arc-list">
      <li>Cut với proxy</li>
      <li>Locked picture</li>
      <li>Conform RAW</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Color Grade</h3>
    <ul class="arc-list">
      <li>DaVinci Resolve standard</li>
      <li>Apply RAW debayer setting</li>
      <li>Develop look</li>
      <li>Take advantage of RAW flexibility</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. VFX</h3>
    <ul class="arc-list">
      <li>VFX shot delivered as RAW or EXR</li>
      <li>Composite with full sensor data</li>
      <li>Premier quality result</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Final Output</h3>
    <ul class="arc-list">
      <li>Master ProRes 4444 XQ</li>
      <li>DCP for theatrical</li>
      <li>H.264/H.265 for streaming</li>
      <li>Various deliverable format</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Archive</h3>
    <ul class="arc-list">
      <li>RAW preserved LTO tape</li>
      <li>Long-term storage</li>
      <li>Future re-grade, re-VFX possible</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Raw Footage</h2>
  <ul class="arc-list">
    <li><strong>Storage huge</strong> — plan 100GB-1TB+ per project day</li>
    <li><strong>RAID essential</strong> — performance + redundancy</li>
    <li><strong>Proxy workflow critical</strong> — RAW unplayable real-time on most machine</li>
    <li><strong>Color grading benefit</strong> — biggest advantage RAW</li>
    <li><strong>Test compression ratio</strong> — vs quality tradeoff</li>
    <li><strong>Hardware</strong> — fast CPU/GPU, lots of RAM (32-64GB), SSD storage</li>
    <li><strong>Backup multi-location</strong> — 3-2-1 backup rule (3 copy, 2 media, 1 offsite)</li>
    <li><strong>RAW not always necessary</strong> — Log footage often sufficient cho non-theatrical</li>
    <li><strong>Blackmagic affordable RAW</strong> — democratized format</li>
    <li><strong>Cloud storage</strong> — too slow for RAW typically, use local</li>
  </ul>
</section>
`,
  },

  // 06. Ray tracing
  {
    id: "f698779a-d552-495c-8806-94c220b3d164",
    tieu_de: "Ray Tracing",
    tieu_de_viet: "Công nghệ Ray Tracing",
    tom_tat:
      "Ray Tracing là kỹ thuật dựng hình mô phỏng đường đi của tia sáng để tạo các hiệu ứng ánh sáng, phản chiếu và bóng đổ cực kỳ chân thực — foundation cho VFX film và modern game.",
    meta_title: "Ray Tracing là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Ray Tracing trong VFX, game. Tìm hiểu RTX, path tracing, real-time ray tracing và workflow render engines.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Pixar film Toy Story 4 — woody&apos;s plastic sheen, glass cabinet reflection, soft shadow. Hoặc play Cyberpunk 2077 RTX on — neon Night City reflect puddle, glass window. Đó là <strong>Ray Tracing</strong> — kỹ thuật rendering simulate light physics. NVIDIA RTX (2018) brought real-time ray tracing đến gaming, revolutionary. Film VFX used decade earlier offline.</p>
  <p>Ray Tracing là kiến thức essential cho 3D artist, VFX artist, game developer. Hiểu nguyên lý, software implementation (Cycles, Arnold, RTX), workflow giúp create photorealistic image. Future direction cho rendering — real-time ray tracing democratizing premium graphic.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Ray Tracing là gì?</h2>
  <p>Ray Tracing là <strong>rendering technique</strong> simulate light by <strong>tracing ray</strong> từ camera vào scene, ngược lại with light source. Each ray bounce off surface, interact với material, contribute to pixel color. Compared với <strong>rasterization</strong> (project geometry to screen, faster but simpler), ray tracing produces <strong>physically accurate</strong> reflection, refraction, soft shadow, global illumination.</p>
  <p><strong>Offline ray tracing</strong> (decades old) — film VFX, archviz, animation feature. Render time minutes-hours per frame, photorealistic result. <strong>Real-time ray tracing</strong> (2018+) — NVIDIA RTX, AMD RDNA2 dedicated hardware. Game performance enabled with hybrid rasterize + ray trace. Continued evolve.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Ray Tracing vs Path Tracing vs Rasterization</span>
    <p><strong>Rasterization</strong>: traditional fast 3D render, less accurate. <strong>Ray Tracing</strong>: trace ray, accurate reflection/shadow, moderate cost. <strong>Path Tracing</strong>: ray tracing với many bounce (global illumination), most accurate, most expensive. Modern render engine often combine. Cycles, Arnold are path tracer.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Ray</strong> — line traced from camera</li>
    <li><strong>Bounce</strong> — ray hit surface, reflect</li>
    <li><strong>Path Tracing</strong> — multi-bounce ray tracing</li>
    <li><strong>Global Illumination</strong> — indirect light</li>
    <li><strong>Caustics</strong> — focused light pattern</li>
    <li><strong>Denoising</strong> — clean noisy ray trace</li>
    <li><strong>RTX</strong> — NVIDIA hardware ray tracing</li>
    <li><strong>DLSS</strong> — AI upscale support RTX</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"ray tracing RTX render path tracing reflection lighting"</span>
    </div>
    <p class="arc-image-caption">Ray Tracing — simulate light physics, photorealistic rendering</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Render Engines Ray Tracing</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Arnold (Autodesk)</summary>
      <div class="arc-card-body">
        <p>Industry standard for VFX, animation feature. Path tracer. Used Marvel film, Pixar partially. Maya, 3ds Max integrated.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>RenderMan (Pixar)</summary>
      <div class="arc-card-body">
        <p>Pixar&apos;s in-house. Decades industry standard. Hybrid REYES + path trace modern. All Pixar film, many VFX.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>V-Ray (Chaos)</summary>
      <div class="arc-card-body">
        <p>Archviz standard. Maya, 3ds Max, Cinema 4D. Photorealistic interior render. Long history, mature.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cycles (Blender)</summary>
      <div class="arc-card-body">
        <p>Blender&apos;s path tracer. Free, open-source. Quality competitive. GPU accelerated.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Redshift (Maxon)</summary>
      <div class="arc-card-body">
        <p>GPU path tracer. Fast. Motion graphics, Cinema 4D popular. Less photorealistic than Arnold for film.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Octane (OTOY)</summary>
      <div class="arc-card-body">
        <p>GPU path tracer. Subscription. Fast, beautiful. Used motion designer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unreal Engine 5 — Lumen + Hardware Ray Tracing</summary>
      <div class="arc-card-body">
        <p>Lumen software GI plus hardware RT. Game/Virtual Production real-time photorealistic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Game Engine RTX</summary>
      <div class="arc-card-body">
        <p>Cyberpunk 2077, Control, Quake II RTX. Hybrid raster + ray trace. Performance challenging but stunning visual.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Use Cases Ray Tracing</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX Film</h3>
    <ul class="arc-list">
      <li>Marvel CGI character</li>
      <li>Realistic creature</li>
      <li>Photorealistic explosion</li>
      <li>Offline render, hours per frame</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation Feature</h3>
    <ul class="arc-list">
      <li>Pixar, DreamWorks all path trace now</li>
      <li>Subsurface scattering (skin)</li>
      <li>Global illumination</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Archviz</h3>
    <ul class="arc-list">
      <li>Photorealistic interior</li>
      <li>Marketing material</li>
      <li>Pre-construction visualization</li>
      <li>V-Ray, Corona standard</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game RTX</h3>
    <ul class="arc-list">
      <li>Real-time reflection</li>
      <li>Soft shadow</li>
      <li>Global illumination</li>
      <li>Cyberpunk 2077, Alan Wake 2</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Automotive Visualization</h3>
    <ul class="arc-list">
      <li>Car paint realistic</li>
      <li>Showroom render</li>
      <li>Marketing image</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Product Visualization</h3>
    <ul class="arc-list">
      <li>E-commerce product</li>
      <li>Replace photography</li>
      <li>Customize material easily</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Future</h2>
  <ul class="arc-list">
    <li><strong>Sampling</strong> — more sample = less noise but slower</li>
    <li><strong>Denoising</strong> — AI-based denoise critical efficiency</li>
    <li><strong>GPU vs CPU</strong> — GPU usually faster, more memory required</li>
    <li><strong>Cycles GPU</strong> — Blender free option</li>
    <li><strong>Distributed rendering</strong> — render farm essential VFX</li>
    <li><strong>RTX hardware</strong>: NVIDIA RTX 4070+, RT cores accelerate</li>
    <li><strong>DLSS / FSR upscaling</strong> — render lower, upscale, free performance</li>
    <li><strong>Path tracing trend</strong> — full path trace become viable real-time (Indiana Jones MachineGames)</li>
    <li><strong>Career VFX render artist</strong> — $70K-150K</li>
    <li><strong>Future</strong>: real-time path tracing standard 5-10 years, game industry transformation</li>
  </ul>
</section>
`,
  },

  // 07. Raycasting
  {
    id: "c7488c7f-f8d5-433f-a43b-1e3764948779",
    tieu_de: "Raycasting",
    tieu_de_viet: "Thuật toán Raycasting",
    tom_tat:
      "Raycasting là thuật toán đồ họa máy tính dò tia — kiểm tra tia từ điểm xuất phát có va chạm với vật thể nào trong không gian 3D không — foundation cho ray tracing, game logic, click detection.",
    meta_title: "Raycasting là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Raycasting trong game development. Tìm hiểu hit detection, line of sight, mouse picking và workflow Unity, Unreal.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn play FPS — point gun, shoot. Bullet travel straight, hit enemy or wall. Behind scene: <strong>Raycasting</strong> — game cast ray từ gun position theo aim direction, check first object intersected → hit. Hoặc click 3D object trong editor — raycast từ mouse position into 3D scene, find object clicked. Foundation algorithm cho countless game/3D interaction.</p>
  <p>Raycasting là kiến thức essential cho game developer, 3D programmer. Hiểu algorithm, performance, use cases giúp implement core game mechanic — shooting, click detection, AI line of sight. Critical kỹ năng cho mọi game development.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Raycasting là gì?</h2>
  <p>Raycasting là <strong>computer graphics algorithm</strong> kiểm tra ray (line segment) collide với gì trong 3D scene. Input: <strong>ray origin</strong> (start point) + <strong>direction vector</strong>. Output: <strong>hit information</strong> — what hit, where (3D position), at what distance, normal of surface hit. Foundation cho ray tracing rendering nhưng cũng widely used cho non-render purpose.</p>
  <p>Different from <strong>ray tracing rendering</strong> — raycasting is general technique, ray tracing applies recursively for visual rendering. Raycasting trong game: <strong>hit detection</strong> (bullet, projectile), <strong>line of sight</strong> (can AI see player?), <strong>mouse picking</strong> (click 3D object), <strong>collision query</strong> (will path collide?), <strong>line tracing</strong> (laser sight).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Raycast vs Linetrace vs Collision</span>
    <p><strong>Raycast</strong>: ray infinite or with max distance. <strong>Linetrace</strong>: line segment between two point. <strong>Collision</strong>: full physics collision. Raycast cheapest, collision most expensive. Choose based on need. Game often raycast cho query.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Ray Origin</strong> — start point</li>
    <li><strong>Direction Vector</strong> — where ray points</li>
    <li><strong>Hit Result</strong> — collision data</li>
    <li><strong>Max Distance</strong> — ray length limit</li>
    <li><strong>Layer Mask</strong> — what to detect</li>
    <li><strong>Hit Point</strong> — 3D collision position</li>
    <li><strong>Hit Normal</strong> — surface direction</li>
    <li><strong>Single / Multi Cast</strong> — first or all hits</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"raycasting game development hit detection line trace unity unreal"</span>
    </div>
    <p class="arc-image-caption">Raycasting — query algorithm fundamentals cho game 3D interaction</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Use Cases Raycasting</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Bullet / Projectile</summary>
      <div class="arc-card-body">
        <p>FPS hitscan weapon. Cast ray from gun direction. First enemy hit = damage. Fast, cheap. Most FPS use hitscan + optional projectile drop.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mouse Picking</summary>
      <div class="arc-card-body">
        <p>Click 3D object — convert mouse screen position to ray in 3D scene. Cast, find object hit. Editor tool, RTS unit select.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>AI Line of Sight</summary>
      <div class="arc-card-body">
        <p>Can enemy see player? Cast ray from enemy eye toward player. If hit anything before player = blocked. Stealth game critical.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ground Check</summary>
      <div class="arc-card-body">
        <p>Character on ground? Cast ray downward from feet. Hit ground within distance = grounded. Enable jump, fall animation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Interaction Prompt</summary>
      <div class="arc-card-body">
        <p>Cast ray from camera forward. Hit interactable object → show &quot;Press E to use&quot; prompt. RPG, adventure game.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Wall Hugging / Cover</summary>
      <div class="arc-card-body">
        <p>Cast ray cho find wall, position character against. Third-person shooter cover system.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Foot IK (Inverse Kinematics)</summary>
      <div class="arc-card-body">
        <p>Cast ray from foot down. Hit point = ground position. Adjust foot trên uneven terrain.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Laser Sight</summary>
      <div class="arc-card-body">
        <p>Visualize ray from gun. Hit first object, draw dot. Common in shooter.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Implementation</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unity</h3>
    <ul class="arc-list">
      <li>Physics.Raycast(origin, direction, hitInfo, distance)</li>
      <li>Layer mask for filter</li>
      <li>2D version Physics2D.Raycast</li>
      <li>Return bool, hitInfo struct</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unreal Engine</h3>
    <ul class="arc-list">
      <li>LineTraceByChannel (BP and C++)</li>
      <li>Channel-based filtering</li>
      <li>FHitResult struct</li>
      <li>Variants: Box, Sphere, Capsule trace</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Godot</h3>
    <ul class="arc-list">
      <li>get_world_3d().direct_space_state.intersect_ray</li>
      <li>PhysicsRayQueryParameters3D</li>
      <li>Returns Dictionary with collision data</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Custom Engine</h3>
    <ul class="arc-list">
      <li>Implement BVH (Bounding Volume Hierarchy)</li>
      <li>Octree, KD-tree spatial structure</li>
      <li>Ray vs triangle intersection math</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Three.js (Web)</h3>
    <ul class="arc-list">
      <li>Raycaster class</li>
      <li>setFromCamera() for mouse</li>
      <li>intersectObjects() return hit list</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Performance Optimization</h3>
    <ul class="arc-list">
      <li>Spatial partitioning (BVH, octree)</li>
      <li>Layer mask reduce object check</li>
      <li>Max distance limit</li>
      <li>Avoid per-frame multiple cast</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Raycasting</h2>
  <ul class="arc-list">
    <li><strong>Layer mask</strong> — filter cho only relevant collider speeds up</li>
    <li><strong>Distance limit</strong> — don&apos;t cast infinite if not need</li>
    <li><strong>Cache hit result</strong> — don&apos;t recast same frame</li>
    <li><strong>Multi-cast trade-off</strong> — RaycastAll slower than single</li>
    <li><strong>Debug visualize</strong> — Debug.DrawRay (Unity), DrawDebugLine (Unreal)</li>
    <li><strong>2D raycast available</strong> — for top-down/side-scroller game</li>
    <li><strong>Sphere cast / Capsule cast</strong> — fatter than line, catch grazing hit</li>
    <li><strong>Continuous detection</strong> — fast object skip thin collider, use sphere cast</li>
    <li><strong>FPS game consideration</strong> — server-authoritative raycast cho anti-cheat</li>
    <li><strong>Education resource</strong>: Game AI Pro chapter, Unity/Unreal documentation</li>
  </ul>
</section>
`,
  },

  // 08. Realistic
  {
    id: "f126d47c-6ed7-403c-9f09-34b4547ed9c1",
    tieu_de: "Realistic Art Style",
    tieu_de_viet: "Phong cách đồ họa Realistic",
    tom_tat:
      "Realistic là phong cách đồ họa mô phỏng thế giới thực một cách chi tiết và chính xác — thường dùng cho game AAA, phim bom tấn, archviz, automotive visualization.",
    meta_title:
      "Realistic Art Style là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Phong cách Realistic trong game, VFX. Tìm hiểu photorealism, hyperrealism, near-realism và workflow PBR, ray tracing.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Marvel film — Iron Man suit indistinguishable from real metal. Play The Last of Us Part II — Ellie face express emotion realistic. Drive Forza Motorsport — car gloss reflect environment. Đó là <strong>Realistic Art Style</strong> — visual approach simulate reality. Modern AAA game, blockbuster film standard. Yêu cầu technical knowledge sâu, expensive production.</p>
  <p>Realistic style là phong cách chiếm dominant share modern AAA production. Hiểu workflow, technical requirements, comparison với stylized art giúp navigate career choice — realistic studio nature different from stylized indie. Critical knowledge cho serious creative professional.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Realistic Art Style là gì?</h2>
  <p>Realistic art style là <strong>visual approach</strong> mục tiêu mô phỏng <strong>physical reality</strong> as accurately as possible. Character, environment, object look believable, photo-realistic. Includes accurate <strong>anatomy</strong>, <strong>physics</strong>, <strong>lighting</strong>, <strong>material</strong>. Contrast với <strong>stylized</strong> (Pixar, Fortnite — exaggerated, simplified, artistic).</p>
  <p>Spectrum within realistic: <strong>Near-realistic</strong> (idealized but believable — Naughty Dog game), <strong>Photorealistic</strong> (indistinguishable from photo — Pixar later film, Marvel CGI), <strong>Hyperrealistic</strong> (more detail than reality — extreme texture, weathering), <strong>Cinematic Realistic</strong> (real with cinematic lens, grade — most films). Each variant different production approach.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Realistic vs Stylized</span>
    <p><strong>Realistic</strong>: simulate reality, photorealistic. Expensive production. Anatomy/physics accurate. <strong>Stylized</strong>: exaggerated, simplified, artistic. Different efficient. Both legitimate — choice depends on project vision. Don&apos;t consider realistic &quot;better&quot; — different goal entirely.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Photorealistic</strong> — looks like photo</li>
    <li><strong>Hyperrealistic</strong> — beyond real detail</li>
    <li><strong>PBR Material</strong> — physically based</li>
    <li><strong>Ray Tracing</strong> — accurate lighting</li>
    <li><strong>Photogrammetry</strong> — capture real surface</li>
    <li><strong>Motion Capture</strong> — real movement data</li>
    <li><strong>Subsurface Scattering</strong> — skin realism</li>
    <li><strong>Uncanny Valley</strong> — realistic enough creep</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"realistic art style game AAA photorealism rendering"</span>
    </div>
    <p class="arc-image-caption">Realistic Style — mô phỏng reality, AAA studio standard</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Realistic Sub-Styles</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Near-Realistic</summary>
      <div class="arc-card-body">
        <p>Idealized but believable. The Last of Us, Cyberpunk 2077. Character&apos;s slightly idealized features but feel real. Most AAA game choice.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photorealistic</summary>
      <div class="arc-card-body">
        <p>Indistinguishable from photograph at typical viewing distance. Pixar later film (Toy Story 4), Marvel CGI. Expensive offline render. Approaching real-time với Unreal 5.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hyperrealistic</summary>
      <div class="arc-card-body">
        <p>Even more detail than reality. Every pore, wrinkle, weathering exaggerated. ZBrush sculpt detail. Often character close-up.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cinematic Realistic</summary>
      <div class="arc-card-body">
        <p>Real footage with cinematic processing — film grain, lens character, color grade. Most Hollywood film. Realistic but with artistic interpretation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Documentary Realistic</summary>
      <div class="arc-card-body">
        <p>Stripped of cinematic flourish — naturalistic. Indie film. Like reality with minimal manipulation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sci-Fi Realistic</summary>
      <div class="arc-card-body">
        <p>Real-world physics applied to fictional setting. Star Wars realistic technology, even alien. Establish believable rule.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fantasy Realistic</summary>
      <div class="arc-card-body">
        <p>Realistic execution của fantasy world. Lord of the Rings, Game of Thrones. Detailed costume, sets, character.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Realistic Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Reference Heavy</h3>
    <ul class="arc-list">
      <li>Photo reference critical</li>
      <li>Hundreds reference per asset</li>
      <li>Anatomy book essential</li>
      <li>PureRef organize</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">High-Poly Modeling</h3>
    <ul class="arc-list">
      <li>ZBrush sculpt detail</li>
      <li>Photogrammetry source possible</li>
      <li>Millions polygon detailed asset</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">PBR Texturing</h3>
    <ul class="arc-list">
      <li>Substance Painter standard</li>
      <li>Quixel Megascans library</li>
      <li>Albedo, roughness, metallic, normal</li>
      <li>Physically accurate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Ray-traced Rendering</h3>
    <ul class="arc-list">
      <li>Arnold, V-Ray, Cycles</li>
      <li>Path tracing global illumination</li>
      <li>HDRI lighting</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Capture</h3>
    <ul class="arc-list">
      <li>Realistic character animation</li>
      <li>Facial capture for expression</li>
      <li>Reference real movement</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Subsurface Scattering</h3>
    <ul class="arc-list">
      <li>Skin realism critical</li>
      <li>Light penetrate skin layer</li>
      <li>Avoid waxy fake look</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Compositing &amp; Grading</h3>
    <ul class="arc-list">
      <li>Nuke compositing</li>
      <li>DaVinci color grade</li>
      <li>Match film look</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">QC Iteration</h3>
    <ul class="arc-list">
      <li>Multi-pass review</li>
      <li>Tiny detail matter</li>
      <li>Easy break believability</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Reference master</strong> — pro realistic artist photograph constantly</li>
    <li><strong>Subtle imperfection</strong> — perfectly clean = fake. Add wear, dirt</li>
    <li><strong>Light direction obvious</strong> — match across all element</li>
    <li><strong>Avoid uncanny valley</strong> — character realistic enough still &quot;off&quot; = creep</li>
    <li><strong>Photogrammetry &amp; megascans</strong> — instant realism</li>
    <li><strong>Real-time approach</strong> — Unreal 5 Lumen Nanite revolutionizing</li>
    <li><strong>AAA Studios</strong>: Naughty Dog, Rockstar, CD Projekt Red</li>
    <li><strong>VFX</strong>: ILM, Weta, MPC, DNEG</li>
    <li><strong>Career</strong>: realistic studio artist $70K-150K, lead $150K+</li>
    <li><strong>Crowded space</strong> — every studio wants realistic, competition intense</li>
  </ul>
</section>
`,
  },

  // 09. Render
  {
    id: "515a6bee-9305-4d92-9960-fdb3b3101cee",
    tieu_de: "Render",
    tieu_de_viet: "Render trong 3D",
    tom_tat:
      "Render là quá trình tính toán và tạo ra hình ảnh cuối cùng từ dữ liệu 3D — bao gồm ánh sáng, vật liệu và các hiệu ứng phức tạp — phase critical cho output 3D project.",
    meta_title: "Render là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Render trong 3D, animation, VFX. Tìm hiểu render engine (Arnold, V-Ray, Cycles), render farm và workflow tối ưu.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn 3D artist hoàn thành scene Blender — model, texture, light, camera done. Bấm F12 — black screen, progress bar. <strong>Render</strong> đang process — calculate light bounce, material, shadow per pixel. 30 minutes later — final image emerges. Đó là render — phase magic transform 3D data thành 2D image. Foundation cho mọi 3D output, từ poster đến animation feature.</p>
  <p>Render là kiến thức essential cho mọi 3D artist. Hiểu render engine options, settings, optimization, render farm giúp produce quality output efficiently. Critical cho game pre-render, animation feature, archviz, VFX. Render time = production cost.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Render là gì?</h2>
  <p>Render là <strong>process compute final image</strong> from 3D scene data (geometry, material, light, camera). Render engine traverse scene, calculate light interaction với surface, output pixel color cho mỗi pixel of image. Result: 2D image hoặc image sequence (for animation). Render time varies massively — seconds for simple to hours per frame for complex VFX.</p>
  <p>Two paradigm: <strong>Offline render</strong> (slow, high quality — VFX film, archviz, animation feature) typically minutes-hours per frame. <strong>Real-time render</strong> (fast, optimized cho game) milliseconds per frame. Bridge: <strong>real-time ray tracing</strong> (RTX) approach offline quality at near-real-time. Future direction.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Render Types</span>
    <p><strong>CPU Render</strong>: Arnold, RenderMan. Photorealistic, slow. <strong>GPU Render</strong>: Redshift, Octane. Fast, memory limited. <strong>Hybrid</strong>: Cycles, V-Ray. Both CPU/GPU. <strong>Real-time</strong>: Unreal Engine. Different quality/speed tradeoff.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Render Engine</strong> — software performs render</li>
    <li><strong>Path Tracing</strong> — modern rendering method</li>
    <li><strong>Samples</strong> — quality of ray trace</li>
    <li><strong>Denoising</strong> — AI clean noisy render</li>
    <li><strong>Render Farm</strong> — distributed rendering</li>
    <li><strong>Render Layer / Pass</strong> — separate output</li>
    <li><strong>Render Time</strong> — cost factor</li>
    <li><strong>Frame Range</strong> — animation frames</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"3D render arnold cycles vray engine final image"</span>
    </div>
    <p class="arc-image-caption">Render — process compute final image từ 3D data</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Render Engines</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Arnold (Autodesk)</summary>
      <div class="arc-card-body">
        <p>Industry VFX standard. CPU path tracer. Maya, 3ds Max integrated. Used Marvel, Pixar (partial). Photorealistic quality.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>V-Ray (Chaos)</summary>
      <div class="arc-card-body">
        <p>Archviz standard. CPU + GPU. Maya, 3ds Max, Cinema 4D. Long history, mature, photorealistic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cycles (Blender)</summary>
      <div class="arc-card-body">
        <p>Blender&apos;s built-in path tracer. Free. GPU accelerated. Competitive quality. Indie / hobbyist friendly.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Eevee (Blender)</summary>
      <div class="arc-card-body">
        <p>Real-time engine. Blender. Fast preview, decent final quality. Game-engine inspired.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>RenderMan (Pixar)</summary>
      <div class="arc-card-body">
        <p>Pixar&apos;s in-house, decades history. Free non-commercial. Used Pixar, many VFX studio.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Redshift (Maxon)</summary>
      <div class="arc-card-body">
        <p>GPU path tracer. Fast. Motion graphics popular. Subscription. Cinema 4D, Houdini.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Octane (OTOY)</summary>
      <div class="arc-card-body">
        <p>GPU path tracer. Subscription. Beautiful result. Motion designer favorite.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unreal Engine</summary>
      <div class="arc-card-body">
        <p>Real-time. Virtual production. Movie quality real-time với Lumen Nanite UE5.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Corona (Chaos)</summary>
      <div class="arc-card-body">
        <p>Archviz alternative to V-Ray. Easier learning curve. Photorealistic.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Render Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Scene Prep</h3>
    <ul class="arc-list">
      <li>Optimize geometry</li>
      <li>Proxy heavy asset</li>
      <li>Texture appropriate resolution</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Light Setup</h3>
    <ul class="arc-list">
      <li>HDRI environment</li>
      <li>Sun/key light</li>
      <li>Fill, rim light</li>
      <li>Match references</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Material Tuning</h3>
    <ul class="arc-list">
      <li>PBR setup</li>
      <li>Subsurface, transparency</li>
      <li>Test với reference</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Camera Setup</h3>
    <ul class="arc-list">
      <li>Focal length</li>
      <li>Depth of Field</li>
      <li>Motion blur</li>
      <li>Composition framing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Render Settings</h3>
    <ul class="arc-list">
      <li>Resolution (final size)</li>
      <li>Samples (quality)</li>
      <li>Denoising</li>
      <li>Output format (EXR for layered)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Test Render</h3>
    <ul class="arc-list">
      <li>Lower resolution first</li>
      <li>Iterate fast</li>
      <li>Find issue before commit full render</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Final Render</h3>
    <ul class="arc-list">
      <li>Full resolution</li>
      <li>All samples / passes</li>
      <li>Local or render farm</li>
      <li>Frame sequence for animation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Post-Processing</h3>
    <ul class="arc-list">
      <li>Composite render passes</li>
      <li>Color grade</li>
      <li>Effects polish</li>
      <li>Output final image/video</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Optimization</h2>
  <ul class="arc-list">
    <li><strong>Test cheap, finalize expensive</strong> — iterate low quality, render high once</li>
    <li><strong>Denoising AI</strong> — reduce samples needed dramatically</li>
    <li><strong>GPU memory</strong> — out-of-memory frustration, plan asset</li>
    <li><strong>Render Layer</strong> — separate element cho composite flexibility</li>
    <li><strong>Light cache / GI cache</strong> — speed up bounce</li>
    <li><strong>Distributed render</strong> — render farm save days</li>
    <li><strong>Cloud render</strong>: Render Street, GarageFarm, RebusFarm</li>
    <li><strong>Time estimate</strong>: simple still 30sec-5min, complex animation 1-10hr/frame</li>
    <li><strong>Power vs cost</strong>: GPU cheaper than render farm hour cho most case</li>
    <li><strong>Career</strong>: render TD $80K-150K, environment artist render-savvy valued</li>
  </ul>
</section>
`,
  },

  // 10. Render passes
  {
    id: "21b3b21c-1d61-4e09-bd38-8cc2e2d5da7e",
    tieu_de: "Render Passes",
    tieu_de_viet: "Render Passes (Lớp render)",
    tom_tat:
      "Render Passes là kỹ thuật render từng lớp (layer) riêng biệt của một cảnh — lớp màu, lớp bóng, ánh sáng, AO, ID — để dễ dàng chỉnh sửa hậu kỳ trong compositing.",
    meta_title:
      "Render Passes là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Render Passes trong 3D, VFX. Tìm hiểu AOV, beauty pass, AO, shadow, ID pass và workflow compositing chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn render scene 3D — beautiful final image. Client review: &quot;shadow too dark, lift shadow.&quot; Re-render entire scene? Hours wasted. Solution: <strong>Render Passes</strong> — separate passes (shadow pass, beauty pass, AO pass) đã render trước. Trong compositing app (Nuke, AE), adjust shadow pass intensity — instant tweak, no re-render. Production essential workflow.</p>
  <p>Render Passes là kỹ thuật critical cho VFX artist, 3D production. Hiểu AOV (Arbitrary Output Variable), workflow trong render engine, compositing pipeline giúp produce flexible production-ready output. Distinguish hobbyist render vs production workflow.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Render Passes là gì?</h2>
  <p>Render Passes (hoặc <strong>AOV — Arbitrary Output Variable</strong>) là kỹ thuật <strong>output multiple image layers</strong> from single render. Mỗi pass contains specific information — beauty (final combined), diffuse (color), specular (highlight), shadow, ambient occlusion (AO), depth (Z), normal, ID (object mask). Combine passes trong compositing với mathematical operation reconstruct beauty hoặc adjust specific element.</p>
  <p>Workflow benefit: <strong>flexibility</strong> (adjust shadow, color, AO independent), <strong>iteration speed</strong> (no re-render cho minor tweak), <strong>quality control</strong> (precise control mỗi element), <strong>VFX integration</strong> (composite với live action better). Standard cho film VFX, animation feature, archviz, high-end commercial work.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Common Render Passes</span>
    <p><strong>Beauty</strong>: combined final. <strong>Diffuse</strong>: surface color. <strong>Specular</strong>: highlight. <strong>Shadow</strong>: shadows only. <strong>AO</strong>: ambient occlusion. <strong>Z Depth</strong>: distance from camera. <strong>Normal</strong>: surface direction. <strong>ID / Cryptomatte</strong>: object ID for masking. <strong>Motion Vector</strong>: motion blur info. Combine through composite to reconstruct.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Beauty Pass</strong> — final combined</li>
    <li><strong>Diffuse Pass</strong> — color</li>
    <li><strong>Specular Pass</strong> — highlight</li>
    <li><strong>Shadow Pass</strong> — shadows isolated</li>
    <li><strong>AO Pass</strong> — ambient occlusion</li>
    <li><strong>Z Depth</strong> — distance map</li>
    <li><strong>Normal Pass</strong> — surface direction</li>
    <li><strong>Cryptomatte</strong> — object ID modern</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"render passes AOV compositing nuke beauty diffuse shadow"</span>
    </div>
    <p class="arc-image-caption">Render Passes — multiple layer output cho flexible compositing</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Pass Types Detail</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Beauty Pass</summary>
      <div class="arc-card-body">
        <p>Final combined image — what you see in render preview. All effect baked in. Sufficient cho simple use. Production use as reference, not always main output.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Diffuse Pass</summary>
      <div class="arc-card-body">
        <p>Direct color information. Surface albedo + diffuse lighting. Adjust independently — change color cast post-render.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Specular / Reflection Pass</summary>
      <div class="arc-card-body">
        <p>Highlight and reflection. Boost or reduce gloss without re-render. Critical cho metal, glass material adjustment.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Shadow Pass</summary>
      <div class="arc-card-body">
        <p>Shadows only. Lighten/darken shadow independent of overall. Lift shadow for less moody, darken for dramatic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ambient Occlusion (AO)</summary>
      <div class="arc-card-body">
        <p>Crevice darkening. Multiply with beauty for enhanced depth. Subtle increase realism.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Z Depth Pass</summary>
      <div class="arc-card-body">
        <p>Grayscale depth map. White near, black far. Use cho post-DOF (depth of field), atmospheric haze, fog.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Normal Pass</summary>
      <div class="arc-card-body">
        <p>RGB encoded surface normal. Reference cho compositor add relight or detail.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cryptomatte / ID Pass</summary>
      <div class="arc-card-body">
        <p>Object/material ID for masking. Cryptomatte modern standard — automatic, efficient. Mask any object trong composite.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Motion Vector</summary>
      <div class="arc-card-body">
        <p>Per-pixel motion data. Apply motion blur post-render, adjust intensity. ReelSmart Motion Blur compositing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Emission Pass</summary>
      <div class="arc-card-body">
        <p>Self-illuminated surface only. Adjust glow, neon independently.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Render Passes</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Setup AOV Trong Render Engine</h3>
    <ul class="arc-list">
      <li>Arnold: AOV Editor</li>
      <li>V-Ray: VFB Channels</li>
      <li>Cycles: View Layer + Passes</li>
      <li>Add required pass</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Output EXR Multi-Layer</h3>
    <ul class="arc-list">
      <li>EXR format hỗ trợ multi-layer single file</li>
      <li>32-bit float</li>
      <li>Preserve full data range</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Render</h3>
    <ul class="arc-list">
      <li>All passes generate simultaneously</li>
      <li>Slight extra time but huge benefit</li>
      <li>One file contains all layer</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Import to Compositor</h3>
    <ul class="arc-list">
      <li>Nuke (industry standard VFX)</li>
      <li>After Effects (motion graphics)</li>
      <li>Fusion (Resolve)</li>
      <li>EXR auto-load all layer</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Reconstruct Beauty</h3>
    <ul class="arc-list">
      <li>Add diffuse + specular + emission</li>
      <li>Multiply AO if separate</li>
      <li>Result should match original beauty</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Adjust Per Pass</h3>
    <ul class="arc-list">
      <li>Boost specular for glossier feel</li>
      <li>Lift shadow để brighter mood</li>
      <li>Tint diffuse for color shift</li>
      <li>Boost AO for depth</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Add Post-Effects</h3>
    <ul class="arc-list">
      <li>DOF using Z Depth</li>
      <li>Motion blur using motion vector</li>
      <li>Atmospheric haze using Z</li>
      <li>Color grade</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Composite VFX</h3>
    <ul class="arc-list">
      <li>Combine với live action plate</li>
      <li>Use cryptomatte mask</li>
      <li>Match grain, lens flare</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Best Practices</h2>
  <ul class="arc-list">
    <li><strong>EXR format</strong> — industry standard, multi-layer support</li>
    <li><strong>Cryptomatte</strong> — superior to old ID pass, use whenever possible</li>
    <li><strong>Z Depth</strong> — essential cho post DOF, fog</li>
    <li><strong>Storage</strong> — multi-layer EXR larger than JPG, plan storage</li>
    <li><strong>Naming convention</strong> — clear pass name important</li>
    <li><strong>Reconstruction test</strong> — verify passes combine = beauty original</li>
    <li><strong>Linear workflow</strong> — work in linear color space</li>
    <li><strong>Don&apos;t skip</strong> — render passes save countless re-render hour</li>
    <li><strong>Compositing skill</strong> — VFX career require comp knowledge</li>
    <li><strong>Career Compositor</strong> — $70K-150K, senior $200K+, Nuke expert in demand</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 3 · Batch 1 — chạy ${items.length} bài keyword (Q → Z) ──\n`,
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
