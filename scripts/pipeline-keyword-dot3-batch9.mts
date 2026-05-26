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
  // 01. Video Intro
  {
    id: "05f9073d-6392-47c8-bb25-bd1268bb1184",
    tieu_de: "Video Intro",
    tieu_de_viet: "Video Intro (Mở đầu video)",
    tom_tat:
      "Video Intro là đoạn giới thiệu đầu video thường ngắn hơn intro kênh — title card đơn giản, animation ngắn, hoặc teaser nội dung để giữ người xem không bỏ qua.",
    meta_title:
      "Video Intro là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Video Intro cho YouTube, content creator. Tìm hiểu workflow After Effects, template và best practice giữ retention.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn YouTube creator — first 5-15 second crucial. <strong>Video Intro</strong> giới thiệu nội dung hook viewer. Different from channel intro (longer brand identity), video intro specific cho từng episode. Short, punchy, preview content. Master video intro = retention boost. Foundation cho mọi YouTube channel professional.</p>
  <p>Video Intro là kỹ năng essential cho YouTuber, video editor, content creator. Hiểu structure, length, timing, software (After Effects, Premiere) giúp craft intro hook audience. Foundation cho channel growth modern content strategy.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Video Intro là gì?</h2>
  <p>Video Intro là <strong>short opening segment đầu video</strong>, thường 3-10 second. Function: hook viewer attention, preview content, brand identity. Different from <strong>Channel Intro</strong> (longer brand video reuse mọi episode). Video Intro specific cho video — teaser highlight, title card, hook moment. Modern YouTube best practice: skip long intro, jump straight into content with brief hook.</p>
  <p>Types: <strong>Title Card</strong> (simple text overlay), <strong>Teaser / Cold Open</strong> (snippet from later in video), <strong>Animated Logo Reveal</strong> (brand identity), <strong>Hook Moment</strong> (most exciting clip front-loaded). Modern trend: minimize intro length. MrBeast, viral creator skip intro entirely. Hook within 5 second.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Modern Intro Trend</span>
    <p><strong>2024 trend</strong>: shorter, hook-focused. 5 second hook. Skip long branded intro. Algorithm reward retention — long intro hurt watch time. Best: tease content, brief brand mention, dive into content immediately.</p>
  </div>

  <ul class="arc-list">
    <li><strong>3-10 Second</strong> — ideal length</li>
    <li><strong>Hook First</strong> — attention grab</li>
    <li><strong>Title Card</strong> — text overlay</li>
    <li><strong>Cold Open / Teaser</strong> — preview</li>
    <li><strong>Brand Identity</strong> — logo</li>
    <li><strong>Retention Focus</strong> — algorithm</li>
    <li><strong>Music / SFX</strong> — audio hook</li>
    <li><strong>Template Reuse</strong> — efficiency</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"video intro youtube cold open hook title card creator"</span>
    </div>
    <p class="arc-image-caption">Video Intro — hook viewer, retention foundation</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Intro Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Cold Open / Teaser</summary>
      <div class="arc-card-body">
        <p>Show exciting moment from later in video. 5 second snippet. Hook viewer stay. Pro YouTube standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hook Question</summary>
      <div class="arc-card-body">
        <p>&quot;What if I told you...&quot; opening. Provoke curiosity. Verbal hook.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Title Card</summary>
      <div class="arc-card-body">
        <p>Simple text title video. 2-3 second. Minimal but clear.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animated Logo</summary>
      <div class="arc-card-body">
        <p>Brand logo reveal animation. Reuse template. Quick brand identity.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Music Build-Up</summary>
      <div class="arc-card-body">
        <p>Music swell + visual reveal. Cinematic feel. Hollywood-style.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Statistics / Hook Fact</summary>
      <div class="arc-card-body">
        <p>&quot;30% of people don&apos;t know this trick...&quot; data-driven hook. Curiosity-baiting.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Quick Cut Montage</summary>
      <div class="arc-card-body">
        <p>Rapid edit preview content. Multiple shot quick. Energy-driven.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>No Intro (Direct Cut)</summary>
      <div class="arc-card-body">
        <p>MrBeast style — skip intro entirely. Algorithm-friendly. Maximum retention.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Create Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Plan Hook</h3>
    <ul class="arc-list">
      <li>Identify exciting moment</li>
      <li>Question hook</li>
      <li>Tease content value</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Choose Type</h3>
    <ul class="arc-list">
      <li>Cold open</li>
      <li>Title card</li>
      <li>Animated brand</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Open After Effects / Premiere</h3>
    <ul class="arc-list">
      <li>AE cho motion graphics</li>
      <li>Premiere cho simple cut</li>
      <li>Template start</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Animate / Edit</h3>
    <ul class="arc-list">
      <li>Title text animate</li>
      <li>Logo reveal</li>
      <li>Music sync</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Add Music / SFX</h3>
    <ul class="arc-list">
      <li>Royalty-free music</li>
      <li>Whoosh, impact SFX</li>
      <li>Sync timing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Test Length</h3>
    <ul class="arc-list">
      <li>5-10 second ideal</li>
      <li>Trim aggressive</li>
      <li>Remove dead time</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Render Export</h3>
    <ul class="arc-list">
      <li>1080p hoặc 4K</li>
      <li>H.264 codec</li>
      <li>Template save</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Integrate Video</h3>
    <ul class="arc-list">
      <li>Drop into Premiere</li>
      <li>Transition to main content</li>
      <li>A/B test retention</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Modern Intro</h2>
  <ul class="arc-list">
    <li><strong>5 second rule</strong> — hook within 5</li>
    <li><strong>Shorter better 2024</strong> — algorithm reward</li>
    <li><strong>Template reuse</strong> — efficient workflow</li>
    <li><strong>Cold open hook</strong> — preview exciting</li>
    <li><strong>Music critical</strong> — emotion drive</li>
    <li><strong>Brand minimal</strong> — logo subtle</li>
    <li><strong>A/B test</strong> — measure retention</li>
    <li><strong>Animated text</strong> — kinetic typography popular</li>
    <li><strong>SFX punchy</strong> — whoosh, impact</li>
    <li><strong>Career Video Editor</strong> — $40K-100K freelance</li>
  </ul>
</section>
`,
  },

  // 02. Virtual Production
  {
    id: "13facd2d-e426-407e-8119-ebfd404afeb9",
    tieu_de: "Virtual Production",
    tieu_de_viet: "Virtual Production (Sản xuất ảo)",
    tom_tat:
      "Virtual Production là phương pháp sản xuất phim ảnh sử dụng công nghệ thực tế ảo, LED volume, Unreal Engine — kết hợp các yếu tố vật lý và kỹ thuật số trong thời gian thực.",
    meta_title:
      "Virtual Production là gì? Ý nghĩa và ứng dụng | CINS",
    meta_description:
      "Virtual Production LED volume, Unreal Engine, in-camera VFX. Tìm hiểu Mandalorian, ICVFX và career virtual production artist.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem The Mandalorian — Tatooine desert, Star Destroyer bridge. Filmed in studio LA, not Tatooine. Technology: <strong>Virtual Production</strong> với LED volume — massive LED wall display CG environment in real-time. Actor surrounded virtual world. Camera capture composite live. Revolutionary 2019+ approach. Industry massive shift cho film production.</p>
  <p>Virtual Production là kỹ năng future-essential cho film production, VFX artist, Unreal Engine developer. Hiểu LED volume, ICVFX, real-time pipeline giúp career trong cutting-edge production. Foundation cho modern film TV approach.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Virtual Production là gì?</h2>
  <p>Virtual Production là <strong>filmmaking technique combining physical and digital element trong real-time</strong>. Modern form pioneered by The Mandalorian (2019): <strong>LED Volume</strong> (massive curved LED wall display CG environment) + <strong>Camera Tracking</strong> + <strong>Unreal Engine</strong> (render real-time). Result: actor see and act in actual virtual world, camera capture composite shot in-camera. No green screen, no post-composite cho background.</p>
  <p>Key components: <strong>LED Volume</strong> (StageCraft ILM, similar industry tools), <strong>Game Engine</strong> (Unreal Engine 5 dominant), <strong>Camera Tracking</strong> (real-time match perspective), <strong>Genlock</strong> (sync display + camera), <strong>SimulCam</strong> (composite view director). Benefits: faster than green screen post, natural lighting on actor, director see final shot on set. Cost: setup expensive ($1-10M LED stage).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Virtual Production Types</span>
    <p><strong>ICVFX (In-Camera VFX)</strong>: LED volume capture final shot in-camera. <strong>Previz</strong>: virtual scout, pre-visualize. <strong>Mocap-Driven</strong>: live performance capture. <strong>Hybrid</strong>: combine traditional VFX. Each technique mature, used different scenario.</p>
  </div>

  <ul class="arc-list">
    <li><strong>LED Volume</strong> — display wall</li>
    <li><strong>ICVFX</strong> — in-camera VFX</li>
    <li><strong>Unreal Engine 5</strong> — render engine</li>
    <li><strong>Camera Tracking</strong> — match perspective</li>
    <li><strong>Genlock</strong> — sync</li>
    <li><strong>StageCraft</strong> — ILM proprietary</li>
    <li><strong>nDisplay</strong> — Unreal multi-display</li>
    <li><strong>Volumetric Capture</strong> — performer</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"virtual production LED volume mandalorian unreal engine ICVFX"</span>
    </div>
    <p class="arc-image-caption">Virtual Production — LED volume revolution, real-time filmmaking</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>VP Components</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>LED Volume Wall</summary>
      <div class="arc-card-body">
        <p>Curved LED panel surround set. 20-30 feet tall, 80+ feet diameter. Display CG environment. Light actor naturally.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ceiling LED</summary>
      <div class="arc-card-body">
        <p>Overhead panel cho top lighting. Sky, ceiling. Natural illumination từ above.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unreal Engine 5</summary>
      <div class="arc-card-body">
        <p>Real-time render engine. Display environment 60fps. Nanite, Lumen modern features. Industry standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Camera Tracking</summary>
      <div class="arc-card-body">
        <p>Real-time camera position tracking. Perspective match LED. Frustum render high-res in camera view.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Genlock System</summary>
      <div class="arc-card-body">
        <p>Sync LED refresh + camera shutter. Avoid moiré, banding. Critical technical.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>nDisplay</summary>
      <div class="arc-card-body">
        <p>Unreal multi-GPU render across many LED panel. Industry tool. Required cho scale.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>SimulCam</summary>
      <div class="arc-card-body">
        <p>Composite view cho director. See &quot;final&quot; shot on set. Real-time decision making.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Virtual Art Department</summary>
      <div class="arc-card-body">
        <p>Build digital set in Unreal. Different from traditional art dept. New role emerging.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>VP Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Pre-Production Virtual Scout</h3>
    <ul class="arc-list">
      <li>VR headset scout digital set</li>
      <li>Director, DP plan shot</li>
      <li>Before physical day</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Build Digital Environment</h3>
    <ul class="arc-list">
      <li>Virtual Art Dept</li>
      <li>Unreal Engine asset</li>
      <li>Photoreal environment</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. LED Stage Setup</h3>
    <ul class="arc-list">
      <li>Curved LED wall</li>
      <li>Genlock configure</li>
      <li>Color calibrate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Camera Tracking Calibrate</h3>
    <ul class="arc-list">
      <li>OptiTrack / Mo-Sys system</li>
      <li>Real-time accurate</li>
      <li>Foundation perspective</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Shoot Day</h3>
    <ul class="arc-list">
      <li>Actor on set surrounded LED</li>
      <li>Camera move = environment match</li>
      <li>Director see composite real-time</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. In-Camera Capture</h3>
    <ul class="arc-list">
      <li>Footage = final image many shot</li>
      <li>No green screen need</li>
      <li>Foreground physical, background CG</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Set Extension Post</h3>
    <ul class="arc-list">
      <li>Add element CG beyond LED</li>
      <li>Replace area outside frustum</li>
      <li>Composite touch-up</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Deliver Final</h3>
    <ul class="arc-list">
      <li>Most VFX done on set</li>
      <li>Post much faster</li>
      <li>Director vision preserved</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Productions</h2>
  <ul class="arc-list">
    <li><strong>The Mandalorian</strong> — pioneer 2019</li>
    <li><strong>The Batman</strong> (2022) — extensive use</li>
    <li><strong>House of the Dragon</strong> — HBO VP</li>
    <li><strong>Hellblade II</strong> — game using VP</li>
    <li><strong>ILM StageCraft</strong> — industry leader</li>
    <li><strong>Pixomondo</strong> — VP studio</li>
    <li><strong>Career Virtual Production Supervisor</strong> — $150K-400K</li>
    <li><strong>Unreal Engine Artist</strong> — $80K-200K</li>
    <li><strong>Schools</strong>: Epic Games Unreal training</li>
    <li><strong>Future</strong>: VP mainstream next decade</li>
  </ul>
</section>
`,
  },

  // 03. Virtual Reality (VR)
  {
    id: "0a47a370-e5dc-4407-a1af-8c0e6dce2e04",
    tieu_de: "Virtual Reality (VR)",
    tieu_de_viet: "Virtual Reality - Thực tế ảo",
    tom_tat:
      "Virtual Reality (VR) là công nghệ tạo môi trường kỹ thuật số nhập vai hoàn toàn qua headset — người dùng được đặt vào thế giới ảo và có thể nhìn xung quanh, tương tác.",
    meta_title:
      "Virtual Reality (VR) là gì? Ý nghĩa và ứng dụng | CINS",
    meta_description:
      "Virtual Reality VR công nghệ. Tìm hiểu Quest, Vision Pro, Unity/Unreal VR development và career VR developer.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn đeo headset Meta Quest 3, Apple Vision Pro — chuyển vào thế giới khác. Game Beat Saber, social VR Rec Room, training simulation. Đó là <strong>Virtual Reality (VR)</strong> — fully immersive digital environment. Different from AR (overlay real world). VR completely replace vision. Foundation cho gaming, training, education future. Industry growing $30B+ market.</p>
  <p>Virtual Reality là kỹ năng future-essential cho VR developer, 3D artist, UX designer specialize VR. Hiểu hardware (Quest, Vision Pro), software (Unity, Unreal), UX principle giúp career trong emerging field. Foundation cho metaverse, spatial computing.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>VR là gì?</h2>
  <p>Virtual Reality là <strong>computer-generated environment fully immersive</strong> trải nghiệm qua VR headset. User vision entirely replaced by digital. Head movement tracked → view update. Hand controller for interaction. Result: feel &quot;present&quot; in virtual world. Different from <strong>AR (Augmented Reality)</strong> overlay digital onto real (Pokémon GO). Different from <strong>MR (Mixed Reality)</strong> blend both. Spectrum: <strong>XR</strong> umbrella.</p>
  <p>Hardware components: <strong>Headset Display</strong> (LCD/OLED close to eye), <strong>Lens</strong> (focus image), <strong>Tracking</strong> (head + hand position), <strong>Audio</strong> (spatial sound), <strong>Controller</strong> (input). Modern standalone: Meta Quest 3, Apple Vision Pro, PSVR2. Tethered (PC): Valve Index, Vive Pro. Mobile cardboard cheap option entry.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">VR Hardware Tiers</span>
    <p><strong>Standalone</strong>: Meta Quest 3 ($500). All-in-one. No PC. Most popular. <strong>Tethered PC</strong>: Valve Index, Vive Pro. Higher fidelity. PC required. <strong>Premium</strong>: Apple Vision Pro $3500. Spatial computing. Cutting edge.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Headset Display</strong> — LCD/OLED</li>
    <li><strong>6DOF Tracking</strong> — head + hand</li>
    <li><strong>Inside-Out Tracking</strong> — camera</li>
    <li><strong>Refresh Rate</strong> — 90-120Hz</li>
    <li><strong>Field of View</strong> — 100-110°</li>
    <li><strong>Hand Controller</strong> — input</li>
    <li><strong>Hand Tracking</strong> — controllerless</li>
    <li><strong>Spatial Audio</strong> — 3D sound</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"virtual reality VR headset quest vision pro immersive"</span>
    </div>
    <p class="arc-image-caption">VR — immersive digital world, foundation spatial computing</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>VR Use Cases</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Gaming</summary>
      <div class="arc-card-body">
        <p>Largest use case. Beat Saber, Half-Life Alyx, Asgard&apos;s Wrath. Immersive gaming next-level.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Training / Simulation</summary>
      <div class="arc-card-body">
        <p>Military, medical, aviation, sports. Safe practice dangerous scenario. Walmart, US Army deploy massive.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Education</summary>
      <div class="arc-card-body">
        <p>Virtual field trip, science visualization. Engaging learning. Anatomy, history immersive.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Therapy</summary>
      <div class="arc-card-body">
        <p>Exposure therapy phobia, PTSD. Pain distraction. Mental health emerging tool.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Social VR</summary>
      <div class="arc-card-body">
        <p>Rec Room, VRChat. Meet friend in virtual world. Avatar interaction. Metaverse precursor.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cinema / Storytelling</summary>
      <div class="arc-card-body">
        <p>Immersive film 360. Documentary, experimental. Emerging medium.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Architecture / Design</summary>
      <div class="arc-card-body">
        <p>Walk through architectural model. Pre-build experience space. Design review.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Productivity (Vision Pro)</summary>
      <div class="arc-card-body">
        <p>Multi-monitor virtual workspace. Spatial computing emerging. Vision Pro pioneer.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>VR Development</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Choose Platform</h3>
    <ul class="arc-list">
      <li>Meta Quest (Android)</li>
      <li>PCVR (SteamVR)</li>
      <li>Vision Pro (visionOS)</li>
      <li>PlayStation VR2</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Pick Engine</h3>
    <ul class="arc-list">
      <li>Unity dominant</li>
      <li>Unreal Engine cinematic</li>
      <li>Native iOS visionOS</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Design VR UX</h3>
    <ul class="arc-list">
      <li>Comfort first (motion sickness)</li>
      <li>Teleport vs smooth locomotion</li>
      <li>Hand interaction natural</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. 3D Asset Optimize</h3>
    <ul class="arc-list">
      <li>Low poly, baked lighting</li>
      <li>Quest mobile-class hardware</li>
      <li>90fps mandatory comfort</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Implement Interaction</h3>
    <ul class="arc-list">
      <li>Grab, throw, button</li>
      <li>Hand tracking optional</li>
      <li>Physics-based feel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Spatial Audio</h3>
    <ul class="arc-list">
      <li>3D sound critical immersion</li>
      <li>Steam Audio, Resonance</li>
      <li>HRTF spatial</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Test Comfort</h3>
    <ul class="arc-list">
      <li>Motion sickness check</li>
      <li>Long session tolerance</li>
      <li>Adjust accordingly</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Publish Store</h3>
    <ul class="arc-list">
      <li>Meta Quest Store</li>
      <li>SteamVR</li>
      <li>App Store visionOS</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career VR</h2>
  <ul class="arc-list">
    <li><strong>VR Game Developer</strong> — $80K-200K Unity/Unreal</li>
    <li><strong>VR 3D Artist</strong> — optimize asset $70K-150K</li>
    <li><strong>VR UX Designer</strong> — specialized spatial $90K-180K</li>
    <li><strong>VR Researcher</strong> — Meta Reality Labs $150K-300K</li>
    <li><strong>Sound Designer VR</strong> — spatial audio $80K-150K</li>
    <li><strong>Studios</strong>: Meta, Valve, Sony, Apple, Bethesda</li>
    <li><strong>Indie VR</strong> — small team feasible</li>
    <li><strong>Future</strong>: AR/MR/spatial computing converge</li>
    <li><strong>Vision Pro</strong> — Apple bet $3500 device</li>
    <li><strong>Market $30B+</strong> projected 2030</li>
  </ul>
</section>
`,
  },

  // 04. Visual Storytelling
  {
    id: "1d62b7bd-71f6-4ce4-b709-0c6c0afd9370",
    tieu_de: "Visual Storytelling",
    tieu_de_viet: "Visual Storytelling (Kể chuyện bằng hình ảnh)",
    tom_tat:
      "Visual Storytelling là nghệ thuật kể chuyện thông qua hình ảnh thay vì lời nói — composition, màu sắc, ánh sáng, chuyển động truyền đạt cảm xúc và narrative.",
    meta_title:
      "Visual Storytelling là gì? Ý nghĩa và ứng dụng | CINS",
    meta_description:
      "Visual Storytelling cho film, photo, comic. Tìm hiểu composition, color, lighting và visual language principles.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Pixar Up — first 10 minute no dialogue, audience cry. Spirit Stallion entire film barely dialogue. Comic Watchmen visual storytelling masterpiece. Show không tell — that&apos;s <strong>Visual Storytelling</strong>. Foundation cho film, animation, comic, photography. Master visual language = transcend language barrier reach universal audience. Pro filmmaker, animator, illustrator essential skill.</p>
  <p>Visual Storytelling là kỹ năng foundational cho mọi creative discipline visual. Hiểu composition, color, lighting, movement, symbolism giúp craft compelling narrative without words. Foundation cho career filmmaker, animator, illustrator chuyên nghiệp.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Visual Storytelling là gì?</h2>
  <p>Visual Storytelling là <strong>art of conveying narrative, emotion, meaning through visual element</strong> — không primarily dialogue/text. Apply mọi visual medium: film, animation, photography, comic, illustration, even infographic. Foundation: <strong>show don&apos;t tell</strong>. Image convey what word cannot. Universal language transcend culture, language.</p>
  <p>Tools: <strong>Composition</strong> (frame element strategically), <strong>Color</strong> (emotion, theme), <strong>Lighting</strong> (mood, focus), <strong>Movement</strong> (camera, animation), <strong>Symbolism</strong> (recurring motif), <strong>Body Language / Acting</strong>, <strong>Sound / Music</strong> (audio support visual), <strong>Editing</strong> (juxtaposition tell story). Master combine = powerful narrative.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Masters Visual Storytelling</span>
    <p><strong>Stanley Kubrick</strong>: 2001, Shining symmetric composition. <strong>Wes Anderson</strong>: pastel color, symmetric. <strong>Pixar</strong>: emotional pure visual. <strong>Hayao Miyazaki</strong>: nature emotion. <strong>Roger Deakins</strong> DP: lighting master. Study their work — learn visual language.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Show Don&apos;t Tell</strong> — core principle</li>
    <li><strong>Composition</strong> — frame strategically</li>
    <li><strong>Color Storytelling</strong> — emotion</li>
    <li><strong>Lighting</strong> — mood / focus</li>
    <li><strong>Visual Metaphor</strong> — symbolism</li>
    <li><strong>Body Language</strong> — character</li>
    <li><strong>Pacing</strong> — rhythm</li>
    <li><strong>Subtext</strong> — beyond surface</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"visual storytelling cinema composition color light narrative"</span>
    </div>
    <p class="arc-image-caption">Visual Storytelling — tell story without word, universal language</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Storytelling Tools</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Composition</summary>
      <div class="arc-card-body">
        <p>Frame element strategically. Rule of thirds, leading line, symmetry. Guide eye, emphasize importance.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Psychology</summary>
      <div class="arc-card-body">
        <p>Warm = energy, cold = isolation. Red = danger/love. Green = nature/jealousy. Color script entire film.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lighting Mood</summary>
      <div class="arc-card-body">
        <p>High-key happy, low-key dramatic. Side light tension, soft front innocent. Critical mood-setting.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Camera Movement</summary>
      <div class="arc-card-body">
        <p>Push in tension. Pull out reveal. Pan transition. Each move story purpose.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lens Choice</summary>
      <div class="arc-card-body">
        <p>Wide isolate environment. Tele intimate. Anamorphic cinematic. Convey size, intimacy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Acting / Body Language</summary>
      <div class="arc-card-body">
        <p>Posture, gesture, eyes. Without dialogue convey emotion. Animator master.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Visual Metaphor</summary>
      <div class="arc-card-body">
        <p>Recurring motif. Bird = freedom. Clock = mortality. Subliminal meaning.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Editing Juxtaposition</summary>
      <div class="arc-card-body">
        <p>Cut between unrelated image — meaning emerge. Kuleshov effect. Foundation Eisenstein theory.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Application Discipline</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Filmmaking</h3>
    <ul class="arc-list">
      <li>Director communicate vision visually</li>
      <li>Storyboard, blocking</li>
      <li>Color script</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation</h3>
    <ul class="arc-list">
      <li>Acting through animation</li>
      <li>No actor — animator</li>
      <li>Pure visual narrative</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photography</h3>
    <ul class="arc-list">
      <li>Single image story</li>
      <li>Photojournalism</li>
      <li>Compelling moment capture</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Comic / Manga</h3>
    <ul class="arc-list">
      <li>Panel composition</li>
      <li>Visual rhythm</li>
      <li>Speech bubble + image</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Illustration</h3>
    <ul class="arc-list">
      <li>Single image narrative</li>
      <li>Concept art</li>
      <li>Children book</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Advertising / Marketing</h3>
    <ul class="arc-list">
      <li>30-second commercial</li>
      <li>Hook viewer fast</li>
      <li>Emotion brand connection</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Design</h3>
    <ul class="arc-list">
      <li>Environmental storytelling</li>
      <li>Detail tell story</li>
      <li>Player discover narrative</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Documentary</h3>
    <ul class="arc-list">
      <li>Real story visual emphasis</li>
      <li>B-roll powerful</li>
      <li>Subject capture truth</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Visual Storytelling</h2>
  <ul class="arc-list">
    <li><strong>Show, don&apos;t tell</strong> — core principle</li>
    <li><strong>Study master</strong> — Kubrick, Pixar, Miyazaki</li>
    <li><strong>Color script</strong> entire project</li>
    <li><strong>Composition deliberate</strong> — frame purpose</li>
    <li><strong>Lighting tell mood</strong> — high-key vs low-key</li>
    <li><strong>Subtext deeper</strong> — beyond surface</li>
    <li><strong>Body language acting</strong> — character soul</li>
    <li><strong>Visual metaphor recurring</strong> — symbolism</li>
    <li><strong>Editing juxtaposition</strong> — meaning emerge</li>
    <li><strong>Career Director, Cinematographer</strong> — visual storyteller</li>
  </ul>
</section>
`,
  },

  // 05. Volumetric Lighting
  {
    id: "d19a3619-3990-47f3-ba3d-d0a7401e82ff",
    tieu_de: "Volumetric Lighting",
    tieu_de_viet: "Volumetric Lighting (Ánh sáng thể tích)",
    tom_tat:
      "Volumetric Lighting là kỹ thuật mô phỏng ánh sáng đi qua không khí có hạt lơ lửng (sương mù, khói, bụi) — tạo hiệu ứng tia sáng nhìn thấy được (God Rays).",
    meta_title:
      "Volumetric Lighting là gì? Ý nghĩa và ứng dụng | CINS",
    meta_description:
      "Volumetric Lighting 3D rendering. Tìm hiểu god rays, fog, atmospheric scattering trong Blender, Unreal Engine.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem cinematic scene — sunlight beam through forest cathedral, light shaft through window dusty room. Magic atmosphere. Đó là <strong>Volumetric Lighting</strong> — simulate light interacting with particle in air (fog, smoke, dust). Visible light beam = &quot;God Rays&quot;. Foundation cho cinematic 3D render, game atmospheric. Master volumetric = master mood.</p>
  <p>Volumetric Lighting là kỹ năng essential cho lighting artist, environment artist, 3D generalist. Hiểu fog, atmospheric scattering, god rays giúp produce cinematic atmosphere. Foundation cho film VFX, game environment, archviz.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Volumetric Lighting là gì?</h2>
  <p>Volumetric Lighting là <strong>simulation of light passing through medium containing particle</strong> — fog, smoke, dust, water vapor. Light scatter off particle → visible light beam. Real-world phenomenon — sun through cloud, lighthouse beam, smoke-filled room. CG simulate physics of light-particle interaction. Result: dramatic atmospheric lighting.</p>
  <p>Forms: <strong>God Rays / Volumetric Light Shafts</strong> (visible beam through opening), <strong>Atmospheric Fog</strong> (overall haze), <strong>Localized Smoke / Mist</strong> (scene specific), <strong>Underwater Caustic + Volume</strong> (sub-surface). Render expensive — extra computation per ray segment. Modern engine: real-time approximation (Unreal Engine 5 Exponential Height Fog, Unity HDRP Volume).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Real-Time vs Offline</span>
    <p><strong>Offline (Cycles, Arnold)</strong>: accurate path-traced. Hours render. Film quality. <strong>Real-Time (Unreal, Unity)</strong>: approximation, screen-space. 60fps. Game quality good enough. Both valid different context.</p>
  </div>

  <ul class="arc-list">
    <li><strong>God Rays / Light Shaft</strong> — beam</li>
    <li><strong>Atmospheric Fog</strong> — overall</li>
    <li><strong>Localized Volume</strong> — specific area</li>
    <li><strong>Density</strong> — fog thickness</li>
    <li><strong>Scattering</strong> — light direction</li>
    <li><strong>Anisotropy</strong> — forward/back</li>
    <li><strong>Color Shift</strong> — atmosphere tint</li>
    <li><strong>Bloom + Volume</strong> — combine</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"volumetric lighting god rays fog cinematic 3D render unreal"</span>
    </div>
    <p class="arc-image-caption">Volumetric Lighting — visible beam, foundation atmosphere</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Volumetric Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>God Rays / Light Shaft</summary>
      <div class="arc-card-body">
        <p>Sun through forest canopy. Window light beam. Most iconic volumetric effect. Cinematic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Atmospheric Haze</summary>
      <div class="arc-card-body">
        <p>Distance fall-off fog. Mountain become hazier far. Foundation natural outdoor.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Smoke / Fire Volume</summary>
      <div class="arc-card-body">
        <p>Houdini smoke simulation + volumetric light. Fire emit volumetric. Fluid render.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Underwater Volume</summary>
      <div class="arc-card-body">
        <p>Underwater scene — light from above scatter through water. Caustic + volume.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Localized Mist</summary>
      <div class="arc-card-body">
        <p>Specific area fog. Graveyard, valley. Box volume primitive contain.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lighthouse / Searchlight</summary>
      <div class="arc-card-body">
        <p>Cone of light through fog. Iconic noir. Spotlight + volume.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dust Particle</summary>
      <div class="arc-card-body">
        <p>Visible dust in sunbeam. Particle + volumetric combination. Add realism.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color-Shifted Atmosphere</summary>
      <div class="arc-card-body">
        <p>Mars red fog, sci-fi blue. Stylized volume. Mood + world-building.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Software Implementation</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Blender Cycles</h3>
    <ul class="arc-list">
      <li>Add Volume Scatter shader</li>
      <li>World Volume cho atmospheric</li>
      <li>Sample increase quality</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unreal Engine 5</h3>
    <ul class="arc-list">
      <li>Exponential Height Fog</li>
      <li>Volumetric Cloud component</li>
      <li>Light shaft setting</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unity HDRP</h3>
    <ul class="arc-list">
      <li>Volume system</li>
      <li>Fog override</li>
      <li>Density volume box</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Maya Arnold</h3>
    <ul class="arc-list">
      <li>Atmospheric Volume node</li>
      <li>Light volume sample</li>
      <li>Density adjust</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cinema 4D Octane</h3>
    <ul class="arc-list">
      <li>Octane Daylight + Volume</li>
      <li>Atmosphere setting</li>
      <li>Real-time preview</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Houdini</h3>
    <ul class="arc-list">
      <li>Volumetric workflow native</li>
      <li>Mantra render</li>
      <li>VDB volume</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">After Effects Plugin</h3>
    <ul class="arc-list">
      <li>VC Optical Flares + light wrap</li>
      <li>Trapcode Particular</li>
      <li>Composite fake volumetric</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nuke Compositing</h3>
    <ul class="arc-list">
      <li>Glow + volumetric pass</li>
      <li>Z-depth driven fog</li>
      <li>Composite final image</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Volumetric</h2>
  <ul class="arc-list">
    <li><strong>Less is more</strong> — subtle haze powerful</li>
    <li><strong>Density carefully</strong> — too thick = murky</li>
    <li><strong>Light direction</strong> — backlight reveal volume best</li>
    <li><strong>Performance cost</strong> — volumetric expensive</li>
    <li><strong>Real-time fake</strong> — billboard sometimes</li>
    <li><strong>Anisotropy adjust</strong> — forward/back scatter</li>
    <li><strong>Color tint</strong> — mood + atmosphere</li>
    <li><strong>Combine bloom</strong> — enhance light</li>
    <li><strong>Reference photo</strong> — real-world how look</li>
    <li><strong>Career Lighting Artist</strong> — volume mastery cinematic</li>
  </ul>
</section>
`,
  },

  // 06. Vtuber
  {
    id: "99b937be-80c5-476c-bc87-8a4b534bb635",
    tieu_de: "VTuber",
    tieu_de_viet: "VTuber (Virtual YouTuber)",
    tom_tat:
      "VTuber (Virtual YouTuber) là người sáng tạo nội dung sử dụng avatar ảo được animate realtime thay vì xuất hiện trực tiếp — phổ biến ở Nhật Bản, phát triển mạnh toàn cầu.",
    meta_title: "VTuber là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "VTuber Virtual YouTuber career. Tìm hiểu Live2D, VRoid, mocap, Hololive và phong cách phát triển nội dung.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem YouTube — Pekora Hololive 1M+ subscriber, Gawr Gura 4M+. Họ không xuất hiện mặt thật — avatar anime girl/character animated realtime. Đó là <strong>VTuber (Virtual YouTuber)</strong>. Born Japan 2016 Kizuna AI. Now global phenomenon. Million-dollar industry. Privacy + creativity + character. Career emerging Vietnam.</p>
  <p>VTuber là career path emerging cho content creator. Hiểu technology (Live2D, VRoid, mocap), software (VTube Studio), business model, persona building giúp build successful VTuber. Foundation cho Vietnam VTuber scene growing rapidly.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>VTuber là gì?</h2>
  <p>VTuber (Virtual YouTuber) là <strong>content creator using virtual avatar instead of physical appearance</strong>. Real human (&quot;nakanohito&quot; / inside person) act, voice. Avatar mimic real-time via webcam face tracking (Live2D 2D) or mocap (3D). Audience see character not creator. Origin: Kizuna AI 2016 Japan. Explosion 2018-2020 với agency Hololive, Nijisanji.</p>
  <p>Categories: <strong>Live2D VTuber</strong> (2D illustration animated) — most common, cute anime style. <strong>3D VTuber</strong> (3D model full-body) — more expensive, full mocap. <strong>Independent</strong> vs <strong>Agency-affiliated</strong> (Hololive, Nijisanji, Vshojo). Content: gaming stream, talk show, music, art. Earn từ Super Chat, member, merch, sponsor.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Major Agencies</span>
    <p><strong>Hololive</strong>: top Japan, English branch global. Pekora, Gura, Mori Calliope. <strong>Nijisanji</strong>: competitor JP + EN. <strong>Vshojo</strong>: Western indie agency. <strong>Independent</strong>: many successful (Filian, etc). Vietnam scene emerging.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Live2D</strong> — 2D animate</li>
    <li><strong>3D Avatar</strong> — full body</li>
    <li><strong>Face Tracking</strong> — webcam</li>
    <li><strong>Mocap</strong> — body 3D</li>
    <li><strong>VTube Studio</strong> — software</li>
    <li><strong>VRoid Studio</strong> — 3D creator</li>
    <li><strong>Nakanohito</strong> — &quot;person inside&quot;</li>
    <li><strong>Super Chat / Membership</strong> — revenue</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"vtuber virtual youtuber live2d anime avatar streaming"</span>
    </div>
    <p class="arc-image-caption">VTuber — virtual avatar creator, emerging career</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>VTuber Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Live2D 2D VTuber</summary>
      <div class="arc-card-body">
        <p>Most common. 2D illustration animated. Cheaper $500-5000 model. Face tracking webcam.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D Full-Body VTuber</summary>
      <div class="arc-card-body">
        <p>3D model. Full body mocap. Premium $5K-50K model. Hololive 3D debut major event.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>PNGtuber</summary>
      <div class="arc-card-body">
        <p>Static PNG image. Simple swap mouth/eye. Entry-level. No money required.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hologirl / Character</summary>
      <div class="arc-card-body">
        <p>Stylized character. Robot, animal, abstract. Distinctive identity.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Indie Independent</summary>
      <div class="arc-card-body">
        <p>Solo creator. Full creative control. Self-funded. Filian, Shylily example.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Agency-Affiliated</summary>
      <div class="arc-card-body">
        <p>Hololive, Nijisanji. Management, model provided. Strict rule. Larger audience reach.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Corporate</summary>
      <div class="arc-card-body">
        <p>Company mascot VTuber. Brand identity. Tech company growing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Multi-Lingual</summary>
      <div class="arc-card-body">
        <p>Vietnamese, English, Japanese. Cross-cultural reach. Growing trend.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Start VTuber Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Develop Persona</h3>
    <ul class="arc-list">
      <li>Character concept</li>
      <li>Personality, voice</li>
      <li>Story / backstory</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Commission / Create Model</h3>
    <ul class="arc-list">
      <li>Live2D illustrator hire</li>
      <li>VRoid Studio free 3D</li>
      <li>$500-5000 quality model</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Rig Model</h3>
    <ul class="arc-list">
      <li>Live2D Cubism rigger</li>
      <li>VTube Studio compatible</li>
      <li>Expression, eye blink</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Setup Tracking</h3>
    <ul class="arc-list">
      <li>Webcam (iPhone camera best)</li>
      <li>VTube Studio software</li>
      <li>Calibrate face track</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Streaming Setup</h3>
    <ul class="arc-list">
      <li>OBS streaming software</li>
      <li>Capture avatar window</li>
      <li>Twitch / YouTube</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Brand &amp; Overlay</h3>
    <ul class="arc-list">
      <li>Stream overlay design</li>
      <li>Logo, color scheme</li>
      <li>Asset commission</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Content Strategy</h3>
    <ul class="arc-list">
      <li>Game stream, talk show</li>
      <li>Schedule consistent</li>
      <li>Community engage</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Monetize</h3>
    <ul class="arc-list">
      <li>Twitch sub, YouTube member</li>
      <li>Super Chat / donation</li>
      <li>Merch, sponsorship</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Live2D Cubism</strong> — 2D rigging standard</li>
    <li><strong>VRoid Studio</strong> — free 3D creator</li>
    <li><strong>VTube Studio</strong> — tracking software</li>
    <li><strong>Vroid VRoid VRM</strong> — 3D format</li>
    <li><strong>OBS</strong> — streaming</li>
    <li><strong>Twitch / YouTube</strong> — platform</li>
    <li><strong>Top VTuber</strong> $1M+/year income</li>
    <li><strong>Mid-tier</strong> $30K-200K reasonable</li>
    <li><strong>Vietnam Scene</strong>: emerging — opportunity</li>
    <li><strong>Required</strong>: personality, dedication, content quality</li>
  </ul>
</section>
`,
  },

  // 07. Watermark
  {
    id: "256e5982-7f13-4012-a98c-483165ec81e9",
    tieu_de: "Watermark",
    tieu_de_viet: "Watermark (Đóng dấu hình ảnh)",
    tom_tat:
      "Watermark là nhãn hiệu hoặc logo dạng mờ đặt lên hình ảnh hoặc video để xác nhận quyền sở hữu và ngăn chặn sử dụng trái phép — phổ biến stock photography và portfolio.",
    meta_title:
      "Watermark là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Watermark cho photographer, designer. Tìm hiểu cách tạo watermark trong Photoshop, position, opacity và best practice.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn photographer post portfolio online — sợ ảnh bị steal. Solution: <strong>Watermark</strong> — semi-transparent logo/text overlay image. Identifies ownership, deter unauthorized use. Foundation cho stock photographer, freelancer, portfolio site. Balance: visible enough deter theft, không obtrusive ruining image.</p>
  <p>Watermark là kỹ năng essential cho photographer, designer, content creator. Hiểu best practice — position, opacity, size, removability resistance giúp protect work. Foundation cho stock photography, portfolio, intellectual property protection.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Watermark là gì?</h2>
  <p>Watermark là <strong>visible marker overlay onto image, video, or document</strong> identifying ownership, source, copyright. Traditional: paper watermark visible against light. Digital: text/logo semi-transparent overlay. Function: <strong>1)</strong> Identify creator/copyright holder. <strong>2)</strong> Deter unauthorized use. <strong>3)</strong> Promotion (URL, social handle visible).</p>
  <p>Modern types: <strong>Logo Watermark</strong> (brand mark), <strong>Text Watermark</strong> (name, copyright, URL), <strong>Pattern Watermark</strong> (tiled across image), <strong>Invisible Watermark</strong> (digital steganography — embedded data invisible eye but detect software). Best practice: <strong>10-30% opacity</strong>, <strong>corner placement</strong> common, <strong>large enough deter cropping</strong>.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Watermark Considerations</span>
    <p><strong>Visibility vs Aesthetic</strong>: balance. <strong>Removability Resistance</strong>: harder to crop out, harder remove Photoshop. <strong>Brand-Building</strong>: URL drive traffic. <strong>Position</strong>: across face/important area harder remove but ruin viewing. <strong>Final delivery</strong>: client paid no watermark.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Logo Watermark</strong> — brand mark</li>
    <li><strong>Text Watermark</strong> — name/URL</li>
    <li><strong>Pattern / Tiled</strong> — anti-crop</li>
    <li><strong>Invisible / Stego</strong> — embedded data</li>
    <li><strong>Opacity 10-30%</strong> — subtle</li>
    <li><strong>Corner Position</strong> — common</li>
    <li><strong>Center Across</strong> — anti-crop</li>
    <li><strong>Batch Apply</strong> — workflow</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"watermark photo copyright logo overlay protect stock photography"</span>
    </div>
    <p class="arc-image-caption">Watermark — protect work, brand identity</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Use Cases</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Stock Photography</summary>
      <div class="arc-card-body">
        <p>Shutterstock, Getty pre-purchase preview watermarked. Heavy diagonal text. Buyer purchase clean version.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Portfolio Showcase</summary>
      <div class="arc-card-body">
        <p>Subtle corner logo. Identify creator. Drive social media traffic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Social Media Post</summary>
      <div class="arc-card-body">
        <p>Instagram @handle watermark. Brand recognition. Stop content theft repost.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Video Content</summary>
      <div class="arc-card-body">
        <p>YouTube channel logo bottom corner. Persistent throughout video. Brand consistent.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Proofing / Client Review</summary>
      <div class="arc-card-body">
        <p>Wedding photographer proof watermark. Client choose. Pay = clean version.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Document Protection</summary>
      <div class="arc-card-body">
        <p>PDF &quot;CONFIDENTIAL&quot; watermark. Internal document marking. Legal context.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Art Print Sale</summary>
      <div class="arc-card-body">
        <p>Online artist sample watermark. Buyer purchase = unmarked print.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tutorial / Course Material</summary>
      <div class="arc-card-body">
        <p>Educator watermark video course. Prevent piracy distribution.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Create &amp; Apply Watermark</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Design Watermark</h3>
    <ul class="arc-list">
      <li>Logo or text</li>
      <li>Simple, readable</li>
      <li>Match brand</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Save Master</h3>
    <ul class="arc-list">
      <li>PNG transparent background</li>
      <li>High resolution</li>
      <li>Reusable file</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Photoshop Overlay</h3>
    <ul class="arc-list">
      <li>Place watermark layer</li>
      <li>Set opacity 10-30%</li>
      <li>Position corner or center</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Lightroom Watermark</h3>
    <ul class="arc-list">
      <li>Edit → Watermarking</li>
      <li>Built-in feature</li>
      <li>Batch export</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Position Strategy</h3>
    <ul class="arc-list">
      <li>Bottom-right common</li>
      <li>Center anti-crop</li>
      <li>Multi-watermark heavy protect</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Opacity Balance</h3>
    <ul class="arc-list">
      <li>15-25% sweet spot</li>
      <li>Visible but không ruin</li>
      <li>Dark background = white text light</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Batch Process</h3>
    <ul class="arc-list">
      <li>Photoshop Action</li>
      <li>Lightroom export preset</li>
      <li>Multiple image fast</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Video Watermark</h3>
    <ul class="arc-list">
      <li>Premiere graphic overlay</li>
      <li>Bottom corner persistent</li>
      <li>Channel brand</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Watermark</h2>
  <ul class="arc-list">
    <li><strong>15-25% opacity</strong> — balance visibility</li>
    <li><strong>Corner subtle</strong> portfolio approach</li>
    <li><strong>Center anti-crop</strong> high-value image</li>
    <li><strong>Pattern tile</strong> nearly impossible remove</li>
    <li><strong>URL drive traffic</strong> — brand-building bonus</li>
    <li><strong>Don&apos;t obscure subject</strong> — defeats purpose</li>
    <li><strong>Brand consistent</strong> — same watermark all platform</li>
    <li><strong>Final delivery</strong>: client paid = clean</li>
    <li><strong>Photoshop Action batch</strong> — workflow efficient</li>
    <li><strong>Invisible watermark</strong> — Digimarc commercial product</li>
  </ul>
