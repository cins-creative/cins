export const SEARCH_KIND_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "article", label: "Kiến thức" },
  { id: "khoa_hoc", label: "Khóa học" },
  { id: "tuyen_dung", label: "Tuyển dụng" },
  { id: "org", label: "Tổ chức" },
  { id: "user", label: "Người dùng" },
  { id: "post", label: "Bài viết" },
] as const;

export type SearchKindTab = (typeof SEARCH_KIND_TABS)[number]["id"];

export type SearchEntityKind =
  | "article"
  | "khoa_hoc"
  | "org_tuyen_dung"
  | "org"
  | "user"
  | "user_post"
  | "org_post";

export type SearchOrgMeta = {
  coverUrl: string | null;
  officialName: string | null;
  locationLabel: string | null;
  typeLabel: string | null;
  maTruong: string | null;
  footLabel: string;
  moTa: string | null;
};

export type SearchUserMeta = {
  coverUrl: string | null;
  giaiDoanLabel: string | null;
  locationLabel: string | null;
  bio: string | null;
  stats: {
    cotMoc: number;
    tacPham: number;
    banBe: number;
  };
};

export type SearchPostMeta = {
  coverUrl: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  authorHandle: string | null;
};

export type SearchCourseMeta = {
  coverUrl: string | null;
  orgTen: string;
  orgAvatarUrl: string | null;
  /** Học phí đã format (hoặc "Miễn phí" / "Liên hệ"). */
  hocPhi: string | null;
  trinhDoLabel: string | null;
};

export type SearchJobMeta = {
  orgTen: string;
  orgAvatarUrl: string | null;
  /** Mức lương đã format (null = thỏa thuận). */
  salary: string | null;
  loaiHinhLabel: string | null;
  place: string | null;
};

export type SearchHit = {
  id: string;
  kind: SearchEntityKind;
  title: string;
  subtitle: string | null;
  snippet: string | null;
  href: string;
  avatarUrl: string | null;
  badge: string | null;
  /** `loai_bai_viet` hoặc `loai_to_chuc` — phục vụ theme card. */
  entityLoai: string | null;
  slug: string | null;
  /** Metadata bổ sung cho card tổ chức (cover, địa điểm, foot stats). */
  orgMeta?: SearchOrgMeta | null;
  /** Metadata bổ sung cho card người dùng (cover, stats, meta). */
  userMeta?: SearchUserMeta | null;
  /** Metadata bổ sung cho card bài viết (cover, tác giả). */
  postMeta?: SearchPostMeta | null;
  /** Metadata bổ sung cho card khóa học. */
  courseMeta?: SearchCourseMeta | null;
  /** Metadata bổ sung cho card tin tuyển dụng. */
  jobMeta?: SearchJobMeta | null;
};

export type GlobalSearchResult = {
  ok: boolean;
  query: string;
  kind: SearchKindTab;
  hits: SearchHit[];
  counts: Record<SearchEntityKind, number>;
  message?: string;
};

export const SEARCH_SECTION_LABELS: Record<SearchEntityKind, string> = {
  article: "Nghề, ngành & kiến thức",
  khoa_hoc: "Khóa học",
  org_tuyen_dung: "Tin tuyển dụng",
  org: "Tổ chức",
  user: "Người dùng",
  user_post: "Bài trên Journey",
  org_post: "Bài đăng tổ chức",
};

export type SearchSectionLayout =
  | "knowledge"
  | "orgs"
  | "people"
  | "posts"
  | "courses"
  | "jobs";

export const SEARCH_SECTION_META: Record<
  SearchEntityKind,
  {
    label: string;
    lead: string;
    layout: SearchSectionLayout;
  }
> = {
  article: {
    label: "Nghề, ngành & kiến thức",
    lead: "Bài nghề, ngành, blog và tag trên CINs",
    layout: "knowledge",
  },
  khoa_hoc: {
    label: "Khóa học",
    lead: "Khóa học từ cơ sở đào tạo trên CINs",
    layout: "courses",
  },
  org_tuyen_dung: {
    label: "Tin tuyển dụng",
    lead: "Vị trí đang tuyển từ studio, doanh nghiệp & cơ sở",
    layout: "jobs",
  },
  org: {
    label: "Tổ chức",
    lead: "Trường, cơ sở, studio và cộng đồng",
    layout: "orgs",
  },
  user: {
    label: "Người dùng",
    lead: "Hồ sơ và Journey công khai",
    layout: "people",
  },
  user_post: {
    label: "Bài trên Journey",
    lead: "Bài viết công khai của thành viên",
    layout: "posts",
  },
  org_post: {
    label: "Bài đăng tổ chức",
    lead: "Tin tức và bài đăng từ trang org",
    layout: "posts",
  },
};
