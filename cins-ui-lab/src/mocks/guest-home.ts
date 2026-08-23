/** Fixture data for guest home — no DB. */

export type GuestHomeStats = {
  nghe: number;
  nganh: number;
  truong: number;
  coSo: number;
  linhVuc: number;
};

export type GuestLinhVuc = {
  slug: string;
  ten: string;
  accent: string;
};

export type GuestMajor = {
  id: string;
  slug: string;
  title: string;
  maNganh?: string;
  khoiThi: string[];
};

export type GuestSchool = {
  id: string;
  slug: string;
  ten: string;
  nganhCount: number;
  thanhPho?: string;
};

export type GuestCareer = {
  id: string;
  slug: string;
  title: string;
  linhVuc?: string;
};

export type GuestCourse = {
  id: string;
  title: string;
  orgName: string;
};

export type GuestEvent = {
  id: string;
  title: string;
  startsAt: string;
  location: string;
};

export type GuestWork = {
  id: string;
  title: string;
  authorName: string;
};

export type GuestHomeFixture = {
  stats: GuestHomeStats;
  linhVucs: GuestLinhVuc[];
  majors: GuestMajor[];
  schools: GuestSchool[];
  careers: GuestCareer[];
  courses: GuestCourse[];
  events: GuestEvent[];
  works: GuestWork[];
};

/**
 * LOGIC_TOUCH: home.guest-data
 * Real: lib/cins/guest-home/loadGuestHomeData.ts (unstable_cache, multi-query)
 * Mock: static fixture below
 * Apply: wire loadGuestHomeData; keep view props shape
 */
export const GUEST_HOME_FIXTURE: GuestHomeFixture = {
  stats: {
    nghe: 120,
    nganh: 48,
    truong: 38,
    coSo: 12,
    linhVuc: 14,
  },
  linhVucs: [
    { slug: "do-hoa", ten: "Đồ họa", accent: "#1F74C9" },
    { slug: "animation", ten: "Animation", accent: "#BB89F8" },
    { slug: "ux-ui", ten: "UX/UI", accent: "#6EFEC0" },
    { slug: "game", ten: "Game Art", accent: "#FDAD4C" },
    { slug: "nhiep-anh", ten: "Nhiếp ảnh", accent: "#FDE859" },
    { slug: "thoi-trang", ten: "Thời trang", accent: "#E5484D" },
  ],
  majors: [
    {
      id: "m1",
      slug: "thiet-ke-do-hoa",
      title: "Thiết kế đồ họa",
      maNganh: "7210403",
      khoiThi: ["H", "V"],
    },
    {
      id: "m2",
      slug: "truyen-thong-da-phuong-tien",
      title: "Truyền thông đa phương tiện",
      maNganh: "7320104",
      khoiThi: ["A01", "D01"],
    },
    {
      id: "m3",
      slug: "cong-nghe-thong-tin",
      title: "Công nghệ thông tin (Game)",
      maNganh: "7480201",
      khoiThi: ["A00", "A01"],
    },
    {
      id: "m4",
      slug: "thiet-ke-thoi-trang",
      title: "Thiết kế thời trang",
      maNganh: "7210404",
      khoiThi: ["H", "V"],
    },
  ],
  schools: [
    {
      id: "s1",
      slug: "dh-my-thuat-tp-hcm",
      ten: "ĐH Mỹ thuật TP.HCM",
      nganhCount: 12,
      thanhPho: "TP.HCM",
    },
    {
      id: "s2",
      slug: "dh-fpt",
      ten: "ĐH FPT",
      nganhCount: 8,
      thanhPho: "Hà Nội",
    },
    {
      id: "s3",
      slug: "dh-van-lang",
      ten: "ĐH Văn Lang",
      nganhCount: 10,
      thanhPho: "TP.HCM",
    },
  ],
  careers: [
    { id: "c1", slug: "ui-designer", title: "UI Designer", linhVuc: "UX/UI" },
    {
      id: "c2",
      slug: "motion-designer",
      title: "Motion Designer",
      linhVuc: "Animation",
    },
    {
      id: "c3",
      slug: "concept-artist",
      title: "Concept Artist",
      linhVuc: "Game Art",
    },
    {
      id: "c4",
      slug: "art-director",
      title: "Art Director",
      linhVuc: "Đồ họa",
    },
  ],
  courses: [
    { id: "k1", title: "Digital Painting cơ bản", orgName: "Sine Art" },
    { id: "k2", title: "UI Design với Figma", orgName: "CINs Studio" },
    { id: "k3", title: "Character Design", orgName: "Sine Art" },
  ],
  events: [
    {
      id: "e1",
      title: "Open Day Mỹ thuật 2026",
      startsAt: "2026-08-15T09:00:00+07:00",
      location: "TP.HCM",
    },
    {
      id: "e2",
      title: "Portfolio Review Night",
      startsAt: "2026-08-22T18:30:00+07:00",
      location: "Hà Nội",
    },
  ],
  works: [
    { id: "w1", title: "Brand identity — cafe", authorName: "Lan" },
    { id: "w2", title: "Character sheet — fox", authorName: "Khoa" },
    { id: "w3", title: "App redesign — travel", authorName: "Vy" },
    { id: "w4", title: "Motion loop — logo", authorName: "Minh" },
  ],
};