</section>
`,
  },

  // 08. Weight Paint
  {
    id: "c6180b90-afcc-45e7-b8c0-5dbdc5a00b12",
    tieu_de: "Weight Paint",
    tieu_de_viet: "Weight Paint (Vẽ trọng số xương)",
    tom_tat:
      "Weight Paint là kỹ thuật gán giá trị trọng lượng cho các đỉnh của mô hình 3D — quy định mức độ ảnh hưởng của xương lên từng vùng của mô hình khi di chuyển.",
    meta_title: "Weight Paint là gì? Ý nghĩa và ứng dụng | CINS",
    meta_description:
      "Weight Paint trong rigging 3D. Tìm hiểu Maya, Blender workflow, smooth bind và best practice cho character rigger.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn rigger 3D đặt skeleton vào character — bind mesh skeleton. Lift arm bone → arm deform. Problem: shoulder bone affect chest, knee bone affect entire leg messy. Solution: <strong>Weight Paint</strong> — paint how much each bone influence each vertex. Foundation cho smooth character deformation. Master weight paint = master rigging.</p>
  <p>Weight Paint là kỹ năng essential cho character rigger, technical artist. Hiểu workflow Maya, Blender, smooth weighting, fix common issue giúp produce production-quality rig. Foundation cho character animation pipeline.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Weight Paint là gì?</h2>
  <p>Weight Paint là <strong>process of assigning influence value</strong> (0 to 1) <strong>between bone and vertex</strong> trong rigged 3D model. Each vertex can be influenced by multiple bones — weighted sum determine final position when bones move. Foundation cho <strong>skinning</strong> (binding mesh to skeleton). Without proper weight = mesh deform incorrectly (collapsed joint, bone poking through skin).</p>
  <p>Display: <strong>color-coded heat map</strong> — red = full influence (weight 1.0), blue = no influence (0.0), gradient between. Artist paint weight using brush — adjust influence smooth. Each vertex weights normalize to 1.0 across all influencing bones. Foundation: <strong>partition influence</strong> cleanly — shoulder bone control shoulder area, không leak to chest/elbow.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Common Weight Issues</span>
    <p><strong>Collapsed Joint</strong>: vertex weight tightly to bone, joint bend → mesh collapse. <strong>Bone Poking</strong>: weight too soft, bone visible through skin. <strong>Twist Issue</strong>: rotation cause unwanted deform. <strong>Solution</strong>: careful weight paint + corrective shape.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Weight Value 0-1</strong> — influence</li>
    <li><strong>Smooth Bind</strong> — auto initial</li>
    <li><strong>Normalize</strong> — sum to 1.0</li>
    <li><strong>Max Influence</strong> — 4 bone typical</li>
    <li><strong>Brush Size</strong> — paint area</li>
    <li><strong>Brush Strength</strong> — opacity</li>
    <li><strong>Mirror Weight</strong> — symmetry</li>
    <li><strong>Vertex Selection</strong> — precise</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"weight paint 3D rigging blender maya character bone influence"</span>
    </div>
    <p class="arc-image-caption">Weight Paint — bone-vertex influence, foundation rigging</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Weight Paint Tools</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Add Weight</summary>
      <div class="arc-card-body">
        <p>Add influence vertex selected bone. Increase weight. Most common brush.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Subtract Weight</summary>
      <div class="arc-card-body">
        <p>Remove influence. Opposite of add. Refine weight area.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Smooth</summary>
      <div class="arc-card-body">
        <p>Blur weight across neighbor vertex. Soften harsh transition. Most-used after add/subtract.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Replace</summary>
      <div class="arc-card-body">
        <p>Set absolute weight value. Override existing. Precise control.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Scale</summary>
      <div class="arc-card-body">
        <p>Multiply weight value. Reduce/increase proportionally.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mirror Weight</summary>
      <div class="arc-card-body">
        <p>Copy left to right side. Symmetric character. Major time-saver.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Copy Weight</summary>
      <div class="arc-card-body">
        <p>Transfer weight between mesh similar topology. Workflow shortcut.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Auto Weight (Skin Bind)</summary>
      <div class="arc-card-body">
        <p>Heat map algorithm initial weight. Blender Auto Weights. Refine after.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Weight Paint Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Skin Bind Initial</h3>
    <ul class="arc-list">
      <li>Maya Smooth Bind</li>
      <li>Blender Automatic Weights</li>
      <li>Foundation start</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Test Pose</h3>
    <ul class="arc-list">
      <li>Bend joint extreme</li>
      <li>Identify problem area</li>
      <li>Plan fix</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Switch Weight Paint Mode</h3>
    <ul class="arc-list">
      <li>Maya Paint Skin Weights</li>
      <li>Blender Weight Paint</li>
      <li>Heat map visible</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Select Bone</h3>
    <ul class="arc-list">
      <li>Pick bone work on</li>
      <li>Visualize its influence</li>
      <li>Red = full, blue = none</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Add / Remove Weight</h3>
    <ul class="arc-list">
      <li>Brush over area</li>
      <li>Add where need influence</li>
      <li>Remove unwanted</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Smooth Transition</h3>
    <ul class="arc-list">
      <li>Smooth brush soften</li>
      <li>Hard edge bad deform</li>
      <li>Gradient natural</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Test Each Pose</h3>
    <ul class="arc-list">
      <li>Bend, rotate joint</li>
      <li>Verify clean deform</li>
      <li>Iterate fix issue</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Mirror Symmetry</h3>
    <ul class="arc-list">
      <li>Paint left side</li>
      <li>Mirror to right</li>
      <li>Half work</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Weight Paint</h2>
  <ul class="arc-list">
    <li><strong>Auto Bind start</strong> — refine after</li>
    <li><strong>Test pose early</strong> — identify issue</li>
    <li><strong>Smooth brush essential</strong> — most use</li>
    <li><strong>Max 4 influence</strong> per vertex typical</li>
    <li><strong>Mirror save time</strong> — symmetric character</li>
    <li><strong>Joint area complex</strong> — shoulder, hip, wrist hardest</li>
    <li><strong>Corrective blendshape</strong> — extreme pose fix</li>
    <li><strong>Twist bone</strong> — split bone fix arm twist</li>
    <li><strong>Reference real anatomy</strong> — muscle bulge</li>
    <li><strong>Career Character Rigger</strong> — weight paint mastery essential</li>
  </ul>
</section>
`,
  },

  // 09. Wiggle Expression
  {
    id: "170cdd44-8b41-4575-904b-3c73a8625105",
    tieu_de: "Wiggle Expression",
    tieu_de_viet: "Wiggle Expression trong After Effects",
    tom_tat:
      "Wiggle Expression là expression phổ biến nhất trong After Effects — tạo chuyển động rung lắc ngẫu nhiên tự động mà không cần keyframe. Cú pháp: wiggle(frequency, amplitude).",
    meta_title:
      "Wiggle Expression là gì? Ý nghĩa và ứng dụng | CINS",
    meta_description:
      "Wiggle Expression After Effects. Tìm hiểu cú pháp, parameters, advanced techniques và use case cho motion designer.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn motion designer cần random handheld camera shake — manual keyframe 60-frame nightmare. Solution: <strong>wiggle(5, 30)</strong> — single line code, random oscillation automatic. Đó là <strong>Wiggle Expression</strong> — most popular AE expression. Save hour. Add organic feel any property. Master wiggle = essential motion design skill.</p>
  <p>Wiggle Expression là kỹ năng essential cho After Effects motion designer. Hiểu syntax, parameters, advanced technique giúp craft organic movement effortlessly. Foundation cho motion design workflow chuyên nghiệp.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Wiggle Expression là gì?</h2>
  <p>Wiggle Expression là <strong>built-in After Effects function</strong> generate random oscillation around current value. Syntax: <strong>wiggle(frequency, amplitude)</strong>. <strong>Frequency</strong>: how many wiggle per second (Hz). <strong>Amplitude</strong>: how far from base value. Apply to any property (Position, Rotation, Opacity, Scale, Color). Replace manual keyframing organic motion.</p>
  <p>Example: <code>wiggle(2, 50)</code> on Position = 2 wiggle/second, ±50 pixel from current position. Random but deterministic — same project = same wiggle. Foundation use case: handheld camera shake, hover effect, typewriter jitter, electric/glitch effect, random pulse. Mostly one-line solve common problem.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Advanced Syntax</span>
    <p><strong>wiggle(freq, amp)</strong>: basic. <strong>wiggle(freq, amp, octaves, amp_mult)</strong>: complex — octaves = layer of wiggle, amp_mult = each layer multiplier. <strong>wiggle(freq, amp, octaves, amp_mult, time)</strong>: control time offset. Manipulate seed: posterizeTime, seedRandom.</p>
  </div>

  <ul class="arc-list">
    <li><strong>wiggle(2, 50)</strong> — basic</li>
    <li><strong>Frequency</strong> — Hz oscillation</li>
    <li><strong>Amplitude</strong> — distance</li>
    <li><strong>Octaves</strong> — layer complex</li>
    <li><strong>seedRandom</strong> — control random</li>
    <li><strong>posterizeTime</strong> — stepped wiggle</li>
    <li><strong>Linked Wiggle</strong> — multi-property</li>
    <li><strong>Loop Wiggle</strong> — seamless</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"wiggle expression after effects code motion graphics shake"</span>
    </div>
    <p class="arc-image-caption">Wiggle Expression — random oscillation, motion design workhorse</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Wiggle Use Cases</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Handheld Camera Shake</summary>
      <div class="arc-card-body">
        <p>Position: <code>wiggle(3, 20)</code>. Subtle organic camera move. Most common use.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hover Effect</summary>
      <div class="arc-card-body">
        <p>Floating object subtle move. <code>wiggle(0.5, 10)</code>. Slow, gentle.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Typewriter Jitter</summary>
      <div class="arc-card-body">
        <p>Text position slight wiggle. Organic typewriter feel. Per-character animation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Glitch / Distortion</summary>
      <div class="arc-card-body">
        <p>Fast amplitude wiggle. <code>wiggle(20, 50)</code>. Digital glitch random.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Earthquake / Explosion</summary>
      <div class="arc-card-body">
        <p>Heavy shake camera. <code>wiggle(15, 100)</code>. Cinematic destruction.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Light Flicker</summary>
      <div class="arc-card-body">
        <p>Opacity wiggle. <code>wiggle(15, 30)</code>. Candle, neon flicker.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Rotation Sway</summary>
      <div class="arc-card-body">
        <p>Hanging sign sway. <code>wiggle(1, 10)</code> on Rotation. Pendulum natural.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Pulse</summary>
      <div class="arc-card-body">
        <p>Apply Color Effect color wiggle. Random color pulse. Music sync feel.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Advanced Techniques</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Slider-Controlled Wiggle</h3>
    <ul class="arc-list">
      <li>Add Slider Control effect</li>
      <li>Pick whip wiggle parameter</li>
      <li>Animate slider control amount</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Smooth Wiggle</h3>
    <ul class="arc-list">
      <li>wiggle() default is random</li>
      <li>Higher octave smoother</li>
      <li>Use temporal smoothing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Posterize Time Stepped</h3>
    <ul class="arc-list">
      <li>posterizeTime(10); wiggle(2,30)</li>
      <li>Stepped 10fps wiggle</li>
      <li>Stop-motion feel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Linked Multi-Property</h3>
    <ul class="arc-list">
      <li>Wiggle position, link rotation</li>
      <li>Coordinated motion</li>
      <li>Complex behavior</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Seed Control</h3>
    <ul class="arc-list">
      <li>seedRandom(1, true); wiggle(2, 30)</li>
      <li>Different seed each layer</li>
      <li>Variation control</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Conditional Wiggle</h3>
    <ul class="arc-list">
      <li>Wiggle only specific time range</li>
      <li>If statement</li>
      <li>Reactive animation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Loop Wiggle</h3>
    <ul class="arc-list">
      <li>Tricky — wiggle inherently random</li>
      <li>Workaround time%loopDur</li>
      <li>Seamless loop</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Wiggle Single Dimension</h3>
    <ul class="arc-list">
      <li>x_wiggle = wiggle(2,30)[0]</li>
      <li>[x_wiggle, value[1]] — only X</li>
      <li>Constrain dimension</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Wiggle</h2>
  <ul class="arc-list">
    <li><strong>wiggle(2, 30) classic</strong> — handheld camera</li>
    <li><strong>Subtle better</strong> — low amplitude organic</li>
    <li><strong>High frequency twitchy</strong> — glitch feel</li>
    <li><strong>Slider control</strong> — animate wiggle amount</li>
    <li><strong>posterizeTime stepped</strong> — frame-skip feel</li>
    <li><strong>Different seed per layer</strong> — variation</li>
    <li><strong>Combine octaves complex</strong> — layered motion</li>
    <li><strong>Loop tricky</strong> — wiggle inherently random</li>
    <li><strong>Performance consider</strong> — many wiggle slow preview</li>
    <li><strong>Career Motion Designer</strong> — wiggle muscle memory</li>
  </ul>
</section>
`,
  },

  // 10. Wireframe
  {
    id: "bd89c2e0-4afe-4f30-891e-b66e82e18fb3",
    tieu_de: "Wireframe (UX & 3D)",
    tieu_de_viet: "Wireframe (Bản vẽ phác thảo)",
    tom_tat:
      "Wireframe có hai nghĩa: (1) UX Design bản vẽ phác thảo cho website/app — bố cục cơ bản trước khi thiết kế chi tiết; (2) 3D modeling khung lưới các đường thẳng tạo nên mô hình.",
    meta_title: "Wireframe là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Wireframe trong UX và 3D modeling. Tìm hiểu workflow Figma wireframing và polygon mesh wireframe display.",
    noi_dung: `
<section class="arc-intro">
  <p>Wireframe có 2 ý nghĩa context khác. <strong>UX Design</strong>: low-fi sketch website/app — boxes representing element. Foundation cho design process trước visual. <strong>3D Modeling</strong>: skeletal line representation của 3D mesh — show polygon structure. Both essential concept respectively. Master cả 2 = versatile designer/3D artist.</p>
  <p>Wireframe là kỹ năng essential cho UX designer (Figma wireframing) và 3D artist (mesh structure). Hiểu cả hai contexts giúp navigate diverse career. Foundation cho cả app design và 3D production pipeline.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Wireframe là gì?</h2>
  <p><strong>UX Wireframe</strong>: low-fidelity sketch / blueprint of digital product (website, app, dashboard). Boxes representing image, text, button. Focus on <strong>layout, hierarchy, flow</strong> — không visual detail (color, font, image). Iterate fast cheaply trước commit visual design. Foundation cho UX design process.</p>
  <p><strong>3D Wireframe</strong>: display mode showing only edge of 3D mesh — skeleton line. Render cho preview without surface. Reveal polygon structure (mesh topology). Foundation diagnostic tool cho 3D artist verify clean mesh, find error. Also stylistic choice — Tron-like aesthetic, technical visualization.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Two Meanings</span>
    <p><strong>UX Wireframe</strong>: web/app layout sketch. Figma, Balsamiq, Sketch tool. Black boxes = image. Lorem ipsum = text. Low-fi planning. <strong>3D Wireframe</strong>: mesh edge display. Maya, Blender view mode. Technical diagnostic. Stylistic render option.</p>
  </div>

  <ul class="arc-list">
    <li><strong>UX Wireframe</strong></li>
    <li><strong>Low-Fi Layout</strong> — sketch</li>
    <li><strong>Box Element</strong> — placeholder</li>
    <li><strong>Hierarchy</strong> — structure</li>
    <li><strong>3D Wireframe</strong></li>
    <li><strong>Edge Display</strong> — mesh line</li>
    <li><strong>Polygon Topology</strong></li>
    <li><strong>Diagnostic Tool</strong></li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"wireframe UX design figma layout app website low fi"</span>
    </div>
    <p class="arc-image-caption">Wireframe — UX layout sketch và 3D mesh structure</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>UX Wireframe</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Purpose</summary>
      <div class="arc-card-body">
        <p>Plan layout, hierarchy, flow trước visual design. Quick iteration. Cheap to change. Foundation UX process.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tools</summary>
      <div class="arc-card-body">
        <p>Figma (most popular), Balsamiq classic, Sketch, Adobe XD. Even pencil paper. Choose based team workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Low-Fi vs High-Fi</summary>
      <div class="arc-card-body">
        <p>Low-Fi: boxes, gray, simple text. High-Fi: closer to final visual. Low-Fi iterate fast.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Element Convention</summary>
      <div class="arc-card-body">
        <p>X box = image. Underline = text. Black box = button. Standard convention quick recognize.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mobile vs Desktop</summary>
      <div class="arc-card-body">
        <p>Wireframe both. Different layout consideration. Mobile-first modern approach.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Flow vs Single Screen</summary>
      <div class="arc-card-body">
        <p>Wireframe single screen OR connect into flow. Both useful different stage.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Annotation</summary>
      <div class="arc-card-body">
        <p>Add note explain interaction. &quot;Click button → modal&quot;. Communicate to team.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Wireframe to Prototype</summary>
      <div class="arc-card-body">
        <p>Link wireframe = clickable prototype. Test before visual. Figma feature.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>3D Wireframe</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Display Mode</h3>
    <ul class="arc-list">
      <li>Maya: 4 (wireframe), 5 (shaded), 6 (textured)</li>
      <li>Blender: Z menu, Wireframe</li>
      <li>Toggle for diagnostic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Topology Verification</h3>
    <ul class="arc-list">
      <li>Check mesh clean</li>
      <li>Quad uniform</li>
      <li>Edge flow good</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">N-Gon Detect</h3>
    <ul class="arc-list">
      <li>Edge count check</li>
      <li>5+ side n-gon</li>
      <li>Convert to quad</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Polygon Density</h3>
    <ul class="arc-list">
      <li>Verify appropriate density</li>
      <li>Even distribution</li>
      <li>Optimize cho usage</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation Loop Check</h3>
    <ul class="arc-list">
      <li>Joint area enough geometry</li>
      <li>Deform clean</li>
      <li>Edge loop important</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Wireframe Render Style</h3>
    <ul class="arc-list">
      <li>Render edge as final image</li>
      <li>Technical drawing</li>
      <li>Tron-like aesthetic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">UV Layout View</h3>
    <ul class="arc-list">
      <li>Wireframe in UV space</li>
      <li>Verify UV layout</li>
      <li>Compare 3D + UV</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Smooth vs Cage</h3>
    <ul class="arc-list">
      <li>Low-poly cage</li>
      <li>Subdivision smooth</li>
      <li>View both wireframe</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Both Wireframe</h2>
  <ul class="arc-list">
    <li><strong>UX Wireframe</strong>: low-fi iterate fast</li>
    <li><strong>Don&apos;t over-detail</strong> wireframe — focus structure</li>
    <li><strong>Figma standard 2024</strong> — industry adopt</li>
    <li><strong>Annotation team</strong> communicate intent</li>
    <li><strong>3D Wireframe</strong>: topology diagnostic always</li>
    <li><strong>Quad mesh preferred</strong> — clean wireframe</li>
    <li><strong>Edge loop critical</strong> joint area</li>
    <li><strong>Subdivision check</strong> — wireframe both level</li>
    <li><strong>Render wireframe style</strong> — Tron aesthetic</li>
    <li><strong>Career UX/3D Artist</strong> — wireframe skill essential</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 3 · Batch 9 — chạy ${items.length} bài keyword (Q → Z) ──\n`,
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
