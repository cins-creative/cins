"use client";

import { BadgeLoai, BadgeTinCay, BadgeTrangThai } from "@/components/admin/badges";
import { truongRootPath } from "@/lib/truong/truong-routes";

export function AdminDeXuatScreen() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">
          Đề xuất tag
          <span className="admin-pending-pill">12 chờ</span>
        </h1>
      </header>
      <div className="page-body">
        <div className="alert alert-warn">
          <span>⚠</span>
          <span>
            AI đã phân loại tự động — duyệt sẽ tạo bài viết tag mới (mock UI, chưa nối DB).
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tên đề xuất</th>
                <th>AI phân loại</th>
                <th>Context</th>
                <th>Người đề xuất</th>
                <th>Ngày</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="cell-title">Motion Graphics Designer</td>
                <td>
                  <BadgeLoai loai="nghe" />
                </td>
                <td className="cell-context">
                  Gắn vào cột mốc Freelance MG
                </td>
                <td className="cell-user">nguyen_thu_ha</td>
                <td className="cell-date">20/05/2025</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="action-btn approve">
                      ✓ Duyệt
                    </button>
                    <button type="button" className="action-btn danger">
                      ✕ Từ chối
                    </button>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="cell-title">Procreate</td>
                <td>
                  <BadgeLoai loai="phan_mem" />
                </td>
                <td className="cell-context">Đã có bài → merge</td>
                <td className="cell-user">tran_minh_duc</td>
                <td className="cell-date">19/05/2025</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="action-btn edit">
                      ⇒ Merge
                    </button>
                    <button type="button" className="action-btn danger">
                      ✕ Từ chối
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function AdminToChucScreen() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Tổ chức</h1>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" disabled>
            + Thêm tổ chức
          </button>
        </div>
      </header>
      <div className="page-body">
        <div className="admin-toolbar">
          <div className="filter-bar">
            <div className="filter-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="search" placeholder="Tìm tổ chức..." disabled />
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tên</th>
                <th>Loại</th>
                <th>Tỉnh/thành</th>
                <th>Tin cậy</th>
                <th>Journey</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="cell-title">
                  Trường ĐH Mỹ thuật TP.HCM
                  <small>dai-hoc-my-thuat-tp-hcm</small>
                </td>
                <td style={{ fontSize: 12, color: "var(--ink2)" }}>Trường ĐH</td>
                <td style={{ fontSize: 12, color: "var(--ink2)" }}>TP.HCM</td>
                <td>
                  <BadgeTinCay status="verified_official" />
                </td>
                <td className="cell-num">—</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="action-btn edit">
                      ✏ Sửa
                    </button>
                    <a
                      href={truongRootPath("dai-hoc-my-thuat-tp-hcm")}
                      className="action-btn view"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ↗ Xem
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="cell-title">
                  Sine Art
                  <small>sine-art</small>
                </td>
                <td style={{ fontSize: 12, color: "var(--ink2)" }}>Cơ sở đào tạo</td>
                <td style={{ fontSize: 12, color: "var(--ink2)" }}>TP.HCM</td>
                <td>
                  <BadgeTinCay status="binh_thuong" />
                </td>
                <td className="cell-num">520</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="action-btn approve">
                      ✓ Cấp Verified
                    </button>
                    <button type="button" className="action-btn edit">
                      ✏ Sửa
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function AdminNganhScreen() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Ngành đào tạo</h1>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" disabled>
            + Thêm ngành
          </button>
        </div>
      </header>
      <div className="page-body">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tên ngành</th>
                <th>Mã ngành</th>
                <th>Khối thi</th>
                <th>Số trường</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="cell-title">
                  Thiết kế đồ họa
                  <small>thiet-ke-do-hoa</small>
                </td>
                <td className="cell-num">7210403</td>
                <td style={{ fontSize: 12 }}>H00, H02, V00</td>
                <td className="cell-num">3</td>
                <td>
                  <BadgeTrangThai status="published" />
                </td>
                <td>
                  <button type="button" className="action-btn edit">
                    ✏ Sửa
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function AdminEduScreen() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Khối thi & Module tính điểm</h1>
      </header>
      <div className="page-body">
        <div className="tab-nav">
          <button type="button" className="tab-btn active">
            Khối thi (edu_to_hop_mon)
          </button>
          <button type="button" className="tab-btn">
            Module tính điểm
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã khối</th>
                <th>Tên</th>
                <th>Số slot</th>
                <th>Trường đang dùng</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="cell-num">H00</td>
                <td className="cell-title">
                  Khối H00
                  <small>Văn hóa + 2 năng khiếu</small>
                </td>
                <td className="cell-num">3</td>
                <td className="cell-num">2</td>
                <td>
                  <button type="button" className="action-btn view">
                    ↗ Xem slots
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function AdminPlaceholderScreen({
  title,
  icon,
  desc,
}: {
  title: string;
  icon: string;
  desc: string;
}) {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">{title}</h1>
      </header>
      <div className="page-body">
        <div className="empty-state">
          <div className="empty-icon">{icon}</div>
          <div className="empty-title">Sắp có</div>
          <div className="empty-desc">{desc}</div>
        </div>
      </div>
    </>
  );
}
