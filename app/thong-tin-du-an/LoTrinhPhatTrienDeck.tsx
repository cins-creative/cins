"use client";

import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  ChartLine,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Coins,
  Compass,
  Cpu,
  Database,
  Earth,
  Globe,
  GraduationCap,
  HeartHandshake,
  Landmark,
  Languages,
  LayoutGrid,
  Library,
  Map,
  MapPin,
  Megaphone,
  Monitor,
  Palette,
  PenTool,
  Plus,
  Radio,
  Route,
  School,
  Search,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Tag,
  Tags,
  TabletSmartphone,
  Telescope,
  TrendingUp,
  User,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import type { CSSProperties } from "react";

import { TtdaIcon } from "@/app/thong-tin-du-an/ttda-deck-shared";
import {
  TtdaModeKicker,
  type TtdaHubMode,
} from "@/app/thong-tin-du-an/TtdaModeKicker";

export function LoTrinhPhatTrienSlides({
  mode,
  onModeChange,
}: {
  mode: TtdaHubMode;
  onModeChange: (mode: TtdaHubMode) => void;
}) {
  return (
    <>
        <section className="slide dark hero-slide" id="top">
          <div className="wrap">
            <TtdaModeKicker mode={mode} onModeChange={onModeChange} />
            <h1>
              Hạ tầng sự nghiệp <span className="accent">đã xác thực</span> cho
              Việt Nam
            </h1>
            <p className="lede">
              Mạng xã hội tối ưu cho sự chú ý — thứ trôi đi mỗi ngày. CINs tối
              ưu cho thành tựu được tổ chức xác nhận — thứ tích lũy giá trị theo
              thời gian.
            </p>
            <div className="hero-line">
              <div className="h">
                <span
                  className="hic"
                  style={{
                    background: "var(--cins-mint)",
                    color: "var(--neutral-900)",
                  }}
                >
                  <TtdaIcon>
                    <CheckCheck size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <div>
                  <b>
                    <span className="u">2</span> / 6
                  </b>
                  <span>giai đoạn hoàn thành</span>
                </div>
              </div>
              <div className="h">
                <span
                  className="hic"
                  style={{ background: "var(--cins-blue)", color: "#fff" }}
                >
                  <TtdaIcon>
                    <Radio size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <div>
                  <b>Beta</b>
                  <span>nền tảng đang chạy</span>
                </div>
              </div>
              <div className="h">
                <span
                  className="hic"
                  style={{
                    background: "var(--cins-yellow)",
                    color: "var(--neutral-900)",
                  }}
                >
                  <TtdaIcon>
                    <Users size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <div>
                  <b>10.000</b>
                  <span>user — mục tiêu kế tiếp</span>
                </div>
              </div>
              <div className="h">
                <span
                  className="hic"
                  style={{ background: "var(--cins-violet)", color: "#fff" }}
                >
                  <TtdaIcon>
                    <Telescope size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <div>
                  <b>20 triệu user</b>
                  <span>tầm nhìn dài hạn</span>
                </div>
              </div>
            </div>
          </div>
          <div className="scroll-hint">
            Cuộn
            <TtdaIcon>
              <ChevronDown size={15} strokeWidth={1.6} />
            </TtdaIcon>
          </div>
        </section>

        <section className="slide" id="phase-1" data-c="mint">
          <div className="wrap">
            <div className="shead">
              <span className="sic">
                <TtdaIcon>
                  <Library size={21} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div className="ht">
                <div className="sidx">PHASE 01</div>
                <h2>Thư viện bài viết ngành nghề sáng tạo</h2>
              </div>
              <span className="status done">
                <TtdaIcon>
                  <Check size={11} strokeWidth={1.6} />
                </TtdaIcon>
                Đã hoàn thành
              </span>
            </div>
            <div className="duo">
              <div className="txt">
                <div className="points">
                  <div className="pt">
                    <span className="pic">
                      <TtdaIcon>
                        <Library size={15} strokeWidth={1.6} />
                      </TtdaIcon>
                    </span>
                    <div className="tx">
                      <b>Kho bài viết chuyên sâu</b>
                      <span>
                        nghề, ngành đào tạo, lĩnh vực sáng tạo — CINs xây khung
                        nội dung ban đầu
                      </span>
                    </div>
                  </div>
                  <div className="pt">
                    <span className="pic">
                      <TtdaIcon>
                        <Users size={15} strokeWidth={1.6} />
                      </TtdaIcon>
                    </span>
                    <div className="tx">
                      <b>Mô hình đóng góp mở</b>
                      <span>
                        user có chuyên môn thêm/sửa bài như Wikipedia — chuyên
                        gia duyệt phiên bản chính xác nhất, nội dung luôn động
                      </span>
                    </div>
                  </div>
                  <div className="pt">
                    <span className="pic">
                      <TtdaIcon>
                        <Search size={15} strokeWidth={1.6} />
                      </TtdaIcon>
                    </span>
                    <div className="tx">
                      <b>Cửa vào organic</b>
                      <span>
                        SEO kéo người dùng đầu tiên đến vì nhu cầu thông tin
                        nghề thật
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="media">
                <div className="tagset">
                  <span className="lbl">
                    <TtdaIcon>
                      <Tags size={13} strokeWidth={1.6} />
                    </TtdaIcon>
                    Hệ tag thống nhất — xương sống phân loại toàn platform
                  </span>
                  <span className="tg a">
                    <TtdaIcon>
                      <PenTool size={12} strokeWidth={1.6} />
                    </TtdaIcon>
                    Concept Art
                  </span>
                  <span className="tg a">
                    <TtdaIcon>
                      <Clapperboard size={12} strokeWidth={1.6} />
                    </TtdaIcon>
                    Motion Design
                  </span>
                  <span className="tg">
                    <TtdaIcon>
                      <Tag size={12} strokeWidth={1.6} />
                    </TtdaIcon>
                    UI/UX
                  </span>
                  <span className="tg">
                    <TtdaIcon>
                      <Wrench size={12} strokeWidth={1.6} />
                    </TtdaIcon>
                    Photoshop
                  </span>
                  <span className="tg">
                    <TtdaIcon>
                      <Wrench size={12} strokeWidth={1.6} />
                    </TtdaIcon>
                    Blender
                  </span>
                  <span className="tg">
                    <TtdaIcon>
                      <Tag size={12} strokeWidth={1.6} />
                    </TtdaIcon>
                    3D Animation
                  </span>
                  <span className="tg">
                    <TtdaIcon>
                      <GraduationCap size={12} strokeWidth={1.6} />
                    </TtdaIcon>
                    Thiết kế Đồ họa
                  </span>
                  <span className="tg">
                    <TtdaIcon>
                      <Tag size={12} strokeWidth={1.6} />
                    </TtdaIcon>
                    Illustration
                  </span>
                </div>
              </div>
            </div>
            <p className="why">
              <b>Vì sao bắt đầu ở đây:</b> không thể xây mạng lưới trên nền trống
              — thư viện tạo lý do đầu tiên để người trong ngành tìm đến.
            </p>
          </div>
        </section>

        <section className="slide" id="phase-2" data-c="blue">
          <div className="wrap">
            <div className="shead">
              <span className="sic">
                <TtdaIcon>
                  <LayoutGrid size={21} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div className="ht">
                <div className="sidx">PHASE 02</div>
                <h2>Platform ngành sáng tạo Việt Nam</h2>
                <p className="desc">
                  Từ thư viện tĩnh thành nền tảng sống — triển khai theo 3 giai
                  đoạn con.
                </p>
              </div>
              <span className="status live">
                <TtdaIcon>
                  <Radio size={11} strokeWidth={1.6} />
                </TtdaIcon>
                Đang chạy Beta
              </span>
            </div>

            <div className="substage">
              <div className="sub live">
                <div className="stag">2A</div>
                <div className="shd">
                  <span className="sicn">
                    <TtdaIcon>
                      <Monitor size={18} strokeWidth={1.6} />
                    </TtdaIcon>
                  </span>
                  <h5>Website</h5>
                </div>
                <p>Phiên bản Beta — chính là nền tảng bạn đang sử dụng.</p>
                <span className="spill">
                  <TtdaIcon>
                    <Radio size={10} strokeWidth={1.6} />
                  </TtdaIcon>
                  Đang chạy
                </span>
              </div>
              <span className="subarr a1">
                <TtdaIcon>
                  <ChevronRight size={13} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div className="sub">
                <div className="stag">2B</div>
                <div className="shd">
                  <span className="sicn">
                    <TtdaIcon>
                      <Smartphone size={18} strokeWidth={1.6} />
                    </TtdaIcon>
                  </span>
                  <h5>App Android</h5>
                </div>
                <p>
                  Đưa Journey &amp; Gallery lên thiết bị di động phổ biến nhất
                  Việt Nam.
                </p>
                <span className="spill">
                  <TtdaIcon>
                    <ArrowRight size={10} strokeWidth={1.6} />
                  </TtdaIcon>
                  Kế tiếp
                </span>
              </div>
              <span className="subarr a2">
                <TtdaIcon>
                  <ChevronRight size={13} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div className="sub">
                <div className="stag">2C</div>
                <div className="shd">
                  <span className="sicn">
                    <TtdaIcon>
                      <TabletSmartphone size={18} strokeWidth={1.6} />
                    </TtdaIcon>
                  </span>
                  <h5>App iOS</h5>
                </div>
                <p>Hoàn thiện hiện diện đa nền tảng: Website · Android · iOS.</p>
                <span className="spill">
                  <TtdaIcon>
                    <ArrowRight size={10} strokeWidth={1.6} />
                  </TtdaIcon>
                  Kế tiếp
                </span>
              </div>
            </div>

            <div className="duo">
              <div className="txt">
                <div className="points">
                  <div className="pt">
                    <span className="pic">
                      <TtdaIcon>
                        <Route size={15} strokeWidth={1.6} />
                      </TtdaIcon>
                    </span>
                    <div className="tx">
                      <b>Journey</b>
                      <span>
                        dòng thời gian sự nghiệp: mỗi cột mốc học tập, làm việc,
                        tác phẩm — lưu vĩnh viễn
                      </span>
                    </div>
                  </div>
                  <div className="pt">
                    <span className="pic">
                      <TtdaIcon>
                        <LayoutGrid size={15} strokeWidth={1.6} />
                      </TtdaIcon>
                    </span>
                    <div className="tx">
                      <b>Gallery</b>
                      <span>
                        feed khám phá tác phẩm theo nghề, tag, tổ chức
                      </span>
                    </div>
                  </div>
                  <div className="pt">
                    <span className="pic">
                      <TtdaIcon>
                        <BadgeCheck size={15} strokeWidth={1.6} />
                      </TtdaIcon>
                    </span>
                    <div className="tx">
                      <b>Verify</b>
                      <span>
                        tổ chức xác nhận cột mốc thay vì tự khai — đây là moat
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="media">
                <div className="vs">
                  <div className="side them">
                    <h6>
                      <TtdaIcon>
                        <User size={12} strokeWidth={1.6} />
                      </TtdaIcon>
                      Nền tảng hiện có
                    </h6>
                    <b>Tự khai</b>
                    <p>
                      LinkedIn, Behance, Facebook — ai cũng ghi được gì tùy ý,
                      không kiểm chứng.
                    </p>
                  </div>
                  <div className="side us">
                    <h6>
                      <TtdaIcon>
                        <ShieldCheck size={12} strokeWidth={1.6} />
                      </TtdaIcon>
                      CINs
                    </h6>
                    <b>Tổ chức xác nhận</b>
                    <p>
                      Trường, trung tâm, studio duyệt từng cột mốc — đối thủ
                      toàn cầu không sao chép được.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="why">
              <b>Vì sao xây engine trước khi kéo user:</b> mỗi người gia nhập sau
              đó làm dày tài sản verified — không phải làm loãng thêm một feed
              nữa.
            </p>
          </div>
        </section>

        <section className="slide" id="phase-3" data-c="orange">
          <div className="wrap">
            <div className="shead">
              <span className="sic">
                <TtdaIcon>
                  <TrendingUp size={21} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div className="ht">
                <div className="sidx">PHASE 03</div>
                <h2>Mở rộng user platform</h2>
                <p className="desc">
                  Tăng trưởng theo mật độ, không phải quảng cáo đại trà — mỗi
                  tổ chức đào tạo gia nhập kéo theo toàn bộ học viên của họ.
                </p>
              </div>
              <span className="status next">
                <TtdaIcon>
                  <ArrowRight size={11} strokeWidth={1.6} />
                </TtdaIcon>
                Giai đoạn kế tiếp
              </span>
            </div>
            <div className="flow">
              <div className="fstep">
                <div className="fdot">
                  <TtdaIcon>
                    <Building2 size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </div>
                <h6>Tổ chức đào tạo</h6>
                <span>gia nhập</span>
              </div>
              <div className="fstep">
                <div className="fdot">
                  <TtdaIcon>
                    <Users size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </div>
                <h6>Học viên lên Journey</h6>
                <span>hàng trăm mỗi org</span>
              </div>
              <div className="fstep">
                <div className="fdot">
                  <TtdaIcon>
                    <BadgeCheck size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </div>
                <h6>Tác phẩm verified</h6>
                <span>public</span>
              </div>
              <div className="fstep">
                <div className="fdot">
                  <TtdaIcon>
                    <UserPlus size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </div>
                <h6>Người xem mới</h6>
                <span>tự tạo hồ sơ</span>
              </div>
            </div>
            <div className="big">
              <b>
                10.000<span className="plus"> user</span>
              </b>
              <span>
                có Journey thật — không đếm tài khoản đăng ký rỗng
              </span>
            </div>
            <p className="why">
              <b>Vì sao 10.000 trước khi thu tiền:</b> giá trị bán ở Phase 4
              chính là mật độ dữ liệu verified tạo ra ở phase này.
            </p>
          </div>
        </section>

        <section className="slide" id="phase-4" data-c="yellow">
          <div className="wrap">
            <div className="shead">
              <span className="sic">
                <TtdaIcon>
                  <Coins size={21} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div className="ht">
                <div className="sidx">PHASE 04</div>
                <h2>Kích hoạt các hoạt động thu doanh thu</h2>
                <p className="desc">
                  Nhiều dòng doanh thu trên cùng một nền: talent pool đã xác
                  thực.
                </p>
              </div>
              <span className="status next">
                <TtdaIcon>
                  <ArrowRight size={11} strokeWidth={1.6} />
                </TtdaIcon>
                Sau mốc 10.000 user
              </span>
            </div>
            <div className="rev">
              <div
                className="col"
                style={
                  {
                    "--rc": "var(--cins-blue)",
                    "--rcs": "var(--cins-blue-soft)",
                    "--rcd": "var(--cins-blue-dark)",
                  } as CSSProperties
                }
              >
                <span className="ric">
                  <TtdaIcon>
                    <School size={19} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <h5>Cơ sở đào tạo</h5>
                <div className="role">B2B · Phía cung</div>
                <p>
                  Trang khóa học + analytics chuyển đổi (xem → ghi danh). Tuyển
                  sinh bằng tác phẩm verified của chính học viên.
                </p>
              </div>
              <div
                className="col"
                style={
                  {
                    "--rc": "var(--cins-violet)",
                    "--rcs": "var(--cins-violet-soft)",
                    "--rcd": "#6B3FB0",
                  } as CSSProperties
                }
              >
                <span className="ric">
                  <TtdaIcon>
                    <Briefcase size={19} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <h5>Studio &amp; doanh nghiệp</h5>
                <div className="role">B2B · Phía cầu</div>
                <p>
                  Scouting trên talent pool verified: kỹ năng, phần mềm, nơi đào
                  tạo, tác phẩm thật.
                </p>
              </div>
              <div
                className="col"
                style={
                  {
                    "--rc": "var(--cins-orange)",
                    "--rcs": "var(--cins-orange-soft)",
                    "--rcd": "#B05E0B",
                  } as CSSProperties
                }
              >
                <span className="ric">
                  <TtdaIcon>
                    <Megaphone size={19} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <h5>Quảng cáo</h5>
                <div className="role">Dòng doanh thu bổ sung</div>
                <p>
                  Thương hiệu tiếp cận đúng cộng đồng sáng tạo theo nghề, tag,
                  tổ chức — target trên dữ liệu verified.
                </p>
              </div>
            </div>
            <span className="commit">
              <TtdaIcon>
                <HeartHandshake size={14} strokeWidth={1.6} />
              </TtdaIcon>
              Người dùng cá nhân: miễn phí vĩnh viễn
            </span>
            <p className="why">
              <b>Vì sao mô hình bền:</b> cả ba dòng doanh thu đứng trên cùng một
              tài sản là dữ liệu verified. Người dùng cá nhân miễn phí vĩnh
              viễn, vì chính họ tạo ra tài sản đó.
            </p>
          </div>
        </section>

        <section className="slide" id="phase-5" data-c="violet">
          <div className="wrap">
            <div className="shead">
              <span className="sic">
                <TtdaIcon>
                  <Telescope size={21} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div className="ht">
                <div className="sidx">PHASE 05</div>
                <h2>
                  Bao trùm mọi ngành nghề &amp; hệ thống đào tạo Việt Nam
                </h2>
              </div>
              <span className="status vision">
                <TtdaIcon>
                  <Telescope size={11} strokeWidth={1.6} />
                </TtdaIcon>
                Tầm nhìn dài hạn
              </span>
            </div>
            <div className="duo">
              <div className="txt">
                <div className="vnum">
                  <b>20.000.000</b>
                  <span>user Việt Nam</span>
                </div>
                <p className="vdesc">
                  Toàn bộ lực lượng học sinh, sinh viên và lao động trẻ trong
                  hệ thống đào tạo — mỗi người một hồ sơ sự nghiệp đã xác thực,
                  theo suốt từ trường phổ thông đến doanh nghiệp.
                </p>
              </div>
              <div className="media">
                <div className="sectors">
                  <span className="sector now">
                    <TtdaIcon>
                      <Palette size={13} strokeWidth={1.6} />
                    </TtdaIcon>
                    Sáng tạo — đang chạy
                  </span>
                  <span className="sector">
                    <TtdaIcon>
                      <Cpu size={13} strokeWidth={1.6} />
                    </TtdaIcon>
                    Kỹ thuật — CNTT
                  </span>
                  <span className="sector">
                    <TtdaIcon>
                      <ChartLine size={13} strokeWidth={1.6} />
                    </TtdaIcon>
                    Kinh tế
                  </span>
                  <span className="sector">
                    <TtdaIcon>
                      <Stethoscope size={13} strokeWidth={1.6} />
                    </TtdaIcon>
                    Y — Dược
                  </span>
                  <span className="sector">
                    <TtdaIcon>
                      <Languages size={13} strokeWidth={1.6} />
                    </TtdaIcon>
                    Ngôn ngữ
                  </span>
                  <span className="sector">
                    <TtdaIcon>
                      <Plus size={13} strokeWidth={1.6} />
                    </TtdaIcon>
                    …
                  </span>
                </div>
                <div className="ref">
                  <TtdaIcon>
                    <Compass size={17} strokeWidth={1.6} />
                  </TtdaIcon>
                  <p>
                    <b>
                      Điểm quy chiếu: Handshake (Mỹ, định giá $3.5B)
                    </b>{" "}
                    — mạng lưới trường đại học ↔ nhà tuyển dụng. Khác biệt của
                    CINs: nền móng là dữ liệu verified từ tổ chức trong nước, vị
                    thế không thể mua hay sao chép.
                  </p>
                </div>
              </div>
            </div>
            <p className="why">
              <b>Vì sao tin được:</b> mỗi phase là điều kiện cần của phase sau
              — nội dung → sản phẩm → mật độ → doanh thu → quy mô. Không có
              bước nhảy niềm tin nào.
            </p>
          </div>
        </section>

        <section className="slide" id="phase-6" data-c="blue">
          <div className="wrap">
            <div className="shead">
              <span className="sic">
                <TtdaIcon>
                  <Earth size={21} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div className="ht">
                <div className="sidx">PHASE 06</div>
                <h2>Tiến ra thị trường toàn cầu</h2>
                <p className="desc">
                  Mô hình xác thực theo từng thị trường nhân bản được sang các
                  quốc gia khác — Việt Nam là điểm khởi đầu, không phải giới
                  hạn.
                </p>
              </div>
              <span className="status vision">
                <TtdaIcon>
                  <Globe size={11} strokeWidth={1.6} />
                </TtdaIcon>
                Tầm nhìn dài hạn
              </span>
            </div>
            <div className="flow">
              <div className="fstep">
                <div className="fdot g now">
                  <TtdaIcon>
                    <MapPin size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </div>
                <h6>Việt Nam</h6>
                <span>thị trường chứng minh mô hình</span>
              </div>
              <div className="fstep">
                <div className="fdot g">
                  <TtdaIcon>
                    <Map size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </div>
                <h6>Thị trường tiếp theo</h6>
                <span>nhân bản playbook per-market</span>
              </div>
              <div className="fstep">
                <div className="fdot g">
                  <TtdaIcon>
                    <Earth size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </div>
                <h6>Toàn cầu</h6>
                <span>hạ tầng hồ sơ verified đa quốc gia</span>
              </div>
            </div>
            <div className="points" style={{ marginTop: 22, maxWidth: 680 }}>
              <div className="pt">
                <span className="pic">
                  <TtdaIcon>
                    <Database size={15} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <div className="tx">
                  <b>
                    Cấu trúc dữ liệu đã được sắp xếp và hệ thống cho giai đoạn
                    này
                  </b>
                  <span>
                    engine tag, verify và hồ sơ thiết kế ngành-agnostic và
                    thị-trường-agnostic từ ngày đầu — mở thị trường mới không
                    cần đập xây lại nền
                  </span>
                </div>
              </div>
              <div className="pt">
                <span className="pic">
                  <TtdaIcon>
                    <Landmark size={15} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <div className="tx">
                  <b>Xác thực gắn thể chế bản địa của từng nước</b>
                  <span>
                    cùng cơ chế đã tạo lợi thế phòng thủ tại Việt Nam — mỗi thị
                    trường mới là một moat mới
                  </span>
                </div>
              </div>
            </div>
            <p className="why">
              <b>Vì sao khả thi:</b> thứ khó nhất — kiến trúc dữ liệu đúng — đã
              làm xong ở Phase 2. Global là bài toán nhân bản, không phải phát
              minh lại.
            </p>
          </div>
        </section>
    </>
  );
}
