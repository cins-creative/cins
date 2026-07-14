"use client";

import { BadgeTrangThai } from "@/components/admin/badges";

export { AdminToChucScreen } from "@/components/admin/AdminToChucScreen";

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
