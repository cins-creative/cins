// CINs UI Kit — App shell, screens, mock data
const { useState } = React;

const CAREERS = [
  { id: 'game', label: 'Game' },
  { id: 'animation', label: 'Hoạt hình' },
  { id: 'vfx', label: 'Kỹ xảo điện ảnh' },
  { id: 'film', label: 'Phim & Điện ảnh' },
  { id: 'post', label: 'Sản xuất hậu kỳ' },
  { id: 'broadcast', label: 'Phát thanh truyền hình' },
  { id: 'marketing', label: 'Digital Marketing' },
];

const FIELDS = [
  { id: 'graphic', label: 'Thiết kế đồ họa', code: '7210403', img: '../../assets/career-illustration-1.png', accent: 'orange' },
  { id: 'graphics', label: 'Đồ họa',           code: '7210104', img: '../../assets/career-illustration-2.png', accent: 'mint'   },
  { id: 'industrial', label: 'Thiết kế công nghiệp', code: '7210402', img: '../../assets/career-illustration-3.png', accent: 'yellow' },
  { id: 'digital',    label: 'Mỹ thuật số',    code: '7210408', img: '../../assets/career-illustration-4.png', accent: 'violet' },
  { id: 'fine',       label: 'Hội hoạ',         code: '7210103', img: '../../assets/career-illustration-1.png', accent: 'orange' },
  { id: 'fashion',    label: 'Thiết kế thời trang', code: '7210404', img: '../../assets/career-illustration-2.png', accent: 'mint' },
  { id: 'multi',      label: 'Mỹ thuật đa phương tiện', code: '7320104', img: '../../assets/career-illustration-3.png', accent: 'yellow' },
  { id: 'cinetv',     label: 'Công nghệ Điện ảnh truyền hình', code: '7210302', img: '../../assets/career-illustration-4.png', accent: 'violet' },
];

const GAME_DEPARTMENTS = ['Quản lý sản xuất','Thiết kế game','Tiền sản xuất','Sản xuất','Technical Art','Âm thanh','Lập trình','Quản lý chất lượng','Bộ phận phân phối'];

const GAME_DESIGN_ROLES = [
  { id: 'balance',  label: 'Balance Game Designer' },
  { id: 'narrative', label: 'Narrative Game designer' },
  { id: 'gameplay', label: 'Gameplay designer' },
  { id: 'lead',    label: 'Lead Game Designer' },
  { id: 'level',   label: 'Level Designer' },
  { id: 'economy', label: 'Economy Designer' },
  { id: 'uxgame',  label: 'UX Game Designer' },
  { id: 'writer',  label: 'Game Writer' },
];

const PREPRO_ROLES = [
  { id: 'uigame', label: 'UI Game Designer' },
  { id: 'character', label: 'Character Concept Artist' },
  { id: 'env',       label: 'Environment Concept Artist' },
  { id: 'background', label: 'Background Designer' },
];

const SCHOOLS = [
  { id: 'uah', name: 'Đại học Kiến trúc TP.HCM', code: 'KTS', type: 'public', locations: ['Hồ Chí Minh'], crest: 'UAH', crestColor: '#C8102E', tone: 'a' },
  { id: 'mts', name: 'Đại học Mỹ thuật TP.HCM',  code: 'MTS', type: 'public', locations: ['Hồ Chí Minh'], crest: 'MT', crestColor: '#1F74C9', tone: 'b' },
  { id: 'vlu', name: 'Đại học Văn Lang',          code: 'VLU', type: 'private', locations: ['Hồ Chí Minh','Bà Rịa - Vũng Tàu','Cần Thơ','Đà Nẵng','Hà Nội'], crest: 'VL', crestColor: '#C8102E', tone: 'c' },
  { id: 'hsu', name: 'Đại học Hoa Sen',           code: 'HSU', type: 'private', locations: ['Hồ Chí Minh'], crest: 'HSU', crestColor: '#1F74C9', tone: 'd' },
  { id: 'dkc', name: 'Đại học Công nghệ TP.HCM',  code: 'DKC', type: 'private', locations: ['Hồ Chí Minh'], crest: 'HU', crestColor: '#FFB85C', tone: 'e' },
  { id: 'dhb', name: 'Đại học Quốc tế Hồng Bàng', code: 'DHB', type: 'private', locations: ['Hồ Chí Minh'], crest: 'HB', crestColor: '#C8102E', tone: 'f' },
];

// ============== SCREENS ==============

