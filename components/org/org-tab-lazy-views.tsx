"use client";

import dynamic from "next/dynamic";

function OrgTabPanelSkeleton({ label }: { label?: string }) {
  return (
    <div className="tdh-v6-panel on" aria-busy="true" aria-label={label ?? "Đang tải"}>
      <div className="tdh-placeholder" style={{ minHeight: 120 }} />
    </div>
  );
}

// ── Trường đại học ──

export const TruongTabNganhLazy = dynamic(
  () =>
    import("@/components/truong/tabs/TruongTabNganh").then((m) => m.TruongTabNganh),
  { loading: () => <OrgTabPanelSkeleton label="Đang tải ngành đào tạo" /> },
);

export const TruongTabTuyensinhLazy = dynamic(
  () =>
    import("@/components/truong/tabs/TruongTabTuyensinh").then(
      (m) => m.TruongTabTuyensinh,
    ),
  { loading: () => <OrgTabPanelSkeleton label="Đang tải tuyển sinh" /> },
);

export const TruongTabHinhanhLazy = dynamic(
  () =>
    import("@/components/truong/tabs/TruongTabHinhanh").then(
      (m) => m.TruongTabHinhanh,
    ),
  { loading: () => <OrgTabPanelSkeleton label="Đang tải hình ảnh" /> },
);

export const TruongTabDoanSinhVienLazy = dynamic(
  () =>
    import("@/components/truong/tabs/TruongTabDoanSinhVien").then(
      (m) => m.TruongTabDoanSinhVien,
    ),
  { loading: () => <OrgTabPanelSkeleton label="Đang tải đồ án" /> },
);

export function prefetchTruongTab(
  tab: "nganh" | "tuyen-sinh" | "hinh-anh" | "do-an-sinh-vien",
) {
  switch (tab) {
    case "nganh":
      void import("@/components/truong/tabs/TruongTabNganh");
      break;
    case "tuyen-sinh":
      void import("@/components/truong/tabs/TruongTabTuyensinh");
      break;
    case "hinh-anh":
      void import("@/components/truong/tabs/TruongTabHinhanh");
      break;
    case "do-an-sinh-vien":
      void import("@/components/truong/tabs/TruongTabDoanSinhVien");
      break;
  }
}

// ── Cơ sở đào tạo ──

export const CoSoTabKhoaHocLazy = dynamic(
  () =>
    import("@/components/co-so/tabs/CoSoTabKhoaHoc").then((m) => m.CoSoTabKhoaHoc),
  { loading: () => <OrgTabPanelSkeleton label="Đang tải khóa học" /> },
);

export const CoSoTabSuKienLazy = dynamic(
  () =>
    import("@/components/co-so/tabs/CoSoTabSuKien").then((m) => m.CoSoTabSuKien),
  { loading: () => <OrgTabPanelSkeleton label="Đang tải sự kiện" /> },
);

export const CoSoTabTuyenDungLazy = dynamic(
  () =>
    import("@/components/co-so/tabs/CoSoTabTuyenDung").then(
      (m) => m.CoSoTabTuyenDung,
    ),
  { loading: () => <OrgTabPanelSkeleton label="Đang tải tuyển dụng" /> },
);

export const CoSoTabSanPhamLazy = dynamic(
  () =>
    import("@/components/co-so/tabs/CoSoTabSanPham").then((m) => m.CoSoTabSanPham),
  { loading: () => <OrgTabPanelSkeleton label="Đang tải sản phẩm học viên" /> },
);

export const CoSoTabHinhanhLazy = dynamic(
  () =>
    import("@/components/co-so/tabs/CoSoTabHinhanh").then((m) => m.CoSoTabHinhanh),
  { loading: () => <OrgTabPanelSkeleton label="Đang tải hình ảnh" /> },
);

export function prefetchCoSoTab(
  tab: "khoa-hoc" | "su-kien" | "tuyen-dung" | "hinh-anh" | "san-pham",
) {
  switch (tab) {
    case "khoa-hoc":
      void import("@/components/co-so/tabs/CoSoTabKhoaHoc");
      break;
    case "su-kien":
      void import("@/components/co-so/tabs/CoSoTabSuKien");
      break;
    case "tuyen-dung":
      void import("@/components/co-so/tabs/CoSoTabTuyenDung");
      break;
    case "hinh-anh":
      void import("@/components/co-so/tabs/CoSoTabHinhanh");
      break;
    case "san-pham":
      void import("@/components/co-so/tabs/CoSoTabSanPham");
      break;
  }
}

// ── Studio ──

export const StudioTabTuyenDungLazy = dynamic(
  () =>
    import("@/components/to-chuc/tabs/StudioTabTuyenDung").then(
      (m) => m.StudioTabTuyenDung,
    ),
  { loading: () => <OrgTabPanelSkeleton label="Đang tải tuyển dụng" /> },
);

export const StudioTabSuKienLazy = dynamic(
  () =>
    import("@/components/co-so/tabs/CoSoTabSuKien").then((m) => m.CoSoTabSuKien),
  { loading: () => <OrgTabPanelSkeleton label="Đang tải sự kiện" /> },
);

export const StudioHinhAnhTabLazy = dynamic(
  () =>
    import("@/components/truong/HinhAnhTabPanel").then((m) => m.HinhAnhTabPanel),
  { loading: () => <OrgTabPanelSkeleton label="Đang tải hình ảnh" /> },
);

export function prefetchStudioTab(
  tab: "tuyen-dung" | "hinh-anh" | "showcase" | "su-kien",
) {
  switch (tab) {
    case "tuyen-dung":
      void import("@/components/to-chuc/tabs/StudioTabTuyenDung");
      break;
    case "hinh-anh":
      void import("@/components/truong/HinhAnhTabPanel");
      break;
    case "showcase":
      void import("@/components/to-chuc/StudioTabBaiDang");
      break;
    case "su-kien":
      void import("@/components/co-so/tabs/CoSoTabSuKien");
      break;
  }
}
