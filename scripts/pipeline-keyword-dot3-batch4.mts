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
  // 01. Smart Object
  {
    id: "fb456fe5-49db-46f5-91e0-136a9f18fe09",
    tieu_de: "Smart Object (Photoshop)",
    tieu_de_viet: "Smart Object trong Photoshop",
    tom_tat:
      "Smart Object là layer Photoshop chứa dữ liệu gốc không bị phá hủy — scale, filter non-destructive và link file external để cập nhật tự động.",
    meta_title:
      "Smart Object là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Smart Object Photoshop. Tìm hiểu non-destructive editing, smart filter, linked vs embedded và workflow chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn designer scale image lên 200% — rasterized, blurry, lost quality. Scale down 50% — quality loss permanent. Solution: <strong>Smart Object</strong> — Photoshop container preserve original data. Scale up/down anytime, filter non-destructive. Critical concept cho pro Photoshop workflow. Foundation cho retouching, composite, mockup design.</p>
  <p>Smart Object là kỹ thuật essential cho mọi Photoshop user — photo retoucher, web designer, motion designer. Hiểu Smart Object, Smart Filter, linked file giúp work non-destructive, professional workflow. Distinguish hobbyist vs pro Photoshop usage.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Smart Object là gì?</h2>
  <p>Smart Object là <strong>special layer type</strong> trong Photoshop chứa <strong>embedded source data</strong> (raster, vector, raw). Edits applied non-destructively — transformations (scale, rotate) preserve original quality, filters become <strong>Smart Filters</strong> (re-editable mask, parameter). Original data preserved khi double-click open in source application (Illustrator vector, RAW developer).</p>
  <p>Two types: <strong>Embedded Smart Object</strong> — data inside PSD file, larger file size. <strong>Linked Smart Object</strong> — external file reference. Update external file → all PSD using it auto-update. Foundation cho design system, brand asset shared across multiple file.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Smart Object Benefits</span>
    <p><strong>Non-destructive</strong>: scale/transform preserve quality. <strong>Smart Filters</strong>: filters editable, mask-able. <strong>Vector preservation</strong>: AI files stay vector. <strong>RAW workflow</strong>: re-open in Camera Raw. <strong>Linked update</strong>: change external = all instance update. <strong>Reusability</strong>: same Smart Object multiple position.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Embedded</strong> — data in PSD</li>
    <li><strong>Linked</strong> — external file ref</li>
    <li><strong>Smart Filter</strong> — editable filter</li>
    <li><strong>Non-Destructive</strong> — quality preserved</li>
    <li><strong>RAW Smart Object</strong> — re-edit Camera Raw</li>
    <li><strong>Vector Smart Object</strong> — preserve vector</li>
    <li><strong>Convert to Smart Object</strong> — menu command</li>
    <li><strong>Rasterize</strong> — convert back to layer</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"smart object photoshop non-destructive editing layer panel"</span>
    </div>
    <p class="arc-image-caption">Smart Object — non-destructive, preserve source data</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Use Cases</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Mockup Design</summary>
      <div class="arc-card-body">
        <p>Smart Object inside mockup PSD — designer drop artwork inside, mockup auto-update. T-shirt, mug, billboard mockup standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Logo Across Files</summary>
      <div class="arc-card-body">
        <p>Linked Smart Object — logo in master file, instance used many PSD. Update master = all auto-update. Brand consistency.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>RAW Workflow</summary>
      <div class="arc-card-body">
        <p>Open RAW as Smart Object. Apply Photoshop edit non-destructively. Double-click Smart Object → re-open Camera Raw cho exposure tweak.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Smart Filters</summary>
      <div class="arc-card-body">
        <p>Apply filter to Smart Object → Smart Filter. Re-editable, mask-able, opacity adjustable. Standard non-destructive workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Vector from Illustrator</summary>
      <div class="arc-card-body">
        <p>Paste AI as Smart Object — preserve vector. Scale up no quality loss. Double-click → edit in Illustrator.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Multiple Instance</summary>
      <div class="arc-card-body">
        <p>Smart Object can be duplicated. Edit source → all instance update. Pattern, icon reuse.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photo Composite Heavy Lift</summary>
      <div class="arc-card-body">
        <p>Group complex layer as Smart Object. Reduce panel clutter. Treat as single unit.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Linked Library / CC Cloud</summary>
      <div class="arc-card-body">
        <p>Creative Cloud Library Smart Object. Update once = update everywhere across Adobe apps.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Smart Object</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Convert Layer to Smart Object</h3>
    <ul class="arc-list">
      <li>Right-click layer → Convert to Smart Object</li>
      <li>Or Filter → Convert for Smart Filters</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Open RAW as Smart Object</h3>
    <ul class="arc-list">
      <li>Camera Raw open RAW</li>
      <li>Shift+Open Object button</li>
      <li>Smart Object Camera Raw editable</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Place External File</h3>
    <ul class="arc-list">
      <li>File → Place Embedded / Linked</li>
      <li>AI, PSD, PDF as Smart Object</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Edit Smart Object Source</h3>
    <ul class="arc-list">
      <li>Double-click Smart Object thumbnail</li>
      <li>Opens in source app or as separate window</li>
      <li>Edit, save → main PSD update</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Apply Smart Filter</h3>
    <ul class="arc-list">
      <li>Filter on Smart Object → Smart Filter</li>
      <li>Editable parameters</li>
      <li>Mask-able with vector mask</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Linked Smart Object</h3>
    <ul class="arc-list">
      <li>File → Place Linked</li>
      <li>External reference</li>
      <li>Move/rename file = broken link</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Rasterize</h3>
    <ul class="arc-list">
      <li>Right-click → Rasterize Layer</li>
      <li>Convert back to standard layer</li>
      <li>Lose Smart Object benefit</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Convert to Linked</h3>
    <ul class="arc-list">
      <li>Embedded → Linked conversion</li>
      <li>Reduce file size</li>
      <li>Share library</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Smart Object</h2>
  <ul class="arc-list">
    <li><strong>Default workflow Smart Object</strong> — convert before editing</li>
    <li><strong>Mockup template</strong> — Smart Object placeholder standard</li>
    <li><strong>Vector preserved</strong> — paste from AI as Smart Object</li>
    <li><strong>File size larger</strong> — Embedded vs Linked trade-off</li>
    <li><strong>Linked workflow</strong> — design system, brand asset</li>
    <li><strong>Smart Filter mask</strong> — selectively apply effect</li>
    <li><strong>Convert for Smart Filters</strong> shortcut workflow</li>
    <li><strong>Multiple instance</strong> reuse pattern, icon</li>
    <li><strong>Career UI/Web Designer</strong> — Smart Object daily use</li>
    <li><strong>Adobe XD / Figma</strong> — component similar concept</li>
  </ul>
</section>
`,
  },

  // 02. Sound Editing
  {
    id: "30496cd4-4d9a-4a2f-a7b0-ea11ed95c6a7",
    tieu_de: "Sound Editing",
    tieu_de_viet: "Sound Editing (Chỉnh sửa âm thanh)",
    tom_tat:
      "Sound Editing là quá trình chỉnh sửa âm thanh (lời thoại, SFX, ambience) để đạt chất lượng cao — clean noise, sync, foley, dialog editing cho film, TV, podcast.",
    meta_title:
      "Sound Editing là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Sound Editing trong post-production. Tìm hiểu workflow dialog edit, ADR, foley, ambience trong Pro Tools, DaVinci.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn đạo diễn vừa shoot film — actor perform tuyệt vời. Listen back audio: AC unit hum BG, plane fly over, footstep clattering. Audio in pre-edit không usable. <strong>Sound Editing</strong> chỉnh sửa, clean, restructure audio. Without sound editing = scene unusable. Pro film budget 10-30% audio post-production. Critical phase cho professional content.</p>
  <p>Sound Editing là kỹ năng essential cho audio post engineer, sound designer, podcast editor. Hiểu workflow dialog editing, foley, ambience, ADR, software Pro Tools/DaVinci giúp produce quality audio. Foundation cho film, TV, streaming, podcast quality.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Sound Editing là gì?</h2>
  <p>Sound Editing là <strong>process refining audio</strong> trong post-production. Includes: <strong>Dialog Editing</strong> (clean, sync actor voice), <strong>SFX Editing</strong> (add sound effect), <strong>Foley</strong> (recreate everyday sound), <strong>Ambience</strong> (background atmosphere), <strong>ADR</strong> (Automated Dialog Replacement — re-record voice trong studio), <strong>Noise Reduction</strong> (clean hum, hiss, clicks).</p>
  <p>Different from <strong>Sound Mixing</strong> (combine all track final balance). Sound Editing focus on individual track quality. Order: Edit first (clean, organize), then Mix (balance). Both essential. Both specialized career. Award category split: Best Sound Editing vs Best Sound Mixing Oscar (now combined Best Sound).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Sound Editing vs Mixing</span>
    <p><strong>Sound Editing</strong>: individual track clean, sync, build. Detail per element. <strong>Sound Mixing</strong>: combine track, balance, spatial. Whole picture. Both essential, separate roles often. Editor delivers clean track, mixer finalize.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Dialog Edit</strong> — clean voice</li>
    <li><strong>ADR</strong> — re-record voice</li>
    <li><strong>Foley</strong> — recreate daily sound</li>
    <li><strong>Ambience</strong> — atmosphere</li>
    <li><strong>SFX</strong> — sound effect</li>
    <li><strong>Noise Reduction</strong> — clean</li>
    <li><strong>De-Esser</strong> — sibilance</li>
    <li><strong>Spotting Session</strong> — plan SFX</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"sound editing pro tools dialog ADR post production film"</span>
    </div>
    <p class="arc-image-caption">Sound Editing — clean, organize audio cho final mix</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Sound Editing Categories</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Dialog Editing</summary>
      <div class="arc-card-body">
        <p>Most critical. Clean voice — remove noise, breath, mouth click. Smooth transition cut. Production sound mixer recording quality matter.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>ADR (Looping)</summary>
      <div class="arc-card-body">
        <p>Actor re-record line trong studio. Match camera. Replace bad production audio. Time-intensive — director, actor coordinate.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Foley</summary>
      <div class="arc-card-body">
        <p>Specialist Foley artist recreate sound — footstep, cloth rustle, prop handling. Recorded in studio with picture sync. Essential cho realism.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>SFX Library</summary>
      <div class="arc-card-body">
        <p>Pre-recorded sound — gun, explosion, vehicle. SoundIdeas, Boom Library. License paid. Layered combine cho unique.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Ambience / Tone</summary>
      <div class="arc-card-body">
        <p>Continuous background — room tone, city ambience, forest. Glue together cut. Crucial cho immersion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Music Editing</summary>
      <div class="arc-card-body">
        <p>Cut, time, edit music score, license song fit scene. Music editor specialty.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Noise Reduction</summary>
      <div class="arc-card-body">
        <p>iZotope RX standard tool. Remove hum, hiss, click, crackle. Critical when production audio compromised.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sweetening</summary>
      <div class="arc-card-body">
        <p>EQ, compression per dialog track. Enhance clarity. Final polish before mix.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Sound Editing</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Receive Picture Locked</h3>
    <ul class="arc-list">
      <li>Final edit picture from editor</li>
      <li>OMF / AAF export</li>
      <li>Don&apos;t start before lock</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Spotting Session</h3>
    <ul class="arc-list">
      <li>Director, supervising sound editor watch</li>
      <li>Note SFX, ADR, foley needs</li>
      <li>Plan sound design</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Dialog Edit</h3>
    <ul class="arc-list">
      <li>Clean dialog track</li>
      <li>Smooth cut</li>
      <li>Remove unwanted</li>
      <li>Pro Tools standard</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. ADR Recording</h3>
    <ul class="arc-list">
      <li>Actor studio session</li>
      <li>Match performance</li>
      <li>Replace bad dialog</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Foley Recording</h3>
    <ul class="arc-list">
      <li>Foley artist watch picture</li>
      <li>Record per action</li>
      <li>Picture sync precise</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. SFX Build</h3>
    <ul class="arc-list">
      <li>Library + custom design</li>
      <li>Layer multiple sound</li>
      <li>Unique signature</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Ambience Build</h3>
    <ul class="arc-list">
      <li>Per location continuous</li>
      <li>Glue cut together</li>
      <li>Atmosphere</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Handoff to Mixer</h3>
    <ul class="arc-list">
      <li>Organized track</li>
      <li>Clean delivery</li>
      <li>Notes documented</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Pro Tools</strong> — industry standard sound editing</li>
    <li><strong>Logic Pro</strong> — capable alternative</li>
    <li><strong>DaVinci Resolve Fairlight</strong> — integrated với edit</li>
    <li><strong>iZotope RX</strong> — noise reduction gold standard</li>
    <li><strong>Adobe Audition</strong> — for podcast, simpler</li>
    <li><strong>Reaper</strong> — affordable alternative</li>
    <li><strong>SoundIdeas, Pro Sound Effects</strong> — SFX library</li>
    <li><strong>BoomLibrary</strong> — modern premium library</li>
    <li><strong>Career Sound Editor</strong> — $50K-150K, Supervising $150K-300K</li>
    <li><strong>Career Foley Artist</strong> — specialized, $80K-150K</li>
  </ul>
</section>
`,
  },

  // 03. SFX
  {
    id: "18294ab4-cdc8-4eb8-8991-5aed19745231",
    tieu_de: "Sound Effects (SFX)",
    tieu_de_viet: "Hiệu ứng âm thanh (SFX)",
    tom_tat:
      "SFX là âm thanh thiết kế hoặc thu âm để bổ sung cho hình ảnh — từ footstep đến explosion — tạo realism và emotion trong phim, game, quảng cáo.",
    meta_title: "SFX là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Sound Effects (SFX) trong audio. Tìm hiểu library, design technique, layer và workflow cho film, game, motion graphics.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem action film — punch impact sound dramatic, explosion massive, footstep crunchy gravel. Real-world sound bland, film SFX dramatically designed. Sound effect specialist <strong>build sound</strong> từ layer recording + processing — single explosion combines fire whoosh + low rumble + glass shatter. Foundation cho cinematic feel. Without SFX = lifeless film.</p>
  <p>SFX là kỹ thuật essential cho sound designer, video editor, game audio. Hiểu library, design technique (layering, processing), workflow giúp create impactful audio. Critical skill cho film, game, motion graphics, podcast intro/outro.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>SFX là gì?</h2>
  <p>Sound Effects (SFX) là <strong>audio recording designed to accompany visual</strong>. From subtle (paper rustle) to dramatic (explosion). Two source: <strong>Library SFX</strong> (pre-recorded, licensed — SoundIdeas, Boom Library) — fast, common. <strong>Custom Recording / Foley</strong> — specific shoot, unique. <strong>Sound Design</strong> — synthesized, processed sound (sci-fi laser, magic spell).</p>
  <p>Modern SFX rarely single recording. <strong>Layering</strong> standard — single &quot;punch&quot; effect = body impact + whip + breath + low rumble layered. Combined creates impactful unique sound. Pro sound designer layer 5-10 sound per event. Processing — EQ, compression, pitch shift, reverb — sculpt final character.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">SFX Categories</span>
    <p><strong>Diegetic</strong>: source visible on screen (footstep, gun). <strong>Non-Diegetic</strong>: source not on screen, story-driven (whoosh transition, hit). <strong>Sound Design</strong>: invented sound (sci-fi tech, magic). <strong>Foley</strong>: re-created daily sound by Foley artist. Different use case.</p>
  </div>

  <ul class="arc-list">
    <li><strong>SFX Library</strong> — pre-recorded</li>
    <li><strong>Foley</strong> — recreated daily sound</li>
    <li><strong>Layering</strong> — combine multiple</li>
    <li><strong>Sound Design</strong> — synthesize</li>
    <li><strong>Whoosh</strong> — transition swoosh</li>
    <li><strong>Riser</strong> — building tension</li>
    <li><strong>Hit / Impact</strong> — accent punctuation</li>
    <li><strong>Ambient SFX</strong> — environment</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"sound effects SFX library design audio post production"</span>
    </div>
    <p class="arc-image-caption">SFX — layered designed sound, dramatic audio impact</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>SFX Types</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Impact / Hit</summary>
      <div class="arc-card-body">
        <p>Punch, slap, drop. Dramatic punctuation. Trailer staple. Layered cho weight.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Whoosh / Transition</summary>
      <div class="arc-card-body">
        <p>Movement, transition. Whoosh between scene. Common motion graphics, trailer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Riser</summary>
      <div class="arc-card-body">
        <p>Building tension before drop. Climbing pitch/volume. EDM, trailer, scene build-up.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Explosion</summary>
      <div class="arc-card-body">
        <p>Fire, debris, rumble layered. Cinematic explosion 5+ layer. Stutters, debris, low sub. Hollywood spec.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Weapon</summary>
      <div class="arc-card-body">
        <p>Gunshot, sword swing, laser. Game audio. Layered cho weight, impact.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Vehicle</summary>
      <div class="arc-card-body">
        <p>Car, plane, boat. Library extensive. Layer engine + wind + tire + Doppler effect.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sci-Fi / Magic</summary>
      <div class="arc-card-body">
        <p>Synthesized sound. Laser, force field, spell. Sound design creativity. Synthesizer + processing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>UI / Notification</summary>
      <div class="arc-card-body">
        <p>App click, notification, tone. Subtle. Designed feeling. Mobile UX critical.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>SFX Design Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Spotting Session</h3>
    <ul class="arc-list">
      <li>Watch picture</li>
      <li>Identify each SFX need</li>
      <li>List per scene</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Library Search</h3>
    <ul class="arc-list">
      <li>Soundminer, BaseHead search</li>
      <li>Find base sound</li>
      <li>Listen variation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Layer Building</h3>
    <ul class="arc-list">
      <li>Stack 3-10 sound</li>
      <li>Each contributes character</li>
      <li>Low + mid + high frequency</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Processing</h3>
    <ul class="arc-list">
      <li>EQ — sculpt frequency</li>
      <li>Compression — control dynamics</li>
      <li>Reverb — space</li>
      <li>Pitch shift</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Custom Recording</h3>
    <ul class="arc-list">
      <li>Foley booth record</li>
      <li>Unique sound for shot</li>
      <li>Field recording</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Sync to Picture</h3>
    <ul class="arc-list">
      <li>Frame-accurate placement</li>
      <li>Match visual cue</li>
      <li>Pro Tools timeline</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Iterate with Director</h3>
    <ul class="arc-list">
      <li>Review session</li>
      <li>Feedback</li>
      <li>Refine until approved</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Deliver to Mix</h3>
    <ul class="arc-list">
      <li>Organized SFX track</li>
      <li>Stem export</li>
      <li>Documentation</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Library &amp; Tools</h2>
  <ul class="arc-list">
    <li><strong>Boom Library</strong> — modern premium SFX</li>
    <li><strong>Pro Sound Effects</strong> — comprehensive</li>
    <li><strong>SoundIdeas</strong> — classic Hollywood library</li>
    <li><strong>Splice</strong> — sample library subscription</li>
    <li><strong>Freesound.org</strong> — free Creative Commons</li>
    <li><strong>YouTube Audio Library</strong> — free for video</li>
    <li><strong>Soundminer</strong> — SFX database management tool</li>
    <li><strong>iZotope Iris</strong> — sample-based synth</li>
    <li><strong>Career Sound Designer</strong> — $60K-200K depending studio</li>
    <li><strong>Game audio</strong>: Wwise, FMOD adaptive SFX</li>
  </ul>
</section>
`,
  },

  // 04. Sound Mixing
  {
    id: "b09eef58-3d2b-4210-95c0-af1234951e7e",
    tieu_de: "Sound Mixing",
    tieu_de_viet: "Sound Mixing (Hòa âm)",
    tom_tat:
      "Sound Mixing là quá trình cân bằng và kết hợp các track âm thanh — nhạc nền, dialogue, SFX — để tạo soundtrack tổng thể hài hòa phù hợp với hình ảnh.",
    meta_title:
      "Sound Mixing là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Sound Mixing trong post-production. Tìm hiểu workflow dialog/music/SFX balance, surround sound và Dolby Atmos.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn watch movie — dialogue clear, music swells emotionally, gunshot dramatic — all balanced. Theatre vs phone vs car — same content, optimized per format. <strong>Sound Mixing</strong> = final stage audio post — balance dialogue, music, SFX into cohesive soundtrack. Most expensive audio phase. Award category (Best Sound Mixing Oscar). Critical cho theatrical, streaming, broadcast quality.</p>
  <p>Sound Mixing là kỹ năng essential cho re-recording mixer, audio engineer. Hiểu workflow, monitoring setup, format (stereo, 5.1, Atmos), tools (Pro Tools, DaVinci) giúp produce industry-standard mix. Pro career path với high recognition.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Sound Mixing là gì?</h2>
  <p>Sound Mixing là <strong>final stage audio post-production</strong> — combine all sound element (dialogue, music, SFX, foley, ambience) into single cohesive soundtrack. <strong>Balance</strong> levels — dialogue prominent, music supports emotion, SFX accents but không overpower. <strong>Spatialize</strong> — pan position, surround sound placement. <strong>Final master</strong> per delivery format.</p>
  <p>Different from <strong>Sound Editing</strong> — editor cleans/builds individual track. Mixer combine final. Often separate role, but smaller production same person. Theatre experience requires careful mixing — sound moving between speaker, immersive. Modern Dolby Atmos add 3D height channel. Streaming Netflix có loudness standards strict.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Mix Format</span>
    <p><strong>Stereo (2.0)</strong>: 2 channel — phone, headphone, basic TV. <strong>5.1 Surround</strong>: front L/C/R + rear L/R + sub. Cinema standard 20+ years. <strong>7.1</strong>: extra side surround. <strong>Dolby Atmos</strong>: object-based 3D với height channel. Modern theatrical, premium streaming.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Mix Stem</strong> — group submix</li>
    <li><strong>Dialog Stem</strong> — voice mix</li>
    <li><strong>Music Stem</strong> — score, song</li>
    <li><strong>FX Stem</strong> — SFX foley</li>
    <li><strong>LUFS</strong> — loudness standard</li>
    <li><strong>5.1 / 7.1 / Atmos</strong> — format</li>
    <li><strong>Panning</strong> — spatial placement</li>
    <li><strong>Compression / EQ</strong> — processing</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"sound mixing dolby atmos studio pro tools mixer console"</span>
    </div>
    <p class="arc-image-caption">Sound Mixing — final balance, format-specific delivery</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Mix Stages</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Pre-Mix</summary>
      <div class="arc-card-body">
        <p>Setup session, level balance per stem. Dialog edit stem. Music stem. SFX stem. Establish baseline before main mix.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dialog Pass</summary>
      <div class="arc-card-body">
        <p>Most critical. Dialog clear, consistent level. EQ per voice. De-ess, compress. Prominence over music/SFX. Audience must understand.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Music Pass</summary>
      <div class="arc-card-body">
        <p>Music score, song integration. Duck under dialog. Swell at emotional moment. Spectral pocket cho dialog clear.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>SFX Pass</summary>
      <div class="arc-card-body">
        <p>Footstep, foley, sound effect balance. Realistic level. Accent without overpower. Spatial pan.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Final Mix Pass</summary>
      <div class="arc-card-body">
        <p>All element together. Balance overall. Multiple monitor — theatre, TV, phone. Director, producer approve.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5.1 / Surround Pass</summary>
      <div class="arc-card-body">
        <p>Surround channel build — rear LFE, surround ambience. Theatrical experience.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Atmos Pass</summary>
      <div class="arc-card-body">
        <p>Object-based, height channel. Sound move 3D. Modern premium format.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Loudness Pass</summary>
      <div class="arc-card-body">
        <p>Final loudness compliance. Netflix -27 LUFS Integrated, theatrical -27 LEQ(m). Strict standard delivery.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Mixing Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Receive Edited Session</h3>
    <ul class="arc-list">
      <li>From sound editor</li>
      <li>Pro Tools session</li>
      <li>Organized track</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Setup Monitor</h3>
    <ul class="arc-list">
      <li>5.1 surround speaker calibrated</li>
      <li>Theatre-like room</li>
      <li>Reference level set</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Dialog Mix First</h3>
    <ul class="arc-list">
      <li>Foundation everything else</li>
      <li>Level, EQ, compression</li>
      <li>Consistent voice</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Add Music</h3>
    <ul class="arc-list">
      <li>Music supports dialog</li>
      <li>Duck under voice</li>
      <li>Emotional moment swell</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Add SFX</h3>
    <ul class="arc-list">
      <li>Foley, ambience, hard effect</li>
      <li>Spatial position</li>
      <li>Realistic level</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Surround Build</h3>
    <ul class="arc-list">
      <li>Rear channel ambience</li>
      <li>LFE sub frequency</li>
      <li>Pan dialogue mostly center</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Director Review</h3>
    <ul class="arc-list">
      <li>Watch with director</li>
      <li>Feedback per scene</li>
      <li>Revise</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Master Delivery</h3>
    <ul class="arc-list">
      <li>Multi-format export</li>
      <li>Stereo, 5.1, Atmos</li>
      <li>Loudness compliance</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Standards</h2>
  <ul class="arc-list">
    <li><strong>Pro Tools HDX</strong> — industry standard mixing</li>
    <li><strong>Nuendo</strong> — Steinberg alternative</li>
    <li><strong>DaVinci Resolve Fairlight</strong> — integrated</li>
    <li><strong>Atmos Renderer</strong> — Dolby Atmos mix</li>
    <li><strong>Avid S6</strong> — pro mixing console</li>
    <li><strong>iZotope Insight</strong> — loudness meter</li>
    <li><strong>Netflix -27 LUFS</strong> — streaming standard</li>
    <li><strong>Theatre -27 LEQ(m)</strong> — cinematic</li>
    <li><strong>Career Re-Recording Mixer</strong> — $80K-300K, Oscar winner $500K+</li>
    <li><strong>Atmos certified studio</strong> growing demand</li>
  </ul>
</section>
`,
  },

  // 05. Sound Synchronization
  {
    id: "18d91fa5-f4ad-407a-8a3e-7a5d4c938af3",
    tieu_de: "Sound Synchronization",
    tieu_de_viet: "Đồng bộ âm thanh-hình ảnh",
    tom_tat:
      "Sound Synchronization là đồng bộ âm thanh với hình ảnh — đảm bảo tiếng động, dialogue, nhạc khớp chính xác với hành động trên màn hình trong mọi điều kiện phát sóng.",
    meta_title:
      "Sound Synchronization là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Sound sync trong post-production. Tìm hiểu lip sync, timecode, slate, drift correction và workflow chuẩn industry.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem film — actor speak, lip move but sound delay 50ms. Annoying immediately, brain detects. Or worse, gun fire — bang đến trước flash. <strong>Sound Synchronization</strong> ensure audio precisely match picture. Foundation cho post-production quality. Lose sync = unwatchable. Many techniques cho maintain sync — clapboard, timecode, drift correction.</p>
  <p>Sound Synchronization là kỹ năng essential cho audio engineer, video editor, on-set sound mixer. Hiểu workflow timecode sync, lip sync verification, drift correction giúp produce perfectly synced content. Critical cho film, TV, podcast với video.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Sound Sync là gì?</h2>
  <p>Sound Synchronization là <strong>process aligning audio precisely với picture</strong>. Multiple type: <strong>Lip Sync</strong> (voice match mouth movement), <strong>Action Sync</strong> (sound match event — door slam, gun fire), <strong>Music Sync</strong> (music beat align với cut, action). Sync precision: ±2 frame (~80ms at 24fps) human-perceptible. Pro post target <strong>frame-accurate</strong> sync.</p>
  <p>Source of sync issue: <strong>Recording offset</strong> (camera audio vs separate audio recorder), <strong>Frame rate conversion</strong> (24p shot, 23.976 playback), <strong>Drift</strong> (clock difference between camera and audio recorder), <strong>Streaming</strong> (network delay, format conversion). Each requires specific sync technique.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Sync Method</span>
    <p><strong>Clapper Board</strong>: visual + audible clap, traditional sync. <strong>Timecode</strong>: jam-sync camera + recorder. <strong>Plural Eyes / AutoSync</strong>: waveform match auto. <strong>Manual</strong>: editor visually align in DAW/NLE. <strong>Sample-accurate timecode</strong>: pro standard.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Lip Sync</strong> — voice to mouth</li>
    <li><strong>Action Sync</strong> — sound to event</li>
    <li><strong>Timecode</strong> — frame-accurate ref</li>
    <li><strong>Slate / Clapper</strong> — visual+audio cue</li>
    <li><strong>Drift</strong> — slow desync</li>
    <li><strong>Jam Sync</strong> — match timecode</li>
    <li><strong>SMPTE</strong> — standard timecode</li>
    <li><strong>LTC / VITC</strong> — sync signal type</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"sound synchronization timecode clapper slate film post"</span>
    </div>
    <p class="arc-image-caption">Sound Sync — precision align audio với picture</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Sync Method</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Clapper Board (Slate)</summary>
      <div class="arc-card-body">
        <p>Traditional sync. Visual clap + audible bang. Editor visually align slate visible frame with audio click. Foolproof, slow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Timecode Jam Sync</summary>
      <div class="arc-card-body">
        <p>Camera and audio recorder jammed identical timecode. Same TC = sync. Pro on-set standard. Maintain via Tentacle Sync, TimeCode Buddy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Waveform Auto-Sync</summary>
      <div class="arc-card-body">
        <p>PluralEyes, Premiere Audio Sync. Match camera audio waveform với separate recorder. Auto-align. Modern fast.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>SMPTE LTC</summary>
      <div class="arc-card-body">
        <p>Linear Timecode audio signal — sync between devices. Recorded on audio track. Pro standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VITC</summary>
      <div class="arc-card-body">
        <p>Vertical Interval Timecode — embedded in video signal. Tape-based legacy.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Word Clock</summary>
      <div class="arc-card-body">
        <p>Digital audio sample-level sync. Multi-device studio. Different from frame sync, finer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lip Sync Manual</summary>
      <div class="arc-card-body">
        <p>Visual verification. Watch lips, listen voice. Tighten if off by frame. Final QA step.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Drift Correction</summary>
      <div class="arc-card-body">
        <p>Long take desync due clock drift. Stretch/compress audio match. Time stretch maintain pitch.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Sync Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. On-Set Sync Setup</h3>
    <ul class="arc-list">
      <li>Camera + audio recorder jam TC</li>
      <li>Or slate every take</li>
      <li>Both methods backup</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Camera Audio Backup</h3>
    <ul class="arc-list">
      <li>Camera always record audio</li>
      <li>Reference cho sync</li>
      <li>Backup if separate fails</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Import to NLE</h3>
    <ul class="arc-list">
      <li>Premiere, FCP, Resolve</li>
      <li>Camera clip + audio clip</li>
      <li>Both sources available</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Auto-Sync</h3>
    <ul class="arc-list">
      <li>Software match waveform/TC</li>
      <li>Multi-clip create</li>
      <li>Verify alignment</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Verify Lip Sync</h3>
    <ul class="arc-list">
      <li>Spot check take</li>
      <li>Lip movement match voice</li>
      <li>Fix if off</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Drift Check Long Take</h3>
    <ul class="arc-list">
      <li>5+ minute take check end</li>
      <li>If drift, time stretch</li>
      <li>Resolve to in-sync</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Multi-Cam Sync</h3>
    <ul class="arc-list">
      <li>Multiple camera angle</li>
      <li>All synced reference</li>
      <li>Cut between source</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Final Output Check</h3>
    <ul class="arc-list">
      <li>Export and watch</li>
      <li>Verify sync maintained</li>
      <li>Format conversion can desync</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Tools</h2>
  <ul class="arc-list">
    <li><strong>Slate every take</strong> — even with TC, backup safety</li>
    <li><strong>TC critical multi-cam</strong> — saves hours sync</li>
    <li><strong>Tentacle Sync</strong>: affordable TC generator</li>
    <li><strong>PluralEyes / now native NLE</strong>: auto sync</li>
    <li><strong>Frame rate match</strong> — 23.976 vs 24p subtle drift</li>
    <li><strong>Audio drift correction</strong>: time stretch maintain pitch</li>
    <li><strong>Lip sync critical</strong> — audience detects ±50ms</li>
    <li><strong>Camera audio scratch</strong> — always record cho safety</li>
    <li><strong>Streaming format</strong> can affect sync — test output</li>
    <li><strong>Audio post engineer</strong> — sync first task before editing</li>
  </ul>
</section>
`,
  },

  // 06. Soundtrack
  {
    id: "7fdb39af-886a-44f8-b542-437772b913d1",
    tieu_de: "Soundtrack",
    tieu_de_viet: "Soundtrack (Nhạc phim)",
    tom_tat:
      "Soundtrack là toàn bộ phần âm thanh của tác phẩm — nhạc nền, âm nhạc gốc, đôi khi cả SFX. Nghĩa hẹp: phần nhạc nền được phát hành như album riêng.",
    meta_title: "Soundtrack là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Soundtrack film, game. Tìm hiểu original score vs licensed music, composer workflow và cách build emotional soundtrack.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nghe Hans Zimmer Interstellar soundtrack — emotional power even without film. Or Star Wars main theme — instant recognition. <strong>Soundtrack</strong> shape emotion, identify franchise, define generation. Composer Williams, Zimmer, Howard make career-defining work. Foundation cho film, game, TV impact. Audience often remember soundtrack as much as visual.</p>
  <p>Soundtrack là kiến thức essential cho composer, music supervisor, film maker. Hiểu workflow score vs licensed, recording process, integration giúp build soundtrack support story emotion. Career path lucrative cho talented composer.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Soundtrack là gì?</h2>
  <p>Soundtrack có 2 nghĩa: <strong>Technical</strong> — entire audio of work (dialog, music, SFX combined). <strong>Common usage</strong> — music only, released as album. Today &quot;soundtrack&quot; thường refer second meaning. Components: <strong>Original Score</strong> (composed cho film by composer), <strong>Licensed Song</strong> (existing music used), <strong>Source Music</strong> (music heard within scene — radio playing).</p>
  <p>Two paths: <strong>Original Score</strong> — composer write custom orchestral / synth music. Expensive but specific. Examples: Williams Star Wars, Zimmer Inception. <strong>Licensed Music</strong> — Music Supervisor source existing songs. Tarantino films famous cho this. Faster, cheaper, recognizable. Modern blockbuster combine both.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Score vs Soundtrack</span>
    <p><strong>Score</strong>: composer&apos;s original music written cho film. Orchestral typically. Theme, motif. <strong>Soundtrack</strong>: broader — score + licensed song + source music. Album release often score + song mix. Career: Composer (creates score) vs Music Supervisor (licenses song).</p>
  </div>

  <ul class="arc-list">
    <li><strong>Original Score</strong> — custom composed</li>
    <li><strong>Licensed Music</strong> — existing song</li>
    <li><strong>Source Music</strong> — diegetic in scene</li>
    <li><strong>Theme / Leitmotif</strong> — recurring music idea</li>
    <li><strong>Cue</strong> — single music piece</li>
    <li><strong>Spotting Session</strong> — plan where music</li>
    <li><strong>Stem</strong> — submix stem</li>
    <li><strong>Music Supervisor</strong> — licensing role</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"soundtrack film score composer orchestra recording"</span>
    </div>
    <p class="arc-image-caption">Soundtrack — music shape emotion, identity của work</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Soundtrack Components</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Main Theme</summary>
      <div class="arc-card-body">
        <p>Memorable melody identify film. Repeated, variation throughout. Star Wars, Indiana Jones, Game of Thrones — iconic theme.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Character Leitmotif</summary>
      <div class="arc-card-body">
        <p>Theme per character. Returns when character appears. Williams master of this. Wagner originated opera technique.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Underscore</summary>
      <div class="arc-card-body">
        <p>Background music supports dialog, action. Subtle. Most film time underscore not main theme.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Action Music</summary>
      <div class="arc-card-body">
        <p>Energetic, percussion-heavy. Drive action sequence. Hans Zimmer Inception standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Emotional / Romantic</summary>
      <div class="arc-card-body">
        <p>String orchestral, slow tempo. Romance scene, heartbreak. Williams masterful at this.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Source Music</summary>
      <div class="arc-card-body">
        <p>Diegetic — music character hears (radio, jukebox). Realistic. Tarantino films feature heavily.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>End Credits</summary>
      <div class="arc-card-body">
        <p>Often pop song after closing. Famous commercial single. Marketing tool.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Trailer Music</summary>
      <div class="arc-card-body">
        <p>Specialized — Two Steps from Hell, Audiomachine. Epic, build-up. Trailer-specific style.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Soundtrack Production</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Spotting Session</h3>
    <ul class="arc-list">
      <li>Director + composer watch film</li>
      <li>Note where music in/out</li>
      <li>Emotional intent per cue</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Theme Development</h3>
    <ul class="arc-list">
      <li>Composer write main theme</li>
      <li>Variations per scene</li>
      <li>Leitmotif character</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Mock-Up Pre-Production</h3>
    <ul class="arc-list">
      <li>Composer create virtual instrument demo</li>
      <li>Director review</li>
      <li>Iterate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Orchestration</h3>
    <ul class="arc-list">
      <li>Orchestrator write instrument part</li>
      <li>Composer compose, orchestrator notate</li>
      <li>Score prepared</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Recording Session</h3>
    <ul class="arc-list">
      <li>Live orchestra at scoring stage</li>
      <li>London Abbey Road, LA Eastwood</li>
      <li>Conductor lead orchestra to picture</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Mix Score</h3>
    <ul class="arc-list">
      <li>Multi-track recording mixed</li>
      <li>Balance instrument</li>
      <li>Surround spatial</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Music Edit</h3>
    <ul class="arc-list">
      <li>Adjust music timing to picture</li>
      <li>Tighten cut</li>
      <li>Loop / extend</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Final Mix Integration</h3>
    <ul class="arc-list">
      <li>Score combined với dialog, SFX</li>
      <li>Duck under voice</li>
      <li>Album release separate mix</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Famous</h2>
  <ul class="arc-list">
    <li><strong>John Williams</strong> — Star Wars, Indiana Jones, Jurassic Park</li>
    <li><strong>Hans Zimmer</strong> — Inception, Interstellar, Dune</li>
    <li><strong>James Newton Howard</strong> — Batman Begins, Hunger Games</li>
    <li><strong>Howard Shore</strong> — Lord of the Rings</li>
    <li><strong>Ludwig Goransson</strong> — Black Panther, Tenet, modern era</li>
    <li><strong>Career Composer</strong> — $50K-millions per film</li>
    <li><strong>Music Supervisor</strong> — $30K-150K, license song</li>
    <li><strong>Recording stages</strong>: Abbey Road, Eastwood, AIR Studios</li>
    <li><strong>Composer software</strong>: Logic Pro, Cubase, DAW + sample library</li>
    <li><strong>Sample library</strong>: Spitfire, EastWest, Vienna</li>
  </ul>
</section>
`,
  },

  // 07. Spatial UI
  {
    id: "3dd4bed9-6efd-431a-a68e-274c7a599332",
    tieu_de: "Spatial UI",
    tieu_de_viet: "Spatial UI trong Game",
    tom_tat:
      "Spatial UI là giao diện hiển thị trong không gian 3D của game — gắn liền với đối tượng hoặc vị trí cụ thể trong thế giới game (tên kẻ địch, điểm nhiệm vụ).",
    meta_title:
      "Spatial UI là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Spatial UI trong game. Tìm hiểu world space UI, diegetic UI, meta UI và workflow design HUD immersive cho VR, AR.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn play VR game — instead of flat HUD overlay screen, health bar shown trên wrist watch character. Enemy name floating above enemy head trong 3D space. Đó là <strong>Spatial UI</strong> — immersive, doesn&apos;t break virtual world. Critical cho VR, modern AAA game wanting immersion. Distinct from traditional HUD overlay 2D trên screen.</p>
  <p>Spatial UI là kỹ năng essential cho game UI designer, UX designer, VR designer. Hiểu world space placement, diegetic integration, performance giúp design HUD immersive. Critical cho VR/AR, increasingly common trong AAA game cho cinematic feel.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Spatial UI là gì?</h2>
  <p>Spatial UI là <strong>game interface element placed in 3D world space</strong>, attached to object hoặc world position. Distinct from <strong>Screen Space UI</strong> (overlay flat 2D trên top of camera view). Spatial UI behaves like part of world — has 3D position, rotation, depth. Player look around → UI moves perspective. Critical cho VR/AR (screen space breaks immersion in VR).</p>
  <p>Categories: <strong>World Space</strong> (UI floats in world — enemy name above head, quest marker), <strong>Diegetic UI</strong> (UI part of fiction — health bar on character&apos;s suit, map in character&apos;s hand), <strong>Meta UI</strong> (between diegetic and non-diegetic — Dead Space&apos;s holographic UI projected from character). Choose based on immersion goal.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">UI Layer Categorization</span>
    <p><strong>Non-Diegetic Screen Space</strong>: flat overlay (most games). <strong>Spatial / World Space</strong>: 3D positioned but not part of fiction. <strong>Meta / Hybrid</strong>: in 3D world, character may not aware. <strong>Diegetic</strong>: part of game fiction — character can interact, see. Increasing immersion.</p>
  </div>

  <ul class="arc-list">
    <li><strong>World Space UI</strong> — 3D positioned</li>
    <li><strong>Screen Space UI</strong> — flat overlay</li>
    <li><strong>Diegetic UI</strong> — in fiction</li>
    <li><strong>Meta UI</strong> — hybrid</li>
    <li><strong>Billboarding</strong> — face camera</li>
    <li><strong>Depth Test</strong> — occlusion</li>
    <li><strong>Anchor Object</strong> — attach to</li>
    <li><strong>Distance Fade</strong> — far hide</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"spatial UI game world space HUD VR immersive design"</span>
    </div>
    <p class="arc-image-caption">Spatial UI — 3D positioned, immersive HUD</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Spatial UI Examples</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Enemy Name Plate</summary>
      <div class="arc-card-body">
        <p>Float above enemy head in 3D. Health bar below. Distance-based fade. Common in RPG, MMO.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Quest Marker</summary>
      <div class="arc-card-body">
        <p>Float at quest location in world. Player navigate toward. Animated to draw attention.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Damage Number</summary>
      <div class="arc-card-body">
        <p>Pop above damaged target. Float up, fade. Feedback for hit. RPG staple.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Interactable Hint</summary>
      <div class="arc-card-body">
        <p>&quot;Press E&quot; floating above pickup. Object highlight. World context.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dead Space Holographic</summary>
      <div class="arc-card-body">
        <p>Famous diegetic UI — character&apos;s suit project hologram. Health, inventory part of fiction. Most immersive design.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VR Hand UI</summary>
      <div class="arc-card-body">
        <p>Watch on player wrist. Menu in hand. VR-specific. Screen space breaks VR immersion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Worldspace Subtitle</summary>
      <div class="arc-card-body">
        <p>Dialog floating near speaker. Far Cry 5 example. Spatial dialog cue.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tutorial Pop-Up Spatial</summary>
      <div class="arc-card-body">
        <p>Hint attached to object — &quot;jump here&quot; arrow at edge. Less intrusive than screen.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Design Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Decide UI Layer</h3>
    <ul class="arc-list">
      <li>Screen space vs spatial</li>
      <li>Match immersion goal</li>
      <li>VR = spatial mandatory</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Place in World</h3>
    <ul class="arc-list">
      <li>Attach to object</li>
      <li>Fixed world position</li>
      <li>Player-relative position</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Billboarding</h3>
    <ul class="arc-list">
      <li>UI face camera</li>
      <li>Always readable</li>
      <li>Standard for name plate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Distance Behavior</h3>
    <ul class="arc-list">
      <li>Scale up far, down close</li>
      <li>Fade out beyond range</li>
      <li>Manage info density</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Occlusion</h3>
    <ul class="arc-list">
      <li>Decide visible through wall?</li>
      <li>Depth test on/off</li>
      <li>Game design choice</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Readability Test</h3>
    <ul class="arc-list">
      <li>Different angle, distance</li>
      <li>Text large enough</li>
      <li>Contrast với background</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Animation</h3>
    <ul class="arc-list">
      <li>Float, pulse cho attention</li>
      <li>Smooth move với target</li>
      <li>Performance keep light</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Localization Space</h3>
    <ul class="arc-list">
      <li>German longer than English</li>
      <li>Plan for text grow</li>
      <li>Scaling text container</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tools &amp; Best Practice</h2>
  <ul class="arc-list">
    <li><strong>Unity World Space Canvas</strong> — built-in spatial UI</li>
    <li><strong>Unreal Widget Component 3D</strong> — Unreal spatial</li>
    <li><strong>Performance concern</strong> — many UI = draw call expensive</li>
    <li><strong>VR mandatory spatial</strong> — screen space breaks immersion</li>
    <li><strong>Dead Space, Isaac Clarke suit UI</strong> — gold standard diegetic</li>
    <li><strong>Far Cry, Metro</strong> — minimal HUD trend</li>
    <li><strong>Career VR UI Designer</strong> — growing field</li>
    <li><strong>UX research test</strong> — players miss UI in 3D? Adjust</li>
    <li><strong>Color contrast</strong> — UI versus world background</li>
    <li><strong>Don&apos;t mix layer</strong> — consistent paradigm best</li>
  </ul>
</section>
`,
  },

  // 08. Special Effects (FX)
  {
    id: "1678f0d7-3c39-4cbb-a64b-4fe251c5b401",
    tieu_de: "Special Effects (FX)",
    tieu_de_viet: "Special Effects (FX) trong điện ảnh và Game",
    tom_tat:
      "Special Effects (FX) là các hiệu ứng tạo cảnh quay không thể có trong đời thực — vật lý, lửa, khói, chất lỏng, explosion — practical effects on-set hoặc CGI.",
    meta_title:
      "Special Effects là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Special Effects FX trong film, game. Phân biệt SFX vs VFX, practical vs CGI, workflow on-set effect và digital.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem Mad Max Fury Road — practical explosion, real car flip. Hay Marvel Avengers — fully digital Hulk smash building. Both <strong>Special Effects (FX)</strong> — create impossible visual. Two paradigm: <strong>Practical / On-Set FX</strong> (real explosion, makeup, pyrotechnic) vs <strong>VFX / Digital</strong> (CGI in post). Modern film blend both. Foundation cho cinema spectacle.</p>
  <p>Special Effects là kiến thức essential cho VFX artist, on-set technician, director. Hiểu phân biệt practical vs digital, workflow, when to use which giúp produce stunning cinematic effect. Career path lucrative cho VFX TD và practical effect specialist.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Special Effects là gì?</h2>
  <p>Special Effects (FX) là <strong>illusion techniques</strong> creating scene impossible hoặc dangerous to film directly. Two branches: <strong>Practical SFX</strong> — done on-set with physical material (pyrotechnic, makeup, animatronic, miniature). Real, in-camera, immediate. <strong>VFX (Visual Effects)</strong> — created in post-production digitally (CGI, compositing). Flexible, expensive.</p>
  <p>Modern blockbuster combine both — practical foundation + digital enhancement. Mad Max practical car flip + digital fire enhance. Marvel digital Hulk + practical environment. Best result often hybrid approach. Director Christopher Nolan known cho practical preference; James Cameron uses digital heavily Avatar.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Practical vs VFX</span>
    <p><strong>Practical (SFX)</strong>: real, in-camera, immediate feedback, dangerous, expensive shoot. Limited what possible. <strong>VFX</strong>: post-production digital, infinite possibility, time-consuming, lower shoot risk. Most modern film combine.</p>
  </div>

  <ul class="arc-list">
    <li><strong>SFX Practical</strong> — on-set physical</li>
    <li><strong>VFX Digital</strong> — post-production</li>
    <li><strong>Pyrotechnic</strong> — controlled explosion</li>
    <li><strong>Makeup FX</strong> — prosthetic, creature</li>
    <li><strong>Animatronic</strong> — mechanical creature</li>
    <li><strong>Miniature</strong> — scaled model</li>
    <li><strong>CGI</strong> — computer-generated</li>
    <li><strong>Compositing</strong> — layer real + CGI</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"special effects FX VFX practical CGI film production"</span>
    </div>
    <p class="arc-image-caption">Special Effects — practical + digital, create impossible visual</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>FX Categories</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Pyrotechnic (Practical)</summary>
      <div class="arc-card-body">
        <p>Controlled explosion, fire, sparks. SFX technician licensed. Mad Max, Mission Impossible. Spectacular in-camera.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Makeup FX (Practical)</summary>
      <div class="arc-card-body">
        <p>Prosthetic, wound, creature makeup. Walking Dead zombie, Star Trek alien. Stan Winston Studio legendary.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Animatronic (Practical)</summary>
      <div class="arc-card-body">
        <p>Mechanical creature, robot. Jurassic Park practical T-Rex. Now hybrid với CGI augment.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Miniature (Practical)</summary>
      <div class="arc-card-body">
        <p>Scaled model — building, vehicle, environment. Lord of Rings miniature city. Lost popularity but resurging cho realism.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stunts</summary>
      <div class="arc-card-body">
        <p>Stunt performer — fall, fight, car crash. Choreographed safely. Stunt coordinator critical role.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>CGI Creature (VFX)</summary>
      <div class="arc-card-body">
        <p>Digital character — Gollum, Caesar, Thanos. Motion capture + CG render. Modern blockbuster staple.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Digital Environment (VFX)</summary>
      <div class="arc-card-body">
        <p>Set extension, full digital environment. Avatar, Game of Thrones. Common technique.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Digital Destruction (VFX)</summary>
      <div class="arc-card-body">
        <p>Building collapse, debris. Houdini simulation. Expensive but essential blockbuster.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>FX Decision Process</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cost Comparison</h3>
    <ul class="arc-list">
      <li>Practical cheaper sometimes</li>
      <li>Digital cheaper for repeat</li>
      <li>Budget-driven</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Safety</h3>
    <ul class="arc-list">
      <li>Dangerous practical = digital</li>
      <li>Crew safety priority</li>
      <li>Stunt liability</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Realism</h3>
    <ul class="arc-list">
      <li>Real fire often more convincing</li>
      <li>CGI fire improving</li>
      <li>Audience expectation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Director Preference</h3>
    <ul class="arc-list">
      <li>Nolan: practical preference</li>
      <li>Cameron: digital embrace</li>
      <li>Personal style</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Hybrid Approach</h3>
    <ul class="arc-list">
      <li>Practical foundation</li>
      <li>Digital enhancement</li>
      <li>Common modern</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Time Schedule</h3>
    <ul class="arc-list">
      <li>Practical immediate result</li>
      <li>Digital months post</li>
      <li>Release date constraint</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Studio</h2>
  <ul class="arc-list">
    <li><strong>VFX Studio</strong>: ILM, Weta, DNEG, MPC, Framestore</li>
    <li><strong>Practical SFX</strong>: Stan Winston Studio, KNB EFX, Legacy Effects</li>
    <li><strong>Career VFX Artist</strong>: $50K-200K, Supervisor $200K-500K</li>
    <li><strong>Career SFX Practical</strong>: $40K-150K, Coordinator senior</li>
    <li><strong>Software VFX</strong>: Houdini, Maya, Nuke, Substance</li>
    <li><strong>Oscar Best VFX</strong> — separate practical award</li>
    <li><strong>Pyrotechnician license</strong> required cho explosion</li>
    <li><strong>Stunt union</strong> SAG-AFTRA stunt</li>
    <li><strong>Modern blockbuster</strong>: $300M+ VFX budget Marvel</li>
    <li><strong>Indie alternative</strong>: in-camera tricks Edgar Wright</li>
  </ul>
</section>
`,
  },

  // 09. Specular
  {
    id: "1892ca8f-6180-4006-8410-ef849163df4e",
    tieu_de: "Specular Map",
    tieu_de_viet: "Specular Map trong 3D",
    tom_tat:
      "Specular Map là texture kiểm soát độ sáng bóng hoặc phản chiếu của bề mặt trên mô hình 3D — mô phỏng vật liệu kim loại, nhựa, mọi reflective surface.",
    meta_title:
      "Specular Map là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Specular Map trong 3D rendering. Tìm hiểu cách bake, paint specular cho metal, plastic và workflow Substance Painter.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn 3D artist make character — diffuse color texture done, looks flat. Apply <strong>Specular Map</strong> — armor part reflect light shiny, fabric part dull. Suddenly material dimensional, believable. Specular Map controls <strong>where light reflects from surface</strong>. Critical map cho realistic material. Foundation knowledge cho game artist, 3D rendering.</p>
  <p>Specular Map là kiến thức essential cho 3D texture artist, environment artist. Hiểu role specular trong shader, workflow create map trong Substance Painter, integration với PBR giúp produce realistic 3D asset. Foundation skill cho game, film, VR rendering.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Specular Map là gì?</h2>
  <p>Specular Map là <strong>grayscale texture</strong> defining where on a surface light reflects và how strongly. White = strong reflection (metal, glass). Black = no reflection (cloth, dirt). Gray = moderate. Apply to <strong>Specular slot</strong> trong shader, shader use map per-pixel determine reflection strength. Foundation cho varied material on single mesh.</p>
  <p>Traditional <strong>Specular-Glossiness workflow</strong>: Specular Map (reflection color/strength) + Glossiness (smoothness). Modern <strong>Metallic-Roughness workflow</strong>: Metallic (metal yes/no) + Roughness (smooth/rough). Specular implicit. Both valid, different parameter set. PBR (Physically Based Rendering) require one or other.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Specular vs Metallic Roughness</span>
    <p><strong>Specular-Glossiness</strong>: older but explicit. Substance Painter, Maya. Specular RGB (can be colored) + Glossiness. <strong>Metallic-Roughness</strong>: newer standard. Unity, Unreal default. Metallic 0-1 + Roughness 0-1. Same physics, different parameters. PBR principle either valid.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Specular Map</strong> — reflection strength</li>
    <li><strong>Glossiness Map</strong> — smoothness</li>
    <li><strong>Roughness Map</strong> — modern equiv</li>
    <li><strong>Metallic Map</strong> — metal binary</li>
    <li><strong>PBR Workflow</strong> — physics-based</li>
    <li><strong>Diffuse / Albedo</strong> — base color</li>
    <li><strong>Normal Map</strong> — surface detail</li>
    <li><strong>Fresnel Effect</strong> — angle-based reflect</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"specular map 3D PBR texture material substance painter"</span>
    </div>
    <p class="arc-image-caption">Specular Map — control reflection per pixel, material realism</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Material Examples</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Metal (High Spec)</summary>
      <div class="arc-card-body">
        <p>Polished steel: very high specular (near white). Colored specular (gold tint, copper). Aluminum brushed lower glossiness.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Plastic (Med Spec)</summary>
      <div class="arc-card-body">
        <p>Specular ~0.5 white. Glossiness high if polished. Lower if matte plastic.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Skin (Low Spec)</summary>
      <div class="arc-card-body">
        <p>Subtle specular. Higher on forehead, T-zone. Lower cheek. Subsurface scattering needed for realism.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cloth (Very Low Spec)</summary>
      <div class="arc-card-body">
        <p>Near black specular. Silk slightly higher. Wool minimal. Anisotropic for satin.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Glass (High Spec + Trans)</summary>
      <div class="arc-card-body">
        <p>High specular + transparency. Refraction shader. Index of refraction (IOR).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Wet Surface</summary>
      <div class="arc-card-body">
        <p>Wet area higher specular than dry. Mask via separate map. Realistic puddle, wet road.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Dirt / Grime</summary>
      <div class="arc-card-body">
        <p>Lower specular where dirt accumulate. Multiply diffuse + reduce specular. Realism layer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mixed Material Surface</summary>
      <div class="arc-card-body">
        <p>Robot character — metal armor + cloth + rubber. Different specular value per area. Mask blend.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Specular</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. PBR Workflow Choice</h3>
    <ul class="arc-list">
      <li>Specular-Gloss or Metallic-Rough</li>
      <li>Target engine determine</li>
      <li>Unity/Unreal MR default</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Substance Painter Setup</h3>
    <ul class="arc-list">
      <li>Material library</li>
      <li>Layer per material area</li>
      <li>Mask paint where</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Paint Specular Manual</h3>
    <ul class="arc-list">
      <li>Adjust per material type</li>
      <li>Wear edge brighter</li>
      <li>Dirt darker spec</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Use Smart Material</h3>
    <ul class="arc-list">
      <li>Pre-built material apply</li>
      <li>Specular value built-in</li>
      <li>Fast workflow</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Export Map</h3>
    <ul class="arc-list">
      <li>Output specular texture</li>
      <li>Glossiness separate</li>
      <li>PNG, TGA, EXR</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Engine Assignment</h3>
    <ul class="arc-list">
      <li>Plug into shader specular slot</li>
      <li>Verify result</li>
      <li>Match preview</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Test Lighting</h3>
    <ul class="arc-list">
      <li>Various light condition</li>
      <li>Specular highlight visible</li>
      <li>Adjust if too strong/weak</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Iterate</h3>
    <ul class="arc-list">
      <li>Compare to reference</li>
      <li>Real-world material similar</li>
      <li>Refine</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Tools</h2>
  <ul class="arc-list">
    <li><strong>Substance Painter</strong> — industry standard texture authoring</li>
    <li><strong>Substance Designer</strong> — procedural material creation</li>
    <li><strong>Mari</strong> — VFX industry texture pro</li>
    <li><strong>Photoshop</strong> — manual specular painting</li>
    <li><strong>PBR reference library</strong>: Adobe, Megascans, Poliigon</li>
    <li><strong>Don&apos;t too high specular</strong> — exception is glass, mirror</li>
    <li><strong>Variation key</strong> — single specular value flat, vary cho realism</li>
    <li><strong>Wear edge brighter</strong> — natural use exposes shinier material</li>
    <li><strong>Specular color</strong> — metal has colored, dielectric white-ish</li>
    <li><strong>Career Texture Artist</strong> — $50K-130K, PBR expertise required</li>
  </ul>
</section>
`,
  },

  // 10. Specular/Glossiness
  {
    id: "fec1a118-9c26-441f-9101-55ab39401ffc",
    tieu_de: "Specular/Glossiness Workflow",
    tieu_de_viet: "Workflow Specular/Glossiness PBR",
    tom_tat:
      "Specular/Glossiness là workflow vật liệu PBR thay thế dùng Specular và Glossiness thay vì Metallic-Roughness — phổ biến trong Substance Painter và một số game engine.",
    meta_title:
      "Specular/Glossiness là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Specular/Glossiness PBR workflow. So sánh với Metallic-Roughness, ưu nhược điểm và workflow chuẩn cho 3D texture artist.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn 3D texture artist confronted với two PBR workflow: <strong>Specular/Glossiness</strong> hay <strong>Metallic/Roughness</strong>? Both valid, different parameters. Specular/Glossiness — older, more explicit control. Allows colored specular (metallic gold authentic color). Common Substance Painter, CryEngine. Modern game industry prefer Metallic/Roughness simpler. Understand difference critical cho production.</p>
  <p>Specular/Glossiness workflow là kiến thức essential cho 3D texture artist working VFX, certain game engine. Hiểu difference từ Metallic-Roughness, conversion workflow, when to use which giúp navigate production pipeline. Foundation cho PBR knowledge.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Specular/Glossiness là gì?</h2>
  <p>Specular/Glossiness là <strong>PBR workflow</strong> sử dụng 2 maps chính: <strong>Specular Map</strong> (RGB color reflectance) và <strong>Glossiness Map</strong> (grayscale, white = smooth/sharp reflection, black = rough/blurry). Plus diffuse/albedo base color, normal map. Total: Diffuse + Specular + Glossiness + Normal map setup.</p>
  <p>Different from <strong>Metallic-Roughness</strong>: Same physics, different parameters. Metallic-Roughness use Metallic (0=dielectric, 1=metal) + Roughness (inverse glossiness). Specular implicit (dielectric = 0.04 white, metal = albedo color). Most game engine modern default Metallic-Roughness. Substance Painter, some VFX studio use Specular/Glossiness.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Spec/Gloss vs Met/Rough</span>
    <p><strong>Spec/Gloss</strong>: explicit specular value (can be colored), Glossiness 0=rough 1=smooth. <strong>Met/Rough</strong>: Metallic 0/1 binary, Roughness inverse. <strong>Same physics</strong>, different parameters. Conversion possible but lossy. Choose based on target engine.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Diffuse Map</strong> — base color</li>
    <li><strong>Specular Map</strong> — RGB reflectance</li>
    <li><strong>Glossiness Map</strong> — smoothness</li>
    <li><strong>Normal Map</strong> — surface detail</li>
    <li><strong>PBR</strong> — physically based</li>
    <li><strong>Dielectric vs Metallic</strong> — material type</li>
    <li><strong>Energy Conservation</strong> — PBR principle</li>
    <li><strong>F0</strong> — Fresnel reflectance at 0°</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"specular glossiness PBR workflow substance painter texture"</span>
    </div>
    <p class="arc-image-caption">Specular/Glossiness — explicit PBR workflow alternate</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Comparison</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Spec/Gloss Pros</summary>
      <div class="arc-card-body">
        <p>Explicit colored specular. Authentic gold yellow tint. Better cho metal variation. Flexibility high. Common Substance Painter.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Spec/Gloss Cons</summary>
      <div class="arc-card-body">
        <p>More texture memory (RGB spec). Easier to make non-physical accidentally. Requires understanding of dielectric F0.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Met/Rough Pros</summary>
      <div class="arc-card-body">
        <p>Simpler — Metallic binary 0/1. Texture memory less. Modern game engine standard. Harder to make physically wrong.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Met/Rough Cons</summary>
      <div class="arc-card-body">
        <p>Less explicit control. Hard cho colored specular non-metal. Implicit Fresnel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Engine Support</summary>
      <div class="arc-card-body">
        <p>Unity, Unreal default Met/Rough. CryEngine Spec/Gloss native. Both convertible. Substance Painter supports both export.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Conversion</summary>
      <div class="arc-card-body">
        <p>Spec/Gloss → Met/Rough possible but lossy. Met/Rough → Spec/Gloss generally faithful. Conversion tools available.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VFX vs Game</summary>
      <div class="arc-card-body">
        <p>VFX (Maya, Arnold): often Spec/Gloss or custom. Game (Unity, Unreal): Met/Rough standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>glTF Standard</summary>
      <div class="arc-card-body">
        <p>glTF 2.0 supports both via extension. Met/Rough core, Spec/Gloss legacy extension. Future shift Met/Rough.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Spec/Gloss</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Substance Painter Setup</h3>
    <ul class="arc-list">
      <li>Project preset Spec/Gloss</li>
      <li>Channel: BaseColor, Specular, Glossiness, Normal</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Base Diffuse</h3>
    <ul class="arc-list">
      <li>Albedo color paint</li>
      <li>Material base</li>
      <li>Non-metal: full color</li>
      <li>Metal: dark (black diffuse for pure metal)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Specular Per Material</h3>
    <ul class="arc-list">
      <li>Dielectric: 0.04 RGB (light gray)</li>
      <li>Metal: albedo color (gold yellow, copper orange)</li>
      <li>Common error: too high dielectric</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Glossiness</h3>
    <ul class="arc-list">
      <li>White = smooth, sharp reflection</li>
      <li>Black = rough, diffused reflection</li>
      <li>Match real material</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Normal Map</h3>
    <ul class="arc-list">
      <li>Surface detail</li>
      <li>Baked from high-poly</li>
      <li>OpenGL or DirectX format</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Wear &amp; Dirt</h3>
    <ul class="arc-list">
      <li>Edge wear brighter specular</li>
      <li>Dirt darker specular, less gloss</li>
      <li>Realism layer</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Export</h3>
    <ul class="arc-list">
      <li>Spec/Gloss preset export</li>
      <li>Or Met/Rough convert if target</li>
      <li>PNG, TGA, EXR format</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">8. Engine Test</h3>
    <ul class="arc-list">
      <li>Verify rendering</li>
      <li>Match preview Substance Painter</li>
      <li>Lighting setup test</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips &amp; Future</h2>
  <ul class="arc-list">
    <li><strong>Dielectric F0 = 0.04</strong> — most non-metal material</li>
    <li><strong>Metal F0 = albedo</strong> — colored reflection</li>
    <li><strong>Substance Painter</strong> support both, easy switch</li>
    <li><strong>Engine target dictate</strong> — Unity/Unreal Met/Rough</li>
    <li><strong>VFX Maya/Arnold</strong> often Spec/Gloss</li>
    <li><strong>Conversion lossy</strong> — design for target từ đầu</li>
    <li><strong>glTF 2.0</strong> — Met/Rough core, Spec/Gloss extension</li>
    <li><strong>Industry trending Met/Rough</strong> — simpler, less error</li>
    <li><strong>Career relevance</strong>: both workflow common knowledge</li>
    <li><strong>Test both</strong> — flexible technical artist</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 3 · Batch 4 — chạy ${items.length} bài keyword (Q → Z) ──\n`,
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
