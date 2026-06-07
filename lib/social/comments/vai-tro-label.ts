/** Map `user_thanh_vien_to_chuc.vai_tro` → nhãn badge (Comment Block v1). */
export function commentVaiTroLabel(vaiTro: string): string {
  switch (vaiTro) {
    case "owner":
      return "Sáng lập";
    case "admin":
      return "Quản trị";
    case "giao_vien":
      return "Giảng viên";
    case "nhan_vien":
      return "Nhân viên";
    case "hoc_vien":
      return "Học viên";
    case "thanh_vien":
      return "Thành viên";
    case "quan_ly_tuyen_sinh":
      return "Tuyển sinh";
    case "quan_ly_noi_dung":
      return "Nội dung";
    default:
      return vaiTro.replace(/_/g, " ");
  }
}
