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
  // 01. Optical Flares
  {
    id: "2ed73f56-a4e0-4c16-8e2f-40c5ac9243ea",
    tieu_de: "Optical Flares",
    tieu_de_viet: "Plugin Optical Flares",
    tom_tat:
      "Optical Flares là plugin After Effects của Video Copilot tạo hiệu ứng lens flare chất lượng cao với nhiều tùy chọn — phổ biến cho motion graphics, title design tạo cảm giác cinematic.",
    meta_title:
      "Optical Flares là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Optical Flares plugin Video Copilot tạo lens flare. Tìm hiểu workflow, preset và tips tránh fake-looking flare.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn motion designer cần lens flare cinematic cho title sequence — built-in AE flare basic, fake. <strong>Optical Flares</strong> by Video Copilot — gold standard plugin lens flare cho AE. 100+ realistic preset, hyper-customizable. Used by Hollywood film, top music video, brand commercial. Andrew Kramer (Video Copilot) revolutionized motion graphics với plugin này.</p>
  <p>Optical Flares là tool essential cho motion designer làm việc cinematic content. Hiểu workflow, customization và avoid clichéd preset giúp tạo flare effect believable, không amateur-looking. Investment $125 well worth cho serious motion design career.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Optical Flares là gì?</h2>
  <p>Optical Flares là <strong>plugin của Video Copilot</strong> cho Adobe After Effects (và compatible software) — tạo realistic lens flare effect với customization vô tận. Built-in After Effects có Lens Flare effect basic; Optical Flares advanced massively — multiple light element (glow, streak, anamorphic, ring, ghost), color shift, animation, occlusion (flare hide behind object), 3D camera integration.</p>
  <p>Launched 2010, instantly became industry standard. $125 one-time. Updated regularly với Optical Flares 1.4 latest. Library 100+ professional preset từ JJ Abrams Star Trek style đến vintage 70s. Companion tool: Twitch (RGB shift), Element 3D, Color Vibrance — Video Copilot suite of motion designer staples.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Optical Flares vs Lens Flare Built-in</span>
    <p><strong>Built-in</strong>: simple, limited customization, basic. <strong>Optical Flares</strong>: layered element fully customizable, hundred preset, real-time UI, 3D integration. Difference between &quot;test&quot; and &quot;production&quot; quality. Pro project use Optical Flares (or alternative Knoll Light Factory).</p>
  </div>

  <ul class="arc-list">
    <li><strong>Glow</strong> — main bright center</li>
    <li><strong>Streak</strong> — line of light</li>
    <li><strong>Anamorphic Streak</strong> — horizontal flare</li>
    <li><strong>Ring</strong> — concentric circle</li>
    <li><strong>Ghost</strong> — secondary smaller flare</li>
    <li><strong>Hot Spot</strong> — bright core</li>
    <li><strong>Spectrum</strong> — color spread</li>
    <li><strong>Position 3D</strong> — flare follow 3D layer</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"optical flares video copilot lens flare cinematic motion graphics"</span>
    </div>
    <p class="arc-image-caption">Optical Flares — plugin AE chất lượng cao cho lens flare cinematic</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Workflow Optical Flares</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Apply Effect</summary>
      <div class="arc-card-body">
        <p>Create solid layer (black recommended cho easier blending). Apply Optical Flares effect. UI opens automatically.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Choose Preset</summary>
      <div class="arc-card-body">
        <p>Browse 100+ preset library. Categories: Cinematic, Streaks, Anamorphic, Subtle, Heavy. Single click apply.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Customize Element</summary>
      <div class="arc-card-body">
        <p>Open Editor button — UI shows all element layers. Add/remove/modify individual: glow, streak, ring. Adjust per element intensity, color, size.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Position</summary>
      <div class="arc-card-body">
        <p>Move flare position via Position parameter. Animate cho moving flare. Pin to track point cho object reference.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blend với Layer Below</summary>
      <div class="arc-card-body">
        <p>Solid layer above footage → blend mode Screen or Add. Background black drops out, flare visible.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D Position Integration</summary>
      <div class="arc-card-body">
        <p>Pin Position to 3D layer/light. Flare follow object trong 3D space. Critical cho integrated cinematic effect.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animation</summary>
      <div class="arc-card-body">
        <p>Animate brightness, scale, position. Pulse flare for music sync. Subtle wobble for handheld feel.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Use Cases</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Title Sequence</h3>
    <ul class="arc-list">
      <li>Logo reveal với flare hit</li>
      <li>Anamorphic streak cho widescreen cinematic</li>
      <li>Marvel-style title flash</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Music Video</h3>
    <ul class="arc-list">
      <li>Beat-synced flare pulse</li>
      <li>Concert lighting effect enhancement</li>
      <li>Dynamic energy cho music genre</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Product Reveal</h3>
    <ul class="arc-list">
      <li>Spec highlight on metallic product</li>
      <li>Glow when product appear</li>
      <li>Premium feel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Sci-Fi / Action</h3>
    <ul class="arc-list">
      <li>Hyperdrive effect — radial streak burst</li>
      <li>Energy weapon glow</li>
      <li>Lightsaber tip flare</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Sunset / Sun</h3>
    <ul class="arc-list">
      <li>Enhance natural sun flare in footage</li>
      <li>Add flare if missing in clean shot</li>
      <li>Golden hour effect</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Lower Thirds Hit</h3>
    <ul class="arc-list">
      <li>Flare appears when name graphic reveal</li>
      <li>Polished broadcast feel</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Avoid Cliché</h2>
  <ul class="arc-list">
    <li><strong>Subtle is better</strong> — beginner mistake = too intense, distracting</li>
    <li><strong>Avoid common preset</strong> — same JJ Abrams Star Trek flare overused</li>
    <li><strong>Customize element</strong> — modify preset, don&apos;t use raw</li>
    <li><strong>Match light direction</strong> — flare from where light source motivates</li>
    <li><strong>Track to object</strong> — static flare on moving camera = obvious fake</li>
    <li><strong>Match aspect ratio</strong> — anamorphic horizontal for widescreen, spherical for 16:9 standard</li>
    <li><strong>Don&apos;t overuse</strong> — flare on every shot = looks fake quickly</li>
    <li><strong>Layer flare</strong> — multiple subtle flare often better than one heavy</li>
    <li><strong>Color match scene</strong> — flare color complement scene grade</li>
    <li><strong>Alternative</strong>: Knoll Light Factory cũng quality cao, pay subscription</li>
  </ul>
</section>
`,
  },

  // 02. Optical Flow
  {
    id: "75799f5d-9350-40fb-b850-dd37fe91d24a",
    tieu_de: "Optical Flow",
    tieu_de_viet: "Phân tích chuyển động (Optical Flow)",
    tom_tat:
      "Optical Flow là thuật toán phân tích chuyển động giữa các frame để tạo frame trung gian — dùng cho slow motion, frame interpolation, motion estimation trong compositing.",
    meta_title: "Optical Flow là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Optical Flow tạo slow motion AI. Tìm hiểu Twixtor, AE Pixel Motion và workflow frame interpolation chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn quay 30fps footage, muốn slow motion smooth 1/4 speed. Traditional frame blend = ghosting nhão. <strong>Optical Flow</strong> — algorithm phân tích motion per-pixel, sinh ra frame mới ở giữa intelligently. Result: slow motion silky smooth giống quay 120fps. Tool magic cho video editor không quay high frame rate trên set.</p>
  <p>Optical Flow là kỹ thuật advanced cho video editor, VFX artist, motion designer. Hiểu cách hoạt động và tools (Twixtor, AE Pixel Motion, Resolve Optical Flow) giúp create stunning slow motion từ standard frame rate footage. Critical cho music video, sport, cinematic content.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Optical Flow là gì?</h2>
  <p>Optical Flow là <strong>computer vision algorithm</strong> phân tích motion of pixel between two consecutive frames. Output: <strong>motion vector field</strong> — direction + magnitude của motion per pixel. Algorithm assume pixel intensity stays constant giữa frame (brightness constancy), apply gradient-based math (Lucas-Kanade method, Horn-Schunck, Farneback) để estimate motion. Modern AI-based optical flow (FlowNet, RAFT) more accurate.</p>
  <p>Primary application: <strong>frame interpolation</strong> — synthesize new frame between existing frames bằng cách warping pixels theo motion vector. Result: smooth slow motion từ standard rate footage. Also used: <strong>motion estimation</strong> compositing, <strong>video stabilization</strong>, <strong>autonomous driving</strong>, <strong>action recognition</strong>.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Optical Flow vs Frame Blending</span>
    <p><strong>Frame Blending</strong>: simple averaging 2 frame → blurry, ghost. Fast. <strong>Optical Flow</strong>: intelligent motion analysis, warp pixel → sharp slow motion. Slow (computationally expensive). Quality huge difference. Pro slow motion always optical flow.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Motion Vector</strong> — direction + speed per pixel</li>
    <li><strong>Frame Interpolation</strong> — synthesize between frame</li>
    <li><strong>Twixtor</strong> — popular plugin cho optical flow slow motion</li>
    <li><strong>Pixel Motion Blur</strong> — AE effect using optical flow</li>
    <li><strong>Time Remapping</strong> — combine với optical flow cho slow mo</li>
    <li><strong>RAFT, FlowNet</strong> — AI-based modern algorithm</li>
    <li><strong>Topaz Video AI</strong> — AI frame interpolation</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"optical flow slow motion twixtor frame interpolation"</span>
    </div>
    <p class="arc-image-caption">Optical Flow — motion analysis per-pixel, sinh frame intelligently</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Tools Optical Flow</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Twixtor (RE:Vision Effects)</summary>
      <div class="arc-card-body">
        <p>Gold standard cho optical flow slow motion. Plugin AE, Premiere, Resolve, FCP. $329-595. Best quality result. Industry favorite. Twixtor Pro version handles challenging footage.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Adobe After Effects — Pixel Motion</summary>
      <div class="arc-card-body">
        <p>Built-in optical flow via Pixel Motion Blur effect và Time Remapping với Optical Flow setting. Free, decent quality. Slower than Twixtor.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DaVinci Resolve — Optical Flow</summary>
      <div class="arc-card-body">
        <p>Built-in Resolve Studio. Speed Effects → Optical Flow. Free tier limited, full quality Studio. Excellent quality, integrated workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Premiere Pro — Optical Flow</summary>
      <div class="arc-card-body">
        <p>Time Interpolation → Optical Flow. Easy access, decent quality. Faster than AE for simple use.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>FCP X — Optical Flow</summary>
      <div class="arc-card-body">
        <p>Built-in Apple, Optical Flow checkbox. Quality OK cho most use case.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Topaz Video AI</summary>
      <div class="arc-card-body">
        <p>AI-based interpolation. Cutting-edge, sometimes beats traditional optical flow. Subscription/one-time. Best for difficult footage.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Slow Motion với Optical Flow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Quality Source Footage</h3>
    <ul class="arc-list">
      <li>Higher frame rate = better result (60fps better than 24fps source)</li>
      <li>Sharp focus critical</li>
      <li>Avoid motion blur trong original</li>
      <li>Consistent lighting</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Choose Speed</h3>
    <ul class="arc-list">
      <li>50% slow = mild, typically clean result</li>
      <li>25% slow = obvious slow mo, more challenging</li>
      <li>10% slow = extreme, requires excellent source</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Apply Optical Flow</h3>
    <ul class="arc-list">
      <li>AE: Time → Time Remap, set interpolation Optical Flow</li>
      <li>Premiere: Right-click clip → Time Interpolation → Optical Flow</li>
      <li>Resolve: Inspector → Speed → Optical Flow</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Render Preview</h3>
    <ul class="arc-list">
      <li>Optical flow slow to compute</li>
      <li>Pre-render section cho smooth playback</li>
      <li>Check artifact</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Fix Artifact</h3>
    <ul class="arc-list">
      <li>Edge warp — adjust algorithm setting</li>
      <li>Wobble — use Twixtor Pro for difficult shot</li>
      <li>Fall back to Frame Blend for problematic section</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Add Motion Blur (optional)</h3>
    <ul class="arc-list">
      <li>Slow motion often look too sharp</li>
      <li>Subtle motion blur (Pixel Motion Blur AE) add cinematic feel</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Use Cases &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Music Video</strong> — slow mo dramatic moment</li>
    <li><strong>Sport / Action</strong> — slow mo replay critical play</li>
    <li><strong>Wedding / Event</strong> — emotional moment elevation</li>
    <li><strong>Commercial</strong> — product reveal slow mo premium feel</li>
    <li><strong>Cinematic Film</strong> — Mission Impossible, John Wick action sequence</li>
    <li><strong>Tip</strong>: Shoot 60fps minimum if planning slow mo (240fps ideal high-end camera)</li>
    <li><strong>Tip</strong>: optical flow fails on fast-moving object — fall back blend or hide cut</li>
    <li><strong>Tip</strong>: Twixtor Pro better than Premiere/AE built-in for difficult shot</li>
    <li><strong>Tip</strong>: Pre-render expensive — render section, then edit smooth</li>
    <li><strong>Limitation</strong>: cannot create realistic slow motion từ very low frame rate (8fps to 24x slow impossible quality)</li>
  </ul>
</section>
`,
  },

  // 03. Optical Transition
  {
    id: "5531f1f2-f510-4d9e-84ea-b4830bab08fd",
    tieu_de: "Optical Transition",
    tieu_de_viet: "Chuyển cảnh quang học (Optical Transition)",
    tom_tat:
      "Optical Transition là chuyển cảnh tạo bằng cách xử lý ánh sáng và phơi sáng — dip to white, lens flare transition — tạo cảm giác tự nhiên và cinematic hơn cut thường.",
    meta_title:
      "Optical Transition là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Optical Transition cinematic. Tìm hiểu dip to white, light leak transition, lens flare và workflow trong post-production.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Marvel film — scene cut sang scene tiếp theo không phải hard cut. Light flash overexpose → cut, hoặc subtle warm light wash sang BG mới. <strong>Optical Transition</strong> — chuyển cảnh sử dụng light effect, mượt mà, cinematic. Khác hẳn cut thông thường — tạo emotional flow giữa scene, signal time/place change đẹp mắt.</p>
  <p>Optical Transition là kỹ thuật editor cinematic muốn elevate footage. Hiểu các loại transition này và cách implement giúp output professional feel cho music video, narrative, commercial. Subtle nhưng impactful detail phân biệt amateur vs pro editing.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Optical Transition là gì?</h2>
  <p>Optical Transition là <strong>chuyển cảnh giữa hai shot</strong> được tạo bằng cách <strong>simulate optical effect</strong> của camera lens hoặc film — light flash, exposure shift, lens flare, light leak, focus shift. Different from <strong>cut</strong> (instant change) hoặc <strong>dissolve</strong> (cross-fade). Optical transition <strong>physically motivated</strong> by camera characteristic — feel natural, not arbitrary.</p>
  <p>Originally analog film transition created in-camera (overexpose end of shot, dip to white). Digital era: post-production effect simulate the optical look. More creative options, more controlled. Modern motion designer / editor use stock footage optical transition + custom effect cho premium feel.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Optical vs Cut vs Dissolve</span>
    <p><strong>Cut</strong>: instant change, can feel jarring. <strong>Dissolve</strong>: cross-fade, soft. <strong>Optical Transition</strong>: physically-motivated light effect — feel like camera characteristic. Cinematic premium feel. Trade-off: more &quot;effect&quot; = less invisible editing. Use sparingly.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Dip to White / Black</strong> — fade through color</li>
    <li><strong>Light Flash</strong> — quick bright overlay</li>
    <li><strong>Lens Flare Transition</strong> — flare swipes screen</li>
    <li><strong>Light Leak Transition</strong> — colored leak hide cut</li>
    <li><strong>Focus Pull Transition</strong> — defocus then refocus on new scene</li>
    <li><strong>Whip Pan</strong> — fast camera pan blur</li>
    <li><strong>Glow Transition</strong> — bright spot expand cover frame</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"optical transition video editing light leak flash cinematic"</span>
    </div>
    <p class="arc-image-caption">Optical Transition — light-based transition cinematic, premium feel</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Optical Transition</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Dip to White / Black</summary>
      <div class="arc-card-body">
        <p>Fade through white (overexposure) hoặc black (underexposure). White = bright, optimistic, time skip forward. Black = dark, dramatic, ending feel. Classic cinematic transition.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Light Flash</summary>
      <div class="arc-card-body">
        <p>Quick bright flash hide cut. Lightning, camera flash narrative. Fast strobe-like effect. Common cho action sequence.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Light Leak Transition</summary>
      <div class="arc-card-body">
        <p>Warm light leak (orange/yellow) wash over → cut. Vintage analog feel. Wedding video, music video phổ biến. Stock footage marketplace.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lens Flare Swipe</summary>
      <div class="arc-card-body">
        <p>Anamorphic lens flare horizontal swipe screen — at peak intensity, cut to new scene. JJ Abrams style.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Focus Pull</summary>
      <div class="arc-card-body">
        <p>End shot: rack focus to blur. Cut. Start next shot: blur → focus. Smooth feel. Subtle, sophisticated.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Whip Pan</summary>
      <div class="arc-card-body">
        <p>Camera fast pan → motion blur sweep. Cut at peak blur. Next shot starts blurred → reveal. Energetic, often paired với sound design swoosh.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color Wash</summary>
      <div class="arc-card-body">
        <p>Frame fill solid color (color from next scene), then dissolve to new shot. Smooth color-coordinated transition.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bokeh Transition</summary>
      <div class="arc-card-body">
        <p>Bokeh element fill screen → hide cut → reveal new scene. Premium aesthetic.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Create Optical Transition</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Method 1: Stock Footage</h3>
    <ul class="arc-list">
      <li>Download optical transition pack (RocketStock, Triune Digital, MotionArray)</li>
      <li>Drag transition footage above timeline at cut point</li>
      <li>Set blend mode Screen / Overlay</li>
      <li>Cut happens at peak overlay intensity</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Method 2: Plugin-based</h3>
    <ul class="arc-list">
      <li>Sapphire (BorisFX), Red Giant transition plugin</li>
      <li>Apply directly trên cut</li>
      <li>Customize parameters</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Method 3: Manual Construction</h3>
    <ul class="arc-list">
      <li>Build trong After Effects với layered animation</li>
      <li>Lens flare (Optical Flares) + exposure animation</li>
      <li>Custom control, unique feel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Method 4: In-camera Optical</h3>
    <ul class="arc-list">
      <li>Shoot intentional overexposure end of shot</li>
      <li>Camera flash trigger at cut moment</li>
      <li>Most authentic but require planning</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Add Sound Design</h3>
    <ul class="arc-list">
      <li>Whoosh sound for whip pan</li>
      <li>Riser cho flash transition</li>
      <li>Critical cho sell transition</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Best Practices &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Use sparingly</strong> — every cut optical transition = exhausting</li>
    <li><strong>Match motivation</strong> — light flash needs reason (lightning, camera flash, action)</li>
    <li><strong>Consistent style</strong> — pick one transition type cho project, don&apos;t mix randomly</li>
    <li><strong>Sound design critical</strong> — visual + audio together = sell</li>
    <li><strong>Subtle Generally Better</strong> — heavy transition draws attention to editing</li>
    <li><strong>Wedding / Music Video</strong> appropriate use case</li>
    <li><strong>Narrative film</strong> use selectively for time/place change</li>
    <li><strong>Avoid presets overused</strong> — same Premiere transition everywhere = amateur</li>
    <li><strong>Custom transition</strong> set work apart professionally</li>
    <li><strong>Test on big screen</strong> — looks different than monitor</li>
  </ul>
</section>
`,
  },

  // 04. Orchestration
  {
    id: "64bf01df-bb7d-422d-9dcd-e69d08d3875a",
    tieu_de: "Orchestration",
    tieu_de_viet: "Phối khí (Orchestration)",
    tom_tat:
      "Orchestration là nghệ thuật phối khí — phân công nhạc cụ chơi phần nào trong bản nhạc để tạo màu sắc âm nhạc phong phú — quan trọng cho sáng tác nhạc phim, game, classical.",
    meta_title:
      "Orchestration là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Orchestration phối khí cho film/game music. Tìm hiểu instrument range, texture, balance và workflow trong Kontakt, Cubase.",
    noi_dung: `
<section class="arc-intro">
  <p>Hans Zimmer score Dune — strings, brass, choir, synth tạo wall of sound cinematic. John Williams Star Wars — orchestra timeless. Câu hỏi: cùng melody, sao mỗi composer khác? Đó là <strong>Orchestration</strong> — nghệ thuật phối khí, quyết định instrument nào chơi gì, tạo texture, color cho music. Critical skill cho composer.</p>
  <p>Orchestration là kỹ năng cao cấp cho composer film, game, classical music. Hiểu instrument range, ensemble balance, texture giúp sáng tác music sounding professional, cinematic. Modern composer often work in DAW với sample library — orchestration knowledge transfer.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Orchestration là gì?</h2>
  <p>Orchestration là <strong>nghệ thuật và science</strong> của phân công instrument để chơi different parts của music composition. Composer write melody, harmony — orchestrator (or composer themselves) decide which instrument plays which note. Same melody on flute vs trumpet vs cello = entirely different emotional impact. Orchestration <strong>defines sonic identity</strong> của piece.</p>
  <p>Bao gồm: choosing <strong>which instrument</strong> (flute or oboe?), <strong>which register</strong> (low vs high), <strong>which combination</strong> (strings alone vs strings + woodwind), <strong>doubling</strong> (octave doubling for strength), <strong>texture</strong> (homophonic vs polyphonic). Decision impact emotional, energy, color của music piece.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Composition vs Orchestration vs Arrangement</span>
    <p><strong>Composition</strong>: write melody, harmony, structure. <strong>Orchestration</strong>: assign instrument cho composition. <strong>Arrangement</strong>: adapt existing music to different ensemble. Overlap exists. Modern composer often do all three. Hollywood film: composer write theme, hire orchestrator to flesh out for full orchestra.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Instrument Range</strong> — pitch limits per instrument</li>
    <li><strong>Tessitura</strong> — most comfortable range</li>
    <li><strong>Doubling</strong> — multiple instrument same line</li>
    <li><strong>Voicing</strong> — chord spacing across instrument</li>
    <li><strong>Texture</strong> — overall density of music</li>
    <li><strong>Color / Timbre</strong> — sonic character</li>
    <li><strong>Counterpoint</strong> — multiple line interact</li>
    <li><strong>Balance</strong> — relative loudness</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"orchestration film scoring orchestra composer hans zimmer"</span>
    </div>
    <p class="arc-image-caption">Orchestration — phối khí, assign instrument tạo color cho music</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các Family Instrument</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Strings</summary>
      <div class="arc-card-body">
        <p>Violin (highest), Viola, Cello, Bass (lowest). Most expressive, versatile. Used cho emotional, melodic, sustained pad. Foundation của orchestra. Section size: 16 violin 1, 14 violin 2, 12 viola, 10 cello, 8 bass typical full orchestra.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Woodwinds</summary>
      <div class="arc-card-body">
        <p>Flute, Oboe, Clarinet, Bassoon. Lyrical, agile. Solo voice, lighter texture. Pastoral, intimate feel. Plus piccolo, English horn, bass clarinet, contrabassoon for extended range.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Brass</summary>
      <div class="arc-card-body">
        <p>French Horn, Trumpet, Trombone, Tuba. Powerful, dramatic. Heroic, military, epic. Loud volume capability. Hans Zimmer signature heavy brass.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Percussion</summary>
      <div class="arc-card-body">
        <p>Timpani, snare, cymbal, bass drum, chimes, marimba, xylophone. Rhythm, accent, color. Modern cinematic heavy percussion (Inception, Mad Max).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Choir</summary>
      <div class="arc-card-body">
        <p>SATB (Soprano, Alto, Tenor, Bass). Sacred, dramatic, otherworldly. Often Latin text for cinematic (O Fortuna).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Solo Instrument</summary>
      <div class="arc-card-body">
        <p>Piano, harp, guitar, vocalist. Featured solo voice. Intimate moment trong score.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Modern / Electronic</summary>
      <div class="arc-card-body">
        <p>Synth, sampler, electronic drum, processed acoustic. Hybrid film score (Hans Zimmer, Daft Punk style).</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Orchestration Workflow Modern</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Compose Theme</h3>
    <ul class="arc-list">
      <li>Piano sketch melody, harmony</li>
      <li>Establish theme, motif</li>
      <li>Focus on emotion before orchestration</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Map cho Picture</h3>
    <ul class="arc-list">
      <li>Watch film scene</li>
      <li>Determine emotional arc</li>
      <li>Plan instrument introduction theo scene</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Setup DAW Template</h3>
    <ul class="arc-list">
      <li>Cubase, Logic Pro, Pro Tools</li>
      <li>Pre-configured orchestra template</li>
      <li>Sample library: Spitfire BBC Symphony, EastWest Hollywood, NI Symphony</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Build Up Sections</h3>
    <ul class="arc-list">
      <li>Start với main melody on chosen instrument</li>
      <li>Add harmony (other instrument)</li>
      <li>Add countermelody</li>
      <li>Add rhythm section</li>
      <li>Add color (percussion, accent)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Balance Mix</h3>
    <ul class="arc-list">
      <li>EQ, compression per section</li>
      <li>Reverb to glue together</li>
      <li>Stereo placement (violin left, cello right)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Hire Live Recording (optional)</h3>
    <ul class="arc-list">
      <li>Mock-up MIDI → live orchestra recording</li>
      <li>Budapest, Prague, London scoring stage popular</li>
      <li>Mix live recording với MIDI mockup</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Final Mix &amp; Master</h3>
    <ul class="arc-list">
      <li>Pro mix engineer typically</li>
      <li>5.1 surround for theatrical</li>
      <li>Stereo for streaming</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Learning</h2>
  <ul class="arc-list">
    <li><strong>Film Composer</strong> — score movies, $50K-millions per film</li>
    <li><strong>Game Composer</strong> — interactive music, $30K-500K per game</li>
    <li><strong>TV Composer</strong> — series score, ongoing work</li>
    <li><strong>Concert Composer</strong> — orchestral commission, prestige</li>
    <li><strong>Orchestrator</strong> — work for composer, $50-200K</li>
    <li><strong>Studies</strong>: Berklee, Juilliard, Curtis, USC Thornton, Royal Academy</li>
    <li><strong>Self-learning</strong>: &quot;Adler&apos;s Orchestration&quot; textbook, Korsakov&apos;s &quot;Principles of Orchestration&quot;</li>
    <li><strong>Modern tool</strong>: Sibelius, Dorico for score notation</li>
    <li><strong>Sample library</strong>: Spitfire Audio, EastWest, Cinesamples, NI</li>
    <li><strong>Famous composer</strong>: John Williams, Hans Zimmer, Ennio Morricone, Howard Shore, Ramin Djawadi</li>
  </ul>
</section>
`,
  },

  // 05. Overlays
  {
    id: "efd9e006-d9cc-423e-9ce8-36e45d911ed3",
    tieu_de: "Overlays (Video)",
    tieu_de_viet: "Lớp phủ Video (Overlays)",
    tom_tat:
      "Overlays là lớp hình ảnh/video được chồng lên footage chính với blend mode như Screen hoặc Multiply — bao gồm grain, light leaks, textures — để thêm cảm giác và chiều sâu.",
    meta_title:
      "Overlays là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Video Overlays film grain, light leaks. Tìm hiểu các loại, sources và workflow apply trong AE, Premiere chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn editor cần footage feel &quot;more cinematic&quot; — add <strong>overlays</strong>: light leak warm, film grain texture, dust particle, lens dirt. Mỗi overlay add subtle layer feel. Combine multiple → footage transform from digital flat to cinematic, organic. Overlay là productivity hack quan trọng cho modern video editor.</p>
  <p>Overlays là kỹ thuật essential cho video editor, colorist, motion designer. Hiểu các loại overlay, blend mode interaction, và workflow apply giúp boost production value của footage nhanh chóng — đặc biệt cho music video, social media content, indie film.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Overlays là gì?</h2>
  <p>Overlays trong video editing là <strong>image hoặc video layer</strong> composite trên footage chính, typically với <strong>blend mode</strong> (Screen, Overlay, Multiply, Add) để integrate naturally. Mỗi overlay add specific visual element — texture, lighting effect, particle, color cast. Combination multiple overlay = custom look mạnh không thể achieve in-camera dễ dàng.</p>
  <p>Common overlay types: <strong>Film Grain</strong> (organic texture), <strong>Light Leaks</strong> (warm color wash), <strong>Dust &amp; Scratches</strong> (vintage feel), <strong>Lens Dirt</strong> (organic camera characteristic), <strong>Bokeh</strong> (dreamy out-of-focus light), <strong>Smoke / Fog</strong> (atmosphere), <strong>Particles</strong> (dust, snow, rain). Stock footage marketplace sell overlay pack.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Overlay vs Effect vs Plugin</span>
    <p><strong>Overlay</strong>: image/video layer composite via blend mode. Self-contained footage. <strong>Effect</strong>: built-in software effect (Lens Flare, Glow). <strong>Plugin</strong>: third-party algorithm (Optical Flares, Sapphire). Overlay easier, more flexible than built-in effect. Plugin offer parametric control.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Film Grain</strong> — analog film texture</li>
    <li><strong>Light Leaks</strong> — warm color wash</li>
    <li><strong>Dust &amp; Scratches</strong> — vintage feel</li>
    <li><strong>Lens Dirt</strong> — camera characteristic</li>
    <li><strong>Bokeh</strong> — out-of-focus light</li>
    <li><strong>Smoke / Fog</strong> — atmospheric</li>
    <li><strong>Particles</strong> — dust, snow, rain</li>
    <li><strong>Screen Blend Mode</strong> — most common cho overlay</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"video overlay grain light leak dust cinematic"</span>
    </div>
    <p class="arc-image-caption">Overlays — image/video layer add texture, mood, atmosphere</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Overlay</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Film Grain Overlay</summary>
      <div class="arc-card-body">
        <p>Analog film texture. 16mm, 35mm, 65mm grain. Subtle vintage feel. Used in nearly every cinematic project. Source: Cinegrain, RocketStock, VashiVisuals.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Light Leaks</summary>
      <div class="arc-card-body">
        <p>Warm orange/yellow light wash. Vintage, dreamy. Use cho transition or moment elevation. Wedding video standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lens Dirt / Drops</summary>
      <div class="arc-card-body">
        <p>Real lens with smudge, water drop. Subtle imperfection add realism. Apocalyptic, dystopian feel possible.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dust Particles</summary>
      <div class="arc-card-body">
        <p>Floating dust. Often used cho sunlight beam (light shaft). Atmospheric depth. Ancient/mystical setting.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bokeh / Glow Particles</summary>
      <div class="arc-card-body">
        <p>Out-of-focus circular light. Dreamy, romantic. Wedding, music video. Premium feel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Smoke / Fog</summary>
      <div class="arc-card-body">
        <p>Atmospheric layer. Add depth, mystery. Combat scene, horror, mystery. ActionVFX library.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Rain / Snow</summary>
      <div class="arc-card-body">
        <p>Weather effect. Add to scene shot in clear weather. Multiple layer for depth (foreground rain heavier, BG lighter).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Glitch / Distortion</summary>
      <div class="arc-card-body">
        <p>Digital error effect. Sci-fi, cyberpunk. RGB shift, scan lines.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Texture / Paper</summary>
      <div class="arc-card-body">
        <p>Paper texture, fabric. Add tactile feel. Indie aesthetic.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Apply Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Choose Overlay</h3>
    <ul class="arc-list">
      <li>Match overlay to scene mood</li>
      <li>4K resolution preferred</li>
      <li>Loopable if needed</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Place trên Footage</h3>
    <ul class="arc-list">
      <li>Layer ABOVE main footage</li>
      <li>Trim to scene duration</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Choose Blend Mode</h3>
    <ul class="arc-list">
      <li><strong>Screen</strong>: black BG transparent (light leak, glow, particles)</li>
      <li><strong>Add</strong>: brighten everything below</li>
      <li><strong>Overlay</strong>: contrast enhancement (grain, texture)</li>
      <li><strong>Multiply</strong>: darken (vignette, dirt)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Adjust Opacity</h3>
    <ul class="arc-list">
      <li>20-60% typical subtle</li>
      <li>Lower (10-30%) cho very subtle</li>
      <li>Avoid 100% — overpowering</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Color Match</h3>
    <ul class="arc-list">
      <li>Tint overlay to match scene grade</li>
      <li>Hue shift if needed</li>
      <li>Saturation adjust</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Time với Music / Action</h3>
    <ul class="arc-list">
      <li>Brightest part of overlay at emotional peak</li>
      <li>Light leak timed với chorus drop</li>
      <li>Dust particle at quiet contemplative moment</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Stack Multiple Overlay</h3>
    <ul class="arc-list">
      <li>Grain + light leak + dust simultaneously</li>
      <li>Each subtle, combined rich</li>
      <li>Don&apos;t overdo</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Resources &amp; Best Practices</h2>
  <ul class="arc-list">
    <li><strong>RocketStock</strong> — comprehensive overlay packs</li>
    <li><strong>Triune Digital</strong> — premium quality</li>
    <li><strong>VashiVisuals</strong> — Vashi Nedomansky&apos;s pack</li>
    <li><strong>Motion Array</strong> — subscription based</li>
    <li><strong>ActionVFX</strong> — explosion, smoke, fire</li>
    <li><strong>Free YouTube creators</strong> — Filmsuplly, Slack Sound free pack</li>
    <li><strong>Tip</strong>: subtle is better — overlay should support footage, không overshadow</li>
    <li><strong>Tip</strong>: avoid clichéd overlay — &quot;same VashiVisuals pack&quot; everyone use</li>
    <li><strong>Tip</strong>: custom overlay shot in-camera (overexposed light through prism) for unique look</li>
    <li><strong>Tip</strong>: motion designer create custom overlay = signature work</li>
    <li><strong>Color match critical</strong> — orange overlay over blue scene = jarring</li>
  </ul>
</section>
`,
  },

  // 06. Pacing
  {
    id: "857cf574-97bb-47e0-ae60-53fd153fb456",
    tieu_de: "Pacing (Storytelling)",
    tieu_de_viet: "Nhịp độ kể chuyện (Pacing)",
    tom_tat:
      "Pacing là tốc độ diễn biến câu chuyện, quyết định khi nào sự kiện chính xảy ra và cách người xem cảm nhận dòng thời gian — yếu tố quan trọng cho film, animation, game narrative.",
    meta_title: "Pacing là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Pacing trong storytelling. Tìm hiểu rhythm, beat structure và cách control pacing trong editing, animation, game design.",
    noi_dung: `
<section class="arc-intro">
  <p>Phim Marvel 2 tiếng cảm thấy nhanh — Mission Impossible action sequence không stop. Indie drama 2 tiếng cảm thấy dài lê thê. Same length, very different feel — đó là <strong>Pacing</strong>. Nhịp độ câu chuyện quyết định audience experience — quá nhanh = confused, quá chậm = boring, đúng = engaged throughout.</p>
  <p>Pacing là kỹ năng critical cho mọi storyteller — director, editor, animator, game designer. Hiểu rhythm of beats, tension &amp; release, control pacing through editing và writing giúp keep audience engaged — distinguishing successful project và failed.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Pacing là gì?</h2>
  <p>Pacing là <strong>tốc độ diễn biến</strong> của story — how fast events unfold, how much screen time devoted to specific moment, rhythm of action vs reflection. Affects how audience perceive time và emotional engagement. Good pacing keep audience leaning forward; poor pacing causes drift, attention loss.</p>
  <p>Multiple level of pacing: <strong>Scene pacing</strong> (rhythm within scene), <strong>Sequence pacing</strong> (multiple scene together), <strong>Act pacing</strong> (overall structure), <strong>Cross-cutting pacing</strong> (parallel scene rhythm). Editor often called &quot;invisible heroes of pacing&quot; — final cut decision shape film&apos;s rhythm.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Pacing vs Rhythm vs Tempo</span>
    <p><strong>Pacing</strong>: how story unfolds over time, broad concept. <strong>Rhythm</strong>: pattern of editing cuts, beats. <strong>Tempo</strong>: speed of action within scene. Inter-related — pacing achieved through manipulating rhythm and tempo.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Beat</strong> — smallest narrative unit</li>
    <li><strong>Scene</strong> — single location/time</li>
    <li><strong>Sequence</strong> — multiple scenes combine</li>
    <li><strong>Act</strong> — major story division</li>
    <li><strong>Tension &amp; Release</strong> — buildup followed by relief</li>
    <li><strong>Rising Action</strong> — increasing stakes</li>
    <li><strong>Climax</strong> — peak moment</li>
    <li><strong>Denouement</strong> — wind-down after climax</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"pacing storytelling editing rhythm narrative film"</span>
    </div>
    <p class="arc-image-caption">Pacing — nhịp độ story, control audience engagement</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Pacing Strategy</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Fast Pacing</summary>
      <div class="arc-card-body">
        <p>Quick cuts, short scene, rapid event. Action movie, thriller. Mission Impossible, Mad Max. Audience adrenaline up. Cons: exhausting if sustained, no emotional breathing room.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Slow Pacing</summary>
      <div class="arc-card-body">
        <p>Long take, contemplative, slow buildup. Tarkovsky, Lynne Ramsay. Emotional depth, meditation. Cons: lose audience if too slow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Variable Pacing</summary>
      <div class="arc-card-body">
        <p>Mix fast và slow. Most successful. Fast action scene followed by quiet character moment. Standard Hollywood structure.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Building Pacing</summary>
      <div class="arc-card-body">
        <p>Start slow, accelerate to climax. Classic three-act structure. Rises into final act crescendo.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>In-Media-Res</summary>
      <div class="arc-card-body">
        <p>Open in middle of action, then flashback explain. Quick hook. Used by James Bond opening, Breaking Bad pilot.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cross-cutting</summary>
      <div class="arc-card-body">
        <p>Switch between parallel scene. Maintain tension across multiple location. Rapid intercut = increase pace.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Control Pacing through Editing</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cut Length</h3>
    <ul class="arc-list">
      <li>Short shot (1-2s) = fast pacing</li>
      <li>Long take (10s+) = slow pacing</li>
      <li>Average shot length (ASL) increasing modern (4s now, 8s 1970s)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Music &amp; Sound</h3>
    <ul class="arc-list">
      <li>Fast tempo music = fast feel</li>
      <li>Music silent moment = pause</li>
      <li>Sound design accelerate/decelerate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Camera Movement</h3>
    <ul class="arc-list">
      <li>Static shot = slow feel</li>
      <li>Dynamic camera (dolly, handheld) = energy</li>
      <li>Steadicam fluid feel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Performance / Dialogue</h3>
    <ul class="arc-list">
      <li>Quick dialogue overlap = fast</li>
      <li>Pause, silence = slow</li>
      <li>Actor blocking speed</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Slow Motion / Speed Ramp</h3>
    <ul class="arc-list">
      <li>Slow mo expand moment</li>
      <li>Speed up condense time</li>
      <li>Ramp transitions</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cross-Cutting</h3>
    <ul class="arc-list">
      <li>Intercut multiple scene</li>
      <li>Rapid intercut = increase tension</li>
      <li>Climax often heavy crosscutting</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Pacing</h2>
  <ul class="arc-list">
    <li><strong>Vary pacing throughout</strong> — sustained one tempo lose audience</li>
    <li><strong>Quiet moment after action</strong> — emotional breathing room</li>
    <li><strong>Cut on action</strong> — feel natural</li>
    <li><strong>Trust audience</strong> — don&apos;t over-explain</li>
    <li><strong>Test với fresh eye</strong> — invite viewer feedback</li>
    <li><strong>Read script aloud</strong> — sense rhythm</li>
    <li><strong>Edit dialogue tight</strong> — most beginner mistake leaves too much pause</li>
    <li><strong>Trim opening</strong> — viewer impatient at start</li>
    <li><strong>Pixar storyboard pass</strong> — many iteration adjust pacing</li>
    <li><strong>Game pacing</strong> — different — interactive moment vs cutscene</li>
    <li><strong>Modern TV</strong> — Netflix data show people drop off, optimize early episode</li>
  </ul>
</section>
`,
  },

  // 07. Packaging Design
  {
    id: "0fd6675d-82bd-4b32-854b-e823bc26a75e",
    tieu_de: "Packaging Design",
    tieu_de_viet: "Thiết kế bao bì",
    tom_tat:
      "Packaging Design là quá trình thiết kế bao bì sản phẩm — cấu trúc, hình ảnh, màu sắc, typography — để truyền tải thương hiệu, attract consumer trên shelf, và protect product.",
    meta_title:
      "Packaging Design là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Packaging Design thiết kế bao bì sản phẩm. Tìm hiểu nguyên tắc, dieline, material choice và career path packaging designer.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn đứng trước supermarket shelf — 50 brand chocolate. Trong 3 giây, pick one. Decision based on packaging — color, shape, typography, illustration. Apple iPhone box unboxing experience trending — packaging itself part of brand. Coca-Cola contoured bottle iconic 100+ year. <strong>Packaging Design</strong> không chỉ box — là brand experience.</p>
  <p>Packaging Design là specialized career trong graphic design — high demand, well-compensated. Hiểu nguyên tắc thiết kế packaging, dieline workflow, material consideration và shelf impact giúp tạo packaging effective — driving sales và brand recognition.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Packaging Design là gì?</h2>
  <p>Packaging Design là <strong>discipline tổng hợp</strong> thiết kế bao bì sản phẩm — bao gồm <strong>structural design</strong> (form, material, construction), <strong>graphic design</strong> (label, illustration, typography), và <strong>brand communication</strong> (message, identity). Goal: protect product, attract consumer trên shelf, communicate brand, fulfill regulatory requirement.</p>
  <p>Comprehensive scope: cardboard box, plastic bottle, paper bag, aluminum can, glass jar, pouch — every consumer good has packaging. Packaging designer often work với industrial designer (structural), copywriter (text), printer/manufacturer. Result: physical object consumer hold, judge, recognize.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Packaging Design Functions</span>
    <p><strong>1. Protect</strong>: shipping, shelf life, durability. <strong>2. Inform</strong>: ingredient, regulatory, instruction. <strong>3. Attract</strong>: shelf appeal, brand differentiation. <strong>4. Brand</strong>: visual identity, premium feel. <strong>5. Functional</strong>: open/close, dispense, reuse. Good design balance all five.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Dieline</strong> — flat cut/fold template</li>
    <li><strong>Material</strong> — cardboard, plastic, glass, metal</li>
    <li><strong>Print Finish</strong> — gloss, matte, soft touch</li>
    <li><strong>Special Effect</strong> — emboss, foil, spot UV</li>
    <li><strong>Shelf Test</strong> — packaging in retail environment</li>
    <li><strong>Sustainability</strong> — eco-friendly material</li>
    <li><strong>Regulatory</strong> — FDA, EU label requirement</li>
    <li><strong>Mockup</strong> — visualize design before print</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"packaging design box bottle label product brand"</span>
    </div>
    <p class="arc-image-caption">Packaging Design — comprehensive product brand experience trên shelf</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Loại Packaging</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Primary Packaging</summary>
      <div class="arc-card-body">
        <p>Direct contact với product — bottle, jar, can. Tube. Hold product, deliver shape recognition. iPhone primary package = box product sit in.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Secondary Packaging</summary>
      <div class="arc-card-body">
        <p>Wraps primary — outer box, sleeve. Branding canvas. Shelf display. Often most visually impactful.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tertiary Packaging</summary>
      <div class="arc-card-body">
        <p>Shipping, bulk — pallet wrap, shipping carton. Function over form. Less consumer-facing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Beverage Packaging</summary>
      <div class="arc-card-body">
        <p>Bottle (water, soda, alcohol). Can (beer, soda). Specialized: shape ergonomic, label legible at angle.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Food Packaging</summary>
      <div class="arc-card-body">
        <p>Bag, box, pouch, jar. Regulatory heavy — nutrition label, ingredient. Premium vs budget aesthetics.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Beauty &amp; Cosmetics</summary>
      <div class="arc-card-body">
        <p>Bottle, jar, tube, palette. Luxury feel critical. Premium material — foil, emboss common. High-margin industry.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pharmaceuticals</summary>
      <div class="arc-card-body">
        <p>Pill bottle, blister pack. Tamper-evident, child-resistant. Regulatory dense. Less creative freedom.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Electronics</summary>
      <div class="arc-card-body">
        <p>Phone, gadget box. Premium unboxing experience. Apple sets standard.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Packaging Design</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Brief &amp; Research</h3>
    <ul class="arc-list">
      <li>Brand, product, target audience</li>
      <li>Market research — competitor shelf analysis</li>
      <li>Regulatory requirement check</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Structural Design</h3>
    <ul class="arc-list">
      <li>Define shape, dimension, material</li>
      <li>Production feasibility với manufacturer</li>
      <li>Functional consideration — opening, dispensing</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Dieline</h3>
    <ul class="arc-list">
      <li>Flat template với fold/cut line</li>
      <li>Critical for accurate print</li>
      <li>Industry standard format</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Graphic Design</h3>
    <ul class="arc-list">
      <li>Logo placement</li>
      <li>Color palette</li>
      <li>Typography hierarchy</li>
      <li>Illustration / photography</li>
      <li>Brand-aligned aesthetic</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Apply to Dieline</h3>
    <ul class="arc-list">
      <li>Adobe Illustrator — packaging design tool standard</li>
      <li>Map design to flat dieline</li>
      <li>Account fold, panel hierarchy</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. 3D Mockup</h3>
    <ul class="arc-list">
      <li>Visualize folded structure</li>
      <li>Adobe Dimension, Cinema 4D, Esko ArtiosCAD</li>
      <li>Client presentation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Prototype &amp; Test</h3>
    <ul class="arc-list">
      <li>Print prototype with manufacturer</li>
      <li>Shelf test — see in retail environment</li>
      <li>Consumer testing</li>
      <li>Iterate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Production</h3>
    <ul class="arc-list">
      <li>Final dieline to manufacturer</li>
      <li>Color proof approval</li>
      <li>Print run</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Resources</h2>
  <ul class="arc-list">
    <li><strong>Junior Packaging Designer</strong> — $45K-65K</li>
    <li><strong>Senior Packaging Designer</strong> — $75K-110K</li>
    <li><strong>Design Director Packaging</strong> — $120K-180K</li>
    <li><strong>Freelance</strong> — $50-200/hour</li>
    <li><strong>Top firms</strong>: Pearlfisher, Turner Duckworth, Brand Union, Landor</li>
    <li><strong>In-house brand</strong>: Apple, Nike, Coca-Cola, Unilever, P&amp;G</li>
    <li><strong>Tools</strong>: Adobe Illustrator (primary), Esko Studio cho mockup, Photoshop</li>
    <li><strong>Inspiration</strong>: The Dieline blog, Packaging of the World, Pentawards</li>
    <li><strong>Education</strong>: BFA Graphic Design + packaging specialization</li>
    <li><strong>Sustainability trend</strong> — eco-packaging in demand</li>
  </ul>
</section>
`,
  },

  // 08. Paintover
  {
    id: "5b067df3-48cf-4e92-8ec5-ad122806e04f",
    tieu_de: "Paintover",
    tieu_de_viet: "Paintover trong Concept Art",
    tom_tat:
      "Paintover là kỹ thuật vẽ trực tiếp lên ảnh chụp hoặc mô hình 3D có sẵn để nhanh chóng thêm chi tiết, ánh sáng, màu sắc — phổ biến trong concept art cho film, game.",
    meta_title: "Paintover là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Paintover trong concept art. Tìm hiểu workflow combining photobash + paint, 3D blockout + paintover cho production speed.",
    noi_dung: `
<section class="arc-intro">
  <p>Concept artist Marvel cần concept spaceship cho film tuần này. Vẽ từ blank canvas mất tuần. Workflow modern: <strong>paintover</strong> — block 3D model rough trong Blender, render basic, sau đó paint over trong Photoshop để add detail, mood, lighting. Result: hours, not weeks. Đây là productivity multiplier critical cho concept artist working in studio.</p>
  <p>Paintover là kỹ thuật pro cho concept artist, illustrator, VFX artist. Hiểu workflow combine 3D blockout + paintover hoặc photobash + paintover giúp produce concept art fast và polished — phù hợp deadline-driven studio environment.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Paintover là gì?</h2>
  <p>Paintover là kỹ thuật <strong>painting digital</strong> lên top of existing image hoặc 3D render để <strong>refine, polish, add detail</strong>. Foundation image cung cấp structure (perspective, proportion, composition); paint layer add artistic detail (highlight, lighting, mood, fine detail, color shift). Powerful productivity tool — skip tedious construction work, focus on artistic refinement.</p>
  <p>Two main workflow: (1) <strong>Photobash paintover</strong> — combine photo cho base, paint over để unify; (2) <strong>3D paintover</strong> — block 3D model basic, render, paint over để polish. Concept artist switch between depending on subject. Personal style emerge — heavy paintover (mostly painting), light paintover (mostly reference photo with minimal paint).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Paintover vs Photobashing vs Pure Painting</span>
    <p><strong>Photobashing</strong>: combine multiple photo. <strong>Paintover</strong>: paint on top of foundation. <strong>Pure painting</strong>: vẽ from blank canvas. Modern concept artist combine techniques — start photobash, paintover unify, final touches pure paint. Hybrid workflow standard.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Foundation Image</strong> — base (photo or 3D render)</li>
    <li><strong>Paint Layer</strong> — additions in Photoshop</li>
    <li><strong>3D Blockout</strong> — rough 3D base</li>
    <li><strong>Photobash</strong> — combined photo base</li>
    <li><strong>Unify</strong> — make composite cohesive</li>
    <li><strong>Color Grading</strong> — adjust overall color</li>
    <li><strong>Detail Pass</strong> — fine paint detail</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"paintover concept art 3D photoshop digital painting"</span>
    </div>
    <p class="arc-image-caption">Paintover — paint trên base image, productivity multiplier concept art</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Loại Paintover</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>3D Blockout Paintover</summary>
      <div class="arc-card-body">
        <p>Build rough 3D model trong Blender, ZBrush, Maya. Simple shape, no detail. Render basic. Import to Photoshop. Paint detail, polish, mood. Speed up architectural, mechanical, vehicle design.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Kitbash Paintover</summary>
      <div class="arc-card-body">
        <p>Combine kitbash 3D parts (Kitbash3D) for complex sci-fi/mech. Render. Paintover unify. Industry standard cho concept art Marvel, Star Wars.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photobash Paintover</summary>
      <div class="arc-card-body">
        <p>Combine photo reference — clouds, mountain, building. Composite trong Photoshop. Paintover to integrate, add original element.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sketch Paintover</summary>
      <div class="arc-card-body">
        <p>Hand sketch base, scan, paintover color and detail in Photoshop. Traditional + digital hybrid.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>AI Image Paintover (Modern)</summary>
      <div class="arc-card-body">
        <p>Midjourney, Stable Diffusion generate base. Paintover to add original detail, fix problem area. Speed plus originality.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VFX Concept Paintover</summary>
      <div class="arc-card-body">
        <p>VFX shot frame as base. Paintover add CGI element concept — show director what shot will look like.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow 3D Blockout Paintover</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Rough 3D Block</h3>
    <ul class="arc-list">
      <li>Simple shape — primitive cube, sphere</li>
      <li>Establish proportion, perspective</li>
      <li>Don&apos;t detail — keep rough</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Basic Lighting</h3>
    <ul class="arc-list">
      <li>Setup light direction</li>
      <li>HDRI for ambient</li>
      <li>Just enough for shadow/light info</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Render Multiple Pass</h3>
    <ul class="arc-list">
      <li>Beauty render (color)</li>
      <li>Ambient occlusion</li>
      <li>Normal pass</li>
      <li>ID pass cho selecting</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Import to Photoshop</h3>
    <ul class="arc-list">
      <li>Beauty as base layer</li>
      <li>AO multiply blend mode</li>
      <li>Normal for reference</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Block Color Grade</h3>
    <ul class="arc-list">
      <li>Overall mood color</li>
      <li>Adjust temperature</li>
      <li>Establish atmosphere</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Paint Detail</h3>
    <ul class="arc-list">
      <li>Brush detail — panel, weathering, highlight</li>
      <li>Follow 3D base&apos;s light direction</li>
      <li>Build progressively from broad to fine</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Add Atmosphere</h3>
    <ul class="arc-list">
      <li>Fog, haze for depth</li>
      <li>Atmospheric perspective</li>
      <li>Particle, light shaft</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Final Polish</h3>
    <ul class="arc-list">
      <li>Sharp edge focal point</li>
      <li>Color dodge highlights</li>
      <li>Final color grading</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Tools</h2>
  <ul class="arc-list">
    <li><strong>Software</strong>: Photoshop primary, Blender 3D blockout, Procreate iPad workflow</li>
    <li><strong>Brush set</strong>: Mixer brush, custom textured brush cho organic feel</li>
    <li><strong>Layer organization</strong>: separate base, color, detail, atmosphere — easy edit</li>
    <li><strong>Keep base layer intact</strong> — paint on new layer, preserve foundation</li>
    <li><strong>Brushes by Jaime Jones, FZD School</strong> — popular concept art brushes</li>
    <li><strong>Reference critical</strong> — keep reference open even while paintover</li>
    <li><strong>Don&apos;t over-render</strong> — concept art ≠ illustration finished</li>
    <li><strong>Focus focal area</strong> — most detail on subject, looser elsewhere</li>
    <li><strong>Iterate fast</strong> — multiple thumbnail before commit big paintover</li>
    <li><strong>Career</strong>: concept artist studio $60K-130K, top freelance $200K+</li>
  </ul>
</section>
`,
  },

  // 09. Parametric Objects
  {
    id: "c785838e-5eca-4b27-9b42-ecee8e6dfd3a",
    tieu_de: "Parametric Objects",
    tieu_de_viet: "Đối tượng tham số (Parametric Objects)",
    tom_tat:
      "Parametric Objects là đối tượng 3D định nghĩa bằng tham số có thể điều chỉnh thay vì hình học cố định — thay đổi radius, segments, height mà không cần model lại.",
    meta_title:
      "Parametric Objects là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Parametric Objects 3D modeling. Tìm hiểu Cinema 4D primitive, Houdini procedural và workflow non-destructive.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn create cube trong Cinema 4D — 200×200×200 cm. Need adjust to 300 cm width? Click Width parameter, change 200 → 300. Cube auto-update. Đây là <strong>Parametric Object</strong> — đối tượng define bằng parameter có thể adjust anytime. Khác cube polygon manual modeled — không có parameter, modify lại tedious. Foundation của <strong>procedural modeling</strong>.</p>
  <p>Parametric Objects là kiến thức cơ bản cho 3D artist. Hiểu khái niệm và workflow giúp non-destructive editing — change anytime, reusable, iterable. Critical cho motion graphics (Cinema 4D Mograph), architectural viz, procedural generation (Houdini).</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Parametric Objects là gì?</h2>
  <p>Parametric Objects là <strong>3D object defined bằng mathematical parameters</strong> thay vì cố định vertex/polygon data. Software regenerate geometry mỗi khi parameter change. Vd: sphere object có Radius parameter — adjust radius 1m → 5m → sphere regenerate to new size. Segments parameter control polygon count.</p>
  <p>Modern 3D software dispatch <strong>primitive parametric object</strong> (cube, sphere, cylinder, cone, torus, plane) cùng generator object (extrude, sweep, loft) — all parametric. Modifier stack (3ds Max) hoặc procedural network (Houdini) là parametric workflow. Convert parametric → polygon = lose parametric ability, vertex frozen.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Parametric vs Polygon Editing</span>
    <p><strong>Parametric</strong>: edit parameter, geometry regenerate. Non-destructive. <strong>Polygon</strong>: edit vertex directly. Destructive — irreversible without undo. Workflow: start parametric (rough block), convert polygon for final detail. Best of both world.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Primitive</strong> — basic parametric shape (cube, sphere)</li>
    <li><strong>Parameter</strong> — adjustable value</li>
    <li><strong>Generator</strong> — parametric operation (extrude, sweep)</li>
    <li><strong>Modifier Stack</strong> — 3ds Max parametric chain</li>
    <li><strong>Procedural</strong> — algorithm-based parametric</li>
    <li><strong>Non-destructive</strong> — edits remain reversible</li>
    <li><strong>Convert to Polygon</strong> — bake parametric to fixed</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"parametric objects 3D cinema 4D primitive modifier procedural"</span>
    </div>
    <p class="arc-image-caption">Parametric Objects — adjustable parameters, non-destructive 3D workflow</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Software Parametric</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Cinema 4D</summary>
      <div class="arc-card-body">
        <p>Strong parametric primitive (cube, sphere, etc.). Generator (extrude, sweep, loft) parametric. Mograph entire system parametric. Motion graphics workflow heavy parametric.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Houdini</summary>
      <div class="arc-card-body">
        <p>Most powerful procedural / parametric — everything network of node, each node parametric. SideFX. Complex VFX, simulation, procedural generation entire scene.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3ds Max</summary>
      <div class="arc-card-body">
        <p>Modifier Stack — non-destructive modifier chain. Primitive parametric. Architectural visualization. Edit Poly converts to polygon.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Maya</summary>
      <div class="arc-card-body">
        <p>Construction History — Maya&apos;s parametric system. Polygon primitive parametric initially. Delete History bake polygon. Less powerful than Houdini.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender</summary>
      <div class="arc-card-body">
        <p>Modifier system. Geometry Nodes (3.0+) procedural workflow. Increasing parametric capability. Free.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Rhino / Grasshopper</summary>
      <div class="arc-card-body">
        <p>Architectural standard. Grasshopper plugin = visual programming parametric. Complex parametric architecture.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fusion 360 / SolidWorks</summary>
      <div class="arc-card-body">
        <p>CAD software. Fully parametric — every dimension, feature parametric. Engineering precision. Change dimension propagate through model.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Use Cases Parametric</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Iteration Fast</h3>
    <ul class="arc-list">
      <li>Test multiple variation by adjusting parameter</li>
      <li>Client want building 5 floors vs 10? Change parameter</li>
      <li>Faster than re-modeling</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation Driver</h3>
    <ul class="arc-list">
      <li>Animate parameter over time</li>
      <li>Cube grow/shrink — animate Width parameter</li>
      <li>Sphere subdivide — animate Segments</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Procedural Generation</h3>
    <ul class="arc-list">
      <li>Generate trees, rocks, building with parameter</li>
      <li>Variation from same template</li>
      <li>Houdini procedural city, foliage</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Architecture / Engineering</h3>
    <ul class="arc-list">
      <li>CAD parametric — adjust building dimension</li>
      <li>Engineering tolerance via parameter</li>
      <li>Reusable component library</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Graphics</h3>
    <ul class="arc-list">
      <li>Mograph cloner parametric</li>
      <li>Adjust count, distribution easily</li>
      <li>Animate parameter cho dynamic effect</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Procedural Asset</h3>
    <ul class="arc-list">
      <li>Generate variation in-engine</li>
      <li>Houdini Engine in Unreal/Unity</li>
      <li>Procedural level design</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Best Practices</h2>
  <ul class="arc-list">
    <li><strong>Keep parametric until necessary</strong> — convert polygon only when need direct edit</li>
    <li><strong>Use generator</strong> — extrude, sweep, loft cho non-destructive</li>
    <li><strong>Modifier stack discipline</strong> (3ds Max) — order matters</li>
    <li><strong>Houdini network organization</strong> — sticky note, color, hierarchy</li>
    <li><strong>Parameter naming</strong> — clear, meaningful</li>
    <li><strong>Save parametric template</strong> — reusable asset</li>
    <li><strong>Performance tip</strong> — heavy parametric slow viewport, bake when needed</li>
    <li><strong>Limit polygon</strong> — parametric can spawn many polygon at high segment</li>
    <li><strong>Learning curve</strong>: Houdini parametric thinking takes time, worth investment</li>
    <li><strong>Career boost</strong>: Houdini procedural artist $100K+ for senior role</li>
  </ul>
</section>
`,
  },

  // 10. Particle Effects
  {
    id: "e0525636-769e-48e0-855d-41a5ba2e6e9d",
    tieu_de: "Particle Effects",
    tieu_de_viet: "Hiệu ứng hạt (Particle)",
    tom_tat:
      "Particle Effects tạo chuyển động đồ họa phức tạp từ vô số phần tử nhỏ (hạt) — mô phỏng hiện tượng tự nhiên như mưa, khói, lửa, hoặc hiệu ứng trừu tượng — foundation VFX.",
    meta_title:
      "Particle Effects là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Particle Effects trong VFX, motion graphics. Tìm hiểu particle system Houdini, AE, Unity và workflow tạo fire, smoke, sparks.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Marvel film — Thor lightning bolts với electric particle xung quanh. Game Cyberpunk — neon glow particle, fire dance. Music video — flowing particle trail. Website Apple với floating particle ambient. <strong>Particle Effects</strong> ở khắp nơi trong modern visual content — từ subtle ambiance đến dramatic explosion.</p>
  <p>Particle Effects là kỹ thuật essential cho VFX artist, motion designer, game artist. Hiểu particle system, emitter, force, và software workflow giúp create stunning visual effect — fire, smoke, sparks, magic, abstract motion graphics. Versatile tool ở mọi industry creative.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Particle Effects là gì?</h2>
  <p>Particle Effects là kỹ thuật tạo visual effect bằng cách <strong>simulate vô số particle nhỏ</strong> — mỗi particle là tiny point/sprite, multiple particle tạo thành emergent behavior. Particle system controls: <strong>emitter</strong> (spawn point), <strong>life</strong> (duration), <strong>velocity</strong> (initial speed/direction), <strong>force</strong> (gravity, wind), <strong>look</strong> (color, size, sprite image). Result: complex motion impossible to keyframe individually.</p>
  <p>Particle system traditional based on <strong>physics</strong> (real-world simulation) hoặc <strong>artistic</strong> (stylized). Real-time particle (game engine) optimized fast — limited count, sprite-based. Offline render particle (film VFX) — millions of particle, volumetric, expensive. Modern AI particle (TyFlow, Houdini) generative.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Particle vs Mesh vs Sprite</span>
    <p><strong>Sprite Particle</strong>: 2D image billboard always face camera. Fast, real-time. <strong>Mesh Particle</strong>: 3D mesh per particle. More detail, expensive. <strong>Point Particle</strong>: single dot. Simplest, billions possible. Choose based on use case.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Emitter</strong> — spawn source for particle</li>
    <li><strong>Particle Life</strong> — duration before disappear</li>
    <li><strong>Velocity</strong> — initial direction/speed</li>
    <li><strong>Force / Field</strong> — gravity, wind, turbulence</li>
    <li><strong>Collision</strong> — interact với geometry</li>
    <li><strong>Sprite / Mesh Render</strong> — how particle display</li>
    <li><strong>Trail</strong> — line behind particle</li>
    <li><strong>Birth Rate</strong> — particles per second</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"particle effects VFX fire smoke sparks houdini after effects"</span>
    </div>
    <p class="arc-image-caption">Particle Effects — simulate vô số element nhỏ tạo complex visual</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Software Particle</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Houdini</summary>
      <div class="arc-card-body">
        <p>Most powerful particle system trong industry. POP (Particles Operators) network. Combine với DOP (Dynamic Operators) for full simulation. Used by ILM, Weta cho film blockbuster.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>After Effects</summary>
      <div class="arc-card-body">
        <p>Built-in CC Particle World, CC Particle Systems II. Plus Trapcode Particular (Red Giant) industry standard cho motion graphics. Sapphire ParticleEffects.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cinema 4D</summary>
      <div class="arc-card-body">
        <p>Thinking Particles, X-Particles (plugin most popular). Mograph integration. Motion graphics standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3ds Max</summary>
      <div class="arc-card-body">
        <p>Particle Flow, TyFlow (advanced plugin). Game industry use. Capable particle system.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Maya</summary>
      <div class="arc-card-body">
        <p>nParticle, MASH cho motion graphics. Integration Maya pipeline. Less popular than Houdini for VFX.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender</summary>
      <div class="arc-card-body">
        <p>Particle System, Geometry Nodes (3.0+) for procedural. Free, growing capability.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Unity / Unreal Engine</summary>
      <div class="arc-card-body">
        <p>Real-time particle. Unreal Niagara — modern node-based. Unity VFX Graph similar. Used cho game, VR, real-time visualization.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>TouchDesigner</summary>
      <div class="arc-card-body">
        <p>Real-time interactive particle. VJ, installation art.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Use Cases Particle</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Natural Phenomena</h3>
    <ul class="arc-list">
      <li>Fire, smoke, mist, fog</li>
      <li>Rain, snow, hail</li>
      <li>Dust, leaves, debris</li>
      <li>Water spray, foam</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Magic / Sci-Fi</h3>
    <ul class="arc-list">
      <li>Doctor Strange magic spell</li>
      <li>Lightning bolt arc</li>
      <li>Energy weapon trail</li>
      <li>Portal opening particle</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Explosion / Destruction</h3>
    <ul class="arc-list">
      <li>Debris flying after explosion</li>
      <li>Sparks from impact</li>
      <li>Smoke billowing</li>
      <li>Fragments scatter</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Abstract Motion Graphics</h3>
    <ul class="arc-list">
      <li>Floating glowing particle</li>
      <li>Title reveal with particle burst</li>
      <li>Brand identity animation</li>
      <li>Music visualizer particle dance</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game VFX</h3>
    <ul class="arc-list">
      <li>Spell effects, healing aura</li>
      <li>Footstep dust</li>
      <li>Weather system</li>
      <li>Critical hit feedback</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Hair, Grass, Fur</h3>
    <ul class="arc-list">
      <li>Many strand each = particle instance</li>
      <li>Procedural hair (Houdini, Maya XGen)</li>
      <li>Grass field generation</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Best Practices</h2>
  <ul class="arc-list">
    <li><strong>Reference real life</strong> — observe smoke, fire, rain — most successful particle look like reality</li>
    <li><strong>Layer particles</strong> — multiple system combined (fire = orange particle + smoke + sparks + heat distortion)</li>
    <li><strong>Vary properties</strong> — random size, slight color variation = organic feel</li>
    <li><strong>Optimization</strong> — particle count balance quality vs performance</li>
    <li><strong>Real-time</strong> — game engine limits, plan carefully</li>
    <li><strong>Trapcode Particular</strong> entry-level cho motion designer</li>
    <li><strong>Houdini</strong> deep dive cho serious VFX career</li>
    <li><strong>Color carry meaning</strong> — fire warm, ice cool, magic colorful</li>
    <li><strong>Trail / glow</strong> enhance presence — particle alone often weak</li>
    <li><strong>Tutorial</strong>: FXPHD, Rebelway, CGCircuit, Hugo&apos;s Desk popular</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 2 · Batch 7 — chạy ${items.length} bài keyword (I → P) ──\n`,
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
