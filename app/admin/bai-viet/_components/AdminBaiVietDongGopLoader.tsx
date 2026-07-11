import { AdminDongGopScreen } from "@/components/admin/AdminDongGopScreen";
import { listDongGopForAdmin } from "@/lib/article/dong-gop/admin-list";

type Props = {
  idBaiViet?: string;
};

export async function AdminBaiVietDongGopLoader({ idBaiViet }: Props) {
  const items = await listDongGopForAdmin(
    idBaiViet ? { idBaiViet } : undefined,
  );
  return (
    <AdminDongGopScreen items={items} focusBaiVietId={idBaiViet} />
  );
}