function HomeScreen({ onCareer, onSchools }) {
  return (
    <div className="cins-home">
      <HeroPanel
        eyebrow="Khám phá"
        title="ngành sáng tạo thị giác tại Việt Nam"
        body="Tìm hiểu các ngành nghề trong lĩnh vực Phim, Game, Điện ảnh, Kiến trúc, Thời trang, Thiết kế. Định hướng nghề từ THPT, kết nối với cơ sở đào tạo và doanh nghiệp."
        illustration="../../assets/illustration-gamepad.png"
        placeholder="Nhập tên ngành học mà bạn quan tâm"
      />
      <div className="cins-section-card">
        <h2>Các ngành công nghiệp sáng tạo</h2>
        <p className="cins-section-sub">Chọn một lĩnh vực để khám phá các vị trí và bộ phận bên trong.</p>
        <div className="cins-card-grid cins-card-grid-3">
          <CareerCard accent="orange" image="../../assets/illustration-gamepad.png"
            title="Game" code="công nghiệp" onClick={() => onCareer?.('game')} />
          <CareerCard accent="violet" image="../../assets/career-illustration-2.png"
            title="Hoạt hình" code="công nghiệp" />
          <CareerCard accent="mint" image="../../assets/career-illustration-4.png"
            title="Kỹ xảo điện ảnh" code="công nghiệp" />
        </div>
        <button className="cins-link-btn" onClick={onSchools}>Xem các trường đại học →</button>
      </div>
    </div>
  );
}

function CareersScreen({ onArticle }) {
  const [tab, setTab] = useState('careers');
  const [career, setCareer] = useState('game');
  const tabs = [
    { id: 'careers', label: 'Nghề nghiệp' },
    { id: 'fields', label: 'Ngành học' },
  ];
  const items = tab === 'careers' ? CAREERS : FIELDS.map(f => ({ id: f.id, label: f.label }));
  return (
    <div className="cins-layout">
      <Sidebar tabs={tabs} activeTab={tab} onTabChange={setTab}
               items={items} activeItem={career} onItemSelect={setCareer} />
      <main>
        {tab === 'fields' ? (
          <FieldsView />
        ) : career === 'game' ? (
          <GameCareerView onArticle={onArticle} />
        ) : (
          <FieldsView />
        )}
      </main>
    </div>
  );
}

function FieldsView() {
  return (
    <>
      <HeroPanel
        eyebrow="Khám phá"
        title="ngành học tại Việt Nam"
        body="Chương trình đào tạo các ngành liên quan đến thị giác sáng tạo tại các trường Đại học/ Cao đẳng Việt Nam."
        illustration="../../assets/illustration-gamepad.png"
        placeholder="Nhập tên ngành học mà bạn quan tâm"
      />
      <div className="cins-card-grid">
        {FIELDS.map(f => (
          <CareerCard key={f.id} accent={f.accent} image={f.img}
            title={f.label} code={f.code} />
        ))}
      </div>
    </>
  );
}

function GameCareerView({ onArticle }) {
  const [dept, setDept] = useState('Thiết kế game');
  return (
    <>
      <HeroPanel
        eyebrow="Lĩnh vực"
        title="Game"
        body="Hiện nay Game đang là ngành giải trí phát triển nhanh chóng và mạnh mẽ. Ngành này cần nhiều kỹ năng khác nhau từ nghệ thuật đến lập trình và nhu cầu tuyển dụng lớn đối với những người có kỹ năng marketing, quản lý dự án, sale và tài chính."
        illustration="../../assets/illustration-gamepad.png"
        placeholder="Nhập tên vị trí công việc mà bạn quan tâm"
      />
      <div className="cins-tag-row" style={{ marginBottom: 20 }}>
        {GAME_DEPARTMENTS.map(d => (
          <span key={d} className={`cins-tag ${d === dept ? 'is-active' : ''}`} onClick={() => setDept(d)}>{d}</span>
        ))}
      </div>
      <div className="cins-section-card">
        <h2>{dept}</h2>
        <p className="cins-section-sub">
          {dept === 'Quản lý sản xuất'
            ? 'Tổ chức sản xuất là việc phải đảm bảo hoàn thành đúng deadline và trong phạm vi ngân sách cho phép.'
            : dept === 'Thiết kế game'
            ? 'Xây dựng cơ chế game, thiết kế cách chơi và tính toán sao cho cân bằng game.'
            : 'Khám phá các vị trí công việc trong bộ phận này.'}
        </p>
        <div className="cins-card-grid">
          {(dept === 'Thiết kế game' ? GAME_DESIGN_ROLES : PREPRO_ROLES).map(r => (
            <RoleCard key={r.id} image="../../assets/mascot-artist.png"
              title={r.label}
              onClick={() => onArticle?.(r.id)} />
          ))}
        </div>
      </div>
    </>
  );
}

function SchoolsScreen() {
  return (
    <>
      <h1 className="cins-page-title">Các trường Đại học đào tạo ngành sáng tạo thị giác</h1>
      <div className="cins-search-row">
        <div className="cins-search-field"><input placeholder="Nhập tên trường" /></div>
        <div className="cins-search-field"><span style={{flex:1, color:'var(--fg-4)'}}>Tìm ngành</span><span style={{color:'var(--fg-3)'}}>⌄</span></div>
      </div>
      <div className="cins-card-grid cins-card-grid-3">
        {SCHOOLS.map(s => <SchoolCard key={s.id} {...s} photoTone={s.tone} />)}
      </div>
    </>
  );
}

function ArticleScreen() {
  const [tab, setTab] = useState('Keyword');
  const [kw, setKw] = useState('Animation');
  return (
    <div className="cins-layout-article">
      <main>
        <ArticleHeader
          eyebrow="Animator"
          title="Animator"
          body="Animator là người thổi hồn vào nhân vật thông qua các chuỗi hoạt hình cho nhân vật hoặc đồ vật trong phim hoạt hình 3D hoặc 2D."
          illustration="../../assets/mascot-technical-artist.png"
          tags={['Animation', 'Game', 'VFX']}
          department="Sản xuất"
        />
        <div className="cins-article-content">
          <h2>Animator là ai?</h2>
          <p>Animator là người chịu trách nhiệm tạo ra các chuyển động sống động và biểu cảm cho nhân vật hoặc đồ vật trong các sản phẩm hoạt hình. Công việc của animator bao gồm:</p>
          <h3>1. Lên ý tưởng</h3>
          <ul>
            <li><strong>Hiểu kịch bản:</strong> Animator đọc kịch bản và hiểu rõ cảnh quay, nhân vật cùng cảm xúc cần truyền tải.</li>
            <li><strong>Phác thảo storyboard:</strong> Phác thảo các cảnh quan trọng để hình dung trước cách chuyển động.</li>
          </ul>
          <h3>2. Tạo chuyển động</h3>
          <ul>
            <li><strong>Keyframe animation:</strong> Tạo ra các khung hình chính xác định trạng thái ban đầu, giữa và kết thúc của chuyển động.</li>
            <li><strong>In-between:</strong> Tạo các khung hình trung gian để làm chuyển động mượt mà.</li>
          </ul>
          <h3>4. Hiệu chỉnh và hoàn thiện</h3>
          <ul>
            <li><strong>Kiểm tra và sửa lỗi:</strong> Animator xem lại các đoạn phim để đảm bảo chuyển động mượt mà, không có lỗi kỹ thuật.</li>
            <li><strong>Thêm hiệu ứng đặc biệt:</strong> Trong một số trường hợp, họ thêm các hiệu ứng như ánh sáng, bóng, hoặc hiệu ứng vật lý để tăng tính chân thực.</li>
            <li><strong>Phản hồi và điều chỉnh:</strong> Dựa trên ý kiến từ đạo diễn hoặc khách hàng, animator chỉnh sửa để đạt được kết quả mong muốn.</li>
          </ul>
          <h2 style={{marginTop: 32}}>Animator cần giỏi điều gì?</h2>
          <div className="cins-bullet-icons">
            <figure><img src="../../assets/mascot-artist.png" alt=""/><figcaption>Tư duy mỹ thuật</figcaption></figure>
            <figure><img src="../../assets/mascot-technical-artist.png" alt=""/><figcaption>Kỹ thuật phần mềm</figcaption></figure>
            <figure><img src="../../assets/mascot-manager.png" alt=""/><figcaption>Sáng tạo</figcaption></figure>
            <figure><img src="../../assets/mascot-supporter.png" alt=""/><figcaption>Kiến thức Animation</figcaption></figure>
          </div>
          <p><strong>Kỹ năng nghệ thuật:</strong> Hiểu về màu sắc, bố cục, ánh sáng, và cách kể chuyện bằng hình ảnh.</p>
          <p><strong>Kỹ năng công nghệ:</strong> Thành thạo các phần mềm như Adobe Animate, After Effects, Maya, Blender, hoặc Cinema 4D.</p>
          <p><strong>Tư duy sáng tạo:</strong> Khả năng tưởng tượng và tạo ra những ý tưởng mới lạ, độc đáo.</p>
        </div>
      </main>
      <KeywordPanel
        activeTab={tab} onTabChange={setTab}
        keywordTitle="Keyframe"
        keywordBody="Keyframe (khung hình chính) là một khung hình quan trọng xác định trạng thái cụ thể của một đối tượng tại thời điểm đó."
        items={['Animation','Frame by frame','Color Theory','Frame rate']}
        activeItem={kw} onItemSelect={setKw}
      />
    </div>
  );
}

// ============== APP SHELL ==============

function App() {
  const [screen, setScreen] = useState('home');
  return (
    <div>
      <TopNav active={screen === 'home' ? 'home' : screen === 'schools' ? 'schools' : screen === 'careers' ? 'careers' : 'articles'}
              onNavigate={(id) => {
                if (id === 'home') setScreen('home');
                else if (id === 'schools') setScreen('schools');
                else if (id === 'careers') setScreen('careers');
                else if (id === 'articles') setScreen('article');
              }} />
      <div className="cins-page">
        {screen === 'home'    && <HomeScreen onCareer={() => setScreen('careers')} onSchools={() => setScreen('schools')} />}
        {screen === 'careers' && <CareersScreen onArticle={() => setScreen('article')} />}
        {screen === 'schools' && <SchoolsScreen />}
        {screen === 'article' && <ArticleScreen />}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
